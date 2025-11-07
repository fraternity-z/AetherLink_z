/**
 * Bing 搜索引擎适配器
 *
 * 通过网页爬取方式实现 Bing 搜索功能
 * 无需 API Key，直接解析搜索结果页面
 */

import { SearchResult, SearchError } from '../types';
import { performHttpRequest } from '../utils/http-client';
import { parseBingSearchResults, validateSearchResults } from '../utils/html-parser';
import { getRecommendedHeaders } from '../utils/user-agents';
import { isHiddenWebViewAvailable, loadHtmlViaHiddenWebView } from '@/services/webview/HiddenWebViewClient';

/**
 * 执行 Bing 搜索
 *
 * @param query 搜索查询文本
 * @param maxResults 最大返回结果数量，默认 5
 * @param timeout 请求超时时间（毫秒），默认 10000
 * @returns 搜索结果数组
 * @throws {SearchError} 搜索失败时抛出错误
 *
 * @example
 * ```typescript
 * const results = await searchBing('React Native', 5);
 * console.log(results); // [{ title, url, snippet, source }]
 * ```
 */
export async function searchBing(
  query: string,
  maxResults: number = 5,
  timeout: number = 10000
): Promise<SearchResult[]> {
  try {
    // 1. 构建搜索 URL
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.bing.com/search?q=${encodedQuery}&count=${Math.min(maxResults * 2, 20)}`;

    console.log('[Bing Search] 开始搜索:', query);

    // 2. 发送 HTTP 请求（带 User-Agent 和其他请求头）
    let html: string
    if (isHiddenWebViewAvailable()) {
      try {
        html = await loadHtmlViaHiddenWebView(searchUrl, timeout)
      } catch (e) {
        // 回退到 HTTP 抓取
        html = await performHttpRequest(searchUrl, {
          method: 'GET',
          headers: {
            ...getRecommendedHeaders(true),
            Referer: 'https://www.bing.com/'
          },
          timeout
        })
      }
    } else {
      html = await performHttpRequest(searchUrl, {
        method: 'GET',
        headers: {
          ...getRecommendedHeaders(true),
          Referer: 'https://www.bing.com/'
        },
        timeout
      })
    }

    console.log('[Bing Search] 获取到 HTML，长度:', html.length);

    // 3. 解析 HTML 提取搜索结果
    const parsedResults = parseBingSearchResults(html);

    console.log('[Bing Search] 解析到结果数量:', parsedResults.length);

    // 4. 验证并过滤结果
    const validResults = validateSearchResults(parsedResults);

    // 5. 限制返回数量并添加来源标识
    const results: SearchResult[] = validResults.slice(0, maxResults).map(result => ({
      ...result,
      source: 'bing',
    }));

    // 6. 检查结果是否为空
    if (results.length === 0) {
      throw new SearchError(
        'Bing 搜索未返回有效结果，可能是页面结构变更或遇到验证',
        'PARSE_ERROR',
        'bing'
      );
    }

    console.log('[Bing Search] 返回有效结果数量:', results.length);

    return results;
  } catch (error) {
    // 如果已经是 SearchError，直接抛出
    if (error instanceof SearchError) {
      throw error;
    }

    // 否则包装为 SearchError
    const message = error instanceof Error ? error.message : '未知错误';
    throw new SearchError(`Bing 搜索失败: ${message}`, 'NETWORK_ERROR', 'bing');
  }
}
