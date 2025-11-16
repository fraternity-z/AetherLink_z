/**
 * 应用错误类定义
 *
 * 统一的错误处理机制，提供：
 * - 完整的错误分类体系
 * - 用户友好的错误消息
 * - 错误上下文信息（用于调试和日志）
 * - 错误恢复建议
 */

import {
  ErrorCode,
  ErrorSeverity,
  ERROR_SEVERITY_MAP,
} from '@/utils/error-codes';
export { ErrorCode } from '@/utils/error-codes';
import type {
  IAppError,
  DatabaseErrorContext,
  AiErrorContext,
  NetworkErrorContext,
  PermissionErrorContext,
  ValidationErrorContext,
  BusinessErrorContext,
  ErrorRecoveryAction,
} from '@/types/error';

/**
 * 应用错误基类
 *
 * 所有应用错误的基础类，提供统一的错误处理接口
 */
export class AppError extends Error implements IAppError {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly cause?: Error;
  protected context: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      cause?: Error;
      retryable?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = ERROR_SEVERITY_MAP[code] || ErrorSeverity.MEDIUM;
    this.retryable = options?.retryable ?? false;
    this.timestamp = new Date();
    this.cause = options?.cause;
    this.context = options?.context || {};

    // 保持原始堆栈信息
    if (options?.cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }

    // 设置原型链（TypeScript 编译后的兼容性处理）
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * 获取错误上下文（用于日志）
   */
  getContext(): Record<string, unknown> {
    return {
      code: this.code,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      ...this.context,
    };
  }

  /**
   * 获取错误恢复建议
   */
  getRecoveryActions(): ErrorRecoveryAction[] {
    if (this.retryable) {
      return [
        {
          title: '重试',
          description: '点击重试按钮再次尝试操作',
          type: 'retry',
        },
      ];
    }
    return [];
  }
}

// ========== 数据库错误 ==========

/**
 * 数据库错误类
 *
 * 用于处理所有数据库相关的错误
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DB_ERR_QUERY,
    context?: DatabaseErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: code !== ErrorCode.DB_ERR_CONSTRAINT,
      context,
    });
    this.name = 'DatabaseError';
  }

  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.DB_ERR_CONNECTION:
        return '数据库连接失败，请重启应用后重试';
      case ErrorCode.DB_ERR_MIGRATION:
        return '数据库升级失败，请重新安装应用';
      case ErrorCode.DB_ERR_CONSTRAINT:
        return '数据冲突：该操作违反了数据完整性约束';
      default:
        return `数据库操作失败：${this.message}`;
    }
  }

  override getRecoveryActions(): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (this.code === ErrorCode.DB_ERR_CONNECTION) {
      actions.push({
        title: '重启应用',
        description: '完全关闭应用后重新打开',
        type: 'custom',
        payload: { action: 'restart' },
      });
    } else if (this.retryable) {
      actions.push({
        title: '重试',
        description: '点击重试按钮再次尝试操作',
        type: 'retry',
      });
    }

    return actions;
  }
}

// ========== AI 服务错误 ==========

/**
 * AI 服务错误类
 *
 * 用于处理所有 AI 服务相关的错误（保持与现有 AiError 的兼容性）
 */
