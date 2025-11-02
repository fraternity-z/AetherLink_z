import AsyncStorage from '@react-native-async-storage/async-storage';
import { IKeyValueStore, safeJSON } from '@/storage/core';

export const AsyncKVStore: IKeyValueStore = {
  async get<T = any>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return safeJSON.parse<T>(raw);
  },
  async set<T = any>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, safeJSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    const entries = await AsyncStorage.multiGet(keys);
    const out: Record<string, any> = {};
    for (const [k, v] of entries) out[k] = safeJSON.parse(v);
    return out;
  },
  async multiSet(entries: Record<string, any>): Promise<void> {
    const arr = Object.entries(entries).map(([k, v]) => [k, safeJSON.stringify(v)] as [string, string]);
    await AsyncStorage.multiSet(arr);
  },
  async clearNamespace(prefix: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(k => k.startsWith(prefix));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  },
};

