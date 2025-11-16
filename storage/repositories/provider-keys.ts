/**
 * Provider API Keys Repository
 * 提供商多 Key 数据访问层
 */

import { queryAll, queryOne, execute } from '@/storage/sqlite/db';
import type {
  ApiKeyConfig,
  KeyStatus,
  KeyStats,
  ApiKeyUsage,
} from '@/storage/types/api-key-config';
import type { ProviderId } from './providers';
import { logger } from '@/utils/logger';
import { withRepositoryContext } from './error-handler';

/**
 * 数据库行类型（snake_case）
 */
interface ApiKeyRow {
  id: string;
  provider_id: string;
  key: string;
  name: string | null;
  is_enabled: number;
  is_primary: number;
  priority: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  last_used: number | null;
  consecutive_failures: number;
  status: KeyStatus;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * 将数据库行转换为 ApiKeyConfig
 */
function rowToConfig(row: ApiKeyRow): ApiKeyConfig {
  return {
    id: row.id,
    providerId: row.provider_id as ProviderId,
    key: row.key,
    name: row.name || undefined,
    isEnabled: row.is_enabled === 1,
    isPrimary: row.is_primary === 1,
    priority: row.priority,
    usage: {
      totalRequests: row.total_requests,
      successfulRequests: row.successful_requests,
      failedRequests: row.failed_requests,
      lastUsed: row.last_used || undefined,
      consecutiveFailures: row.consecutive_failures,
    },
    status: row.status,
    lastError: row.last_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 生成唯一的 Key ID
 */
function generateKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export const ProviderKeysRepository = {
  /**
   * 创建新的 API Key
   */
  async create(
    config: Omit<ApiKeyConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiKeyConfig> {
    return withRepositoryContext('ProviderKeysRepository', 'create', { providerId: config.providerId, table: 'provider_api_keys' }, async () => {
      const now = Date.now();
      const id = generateKeyId();

      await execute(
        `INSERT INTO provider_api_keys (
          id, provider_id, key, name, is_enabled, is_primary, priority,
          total_requests, successful_requests, failed_requests, last_used, consecutive_failures,
          status, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          config.providerId,
          config.key,
          config.name || null,
          config.isEnabled ? 1 : 0,
          config.isPrimary ? 1 : 0,
          config.priority,
          config.usage.totalRequests,
          config.usage.successfulRequests,
          config.usage.failedRequests,
          config.usage.lastUsed || null,
          config.usage.consecutiveFailures,
          config.status,
          config.lastError || null,
          now,
          now,
        ]
      );

      logger.info('[ProviderKeysRepository] 创建新 Key', {
        id,
        providerId: config.providerId,
        name: config.name,
      });

      return {
        ...config,
        id,
        createdAt: now,
        updatedAt: now,
      };
    });
  },

  /**
   * 更新 API Key
   */
  async update(id: string, updates: Partial<ApiKeyConfig>): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'update', { keyId: id, table: 'provider_api_keys' }, async () => {
      const now = Date.now();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.key !== undefined) {
        fields.push('key = ?');
        values.push(updates.key);
      }
      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name || null);
      }
      if (updates.isEnabled !== undefined) {
        fields.push('is_enabled = ?');
        values.push(updates.isEnabled ? 1 : 0);
      }
      if (updates.isPrimary !== undefined) {
        fields.push('is_primary = ?');
        values.push(updates.isPrimary ? 1 : 0);
      }
      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.lastError !== undefined) {
        fields.push('last_error = ?');
        values.push(updates.lastError || null);
      }

      if (fields.length === 0) return;

      fields.push('updated_at = ?');
      values.push(now);

      values.push(id);

      await execute(
        `UPDATE provider_api_keys SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      logger.info('[ProviderKeysRepository] 更新 Key', { id, fields: fields.length });
    });
  },

  /**
   * 删除 API Key
   */
  async delete(id: string): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'delete', { keyId: id, table: 'provider_api_keys' }, async () => {
      await execute('DELETE FROM provider_api_keys WHERE id = ?', [id]);
      logger.info('[ProviderKeysRepository] 删除 Key', { id });
    });
  },

  /**
   * 根据 ID 获取 Key
   */
  async getById(id: string): Promise<ApiKeyConfig | null> {
    return withRepositoryContext('ProviderKeysRepository', 'getById', { keyId: id, table: 'provider_api_keys' }, async () => {
      const row = await queryOne<ApiKeyRow>(
        'SELECT * FROM provider_api_keys WHERE id = ?',
        [id]
      );
      return row ? rowToConfig(row) : null;
    });
  },

  /**
   * 列出提供商的所有 Key
   */
  async listByProvider(providerId: ProviderId): Promise<ApiKeyConfig[]> {
    return withRepositoryContext('ProviderKeysRepository', 'listByProvider', { providerId, table: 'provider_api_keys' }, async () => {
      const rows = await queryAll<ApiKeyRow>(
        'SELECT * FROM provider_api_keys WHERE provider_id = ? ORDER BY priority ASC, created_at ASC',
        [providerId]
      );
      return rows.map(rowToConfig);
    });
  },

  /**
   * 列出可用的 Key（enabled + 非冷却期）
   */
  async listActiveKeys(
    providerId: ProviderId,
    failureRecoveryTimeMinutes: number = 5
  ): Promise<ApiKeyConfig[]> {
    return withRepositoryContext('ProviderKeysRepository', 'listActiveKeys', { providerId, failureRecoveryTimeMinutes, table: 'provider_api_keys' }, async () => {
      const rows = await queryAll<ApiKeyRow>(
        `SELECT * FROM provider_api_keys
         WHERE provider_id = ?
           AND is_enabled = 1
           AND status IN ('active', 'error')
         ORDER BY priority ASC, created_at ASC`,
        [providerId]
      );

      const now = Date.now();
      const cooldownMs = failureRecoveryTimeMinutes * 60 * 1000;

      // 过滤掉冷却期中的 Key
      const activeKeys = rows.filter((row) => {
        if (row.status === 'active') return true;
        if (row.status === 'error') {
          const timeSinceUpdate = now - row.updated_at;
          return timeSinceUpdate >= cooldownMs;
        }
        return false;
      });

      return activeKeys.map(rowToConfig);
    });
  },

  /**
   * 获取主要密钥
   */
  async getPrimaryKey(providerId: ProviderId): Promise<ApiKeyConfig | null> {
    return withRepositoryContext('ProviderKeysRepository', 'getPrimaryKey', { providerId, table: 'provider_api_keys' }, async () => {
      const row = await queryOne<ApiKeyRow>(
        'SELECT * FROM provider_api_keys WHERE provider_id = ? AND is_primary = 1 LIMIT 1',
        [providerId]
      );
      return row ? rowToConfig(row) : null;
    });
  },

  /**
   * 更新使用统计
   */
  async updateUsageStats(
    id: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'updateUsageStats', { keyId: id, success, table: 'provider_api_keys' }, async () => {
      const now = Date.now();

      if (success) {
        // 成功：增加总请求数和成功数，重置连续失败
        await execute(
          `UPDATE provider_api_keys
           SET total_requests = total_requests + 1,
               successful_requests = successful_requests + 1,
               consecutive_failures = 0,
               last_used = ?,
               updated_at = ?
           WHERE id = ?`,
          [now, now, id]
        );
      } else {
        // 失败：增加总请求数和失败数，增加连续失败
        await execute(
          `UPDATE provider_api_keys
           SET total_requests = total_requests + 1,
               failed_requests = failed_requests + 1,
               consecutive_failures = consecutive_failures + 1,
               last_used = ?,
               last_error = ?,
               updated_at = ?
           WHERE id = ?`,
          [now, error || null, now, id]
        );
      }

      logger.info('[ProviderKeysRepository] 更新使用统计', {
        id,
        success,
        error: error ? error.substring(0, 50) : undefined,
      });
    });
  },

  /**
   * 重置连续失败次数
   */
  async resetConsecutiveFailures(id: string): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'resetConsecutiveFailures', { keyId: id, table: 'provider_api_keys' }, async () => {
      const now = Date.now();
      await execute(
        'UPDATE provider_api_keys SET consecutive_failures = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );
    });
  },

  /**
   * 设置 Key 状态
   */
  async setStatus(id: string, status: KeyStatus): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'setStatus', { keyId: id, status, table: 'provider_api_keys' }, async () => {
      const now = Date.now();
      await execute(
        'UPDATE provider_api_keys SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, id]
      );
      logger.info('[ProviderKeysRepository] 设置 Key 状态', { id, status });
    });
  },

  /**
   * 设置为主要密钥（同时取消该提供商的其他主要密钥）
   */
  async setPrimary(providerId: ProviderId, keyId: string): Promise<void> {
    return withRepositoryContext('ProviderKeysRepository', 'setPrimary', { providerId, keyId, table: 'provider_api_keys' }, async () => {
      const now = Date.now();

      // 先取消该提供商的所有主要密钥
      await execute(
        'UPDATE provider_api_keys SET is_primary = 0, updated_at = ? WHERE provider_id = ?',
        [now, providerId]
      );

      // 设置新的主要密钥
      await execute(
        'UPDATE provider_api_keys SET is_primary = 1, updated_at = ? WHERE id = ?',
        [now, keyId]
      );

      logger.info('[ProviderKeysRepository] 设置主要密钥', {
        providerId,
        keyId,
      });
    });
  },

  /**
   * 获取统计数据
   */
  async getKeyStats(providerId: ProviderId): Promise<KeyStats> {
    return withRepositoryContext('ProviderKeysRepository', 'getKeyStats', { providerId, table: 'provider_api_keys' }, async () => {
      const rows = await queryAll<ApiKeyRow>(
        'SELECT * FROM provider_api_keys WHERE provider_id = ?',
        [providerId]
      );

      const stats: KeyStats = {
        total: rows.length,
        active: 0,
        disabled: 0,
        error: 0,
        totalRequests: 0,
        successRate: 0,
      };

      let totalSuccessful = 0;

      rows.forEach((row) => {
        switch (row.status) {
          case 'active':
            stats.active++;
            break;
          case 'disabled':
            stats.disabled++;
            break;
          case 'error':
            stats.error++;
            break;
        }

        stats.totalRequests += row.total_requests;
        totalSuccessful += row.successful_requests;
      });

      stats.successRate =
        stats.totalRequests > 0
          ? Math.round((totalSuccessful / stats.totalRequests) * 100)
          : 0;

      return stats;
    });
  },

  /**
   * 检查 Key 是否在冷却期
   */
  async isInCooldown(
    keyId: string,
    failureRecoveryTimeMinutes: number = 5
  ): Promise<boolean> {
    return withRepositoryContext('ProviderKeysRepository', 'isInCooldown', { keyId, failureRecoveryTimeMinutes, table: 'provider_api_keys' }, async () => {
      const key = await this.getById(keyId);
      if (!key || key.status !== 'error') return false;

      const cooldownMs = failureRecoveryTimeMinutes * 60 * 1000;
      const timeSinceUpdate = Date.now() - key.updatedAt;

      return timeSinceUpdate < cooldownMs;
    });
  },
};
