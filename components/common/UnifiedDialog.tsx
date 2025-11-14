/**
 * 🎨 统一弹出框组件
 *
 * 提供统一的弹出框样式和行为：
 * - 白色圆角方框设计
 * - 流畅的动画效果
 * - 自适应深色/浅色模式
 * - 支持标题、内容、操作按钮
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
  ScrollView,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export interface UnifiedDialogAction {
  text: string;
  onPress: () => void;
  type?: 'primary' | 'destructive' | 'cancel';
  disabled?: boolean;
}

export interface UnifiedDialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  icon?: string;
  iconColor?: string;
  children?: React.ReactNode;
  actions?: UnifiedDialogAction[];
  showCloseButton?: boolean;
  maxHeight?: number | string;
}

export function UnifiedDialog({
  visible,
  onClose,
  title,
  icon,
  iconColor,
  children,
  actions = [],
  showCloseButton = false,
  maxHeight = '80%',
}: UnifiedDialogProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 打开动画
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
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
          toValue: 0,
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
  }, [opacityAnim, scaleAnim, visible]);

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
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
                  transform: [{ scale }],
                },
                typeof maxHeight === 'string' && maxHeight.endsWith('%')
                  ? { maxHeight: maxHeight as `${number}%` }
                  : { maxHeight: maxHeight as number },
              ]}
            >
              {/* 关闭按钮 - 固定在右上角 */}
              {showCloseButton && (
                <Pressable
                  style={({ pressed }) => [
                    styles.closeButton,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceVariant
                        : 'transparent',
                    },
                  ]}
                  onPress={onClose}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              )}

              {/* 标题区域 */}
              {(title || icon) && (
                <View style={styles.header}>
                  {icon && (
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: `${iconColor || theme.colors.primary}15`,
                        },
                      ]}
                    >
                      <Icon
                        name={icon as any}
                        size={32}
                        color={iconColor || theme.colors.primary}
                      />
                    </View>
                  )}
                  {title && (
                    <Text
                      variant="headlineSmall"
                      style={[
                        styles.title,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {title}
                    </Text>
                  )}
                </View>
              )}

              {/* 内容区域 */}
              {children && (
                <ScrollView
                  style={styles.contentScrollView}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  <View style={styles.content}>{children}</View>
                </ScrollView>
              )}

              {/* 操作按钮区域 */}
              {actions.length > 0 && (
                <View
                  style={[
                    styles.actions,
                    actions.length > 3 && styles.actionsVertical,
                  ]}
                >
                  {actions.map((action, index) => {
                    // 计算按钮间距：primary 按钮前间距更大，其他按钮间也要有足够间距
                    const marginLeft = index === 0 ? 0 : action.type === 'primary' ? 24 : 12;

                    return (
                      <Pressable
                        key={index}
                        style={({ pressed }) => [
                          styles.actionButton,
                          { marginLeft },
                          action.type === 'primary' && {
                            backgroundColor: pressed
                              ? theme.colors.primaryContainer
                              : theme.colors.primary,
                          },
                          action.type === 'destructive' && {
                            backgroundColor: pressed
                              ? '#FEE2E2'
                              : 'transparent',
                            borderWidth: 1,
                            borderColor: '#EF4444',
                          },
                          action.type === 'cancel' && {
                            backgroundColor: pressed
                              ? theme.colors.surfaceVariant
                              : 'transparent',
                            borderWidth: 1,
                            borderColor: theme.colors.outline,
                          },
                          !action.type && {
                            backgroundColor: pressed
                              ? theme.colors.surfaceVariant
                              : 'transparent',
                            borderWidth: 1,
                            borderColor: theme.colors.outline,
                          },
                          action.disabled && {
                            opacity: 0.5,
                          },
                          actions.length > 3 && styles.actionButtonVertical,
                        ]}
                        onPress={action.onPress}
                        disabled={action.disabled}
                        android_ripple={{
                          color:
                            action.type === 'primary'
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                        }}
                      >
                        <Text
                          variant="labelLarge"
                          style={[
                            styles.actionButtonText,
                            {
                              color:
                                action.type === 'primary'
                                  ? '#000000'
                                  : action.type === 'destructive'
                                  ? '#EF4444'
                                  : action.type === 'cancel'
                                  ? '#666666'
                                  : theme.colors.primary,
                            },
                          ]}
                        >
                          {action.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  contentScrollView: {
    maxHeight: 400,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 16,
    width: '100%',
    // 统一的子项间距，避免按钮文字紧贴在一起
    gap: 8,
  },
  actionsVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 80,
  },
  actionButtonVertical: {
    width: '100%',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
