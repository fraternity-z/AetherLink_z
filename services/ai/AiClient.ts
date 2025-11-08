import { streamText, type CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';

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

  console.log('[AiClient] 模型思考链支持检测', {
    provider: opts.provider,
    model: opts.model,
    hasReasoningSupport,
    hasCallbacks: !!(opts.onThinkingToken || opts.onThinkingStart || opts.onThinkingEnd),
  });

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
        console.log('[AiClient] fullStream part:', part.type);

        if (part.type === 'reasoning-start') {
          // 思考链开始
          console.log('[AiClient] ✅ 思考链开始');
          isThinking = true;
          opts.onThinkingStart?.();
        } else if (part.type === 'reasoning-delta') {
          // 流式输出思考链内容
          console.log('[AiClient] 💡 思考链内容:', part.text.substring(0, 50));
          opts.onThinkingToken?.(part.text);
        } else if (part.type === 'reasoning-end') {
          // 思考链结束
          console.log('[AiClient] ✅ 思考链结束');
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
