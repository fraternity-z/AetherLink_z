/**
 * HTTP 请求工具
 *
 * 封装 fetch API，提供统一的 HTTP 请求接口
 * 支持超时控制、错误处理、User-Agent 管理
 */

import { SearchError } from '../types';

/**
 * HTTP 请求选项
 */
export interface HttpRequestOptions {
  /** HTTP 方法 */
  method?: 'GET' | 'POST';

  /** 请求头 */
  headers?: Record<string, string>;

  /** 请求超时时间（毫秒），默认 10000ms */
  timeout?: number;

  /** 请求体（POST 请求时使用） */
  body?: string;
}

/**
 * 执行 HTTP 请求
 *
 * @param url 请求 URL
 * @param options 请求选项
 * @returns 响应文本
 * @throws {SearchError} 请求失败时抛出错误
 *
 * @example
 * ```typescript
 * const html = await performHttpRequest('https://www.bing.com/search?q=test', {
 *   headers: {
 *     'User-Agent': 'Mozilla/5.0...',
 *   },
 *   timeout: 10000,
 * });
 * ```
 */
export async function performHttpRequest(
  url: string,
  options: HttpRequestOptions = {}
): Promise<string> {
  const { method = 'GET', headers = {}, timeout = 10000, body } = options;

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    // 检查响应状态
    if (!response.ok) {
      // 特殊处理 CAPTCHA（通常返回 403 或 429）
      if (response.status === 403 || response.status === 429) {
        throw new SearchError(
          `搜索引擎要求验证 (HTTP ${response.status})`,
          'CAPTCHA'
        );
      }

      throw new SearchError(
        `HTTP 请求失败: ${response.status} ${response.statusText}`,
        'NETWORK_ERROR'
      );
    }

    // 返回响应文本
    const text = await response.text();
    return text;
  } catch (error) {
    // 如果是 AbortError，表示超时
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SearchError('请求超时', 'TIMEOUT');
    }

    // 如果已经是 SearchError，直接抛出
    if (error instanceof SearchError) {
      throw error;
    }

    // 其他网络错误
    const message = error instanceof Error ? error.message : '未知错误';
    throw new SearchError(`网络请求失败: ${message}`, 'NETWORK_ERROR');
  } finally {
    // 清除超时定时器
    clearTimeout(timeoutId);
  }
}
