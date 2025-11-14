/**
 * ⚡ 现代化确认对话框组件（基于 UnifiedDialog）
 *
 * 用统一弹窗容器承载原 ConfirmDialog 的交互与 API，
 * 以确保所有弹窗风格一致。
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { UnifiedDialog, type UnifiedDialogAction } from './UnifiedDialog';

export interface ConfirmDialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: ConfirmDialogButton[];
  icon?: {
    name: string;
    type?: string;
    color?: string;
  };
  onDismiss?: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  buttons = [{ text: '确定', style: 'default' }],
  icon,
  onDismiss,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const getIconConfig = () => {
    if (icon) return icon;

    // 根据按钮类型自动推断图标
    const hasDestructive = buttons.some(b => b.style === 'destructive');
    if (hasDestructive) {
      return {
        name: 'alert-circle',
        color: '#ef4444',
      };
    }

    return {
      name: 'information',
      color: theme.colors.primary,
    };
  };

  const iconConfig = getIconConfig();
  const actions: UnifiedDialogAction[] = (buttons || []).map((b) => ({
    text: b.text,
    type: b.style === 'destructive' ? 'destructive' : b.style === 'cancel' ? 'cancel' : undefined,
    onPress: () => {
      b.onPress?.();
      onDismiss?.();
    },
  }));

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss || (() => {})}
      title={title}
      icon={iconConfig?.name as any}
      iconColor={iconConfig?.color}
      actions={actions}
    >
      <Text variant="bodyMedium" style={styles.messageText}>
        {message}
      </Text>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  messageText: {
    textAlign: 'center',
  },
});
