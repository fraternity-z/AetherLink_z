import { now } from '@/storage/core';
import { execute, queryAll } from '@/storage/sqlite/db';

export interface ProviderModel {
  provider: string;
  modelId: string;
  label?: string | null;
  enabled: boolean;
  updatedAt: number;
}

const defaults: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'o4-mini'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
  google: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  volc: ['doubao-1.5-lite', 'doubao-1.5-pro'],
  zhipu: ['glm-4', 'glm-4-flash'],
};

export const ProviderModelsRepository = {
  async list(provider?: string): Promise<ProviderModel[]> {
    const where = provider ? 'WHERE provider = ?' : '';
    const rows = await queryAll<any>(
      `SELECT provider as provider, model_id as modelId, label, enabled, updated_at as updatedAt FROM provider_models ${where} ORDER BY provider, model_id`,
      provider ? [provider] : []
    );
    return rows.map((r) => ({ ...r, enabled: !!r.enabled }));
  },

  async upsert(provider: string, modelId: string, label?: string | null, enabled = true): Promise<void> {
    await execute(
      `INSERT OR REPLACE INTO provider_models (provider, model_id, label, enabled, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [provider, modelId, label ?? null, enabled ? 1 : 0, now()]
    );
  },

  async remove(provider: string, modelId: string): Promise<void> {
    await execute(`DELETE FROM provider_models WHERE provider = ? AND model_id = ?`, [provider, modelId]);
  },

  async removeAll(provider: string): Promise<void> {
    await execute(`DELETE FROM provider_models WHERE provider = ?`, [provider]);
  },

  async listOrDefaults(provider: string): Promise<ProviderModel[]> {
    const rows = await this.list(provider);
    if (rows.length) return rows.filter((m) => m.enabled !== false);
    const arr = defaults[provider] ?? [];
    return arr.map((m) => ({ provider, modelId: m, label: m, enabled: true, updatedAt: now() }));
  },
};
