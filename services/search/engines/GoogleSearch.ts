/**
 * Google 搜索引擎适配器
 *
 * 通过网页爬取方式实现 Google 搜索功能
 * 无需 API Key，直接解析搜索结果页面
 *
 * 注意：Google 的反爬虫机制较严格，建议使用移动端 User-Agent
 */

import { SearchResult, SearchError } from '../types';
import { performHttpRequest } from '../utils/http-client';
import { parseGoogleSearchResults, validateSearchResults } from '../utils/html-parser';
import { getRecommendedHeaders } from '../utils/user-agents';
import { isHiddenWebViewAvailable, loadHtmlViaHiddenWebView } from '@/services/webview/HiddenWebViewClient';

/**
 * 执行 Google 搜索
 *
 * @param query 搜索查询文本
 * @param maxResults 最大返回结果数量，默认 5
 * @param timeout 请求超时时间（毫秒），默认 10000
 * @returns 搜索结果数组
 * @throws {SearchError} 搜索失败时抛出错误
 *
 * @example
 * ```typescript
 * const results = await searchGoogle('React Native', 5);
 * console.log(results); // [{ title, url, snippet, source }]
 * ```
 */
export async function searchGoogle(
  query: string,
  maxResults: number = 5,
  timeout: number = 10000
): Promise<SearchResult[]> {
  try {
    // 1. 构建搜索 URL
    const encodedQuery = encodeURIComponent(query);
    // 使用 num 参数控制返回数量，hl 设置语言
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&num=${Math.min(maxResults * 2, 20)}&hl=zh-CN`;

    console.log('[Google Search] 开始搜索:', query);

    // 2. 发送 HTTP 请求（使用移动端 User-Agent，更容易通过）
    let html: string
    if (isHiddenWebViewAvailable()) {
      try {
        html = await loadHtmlViaHiddenWebView(searchUrl, timeout)
      } catch (e) {
        html = await performHttpRequest(searchUrl, {
          method: 'GET',
          headers: {
            ...getRecommendedHeaders(true),
            Referer: 'https://www.google.com/',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          },
          timeout
        })
      }
    } else {
      html = await performHttpRequest(searchUrl, {
        method: 'GET',
        headers: {
          ...getRecommendedHeaders(true),
          Referer: 'https://www.google.com/',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        },
        timeout
      })
    }

    console.log('[Google Search] 获取到 HTML，长度:', html.length);

    // 3. 检查是否遇到 CAPTCHA
    if (html.includes('captcha') || html.includes('unusual traffic')) {
      throw new SearchError(
        'Google 检测到异常流量，要求验证。请稍后重试或切换搜索引擎',
        'CAPTCHA',
        'google'
      );
    }

    // 4. 解析 HTML 提取搜索结果
    const parsedResults = parseGoogleSearchResults(html);

    console.log('[Google Search] 解析到结果数量:', parsedResults.length);

    // 5. 验证并过滤结果
    const validResults = validateSearchResults(parsedResults);

    // 6. 限制返回数量并添加来源标识
    const results: SearchResult[] = validResults.slice(0, maxResults).map(result => ({
      ...result,
      source: 'google',
    }));

    // 7. 检查结果是否为空
    if (results.length === 0) {
      throw new SearchError(
        'Google 搜索未返回有效结果，可能是页面结构变更或遇到验证',
        'PARSE_ERROR',
        'google'
      );
    }

    console.log('[Google Search] 返回有效结果数量:', results.length);

    return results;
  } catch (error) {
    // 如果已经是 SearchError，直接抛出
    if (error instanceof SearchError) {
      throw error;
    }

    // 否则包装为 SearchError
    const message = error instanceof Error ? error.message : '未知错误';
    throw new SearchError(`Google 搜索失败: ${message}`, 'NETWORK_ERROR', 'google');
  }
}
