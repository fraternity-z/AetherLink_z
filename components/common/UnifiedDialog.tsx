/**
 * 🎨 统一弹出框组件
 *
 * 提供统一的弹出框样式和行为：
 * - 现代化的圆角设计
 * - 优化的阴影和视觉层级
 * - 流畅的进出场动画
 * - 自适应深色/浅色模式
 */

import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export interface UnifiedDialogAction {
  text: string;
  onPress: () => void;
  type?: 'primary' | 'destructive' | 'cancel' | 'neutral';
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
  width?: number | string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function UnifiedDialog({
  visible,
  onClose,
  title,
  icon,
  iconColor,
  children,
  actions = [],
  showCloseButton = false,
  maxHeight = '85%',
  width = '90%',
}: UnifiedDialogProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 打开动画 - 使用弹性动画使其更有质感
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 关闭动画 - 快速淡出
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
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
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: opacityAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.6)', // 加深背景遮罩
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
                    width: width as any,
                    maxWidth: 440,
                  },
                  typeof maxHeight === 'string' && maxHeight.endsWith('%')
                    ? { maxHeight: maxHeight as any }
                    : { maxHeight: maxHeight as number },
                ]}
              >
                {/* 关闭按钮 - 优化触摸区域和位置 */}
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
                    hitSlop={8}
                  >
                    <Icon
                      name="close"
                      size={22}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </Pressable>
                )}

                {/* 标题区域 - 优化布局和间距 */}
                {(title || icon) && (
                  <View style={styles.header}>
                    {icon && (
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <Icon
                          name={icon as any}
                          size={32}
                          color={theme.colors.onSurface}
                        />
                      </View>
                    )}
                    {title && (
                      <Text
                        variant="headlineSmall"
                        style={[
                          styles.title,
                          { color: theme.colors.onSurface },
                          !icon && styles.titleNoIcon,
                        ]}
                      >
                        {title}
                      </Text>
                    )}
                  </View>
                )}

                {/* 内容区域 - 优化滚动体验 */}
                {children && (
                  <View style={styles.contentContainer}>
                     <ScrollView
                      style={styles.contentScrollView}
                      contentContainerStyle={styles.contentScrollContent}
                      showsVerticalScrollIndicator={true}
                      indicatorStyle={theme.dark ? 'white' : 'black'}
                    >
                      {children}
                    </ScrollView>
                  </View>
                )}

                {/* 操作按钮区域 - 现代化按钮样式 */}
                {actions.length > 0 && (
                  <View
                    style={[
                      styles.actions,
                      { borderTopColor: theme.colors.outlineVariant },
                      actions.length > 2 ? styles.actionsVertical : styles.actionsHorizontal,
                    ]}
                  >
                    {actions.map((action, index) => {
                      const isPrimary = action.type === 'primary';
                      const isDestructive = action.type === 'destructive';
                      const isCancel = action.type === 'cancel';
                      
                      return (
                        <Pressable
                          key={index}
                          style={({ pressed }) => [
                            styles.actionButton,
                            actions.length > 2 ? styles.actionButtonFull : styles.actionButtonFlex,
                            isPrimary && {
                                  backgroundColor: theme.colors.onSurface,
                              },
                              isDestructive && {
                                  backgroundColor: theme.colors.surfaceVariant,
                                  borderWidth: 1,
                                  borderColor: theme.colors.outline,
                              },
                            (isCancel || !action.type) && {
                                backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                                borderWidth: 1,
                                borderColor: theme.colors.outline,
                            },
                            action.disabled && styles.actionButtonDisabled,
                          ]}
                          onPress={action.onPress}
                          disabled={action.disabled}
                        >
                          <Text
                            variant="labelLarge"
                            style={[
                              styles.actionButtonText,
                              isPrimary && { color: theme.colors.surface },
                              isDestructive && { color: theme.colors.onSurface },
                              (isCancel || !action.type) && { color: theme.colors.onSurface },
                              action.disabled && { color: theme.colors.onSurfaceDisabled },
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    borderRadius: 28, // 增加圆角
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleNoIcon: {
    paddingTop: 8,
  },
  contentContainer: {
    flexShrink: 1, // 允许内容区域收缩
  },
  contentScrollView: {
    flexGrow: 0,
  },
  contentScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actions: {
    padding: 20,
    gap: 12,
    backgroundColor: 'transparent', // 按钮区域不需要额外背景色
  },
  actionsHorizontal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionsVertical: {
    flexDirection: 'column-reverse', // 垂直排列时，主要操作在下方（更易点击）或上方取决于设计习惯，这里遵循Material习惯
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100, // 胶囊型按钮
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonFlex: {
    flex: 1,
    maxWidth: 140, // 限制最大宽度
  },
  actionButtonFull: {
    width: '100%',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.25,
  },
});
