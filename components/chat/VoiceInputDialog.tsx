/**
 * 🎤 语音输入对话框组件
 *
 * 功能：
 * - 显示录音状态和时长
 * - 提供停止和取消按钮
 * - 录音完成后将音频 URI 返回（待集成语音识别）
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
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

  // 停止录音（后续会集成语音识别）
  const handleStop = async () => {
    try {
      const uri = await stopRecording();
      if (!uri) {
        logger.warn('[VoiceInputDialog] No audio URI, cannot proceed');
        onClose();
        return;
      }

      logger.debug('[VoiceInputDialog] Recording stopped, URI:', uri);

      // TODO: 集成语音识别
      // 暂时显示提示信息
      onTextRecognized('[语音识别功能开发中...]');
      onClose();
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
        <Dialog.Title style={styles.title}>录音中...</Dialog.Title>
        <Dialog.Content>
          {/* 麦克风图标 */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="microphone"
              size={64}
              color={isRecording ? theme.colors.error : theme.colors.primary}
            />
          </View>

          {/* 录音时长显示 */}
          <Text variant="headlineMedium" style={styles.timer}>
            {formatDuration(duration)} / {formatDuration(maxDuration)}
          </Text>

          {/* 提示文本 */}
          {isRecording && (
            <Text variant="bodyMedium" style={styles.hint}>
              正在录音，点击停止按钮完成录音
            </Text>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleCancel} mode="text">
            取消
          </Button>
          <Button onPress={handleStop} mode="contained" disabled={!isRecording}>
            停止录音
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
});
