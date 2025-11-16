/**
 * 统一日志管理工具
 *
 * 提供一致的日志API，替代直接使用 console.*
 * 支持日志分级、生产环境优化、错误追踪、第三方日志服务集成
 *
 * @module utils/logger
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * // 调试信息（仅开发环境）
 * logger.debug('组件渲染', { component: 'ChatInput' });
 *
 * // 普通信息
 * logger.info('消息发送成功', { messageId: '123' });
 *
 * // 警告信息
 * logger.warn('API 响应缓慢', { duration: 3000 });
 *
 * // 错误信息（自动收集错误上下文）
 * logger.error('网络请求失败', error, { url: '/api/chat' });
 *
 * // 捕获异常（集成错误上报）
 * logger.captureException(error, { userAction: 'submit_form' });
 * ```
 */

import { AppError, normalizeError } from '@/utils/errors';
import { errorContextCollector } from '@/utils/error-context';
import { errorReporter } from '@/utils/error-reporter';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
  /** 附加数据 */
  data?: any;
  /** 错误对象 */
  error?: Error | unknown;
  /** 上下文信息 */
  context?: any;
}

/**
 * 日志处理器接口
 * 用于扩展日志输出目标（如远程日志服务）
 */
export interface LogHandler {
  handle(entry: LogEntry): void | Promise<void>;
}

/**
 * 日志管理器类
 */
class Logger {
  /** 日志处理器列表 */
  private handlers: LogHandler[] = [];

  /** 是否启用调试日志 */
  private debugEnabled: boolean = __DEV__;

  /**
   * 添加日志处理器
   * @param handler 日志处理器实例
   * @example
   * ```typescript
   * logger.addHandler({
   *   handle: async (entry) => {
   *     await sendToRemoteService(entry);
   *   }
   * });
   * ```
   */
  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }

  /**
   * 移除日志处理器
   * @param handler 要移除的日志处理器实例
   */
  removeHandler(handler: LogHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * 设置是否启用调试日志
   * @param enabled 是否启用
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  /**
   * 处理日志条目
   * @param entry 日志条目
   */
  private async processLog(entry: LogEntry): Promise<void> {
    // 调用所有已注册的处理器
    for (const handler of this.handlers) {
      try {
        await handler.handle(entry);
      } catch (error) {
        // 处理器执行失败，输出到 console.error（不会被移除）
        console.error('日志处理器执行失败:', error);
      }
    }
  }

  /**
   * 格式化日志前缀
   * @param level 日志级别
   * @returns 格式化的前缀字符串
   */
  private formatPrefix(level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
    };

    return `${levelEmoji[level]} [${timestamp}] [${level.toUpperCase()}]`;
  }

  /**
   * 输出调试日志
   * 仅在开发环境或 debugEnabled 为 true 时输出
   * 生产环境会被 Babel 插件自动移除
   *
   * @param message 日志消息
   * @param data 附加数据对象（可选）
   *
   * @example
   * ```typescript
   * logger.debug('函数调用', { function: 'handleSubmit', params: { text: 'hello' } });
   * ```
   */
  debug(message: string, data?: any): void {
    if (!this.debugEnabled) return;

    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: Date.now(),
      data,
    };

    console.log(this.formatPrefix(LogLevel.DEBUG), message, data || '');
    this.processLog(entry);
  }

  /**
   * 输出普通信息日志
   * 用于记录正常的业务流程和状态变化
   * 生产环境会被 Babel 插件自动移除
   *
   * @param message 日志消息
   * @param data 附加数据对象（可选）
   *
   * @example
   * ```typescript
   * logger.info('用户登录成功', { userId: '12345', timestamp: Date.now() });
   * ```
   */
  info(message: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: Date.now(),
      data,
    };

    console.info(this.formatPrefix(LogLevel.INFO), message, data || '');
    this.processLog(entry);
  }

  /**
   * 输出警告日志
   * 用于标记潜在问题或需要关注的情况
   * 生产环境会被 Babel 插件自动移除
   *
   * @param message 日志消息
   * @param data 附加数据对象（可选）
   *
   * @example
   * ```typescript
   * logger.warn('API 密钥即将过期', { expiresIn: '7 days' });
   * ```
   */
  warn(message: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: Date.now(),
      data,
    };

    console.warn(this.formatPrefix(LogLevel.WARN), message, data || '');
    this.processLog(entry);
  }

  /**
   * 输出错误日志
   * 用于记录异常和错误信息
   * 生产环境保留 console.error（用于崩溃报告）
   *
   * @param message 错误描述消息
   * @param error 错误对象（可选）
   * @param context 错误上下文信息（可选）
   *
   * @example
   * ```typescript
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   logger.error('操作执行失败', error, {
   *     context: { operation: 'riskyOperation', timestamp: Date.now() }
   *   });
   * }
   * ```
   */
  error(message: string, error?: Error | unknown, context?: any): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: Date.now(),
      error,
      context,
    };

    // console.error 会在生产环境保留（Babel 配置中排除）
    console.error(this.formatPrefix(LogLevel.ERROR), message, error || '', context || '');
    this.processLog(entry);
  }

  /**
   * 创建带有命名空间的日志记录器
   * 便于识别日志来源
   *
   * @param namespace 命名空间（如模块名、组件名）
   * @returns 带有命名空间的日志记录器
   *
   * @example
   * ```typescript
   * const log = logger.createNamespace('AiClient');
   * log.info('发送消息'); // 输出: ℹ️ [时间戳] [INFO] [AiClient] 发送消息
   * ```
   */
  createNamespace(namespace: string) {
    return {
      debug: (message: string, data?: any) => {
        this.debug(`[${namespace}] ${message}`, data);
      },
      info: (message: string, data?: any) => {
        this.info(`[${namespace}] ${message}`, data);
      },
      warn: (message: string, data?: any) => {
        this.warn(`[${namespace}] ${message}`, data);
      },
      error: (message: string, error?: Error | unknown, context?: any) => {
        this.error(`[${namespace}] ${message}`, error, context);
      },
    };
  }

  /**
   * 捕获异常并上报
   *
   * 自动收集错误上下文（设备信息、路由、应用状态等）并上报到错误追踪服务
   *
   * @param error - 错误对象
   * @param extra - 额外的自定义数据
   *
   * @example
   * ```typescript
   * try {
   *   await riskyOperation();
   * } catch (err) {
   *   logger.captureException(err, {
   *     operation: 'riskyOperation',
   *     userId: '123',
   *   });
   * }
   * ```
   */
  async captureException(error: Error | unknown, extra?: Record<string, unknown>): Promise<void> {
    // 规范化错误
    const appError = normalizeError(error);

    // 收集错误上下文
    const errorContext = await errorContextCollector.collect(extra);

    // 记录到日志
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message: `[捕获异常] ${appError.getUserMessage()}`,
      timestamp: Date.now(),
      error: appError,
      context: {
        errorCode: appError.code,
        severity: appError.severity,
        retryable: appError.retryable,
        ...errorContext,
      },
    };

    console.error(
      this.formatPrefix(LogLevel.ERROR),
      `[捕获异常] ${appError.getUserMessage()}`,
      {
        error: {
          name: appError.name,
          message: appError.message,
          code: appError.code,
          severity: appError.severity,
          stack: appError.stack,
        },
        context: errorContext,
      }
    );

    // 调用日志处理器
    await this.processLog(entry);

    // 上报到错误追踪服务
    try {
      await errorReporter.captureException(appError, errorContext);
    } catch (reportError) {
      // 错误上报失败，不应该影响主流程
      console.error('错误上报失败:', reportError);
    }
  }

  /**
   * 添加面包屑（用于追踪用户操作路径）
   *
   * @param message - 面包屑消息
   * @param category - 分类（如 'navigation', 'ui.click', 'http' 等）
   * @param data - 额外数据
   *
   * @example
   * ```typescript
   * logger.addBreadcrumb('用户点击按钮', 'ui.click', { buttonId: 'submit' });
   * logger.addBreadcrumb('导航到设置页', 'navigation', { route: '/settings' });
   * ```
   */
  addBreadcrumb(
    message: string,
    category?: string,
    data?: Record<string, unknown>
  ): void {
    errorReporter.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
    });
  }

  /**
   * 设置用户标识（用于错误追踪）
   *
   * @param userId - 用户 ID
   * @param userInfo - 用户信息
   *
   * @example
   * ```typescript
   * logger.setUser('user-123', { email: 'user@example.com', plan: 'pro' });
   * ```
   */
  setUser(userId: string, userInfo?: Record<string, unknown>): void {
    errorReporter.setUser(userId, userInfo);
  }

  /**
   * 清除用户标识
   *
   * @example
   * ```typescript
   * // 用户登出时清除用户标识
   * logger.clearUser();
   * ```
   */
  clearUser(): void {
    errorReporter.clearUser();
  }
}

