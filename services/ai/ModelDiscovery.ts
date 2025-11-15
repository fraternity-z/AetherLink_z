import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { getModelTags, type ModelTag, type ModelWithCapabilities } from './ModelCapabilities';
import { logger } from '@/utils/logger';

/**
 * 发现的模型信息(包含标签)
 */
export interface DiscoveredModel {
  id: string;
  label?: string;
  tags?: ModelTag[];
}

async function getKey(provider: ProviderId): Promise<string | null> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  return ProvidersRepository.getApiKey(provider);
}

/**
 * 为模型添加能力标签
 *
 * @param models - 发现的模型列表
 * @param provider - 提供商 ID
 * @returns 包含标签信息的模型列表
 */
function enrichModelsWithTags(models: DiscoveredModel[], provider: ProviderId): DiscoveredModel[] {
  return models.map((model) => {
    try {
      const modelWithCaps: ModelWithCapabilities = {
        id: model.id,
        provider,
        name: model.label,
      };
      const tags = getModelTags(modelWithCaps);
      return {
        ...model,
        tags,
      };
    } catch (err) {
      logger.warn(`[ModelDiscovery] 为模型 ${model.id} 识别标签失败`, { error: err });
      return model;
    }
  });
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

      const models = arr
        .map((m) => ({
          id: String(m.id || m.model || ''),
          label: String(m.id || m.model || '')
        }))
        .filter((x) => x.id);

      logger.info(`[ModelDiscovery] 从 ${provider} 获取到 ${models.length} 个模型`, {
        provider,
        count: models.length,
      });

      return enrichModelsWithTags(models, provider);
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

      const models = items.map((m) => ({
        id: String(m.id || ''),
        label: String(m.display_name || m.id || '')
      }));

      logger.info(`[ModelDiscovery] 从 ${provider} 获取到 ${models.length} 个模型`, {
        provider,
        count: models.length,
      });

      return enrichModelsWithTags(models, provider);
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

      const models = items
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

      logger.info(`[ModelDiscovery] 从 ${provider} 获取到 ${models.length} 个模型`, {
        provider,
        count: models.length,
      });

      return enrichModelsWithTags(models, provider);
    } catch (err: any) {
      throw new Error(`获取 Gemini 模型列表失败：${err.message || err}\n请求地址：${url}`);
    }
  }

  throw new Error('不支持的提供商');
}
