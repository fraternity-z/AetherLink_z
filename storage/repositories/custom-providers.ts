import { AsyncKVStore } from '@/storage/adapters/async-storage';
import { safeJSON } from '@/storage/core';
import { uuid } from '@/storage/core';

export type CustomProviderType = 'openai-compatible' | 'anthropic' | 'google';

export interface CustomProvider {
  id: string;                 // cp-xxxx
  name: string;               // 显示名称
  type: CustomProviderType;   // 用于自动选择 SDK
  baseURL?: string | null;    // 兼容型需要
  apiKey?: string | null;
  enabled: boolean;
  createdAt: number;
}

const LIST_KEY = 'al:custom:providers:list';

async function readList(): Promise<CustomProvider[]> {
  const raw = await AsyncKVStore.get<string>(LIST_KEY);
  return safeJSON.parse<CustomProvider[]>(raw) ?? [];
}

async function writeList(items: CustomProvider[]): Promise<void> {
  await AsyncKVStore.set(LIST_KEY, JSON.stringify(items));
}

export const CustomProvidersRepository = {
  async list(): Promise<CustomProvider[]> {
    return await readList();
  },

  async add(input: { name: string; type: CustomProviderType; baseURL?: string | null; apiKey?: string | null; enabled?: boolean }): Promise<CustomProvider> {
    const item: CustomProvider = {
      id: `cp-${uuid()}`,
      name: input.name.trim(),
      type: input.type,
      baseURL: input.baseURL ?? null,
      apiKey: input.apiKey ?? null,
      enabled: input.enabled ?? true,
      createdAt: Date.now(),
    };
    const list = await readList();
    list.push(item);
    await writeList(list);
    return item;
  },

  async remove(id: string): Promise<void> {
    const list = await readList();
    const next = list.filter(x => x.id !== id);
    await writeList(next);
  },

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const list = await readList();
    const next = list.map(x => (x.id === id ? { ...x, enabled } : x));
    await writeList(next);
  },

  async update(id: string, patch: Partial<Omit<CustomProvider, 'id' | 'createdAt'>>): Promise<void> {
    const list = await readList();
    const next = list.map(x => (x.id === id ? { ...x, ...patch } : x));
    await writeList(next);
  },
};

