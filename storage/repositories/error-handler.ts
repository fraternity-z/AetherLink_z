/**
 * Repository 层错误处理工具
 *
 * 为 Repository 方法提供统一的错误处理包装器，
 * 在底层数据库错误的基础上添加业务相关的上下文信息
 */

import { DatabaseError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Repository 错误上下文
 */
export interface RepositoryErrorContext {
  /** Repository 名称 */
  repository: string;
  /** 方法名称 */
  method: string;
  /** 表名称 */
  table?: string;
  /** 业务相关的上下文数据 */
  [key: string]: unknown;
}

/**
 * Repository 方法错误处理包装器
 *
 * @param repository - Repository 名称（如 'ChatRepository'）
 * @param method - 方法名称（如 'getConversation'）
 * @param businessContext - 业务相关的上下文数据（如 { conversationId: 'xxx' }）
 * @param fn - 要执行的异步函数
 * @returns 函数执行结果
 *
 * @example
 * ```typescript
 * async getConversation(id: string): Promise<Conversation | null> {
 *   return withRepositoryContext('ChatRepository', 'getConversation', { conversationId: id }, async () => {
 *     const row = await queryOne(...);
 *     return row ? mapToConversation(row) : null;
 *   });
 * }
 * ```
 */
export async function withRepositoryContext<T>(
  repository: string,
  method: string,
  businessContext: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // 如果是 DatabaseError，增强其上下文信息
    if (error instanceof DatabaseError) {
      const enhancedContext: RepositoryErrorContext = {
        repository,
        method,
        ...error.getContext(),
        ...businessContext,
      };

      // 记录增强后的错误日志
      logger.error(
        `[${repository}.${method}] 数据库操作失败`,
        error,
        enhancedContext
      );

      // 创建新的 DatabaseError 包含增强的上下文
      throw new DatabaseError(
        error.message,
        error.code,
        enhancedContext,
        error
      );
    }

    // 非 DatabaseError，直接记录并抛出
    logger.error(
      `[${repository}.${method}] 操作失败`,
      error,
      {
        repository,
        method,
        ...businessContext,
      }
    );

    throw error;
  }
}

/**
 * 同步方法的 Repository 错误处理包装器
 *
 * @param repository - Repository 名称
 * @param method - 方法名称
 * @param businessContext - 业务上下文
 * @param fn - 要执行的同步函数
 * @returns 函数执行结果
 */
export function withSyncRepositoryContext<T>(
  repository: string,
  method: string,
  businessContext: Record<string, unknown>,
  fn: () => T
): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof DatabaseError) {
      const enhancedContext: RepositoryErrorContext = {
        repository,
        method,
        ...error.getContext(),
        ...businessContext,
      };

      logger.error(
        `[${repository}.${method}] 数据库操作失败`,
        error,
        enhancedContext
      );

      throw new DatabaseError(
        error.message,
        error.code,
        enhancedContext,
        error
      );
    }

    logger.error(
      `[${repository}.${method}] 操作失败`,
      error,
      {
        repository,
        method,
        ...businessContext,
      }
    );

    throw error;
  }
}
