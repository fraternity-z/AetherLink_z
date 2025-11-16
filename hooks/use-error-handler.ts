/**
 * 全局错误处理 Hook
 *
 * 统一的错误处理接口，集成错误日志记录、用户提示和错误上报
 *
 * @example
 * ```typescript
 * const { handleError, showError, withErrorHandler } = useErrorHandler();
 *
 * // 方式 1：手动处理错误
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, { operation: 'someOperation' });
 * }
 *
 * // 方式 2：显示错误提示
 * showError(error);
 *
 * // 方式 3：包装异步函数
 * const safeOperation = withErrorHandler(async () => {
 *   await riskyOperation();
 * });
 * await safeOperation();
 * ```
 */

import { useCallback } from 'react';
import { AppError, normalizeError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { useConfirmDialog } from './use-confirm-dialog';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否显示错误提示（默认 true） */
  showDialog?: boolean;
  /** 是否记录日志（默认 true） */
  logError?: boolean;
  /** 是否上报错误（默认 true） */
  reportError?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 额外的上下文数据 */
  context?: Record<string, unknown>;
  /** 错误回调 */
  onError?: (error: AppError) => void;
}

/**
 * 全局错误处理 Hook
 *
 * @returns 错误处理函数和工具方法
 */
export function useErrorHandler() {
  const { confirm } = useConfirmDialog();

  /**
   * 处理错误的核心方法
   *
   * @param error - 错误对象
   * @param options - 处理选项
   */
  const handleError = useCallback(
    async (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showDialog: shouldShowDialog = true,
        logError: shouldLog = true,
        reportError: shouldReport = true,
        customMessage,
        context,
        onError,
      } = options;

      // 规范化错误
      const appError = normalizeError(error);

      // 记录日志
      if (shouldLog) {
        logger.error(
          `[ErrorHandler] ${appError.getUserMessage()}`,
          appError,
          context
        );
      }

      // 上报错误
      if (shouldReport) {
        try {
          await logger.captureException(appError, context);
        } catch (reportError) {
          // 上报失败不应该影响主流程
          logger.warn('[ErrorHandler] 错误上报失败', reportError);
        }
      }

      // 显示错误提示
      if (shouldShowDialog) {
        const message = customMessage || appError.getUserMessage();
        const recoveryActions = appError.getRecoveryActions();

        // 构建按钮
        const buttons = [
          ...recoveryActions.map((action) => ({
            text: action.title,
            onPress: () => {
              // TODO: 执行恢复操作
              console.log('执行恢复操作:', action.type, action.payload);
            },
          })),
          {
            text: '关闭',
            onPress: () => {},
          },
        ];

        confirm({
          title: '错误提示',
          message,
          icon: {
            name: 'alert-circle',
            color: 'error',
          },
          buttons: buttons.length > 1 ? buttons : undefined,
        });
      }

      // 调用错误回调
      if (onError) {
        onError(appError);
      }
    },
    [confirm]
  );

  /**
   * 显示错误提示（快捷方法）
   *
   * @param error - 错误对象
   * @param customMessage - 自定义错误消息
   */
  const showError = useCallback(
    (error: unknown, customMessage?: string) => {
      handleError(error, {
        showDialog: true,
        logError: true,
        reportError: false, // 快捷方法不自动上报
        customMessage,
      });
    },
    [handleError]
  );

  /**
   * 包装异步函数，自动处理错误
   *
   * @param fn - 异步函数
   * @param options - 错误处理选项
   * @returns 包装后的函数
   *
   * @example
   * ```typescript
   * const safeLoadData = withErrorHandler(
   *   async () => {
   *     const data = await fetchData();
   *     return data;
   *   },
   *   { customMessage: '加载数据失败' }
   * );
   *
   * const data = await safeLoadData();
   * ```
   */
  const withErrorHandler = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      options: ErrorHandlerOptions = {}
    ): ((...args: Parameters<T>) => Promise<ReturnType<T> | undefined>) => {
      return async (...args: Parameters<T>) => {
        try {
          return await fn(...args);
        } catch (error) {
          await handleError(error, options);
          return undefined;
        }
      };
    },
    [handleError]
  );

  /**
   * 包装同步函数，自动处理错误
   *
   * @param fn - 同步函数
   * @param options - 错误处理选项
   * @returns 包装后的函数
   */
  const withSyncErrorHandler = useCallback(
    <T extends (...args: any[]) => any>(
      fn: T,
      options: ErrorHandlerOptions = {}
    ): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
      return (...args: Parameters<T>) => {
        try {
          return fn(...args);
        } catch (error) {
          handleError(error, options);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return {
    /** 处理错误的核心方法 */
    handleError,
    /** 显示错误提示（快捷方法） */
    showError,
    /** 包装异步函数，自动处理错误 */
    withErrorHandler,
    /** 包装同步函数，自动处理错误 */
    withSyncErrorHandler,
  };
}

/**
 * 默认导出
 */
export default useErrorHandler;
