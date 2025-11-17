/**
 * ErrorClassifier - 智能错误分类器
 *
 * 负责区分不同类型的MCP错误，提供错误可重试性判断
 * 参考Kelivo的实现，支持以下错误类型：
 * - 参数错误 (-32602): 不应重试
 * - 网络错误: 可重试
 * - 超时错误: 可重试
 * - 服务器错误: 可重试
 *
 * 创建日期: 2025-11-17
 */

import { logger } from '@/utils/logger';

const log = logger.createNamespace('ErrorClassifier');

/**
 * 错误类别枚举
 */
export enum ErrorCategory {
  /** 参数验证错误 (JSON-RPC -32602) - 不应重试 */
  ParameterError = 'parameter',

  /** 网络连接错误 - 可重试 */
  NetworkError = 'network',

  /** 超时错误 - 可重试 */
  TimeoutError = 'timeout',

  /** 服务器内部错误 - 可重试 */
  ServerError = 'server',

  /** 未知错误 */
  Unknown = 'unknown',
}

/**
 * 错误统计信息
 */
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  lastError?: {
    category: ErrorCategory;
    message: string;
    timestamp: number;
  };
}

/**
 * ErrorClassifier 类
 *
 * 使用示例：
 * ```typescript
 * try {
 *   await mcpClient.callTool(...);
 * } catch (error) {
 *   const category = ErrorClassifier.classify(error);
 *   if (ErrorClassifier.isRetryable(category)) {
 *     // 重试操作
 *   }
 * }
 * ```
 */
export class ErrorClassifier {
  /** 错误统计信息 */
  private static stats: Map<string, ErrorStats> = new Map();

  /**
   * 分类错误
   *
   * @param error 错误对象
   * @returns 错误类别
   */
  static classify(error: any): ErrorCategory {
    // 1. 检查 JSON-RPC 错误码（最优先）
    if (error?.code === -32602 || error?.error?.code === -32602) {
      log.debug('分类为参数错误', { code: -32602 });
      return ErrorCategory.ParameterError;
    }

    // 2. 检查错误消息中的关键词
    const errorMessage = this._getErrorMessage(error);

    if (this._isTimeoutError(errorMessage)) {
      log.debug('分类为超时错误', { message: errorMessage });
      return ErrorCategory.TimeoutError;
    }

    if (this._isNetworkError(errorMessage)) {
      log.debug('分类为网络错误', { message: errorMessage });
      return ErrorCategory.NetworkError;
    }

    if (this._isServerError(errorMessage, error)) {
      log.debug('分类为服务器错误', { message: errorMessage });
      return ErrorCategory.ServerError;
    }

    // 3. 默认为未知错误
    log.debug('分类为未知错误', { message: errorMessage });
    return ErrorCategory.Unknown;
  }

  /**
   * 判断错误是否可重试
   *
   * @param category 错误类别
   * @returns 是否可重试
   */
  static isRetryable(category: ErrorCategory): boolean {
    // 参数错误不应重试（服务器无法处理）
    return category !== ErrorCategory.ParameterError;
  }

  /**
   * 记录错误统计
   *
   * @param serverId 服务器ID
   * @param error 错误对象
   */
  static recordError(serverId: string, error: any): void {
    const category = this.classify(error);
    const message = this._getErrorMessage(error);

    let stats = this.stats.get(serverId);
    if (!stats) {
      stats = {
        total: 0,
        byCategory: {
          [ErrorCategory.ParameterError]: 0,
          [ErrorCategory.NetworkError]: 0,
          [ErrorCategory.TimeoutError]: 0,
          [ErrorCategory.ServerError]: 0,
          [ErrorCategory.Unknown]: 0,
        },
      };
      this.stats.set(serverId, stats);
    }

    stats.total++;
    stats.byCategory[category]++;
    stats.lastError = {
      category,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取错误统计信息
   *
   * @param serverId 服务器ID
   * @returns 错误统计信息
   */
  static getStats(serverId: string): ErrorStats | undefined {
    return this.stats.get(serverId);
  }

  /**
   * 清除错误统计
   *
   * @param serverId 服务器ID（如果不提供，则清除所有）
   */
  static clearStats(serverId?: string): void {
    if (serverId) {
      this.stats.delete(serverId);
    } else {
      this.stats.clear();
    }
  }

  // ============== 私有辅助方法 ==============

  /**
   * 提取错误消息
   */
  private static _getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error?.message) {
      return String(error.message);
    }

    if (error?.error?.message) {
      return String(error.error.message);
    }

    return JSON.stringify(error);
  }

  /**
   * 判断是否为超时错误
   */
  private static _isTimeoutError(message: string): boolean {
    const timeoutPatterns = [
      /timeout/i,
      /timed out/i,
      /time out/i,
      /ETIMEDOUT/i,
      /request took too long/i,
      /deadline exceeded/i,
    ];

    return timeoutPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * 判断是否为网络错误
   */
  private static _isNetworkError(message: string): boolean {
    const networkPatterns = [
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ENETUNREACH/i,
      /EHOSTUNREACH/i,
      /network error/i,
      /connection refused/i,
      /connection reset/i,
      /connection failed/i,
      /failed to fetch/i,
      /fetch failed/i,
      /unable to connect/i,
      /cannot connect/i,
      /connection timeout/i,
    ];

    return networkPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * 判断是否为服务器错误
   */
  private static _isServerError(message: string, error: any): boolean {
    // 检查HTTP状态码 (5xx)
    const status = error?.status ?? error?.response?.status;
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }

    // 检查错误消息关键词
    const serverPatterns = [
      /internal server error/i,
      /service unavailable/i,
      /bad gateway/i,
      /gateway timeout/i,
      /server error/i,
      /500/,
      /502/,
      /503/,
      /504/,
    ];

    return serverPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * 获取错误的详细描述（用于日志）
   *
   * @param error 错误对象
   * @returns 详细描述字符串
   */
  static getErrorDetails(error: any): string {
    const category = this.classify(error);
    const message = this._getErrorMessage(error);
    const retryable = this.isRetryable(category);

    const details = [
      `Category: ${category}`,
      `Retryable: ${retryable}`,
      `Message: ${message}`,
    ];

    // 添加额外的错误信息
    if (error?.code) {
      details.push(`Code: ${error.code}`);
    }
    if (error?.status) {
      details.push(`Status: ${error.status}`);
    }

    return details.join(', ');
  }
}
