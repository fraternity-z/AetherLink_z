/**
 * Provider Key Management Repository
 * 提供商 Key 管理配置数据访问层
 */

import { queryAll, queryOne, execute } from '@/storage/sqlite/db';
import type {
  ProviderKeyManagement,
  LoadBalanceStrategy,
} from '@/storage/types/api-key-config';
import type { ProviderId } from './providers';
import { logger } from '@/utils/logger';
import { withRepositoryContext } from './error-handler';

/**
 * 数据库行类型（snake_case）
 */
interface ManagementRow {
  provider_id: string;
  strategy: LoadBalanceStrategy;
  enable_multi_key: number;
  max_failures_before_disable: number;
  failure_recovery_time_minutes: number;
  updated_at: number;
}

/**
 * 将数据库行转换为 ProviderKeyManagement
 */
function rowToManagement(row: ManagementRow): ProviderKeyManagement {
  return {
    providerId: row.provider_id as ProviderId,
    strategy: row.strategy,
    enableMultiKey: row.enable_multi_key === 1,
    maxFailuresBeforeDisable: row.max_failures_before_disable,
    failureRecoveryTimeMinutes: row.failure_recovery_time_minutes,
    updatedAt: row.updated_at,
  };
}

export const ProviderKeyManagementRepository = {
  /**
   * 获取提供商的 Key 管理配置
   */
  async get(providerId: ProviderId): Promise<ProviderKeyManagement | null> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'get',
      { providerId, table: 'provider_key_management' },
      async () => {
        const row = await queryOne<ManagementRow>(
          'SELECT * FROM provider_key_management WHERE provider_id = ?',
          [providerId]
        );
        return row ? rowToManagement(row) : null;
      }
    );
  },

  /**
   * 插入或更新提供商的 Key 管理配置
   */
  async upsert(config: ProviderKeyManagement): Promise<void> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'upsert',
      { providerId: config.providerId, table: 'provider_key_management' },
      async () => {
        const now = Date.now();

        await execute(
          `INSERT INTO provider_key_management (
            provider_id, strategy, enable_multi_key, max_failures_before_disable,
            failure_recovery_time_minutes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(provider_id) DO UPDATE SET
            strategy = excluded.strategy,
            enable_multi_key = excluded.enable_multi_key,
            max_failures_before_disable = excluded.max_failures_before_disable,
            failure_recovery_time_minutes = excluded.failure_recovery_time_minutes,
            updated_at = excluded.updated_at`,
          [
            config.providerId,
            config.strategy,
            config.enableMultiKey ? 1 : 0,
            config.maxFailuresBeforeDisable,
            config.failureRecoveryTimeMinutes,
            now,
          ]
        );

        logger.info('[ProviderKeyManagementRepository] Upsert 配置', {
          providerId: config.providerId,
          strategy: config.strategy,
          enableMultiKey: config.enableMultiKey,
        });
      }
    );
  },

  /**
   * 获取负载均衡策略（如果不存在则返回默认值 round_robin）
   */
  async getStrategy(providerId: ProviderId): Promise<LoadBalanceStrategy> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'getStrategy',
      { providerId, table: 'provider_key_management' },
      async () => {
        const config = await this.get(providerId);
        return config?.strategy || 'round_robin';
      }
    );
  },

  /**
   * 设置负载均衡策略
   */
  async setStrategy(
    providerId: ProviderId,
    strategy: LoadBalanceStrategy
  ): Promise<void> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'setStrategy',
      { providerId, strategy, table: 'provider_key_management' },
      async () => {
        const existing = await this.get(providerId);

        if (existing) {
          // 更新现有配置
          await this.upsert({
            ...existing,
            strategy,
          });
        } else {
          // 创建新配置
          await this.upsert({
            providerId,
            strategy,
            enableMultiKey: false,
            maxFailuresBeforeDisable: 3,
            failureRecoveryTimeMinutes: 5,
            updatedAt: Date.now(),
          });
        }

        logger.info('[ProviderKeyManagementRepository] 设置策略', {
          providerId,
          strategy,
        });
      }
    );
  },

  /**
   * 检查是否启用多 Key 模式
   */
  async isMultiKeyEnabled(providerId: ProviderId): Promise<boolean> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'isMultiKeyEnabled',
      { providerId, table: 'provider_key_management' },
      async () => {
        const config = await this.get(providerId);
        return config?.enableMultiKey || false;
      }
    );
  },

  /**
   * 设置多 Key 模式开关
   */
  async setMultiKeyEnabled(
    providerId: ProviderId,
    enabled: boolean
  ): Promise<void> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'setMultiKeyEnabled',
      { providerId, enabled, table: 'provider_key_management' },
      async () => {
        const existing = await this.get(providerId);

        if (existing) {
          // 更新现有配置
          await this.upsert({
            ...existing,
            enableMultiKey: enabled,
          });
        } else {
          // 创建新配置
          await this.upsert({
            providerId,
            strategy: 'round_robin',
            enableMultiKey: enabled,
            maxFailuresBeforeDisable: 3,
            failureRecoveryTimeMinutes: 5,
            updatedAt: Date.now(),
          });
        }

        logger.info('[ProviderKeyManagementRepository] 设置多Key模式', {
          providerId,
          enabled,
        });
      }
    );
  },

  /**
   * 获取最大失败次数阈值
   */
  async getMaxFailuresBeforeDisable(providerId: ProviderId): Promise<number> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'getMaxFailuresBeforeDisable',
      { providerId, table: 'provider_key_management' },
      async () => {
        const config = await this.get(providerId);
        return config?.maxFailuresBeforeDisable || 3;
      }
    );
  },

  /**
   * 获取冷却时间（分钟）
   */
  async getFailureRecoveryTimeMinutes(providerId: ProviderId): Promise<number> {
    return withRepositoryContext(
      'ProviderKeyManagementRepository',
      'getFailureRecoveryTimeMinutes',
      { providerId, table: 'provider_key_management' },
      async () => {
        const config = await this.get(providerId);
        return config?.failureRecoveryTimeMinutes || 5;
      }
    );
  },
};
