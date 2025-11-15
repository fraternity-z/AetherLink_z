import { performHttpRequest } from '@/utils/http';
import { logger } from '@/utils/logger';

export type ValidateResult = { ok: boolean; message: string };

export type ValidationTargetType = 'openai-compatible' | 'anthropic' | 'google';

export interface ValidationTarget {
  type: ValidationTargetType;
  apiKey: string;
  baseURL?: string | null;
}

const REQUEST_TIMEOUT = 8000;
const OPENAI_DEFAULT_BASE = 'https://api.openai.com/v1';
const ANTHROPIC_DEFAULT_BASE = 'https://api.anthropic.com';
const GOOGLE_DEFAULT_BASE = 'https://generativelanguage.googleapis.com';

export async function validateModelWithTarget(
  target: ValidationTarget,
  modelId: string
): Promise<ValidateResult> {
  switch (target.type) {
    case 'openai-compatible':
      return validateOpenAICompatibleTarget(target, modelId);
    case 'anthropic':
      return validateAnthropicTarget(target, modelId);
    case 'google':
      return validateGoogleTarget(target, modelId);
    default:
      return { ok: false, message: '暂未支持该提供商的校验' };
  }
}

function normalizeBaseURL(baseURL: string | undefined | null, fallback: string): string {
  const url = baseURL && baseURL.trim().length > 0 ? baseURL : fallback;
  return url.replace(/\/$/, '');
}

async function validateOpenAICompatibleTarget(
  target: ValidationTarget,
  modelId: string
): Promise<ValidateResult> {
  const base = normalizeBaseURL(target.baseURL, OPENAI_DEFAULT_BASE);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${target.apiKey}`,
    'Content-Type': 'application/json',
  };

  const modelsEndpoint = `${base}/models/${encodeURIComponent(modelId)}`;
  try {
    await performHttpRequest(modelsEndpoint, {
      method: 'GET',
      headers,
      timeout: REQUEST_TIMEOUT,
    });
    return { ok: true, message: `${modelId} 可用（models/${modelId}）` };
  } catch (error) {
    logger.debug('[ModelValidation] models endpoint check failed, fallback to chat/completions', error);
  }

  const chatEndpoint = `${base}/chat/completions`;
  try {
    const body = JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    });
    await performHttpRequest(chatEndpoint, {
      method: 'POST',
      headers,
      body,
      timeout: REQUEST_TIMEOUT,
    });
    return { ok: true, message: `${modelId} 可用（chat/completions）` };
  } catch (error: any) {
    return { ok: false, message: `校验失败/异常：${error?.message || error}` };
  }
}

async function validateAnthropicTarget(
  target: ValidationTarget,
  modelId: string
): Promise<ValidateResult> {
  const base = normalizeBaseURL(target.baseURL, ANTHROPIC_DEFAULT_BASE);
  const url = `${base}/v1/messages`;
  try {
    const headers: Record<string, string> = {
      'x-api-key': target.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    const body = JSON.stringify({
      model: modelId,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
    await performHttpRequest(url, {
      method: 'POST',
      headers,
      body,
      timeout: REQUEST_TIMEOUT,
    });
    return { ok: true, message: `${modelId} 可用（anthropic/messages）` };
  } catch (error: any) {
    return { ok: false, message: `校验失败/异常：${error?.message || error}` };
  }
}

async function validateGoogleTarget(
  target: ValidationTarget,
  modelId: string
): Promise<ValidateResult> {
  const base = normalizeBaseURL(target.baseURL, GOOGLE_DEFAULT_BASE);
  const url = `${base}/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(target.apiKey)}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] });
    await performHttpRequest(url, {
      method: 'POST',
      headers,
      body,
      timeout: REQUEST_TIMEOUT,
    });
    return { ok: true, message: `${modelId} 可用（gemini/generateContent）` };
  } catch (error: any) {
    return { ok: false, message: `校验失败/异常：${error?.message || error}` };
  }
}
