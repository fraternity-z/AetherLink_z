/**
 * 语音识别服务接口定义
 *
 * 提供统一的语音识别接口，支持多种识别提供商（设备端、云端等）
 */

/**
 * 语音识别配置
 */
export interface VoiceRecognitionConfig {
  /** 识别语言，'auto' 表示自动检测 */
  language: 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  /** 是否显示部分识别结果（实时反馈，仅设备端支持） */
  showPartialResults?: boolean;
  /** 最大音频时长（秒），用于 Whisper API */
  maxDuration?: number;
}

/**
 * 语音识别结果
 */
export interface VoiceRecognitionResult {
  /** 识别的文本内容 */
  text: string;
  /** 是否为最终结果（false 表示部分结果） */
  isFinal: boolean;
  /** 置信度 (0-1)，可选 */
  confidence?: number;
  /** 识别语言 */
  language?: string;
}

/**
 * 语音识别错误代码
 */
export enum VoiceRecognitionErrorCode {
  /** 权限被拒绝 */
  PERMISSION_DENIED = 'permission_denied',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 'service_unavailable',
  /** 音频格式错误 */
  INVALID_AUDIO = 'invalid_audio',
  /** 识别超时 */
  TIMEOUT = 'timeout',
  /** API 密钥无效 */
  INVALID_API_KEY = 'invalid_api_key',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 语音识别错误类
 */
export class VoiceRecognitionError extends Error {
  code: VoiceRecognitionErrorCode;
  originalError?: any;

  constructor(
    code: VoiceRecognitionErrorCode,
    message: string,
    originalError?: any
  ) {
    super(message);
    this.name = 'VoiceRecognitionError';
    this.code = code;
    this.originalError = originalError;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.code) {
      case VoiceRecognitionErrorCode.PERMISSION_DENIED:
        return '需要麦克风权限才能使用语音识别';
      case VoiceRecognitionErrorCode.NETWORK_ERROR:
        return '网络错误，请检查网络连接';
      case VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE:
        return '识别服务暂时不可用，请稍后重试';
      case VoiceRecognitionErrorCode.INVALID_AUDIO:
        return '音频格式不支持或文件损坏';
      case VoiceRecognitionErrorCode.TIMEOUT:
        return '识别超时，请重试';
      case VoiceRecognitionErrorCode.INVALID_API_KEY:
        return 'API 密钥无效，请检查配置';
      default:
        return '识别失败，请重试';
    }
  }
}

/**
 * 语音识别服务接口
 */
export interface IVoiceRecognitionService {
  /**
   * 从音频文件识别文本
   * @param audioUri 音频文件 URI（本地文件路径或 URL）
   * @param config 识别配置
   * @returns 识别结果
   * @throws {VoiceRecognitionError} 识别失败时抛出错误
   */
  recognizeFromFile(
    audioUri: string,
    config: VoiceRecognitionConfig
  ): Promise<VoiceRecognitionResult>;

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 取消当前识别（可选）
   */
  cancel?(): Promise<void>;
}

/**
 * 语音识别提供商类型
 */
export type VoiceProvider = 'native' | 'whisper';

/**
 * 语音识别语言类型
 */
export type VoiceLanguage = 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
