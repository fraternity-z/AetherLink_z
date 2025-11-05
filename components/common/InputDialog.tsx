/**
 * ⚡ 现代化输入对话框组件
 *
 * 功能：
 * - 优雅的输入弹窗，用于重命名、编辑等场景
 * - 支持圆角设计和流畅动画
 * - 支持单/多行输入
 * - 支持输入验证和提示
 * - 自动聚焦和键盘优化
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { useTheme, Text, TextInput } from 'react-native-paper';
import { Icon } from '@rneui/themed';

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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<RNTextInput>(null);

  const [inputValue, setInputValue] = useState(defaultValue);
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setInputValue(defaultValue);
      setError(undefined);
      setIsProcessing(false);

      // 打开动画
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // 延迟聚焦，确保动画流畅
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    } else {
      // 关闭动画
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
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

  const getButtonColor = (style?: string) => {
    switch (style) {
      case 'primary':
        return theme.colors.primary;
      case 'cancel':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  const getIconConfig = () => {
    if (icon) return icon;

    return {
      name: 'pencil',
      type: 'material-community',
      color: theme.colors.primary,
    };
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View
            style={[
              styles.overlay,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: opacityAnim,
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.dialogContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* 图标 */}
                {iconConfig && (
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: `${iconConfig.color}15`,
                      },
                    ]}
                  >
                    <Icon
                      name={iconConfig.name}
                      type={iconConfig.type as any}
                      color={iconConfig.color}
                      size={28}
                    />
                  </View>
                )}

                {/* 标题 */}
                <Text
                  variant="titleLarge"
                  style={[
                    styles.title,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {title}
                </Text>

                {/* 描述消息 */}
                {message && (
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.message,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
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
                  style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                  ]}
                  outlineStyle={{
                    borderRadius: 12,
                  }}
                  onSubmitEditing={() => {
                    if (!multiline && buttons.length > 0) {
                      const primaryButton = buttons.find(b => b.style === 'primary') || buttons[buttons.length - 1];
                      handleButtonPress(primaryButton);
                    }
                  }}
                  blurOnSubmit={!multiline}
                  returnKeyType={multiline ? 'default' : 'done'}
                />

                {/* 错误提示 */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Icon
                      name="alert-circle"
                      type="material-community"
                      color={theme.colors.error}
                      size={16}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.errorText,
                        { color: theme.colors.error },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                {/* 字数统计 */}
                {maxLength && (
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.charCount,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {inputValue.length} / {maxLength}
                  </Text>
                )}

                {/* 按钮组 */}
                <View style={styles.buttonsContainer}>
                  {buttons.map((button, index) => {
                    const isPrimary = button.style === 'primary';
                    const isCancel = button.style === 'cancel';
                    const buttonColor = getButtonColor(button.style);
                    const isDisabled = button.disabled ? button.disabled(inputValue) : false;

                    return (
                      <Pressable
                        key={index}
                        style={({ pressed }) => [
                          styles.button,
                          {
                            backgroundColor: isPrimary
                              ? theme.colors.primary
                              : isCancel
                              ? 'transparent'
                              : `${theme.colors.primary}15`,
                            borderWidth: isCancel ? 1 : 0,
                            borderColor: isCancel ? theme.colors.outlineVariant : 'transparent',
                            opacity: pressed ? 0.7 : isDisabled ? 0.4 : 1,
                          },
                          index > 0 && { marginLeft: 12 },
                        ]}
                        onPress={() => handleButtonPress(button)}
                        disabled={isDisabled || isProcessing}
                        android_ripple={{
                          color: `${buttonColor}30`,
                        }}
                      >
                        <Text
                          variant="bodyLarge"
                          style={{
                            color: isPrimary ? theme.colors.onPrimary : buttonColor,
                            fontWeight: isPrimary ? '600' : '500',
                            textAlign: 'center',
                          }}
                        >
                          {isProcessing && isPrimary ? '处理中...' : button.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
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
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
