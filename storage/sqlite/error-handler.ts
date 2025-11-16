/**
 * SQLite 错误处理工具
 *
 * 提供统一的数据库错误转换和处理机制
 */

import { DatabaseError, ErrorCode } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * SQLite 错误类型枚举
 *
 * 参考：https://www.sqlite.org/rescode.html
 */
export enum SQLiteErrorCode {
  /** 通用错误 */
  ERROR = 1,
  /** 内部逻辑错误 */
  INTERNAL = 2,
  /** 拒绝访问 */
  PERM = 3,
  /** 操作中断 */
  ABORT = 4,
  /** 数据库文件被锁定 */
  BUSY = 5,
  /** 数据库表被锁定 */
  LOCKED = 6,
  /** 内存分配失败 */
  NOMEM = 7,
  /** 尝试写入只读数据库 */
  READONLY = 8,
  /** 操作被 sqlite3_interrupt() 终止 */
  INTERRUPT = 9,
  /** 磁盘 I/O 错误 */
  IOERR = 10,
  /** 数据库损坏 */
  CORRUPT = 11,
  /** sqlite3_file_control() 中找不到操作码 */
  NOTFOUND = 12,
  /** 插入失败，因为数据库已满 */
  FULL = 13,
  /** 无法打开数据库文件 */
  CANTOPEN = 14,
  /** 数据库锁定协议错误 */
  PROTOCOL = 15,
  /** 数据库为空 */
  EMPTY = 16,
  /** 数据库模式已更改 */
  SCHEMA = 17,
  /** 字符串或 BLOB 超过大小限制 */
  TOOBIG = 18,
  /** 由于约束冲突中止 */
  CONSTRAINT = 19,
  /** 数据类型不匹配 */
  MISMATCH = 20,
  /** 库使用不当 */
  MISUSE = 21,
  /** 使用主机系统不支持的操作系统功能 */
  NOLFS = 22,
  /** 授权拒绝 */
  AUTH = 23,
  /** 辅助数据库格式错误 */
  FORMAT = 24,
  /** 第二个参数超出范围 */
  RANGE = 25,
  /** 不是数据库文件 */
  NOTADB = 26,
}

/**
 * 约束类型枚举
 */
export enum SQLiteConstraintType {
  /** 主键约束 */
  PRIMARY_KEY = 'SQLITE_CONSTRAINT_PRIMARYKEY',
  /** 唯一约束 */
  UNIQUE = 'SQLITE_CONSTRAINT_UNIQUE',
  /** 非空约束 */
  NOT_NULL = 'SQLITE_CONSTRAINT_NOTNULL',
  /** 检查约束 */
  CHECK = 'SQLITE_CONSTRAINT_CHECK',
  /** 外键约束 */
  FOREIGN_KEY = 'SQLITE_CONSTRAINT_FOREIGNKEY',
}

/**
 * 解析 SQLite 错误消息，提取约束类型
 *
 * @param message - 错误消息
 * @returns 约束类型
 */
function parseConstraintType(message: string): SQLiteConstraintType | null {
  const lower = message.toLowerCase();

  if (lower.includes('unique') || lower.includes('primary key')) {
    return SQLiteConstraintType.UNIQUE;
  }
  if (lower.includes('not null')) {
    return SQLiteConstraintType.NOT_NULL;
  }
  if (lower.includes('check constraint')) {
    return SQLiteConstraintType.CHECK;
  }
  if (lower.includes('foreign key')) {
    return SQLiteConstraintType.FOREIGN_KEY;
  }

  return null;
}

/**
 * 将 SQLite 错误转换为 DatabaseError
 *
 * @param error - 原始错误对象
 * @param operation - 操作类型（query, insert, update, delete 等）
 * @param sql - SQL 语句（可选，用于调试）
 * @returns DatabaseError 实例
 */