/**
 * 全局日志实例
 *
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('调试信息');
 * logger.info('普通信息');
 * logger.warn('警告信息');
 * logger.error('错误信息', error);
 * ```
 */
export const logger = new Logger();

/**
 * 默认导出
 */
export default logger;

// ===== 未来扩展示例（取消注释即可使用） =====

/**
 * Sentry 日志处理器示例
 * 需要先安装: npm install @sentry/react-native
 */
// import * as Sentry from '@sentry/react-native';
//
// export class SentryLogHandler implements LogHandler {
//   handle(entry: LogEntry): void {
//     if (__DEV__) return; // 仅生产环境上报
//
//     if (entry.level === LogLevel.ERROR) {
//       Sentry.captureException(entry.error || new Error(entry.message), {
//         extra: {
//           context: entry.context,
//           data: entry.data,
//         },
//       });
//     } else {
//       Sentry.captureMessage(entry.message, {
//         level: entry.level as any,
//         extra: {
//           data: entry.data,
//           context: entry.context,
//         },
//       });
//     }
//   }
// }
//
// // 注册 Sentry 处理器
// logger.addHandler(new SentryLogHandler());

/**
 * 文件日志处理器示例
 * 需要先安装: expo-file-system
 */
// import * as FileSystem from 'expo-file-system';
//
// export class FileLogHandler implements LogHandler {
//   private logFilePath: string;
//
//   constructor() {
//     this.logFilePath = `${FileSystem.documentDirectory}app.log`;
//   }
//
//   async handle(entry: LogEntry): Promise<void> {
//     if (__DEV__) return; // 仅生产环境记录到文件
//
//     const logLine = JSON.stringify({
//       ...entry,
//       timestamp: new Date(entry.timestamp).toISOString(),
//     }) + '\n';
//
//     try {
//       await FileSystem.appendAsync(this.logFilePath, logLine);
//     } catch (error) {
//       console.error('写入日志文件失败:', error);
//     }
//   }
//
//   async getLogs(): Promise<string> {
//     try {
//       return await FileSystem.readAsStringAsync(this.logFilePath);
//     } catch (error) {
//       return '';
//     }
//   }
//
//   async clearLogs(): Promise<void> {
//     try {
//       await FileSystem.deleteAsync(this.logFilePath, { idempotent: true });
//     } catch (error) {
//       console.error('清除日志文件失败:', error);
//     }
//   }
// }
//
// // 注册文件日志处理器
// logger.addHandler(new FileLogHandler());
