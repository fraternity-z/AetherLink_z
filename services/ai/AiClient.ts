import { streamText, experimental_generateImage as generateImage, type CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ImageGenerationError, ImageModelResolutionError, createAiError } from './errors';
import { isDedicatedImageGenerationModel } from './ModelDiscovery';

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
  const apiKey = await getApiKey(opts.provider);
  if (!apiKey) throw new Error('Missing API key for ' + opts.provider);

  let { provider } = opts;
  if (provider === 'gemini') provider = 'google';

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
  const hasReasoningSupport = supportsReasoning(opts.provider, opts.model);


  const result = streamText({
    model: factory()(opts.model),
    messages: opts.messages,
    abortSignal: opts.abortSignal,
    temperature: opts.temperature,
    // 兼容 AI SDK v5：部分模型使用 maxOutputTokens 字段
    maxOutputTokens: opts.maxTokens,
    // 如果支持思考链,添加 providerOptions
    ...(hasReasoningSupport ? getProviderOptions(opts.provider, opts.model) : {}),
  });

  try {
    // 如果支持思考链且提供了回调,使用 fullStream 来分离 reasoning 和 text
    if (hasReasoningSupport && (opts.onThinkingToken || opts.onThinkingStart || opts.onThinkingEnd)) {
      let isThinking = false;

      for await (const part of result.fullStream) {

        if (part.type === 'reasoning-start') {
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
        } else if (part.type === 'finish') {
          // 流式完成
          if (isThinking) {
            opts.onThinkingEnd?.();
          }
          opts.onDone?.();
        } else if (part.type === 'error') {
          opts.onError?.(part.error);
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
    console.error('[AiClient Error]', {
      provider: opts.provider,
      model: opts.model,
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
 *   onCreated: () => console.log('开始生成'),
 *   onComplete: (data) => console.log('生成完成', data),
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
    console.error('[AiClient] 图片生成失败', {
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
