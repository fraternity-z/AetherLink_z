/**
 * Legacy Key Adapter
 * 单 Key 到多 Key 的数据迁移适配器
 */

import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ProviderKeysRepository } from '@/storage/repositories/provider-keys';
import { ProviderKeyManagementRepository } from '@/storage/repositories/provider-key-management';
import { logger } from '@/utils/logger';

/**
 * 单 Key 到多 Key 的迁移适配器
 */
export const LegacyKeyAdapter = {
  /**
   * 自动迁移单 Key 到多 Key 表
   * 在应用启动时调用，自动检测并迁移现有的单 Key
   */
  async migrateFromAsyncStorage(): Promise<void> {
    const providers: ProviderId[] = [
      'openai',
      'anthropic',
      'google',
      'gemini',
      'deepseek',
      'volc',
      'zhipu',
    ];

    let migratedCount = 0;

    for (const providerId of providers) {
      try {
        // 1. 获取 AsyncStorage 中的单 Key
        const legacyKey = await ProvidersRepository.getApiKey(providerId);
        if (!legacyKey || legacyKey.trim().length === 0) continue;

        // 2. 检查是否已经迁移
        const existingKeys = await ProviderKeysRepository.listByProvider(providerId);
        if (existingKeys.length > 0) {
          logger.info('[LegacyKeyAdapter] 提供商已有 Key，跳过迁移', {
            providerId,
            keysCount: existingKeys.length,
          });
          continue;
        }

        // 3. 迁移到多 Key 表
        await ProviderKeysRepository.create({
          providerId,
          key: legacyKey.trim(),
          name: '默认密钥（自动迁移）',
          isEnabled: true,
          isPrimary: true,
          priority: 1,
          usage: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            consecutiveFailures: 0,
          },
          status: 'active',
        });

        // 4. 初始化 Key 管理配置（默认禁用多 Key 模式）
        await ProviderKeyManagementRepository.upsert({
          providerId,
          strategy: 'round_robin',
          enableMultiKey: false, // 默认保持单 Key 模式
          maxFailuresBeforeDisable: 3,
          failureRecoveryTimeMinutes: 5,
          updatedAt: Date.now(),
        });

        migratedCount++;
        logger.info('[LegacyKeyAdapter] 自动迁移单 Key 成功', { providerId });
      } catch (error) {
        logger.error('[LegacyKeyAdapter] 迁移失败', {
          providerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (migratedCount > 0) {
      logger.info('[LegacyKeyAdapter] 迁移完成', {
        总数: migratedCount,
        提示: '原始 AsyncStorage 数据已保留作为备份',
      });
    }
  },

  /**
   * 向后兼容：如果多 Key 表为空，fallback 到 AsyncStorage
   * 用于 getApiKey 方法的兼容性包装
   */
  async getCompatibleKey(providerId: ProviderId): Promise<string | null> {
    // 1. 优先从多 Key 表获取
    const keys = await ProviderKeysRepository.listByProvider(providerId);

    if (keys.length > 0) {
      // 多 Key 模式：返回主要密钥或第一个可用 Key
      const primary = keys.find((k) => k.isPrimary) || keys[0];
      return primary.key;
    }

    // 2. Fallback 到 AsyncStorage（向后兼容）
    logger.info('[LegacyKeyAdapter] 多 Key 表为空，Fallback 到 AsyncStorage', {
      providerId,
    });
    return await ProvidersRepository.getApiKey(providerId);
  },

  /**
   * 向后兼容：设置 API Key（自动判断是单 Key 还是多 Key 模式）
   */
  async setCompatibleKey(providerId: ProviderId, key: string): Promise<void> {
    const isMultiKeyEnabled =
      await ProviderKeyManagementRepository.isMultiKeyEnabled(providerId);

    if (isMultiKeyEnabled) {
      // 多 Key 模式：更新或创建主要密钥
      const primaryKey = await ProviderKeysRepository.getPrimaryKey(providerId);

      if (primaryKey) {
        // 更新现有主要密钥
        await ProviderKeysRepository.update(primaryKey.id, { key });
        logger.info('[LegacyKeyAdapter] 更新主要密钥', { providerId });
      } else {
        // 创建新的主要密钥
        await ProviderKeysRepository.create({
          providerId,
          key,
          name: '主要密钥',
          isEnabled: true,
          isPrimary: true,
          priority: 1,
          usage: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            consecutiveFailures: 0,
          },
          status: 'active',
        });
        logger.info('[LegacyKeyAdapter] 创建主要密钥', { providerId });
      }
    } else {
      // 单 Key 模式：直接写入 AsyncStorage（保持向后兼容）
      await ProvidersRepository.setApiKey(providerId, key);
      logger.info('[LegacyKeyAdapter] 单 Key 模式，写入 AsyncStorage', {
        providerId,
      });
    }
  },
};
