import { streamText, experimental_generateImage as generateImage, type ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ImageGenerationError, ImageModelResolutionError } from './errors';
import { describeModelCapabilities } from './ModelCapabilities';
import { logger } from '@/utils/logger';

export type Provider = ProviderId;

/**
 * MCP 工具调用参数类型
 */
export type ToolCallArgs = Record<string, unknown>;

/**
 * MCP 工具调用结果类型
 */
export type ToolCallResult = unknown;

export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;

  // 思考链回调 (用于支持推理模型如 OpenAI o1/o3, DeepSeek R1 等)
  onThinkingToken?: (delta: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;

  // MCP 工具集成 (Model Context Protocol)
  enableMcpTools?: boolean; // 是否启用 MCP 工具
  onToolCall?: (toolName: string, args: ToolCallArgs) => void; // 工具调用开始回调
  onToolResult?: (toolName: string, result: ToolCallResult) => void; // 工具执行完成回调
}

/**
 * 安全地从错误对象中提取错误消息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '未知错误';
}

async function getApiKey(provider: Provider): Promise<string> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  const normalizedProvider = provider === 'gemini' ? 'google' : provider;
  return (await ProvidersRepository.getApiKey(normalizedProvider)) ?? '';
}

export async function streamCompletion(opts: StreamOptions) {
  // 统一解析与规范化 provider/model，避免兼容端点路由误判
  let provider: Provider = opts.provider;
  const model = opts.model;

  // 针对 deepseek-r1/"reasoner" 等模型：
  // 若用户在 UI 中选择了 provider=openai 但 model 属于 deepseek 系列，
  // 且 openai 的 baseURL 未指向兼容端点，则优先切换到 deepseek provider，
  // 以强制走 openai-compatible 流程，避免首条消息误连 openai 官方端点报错。
  // 标记是否已完成（用于忽略 "finish" 之后的晚到错误）
  let didFinish = false;

  try {
    const openaiCfg = provider === 'openai' ? await ProvidersRepository.getConfig('openai') : null;
    const openaiBase = provider === 'openai' ? String(openaiCfg?.baseURL || '').replace(/\/$/, '') : '';
    const isOpenAIOfficial = provider === 'openai' && (!openaiBase || /^https?:\/\/api\.openai\.com\/?v1?$/i.test(openaiBase));

    const isOpenAIOfficialModel = (m: string) => {
      const s = m.toLowerCase();
      return (
        /^gpt-/.test(s) ||
        /^o[0-9]/.test(s) ||
        s.includes('dall-e') ||
        s.startsWith('gpt-image-') ||
        s.startsWith('text-embedding-') ||
        s.startsWith('whisper-')
      );
    };

    async function pickCompatibleProvider(): Promise<Provider | null> {
      const candidates: Provider[] = ['deepseek', 'volc', 'zhipu'];
      for (const id of candidates) {
        const key = await ProvidersRepository.getApiKey(id);
        const cfg = await ProvidersRepository.getConfig(id);
        if (key || cfg?.baseURL) return id;
      }
      return null;
    }

    if (isOpenAIOfficial && !isOpenAIOfficialModel(model)) {
      const compat = await pickCompatibleProvider();
      if (compat) {
        provider = compat;
        const cfg = await ProvidersRepository.getConfig(compat);
        logger.info('[AiClient] 规范化路由: openai 官方端点 + 非官方模型 -> 切换到兼容提供商', {
          model,
          compatProvider: provider,
          baseURL: cfg?.baseURL || '(default)'
        });
      } else {
        logger.warn('[AiClient] 检测到 openai 官方端点 + 非官方模型，但未发现已配置的兼容提供商', { model });
      }
    }
  } catch (e) {
    // 仅记录调试，不阻断流程
    logger.debug('[AiClient] provider/model 规范化检查异常（忽略继续）', e);
  }

  // 兼容别名
  if (provider === 'gemini') provider = 'google';

  const apiKey = await getApiKey(provider);
  if (!apiKey) throw new Error('Missing API key for ' + provider);

  // resolve baseURL for openai-compatible vendors
  let baseURL: string | undefined;
  if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
    const cfg = await ProvidersRepository.getConfig(provider);
    baseURL = cfg.baseURL || undefined;
  }

  // resolve baseURL for anthropic
  let anthropicBaseURL: string | undefined;
  if (provider === 'anthropic') {
    const cfg = await ProvidersRepository.getConfig(provider);
    anthropicBaseURL = cfg.baseURL || undefined;
  }

  // choose provider factory with compatibility for OpenAI-compatible gateways
  const useOpenAICompatible = (
    provider === 'deepseek' || provider === 'volc' || provider === 'zhipu' ||
    (provider === 'openai' && !!baseURL && !/^https?:\/\/api\.openai\.com\/?v1\/?$/i.test(String(baseURL).replace(/\/$/, '')))
  );

  const factory =
    provider === 'anthropic'
      ? () => createAnthropic({ apiKey, baseURL: anthropicBaseURL })
      : provider === 'google'
      ? () => createGoogleGenerativeAI({ apiKey })
      : useOpenAICompatible
      ? () => createOpenAICompatible({
        apiKey, baseURL: baseURL ?? 'https://api.openai.com/v1',
        name: ''
      })
      : () => createOpenAI({ apiKey, baseURL });

  const capabilityDescriptor = describeModelCapabilities({ id: model, provider });
  const hasReasoningSupport = capabilityDescriptor.reasoning;
  const reasoningOptions = capabilityDescriptor.providerOptions;

  // MCP 工具集成：如果启用，加载所有激活的 MCP 工具（使用 AI SDK 原生 tools）
  let mcpTools: Record<string, any> | undefined;
  if (opts.enableMcpTools) {
    try {
      const { getAllActiveTools } = await import('@/services/ai/mcpIntegration');
      mcpTools = await getAllActiveTools();
      logger.info('[AiClient] MCP 工具已加载', {
        toolCount: Object.keys(mcpTools).length,
      });
    } catch (error: unknown) {
      logger.error('[AiClient] 加载 MCP 工具失败', error, { message: getErrorMessage(error) });
      // 即使工具加载失败，仍然继续聊天流程
      mcpTools = undefined;
    }
  }

  // 使用 AI SDK 原生 streamText，集成 MCP 工具
  const result = streamText({
    model: factory()(model),
    messages: opts.messages,
    abortSignal: opts.abortSignal,
    temperature: opts.temperature,
    maxOutputTokens: opts.maxTokens,
    tools: mcpTools, // ✨ 使用 AI SDK 原生 tools 参数
    // @ts-expect-error - maxSteps is valid but not in SDK type definitions
    maxSteps: 5, // 允许最多 5 轮工具调用（防止无限循环）
    ...(hasReasoningSupport ? reasoningOptions : {}),
  });

  // 处理流式响应，集成思考链和工具调用回调
  try {
    // ✨ 修复：只要支持推理，就进入推理模式（不管是否有回调）
    if (hasReasoningSupport) {
      // 支持推理模型的思考链输出
      let isThinking = false;
      didFinish = false;

      logger.info('[AiClient] 🚀 开始处理 fullStream（推理模式）', {
        provider,
        model,
        hasReasoningSupport,
        enableMcpTools: opts.enableMcpTools,
        mcpToolsCount: mcpTools ? Object.keys(mcpTools).length : 0,
        hasThinkingCallbacks: !!(opts.onThinkingToken || opts.onThinkingStart || opts.onThinkingEnd),
      });

      for await (const part of result.fullStream) {
        logger.debug('[AiClient] 🔍 fullStream part.type:', part.type);

        if (part.type === 'reasoning-start') {
          isThinking = true;
          opts.onThinkingStart?.();
        } else if (part.type === 'reasoning-delta') {
          opts.onThinkingToken?.(part.text);
        } else if (part.type === 'reasoning-end') {
          isThinking = false;
          opts.onThinkingEnd?.();
        } else if (part.type === 'text-delta') {
          // 正常文本输出
          opts.onToken?.(part.text);
        } else if (part.type === 'tool-call') {
          // ✨ AI SDK 原生工具调用事件
          const toolName = part.toolName;
          const toolArgs = ('args' in part ? part.args : part.input) as ToolCallArgs; // AI SDK 使用 input 字段
          logger.info('[AiClient] 🔧 工具调用开始', { toolName, args: toolArgs, toolCallId: part.toolCallId });
          try {
            opts.onToolCall?.(toolName, toolArgs);
            logger.debug('[AiClient] onToolCall 回调已执行', { toolName });
          } catch (cbErr) {
            logger.warn('[AiClient] onToolCall 回调异常', { toolName, error: getErrorMessage(cbErr) });
          }
        } else if (part.type === 'tool-result') {
          // ✨ AI SDK 原生工具结果事件
          const toolName = part.toolName;
          const toolResult = 'result' in part ? part.result : part.output; // AI SDK 使用 output 字段
          logger.info('[AiClient] ✅ 工具执行完成', { toolName, result: toolResult, toolCallId: part.toolCallId });
          try {
            opts.onToolResult?.(toolName, toolResult);
            logger.debug('[AiClient] onToolResult 回调已执行', { toolName });
          } catch (cbErr) {
            logger.warn('[AiClient] onToolResult 回调异常', { toolName, error: getErrorMessage(cbErr) });
          }
        } else if (part.type === 'finish-step') {
          // 每一步完成（可能包含工具调用）
          logger.info('[AiClient] 🏁 完成一步', {
            finishReason: part.finishReason,
            usage: part.usage,
          });
          continue;
        } else if (part.type === 'start') {
          // AI SDK 流开始事件，正常情况，静默处理
          logger.debug('[AiClient] 🚀 流式响应开始', { type: part.type });
          continue;
        } else if (part.type === 'text-end') {
          // SDK 会在文本输出完成后发送 text-end 事件，不需要额外处理
          logger.debug('[AiClient] 📄 文本输出结束', { type: part.type });
          continue;
        } else if (part.type === 'finish') {
          // 整个流程完成
          logger.info('[AiClient] 🎉 整个流程完成', {
            finishReason: part.finishReason,
            totalUsage: part.totalUsage,
          });
          if (isThinking) {
            opts.onThinkingEnd?.();
          }
          didFinish = true;
          break;
        } else if (part.type === 'error') {
          if (didFinish) {
            logger.warn('[AiClient] 忽略 finish 之后的晚到错误事件', { error: part.error });
            continue;
          }
          try {
            opts.onError?.(part.error);
          } catch (cbErr) {
            logger.warn('[AiClient] onError 回调抛异常', { error: getErrorMessage(cbErr) });
          }
          continue;
        }
      }
    } else {
      // 无思考链，处理纯文本流（仍需监听工具调用）
      logger.info('[AiClient] 🚀 开始处理 fullStream（普通模式）', {
        provider,
        model,
        enableMcpTools: opts.enableMcpTools,
        mcpToolsCount: mcpTools ? Object.keys(mcpTools).length : 0,
      });

      for await (const part of result.fullStream) {
        logger.debug('[AiClient] 🔍 fullStream part.type:', part.type);

        if (part.type === 'text-delta') {
          opts.onToken?.(part.text);
        } else if (part.type === 'tool-call') {
          const toolName = part.toolName;
          const toolArgs = ('args' in part ? part.args : part.input) as ToolCallArgs; // AI SDK 使用 input 字段
          logger.info('[AiClient] 🔧 工具调用开始', { toolName, args: toolArgs, toolCallId: part.toolCallId });
          try {
            opts.onToolCall?.(toolName, toolArgs);
            logger.debug('[AiClient] onToolCall 回调已执行', { toolName });
          } catch (cbErr) {
            logger.warn('[AiClient] onToolCall 回调异常', { toolName, error: getErrorMessage(cbErr) });
          }
        } else if (part.type === 'tool-result') {
          const toolName = part.toolName;
          const toolResult = 'result' in part ? part.result : part.output; // AI SDK 使用 output 字段
          logger.info('[AiClient] ✅ 工具执行完成', { toolName, result: toolResult, toolCallId: part.toolCallId });
          try {
            opts.onToolResult?.(toolName, toolResult);
            logger.debug('[AiClient] onToolResult 回调已执行', { toolName });
          } catch (cbErr) {
            logger.warn('[AiClient] onToolResult 回调异常', { toolName, error: getErrorMessage(cbErr) });
          }
        } else if (part.type === 'finish-step') {
          logger.info('[AiClient] 🏁 完成一步', {
            finishReason: part.finishReason,
            usage: part.usage,
          });
        } else if (part.type === 'reasoning-start' || part.type === 'reasoning-delta' || part.type === 'reasoning-end') {
          // 某些模型即便未启用 reasoning callback 也会发送事件，这里静默忽略以避免警告
          logger.debug('[AiClient] 💡 忽略 reasoning chunk', { type: part.type });
        } else if (part.type === 'start') {
          // AI SDK 流开始事件，正常情况，静默处理
          logger.debug('[AiClient] 🚀 流式响应开始', { type: part.type });
        } else if (part.type === 'text-end') {
          logger.debug('[AiClient] 📄 文本输出结束', { type: part.type });
        } else if (part.type === 'finish') {
          logger.info('[AiClient] 🎉 整个流程完成', {
            finishReason: part.finishReason,
            totalUsage: part.totalUsage,
          });
          didFinish = true;
          break;
        } else if (part.type === 'error') {
          logger.error('[AiClient] ❌ 流式响应错误', { error: part.error });
          try {
            opts.onError?.(part.error);
          } catch (cbErr) {
            logger.warn('[AiClient] onError 回调异常', { error: getErrorMessage(cbErr) });
          }
        } else {
          // 记录未知的 chunk 类型
          logger.warn('[AiClient] ⚠️ 未知的 chunk 类型', { type: (part as any).type });
        }
      }

      logger.info('[AiClient] 💤 fullStream 循环结束');
    }
  } catch (e: unknown) {
    const errorName = e && typeof e === 'object' && 'name' in e ? String(e.name) : '';
    const errorMessage = getErrorMessage(e);
    const errorCause = e && typeof e === 'object' && 'cause' in e ? e.cause : undefined;
    const errorStack = e instanceof Error ? e.stack : undefined;

    if (didFinish && (errorName === 'APICallError' || /abort|cancel|closed|stream/i.test(errorMessage))) {
      logger.warn('[AiClient] finish 之后的晚到异常已忽略', { name: errorName, message: errorMessage });
    } else {
      logger.error('[AiClient Error]', { provider, model, error: e, message: errorMessage, cause: errorCause, stack: errorStack });
      opts.onError?.(e);
      throw e;
    }
  }

  opts.onDone?.();
}


// ============================================
// 图片生成功能
// ============================================

/**
 * 图片生成选项接口
 */
