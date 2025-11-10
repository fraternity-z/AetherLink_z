/**
 * 🎤 麦克风按钮组件
 *
 * 功能：
 * - 点击打开语音输入对话框
 * - 自动检查和请求麦克风权限
 * - 权限被拒时禁用按钮
 */

import React, { useState, useEffect } from 'react';
import { IconButton, useTheme } from 'react-native-paper';
import { useMicrophonePermission } from '@/hooks/use-microphone-permission';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { VoiceInputDialog } from './VoiceInputDialog';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { logger } from '@/utils/logger';

interface VoiceInputButtonProps {
  onTextRecognized: (text: string) => void;
}

export function VoiceInputButton({ onTextRecognized }: VoiceInputButtonProps) {
  const theme = useTheme();
  const { confirm } = useConfirmDialog();
  const { permissionStatus, isGranted, isDenied, requestPermission, openSettings } = useMicrophonePermission();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [maxDuration, setMaxDuration] = useState(120);

  // 加载录音最大时长设置
  useEffect(() => {
    (async () => {
      const sr = SettingsRepository();
      const duration = (await sr.get<number>(SettingKey.VoiceMaxDuration)) || 120;
      setMaxDuration(duration);
    })();
  }, []);

  // 处理按钮点击
  const handlePress = async () => {
    try {
      // 检查权限
      if (!isGranted) {
        logger.debug('[VoiceInputButton] Requesting microphone permission');
        const granted = await requestPermission();

        if (!granted) {
          logger.warn('[VoiceInputButton] Permission denied');

          // 显示权限说明对话框
          confirm({
            title: '需要麦克风权限',
            message: '语音输入功能需要访问您的麦克风。请在设置中开启麦克风权限。',
            buttons: [
              { text: '取消', style: 'cancel' },
              {
                text: '去设置',
                onPress: openSettings,
              },
            ],
          });
          return;
        }
      }

      // 打开录音对话框
      logger.debug('[VoiceInputButton] Opening voice input dialog');
      setDialogVisible(true);
    } catch (error) {
      logger.error('[VoiceInputButton] Error:', error);
    }
  };

  // 处理对话框关闭
  const handleDialogClose = () => {
    setDialogVisible(false);
  };

  // 处理识别完成的文本
  const handleTextRecognized = (text: string) => {
    logger.debug('[VoiceInputButton] Text recognized:', text);
    onTextRecognized(text);
  };

  return (
    <>
      <IconButton
        icon="microphone"
        size={24}
        onPress={handlePress}
        disabled={isDenied}
        iconColor={isDenied ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
      />

      <VoiceInputDialog
        visible={dialogVisible}
        onClose={handleDialogClose}
        onTextRecognized={handleTextRecognized}
        maxDuration={maxDuration}
      />
    </>
  );
}