export class AiError extends AppError {
  public readonly provider?: string;
  public readonly model?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AI_ERR_UNAVAILABLE,
    context?: AiErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: [
        ErrorCode.AI_ERR_UNAVAILABLE,
        ErrorCode.AI_ERR_RATE_LIMIT,
        ErrorCode.AI_ERR_STREAM,
      ].includes(code),
      context,
    });
    this.name = 'AiError';
    this.provider = context?.provider;
    this.model = context?.model;
  }

  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.AI_ERR_AUTH:
        return 'API 认证失败：请检查 API 密钥设置';
      case ErrorCode.AI_ERR_RATE_LIMIT:
        return 'API 请求频率过高：请稍后再试';
      case ErrorCode.AI_ERR_QUOTA:
        return 'API 配额已用尽：请检查账户余额';
      case ErrorCode.AI_ERR_MODEL_UNSUPPORTED:
        return `不支持的模型：${this.model || '未知模型'}`;
      case ErrorCode.AI_ERR_CONTENT_POLICY:
        return '内容违规：提示词包含违规内容，请修改后重试';
      case ErrorCode.AI_ERR_UNAVAILABLE:
        return 'AI 服务暂时不可用：请稍后重试';
      default:
        return `AI 服务错误：${this.message}`;
    }
  }

  override getRecoveryActions(): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (this.code === ErrorCode.AI_ERR_AUTH) {
      actions.push({
        title: '检查设置',
        description: '前往设置页面检查 API 密钥配置',
        type: 'settings',
        payload: { section: 'api-keys' },
      });
    } else if (this.retryable) {
      actions.push({
        title: '重试',
        description: '点击重试按钮再次发送消息',
        type: 'retry',
      });
    }

    return actions;
  }
}

/**
 * 图片生成错误类
 *
 * 用于处理图片生成过程中的各种错误情况
 *
 * @example
 * ```typescript
 * // 推荐方式（新）
 * throw new ImageGenerationError('图片生成失败', { provider: 'openai', model: 'dall-e-3' });
 *
 * // 兼容方式（旧）
 * throw new ImageGenerationError('图片生成失败', 'openai', 'dall-e-3');
 * ```
 */
export class ImageGenerationError extends AiError {
  constructor(
    message: string,
    providerOrContext?: string | AiErrorContext,
    modelOrCause?: string | Error,
    cause?: Error
  ) {
    // 支持两种构造函数签名：
    // 1. 新签名：(message, context?, cause?)
    // 2. 旧签名：(message, provider?, model?, cause?)
    let context: AiErrorContext | undefined;
    let actualCause: Error | undefined;

    if (typeof providerOrContext === 'string') {
      // 旧签名
      context = {
        provider: providerOrContext,
        model: typeof modelOrCause === 'string' ? modelOrCause : undefined,
      };
      actualCause = cause || (modelOrCause instanceof Error ? modelOrCause : undefined);
    } else {
      // 新签名
      context = providerOrContext;
      actualCause = modelOrCause instanceof Error ? modelOrCause : undefined;
    }

    super(
      message,
      ErrorCode.AI_ERR_IMAGE_GENERATION,
      context,
      actualCause
    );
    this.name = 'ImageGenerationError';
  }

  override getUserMessage(): string {
    if (this.message.includes('content policy') || this.message.includes('违规')) {
      return '图片生成失败：提示词包含违规内容，请修改后重试';
    }

    if (this.message.includes('rate limit') || this.message.includes('限流')) {
      return '图片生成失败：API 请求频率过高，请稍后再试';
    }

    if (this.message.includes('API key') || this.message.includes('密钥')) {
      return '图片生成失败：API 密钥无效，请检查设置';
    }

    if (this.message.includes('timeout') || this.message.includes('超时')) {
      return '图片生成失败：请求超时，请检查网络连接后重试';
    }

    if (this.message.includes('quota') || this.message.includes('配额')) {
      return '图片生成失败：API 配额已用尽，请检查账户余额';
    }

    return `图片生成失败：${this.message}`;
  }
}

/**
 * 图片模型解析错误类
 *
 * 当无法解析或识别图片生成模型时抛出
 *
 * @example
 * ```typescript
 * throw new ImageModelResolutionError('gpt-4', 'openai');
 * ```
 */
export class ImageModelResolutionError extends ImageGenerationError {
  constructor(modelId: string, provider?: string, cause?: Error) {
    const message = `无法解析图片生成模型: ${modelId}${provider ? ` (提供商: ${provider})` : ''}`;
    // 使用旧签名调用父类构造函数
    super(message, provider, modelId, cause);
    this.name = 'ImageModelResolutionError';
    // 注意：code 已在父类中设置为 AI_ERR_IMAGE_GENERATION
    // 如果需要更具体的错误码，可以在 getUserMessage() 中区分处理
  }

