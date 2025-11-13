/**
 * 网络搜索 Hook
 *
 * 职责：
 * - 管理搜索功能的开关状态
 * - 执行网络搜索
 * - 格式化搜索结果
 * - 错误处理和加载状态
 */

import { useState, useCallback } from 'react';
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

  /**
   * 执行网络搜索
   *
   * @param query 搜索查询
   * @returns 格式化的搜索结果字符串，失败返回错误信息或 null
   */
  const performWebSearch = useCallback(async (query: string): Promise<string | null> => {
    if (!query.trim()) {
      return null;
    }

    setIsSearching(true);
    setCurrentQuery(query);
    setError(null);

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
    }
  }, []);

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
