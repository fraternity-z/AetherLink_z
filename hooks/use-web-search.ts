/**
 * 网络搜索 Hook
 *
 * 职责：
 * - 管理搜索功能的开关状态
 * - 执行网络搜索
 * - 格式化搜索结果
 * - 错误处理和加载状态
 * - 防抖和自动重试机制
 */

import { performSearch } from '@/services/search/SearchClient';
import type { SearchEngine } from '@/services/search/types';
import { SettingKey, SettingsRepository } from '@/storage/repositories/settings';
import { logger } from '@/utils/logger';
import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * 搜索错误接口
 */
export interface SearchError extends Error {
  code?: string;
  retryable?: boolean;
  retryAfter?: number;
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
 * 简单防抖函数实现
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: any = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
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
   * 内部搜索执行函数
   *
   * @param query 搜索查询
   * @param retryCount 重试次数
   * @returns 格式化的搜索结果字符串，失败返回错误信息或 null
   */
  const executeSearch = useCallback(async (query: string, retryCount = 0): Promise<string | null> => {
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
          retryCount,
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
      } catch (error: any) {
        const searchError = error as SearchError;
        
        // 增强错误信息
        searchError.retryable = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'].includes(searchError.code || '');
        searchError.retryAfter = searchError.code === 'RATE_LIMITED' ? 1000 : undefined;

        logger.error('[useWebSearch] 搜索失败:', searchError);
        setError(searchError);

        // 自动重试逻辑
        if (searchError.retryable && retryCount < 2) {
          logger.info(`[useWebSearch] 尝试自动重试 (${retryCount + 1}/2)...`);
          const delay = searchError.retryAfter || (1000 * Math.pow(2, retryCount));
          await new Promise(r => setTimeout(r, delay));
          
          // 清理 pending 状态以便重试
          pendingSearchRef.current.delete(cacheKey);
          return executeSearch(query, retryCount + 1);
        }

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
        // 只有在不是重试调用时才设置状态
        // (如果是递归重试，状态管理交给最后一次调用)
        if (retryCount === 0) {
            setIsSearching(false);
            // 清理正在进行的请求记录
            pendingSearchRef.current.delete(cacheKey);
        }
      }
    })();

    // 记录正在进行的请求
    pendingSearchRef.current.set(cacheKey, searchPromise);

    // 等待搜索完成
    return searchPromise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // CACHE_TTL 是常量，不需要放在依赖数组中

  // 创建防抖版本的搜索函数
  const debouncedPerformSearch = useMemo(
    () => debounce(executeSearch, 500),
    [executeSearch]
  );

  /**
   * 对外暴露的搜索函数（带防抖）
   * 注意：如果直接调用 executeSearch 则无防抖
   */
  const performWebSearch = useCallback(async (query: string) => {
    // 这里我们希望可以 awaited 结果，所以如果不防抖，直接返回 executeSearch 的 Promise
    // 如果确实需要防抖（例如在输入框 onChangeText 中调用），可以使用 debouncedPerformSearch
    // 但考虑到当前业务场景是在"发送"时调用，其实不需要防抖，直接调用即可。
    // 只有在"输入即搜索"的场景下才需要防抖。
    
    // 修正：根据当前业务逻辑（点击发送按钮触发），不需要防抖。
    // 防抖主要用于自动补全或实时搜索建议。
    // 因此，这里直接暴露 executeSearch。
    
    return executeSearch(query);
  }, [executeSearch]);

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
