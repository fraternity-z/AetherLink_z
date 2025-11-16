/**
 * 错误类型定义
 *
 * 统一的错误接口和类型定义
 */

import { ErrorCode, ErrorSeverity } from '@/utils/error-codes';

/**
 * 应用错误基础接口
 */
export interface IAppError {
  /** 错误名称 */
  name: string;
  /** 错误消息 */
  message: string;
  /** 错误码 */
  code: ErrorCode;
  /** 严重级别 */
  severity: ErrorSeverity;
  /** 错误堆栈 */
  stack?: string;
  /** 原始错误 */
  cause?: Error;
  /** 是否可重试 */
  retryable: boolean;
  /** 用户友好的错误消息 */
  getUserMessage(): string;
  /** 获取错误上下文（用于日志） */
  getContext(): Record<string, unknown>;
}

/**
 * 数据库错误上下文
 */
export interface DatabaseErrorContext {
  /** 操作类型（query, insert, update, delete 等） */
  operation?: string;
  /** 表名 */
  table?: string;
  /** SQL 语句（可选，调试用） */
  sql?: string;
  /** 参数（可选，调试用） */
  params?: unknown[];
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * AI 服务错误上下文
 */
export interface AiErrorContext {
  /** AI 提供商（openai, anthropic, google 等） */
  provider?: string;
  /** 模型名称 */
  model?: string;
  /** 请求 ID（用于追踪） */
  requestId?: string;
  /** 提示词长度 */
  promptLength?: number;
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * 网络错误上下文
 */
export interface NetworkErrorContext {
  /** HTTP 状态码 */
  statusCode?: number;
  /** 请求 URL */
  url?: string;
  /** 请求方法 */
  method?: string;
  /** 响应头（可选） */
  headers?: Record<string, string>;
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * 权限错误上下文
 */
export interface PermissionErrorContext {
  /** 权限类型（microphone, storage, camera 等） */
  permissionType?: string;
  /** 当前权限状态 */
  status?: 'denied' | 'undetermined' | 'granted';
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * 验证错误上下文
 */
export interface ValidationErrorContext {
  /** 字段名 */
  field?: string;
  /** 验证规则 */
  rule?: string;
  /** 期望值 */
  expected?: unknown;
  /** 实际值 */
  actual?: unknown;
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * 业务错误上下文
 */
export interface BusinessErrorContext {
  /** 资源类型 */
  resourceType?: string;
  /** 资源 ID */
  resourceId?: string;
  /** 操作类型 */
  action?: string;
  /** 索引签名，允许任意额外属性 */
  [key: string]: unknown;
}

/**
 * 错误恢复建议
 */
export interface ErrorRecoveryAction {
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 操作类型 */
  type: 'retry' | 'navigate' | 'settings' | 'custom';
  /** 操作参数 */
  payload?: unknown;
}
