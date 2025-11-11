/**
 * 设备端语音识别服务
 *
 * 使用 @react-native-voice/voice 进行本地实时语音识别
 *
 * 注意：此服务仅支持实时识别，必须在录音时同步进行识别，
 * 无法识别已录制的音频文件。
 */

import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { Platform, NativeModules } from 'react-native';
import { logger } from '@/utils/logger';
import {
  IVoiceRecognitionService,
  VoiceRecognitionConfig,
  VoiceRecognitionResult,
  VoiceRecognitionError,
  VoiceRecognitionErrorCode,
} from './VoiceRecognition';

/**
 * 实时识别回调
 */
export interface RealtimeRecognitionCallbacks {
  /** 部分结果回调 */
  onPartialResult?: (text: string) => void;
  /** 最终结果回调 */
  onFinalResult?: (text: string) => void;
  /** 错误回调 */
  onError?: (error: VoiceRecognitionError) => void;
}

/**
 * 设备端语音识别服务实现
 */
export class NativeRecognition implements IVoiceRecognitionService {
  private isRecognizing: boolean = false;
  private callbacks: RealtimeRecognitionCallbacks | null = null;
  private config: VoiceRecognitionConfig | null = null;

  constructor() {
    // 初始化事件监听器
    this.initializeEventListeners();
  }

  /**
   * 初始化 Voice 事件监听器
   */
  private initializeEventListeners() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    Voice.onSpeechError = this.onSpeechError;
  }

  /**
   * 语音开始事件
   */
  private onSpeechStart = () => {
    logger.debug('[NativeRecognition] Speech started');
  };

  /**
   * 语音结束事件
   */
  private onSpeechEnd = () => {
    logger.debug('[NativeRecognition] Speech ended');
  };

  /**
   * 最终识别结果事件
   */
  private onSpeechResults = (e: SpeechResultsEvent) => {
    logger.debug('[NativeRecognition] Final results:', e.value);
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      this.callbacks?.onFinalResult?.(text);
    }
  };

  /**
   * 部分识别结果事件
   */
  private onSpeechPartialResults = (e: SpeechResultsEvent) => {
    logger.debug('[NativeRecognition] Partial results:', e.value);
    if (e.value && e.value.length > 0 && this.config?.showPartialResults) {
      const text = e.value[0];
      this.callbacks?.onPartialResult?.(text);
    }
  };

  /**
   * 识别错误事件
   */
  private onSpeechError = (e: SpeechErrorEvent) => {
    logger.error('[NativeRecognition] Error:', e.error);

    let errorCode = VoiceRecognitionErrorCode.UNKNOWN;
    let message = '识别失败';

    if (e.error?.message) {
      const errorMsg = e.error.message.toLowerCase();
      if (errorMsg.includes('permission')) {
        errorCode = VoiceRecognitionErrorCode.PERMISSION_DENIED;
        message = '麦克风权限被拒绝';
      } else if (errorMsg.includes('network')) {
        errorCode = VoiceRecognitionErrorCode.NETWORK_ERROR;
        message = '网络错误';
      } else if (errorMsg.includes('timeout')) {
        errorCode = VoiceRecognitionErrorCode.TIMEOUT;
        message = '识别超时';
      }
    }

    const error = new VoiceRecognitionError(errorCode, message, e.error);
    this.callbacks?.onError?.(error);
  };

  /**
   * 开始实时识别
   *
   * @param config 识别配置
   * @param callbacks 回调函数
   */
  async startRealtimeRecognition(
    config: VoiceRecognitionConfig,
    callbacks: RealtimeRecognitionCallbacks
  ): Promise<void> {
    if (this.isRecognizing) {
      throw new VoiceRecognitionError(
        VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE,
        '识别服务正在运行中'
      );
    }

    try {
      this.config = config;
      this.callbacks = callbacks;
      this.isRecognizing = true;

      // 将语言代码转换为 Voice 支持的格式
      const locale = this.convertLanguageCode(config.language);

      logger.debug('[NativeRecognition] Starting recognition with locale:', locale);

      await Voice.start(locale);
    } catch (error) {
      this.isRecognizing = false;
      logger.error('[NativeRecognition] Start failed:', error);
      throw new VoiceRecognitionError(
        VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE,
        '启动识别服务失败',
        error
      );
    }
  }

  /**
   * 停止实时识别
   */
  async stopRealtimeRecognition(): Promise<void> {
    if (!this.isRecognizing) {
      logger.warn('[NativeRecognition] No recognition to stop');
      return;
    }

    try {
      logger.debug('[NativeRecognition] Stopping recognition');
      await Voice.stop();
      this.isRecognizing = false;
      this.callbacks = null;
      this.config = null;
    } catch (error) {
      logger.error('[NativeRecognition] Stop failed:', error);
      throw new VoiceRecognitionError(
        VoiceRecognitionErrorCode.UNKNOWN,
        '停止识别服务失败',
        error
      );
    }
  }

  /**
   * 取消识别
   */
  async cancel(): Promise<void> {
    if (!this.isRecognizing) {
      return;
    }

    try {
      logger.debug('[NativeRecognition] Cancelling recognition');
      await Voice.cancel();
      this.isRecognizing = false;
      this.callbacks = null;
      this.config = null;
    } catch (error) {
      logger.error('[NativeRecognition] Cancel failed:', error);
    }
  }

  /**
   * 从音频文件识别文本
   *
   * 注意：设备端识别不支持此功能，会抛出错误
   */
  async recognizeFromFile(
    _audioUri: string,
    _config: VoiceRecognitionConfig
  ): Promise<VoiceRecognitionResult> {
    throw new VoiceRecognitionError(
      VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE,
      '设备端识别仅支持实时识别，不支持识别已录制的音频文件。请使用 Whisper API 或使用 startRealtimeRecognition 方法进行实时识别。'
    );
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 仅在原生 iOS/Android 环境可用
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        logger.debug('[NativeRecognition] Unsupported platform:', Platform.OS);
        return false;
      }

      // 原生模块是否已正确链接/打包
      const hasNativeModule = (NativeModules as any)?.RCTVoice != null;
      if (!hasNativeModule) {
        logger.debug('[NativeRecognition] RCTVoice native module not found');
        return false;
      }

      const available = await (Voice as any).isAvailable();
      logger.debug('[NativeRecognition] Service available:', available);
      // 兼容历史实现：可能返回 boolean 或 1/0
      return available === true || available === 1;
    } catch (error) {
      logger.error('[NativeRecognition] Availability check failed:', error);
      return false;
    }
  }

  /**
   * 转换语言代码为 Voice 支持的格式
   */
  private convertLanguageCode(language: string): string {
    // Voice 库使用 locale 格式，例如 'zh-CN', 'en-US'
    // 如果是 'auto'，使用设备默认语言
    if (language === 'auto') {
      // Voice 会使用设备的默认语言
      return '';
    }
    return language;
  }

  /**
   * 销毁服务，清理资源
   */
  async destroy(): Promise<void> {
    await this.cancel();

    // 移除事件监听器
    Voice.destroy().then(() => {
      logger.debug('[NativeRecognition] Service destroyed');
    });
  }
}