export function convertSQLiteError(
  error: unknown,
  operation: string,
  sql?: string
): DatabaseError {
  if (!(error instanceof Error)) {
    return new DatabaseError(
      `数据库操作失败: ${String(error)}`,
      ErrorCode.DB_ERR_QUERY,
      { operation, sql },
      undefined
    );
  }

  const message = error.message;
  const lower = message.toLowerCase();

  // 解析错误代码（如果存在）
  const codeMatch = message.match(/SQLITE_(\w+)/i);
  const errorName = codeMatch ? codeMatch[1].toUpperCase() : null;

  // 根据错误类型返回相应的 DatabaseError
  if (lower.includes('constraint') || errorName === 'CONSTRAINT') {
    const constraintType = parseConstraintType(message);
    return new DatabaseError(
      `数据库约束冲突: ${message}`,
      ErrorCode.DB_ERR_CONSTRAINT,
      {
        operation,
        sql,
        constraintType,
      },
      error
    );
  }

  if (lower.includes('no such table') || lower.includes('no such column')) {
    return new DatabaseError(
      `数据库模式错误: ${message}`,
      ErrorCode.DB_ERR_QUERY,
      { operation, sql },
      error
    );
  }

  if (lower.includes('database is locked') || errorName === 'LOCKED' || errorName === 'BUSY') {
    return new DatabaseError(
      `数据库被锁定，请稍后重试`,
      ErrorCode.DB_ERR_QUERY,
      { operation, sql },
      error
    );
  }

  if (lower.includes('unable to open database') || errorName === 'CANTOPEN') {
    return new DatabaseError(
      `无法打开数据库文件`,
      ErrorCode.DB_ERR_CONNECTION,
      { operation, sql },
      error
    );
  }

  if (lower.includes('database disk image is malformed') || errorName === 'CORRUPT') {
    return new DatabaseError(
      `数据库文件已损坏`,
      ErrorCode.DB_ERR_CONNECTION,
      { operation, sql },
      error
    );
  }

  if (lower.includes('out of memory') || errorName === 'NOMEM') {
    return new DatabaseError(
      `数据库操作内存不足`,
      ErrorCode.DB_ERR_QUERY,
      { operation, sql },
      error
    );
  }

  // 根据操作类型返回相应的错误码
  let errorCode: ErrorCode;
  switch (operation.toLowerCase()) {
    case 'insert':
      errorCode = ErrorCode.DB_ERR_INSERT;
      break;
    case 'update':
      errorCode = ErrorCode.DB_ERR_UPDATE;
      break;
    case 'delete':
      errorCode = ErrorCode.DB_ERR_DELETE;
      break;
    case 'transaction':
      errorCode = ErrorCode.DB_ERR_TRANSACTION;
      break;
    default:
      errorCode = ErrorCode.DB_ERR_QUERY;
  }

  return new DatabaseError(
    `数据库${operation}操作失败: ${message}`,
    errorCode,
    { operation, sql },
    error
  );
}

/**
 * 包装数据库操作，自动处理错误
 *
 * @param operation - 操作类型描述
 * @param fn - 数据库操作函数
 * @param sql - SQL 语句（可选）
 * @returns 包装后的函数
 *
 * @example
 * ```typescript
 * const result = await withDatabaseErrorHandler(
 *   'query',
 *   () => db.getAllAsync('SELECT * FROM users'),
 *   'SELECT * FROM users'
 * );
 * ```
 */
export async function withDatabaseErrorHandler<T>(
  operation: string,
  fn: () => Promise<T>,
  sql?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const dbError = convertSQLiteError(error, operation, sql);

    // 记录错误日志
    logger.error(
      `[数据库错误] ${operation} 操作失败`,
      dbError,
      {
        sql,
        errorCode: dbError.code,
        severity: dbError.severity,
      }
    );

    // 抛出转换后的错误
    throw dbError;
  }
}

/**
 * 创建带错误处理的事务包装器
 *
 * @param operation - 操作描述
 * @param fn - 事务函数
 * @returns 包装后的函数
 *
 * @example
 * ```typescript
 * await withTransactionErrorHandler(
 *   '创建用户和设置',
 *   async (db) => {
 *     await db.runAsync('INSERT INTO users ...');
 *     await db.runAsync('INSERT INTO settings ...');
 *   }
 * );
 * ```
 */
export async function withTransactionErrorHandler<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const dbError = convertSQLiteError(error, 'transaction', `[${operation}]`);

    logger.error(
      `[数据库事务错误] ${operation} 失败`,
      dbError,
      {
        operation,
        errorCode: dbError.code,
        severity: dbError.severity,
      }
    );

    throw dbError;
  }
}
