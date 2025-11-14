/**
 * 语音识别 Hook
 *
 * 提供统一的语音识别接口，根据用户设置自动选择合适的识别服务
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { ProvidersRepository } from '@/storage/repositories/providers';
import {
  VoiceRecognitionError,
  VoiceRecognitionErrorCode,
  VoiceLanguage,
  VoiceProvider,
} from '@/services/voice/VoiceRecognition';
import { NativeRecognition } from '@/services/voice/NativeRecognition';
import { WhisperRecognition } from '@/services/voice/WhisperRecognition';

/**
 * 语音识别 Hook 返回值
 */
export interface UseVoiceRecognitionResult {
  /** 是否正在识别 */
  isRecognizing: boolean;
  /** 识别错误 */
  error: VoiceRecognitionError | null;
  /** 部分识别结果（实时反馈，仅设备端） */
  partialResult: string | null;
  /** 最终识别结果 */
  finalResult: string | null;
  /** 从音频文件识别文本（适用于 Whisper API） */
  recognizeFromFile: (audioUri: string) => Promise<string>;
  /** 开始实时识别（适用于设备端） */
  startRealtimeRecognition: () => Promise<void>;
  /** 停止实时识别 */
  stopRealtimeRecognition: () => Promise<string | null>;
  /** 取消识别 */
  cancel: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
  /** 清除结果 */
  clearResults: () => void;
}

/**
 * 语音识别 Hook 配置
 */
export interface UseVoiceRecognitionOptions {
  /** 是否自动加载设置 */
  autoLoadSettings?: boolean;
  /** 识别提供商（如果不提供，从设置中读取） */
  provider?: VoiceProvider;
  /** 识别语言（如果不提供，从设置中读取） */
  language?: VoiceLanguage;
  /** 是否显示部分结果 */
  showPartialResults?: boolean;
  /** 最大音频时长（秒） */
  maxDuration?: number;
}

/**
 * 语音识别 Hook
 *
 * @param options 配置选项
 * @returns Hook 返回值
 *
 * @example
 * ```typescript
 * const {
 *   isRecognizing,
 *   error,
 *   partialResult,
 *   finalResult,
 *   recognizeFromFile,
 *   startRealtimeRecognition,
 *   stopRealtimeRecognition,
 * } = useVoiceRecognition();
 *
 * // Whisper API 识别（从文件）
 * const handleRecordingComplete = async (audioUri: string) => {
 *   try {
 *     const text = await recognizeFromFile(audioUri);
 *     console.log('识别结果:', text);
 *   } catch (err) {
 *     console.error('识别失败:', err);
 *   }
 * };
 *
 * // 设备端实时识别
 * const handleStartRealtime = async () => {
 *   await startRealtimeRecognition();
 * };
 *
 * const handleStopRealtime = async () => {
 *   const text = await stopRealtimeRecognition();
 *   console.log('识别结果:', text);
 * };
 * ```
 */
