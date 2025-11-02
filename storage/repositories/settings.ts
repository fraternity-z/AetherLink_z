import { IKeyValueStore, prefixer } from '@/storage/core';
import { AsyncKVStore } from '@/storage/adapters/async-storage';

export enum SettingKey {
  Theme = 'al:settings:theme',
  DefaultModel = 'al:settings:default_model',
  HapticsOn = 'al:settings:haptics_on',
}

const p = prefixer('settings'); // For clearNamespace use if needed

export const SettingsRepository = (store: IKeyValueStore = AsyncKVStore) => ({
  async get<T = any>(key: SettingKey): Promise<T | null> {
    return store.get<T>(key);
  },
  async set<T = any>(key: SettingKey, value: T): Promise<void> {
    await store.set<T>(key, value);
  },
  async clearAll(): Promise<void> {
    await store.clearNamespace('al:settings:');
  },
});

