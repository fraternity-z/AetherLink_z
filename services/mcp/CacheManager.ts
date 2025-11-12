/**
 * CacheManager - 内存缓存管理器
 *
 * 提供带 TTL (Time To Live) 的内存缓存功能
 * 支持通知驱动的缓存失效机制
 *
 * 设计理念：
 * - 减少对 MCP 服务器的重复请求
 * - 提升应用响应速度
 * - 通过 MCP 通知自动更新缓存
 *
 * 创建日期: 2025-11-12
 */

import { logger } from '@/utils/logger';

const log = logger.createNamespace('CacheManager');

/**
 * 缓存项结构
 */
interface CacheEntry<T> {
  /** 缓存的值 */
  value: T;
  /** 过期时间戳 (Unix ms) */
  expiry: number;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  /** 总缓存项数量 */
  totalEntries: number;
  /** 已过期项数量 */
  expiredEntries: number;
  /** 缓存命中次数 */
  hits: number;
  /** 缓存未命中次数 */
  misses: number;
  /** 命中率 (0-1) */
  hitRate: number;
}

/**
 * 缓存管理器类
 *
 * 使用示例：
 * ```typescript
 * const cache = new CacheManager();
 *
 * // 设置缓存（5 分钟 TTL）
 * cache.set('tools:server-1', toolsList, 5 * 60 * 1000);
 *
 * // 获取缓存
 * const tools = cache.get<Tool[]>('tools:server-1');
 *
 * // 清除指定前缀的缓存
 * cache.clear('tools:');
 * ```
 */
export class CacheManager {
  /** 缓存存储 */
  private cache: Map<string, CacheEntry<any>> = new Map();

  /** 统计：缓存命中次数 */
  private hits = 0;

  /** 统计：缓存未命中次数 */
  private misses = 0;

  /** 清理定时器 */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  /** 自动清理间隔 (默认 5 分钟) */
  private cleanupInterval = 5 * 60 * 1000;

  constructor(options?: { cleanupInterval?: number; autoCleanup?: boolean }) {
    if (options?.cleanupInterval) {
      this.cleanupInterval = options.cleanupInterval;
    }

    // 默认启用自动清理
    if (options?.autoCleanup !== false) {
      this.startAutoCleanup();
    }

    log.debug('CacheManager 初始化完成', {
      cleanupInterval: this.cleanupInterval,
      autoCleanup: options?.autoCleanup !== false,
    });
  }

  /**
   * 获取缓存值
   *
   * @param key 缓存键
   * @returns 缓存的值，如果不存在或已过期则返回 undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      log.debug(`缓存未命中: ${key}`);
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      log.debug(`缓存已过期: ${key}`);
      return undefined;
    }

    this.hits++;
    log.debug(`缓存命中: ${key}`);
    return entry.value as T;
  }

  /**
   * 设置缓存值
   *
   * @param key 缓存键
   * @param value 要缓存的值
   * @param ttl 生存时间（毫秒），默认 5 分钟
   */
  set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttl;

    this.cache.set(key, {
      value,
      expiry,
    });

    log.debug(`缓存已设置: ${key}`, {
      ttl: `${Math.round(ttl / 1000)}s`,
      expiresAt: new Date(expiry).toISOString(),
    });
  }

  /**
   * 检查缓存是否存在且未过期
   *
   * @param key 缓存键
   * @returns 是否存在有效缓存
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除指定缓存
   *
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      log.debug(`缓存已删除: ${key}`);
    }
    return deleted;
  }

  /**
   * 清除指定前缀的所有缓存
   *
   * 用于批量清除相关缓存，例如：
   * - 清除某个服务器的所有缓存: `clear('mcp:server-1:')`
   * - 清除所有工具缓存: `clear('mcp:tools:')`
   *
   * @param prefix 缓存键前缀
   * @returns 清除的缓存项数量
   */
  clear(prefix: string): number {
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log.debug(`批量清除缓存`, { prefix, count });
    }

    return count;
  }

  /**
   * 清除所有缓存
   *
   * @returns 清除的缓存项数量
   */
  clearAll(): number {
    const count = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    log.info(`已清除所有缓存`, { count });
    return count;
  }

  /**
   * 清除所有过期的缓存项
   *
   * 这个方法会被自动清理定时器定期调用
   *
   * @returns 清除的过期项数量
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log.debug(`清除过期缓存`, { count });
    }

    return count;
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计数据
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expiredCount++;
      }
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  /**
   * 获取所有缓存键
   *
   * @param prefix 可选的键前缀过滤
   * @returns 缓存键数组
   */
  getKeys(prefix?: string): string[] {
    const keys = Array.from(this.cache.keys());

    if (prefix) {
      return keys.filter((key) => key.startsWith(prefix));
    }

    return keys;
  }

  /**
   * 启动自动清理定时器
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      const count = this.clearExpired();
      if (count > 0) {
        log.debug(`自动清理已执行`, { cleared: count });
      }
    }, this.cleanupInterval);

    log.debug('自动清理定时器已启动', {
      interval: `${Math.round(this.cleanupInterval / 1000)}s`,
    });
  }

  /**
   * 停止自动清理定时器
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      log.debug('自动清理定时器已停止');
    }
  }

  /**
   * 销毁缓存管理器
   *
   * 清除所有缓存和定时器，释放资源
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clearAll();
    log.info('CacheManager 已销毁');
  }
}

/**
 * 默认的全局缓存管理器实例
 *
 * 可以直接导入使用：
 * ```typescript
 * import { cacheManager } from '@/services/mcp/CacheManager';
 *
 * cacheManager.set('key', 'value', 60000);
 * const value = cacheManager.get('key');
 * ```
 */
export const cacheManager = new CacheManager();

/**
 * 生成 MCP 缓存键的工具函数
 */
export const CacheKeys = {
  /** 工具列表缓存键 */
  tools: (serverId: string) => `mcp:tools:${serverId}`,

  /** 资源列表缓存键 */
  resources: (serverId: string) => `mcp:resources:${serverId}`,

  /** 单个资源缓存键 */
  resource: (serverId: string, uri: string) => `mcp:resource:${serverId}:${uri}`,

  /** 提示词列表缓存键 */
  prompts: (serverId: string) => `mcp:prompts:${serverId}`,

  /** 单个提示词缓存键 */
  prompt: (serverId: string, name: string) => `mcp:prompt:${serverId}:${name}`,

  /** 服务器所有缓存的前缀 */
  serverPrefix: (serverId: string) => `mcp:${serverId}:`,
};
