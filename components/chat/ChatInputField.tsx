/**
 * 聊天输入框组件
 *
 * 职责：
 * - 多行文本输入
 * - Enter 键处理（发送/换行）
 * - 输入长度限制
 * - 键盘优化
 */

import React from 'react';
import { Platform, TextInput as RNTextInput } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * ChatInputField 组件属性
 */
export interface ChatInputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  enterToSend: boolean;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * 聊天输入框组件
 */
export const ChatInputField = React.memo(function ChatInputField({
  value,
  onChangeText,
  onSend,
  enterToSend,
  placeholder,
  maxLength = 2000,
  disabled = false,
}: ChatInputFieldProps) {
  const theme = useTheme();

  // 生成动态占位符
  const dynamicPlaceholder = React.useMemo(() => {
    if (placeholder) return placeholder;

    if (Platform.OS === 'web') {
      return enterToSend
        ? "和助手说点什么… (Shift+Enter 换行)"
        : "和助手说点什么…";
    }

    return enterToSend
      ? "和助手说点什么… (Enter 发送)"
      : "和助手说点什么… (Enter 换行)";
  }, [placeholder, enterToSend]);

  /**
   * 键盘按键处理
   */
  const handleKeyPress = React.useCallback((e: any) => {
    const nativeEvent = e.nativeEvent as any;

    if (enterToSend && nativeEvent.key === 'Enter') {
      // Web: 允许 Shift+Enter 换行
      if (Platform.OS === 'web' && nativeEvent.shiftKey) {
        return;
      }

      // 阻止默认行为（换行）
      e.preventDefault?.();

      // 触发发送
      if (value.trim()) {
        onSend();
      }
    }
  }, [enterToSend, value, onSend]);

  /**
   * 提交处理（原生键盘"发送/完成"按钮）
   */
  const handleSubmitEditing = React.useCallback(() => {
    if (!enterToSend) return;
    if (value.trim()) {
      onSend();
    }
  }, [enterToSend, value, onSend]);

  return (
    <RNTextInput
      placeholder={dynamicPlaceholder}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      value={value}
      onChangeText={onChangeText}
      multiline
      maxLength={maxLength}
      editable={!disabled}
      className="text-[15px] leading-5 px-4 pt-3 pb-2 min-h-11 max-h-[120px]"
      style={{
        textAlignVertical: 'top',
        color: theme.colors.onSurface,
      }}
      // 键盘优化
      returnKeyType={enterToSend ? 'send' : 'default'}
      blurOnSubmit={false}
      onKeyPress={handleKeyPress}
      onSubmitEditing={handleSubmitEditing}
    />
  );
}, (prevProps, nextProps) => {
  // 优化渲染：仅当关键属性变化时重新渲染
  return (
    prevProps.value === nextProps.value &&
    prevProps.enterToSend === nextProps.enterToSend &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.maxLength === nextProps.maxLength
  );
});
