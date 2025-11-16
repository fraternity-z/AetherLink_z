/**
 * AI 服务错误处理工具
 *
 * 为 AI 服务方法提供统一的错误处理包装器，
 * 在底层错误的基础上添加 AI 相关的上下文信息
 */

import { AiError, NetworkError, normalizeError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * AI 服务错误上下文
 */
export interface AiServiceContext {
  /** 服务名称 */
  service: string;
  /** 方法名称 */
  method: string;
  /** AI 提供商 */
  provider?: string;
  /** 模型 ID */
  model?: string;
  /** 业务相关的上下文数据 */
  [key: string]: unknown;
}

/**
 * AI 服务方法错误处理包装器
 *
 * @param service - 服务名称（如 'AiClient', 'ModelDiscovery'）
 * @param method - 方法名称（如 'stream', 'generateImage'）
 * @param businessContext - 业务相关的上下文数据（如 { provider, model }）
 * @param fn - 要执行的异步函数
 * @returns 函数执行结果
 *
 * @example
 * ```typescript
 * export async function stream(opts: StreamOptions): Promise<void> {
 *   return withAiServiceContext('AiClient', 'stream', {
 *     provider: opts.provider,
 *     model: opts.model
 *   }, async () => {
 *     // 原有的方法实现
 *   });
 * }
 * ```
 */
export async function withAiServiceContext<T>(
  service: string,
  method: string,
  businessContext: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // 规范化错误
    const appError = normalizeError(error);

    // 构建增强的上下文信息
    const enhancedContext: AiServiceContext = {
      service,
      method,
      ...businessContext,
    };

    // 记录增强后的错误日志
    logger.error(
      `[${service}.${method}] AI 服务操作失败`,
      appError,
      enhancedContext
    );

    // 如果是 AiError 或 NetworkError，增强其上下文
    if (appError instanceof AiError || appError instanceof NetworkError) {
      // 创建新的错误实例，包含增强的上下文
      const enhancedError = new (appError.constructor as any)(
        appError.message,
        {
          ...appError.getContext(),
          ...enhancedContext,
        },
        appError
      );

      throw enhancedError;
    }

    // 其他类型的错误，直接抛出规范化后的错误
    throw appError;
  }
}

/**
 * 同步方法的 AI 服务错误处理包装器
 *
 * @param service - 服务名称
 * @param method - 方法名称
 * @param businessContext - 业务上下文
 * @param fn - 要执行的同步函数
 * @returns 函数执行结果
 */
export function withSyncAiServiceContext<T>(
  service: string,
  method: string,
  businessContext: Record<string, unknown>,
  fn: () => T
): T {
  try {
    return fn();
  } catch (error) {
    const appError = normalizeError(error);

    const enhancedContext: AiServiceContext = {
      service,
      method,
      ...businessContext,
    };

    logger.error(
      `[${service}.${method}] AI 服务操作失败`,
      appError,
      enhancedContext
    );

    if (appError instanceof AiError || appError instanceof NetworkError) {
      const enhancedError = new (appError.constructor as any)(
        appError.message,
        {
          ...appError.getContext(),
          ...enhancedContext,
        },
        appError
      );

      throw enhancedError;
    }

    throw appError;
  }
}

/**
 * API 调用错误处理包装器
 *
 * 专门用于包装 AI API 调用（如 OpenAI、Anthropic 等），
 * 自动处理网络错误、超时、限流等常见问题
 *
 * @param provider - AI 提供商名称
 * @param model - 模型 ID
 * @param operation - 操作类型（如 'stream', 'generateImage'）
 * @param fn - API 调用函数
 * @returns API 调用结果
 *
 * @example
 * ```typescript
 * const result = await withApiCallContext('openai', 'gpt-4', 'stream', async () => {
 *   return await streamText({ ... });
 * });
 * ```
 */
export async function withApiCallContext<T>(
  provider: string,
  model: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = normalizeError(error);

    const context = {
      provider,
      model,
      operation,
      timestamp: Date.now(),
    };

    // 分析错误类型并提供更友好的错误信息
    let enhancedMessage = appError.message;

    // 网络相关错误
    if (appError.message.includes('fetch') || appError.message.includes('network')) {
      enhancedMessage = `网络请求失败: ${appError.message}`;
    }
    // API 限流错误
    else if (appError.message.includes('rate limit') || appError.message.includes('429')) {
      enhancedMessage = `API 请求频率受限，请稍后重试`;
    }
    // API Key 错误
    else if (appError.message.includes('api key') || appError.message.includes('401')) {
      enhancedMessage = `API Key 验证失败，请检查配置`;
    }
    // 模型不支持错误
    else if (appError.message.includes('model') && appError.message.includes('not found')) {
      enhancedMessage = `模型 ${model} 不存在或不可用`;
    }

    logger.error(
      `[AI API] ${provider}/${model} ${operation} 调用失败`,
      appError,
      {
        ...context,
        originalMessage: appError.message,
        enhancedMessage,
      }
    );

    // 创建友好的错误
    if (appError instanceof AiError) {
      throw new AiError(
        enhancedMessage,
        {
          ...appError.getContext(),
          ...context,
        },
        appError
      );
    } else if (appError instanceof NetworkError) {
      throw new NetworkError(
        enhancedMessage,
        {
          ...appError.getContext(),
          ...context,
        },
        appError
      );
    } else {
      // 默认转换为 AiError
      throw new AiError(
        enhancedMessage,
        context,
        appError instanceof Error ? appError : undefined
      );
    }
  }
}
