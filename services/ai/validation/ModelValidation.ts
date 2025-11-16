import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { validateModelWithTarget, type ValidateResult } from './modelValidationHelper';
import { withAiServiceContext } from '../error-handler';

export async function validateProviderModel(provider: ProviderId, modelId: string): Promise<ValidateResult> {
  return withAiServiceContext('ModelValidation', 'validateProviderModel', { provider, modelId }, async () => {
    if (!modelId || !modelId.trim()) {
      return { ok: false, message: '模型 ID 为空' };
    }
    const cfg = await ProvidersRepository.getConfig(provider);
    const apiKey = await ProvidersRepository.getApiKey(provider);
    if (!apiKey) return { ok: false, message: '缺少 API Key，请先在该提供商页填写并保存' };

    // OpenAI 兼容：openai/deepseek/volc/zhipu
    if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
      return validateModelWithTarget(
        {
          type: 'openai-compatible',
          apiKey,
          baseURL: cfg.baseURL,
        },
        modelId
      );
    }

    if (provider === 'anthropic') {
      return validateModelWithTarget(
        {
          type: 'anthropic',
          apiKey,
          baseURL: cfg.baseURL,
        },
        modelId
      );
    }

    if (provider === 'google' || provider === 'gemini') {
      return validateModelWithTarget(
        {
          type: 'google',
          apiKey,
          baseURL: cfg.baseURL,
        },
        modelId
      );
    }

    return { ok: false, message: '暂未支持该提供商的校验' };
  });
}
