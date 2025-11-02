import { AsyncKVStore } from '@/storage/adapters/async-storage';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'google' | 'deepseek' | 'volc' | 'zhipu';

export interface ProviderConfig {
  id: ProviderId;
  enabled: boolean;
  baseURL?: string | null;
}

const key = (id: ProviderId, name: string) => `al:provider:${id}:${name}`;

export const ProvidersRepository = {
  async getConfig(id: ProviderId): Promise<ProviderConfig> {
    const enabled = (await AsyncKVStore.get<boolean>(key(id, 'enabled'))) ?? false;
    const baseURL = (await AsyncKVStore.get<string>(key(id, 'base_url'))) ?? null;
    return { id, enabled, baseURL };
  },

  async setEnabled(id: ProviderId, enabled: boolean): Promise<void> {
    await AsyncKVStore.set(key(id, 'enabled'), enabled);
  },

  async setBaseURL(id: ProviderId, url: string): Promise<void> {
    await AsyncKVStore.set(key(id, 'base_url'), url);
  },

  async getApiKey(id: ProviderId): Promise<string | null> {
    return await AsyncKVStore.get<string>(key(id, 'api_key'));
  },

  async setApiKey(id: ProviderId, value: string): Promise<void> {
    await AsyncKVStore.set(key(id, 'api_key'), value);
  },
};
