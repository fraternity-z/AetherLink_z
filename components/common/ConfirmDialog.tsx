/**
 * ⚡ 现代化确认对话框组件
 *
 * 功能：
 * - 替代原生 Alert，提供更美观的 UI
 * - 支持圆角设计和流畅动画
 * - 支持自定义标题、内容、按钮
 * - 支持危险操作（destructive）样式
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { Icon } from '@rneui/themed';

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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  const handleButtonPress = (button: ConfirmDialogButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonColor = (style?: string) => {
    switch (style) {
      case 'destructive':
        return '#ef4444';
      case 'cancel':
        return theme.colors.onSurfaceVariant;
      default:
        return theme.colors.primary;
    }
  };

  const getIconConfig = () => {
    if (icon) return icon;

    // 根据按钮类型自动推断图标
    const hasDestructive = buttons.some(b => b.style === 'destructive');
    if (hasDestructive) {
      return {
        name: 'alert-circle',
        type: 'material-community',
        color: '#ef4444',
      };
    }

    return {
      name: 'information',
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
                    size={32}
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

              {/* 消息内容 */}
              <Text
                variant="bodyMedium"
                style={[
                  styles.message,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {message}
              </Text>

              {/* 按钮组 */}
              <View style={styles.buttonsContainer}>
                {buttons.map((button, index) => {
                  const isDestructive = button.style === 'destructive';
                  const isCancel = button.style === 'cancel';
                  const buttonColor = getButtonColor(button.style);

                  return (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.button,
                        {
                          backgroundColor: isDestructive
                            ? '#ef444415'
                            : isCancel
                            ? 'transparent'
                            : `${theme.colors.primary}15`,
                          borderWidth: isCancel ? 1 : 0,
                          borderColor: isCancel ? theme.colors.outlineVariant : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        },
                        index > 0 && { marginLeft: 12 },
                      ]}
                      onPress={() => handleButtonPress(button)}
                      android_ripple={{
                        color: `${buttonColor}30`,
                      }}
                    >
                      <Text
                        variant="bodyLarge"
                        style={{
                          color: buttonColor,
                          fontWeight: isDestructive ? '600' : '500',
                          textAlign: 'center',
                        }}
                      >
                        {button.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