export interface GenerateImageOptions {
  provider: Provider;
  model: string;
  prompt: string;
  n?: number; // 生成数量（默认 1）
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512'; // 图片尺寸
  quality?: 'standard' | 'hd'; // 图片质量（仅 DALL-E 3）
  style?: 'vivid' | 'natural'; // 风格（仅 DALL-E 3）
  abortSignal?: AbortSignal;

  // 流式回调
  onCreated?: () => void;
  onProgress?: (progress: number) => void; // 进度（0-100）
  onComplete?: (imageData: ImageGenerationResult) => void;
  onError?: (error: ImageGenerationError) => void;
}

/**
 * 图片生成结果接口
 */
export interface ImageGenerationResult {
  type: 'url' | 'base64';
  images: string[]; // URL 列表或 Base64 数据（Data URI 格式：data:image/png;base64,...）
  revisedPrompt?: string; // DALL-E 3 返回的优化后提示词（注：当前 Vercel AI SDK 未提供）
}

/**
 * 生成图片（使用 Vercel AI SDK 官方 API）
 *
 * @example
 * ```typescript
 * const result = await generateImageWithAI({
 *   provider: 'openai',
 *   model: 'dall-e-3',
 *   prompt: '一只可爱的橘猫坐在月球上',
 *   size: '1024x1024',
 *   quality: 'hd',
 *   onCreated: () => logger.debug('开始生成'),
 *   onComplete: (data) => logger.debug('生成完成', data),
 * });
 * ```
 */
