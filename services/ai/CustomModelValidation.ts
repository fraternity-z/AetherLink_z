import type { CustomProvider } from '@/storage/repositories/custom-providers';
import { validateModelWithTarget, type ValidateResult } from './modelValidationHelper';

export async function validateCustomProviderModel(cp: CustomProvider, modelId: string): Promise<ValidateResult> {
  if (!modelId || !modelId.trim()) return { ok: false, message: '模型 ID 为空' };
  const apiKey = cp.apiKey || '';
  if (!apiKey) return { ok: false, message: '缺少 API Key，请先在该提供商页填写并保存' };

  if (cp.type === 'openai-compatible') {
    return validateModelWithTarget(
      {
        type: 'openai-compatible',
        apiKey,
        baseURL: cp.baseURL,
      },
      modelId
    );
  }

  if (cp.type === 'anthropic') {
    return validateModelWithTarget(
      {
        type: 'anthropic',
        apiKey,
        baseURL: cp.baseURL,
      },
      modelId
    );
  }

  if (cp.type === 'google') {
    return validateModelWithTarget(
      {
        type: 'google',
        apiKey,
        baseURL: cp.baseURL,
      },
      modelId
    );
  }

  return { ok: false, message: '暂未支持该提供商的校验' };
}
