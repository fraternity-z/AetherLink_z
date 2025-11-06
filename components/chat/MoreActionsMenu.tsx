/**
 * ⚡ 更多功能底部菜单组件
 *
 * 功能：
 * - 从底部上拉的更多操作菜单
 * - 支持清除对话、导出对话等功能
 * - 流畅的动画效果和手势操作
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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

interface MoreActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  conversationId: string | null;
}

export function MoreActionsMenu({
  visible,
  onClose,
  onClearConversation,
  conversationId,
}: MoreActionsMenuProps) {
  const theme = useTheme();
  const { confirmAction, alert } = useConfirmDialog();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 打开动画
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
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
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClearConversation = () => {
    if (!conversationId) {
      alert('提示', '当前没有对话需要清除');
      onClose();
      return;
    }

    confirmAction(
      '清除对话',
      '确定要清除当前话题的所有消息吗？此操作不可恢复。',
      () => {
        onClose();
        // 延迟执行，让菜单先关闭
        setTimeout(() => {
          onClearConversation();
        }, 300);
      },
      {
        confirmText: '确定清除',
        cancelText: '取消',
        destructive: true,
      }
    );
  };

  const menuItems = [
    {
      id: 'clear',
      title: '清除对话',
      description: '清空当前话题的所有消息',
      icon: 'delete-sweep',
      iconType: 'material-community',
      color: '#ef4444',
      onPress: handleClearConversation,
      disabled: !conversationId,
    },
    // 可以在这里添加更多功能
    // {
    //   id: 'export',
    //   title: '导出对话',
    //   description: '将对话导出为文本或Markdown',
    //   icon: 'export',
    //   iconType: 'material-community',
    //   color: '#3b82f6',
    //   onPress: () => {
    //     onClose();
    //     // TODO: 实现导出功能
    //   },
    //   disabled: !conversationId,
    // },
  ];

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
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
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  backgroundColor: theme.colors.surface,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* 拖动指示器 */}
              <View style={styles.dragIndicatorContainer}>
                <View
                  style={[
                    styles.dragIndicator,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              </View>

              {/* 标题 */}
              <View style={styles.headerContainer}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                >
                  更多功能
                </Text>
              </View>

              {/* 菜单项 */}
              <View style={styles.menuItemsContainer}>
                {menuItems.map((item, index) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.menuItem,
                      {
                        backgroundColor: pressed
                          ? theme.colors.surfaceVariant
                          : 'transparent',
                        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: theme.colors.outlineVariant,
                        opacity: item.disabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={item.onPress}
                    disabled={item.disabled}
                    android_ripple={{
                      color: theme.colors.surfaceVariant,
                    }}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: `${item.color}15`,
                        },
                      ]}
                    >
                      <Icon
                        name={item.icon as any}color={item.color}
                        size={24}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="bodyLarge"
                        style={{
                          color: theme.colors.onSurface,
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                        }}
                      >
                        {item.description}
                      </Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      color={theme.colors.onSurfaceVariant}
                      size={24}
                    />
                  </Pressable>
                ))}
              </View>

              {/* 取消按钮 */}
              <View style={styles.cancelContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceVariant
                        : theme.colors.surface,
                    },
                  ]}
                  onPress={onClose}
                  android_ripple={{
                    color: theme.colors.surfaceVariant,
                  }}
                >
                  <Text
                    variant="bodyLarge"
                    style={{
                      color: theme.colors.primary,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    取消
                  </Text>
                </Pressable>
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
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  menuItemsContainer: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cancelContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
  },
});
