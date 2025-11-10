import { useState, useRef, useCallback } from 'react';
import AudioModule from 'expo-audio/build/AudioModule';
import { RecordingPresets } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio/build/AudioModule.types';
import { logger } from '@/utils/logger';

/**
 * 录音控制 Hook
 *
 * 提供录音开始、停止、取消等核心功能
 *
 * @param maxDuration 录音最大时长（秒）
 * @param onMaxDurationReached 达到最大时长时的回调
 */
export function useVoiceRecording(
  maxDuration: number = 120,
  onMaxDurationReached?: () => void
) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      logger.debug('[VoiceRecording] Starting...');

      // 创建录音对象并配置选项
      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);

      // 准备录音
      await recorder.prepareToRecordAsync();

      // 开始录音
      recorder.record();

      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      // 启动计时器
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;

          // 达到最大时长时自动停止
          if (newDuration >= maxDuration) {
            logger.debug('[VoiceRecording] Max duration reached, auto-stopping');
            stopRecording();
            onMaxDurationReached?.();
            return maxDuration;
          }

          return newDuration;
        });
      }, 1000) as unknown as number;

      logger.debug('[VoiceRecording] Started successfully');
    } catch (error) {
      logger.error('[VoiceRecording] Start failed:', error);
      throw new Error('录音失败，请检查麦克风权限');
    }
  }, [maxDuration, onMaxDurationReached]);

  /**
   * 停止录音
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recorderRef.current) {
        logger.warn('[VoiceRecording] No recording to stop');
        return null;
      }

      logger.debug('[VoiceRecording] Stopping...');

      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 停止录音
      await recorderRef.current.stop();
      const uri = recorderRef.current.uri;

      recorderRef.current = null;
      setIsRecording(false);
      setAudioUri(uri);

      logger.debug('[VoiceRecording] Stopped successfully, URI:', uri);
      return uri;
    } catch (error) {
      logger.error('[VoiceRecording] Stop failed:', error);
      setIsRecording(false);
      return null;
    }
  }, []);

  /**
   * 取消录音
   */
  const cancelRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recorderRef.current) {
        logger.warn('[VoiceRecording] No recording to cancel');
        return;
      }

      logger.debug('[VoiceRecording] Cancelling...');

      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 停止录音
      await recorderRef.current.stop();
      recorderRef.current = null;

      // 重置状态
      setIsRecording(false);
      setDuration(0);
      setAudioUri(null);

      logger.debug('[VoiceRecording] Cancelled successfully');
    } catch (error) {
      logger.error('[VoiceRecording] Cancel failed:', error);
      setIsRecording(false);
    }
  }, []);

  /**
   * 格式化时长为 MM:SS
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    duration,
    audioUri,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
}