export async function generateImageWithAI(
  options: GenerateImageOptions
): Promise<ImageGenerationResult> {
  const {
    provider,
    model,
    prompt,
    n = 1,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    abortSignal,
    onCreated,
    onProgress,
    onComplete,
    onError,
  } = options;

  try {
    // 1. 验证模型支持
    const imageDescriptor = describeModelCapabilities({ id: model, provider });
    if (!imageDescriptor.imageGeneration) {
      throw new ImageModelResolutionError(model, provider);
    }

    // 2. 验证提示词
    if (!prompt || prompt.trim().length === 0) {
      throw new ImageGenerationError(
        '请输入图片描述提示词',
        provider,
        model
      );
    }

    // 3. 验证提示词长度（DALL-E 限制）
    if (prompt.length > 4000) {
      throw new ImageGenerationError(
        '提示词过长，请控制在 4000 字符以内',
        provider,
        model
      );
    }

    // 4. 获取 API Key
    const apiKey = await getApiKey(provider);
    if (!apiKey) {
      throw new ImageGenerationError(
        `缺少 ${provider} 的 API Key，请先在设置中配置`,
        provider,
        model
      );
    }

    // 5. 发送创建事件
    onCreated?.();
    onProgress?.(10);


    // 6. 获取 baseURL（如果有自定义）
    let baseURL: string | undefined;
    if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
      const cfg = await ProvidersRepository.getConfig(provider);
      baseURL = cfg.baseURL || undefined;
    }

    // 7. 创建提供商实例
    const factory = provider === 'openai'
      ? () => createOpenAI({ apiKey, baseURL })
      : provider === 'deepseek' || provider === 'volc' || provider === 'zhipu'
      ? () => createOpenAICompatible({
          apiKey,
          baseURL: baseURL ?? 'https://api.openai.com/v1',
          name: provider
        })
      : () => {
          throw new ImageGenerationError(
            `提供商 ${provider} 暂不支持图片生成`,
            provider,
            model
          );
        };

    onProgress?.(30);

    // 8. 调用 Vercel AI SDK 官方 API
    const result = await generateImage({
      model: factory().imageModel(model), // 使用 imageModel 方法
      prompt: prompt,
      n: n,
      size: size,
      ...(model.toLowerCase().includes('dall-e-3') && {
        // DALL-E 3 专属参数（通过 providerOptions 传递）
        providerOptions: {
          openai: {
            quality: quality,
            style: style,
          }
        }
      }),
      abortSignal: abortSignal,
    });

    onProgress?.(80);

    // 9. 转换结果格式：GeneratedFile[] -> string[]
    const images: string[] = [];
    if (result.images) {
      for (const image of result.images) {
        if ('base64' in image && image.base64) {
          // 将 Base64 转换为 Data URI 格式
          const mediaType = image.mediaType || 'image/png';
          images.push(`data:${mediaType};base64,${image.base64}`);
        }
      }
    }


    // 10. 处理返回结果
    const imageData: ImageGenerationResult = {
      type: 'base64',
      images: images,
      revisedPrompt: undefined, // 当前 Vercel AI SDK 未提供此字段
    };

    onProgress?.(90);

    // 10. 发送完成事件
    onComplete?.(imageData);
    onProgress?.(100);

    return imageData;
  } catch (error: unknown) {
    // 错误处理
    logger.error('[AiClient] 图片生成失败', {
      provider,
      model,
      error: error,
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const imageError = error instanceof ImageGenerationError
      ? error
      : new ImageGenerationError(
          getErrorMessage(error) || '图片生成失败',
          provider,
          model,
          error instanceof Error ? error : undefined
        );

    onError?.(imageError);
    throw imageError;
  }
}
