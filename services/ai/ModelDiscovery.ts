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
    const base = cfg.baseURL || 'https://api.openai.com/v1';
    const data = await j(`${base.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const items: any[] = Array.isArray(data?.data) ? data.data : [];
    return items
      .map((m) => ({ id: m.id as string, label: m.id as string }))
      .filter((m) => typeof m.id === 'string');
  }

  if (provider === 'anthropic') {
    const base = 'https://api.anthropic.com';
    const data = await j(`${base}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
    });
    const items: any[] = Array.isArray(data?.data) ? data.data : [];
    return items.map((m) => ({ id: m.id as string, label: m.display_name || m.id }));
  }

  if (provider === 'google' || provider === 'gemini') {
    // Gemini uses API key in query
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const data = await j(url);
    const items: any[] = Array.isArray(data?.models) ? data.models : [];
    return items
      .filter((m) => typeof m?.name === 'string')
      .map((m) => ({ id: String(m.name).split('/').pop() as string, label: m.displayName || m.name }));
  }

  throw new Error('不支持的提供商');
}

