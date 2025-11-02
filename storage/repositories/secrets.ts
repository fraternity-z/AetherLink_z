import { IKeyValueStore } from '@/storage/core';
import { SecureKVStore } from '@/storage/adapters/secure-store';

export const SecretsRepository = (store: IKeyValueStore = SecureKVStore) => ({
  async get(key: string): Promise<string | null> {
    const v = await store.get<string>(key);
    return v ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    await store.set<string>(key, value);
  },
  async remove(key: string): Promise<void> {
    await store.remove(key);
  },
});