export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionResult {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const [partialResult, setPartialResult] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);

  // 当前配置
  const [provider, setProvider] = useState<VoiceProvider>(options.provider || 'native');
  const [language, setLanguage] = useState<VoiceLanguage>(options.language || 'auto');
  const [showPartialResults, setShowPartialResults] = useState(options.showPartialResults ?? true);
  const [maxDuration, setMaxDuration] = useState(options.maxDuration || 120);

  // 识别服务实例
  const nativeServiceRef = useRef<NativeRecognition | null>(null);
  const whisperServiceRef = useRef<WhisperRecognition | null>(null);

  /**
   * 加载设置
   */
  useEffect(() => {
    if (options.autoLoadSettings !== false) {
      loadSettings();
    }
  }, [options.autoLoadSettings]);

  /**
   * 初始化设备端识别服务
   */
  useEffect(() => {
    if (!nativeServiceRef.current) {
      nativeServiceRef.current = new NativeRecognition();
    }

    return () => {
      // 清理资源
      if (nativeServiceRef.current) {
        nativeServiceRef.current.destroy();
        nativeServiceRef.current = null;
      }
    };
  }, []);

  /**
   * 从设置中加载配置
   */
  const loadSettings = async () => {
    try {
      const sr = SettingsRepository();
      const savedProvider = (await sr.get<VoiceProvider>(SettingKey.VoiceProvider)) || 'native';
      const savedLanguage = (await sr.get<VoiceLanguage>(SettingKey.VoiceLanguage)) || 'auto';
      const savedShowPartial = (await sr.get<boolean>(SettingKey.VoiceShowPartial)) ?? true;
      const savedMaxDuration = (await sr.get<number>(SettingKey.VoiceMaxDuration)) || 120;

      setProvider(savedProvider);
      setLanguage(savedLanguage);
      setShowPartialResults(savedShowPartial);
      setMaxDuration(savedMaxDuration);

      logger.debug('[useVoiceRecognition] Settings loaded:', {
        provider: savedProvider,
        language: savedLanguage,
        showPartial: savedShowPartial,
        maxDuration: savedMaxDuration,
      });
    } catch (err) {
      logger.error('[useVoiceRecognition] Failed to load settings:', err);
    }
  };

  /**
   * 获取 Whisper API 凭据与端点
   * - API Key 来自 providers:openai
   * - 端点优先使用自定义 baseURL；未设置时使用 OpenAI 默认地址
   */
  const getWhisperCredentials = async (): Promise<{ apiKey: string | null; endpoint: string }> => {
    try {
      const [apiKey, cfg] = await Promise.all([
        ProvidersRepository.getApiKey('openai'),
        ProvidersRepository.getConfig('openai'),
      ]);

      // 构造音频转写端点
      const defaultEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
      let endpoint = defaultEndpoint;

      if (cfg.baseURL && cfg.baseURL.trim().length > 0) {
        const base = cfg.baseURL.trim().replace(/\/$/, '');
        // 如果用户已经直接填了完整的音频转写地址，直接使用
        if (/audio\/(transcriptions|translations)(\b|\/|\?)/.test(base)) {
          endpoint = base;
        } else if (/\/v1(\b|\/)$/.test(cfg.baseURL.trim())) {
          endpoint = `${base}/audio/transcriptions`;
        } else if (/\/v1$/.test(base)) {
          endpoint = `${base}/audio/transcriptions`;
        } else {
          // 认为是根 baseURL，自动补上 /v1/audio/transcriptions
          endpoint = `${base}/v1/audio/transcriptions`;
        }
      }

      return { apiKey, endpoint };
    } catch (err) {
      logger.error('[useVoiceRecognition] Failed to get Whisper credentials:', err);
      return { apiKey: null, endpoint: 'https://api.openai.com/v1/audio/transcriptions' };
    }
  };

  /**
   * 从音频文件识别文本（Whisper API）
   */
  const recognizeFromFile = useCallback(
    async (audioUri: string): Promise<string> => {
      try {
        setIsRecognizing(true);
        setError(null);
        setPartialResult(null);
        setFinalResult(null);

        logger.debug('[useVoiceRecognition] Recognizing from file:', audioUri);

        // 获取 API Key 与端点
        const { apiKey, endpoint } = await getWhisperCredentials();
        if (!apiKey) {
          throw new VoiceRecognitionError(
            VoiceRecognitionErrorCode.INVALID_API_KEY,
            '未配置 OpenAI API Key，请前往设置页面配置'
          );
        }

        // 创建或更新 Whisper 服务实例
        if (!whisperServiceRef.current) {
          whisperServiceRef.current = new WhisperRecognition(apiKey);
          whisperServiceRef.current.setApiEndpoint(endpoint);
        } else {
          whisperServiceRef.current.setApiKey(apiKey);
          whisperServiceRef.current.setApiEndpoint(endpoint);
        }

        // 执行识别
        const result = await whisperServiceRef.current.recognizeFromFile(audioUri, {
          language,
          maxDuration,
        });

        setFinalResult(result.text);
        logger.debug('[useVoiceRecognition] Recognition completed:', result.text);

        return result.text;
      } catch (err: unknown) {
        const recognitionError =
          err instanceof VoiceRecognitionError
            ? err
            : new VoiceRecognitionError(
                VoiceRecognitionErrorCode.UNKNOWN,
                '识别失败',
                err
              );
        setError(recognitionError);
        logger.error('[useVoiceRecognition] Recognition failed:', recognitionError);
        throw recognitionError;
      } finally {
        setIsRecognizing(false);
      }
    },
    [language, maxDuration]
  );

  /**
   * 开始实时识别（设备端）
   */
  const startRealtimeRecognition = useCallback(async (): Promise<void> => {
    try {
      setIsRecognizing(true);
      setError(null);
      setPartialResult(null);
      setFinalResult(null);

      logger.debug('[useVoiceRecognition] Starting realtime recognition');

      if (!nativeServiceRef.current) {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE,
          '设备端识别服务未初始化'
        );
      }

      // 检查服务是否可用
      const available = await nativeServiceRef.current.isAvailable();
      if (!available) {
        throw new VoiceRecognitionError(
          VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE,
          '设备不支持语音识别功能'
        );
      }

      // 开始实时识别
      await nativeServiceRef.current.startRealtimeRecognition(
        {
          language,
          showPartialResults,
          maxDuration,
        },
        {
          onPartialResult: (text) => {
            logger.debug('[useVoiceRecognition] Partial result:', text);
            setPartialResult(text);
          },
          onFinalResult: (text) => {
            logger.debug('[useVoiceRecognition] Final result:', text);
            setFinalResult(text);
          },
          onError: (err) => {
            logger.error('[useVoiceRecognition] Recognition error:', err);
            setError(err);
            setIsRecognizing(false);
          },
        }
      );
    } catch (err: unknown) {
      const recognitionError =
        err instanceof VoiceRecognitionError
          ? err
          : new VoiceRecognitionError(VoiceRecognitionErrorCode.UNKNOWN, '启动识别失败', err);
      setError(recognitionError);
      setIsRecognizing(false);
      logger.error('[useVoiceRecognition] Start realtime recognition failed:', recognitionError);
      throw recognitionError;
    }
  }, [language, showPartialResults, maxDuration]);

  /**
   * 停止实时识别
   */
  const stopRealtimeRecognition = useCallback(async (): Promise<string | null> => {
    try {
      logger.debug('[useVoiceRecognition] Stopping realtime recognition');

      if (!nativeServiceRef.current) {
        return null;
      }

      await nativeServiceRef.current.stopRealtimeRecognition();
      setIsRecognizing(false);

      return finalResult;
    } catch (err: unknown) {
      const recognitionError =
        err instanceof VoiceRecognitionError
          ? err
          : new VoiceRecognitionError(VoiceRecognitionErrorCode.UNKNOWN, '停止识别失败', err);
      setError(recognitionError);
      logger.error('[useVoiceRecognition] Stop realtime recognition failed:', recognitionError);
      throw recognitionError;
    }
  }, [finalResult]);

  /**
   * 取消识别
   */
  const cancel = useCallback(async (): Promise<void> => {
    try {
      logger.debug('[useVoiceRecognition] Cancelling recognition');

      if (provider === 'native' && nativeServiceRef.current) {
        await nativeServiceRef.current.cancel();
      } else if (provider === 'whisper' && whisperServiceRef.current) {
        await whisperServiceRef.current.cancel();
      }

      setIsRecognizing(false);
      setPartialResult(null);
      setFinalResult(null);
    } catch (err) {
      logger.error('[useVoiceRecognition] Cancel failed:', err);
    }
  }, [provider]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 清除结果
   */
  const clearResults = useCallback(() => {
    setPartialResult(null);
    setFinalResult(null);
  }, []);

  return {
    isRecognizing,
    error,
    partialResult,
    finalResult,
    recognizeFromFile,
    startRealtimeRecognition,
    stopRealtimeRecognition,
    cancel,
    clearError,
    clearResults,
  };
}
