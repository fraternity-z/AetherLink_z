/**
 * 错误上报抽象接口
 *
 * 提供统一的错误上报接口，支持集成第三方错误追踪服务（如 Sentry）
 */

import type { AppError } from '@/utils/errors';
import type { ErrorContext } from '@/utils/error-context';

/**
 * 错误上报接口
 */
export interface IErrorReporter {
  /**
   * 捕获异常并上报
   *
   * @param error - 错误对象
   * @param context - 错误上下文
   */
  captureException(error: AppError | Error, context?: ErrorContext): Promise<void>;

  /**
   * 捕获消息并上报
   *
   * @param message - 消息内容
   * @param level - 日志级别
   * @param context - 错误上下文
   */
  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error',
    context?: ErrorContext
  ): Promise<void>;

  /**
   * 设置用户标识（用于追踪特定用户的错误）
   *
   * @param userId - 用户 ID
   * @param userInfo - 用户信息
   */
  setUser(userId: string, userInfo?: Record<string, unknown>): void;

  /**
   * 清除用户标识
   */
  clearUser(): void;

  /**
   * 添加面包屑（用于追踪用户操作路径）
   *
   * @param breadcrumb - 面包屑数据
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
  }): void;
}

/**
 * 控制台错误上报器（开发环境默认使用）
 *
 * 仅将错误输出到控制台，不进行实际上报
 */
export class ConsoleErrorReporter implements IErrorReporter {
  async captureException(error: AppError | Error, context?: ErrorContext): Promise<void> {
    console.error('[ErrorReporter] 捕获异常:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  async captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error',
    context?: ErrorContext
  ): Promise<void> {
    const logFn = {
      debug: console.log,
      info: console.info,
      warning: console.warn,
      error: console.error,
    }[level];

    logFn('[ErrorReporter] 捕获消息:', message, context);
  }

  setUser(userId: string, userInfo?: Record<string, unknown>): void {
    console.info('[ErrorReporter] 设置用户:', userId, userInfo);
  }

  clearUser(): void {
    console.info('[ErrorReporter] 清除用户');
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
  }): void {
    console.log('[ErrorReporter] 添加面包屑:', breadcrumb);
  }
}

/**
 * Sentry 错误上报器示例
 *
 * 需要先安装: npm install @sentry/react-native
 * 然后取消注释并配置
 */
// import * as Sentry from '@sentry/react-native';
//
// export class SentryErrorReporter implements IErrorReporter {
//   async captureException(error: AppError | Error, context?: ErrorContext): Promise<void> {
//     Sentry.captureException(error, {
//       contexts: {
//         custom: context as any,
//       },
//       tags: {
//         errorCode: error instanceof AppError ? error.code : undefined,
//         severity: error instanceof AppError ? error.severity : undefined,
//       },
//     });
//   }
//
//   async captureMessage(
//     message: string,
//     level: 'debug' | 'info' | 'warning' | 'error',
//     context?: ErrorContext
//   ): Promise<void> {
//     Sentry.captureMessage(message, {
//       level: level as any,
//       contexts: {
//         custom: context as any,
//       },
//     });
//   }
//
//   setUser(userId: string, userInfo?: Record<string, unknown>): void {
//     Sentry.setUser({
//       id: userId,
//       ...userInfo,
//     });
//   }
//
//   clearUser(): void {
//     Sentry.setUser(null);
//   }
//
//   addBreadcrumb(breadcrumb: {
//     message: string;
//     category?: string;
//     level?: 'debug' | 'info' | 'warning' | 'error';
//     data?: Record<string, unknown>;
//   }): void {
//     Sentry.addBreadcrumb({
//       message: breadcrumb.message,
//       category: breadcrumb.category,
//       level: breadcrumb.level as any,
//       data: breadcrumb.data,
//     });
//   }
// }

/**
 * 错误上报器管理类
 */
class ErrorReporterManager {
  private reporter: IErrorReporter;

  constructor() {
    // 默认使用控制台上报器
    this.reporter = new ConsoleErrorReporter();
  }

  /**
   * 设置错误上报器
   *
   * @param reporter - 错误上报器实例
   *
   * @example
   * ```typescript
   * // 生产环境使用 Sentry
   * if (!__DEV__) {
   *   errorReporter.setReporter(new SentryErrorReporter());
   * }
   * ```
   */
  setReporter(reporter: IErrorReporter): void {
    this.reporter = reporter;
  }

  /**
   * 获取当前错误上报器
   */
  getReporter(): IErrorReporter {
    return this.reporter;
  }

  /**
   * 捕获异常
   */
  async captureException(error: AppError | Error, context?: ErrorContext): Promise<void> {
    return this.reporter.captureException(error, context);
  }

  /**
   * 捕获消息
   */
  async captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): Promise<void> {
    return this.reporter.captureMessage(message, level, context);
  }

  /**
   * 设置用户标识
   */
  setUser(userId: string, userInfo?: Record<string, unknown>): void {
    this.reporter.setUser(userId, userInfo);
  }

  /**
   * 清除用户标识
   */
  clearUser(): void {
    this.reporter.clearUser();
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
  }): void {
    this.reporter.addBreadcrumb(breadcrumb);
  }
}

/**
 * 全局错误上报器实例
 */
export const errorReporter = new ErrorReporterManager();

/**
 * 默认导出
 */
export default errorReporter;
