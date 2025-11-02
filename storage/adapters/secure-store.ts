import * as SecureStore from 'expo-secure-store';
import { IKeyValueStore, safeJSON, isWeb } from '@/storage/core';

// Minimal in-memory fallback for web when secure storage is unavailable
const mem = new Map<string, string>();

async function canUseSecureStore() {
  try {
    if (isWeb) return false;
    const available = await SecureStore.isAvailableAsync();
    return !!available;
  } catch (e) {
    return false;
  }
}

export const SecureKVStore: IKeyValueStore = {
  async get<T = any>(key: string): Promise<T | null> {
    if (await canUseSecureStore()) {
      const raw = await SecureStore.getItemAsync(key);
      return safeJSON.parse<T>(raw);
    }
    return safeJSON.parse<T>(mem.get(key) ?? null);
  },
  async set<T = any>(key: string, value: T): Promise<void> {
    const raw = safeJSON.stringify(value);
    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(key, raw, { keychainService: 'aetherlink_z' });
    } else {
      mem.set(key, raw);
    }
  },
  async remove(key: string): Promise<void> {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(key, { keychainService: 'aetherlink_z' });
    } else {
      mem.delete(key);
    }
  },
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = await this.get(k);
    return out;
  },
  async multiSet(entries: Record<string, any>): Promise<void> {
    const tasks = Object.entries(entries).map(([k, v]) => this.set(k, v));
    await Promise.all(tasks);
  },
  async clearNamespace(prefix: string): Promise<void> {
    if (await canUseSecureStore()) {
      // SecureStore 无法列举 key，退化为 no-op；由上层维护 key 列表时可清理
      return;
    }
    for (const k of Array.from(mem.keys())) if (k.startsWith(prefix)) mem.delete(k);
  },
};
