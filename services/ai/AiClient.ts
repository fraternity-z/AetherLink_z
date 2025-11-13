import { streamText, experimental_generateImage as generateImage, type CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ImageGenerationError, ImageModelResolutionError } from './errors';
import { isDedicatedImageGenerationModel } from './ModelDiscovery';
import { logger } from '@/utils/logger';

export type Provider = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu';

export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: CoreMessage[];
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
  onToolCall?: (toolName: string, args: any) => void; // 工具调用开始回调
  onToolResult?: (toolName: string, result: any) => void; // 工具执行完成回调
}

async function getApiKey(provider: Provider): Promise<string> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  const normalizedProvider = provider === 'gemini' ? 'google' : provider;
  return (await ProvidersRepository.getApiKey(normalizedProvider as ProviderId)) ?? '';
}

/**
 * 检测模型是否支持思考链(Reasoning)功能
 */
function supportsReasoning(provider: Provider, model: string): boolean {
  const modelLower = model.toLowerCase();

  // OpenAI o1/o3/o4 系列
  if (provider === 'openai' && /^o[134](-preview|-mini)?$/i.test(model)) {
    return true;
  }

  // DeepSeek R1 系列 (支持通过 openai 兼容接口或 deepseek 直接调用)
  // 匹配: deepseek-r1, deepseek-reasoner, r1, 等
  if (/deepseek.*r1|^r1$|reasoner/i.test(modelLower)) {
    return true;
  }

  // Anthropic Claude 3.7+
  if (provider === 'anthropic' && /claude-3\.[789]|claude-[4-9]/i.test(model)) {
    return true;
  }

  // Google Gemini Thinking 模型
  if ((provider === 'google' || provider === 'gemini') && /thinking/i.test(model)) {
    return true;
  }

  return false;
}

/**
 * 获取推理模型的 providerOptions 配置
 */
