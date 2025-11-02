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
    const base = (cfg.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const origin = (() => {
      try { return new URL(base).origin; } catch { return base; }
    })().replace(/\/$/, '');

    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    // Try multiple common endpoints in order
    const candidates = [
      `${base}/models`, // OpenAI-compatible
      `${origin}/api/models`, // aggregator style (your gateway)
    ];

    const tried: string[] = [];
    for (const url of candidates) {
      tried.push(url);
      try {
        // Try GET
        let data = await j(url, { headers });
        let arr: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.models)
          ? data.models
          : [];
        if (!arr.length && /get-available-models-list\/?$/.test(url)) {
          // some gateways require POST
          data = await j(url, { method: 'POST', headers, body: JSON.stringify({}) } as any);
          arr = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
        }
        if (arr.length) {
          return arr
            .map((m) => ({ id: String(m.id || m.model || m.name), label: String(m.label || m.display_name || m.name || m.id) }))
            .filter((x) => x.id);
        }
      } catch (_) {
        // skip to next
      }
    }

    throw new Error(`未能从以下地址获取模型列表：\n${tried.join('\n')}\n请确认网关支持其中一种，并确保设备可解析 ${origin}`);
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
