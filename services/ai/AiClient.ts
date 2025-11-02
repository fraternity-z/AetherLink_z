import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';

export type Provider = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu';

type TextPart = { type: 'text'; text: string };
export type CoreMessage = {
  role: 'system' | 'user' | 'assistant';
  content: TextPart[];
};

export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: CoreMessage[];
  abortSignal?: AbortSignal;
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
}

async function getApiKey(provider: Provider): Promise<string> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  const normalizedProvider = provider === 'gemini' ? 'google' : provider;
  return (await ProvidersRepository.getApiKey(normalizedProvider as ProviderId)) ?? '';
}

export async function streamCompletion(opts: StreamOptions) {
  const apiKey = await getApiKey(opts.provider);
  if (!apiKey) throw new Error('Missing API key for ' + opts.provider);

  let { provider } = opts;
  if (provider === 'gemini') provider = 'google';

  // resolve baseURL for openai-compatible vendors
  let baseURL: string | undefined;
  if (provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
    const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
    baseURL = cfg.baseURL || undefined;
  }

  const factory =
    provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu'
      ? () => createOpenAI({ apiKey, baseURL })
      : provider === 'anthropic'
      ? () => createAnthropic({ apiKey })
      : () => createGoogleGenerativeAI({ apiKey });

  const { textStream } = streamText({
    model: factory()(opts.model),
    messages: opts.messages as any,
    abortSignal: opts.abortSignal,
  });

  try {
    for await (const part of textStream) opts.onToken?.(part);
    opts.onDone?.();
  } catch (e) {
    opts.onError?.(e);
    throw e;
  }
}
