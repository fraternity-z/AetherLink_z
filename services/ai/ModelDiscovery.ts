import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';

export interface DiscoveredModel { id: string; label?: string }

async function getKey(provider: ProviderId): Promise<string | null> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  return ProvidersRepository.getApiKey(provider);
}

export async function fetchProviderModels(provider: ProviderId): Promise<DiscoveredModel[]> {
  const apiKey = await getKey(provider);
  if (!apiKey) throw new Error('缺少 API Key，请先在该提供商页填写并保存');
  const cfg = await ProvidersRepository.getConfig(provider);

  // Helper fetch wrapper
  async function j(url: string, init?: RequestInit) {
    const res = await fetch(url, init as any);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`获取失败(${res.status}): ${txt}`);
    }
    return res.json();
  }

  if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
    // 使用标准 OpenAI API 格式
    const base = (cfg.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 标准 OpenAI 兼容端点：GET /v1/models
    const url = `${base}/models`;

    try {
      const data = await j(url, { headers });

      // 标准 OpenAI API 响应格式：{ "data": [...], "object": "list" }
      const arr: any[] = Array.isArray(data?.data) ? data.data : [];

      if (arr.length === 0) {
        throw new Error('API 返回的模型列表为空');
      }

      return arr
        .map((m) => ({
          id: String(m.id || m.model || ''),
          label: String(m.id || m.model || '')
        }))
        .filter((x) => x.id);
    } catch (err: any) {
      throw new Error(`获取模型列表失败：${err.message || err}\n请求地址：${url}\n请确认 Base URL 和 API Key 配置正确`);
    }
  }

  if (provider === 'anthropic') {
    // Anthropic API 标准端点
    const base = cfg.baseURL || 'https://api.anthropic.com';
    const url = `${base}/v1/models`;

    try {
      const data = await j(url, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
      });

      // Anthropic API 响应格式：{ "data": [...] }
      const items: any[] = Array.isArray(data?.data) ? data.data : [];

      if (items.length === 0) {
        throw new Error('API 返回的模型列表为空');
      }

      return items.map((m) => ({
        id: String(m.id || ''),
        label: String(m.display_name || m.id || '')
      }));
    } catch (err: any) {
      throw new Error(`获取 Anthropic 模型列表失败：${err.message || err}\n请求地址：${url}`);
    }
  }

  if (provider === 'google' || provider === 'gemini') {
    // Gemini API 使用查询参数传递 API Key
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

    try {
      const data = await j(url);

      // Gemini API 响应格式：{ "models": [...] }
      const items: any[] = Array.isArray(data?.models) ? data.models : [];

      if (items.length === 0) {
        throw new Error('API 返回的模型列表为空');
      }

      return items
        .filter((m) => typeof m?.name === 'string')
        .map((m) => {
          // Gemini 模型名称格式：models/gemini-pro，需要提取最后部分
          const modelId = String(m.name).split('/').pop() || '';
          return {
            id: modelId,
            label: String(m.displayName || modelId)
          };
        })
        .filter((x) => x.id);
    } catch (err: any) {
      throw new Error(`获取 Gemini 模型列表失败：${err.message || err}\n请求地址：${url}`);
    }
  }

  throw new Error('不支持的提供商');
}

// ============================================
// 图片生成模型识别功能
// ============================================

/**
 * 专用图片生成模型列表
 * 这些模型必须使用 Images API 而非 Chat Completions API
 */
export const DEDICATED_IMAGE_MODELS = [
  'dall-e-3',
  'dall-e-2',
  'gpt-image-1',
  'grok-2-image',
  'grok-2-image-1212',
  'grok-2-image-latest',
] as const;

/**
 * 支持对话式图片生成的模型（通过 Chat Completions API + providerOptions）
 */
export const CONVERSATIONAL_IMAGE_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.5-flash-image',
] as const;

/**
 * 判断是否为专用图片生成模型
 *
 * @param model - 模型 ID（如 "dall-e-3", "gpt-4o"）
 * @returns true 表示该模型是专用图片生成模型，需要使用 Images API
 *
 * @example
 * ```typescript
 * isDedicatedImageGenerationModel('dall-e-3') // => true
 * isDedicatedImageGenerationModel('gpt-4o') // => false
 * isDedicatedImageGenerationModel('grok-2-image-1212') // => true
 * ```
 */
export function isDedicatedImageGenerationModel(model: string): boolean {
  const modelLower = model.toLowerCase();
  return DEDICATED_IMAGE_MODELS.some(m => modelLower.includes(m));
}

/**
 * 判断模型是否支持图片生成（包括专用模型和对话式图片生成模型）
 *
 * @param provider - AI 提供商 ID
 * @param model - 模型 ID
 * @returns true 表示该模型支持图片生成功能
 *
 * @example
 * ```typescript
 * supportsImageGeneration('openai', 'dall-e-3') // => true
 * supportsImageGeneration('google', 'gemini-2.5-flash-image') // => true
 * supportsImageGeneration('anthropic', 'claude-3-opus') // => false
 * ```
 */
export function supportsImageGeneration(provider: ProviderId, model: string): boolean {
  // 1. 专用图片生成模型（所有提供商通用）
  if (isDedicatedImageGenerationModel(model)) {
    return true;
  }

  // 2. Gemini 对话式图片生成模型
  const modelLower = model.toLowerCase();
  if ((provider === 'google' || provider === 'gemini') &&
      CONVERSATIONAL_IMAGE_MODELS.some(m => modelLower.includes(m))) {
    return true;
  }

  // 3. 未来可扩展其他提供商的对话式图片生成支持
  // 例如：Anthropic Claude 未来可能支持

  return false;
}
