/**
 * 网络搜索服务 - 类型定义
 *
 * 支持三种搜索引擎：
 * - Bing: 网页爬取方式
 * - Google: 网页爬取方式
 * - Tavily: 官方 API 方式
 */

/**
 * 支持的搜索引擎类型
 */
export type SearchEngine = 'bing' | 'google' | 'tavily';

/** 
 * 搜索结果项
 */
export interface SearchResult {
  /** 搜索结果标题 */
  title: string;

  /** 搜索结果 URL */
  url: string;

  /** 搜索结果摘要/片段 */
  snippet: string;

  /** 搜索引擎来源 */
  source?: string;
}

/**
 * 搜索选项配置
 */
export interface SearchOptions {
  /** 使用的搜索引擎 */
  engine: SearchEngine;

  /** 搜索查询文本 */
  query: string;

  /** 最大返回结果数量，默认 5 */
  maxResults?: number;

  /** API Key（仅 Tavily 需要） */
  apiKey?: string;

  /** 请求超时时间（毫秒），默认 10000 */
  timeout?: number;

  /** 是否使用缓存，默认 true */
  useCache?: boolean;
}

/**
 * 搜索错误类型
 */
export type SearchErrorCode =
  | 'NETWORK_ERROR'    // 网络连接错误
  | 'PARSE_ERROR'      // HTML 解析失败
  | 'CAPTCHA'          // 遇到验证码
  | 'API_ERROR'        // API 调用错误
  | 'TIMEOUT'          // 请求超时
  | 'INVALID_QUERY';   // 无效查询

/**
 * 搜索错误类
 */
export class SearchError extends Error {
  constructor(
    message: string,
    public code: SearchErrorCode,
    public engine?: SearchEngine
  ) {
    super(message);
    this.name = 'SearchError';

    // 维护正确的 prototype 链
    Object.setPrototypeOf(this, SearchError.prototype);
  }
}
