/**
 * 搜索结果缓存工具
 *
 * 使用 LRU (Least Recently Used) 策略缓存搜索结果
 * 减少重复搜索请求，提高性能
 */

import type { SearchResult, SearchEngine } from '../types';

/**
 * 缓存条目接口
 */
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  engine: SearchEngine;
}

/**
 * 缓存键接口
 */
interface CacheKey {
  engine: SearchEngine;
  query: string;
}

/**
 * 搜索缓存类
 *
 * 特性：
 * - LRU 淘汰策略
 * - 可配置缓存大小和过期时间
 * - 线程安全（单线程环境无需考虑）
 */
export class SearchCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // 缓存过期时间（毫秒）

  /**
   * @param maxSize 最大缓存条目数，默认 50
   * @param ttl 缓存过期时间（毫秒），默认 1 小时
   */
  constructor(maxSize: number = 50, ttl: number = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 生成缓存键
   */
  private generateKey(engine: SearchEngine, query: string): string {
    // 标准化查询：转小写、去除多余空格
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return `${engine}:${normalizedQuery}`;
  }

  /**
   * 获取缓存结果
   *
   * @returns 如果缓存命中且未过期，返回结果；否则返回 null
   */
  get(engine: SearchEngine, query: string): SearchResult[] | null {
    const key = this.generateKey(engine, query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      // 过期，删除并返回 null
      this.cache.delete(key);
      return null;
    }

    // 命中！更新访问顺序（删除后重新插入到末尾）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.results;
  }

  /**
   * 设置缓存结果
   */
  set(engine: SearchEngine, query: string, results: SearchResult[]): void {
    const key = this.generateKey(engine, query);

    // 如果缓存已满，删除最旧的条目（Map 的第一个条目）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // 添加新条目
    const entry: CacheEntry = {
      results,
      timestamp: Date.now(),
      engine,
    };

    this.cache.set(key, entry);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期的缓存条目
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // 收集过期的键
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    // 删除过期条目
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    oldestTimestamp: number | null;
  } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestTimestamp,
    };
  }
}

// 导出全局单例实例
export const searchCache = new SearchCache();

// 定期清理过期缓存（每 10 分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
  }, 600000); // 10 分钟
}