function getProviderOptions(provider: Provider, model: string): any {
  // OpenAI o1/o3 系列 - 需要 reasoningSummary 配置
  if (provider === 'openai' && /^o[134]/i.test(model)) {
    return {
      providerOptions: {
        openai: {
          reasoningSummary: 'detailed',
        },
      },
    };
  }

  // Anthropic Claude 3.7+ - 需要启用 thinking
  if (provider === 'anthropic' && /claude-3\.[789]|claude-[4-9]/i.test(model)) {
    return {
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 12000,
          },
        },
      },
    };
  }

  // DeepSeek R1 和 Google Thinking 可能不需要特殊配置
  return {};
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
    const openaiCfg = provider === 'openai' ? await ProvidersRepository.getConfig('openai' as ProviderId) : null;
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
        const key = await ProvidersRepository.getApiKey(id as ProviderId);
        const cfg = await ProvidersRepository.getConfig(id as ProviderId);
        if (key || cfg?.baseURL) return id;
      }
      return null;
    }

    if (isOpenAIOfficial && !isOpenAIOfficialModel(model)) {
      const compat = await pickCompatibleProvider();
      if (compat) {
        provider = compat;
        const cfg = await ProvidersRepository.getConfig(compat as ProviderId);
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
    const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
    baseURL = cfg.baseURL || undefined;
  }

  // resolve baseURL for anthropic
  let anthropicBaseURL: string | undefined;
  if (provider === 'anthropic') {
    const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
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

  // 检查模型是否支持思考链
  const hasReasoningSupport = supportsReasoning(provider, model);

  // MCP 工具集成：如果启用，加载所有激活的 MCP 工具
  let mcpTools: Record<string, any> | undefined;
  if (opts.enableMcpTools) {
    try {
      const { ToolConverter } = await import('@/services/mcp/ToolConverter');
      mcpTools = await ToolConverter.getAllActiveTools();
      logger.info('[AiClient] MCP 工具已加载', {
        toolCount: Object.keys(mcpTools).length,
      });
    } catch (error: any) {
      // 统一日志形态：error 放第二参，附加字段放第三参
      logger.error('[AiClient] 加载 MCP 工具失败', error, { message: error?.message });
      // 即使工具加载失败，仍然继续聊天流程
      mcpTools = undefined;
    }
  }

  const result = streamText({
    model: factory()(model),
    messages: opts.messages,
    abortSignal: opts.abortSignal,
    temperature: opts.temperature,
    // 兼容 AI SDK v5：部分模型使用 maxOutputTokens 字段
    maxOutputTokens: opts.maxTokens,
    // 如果支持思考链,添加 providerOptions
    ...(hasReasoningSupport ? getProviderOptions(provider, model) : {}),
    // MCP 工具
    ...(mcpTools && Object.keys(mcpTools).length > 0 ? { tools: mcpTools } : {}),
  });

  try {
    // 如果支持思考链且提供了回调,使用 fullStream 来分离 reasoning 和 text
    if (hasReasoningSupport && (opts.onThinkingToken || opts.onThinkingStart || opts.onThinkingEnd)) {
      let isThinking = false;
      didFinish = false;

      for await (const part of result.fullStream) {
        // 🔍 调试日志：记录所有 part 类型
        logger.debug('[AiClient] 🔍 fullStream part.type:', part.type);

        if (part.type === 'start') {
          // 流式开始（静默忽略）
          continue;
        } else if (part.type === 'start-step') {
          // 步骤开始（静默忽略）
          continue;
        } else if (part.type === 'reasoning-start') {
          // 思考链开始
          isThinking = true;
          opts.onThinkingStart?.();
        } else if (part.type === 'reasoning-delta') {
          // 流式输出思考链内容
          opts.onThinkingToken?.(part.text);
        } else if (part.type === 'reasoning-end') {
          // 思考链结束
          isThinking = false;
          opts.onThinkingEnd?.();
        } else if (part.type === 'text-delta') {
          // 流式输出正文内容
          opts.onToken?.(part.text);
        } else if (part.type === 'text-end') {
          // 文本结束（静默忽略）
          continue;
        } else if (part.type === 'finish-step') {
          // 步骤完成（包含 token 使用统计）
          // 可以在这里记录 usage 信息
          if (part.usage) {
            logger.debug('[AiClient] Token 使用统计:', {
              输入: part.usage.inputTokens,
              输出: part.usage.outputTokens,
              推理: part.usage.reasoningTokens,
              总计: part.usage.totalTokens,
            });
          }
          continue;
        } else if (part.type === 'tool-call') {
          // MCP 工具调用
          logger.info('[AiClient] 工具调用', {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            args: (part as any).input,
          });
          try {
            opts.onToolCall?.(part.toolName, (part as any).input);
          } catch (cbErr) {
            logger.warn('[AiClient] onToolCall 回调抛异常，已忽略以保证流继续', { error: (cbErr as any)?.message });
          }
        } else if (part.type === 'tool-result') {
          // MCP 工具结果
          logger.info('[AiClient] 工具结果', {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            result: (part as any).output,
          });
          try {
            opts.onToolResult?.(part.toolName, (part as any).output);
          } catch (cbErr) {
            logger.warn('[AiClient] onToolResult 回调抛异常，已忽略以保证流继续', { error: (cbErr as any)?.message });
          }
        } else if (part.type === 'finish') {
          // 流式完成
          if (isThinking) {
            opts.onThinkingEnd?.();
          }
          opts.onDone?.();
          didFinish = true;
          break; // 结束消费，避免后续兼容端产生的晚到 error 影响体验
        } else if (part.type === 'error') {
          // 若已完成，则忽略晚到错误（部分第三方网关会在完成后发送额外错误事件）
          if (didFinish) {
            logger.warn('[AiClient] 忽略 finish 之后的晚到错误事件', { error: part.error });
            continue;
          }
          // 对回调进行保护，避免回调抛错中断流
          try {
            opts.onError?.(part.error);
          } catch (cbErr) {
            logger.warn('[AiClient] onError 回调抛异常，已忽略以保证流继续', { error: (cbErr as any)?.message });
          }
          // 工具相关错误不应直接中断主流; 交由模型后续继续输出
          continue;
        } else {
          // 🔍 未知类型，记录完整信息（但不中断流程）
          logger.warn('[AiClient] ⚠️ 未处理的 fullStream 类型:', { type: part.type, part });
        }
      }
    } else {
      // 不支持思考链或未提供回调,使用原有的 textStream
      for await (const part of result.textStream) {
        opts.onToken?.(part);
      }
      opts.onDone?.();
    }
  } catch (e: any) {
    // 增强错误日志，输出详细信息
    // 如果已经完成（已收到 finish），将某些已知可忽略的错误降级为警告
    if (didFinish && (e?.name === 'APICallError' || /abort|cancel|closed|stream/i.test(String(e?.message || '')))) {
      logger.warn('[AiClient] finish 之后的晚到异常已忽略', { name: e?.name, message: e?.message });
      return; // 视为成功完成
    }

    logger.error('[AiClient Error]', {
      provider,
      model,
      error: e,
      message: e?.message,
      cause: e?.cause,
      stack: e?.stack,
    });
    opts.onError?.(e);
    throw e;
  }
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
    if (!isDedicatedImageGenerationModel(model)) {
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
      const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
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
  } catch (error: any) {
    // 错误处理
    logger.error('[AiClient] 图片生成失败', {
      provider,
      model,
      error: error,
      message: error?.message,
      stack: error?.stack,
    });

    const imageError = error instanceof ImageGenerationError
      ? error
      : new ImageGenerationError(
          error.message || '图片生成失败',
          provider,
          model,
          error
        );

    onError?.(imageError);
    throw imageError;
  }
}
