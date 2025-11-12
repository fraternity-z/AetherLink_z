import type { CustomProvider } from '@/storage/repositories/custom-providers';
import { performHttpRequest } from '@/utils/http';

export type ValidateResult = { ok: boolean; message: string };

export async function validateCustomProviderModel(cp: CustomProvider, modelId: string): Promise<ValidateResult> {
  if (!modelId || !modelId.trim()) return { ok: false, message: '模型 ID 为空' };
  const apiKey = cp.apiKey || '';
  if (!apiKey) return { ok: false, message: '缺少 API Key，请先在该提供商页填写并保存' };

  if (cp.type === 'openai-compatible') {
    const base = (cp.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const headers: Record<string,string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type':'application/json' };
    try {
      const url = `${base}/models/${encodeURIComponent(modelId)}`;
      await performHttpRequest(url, { method: 'GET', headers, timeout: 8000 });
      return { ok: true, message: `${modelId} 可用（models/${modelId}）` };
    } catch {}
    try {
      const url = `${base}/chat/completions`;
      const body = JSON.stringify({ model: modelId, messages:[{ role:'user', content:'ping' }], max_tokens:1, stream:false });
      await performHttpRequest(url, { method:'POST', headers, body, timeout: 8000 });
      return { ok: true, message: `${modelId} 可用（chat/completions）` };
    } catch (e:any) {
      return { ok: false, message: `校验失败/异常：${e?.message || e}` };
    }
  }

  if (cp.type === 'anthropic') {
    const base = (cp.baseURL || 'https://api.anthropic.com').replace(/\/$/, '');
    const url = `${base}/v1/messages`;
    try {
      const headers: Record<string,string> = { 'x-api-key': apiKey, 'Content-Type':'application/json', 'anthropic-version':'2023-06-01' };
      const body = JSON.stringify({ model: modelId, max_tokens:1, messages:[{ role:'user', content:'ping' }] });
      await performHttpRequest(url, { method:'POST', headers, body, timeout: 8000 });
      return { ok: true, message: `${modelId} 可用（anthropic/messages）` };
    } catch (e:any) {
      return { ok: false, message: `校验失败/异常：${e?.message || e}` };
    }
  }

  if (cp.type === 'google') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const headers: Record<string,string> = { 'Content-Type':'application/json' };
      const body = JSON.stringify({ contents:[{ parts:[{ text:'ping' }] }] });
      await performHttpRequest(url, { method:'POST', headers, body, timeout: 8000 });
      return { ok: true, message: `${modelId} 可用（gemini/generateContent）` };
    } catch (e:any) {
      return { ok: false, message: `校验失败/异常：${e?.message || e}` };
    }
  }

  return { ok: false, message: '暂未支持该提供商的校验' };
}
