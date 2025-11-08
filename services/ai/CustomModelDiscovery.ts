import type { CustomProvider } from '@/storage/repositories/custom-providers';

export interface DiscoveredModel { id: string; label?: string }

// 仅对 openai-compatible 尝试自动获取；其他类型暂返回空数组（可手动添加）
export async function fetchCustomProviderModels(cp: CustomProvider): Promise<DiscoveredModel[]> {
  if (cp.type !== 'openai-compatible') {
    return [];
  }
  const apiKey = cp.apiKey || '';
  if (!apiKey) throw new Error('缺少 API Key，请先在该提供商页填写并保存');
  const base = (cp.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const url = `${base}/models`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, { headers } as any);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`获取失败(${res.status}): ${txt}`);
  }
  const data = await res.json();
  const arr: any[] = Array.isArray(data?.data) ? data.data : [];
  return arr.map((m) => ({ id: String(m.id || m.model || ''), label: String(m.id || m.model || '') })).filter((x) => x.id);
}

