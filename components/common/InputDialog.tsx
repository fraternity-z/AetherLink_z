/**
 * ⚡ 现代化输入对话框组件（基于 UnifiedDialog）
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, TextInput as RNTextInput } from 'react-native';
import { useTheme, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { UnifiedDialog, type UnifiedDialogAction } from './UnifiedDialog';

interface InputDialogButton {
  text: string;
  onPress?: (value: string) => void | Promise<void>;
  style?: 'default' | 'cancel' | 'primary';
  disabled?: (value: string) => boolean;
}

interface InputDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  maxLength?: number;
  icon?: {
    name: string;
    type?: string;
    color?: string;
  };
  buttons?: InputDialogButton[];
  onDismiss?: () => void;
  validation?: (value: string) => { valid: boolean; error?: string };
}

export function InputDialog({
  visible,
  title,
  message,
  placeholder,
  defaultValue = '',
  multiline = false,
  maxLength,
  icon,
  buttons = [
    { text: '取消', style: 'cancel' },
    { text: '确定', style: 'primary' },
  ],
  onDismiss,
  validation,
}: InputDialogProps) {
  const theme = useTheme();
  const inputRef = useRef<RNTextInput>(null);

  const [inputValue, setInputValue] = useState(defaultValue);
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setInputValue(defaultValue);
      setError(undefined);
      setIsProcessing(false);

      // 延迟聚焦，确保弹窗动画完成后聚焦
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, defaultValue]);

  const handleButtonPress = async (button: InputDialogButton) => {
    if (isProcessing) return;

    // 取消按钮直接关闭
    if (button.style === 'cancel') {
      onDismiss?.();
      return;
    }

    // 验证输入
    if (validation) {
      const result = validation(inputValue);
      if (!result.valid) {
        setError(result.error || '输入无效');
        return;
      }
    }

    // 执行按钮操作
    if (button.onPress) {
      try {
        setIsProcessing(true);
        await button.onPress(inputValue);
        onDismiss?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
      } finally {
        setIsProcessing(false);
      }
    } else {
      onDismiss?.();
    }
  };

  const getIconConfig = () => {
    if (icon) return icon;

    return {
      name: 'pencil',color: theme.colors.primary,
    };
  };

  const iconConfig = getIconConfig();
  const actions: UnifiedDialogAction[] = (buttons || []).map((b) => ({
    text: isProcessing && b.style === 'primary' ? '处理中...' : b.text,
    type: b.style === 'primary' ? 'primary' : b.style === 'cancel' ? 'cancel' : undefined,
    disabled: b.disabled ? b.disabled(inputValue) || isProcessing : isProcessing,
    onPress: async () => {
      await handleButtonPress(b);
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
      {/* 描述消息 */}
      {message && (
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
      )}

      {/* 输入框 */}
      <TextInput
        ref={inputRef}
        mode="outlined"
        value={inputValue}
        onChangeText={(text) => {
          setInputValue(text);
          setError(undefined);
        }}
        placeholder={placeholder}
        multiline={multiline}
        maxLength={maxLength}
        error={!!error}
        style={[styles.input, multiline && styles.inputMultiline]}
        outlineStyle={{ borderRadius: 12 }}
        onSubmitEditing={() => {
          if (!multiline && buttons.length > 0) {
            const primaryButton = buttons.find((b) => b.style === 'primary') || buttons[buttons.length - 1];
            void handleButtonPress(primaryButton);
          }
        }}
        blurOnSubmit={!multiline}
        returnKeyType={multiline ? 'default' : 'done'}
      />

      {/* 错误提示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" color={theme.colors.error} size={16} />
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* 字数统计 */}
      {maxLength && (
        <Text variant="bodySmall" style={styles.charCount}>
          {inputValue.length} / {maxLength}
        </Text>
      )}

      {/* actions 交由 UnifiedDialog 渲染 */}
      {/* 通过 props 传递 */}
      {null}
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  inputMultiline: {
    minHeight: 100,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    marginLeft: 6,
    flex: 1,
  },
  charCount: {
    textAlign: 'right',
    marginBottom: 16,
    fontSize: 12,
  },
});
