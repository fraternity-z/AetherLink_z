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
import { supportsImageGeneration } from '@/services/ai/ModelDiscovery';
import type { Provider } from '@/services/ai/AiClient';

interface MoreActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  conversationId: string | null;
  onClearContext?: () => void;
  hasContextReset?: boolean;
  onOpenImageGeneration?: () => void; // 新增：打开图片生成对话框
  provider?: Provider; // 新增：当前 AI 提供商
  model?: string; // 新增：当前模型
}

export function MoreActionsMenu({
  visible,
  onClose,
  onClearConversation,
  conversationId,
  onClearContext,
  hasContextReset,
  onOpenImageGeneration,
  provider,
  model,
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

  const handleClearContext = () => {
    if (!conversationId) {
      alert('提示', '当前没有对话');
      onClose();
      return;
    }
    confirmAction(
      '清除上下文',
      '从下次提问起不再引用之前上文，历史消息不会被删除。',
      () => {
        onClose();
        setTimeout(() => { onClearContext?.(); }, 200);
      },
      { confirmText: '清除上下文', cancelText: '取消', destructive: true }
    );
  };

  const handleImageGeneration = () => {
    if (!conversationId) {
      alert('提示', '请先创建或选择对话');
      onClose();
      return;
    }

    if (!provider || !model) {
      alert('提示', '请先选择 AI 模型');
      onClose();
      return;
    }

    if (!supportsImageGeneration(provider, model)) {
      alert('提示', '当前模型不支持图片生成功能\\n\\n请切换到 DALL-E 3、GPT-Image-1 等专用图片生成模型');
      onClose();
      return;
    }

    onClose();
    // 延迟打开对话框，让菜单先关闭
    setTimeout(() => {
      onOpenImageGeneration?.();
    }, 300);
  };

  // no undo entry per product decision

  // 判断是否支持图片生成
  const imageGenerationSupported = provider && model && supportsImageGeneration(provider, model);

  const menuItems = [
    {
      id: 'image-generation',
      title: '图片生成',
      description: imageGenerationSupported
        ? '使用 AI 生成图片（支持 DALL-E 3 等模型）'
        : '当前模型不支持，请切换到图片生成模型',
      icon: 'image-plus',
      color: '#F59E0B',
      onPress: handleImageGeneration,
      disabled: !conversationId || !imageGenerationSupported,
    },
    {
      id: 'clear',
      title: '清除对话',
      description: '清空当前话题的所有消息',
      icon: 'delete-sweep',
      color: '#EF4444',
      onPress: handleClearConversation,
      disabled: !conversationId,
    },
    {
      id: 'clear-context',
      title: '清除上下文',
      description: '从下次提问起不引用之前上文',
      icon: 'history',
      color: '#A855F7',
      onPress: handleClearContext,
      disabled: !conversationId || !!hasContextReset,
    },
    // 可以在这里添加更多功能
    // {
    //   id: 'export',
    //   title: '导出对话',
    //   description: '将对话导出为文本或Markdown',
    //   icon: 'export',
    //   color: '#3B82F6',
    //   onPress: () => {
    //     onClose();
    //     // TODO: 实现导出功能
    //   },
    //   disabled: !conversationId,
    // },
  ];

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
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
              <View style={styles.header}>
                <Text
                  variant="titleLarge"
                  style={[
                    styles.headerText,
                    { color: theme.colors.onSurface }
                  ]}
                >
                  更多功能
                </Text>
              </View>

              {/* 菜单项 - 垂直排列的卡片式布局 */}
              <View style={styles.menuItemsContainer}>
                {menuItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.menuItemCard,
                      {
                        backgroundColor: pressed
                          ? theme.colors.surfaceVariant
                          : theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        opacity: item.disabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={item.onPress}
                    disabled={item.disabled}
                    android_ripple={{
                      color: theme.colors.surfaceVariant,
                    }}
                  >
                    <View style={styles.menuItemContent}>
                      {/* 图标容器 */}
                      <View
                        style={[
                          styles.iconWrapper,
                          {
                            backgroundColor: `${item.color}20`,
                          },
                        ]}
                      >
                        <Icon
                          name={item.icon as any}
                          size={28}
                          color={item.color}
                        />
                      </View>

                      {/* 文字容器 */}
                      <View style={styles.contentWrapper}>
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.menuItemTitle,
                            { color: theme.colors.onSurface }
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.title}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.menuItemDescription,
                            { color: theme.colors.onSurfaceVariant }
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.description}
                        </Text>
                      </View>

                      {/* 箭头 */}
                      <Icon
                        name="chevron-right"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                        style={styles.chevron}
                      />
                    </View>
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
                        : 'transparent',
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  onPress={onClose}
                  android_ripple={{
                    color: theme.colors.surfaceVariant,
                  }}
                >
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.cancelText,
                      { color: theme.colors.primary }
                    ]}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 20,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 20,
  },
  menuItemsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 84,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  contentWrapper: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  chevron: {
    flexShrink: 0,
  },
  cancelContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cancelButton: {
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '600',
    fontSize: 17,
  },
});
