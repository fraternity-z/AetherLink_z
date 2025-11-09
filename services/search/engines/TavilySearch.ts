/**
 * Tavily 搜索引擎适配器
 *
 * 使用 Tavily 官方 API 实现搜索功能
 * 需要 API Key
 */

import { SearchResult, SearchError } from '../types';

/**
 * Tavily API 响应格式
 */
interface TavilyApiResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  query?: string;
  response_time?: number;
}

/**
 * 执行 Tavily 搜索
 *
 * @param query 搜索查询文本
 * @param apiKey Tavily API Key
 * @param maxResults 最大返回结果数量，默认 5
 * @param timeout 请求超时时间（毫秒），默认 10000
 * @returns 搜索结果数组
 * @throws {SearchError} 搜索失败时抛出错误
 *
 * @example
 * ```typescript
 * const results = await searchTavily('React Native', 'your-api-key', 5);
 * console.log(results); // [{ title, url, snippet, source }]
 * ```
 */
export async function searchTavily(
  query: string,
  apiKey: string,
  maxResults: number = 5,
  timeout: number = 10000
): Promise<SearchResult[]> {
  // 验证 API Key
  if (!apiKey || apiKey.trim().length === 0) {
    throw new SearchError('Tavily API Key 未提供或为空', 'API_ERROR', 'tavily');
  }

  try {

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 发送 POST 请求到 Tavily API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          max_results: maxResults,
          search_depth: 'basic', // 使用 basic 深度以提高速度
          include_answer: false,  // 不需要 AI 总结，我们自己汇总
          include_images: false,  // 不需要图片
          include_raw_content: false, // 不需要原始内容
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Tavily API 请求失败 (HTTP ${response.status})`;

        // 尝试解析错误信息
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // 解析失败，使用默认错误信息
        }

        // 特殊处理常见错误
        if (response.status === 401 || response.status === 403) {
          throw new SearchError('Tavily API Key 无效或未授权', 'API_ERROR', 'tavily');
        } else if (response.status === 429) {
          throw new SearchError('Tavily API 配额已用尽，请稍后重试', 'API_ERROR', 'tavily');
        }

        throw new SearchError(errorMessage, 'API_ERROR', 'tavily');
      }

      // 解析响应数据
      const data: TavilyApiResponse = await response.json();


      // 检查结果是否为空
      if (!data.results || data.results.length === 0) {
        throw new SearchError('Tavily 搜索未返回任何结果', 'API_ERROR', 'tavily');
      }

      // 转换为统一的 SearchResult 格式
      const results: SearchResult[] = data.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content || '', // Tavily 的 content 字段对应我们的 snippet
        source: 'tavily',
      }));


      return results;
    } catch (error) {
      clearTimeout(timeoutId);

      // 如果是 AbortError，表示超时
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SearchError('Tavily API 请求超时', 'TIMEOUT', 'tavily');
      }

      throw error;
    }
  } catch (error) {
    // 如果已经是 SearchError，直接抛出
    if (error instanceof SearchError) {
      throw error;
    }

    // 否则包装为 SearchError
    const message = error instanceof Error ? error.message : '未知错误';
    throw new SearchError(`Tavily 搜索失败: ${message}`, 'API_ERROR', 'tavily');
  }
}
