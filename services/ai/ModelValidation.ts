import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';

export type ValidateResult = { ok: boolean; message: string };

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error('timeout')), ms);
  return new Promise((resolve, reject) => {
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function validateProviderModel(provider: ProviderId, modelId: string): Promise<ValidateResult> {
  if (!modelId || !modelId.trim()) {
    return { ok: false, message: '模型 ID 为空' };
  }
  const cfg = await ProvidersRepository.getConfig(provider);
  const apiKey = await ProvidersRepository.getApiKey(provider);
  if (!apiKey) return { ok: false, message: '缺少 API Key，请先在该提供商页填写并保存' };

  // OpenAI 兼容：openai/deepseek/volc/zhipu
  if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
    const base = (cfg.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // 1) 首选 GET /models/:id
    try {
      const url = `${base}/models/${encodeURIComponent(modelId)}`;
      const res = await withTimeout(fetch(url, { headers }));
      if (res.ok) return { ok: true, message: `${modelId} 可用（models/${modelId}）` };
      // 若 404/405/未实现则进入兜底
    } catch (e: any) {
      // 网络/超时，继续走兜底
    }

    // 2) 兜底：最小生成（chat/completions）
    try {
      const url = `${base}/chat/completions`;
      const body = JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      });
      const res = await withTimeout(fetch(url, { method: 'POST', headers, body }));
      if (res.ok) return { ok: true, message: `${modelId} 可用（chat/completions）` };
      const txt = await res.text();
      return { ok: false, message: `校验失败：${res.status} ${txt}` };
    } catch (e: any) {
      return { ok: false, message: `校验异常：${e?.message || e}` };
    }
  }

  if (provider === 'anthropic') {
    const base = (cfg.baseURL || 'https://api.anthropic.com').replace(/\/$/, '');
    const url = `${base}/v1/messages`;
    try {
      const res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: modelId, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      }));
      if (res.ok) return { ok: true, message: `${modelId} 可用（anthropic/messages）` };
      const txt = await res.text();
      return { ok: false, message: `校验失败：${res.status} ${txt}` };
    } catch (e: any) {
      return { ok: false, message: `校验异常：${e?.message || e}` };
    }
  }

  if (provider === 'google' || provider === 'gemini') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      }));
      if (res.ok) return { ok: true, message: `${modelId} 可用（gemini/generateContent）` };
      const txt = await res.text();
      return { ok: false, message: `校验失败：${res.status} ${txt}` };
    } catch (e: any) {
      return { ok: false, message: `校验异常：${e?.message || e}` };
    }
  }

  return { ok: false, message: '暂未支持该提供商的校验' };
}
