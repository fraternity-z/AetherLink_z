/**
 * 🗃️ 渲染缓存工具
 *
 * 功能：
 * - 缓存 Markdown 渲染结果
 * - 缓存数学公式渲染结果
 * - 内存缓存 + 本地存储混合策略
 * - LRU 缓存淘汰机制
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

// 缓存配置
const CACHE_CONFIG = {
  MEMORY_LIMIT: 50, // 内存缓存最多保存 50 个条目
  STORAGE_PREFIX: '@aetherlink_render_cache_',
  CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7天过期时间（毫秒）
  MAX_STORAGE_SIZE: 1024 * 1024, // 最大存储空间 1MB
};

// 缓存条目类型
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  size: number; // 估算的存储大小（字节）
}

// 内存缓存
class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry) {
      // 更新访问顺序（LRU）
      this.updateAccessOrder(key);
      return entry.data;
    }
    return null;
  }

  set(key: string, data: T, size: number): void {
    // 如果缓存已满，删除最旧的条目
    while (this.cache.size >= CACHE_CONFIG.MEMORY_LIMIT) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  delete(key: string): boolean {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  // 获取缓存统计信息
  getStats() {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    return {
      count: this.cache.size,
      totalSize,
      maxSize: CACHE_CONFIG.MEMORY_LIMIT,
    };
  }
}

// 本地存储缓存
class StorageCache<T = any> {
  private totalSize = 0;

  async get(key: string): Promise<T | null> {
    try {
      const fullKey = CACHE_CONFIG.STORAGE_PREFIX + key;
      const item = await AsyncStorage.getItem(fullKey);

      if (!item) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);

      // 检查是否过期
      if (Date.now() - entry.timestamp > CACHE_CONFIG.CACHE_EXPIRY) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.error('Failed to get storage cache:', error);
      return null;
    }
  }

  async set(key: string, data: T, size: number): Promise<void> {
    try {
      // 检查存储空间限制
      if (this.totalSize + size > CACHE_CONFIG.MAX_STORAGE_SIZE) {
        await this.cleanup();
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        size,
      };

      const fullKey = CACHE_CONFIG.STORAGE_PREFIX + key;
      await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
      this.totalSize += size;
    } catch (error) {
      logger.error('Failed to set storage cache:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = CACHE_CONFIG.STORAGE_PREFIX + key;
      const item = await AsyncStorage.getItem(fullKey);

      if (item) {
        const entry: CacheEntry<T> = JSON.parse(item);
        this.totalSize -= entry.size;
        await AsyncStorage.removeItem(fullKey);
      }
    } catch (error) {
      logger.error('Failed to delete storage cache:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_CONFIG.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      this.totalSize = 0;
    } catch (error) {
      logger.error('Failed to clear storage cache:', error);
    }
  }

  // 清理过期和过大的缓存
  private async cleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_CONFIG.STORAGE_PREFIX));

      const entries: Array<{ key: string; entry: CacheEntry<T> }> = [];

      for (const fullKey of cacheKeys) {
        try {
          const item = await AsyncStorage.getItem(fullKey);
          if (item) {
            const entry: CacheEntry<T> = JSON.parse(item);
            const key = fullKey.replace(CACHE_CONFIG.STORAGE_PREFIX, '');

            // 检查是否过期
            if (Date.now() - entry.timestamp > CACHE_CONFIG.CACHE_EXPIRY) {
              await AsyncStorage.removeItem(fullKey);
            } else {
              entries.push({ key, entry });
            }
          }
        } catch (error) {
          // 删除损坏的条目
          await AsyncStorage.removeItem(fullKey);
        }
      }

      // 按大小排序，删除最大的条目直到有足够空间
      entries.sort((a, b) => b.entry.size - a.entry.size);

      let freedSpace = 0;
      for (const { key, entry } of entries) {
        if (this.totalSize - freedSpace + entry.size <= CACHE_CONFIG.MAX_STORAGE_SIZE) {
          break;
        }

        await AsyncStorage.removeItem(CACHE_CONFIG.STORAGE_PREFIX + key);
        freedSpace += entry.size;
        this.totalSize -= entry.size;
      }
    } catch (error) {
      logger.error('Failed to cleanup storage cache:', error);
    }
  }
}

// 混合缓存管理器
export class RenderCache<T = any> {
  private memoryCache = new MemoryCache<T>();
  private storageCache = new StorageCache<T>();

  constructor(private cacheName: string) {}

  async get(key: string): Promise<T | null> {
    // 首先尝试内存缓存
    let data = this.memoryCache.get(key);

    if (!data) {
      // 然后尝试本地存储缓存
      data = await this.storageCache.get(key);

      if (data) {
        // 将数据加载到内存缓存
        this.memoryCache.set(key, data, this.estimateSize(data));
      }
    }

    return data;
  }

  async set(key: string, data: T): Promise<void> {
    const size = this.estimateSize(data);

    // 保存到内存缓存
    this.memoryCache.set(key, data, size);

    // 保存到本地存储缓存（仅对小数据）
    if (size < 50 * 1024) { // 50KB 以下的数据才保存到本地存储
      await this.storageCache.set(key, data, size);
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.storageCache.delete(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    await this.storageCache.clear();
  }

  // 估算数据大小（字节）
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16 编码，每个字符 2 字节
    } catch {
      return 1024; // 默认 1KB
    }
  }

  // 生成缓存键
  static generateKey(content: string, type: string): string {
    // 使用简单的内容哈希作为键
    const hash = this.simpleHash(content);
    return `${type}_${hash}`;
  }

  // 简单的字符串哈希函数
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 获取缓存统计信息
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
    };
  }
}

// 全局缓存实例
export const markdownCache = new RenderCache<string>('markdown');
export const mathJaxCache = new RenderCache<any>('mathjax');

// 缓存清理工具
export const cacheUtils = {
  // 清理所有缓存
  async clearAll(): Promise<void> {
    await markdownCache.clear();
    await mathJaxCache.clear();
  },

  // 获取所有缓存的统计信息
  getStats() {
    return {
      markdown: markdownCache.getStats(),
      mathjax: mathJaxCache.getStats(),
    };
  },

  // 清理过期缓存
  async cleanup(): Promise<void> {
    // StorageCache 内部已有清理逻辑，这里只需要触发清理
    await markdownCache.clear(); // 清理内存缓存
    // 存储缓存在每次访问时会自动清理过期条目
  },
};