  override getUserMessage(): string {
    return `不支持的图片生成模型：${this.model}，请选择 DALL-E 3、GPT-Image-1 等专用图片生成模型`;
  }
}

// ========== 网络错误 ==========

/**
 * 网络请求错误类（统一的 API 错误）
 *
 * 用于处理所有网络请求相关的错误
 */
export class NetworkError extends AppError {
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.NET_ERR_REQUEST,
    context?: NetworkErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: [
        ErrorCode.NET_ERR_TIMEOUT,
        ErrorCode.NET_ERR_CONNECTION,
        ErrorCode.NET_ERR_SERVER,
      ].includes(code),
      context,
    });
    this.name = 'NetworkError';
    this.statusCode = context?.statusCode;
  }

  override getUserMessage(): string {
    if (this.statusCode === 401) {
      return 'API 认证失败：请检查 API 密钥设置';
    }

    if (this.statusCode === 403) {
      return 'API 访问被拒绝：请检查账户权限';
    }

    if (this.statusCode === 429) {
      return 'API 请求频率过高：请稍后再试';
    }

    if (this.statusCode && this.statusCode >= 500) {
      return 'AI 服务暂时不可用：请稍后重试';
    }

    switch (this.code) {
      case ErrorCode.NET_ERR_TIMEOUT:
        return '网络请求超时：请检查网络连接后重试';
      case ErrorCode.NET_ERR_CONNECTION:
        return '网络连接失败：请检查网络设置';
      case ErrorCode.NET_ERR_OFFLINE:
        return '网络不可用：请检查网络连接';
      default:
        return `网络请求失败${this.statusCode ? ` (${this.statusCode})` : ''}：${this.message}`;
    }
  }

  override getRecoveryActions(): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (this.code === ErrorCode.NET_ERR_OFFLINE) {
      actions.push({
        title: '检查网络',
        description: '请确保设备已连接到互联网',
        type: 'settings',
        payload: { section: 'network' },
      });
    } else if (this.retryable) {
      actions.push({
        title: '重试',
        description: '点击重试按钮再次尝试',
        type: 'retry',
      });
    }

    return actions;
  }
}

/**
 * 超时错误类
 */
export class TimeoutError extends NetworkError {
  constructor(message: string = '请求超时', context?: NetworkErrorContext, cause?: Error) {
    super(message, ErrorCode.NET_ERR_TIMEOUT, context, cause);
    this.name = 'TimeoutError';
  }
}

// ========== 验证错误 ==========

/**
 * 数据验证错误类
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.VAL_ERR_INVALID_DATA,
    context?: ValidationErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: false,
      context,
    });
    this.name = 'ValidationError';
    this.field = context?.field;
  }

  override getUserMessage(): string {
    const fieldName = this.field ? `"${this.field}"` : '数据';

    switch (this.code) {
      case ErrorCode.VAL_ERR_REQUIRED_FIELD:
        return `${fieldName} 为必填项，请填写后重试`;
      case ErrorCode.VAL_ERR_INVALID_FORMAT:
        return `${fieldName} 格式不正确，请检查后重试`;
      case ErrorCode.VAL_ERR_OUT_OF_RANGE:
        return `${fieldName} 超出允许范围，请修改后重试`;
      default:
        return `数据验证失败：${this.message}`;
    }
  }
}

// ========== 权限错误 ==========

/**
 * 权限错误类
 */
