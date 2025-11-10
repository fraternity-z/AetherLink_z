/**
 * 🎤 语音输入对话框组件
 *
 * 功能：
 * - 显示录音状态和时长
 * - 提供停止和取消按钮
 * - 集成语音识别功能（设备端 + Whisper API）
 * - 显示识别进度和错误提示
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { logger } from '@/utils/logger';

interface VoiceInputDialogProps {
  visible: boolean;
  onClose: () => void;
  onTextRecognized: (text: string) => void;
  maxDuration?: number;
}

export function VoiceInputDialog({
  visible,
  onClose,
  onTextRecognized,
  maxDuration = 120,
}: VoiceInputDialogProps) {
  const theme = useTheme();
  const {
    isRecording,
    duration,
    audioUri,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useVoiceRecording(maxDuration, handleMaxDurationReached);

  // 语音识别 Hook
  const {
    isRecognizing,
    error: recognitionError,
    recognizeFromFile,
    clearError,
  } = useVoiceRecognition({ autoLoadSettings: true });

  // 识别提供商状态
  const [provider, setProvider] = useState<'native' | 'whisper'>('native');
  const [autoSend, setAutoSend] = useState(false);

  // 加载设置
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  // 加载语音设置
  const loadSettings = async () => {
    try {
      const sr = SettingsRepository();
      const savedProvider = (await sr.get<'native' | 'whisper'>(SettingKey.VoiceProvider)) || 'native';
      const savedAutoSend = (await sr.get<boolean>(SettingKey.VoiceAutoSend)) || false;

      setProvider(savedProvider);
      setAutoSend(savedAutoSend);

      logger.debug('[VoiceInputDialog] Settings loaded:', {
        provider: savedProvider,
        autoSend: savedAutoSend,
      });
    } catch (error) {
      logger.error('[VoiceInputDialog] Failed to load settings:', error);
    }
  };

  // 对话框打开时自动开始录音
  useEffect(() => {
    if (visible) {
      logger.debug('[VoiceInputDialog] Dialog opened, starting recording');
      startRecording().catch((error) => {
        logger.error('[VoiceInputDialog] Failed to start recording:', error);
        onClose();
      });
    }

    // 对话框关闭时确保录音已停止
    return () => {
      if (isRecording) {
        cancelRecording();
      }
    };
  }, [visible]);

  // 达到最大时长时的处理
  function handleMaxDurationReached() {
    logger.debug('[VoiceInputDialog] Max duration reached');
    handleStop();
  }

  // 停止录音并进行语音识别
  const handleStop = async () => {
    try {
      const uri = await stopRecording();
      if (!uri) {
        logger.warn('[VoiceInputDialog] No audio URI, cannot proceed');
        onClose();
        return;
      }

      logger.debug('[VoiceInputDialog] Recording stopped, URI:', uri);

      // 使用 Whisper API 识别（从音频文件）
      if (provider === 'whisper') {
        try {
          logger.debug('[VoiceInputDialog] Starting Whisper recognition');
          const text = await recognizeFromFile(uri);

          if (text && text.trim()) {
            logger.debug('[VoiceInputDialog] Recognition successful:', text);
            onTextRecognized(text);
          } else {
            logger.warn('[VoiceInputDialog] Recognition returned empty text');
          }

          onClose();
        } catch (error: any) {
          logger.error('[VoiceInputDialog] Recognition failed:', error);
          // 错误会显示在对话框中，不直接关闭
        }
      } else {
        // 设备端识别不支持从文件识别，显示提示
        logger.warn('[VoiceInputDialog] Native recognition does not support file recognition');
        onTextRecognized('[设备端识别仅支持实时识别，请在语音设置中切换到 Whisper API]');
        onClose();
      }
    } catch (error) {
      logger.error('[VoiceInputDialog] Stop recording failed:', error);
      onClose();
    }
  };

  // 取消录音
  const handleCancel = async () => {
    await cancelRecording();
    onClose();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleCancel} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          {isRecognizing ? '识别中...' : isRecording ? '录音中...' : '语音输入'}
        </Dialog.Title>
        <Dialog.Content>
          {/* 麦克风图标 */}
          <View style={styles.iconContainer}>
            {isRecognizing ? (
              <ActivityIndicator size={64} color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name="microphone"
                size={64}
                color={isRecording ? theme.colors.error : theme.colors.primary}
              />
            )}
          </View>

          {/* 录音时长显示 */}
          {isRecording && (
            <Text variant="headlineMedium" style={styles.timer}>
              {formatDuration(duration)} / {formatDuration(maxDuration)}
            </Text>
          )}

          {/* 提示文本 */}
          {isRecording && !isRecognizing && (
            <Text variant="bodyMedium" style={styles.hint}>
              正在录音，点击停止按钮完成录音
            </Text>
          )}

          {/* 识别中提示 */}
          {isRecognizing && (
            <Text variant="bodyMedium" style={styles.hint}>
              {provider === 'whisper' ? '正在使用 Whisper API 识别...' : '正在识别...'}
            </Text>
          )}

          {/* 错误提示 */}
          {recognitionError && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color={theme.colors.error}
              />
              <Text variant="bodyMedium" style={[styles.errorText, { color: theme.colors.error }]}>
                {recognitionError.getUserMessage()}
              </Text>
            </View>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button
            onPress={handleCancel}
            mode="text"
            disabled={isRecognizing}
          >
            取消
          </Button>
          <Button
            onPress={handleStop}
            mode="contained"
            disabled={!isRecording || isRecognizing}
            loading={isRecognizing}
          >
            {isRecognizing ? '识别中' : '停止录音'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  timer: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});
