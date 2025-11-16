/**
 * API Key Manager
 * 负载均衡、故障转移和状态管理
 */

import type {
  ApiKeyConfig,
  KeySelectionResult,
  LoadBalanceStrategy,
  KeyStats,
} from '@/storage/types/api-key-config';
import type { ProviderId } from '@/storage/repositories/providers';
import { ProviderKeysRepository } from '@/storage/repositories/provider-keys';
import { ProviderKeyManagementRepository } from '@/storage/repositories/provider-key-management';
import { logger } from '@/utils/logger';
import { withAiServiceContext, withSyncAiServiceContext } from './error-handler';

/**
 * API Key 管理服务（单例）
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;

  /** 轮询索引追踪（提供商 ID -> 当前索引） */
  private roundRobinIndexMap = new Map<string, number>();

  private constructor() {
    // 私有构造函数，强制使用单例
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * 根据策略选择可用的 API Key
   */
  async selectApiKey(
    providerId: ProviderId,
    strategy?: LoadBalanceStrategy
  ): Promise<KeySelectionResult> {
    return withAiServiceContext('ApiKeyManager', 'selectApiKey', { providerId, strategy }, async () => {
      // 1. 获取负载均衡策略
      const actualStrategy =
        strategy || (await ProviderKeyManagementRepository.getStrategy(providerId));

      // 2. 获取冷却时间配置
      const cooldownMinutes =
        await ProviderKeyManagementRepository.getFailureRecoveryTimeMinutes(providerId);

      // 3. 获取可用的 Key 列表（已过滤 disabled 和冷却期）
      const availableKeys = await ProviderKeysRepository.listActiveKeys(
        providerId,
        cooldownMinutes
      );

      if (availableKeys.length === 0) {
        return {
          key: null,
          reason: '没有可用的 API Key',
        };
      }

      // 4. 根据策略选择 Key
      let selectedKey: ApiKeyConfig;

      switch (actualStrategy) {
        case 'priority':
          selectedKey = this.selectByPriority(availableKeys);
          break;
        case 'least_used':
          selectedKey = this.selectByLeastUsed(availableKeys);
          break;
        case 'random':
          selectedKey = this.selectByRandom(availableKeys);
          break;
        case 'round_robin':
        default:
          selectedKey = this.selectByRoundRobin(providerId, availableKeys);
          break;
      }

      return {
        key: selectedKey,
        reason: `使用 ${actualStrategy} 策略选择`,
      };
    });
  }

  /**
   * 轮询策略（Round Robin）
   * 真正的循环，类似 Python 的 itertools.cycle()
   */
  private selectByRoundRobin(
    providerId: string,
    availableKeys: ApiKeyConfig[]
  ): ApiKeyConfig {
    // 按 ID 排序确保一致性
    const sortedKeys = availableKeys.sort((a, b) => a.id.localeCompare(b.id));

    if (sortedKeys.length === 0) {
      throw new Error('没有可用的 Key');
    }

    // 获取当前索引
    let currentIndex = this.roundRobinIndexMap.get(providerId) || 0;

    // 如果当前索引超出范围，重置为 0
    if (currentIndex >= sortedKeys.length) {
      currentIndex = 0;
    }

    // 选择当前索引对应的 Key
    const selectedKey = sortedKeys[currentIndex];

    // 更新索引到下一个位置（循环）
    const nextIndex = (currentIndex + 1) % sortedKeys.length;
    this.roundRobinIndexMap.set(providerId, nextIndex);

    logger.info('[ApiKeyManager] 🔄 轮询选择', {
      providerId,
      keyName: selectedKey.name || selectedKey.id.substring(0, 8),
      currentIndex,
      nextIndex,
      totalKeys: sortedKeys.length,
    });

    return selectedKey;
  }

  /**
   * 优先级策略（Priority）
   * 选择优先级最高的 Key（数字越小优先级越高）
   */
  private selectByPriority(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    const sorted = availableKeys.sort((a, b) => a.priority - b.priority);
    return sorted[0];
  }

  /**
   * 最少使用策略（Least Used）
   * 选择使用次数最少的 Key
   */
  private selectByLeastUsed(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    const sorted = availableKeys.sort(
      (a, b) => a.usage.totalRequests - b.usage.totalRequests
    );
    return sorted[0];
  }

  /**
   * 随机策略（Random）
   * 随机选择一个 Key
   */
  private selectByRandom(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    return availableKeys[randomIndex];
  }

  /**
   * 更新 Key 使用状态（成功/失败）
   */
  async updateKeyStatus(
    keyId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    return withAiServiceContext('ApiKeyManager', 'updateKeyStatus', { keyId, success }, async () => {
      const key = await ProviderKeysRepository.getById(keyId);
      if (!key) {
        logger.warn('[ApiKeyManager] Key 不存在，无法更新状态', { keyId });
        return;
      }

      // 更新使用统计
      await ProviderKeysRepository.updateUsageStats(keyId, success, error);

      if (success) {
        // 成功：重置连续失败计数，恢复为 active 状态
        await ProviderKeysRepository.resetConsecutiveFailures(keyId);
        if (key.status === 'error') {
          await ProviderKeysRepository.setStatus(keyId, 'active');
          logger.info('[ApiKeyManager] ✅ Key 恢复为 active 状态', { keyId });
        }
      } else {
        // 失败：检查连续失败次数
        const maxFailures =
          await ProviderKeyManagementRepository.getMaxFailuresBeforeDisable(
            key.providerId
          );

        const updatedKey = await ProviderKeysRepository.getById(keyId);
        if (updatedKey && updatedKey.usage.consecutiveFailures >= maxFailures) {
          // 连续失败达到阈值，自动禁用
          await ProviderKeysRepository.setStatus(keyId, 'error');
          logger.warn(
            `[ApiKeyManager] ❌ Key 连续失败 ${maxFailures} 次，自动禁用`,
            {
              keyId,
              keyName: updatedKey.name,
              error: error?.substring(0, 100),
            }
          );
        }
      }
    });
  }

  /**
   * 检查 Key 是否在冷却期
   */
  async isInCooldown(keyId: string): Promise<boolean> {
    return withAiServiceContext('ApiKeyManager', 'isInCooldown', { keyId }, async () => {
      const key = await ProviderKeysRepository.getById(keyId);
      if (!key || key.status !== 'error') return false;

      const cooldownMinutes =
        await ProviderKeyManagementRepository.getFailureRecoveryTimeMinutes(
          key.providerId
        );
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const timeSinceUpdate = Date.now() - key.updatedAt;

      return timeSinceUpdate < cooldownMs;
    });
  }

  /**
   * 获取统计数据
   */
  async getKeyStats(providerId: ProviderId): Promise<KeyStats> {
    return withAiServiceContext('ApiKeyManager', 'getKeyStats', { providerId }, async () => {
      return await ProviderKeysRepository.getKeyStats(providerId);
    });
  }

  /**
   * 重置轮询状态（当 Key 配置发生变化时调用）
   */
  resetRoundRobinState(providerId?: string): void {
    if (providerId) {
      // 重置特定提供商的轮询状态
      this.roundRobinIndexMap.delete(providerId);
      logger.info('[ApiKeyManager] 重置轮询状态', { providerId });
    } else {
      // 重置所有轮询状态
      this.roundRobinIndexMap.clear();
      logger.info('[ApiKeyManager] 重置所有轮询状态');
    }
  }

  /**
   * 验证 API Key 格式
   */
  validateKeyFormat(key: string, providerId: ProviderId): boolean {
    return withSyncAiServiceContext('ApiKeyManager', 'validateKeyFormat', { providerId }, () => {
      if (!key || key.trim().length === 0) return false;

      // 根据不同供应商验证 Key 格式
      switch (providerId) {
        case 'openai':
          return key.startsWith('sk-') && key.length > 20;
        case 'anthropic':
          return key.startsWith('sk-ant-') && key.length > 30;
        case 'google':
        case 'gemini':
          return key.length > 20; // Google/Gemini Key 没有固定前缀
        case 'deepseek':
          return key.startsWith('sk-') && key.length > 20;
        case 'zhipu':
          return key.includes('.') && key.length > 30; // 智谱 Key 包含点号
        case 'volc':
          return key.length > 20;
        default:
          return key.length > 10; // 通用验证
      }
    });
  }
}

export default ApiKeyManager;
