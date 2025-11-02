import { IKeyValueStore, safeJSON } from '@/storage/core';

// Very small localStorage based adapter for web-only scenarios
export const WebLocalKV: IKeyValueStore = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const raw = globalThis.localStorage?.getItem(key) ?? null;
      return safeJSON.parse<T>(raw);
    } catch {
      return null;
    }
  },
  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, safeJSON.stringify(value));
    } catch {}
  },
  async remove(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {}
  },
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = await this.get(k);
    return out;
  },
  async multiSet(entries: Record<string, any>): Promise<void> {
    await Promise.all(Object.entries(entries).map(([k, v]) => this.set(k, v)));
  },
  async clearNamespace(prefix: string): Promise<void> {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      for (let i = ls.length - 1; i >= 0; i--) {
        const k = ls.key(i);
        if (k && k.startsWith(prefix)) ls.removeItem(k);
      }
    } catch {}
  },
};