export class PermissionError extends AppError {
  public readonly permissionType?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PERM_ERR_DENIED,
    context?: PermissionErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: false,
      context,
    });
    this.name = 'PermissionError';
    this.permissionType = context?.permissionType;
  }

  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.PERM_ERR_MICROPHONE:
        return '麦克风权限被拒绝：请在设置中允许访问麦克风';
      case ErrorCode.PERM_ERR_STORAGE:
        return '存储权限被拒绝：请在设置中允许访问存储';
      case ErrorCode.PERM_ERR_CAMERA:
        return '相机权限被拒绝：请在设置中允许访问相机';
      default:
        return `权限被拒绝：${this.message}`;
    }
  }

  override getRecoveryActions(): ErrorRecoveryAction[] {
    return [
      {
        title: '前往设置',
        description: '在系统设置中授予应用所需权限',
        type: 'settings',
        payload: { section: 'permissions' },
      },
    ];
  }
}

// ========== 业务逻辑错误 ==========

/**
 * 业务逻辑错误类
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BIZ_ERR_BUSINESS_RULE,
    context?: BusinessErrorContext,
    cause?: Error
  ) {
    super(message, code, {
      cause,
      retryable: false,
      context,
    });
    this.name = 'BusinessError';
  }

  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.BIZ_ERR_NOT_FOUND:
        return '资源未找到：请刷新后重试';
      case ErrorCode.BIZ_ERR_ALREADY_EXISTS:
        return '资源已存在：请使用其他名称';
      case ErrorCode.BIZ_ERR_NOT_ALLOWED:
        return '操作不允许：当前状态下无法执行此操作';
      case ErrorCode.BIZ_ERR_CONFLICT:
        return '状态冲突：资源已被修改，请刷新后重试';
      default:
        return `业务错误：${this.message}`;
    }
  }
}

// ========== 未知错误 ==========

/**
 * 未知错误类
 */
export class UnknownError extends AppError {
  constructor(message: string = '发生未知错误', cause?: Error) {
    super(message, ErrorCode.UNKNOWN_ERR, {
      cause,
      retryable: true,
    });
    this.name = 'UnknownError';
  }

  override getUserMessage(): string {
    return `发生未知错误：${this.message}。如果问题持续，请联系技术支持`;
  }
}

// ========== 错误转换工具函数 ==========

/**
 * 将任意错误转换为 AppError
 *
 * 用于统一错误处理，确保所有错误都是 AppError 的实例
 *
 * @param error - 原始错误对象
 * @returns AppError 实例
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const appError = normalizeError(error);
 *   logger.error('操作失败', appError.getContext());
 *   throw appError;
 * }
 * ```
 */
export function normalizeError(error: unknown): AppError {
  // 如果已经是 AppError，直接返回
  if (error instanceof AppError) {
    return error;
  }

  // 如果是标准 Error 对象
  if (error instanceof Error) {
    // 检查是否包含特定关键字，自动分类
    const message = error.message.toLowerCase();

    // 数据库错误
    if (
      message.includes('sqlite') ||
      message.includes('database') ||
      message.includes('sql')
    ) {
      return new DatabaseError(error.message, ErrorCode.DB_ERR_QUERY, undefined, error);
    }

    // 网络错误
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout')
    ) {
      const code = message.includes('timeout')
        ? ErrorCode.NET_ERR_TIMEOUT
        : ErrorCode.NET_ERR_REQUEST;
      return new NetworkError(error.message, code, undefined, error);
    }

    // 权限错误
    if (message.includes('permission') || message.includes('denied')) {
      return new PermissionError(error.message, ErrorCode.PERM_ERR_DENIED, undefined, error);
    }

    // 验证错误
    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message, ErrorCode.VAL_ERR_INVALID_DATA, undefined, error);
    }

    // 默认为未知错误
    return new UnknownError(error.message, error);
  }

  // 如果是字符串
  if (typeof error === 'string') {
    return new UnknownError(error);
  }

  // 其他类型
  return new UnknownError('发生未知错误', new Error(String(error)));
}

/**
 * 检查错误是否可重试
 *
 * @param error - 错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  return false;
}

/**
 * 检查错误严重级别
 *
 * @param error - 错误对象
 * @returns 严重级别
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof AppError) {
    return error.severity;
  }
  return ErrorSeverity.MEDIUM;
}
