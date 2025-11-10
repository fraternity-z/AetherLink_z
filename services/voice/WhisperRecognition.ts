/**
 * Whisper API 语音识别服务
 *
 * 使用 OpenAI Whisper API 进行高精度音频转文字
 * API 文档: https://platform.openai.com/docs/api-reference/audio
 */

import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';
import {
  IVoiceRecognitionService,
  VoiceRecognitionConfig,
  VoiceRecognitionResult,
  VoiceRecognitionError,
  VoiceRecognitionErrorCode,
} from './VoiceRecognition';

/**
 * Whisper API 响应格式
 */
interface WhisperAPIResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

/**
 * Whisper API 错误响应
 */
interface WhisperAPIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * Whisper API 语音识别服务实现
 */
export class WhisperRecognition implements IVoiceRecognitionService {
  private apiKey: string;
  private apiEndpoint: string = 'https://api.openai.com/v1/audio/transcriptions';
  private model: string = 'whisper-1';
  private abortController: AbortController | null = null;

  constructor(apiKey: string, customEndpoint?: string) {
    this.apiKey = apiKey;
    if (customEndpoint) {
      this.apiEndpoint = customEndpoint;
    }
  }

  /**
   * 从音频文件识别文本
   */
  async recognizeFromFile(
    audioUri: string,
    config: VoiceRecognitionConfig
  ): Promise<VoiceRecognitionResult> {
    if (!this.apiKey) {
      throw new VoiceRecognitionError(
        VoiceRecognitionErrorCode.INVALID_API_KEY,
        'OpenAI API Key 未配置'
      );
    }

    try {
      logger.debug('[WhisperRecognition] Starting recognition for:', audioUri);

      // 读取音频文件信息
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.INVALID_AUDIO,
          '音频文件不存在'
        );
      }

      // 检查文件大小（Whisper API 限制 25 MB）
      const maxSize = 25 * 1024 * 1024; // 25 MB
      if (fileInfo.size && fileInfo.size > maxSize) {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.INVALID_AUDIO,
          '音频文件过大，最大支持 25 MB'
        );
      }

      // 创建 FormData
      const formData = new FormData();

      // 添加音频文件
      // 从 URI 中提取文件扩展名
      const extension = audioUri.split('.').pop()?.toLowerCase() || 'caf';
      const mimeType = this.getMimeType(extension);

      formData.append('file', {
        uri: audioUri,
        type: mimeType,
        name: `audio.${extension}`,
      } as any);

      // 添加模型参数
      formData.append('model', this.model);

      // 添加语言参数（如果不是 auto）
      if (config.language !== 'auto') {
        // 转换为 ISO-639-1 格式（zh-CN -> zh, en-US -> en）
        const languageCode = config.language.split('-')[0];
        formData.append('language', languageCode);
      }

      // 设置响应格式为 verbose_json 以获取更多信息
      formData.append('response_format', 'verbose_json');

      // 创建 AbortController 用于取消请求
      this.abortController = new AbortController();

      // 发送请求
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: this.abortController.signal,
      });

      this.abortController = null;

      // 处理响应
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: WhisperAPIResponse = await response.json();

      logger.debug('[WhisperRecognition] Recognition successful:', {
        text: result.text.substring(0, 50),
        language: result.language,
        duration: result.duration,
      });

      return {
        text: result.text.trim(),
        isFinal: true,
        confidence: 1.0, // Whisper 不提供置信度，默认为 1.0
        language: result.language,
      };
    } catch (error: any) {
      // 处理取消请求
      if (error.name === 'AbortError') {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.UNKNOWN,
          '识别已取消'
        );
      }

      // 处理网络错误
      if (error.message?.includes('Network')) {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.NETWORK_ERROR,
          '网络连接失败',
          error
        );
      }

      // 如果已经是 VoiceRecognitionError，直接抛出
      if (error instanceof VoiceRecognitionError) {
        throw error;
      }

      // 其他未知错误
      logger.error('[WhisperRecognition] Recognition failed:', error);
      throw new VoiceRecognitionError(
        VoiceRecognitionErrorCode.UNKNOWN,
        '识别失败',
        error
      );
    }
  }

  /**
   * 处理 API 错误响应
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = '识别失败';
    let errorCode = VoiceRecognitionErrorCode.UNKNOWN;

    try {
      const errorData: WhisperAPIError = await response.json();
      errorMessage = errorData.error.message || errorMessage;

      // 根据 HTTP 状态码和错误类型确定错误代码
      if (response.status === 401) {
        errorCode = VoiceRecognitionErrorCode.INVALID_API_KEY;
        errorMessage = 'API 密钥无效';
      } else if (response.status === 413) {
        errorCode = VoiceRecognitionErrorCode.INVALID_AUDIO;
        errorMessage = '音频文件过大';
      } else if (response.status === 400) {
        if (errorMessage.toLowerCase().includes('audio')) {
          errorCode = VoiceRecognitionErrorCode.INVALID_AUDIO;
        }
      } else if (response.status === 429) {
        errorCode = VoiceRecognitionErrorCode.TIMEOUT;
        errorMessage = '请求过于频繁，请稍后重试';
      } else if (response.status >= 500) {
        errorCode = VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE;
        errorMessage = '服务暂时不可用';
      }
    } catch {
      // 如果解析错误响应失败，使用默认错误信息
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new VoiceRecognitionError(errorCode, errorMessage);
  }

  /**
   * 根据文件扩展名获取 MIME 类型
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
      caf: 'audio/x-caf', // iOS 默认格式
      aac: 'audio/aac',
      ogg: 'audio/ogg',
    };

    return mimeTypes[extension] || 'audio/mpeg';
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    // 检查是否配置了 API Key
    if (!this.apiKey) {
      logger.warn('[WhisperRecognition] API Key not configured');
      return false;
    }

    // TODO: 可以添加简单的 API 健康检查
    return true;
  }

  /**
   * 取消当前识别请求
   */
  async cancel(): Promise<void> {
    if (this.abortController) {
      logger.debug('[WhisperRecognition] Cancelling request');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 更新 API Key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 更新 API 端点（用于自定义部署或代理）
   */
  setApiEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }
}
