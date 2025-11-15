/**
 * 网络搜索 Hook
 *
 * 职责：
 * - 管理搜索功能的开关状态
 * - 执行网络搜索
 * - 格式化搜索结果
 * - 错误处理和加载状态
 */

import { useState, useCallback, useRef } from 'react';
import { performSearch } from '@/services/search/SearchClient';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { SearchEngine } from '@/services/search/types';
import { logger } from '@/utils/logger';

/**
 * 搜索错误接口
 */
export interface SearchError extends Error {
  code?: string;
}

/**
 * use-web-search Hook 返回值
 */
export interface UseWebSearchResult {
  isSearching: boolean;
  searchEnabled: boolean;
  currentEngine: SearchEngine;
  currentQuery: string;
  error: SearchError | null;
  setSearchEnabled: (enabled: boolean) => void;
  performWebSearch: (query: string) => Promise<string | null>;
}

/**
 * 网络搜索 Hook
 */
export function useWebSearch(): UseWebSearchResult {
  const [isSearching, setIsSearching] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [currentEngine, setCurrentEngine] = useState<SearchEngine>('bing');
  const [currentQuery, setCurrentQuery] = useState('');
  const [error, setError] = useState<SearchError | null>(null);

  // 搜索结果缓存（防止相同查询重复搜索）
  const searchCacheRef = useRef<Map<string, { result: string; timestamp: number }>>(new Map());
  // 缓存有效期：5分钟
  const CACHE_TTL = 5 * 60 * 1000;
  // 正在进行的搜索请求
  const pendingSearchRef = useRef<Map<string, Promise<string | null>>>(new Map());

  /**
   * 内部搜索执行函数（未防抖）
   *
   * @param query 搜索查询
   * @returns 格式化的搜索结果字符串，失败返回错误信息或 null
   */
  const executeSearch = useCallback(async (query: string): Promise<string | null> => {
    if (!query.trim()) {
      return null;
    }

    // 生成缓存键（包含查询内容）
    const cacheKey = query.trim().toLowerCase();

    // 1. 检查缓存
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('[useWebSearch] 使用缓存结果', { query, age: Date.now() - cached.timestamp });
      return cached.result;
    }

    // 2. 检查是否有相同的请求正在进行
    const pendingSearch = pendingSearchRef.current.get(cacheKey);
    if (pendingSearch) {
      logger.debug('[useWebSearch] 等待进行中的搜索请求', { query });
      return pendingSearch;
    }

    setIsSearching(true);
    setCurrentQuery(query);
    setError(null);

    // 3. 创建新的搜索请求
    const searchPromise = (async (): Promise<string | null> => {
      try {
        const sr = SettingsRepository();
        const webSearchEnabled = (await sr.get<boolean>(SettingKey.WebSearchEnabled)) ?? false;

        if (!webSearchEnabled) {
          logger.debug('[useWebSearch] 网络搜索功能未启用');
          return null;
        }

        const searchEngine = (await sr.get<SearchEngine>(SettingKey.WebSearchEngine)) ?? 'bing';
        const maxResults = (await sr.get<number>(SettingKey.WebSearchMaxResults)) ?? 5;
        const tavilyApiKey = searchEngine === 'tavily'
          ? ((await sr.get<string>(SettingKey.TavilySearchApiKey)) || undefined)
          : undefined;

        setCurrentEngine(searchEngine);

        logger.debug('[useWebSearch] 开始网络搜索', {
          engine: searchEngine,
          query,
          maxResults,
        });

        const results = await performSearch({
          engine: searchEngine,
          query,
          maxResults,
          apiKey: tavilyApiKey,
        });

        // 格式化搜索结果
        if (results.length > 0) {
          const timestamp = new Date().toLocaleString('zh-CN');
          const engineName = searchEngine === 'bing' ? 'Bing' :
                            searchEngine === 'google' ? 'Google' :
                            'Tavily';

          const formattedResults = `\n\n<网络搜索结果>\n` +
            `搜索引擎: ${engineName}\n` +
            `搜索时间: ${timestamp}\n` +
            `查询内容: ${query}\n` +
            `结果数量: ${results.length}\n\n` +
            results.map((r, i) => {
              const cleanSnippet = r.snippet.trim().substring(0, 300);
              return `【结果 ${i + 1}】\n` +
                `标题: ${r.title}\n` +
                `链接: ${r.url}\n` +
                `内容摘要: ${cleanSnippet}${r.snippet.length > 300 ? '...' : ''}\n`;
            }).join('\n') +
            `\n</网络搜索结果>\n\n` +
            `请根据以上搜索结果，结合你的知识，为用户提供准确、全面的回答。`;

          logger.debug('[useWebSearch] 搜索成功', {
            count: results.length,
            engine: searchEngine,
          });

          // 存入缓存
          searchCacheRef.current.set(cacheKey, {
            result: formattedResults,
            timestamp: Date.now(),
          });

          return formattedResults;
        }

        logger.debug('[useWebSearch] 搜索未返回结果');
        return null;
      } catch (error) {
        const searchError = error as SearchError;
        logger.error('[useWebSearch] 搜索失败:', searchError);

        setError(searchError);

        // 根据错误类型生成友好的错误消息
        let errorMessage = '未知错误';
        let errorHint = '';

        if (searchError.code === 'CAPTCHA') {
          errorMessage = '搜索引擎检测到异常流量';
          errorHint = '建议：稍后重试或切换到其他搜索引擎（如 Tavily）';
        } else if (searchError.code === 'TIMEOUT') {
          errorMessage = '搜索请求超时';
          errorHint = '建议：检查网络连接或稍后重试';
        } else if (searchError.code === 'API_ERROR') {
          errorMessage = searchError.message || 'API 调用失败';
          errorHint = '建议：检查 API Key 配置或查看设置页面';
        } else if (searchError.code === 'NETWORK_ERROR') {
          errorMessage = '网络连接失败';
          errorHint = '建议：检查网络连接';
        } else if (searchError.code === 'PARSE_ERROR') {
          errorMessage = '搜索结果解析失败';
          errorHint = '建议：搜索引擎页面结构可能已更新，请切换到其他搜索引擎';
        } else {
          errorMessage = searchError.message || '未知错误';
        }

        // 返回格式化的错误信息
        const errorResult = `\n\n<网络搜索失败>\n` +
          `错误信息: ${errorMessage}\n` +
          (errorHint ? `${errorHint}\n` : '') +
          `\n注意：搜索失败不影响对话，我将基于现有知识为您解答。\n` +
          `</网络搜索失败>\n`;

        return errorResult;
      } finally {
        setIsSearching(false);
        // 清理正在进行的请求记录
        pendingSearchRef.current.delete(cacheKey);
      }
    })();

    // 记录正在进行的请求
    pendingSearchRef.current.set(cacheKey, searchPromise);

    // 等待搜索完成
    return searchPromise;
  }, [CACHE_TTL]);

  /**
   * 🐛 临时禁用防抖，直接使用原始搜索函数进行调试
   * TODO: 调试完成后可以重新启用防抖
   */
  const performWebSearch = executeSearch;

  // const performWebSearch = useDebouncedCallback(executeSearch, {
  //   delay: 500,
  //   maxWait: 2000, // 最多延迟2秒
  // });

  return {
    isSearching,
    searchEnabled,
    currentEngine,
    currentQuery,
    error,
    setSearchEnabled,
    performWebSearch,
  };
}
