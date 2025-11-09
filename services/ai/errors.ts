/**
 * AI 服务错误类型定义
 *
 * 提供统一的错误处理机制，便于调试和用户提示
 */

/**
 * 基础 AI 错误类
 */
export class AiError extends Error {
  constructor(
    message: string,
    public provider?: string,
    public model?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AiError';

    // 保持原始堆栈信息
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * 图片生成错误类
 *
 * 用于处理图片生成过程中的各种错误情况
 *
 * @example
 * ```typescript
 * throw new ImageGenerationError(
 *   '图片生成失败：内容违规',
 *   'openai',
 *   'dall-e-3',
 *   originalError
 * );
 * ```
 */
export class ImageGenerationError extends AiError {
  constructor(
    message: string,
    provider?: string,
    model?: string,
    cause?: Error
  ) {
    super(message, provider, model, cause);
    this.name = 'ImageGenerationError';
  }

  /**
   * 获取用户友好的错误消息
   */
  override getUserMessage(): string {
    // 根据错误类型提供更友好的提示
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

    // 默认返回原始消息
    return `图片生成失败：${this.message}`;
  }
}

/**
 * 图片模型解析错误类
 *
 * 当无法解析或识别图片生成模型时抛出
 */
export class ImageModelResolutionError extends ImageGenerationError {
  constructor(modelId: string, provider?: string, cause?: Error) {
    const message = `无法解析图片生成模型: ${modelId}${provider ? ` (提供商: ${provider})` : ''}`;
    super(message, provider, modelId, cause);
    this.name = 'ImageModelResolutionError';
  }

  override getUserMessage(): string {
    return `不支持的图片生成模型：${this.model}，请选择 DALL-E 3、GPT-Image-1 等专用图片生成模型`;
  }
}

/**
 * 网络请求错误类
 */
export class NetworkError extends AiError {
  constructor(
    message: string,
    public statusCode?: number,
    provider?: string,
    model?: string,
    cause?: Error
  ) {
    super(message, provider, model, cause);
    this.name = 'NetworkError';
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

    if (this.statusCode === 500 || this.statusCode === 502 || this.statusCode === 503) {
      return 'AI 服务暂时不可用：请稍后重试';
    }

    return `网络请求失败${this.statusCode ? ` (${this.statusCode})` : ''}：${this.message}`;
  }
}

/**
 * 根据错误对象创建合适的错误类型
 */
export function createAiError(error: any, provider?: string, model?: string): AiError {
  // 如果已经是 AiError，直接返回
  if (error instanceof AiError) {
    return error;
  }

  // 解析 HTTP 错误
  if (error.status || error.statusCode) {
    const statusCode = error.status || error.statusCode;
    return new NetworkError(
      error.message || '网络请求失败',
      statusCode,
      provider,
      model,
      error
    );
  }

  // 解析超时错误
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return new NetworkError('请求超时', undefined, provider, model, error);
  }

  // 默认返回通用错误
  return new AiError(
    error.message || '未知错误',
    provider,
    model,
    error
  );
}
