/**
 * 网络搜索服务 - 统一搜索客户端
 *
 * 提供统一的搜索接口，支持多种搜索引擎：
 * - Bing（网页爬取）
 * - Google（网页爬取）
 * - Tavily（官方 API）
 */

import { SearchOptions, SearchResult, SearchError } from './types';
import { searchBing } from './engines/BingSearch';
import { searchGoogle } from './engines/GoogleSearch';
import { searchTavily } from './engines/TavilySearch';
import { searchCache } from './utils/search-cache';

/**
 * 执行网络搜索
 *
 * @param options 搜索选项配置
 * @returns 搜索结果数组
 * @throws {SearchError} 搜索失败时抛出错误
 *
 * @example
 * ```typescript
 * // Bing 搜索
 * const results = await performSearch({
 *   engine: 'bing',
 *   query: 'React Native',
 *   maxResults: 5
 * });
 *
 * // Tavily 搜索
 * const results = await performSearch({
 *   engine: 'tavily',
 *   query: 'React Native',
 *   maxResults: 5,
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export async function performSearch(
  options: SearchOptions
): Promise<SearchResult[]> {
  const { engine, query, maxResults = 5, timeout = 10000, useCache = true } = options;

  // 验证查询文本
  if (!query || query.trim().length === 0) {
    throw new SearchError('搜索查询不能为空', 'INVALID_QUERY', engine);
  }

  // 限制查询文本长度（防止滥用）
  if (query.length > 200) {
    throw new SearchError('搜索查询过长（最大 200 字符）', 'INVALID_QUERY', engine);
  }

  // 尝试从缓存获取结果
  if (useCache) {
    const cachedResults = searchCache.get(engine, query);
    if (cachedResults) {
      // 根据 maxResults 限制返回数量
      return cachedResults.slice(0, maxResults);
    }
  }

  try {
    let results: SearchResult[];

    // 根据搜索引擎类型调度到对应的实现
    switch (engine) {
      case 'bing':
        // 网页爬取方式
        results = await searchBing(query, maxResults, timeout);
        break;

      case 'google':
        // 网页爬取方式
        results = await searchGoogle(query, maxResults, timeout);
        break;

      case 'tavily':
        // API 方式
        if (!options.apiKey) {
          throw new SearchError('Tavily API Key 未提供', 'API_ERROR', engine);
        }
        results = await searchTavily(query, options.apiKey, maxResults, timeout);
        break;

      default:
        throw new SearchError(`不支持的搜索引擎: ${engine}`, 'INVALID_QUERY', engine);
    }

    // 缓存搜索结果
    if (useCache && results.length > 0) {
      searchCache.set(engine, query, results);
    }

    return results;
  } catch (error) {
    // 如果已经是 SearchError，直接抛出
    if (error instanceof SearchError) {
      throw error;
    }

    // 否则包装为 SearchError
    const message = error instanceof Error ? error.message : '未知错误';
    throw new SearchError(message, 'NETWORK_ERROR', engine);
  }
}

