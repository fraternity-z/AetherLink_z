import { AsyncKVStore } from '@/storage/adapters/async-storage';
import { SecretsRepository } from '@/storage/repositories/secrets';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'google' | 'deepseek' | 'volc' | 'zhipu';

export interface ProviderConfig {
  id: ProviderId;
  enabled: boolean;
  baseURL?: string | null;
}

// AsyncStorage keys可以包含冒号，便于命名空间；SecureStore不允许（仅 [A-Za-z0-9_.-]）。
const key = (id: ProviderId, name: string) => `al:provider:${id}:${name}`; // for AsyncStorage
const secureKey = (id: ProviderId, name: string) => `al_provider_${id}_${name}`; // for SecureStore

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
    const secrets = SecretsRepository();
    return secrets.get(secureKey(id, 'api_key'));
  },

  async setApiKey(id: ProviderId, value: string): Promise<void> {
    const secrets = SecretsRepository();
    await secrets.set(secureKey(id, 'api_key'), value);
  },
};
