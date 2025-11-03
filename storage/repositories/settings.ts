import { IKeyValueStore, prefixer } from '@/storage/core';
import { AsyncKVStore } from '@/storage/adapters/async-storage';

export enum SettingKey {
  Theme = 'al:settings:theme',
  DefaultModel = 'al:settings:default_model',
  DefaultProvider = 'al:settings:default_provider',
  HapticsOn = 'al:settings:haptics_on',
  AnalyticsEnabled = 'al:settings:analytics_enabled',
  LocalCacheEnabled = 'al:settings:local_cache_enabled',
  // 对话参数设置
  ChatTemperature = 'al:settings:chat_temperature',
  ChatMaxTokens = 'al:settings:chat_max_tokens',
  ChatMaxTokensEnabled = 'al:settings:chat_max_tokens_enabled',
  ChatContextCount = 'al:settings:chat_context_count',
  ChatSystemPrompt = 'al:settings:chat_system_prompt',
  ChatStreamOutput = 'al:settings:chat_stream_output',
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
