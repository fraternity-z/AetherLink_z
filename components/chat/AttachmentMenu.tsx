/**
 * 📎 附件选择底部菜单组件
 *
 * 功能：
 * - 从底部上拉的附件选择菜单
 * - 支持图片、文件等多种附件类型
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

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectFile: () => void;
}

export function AttachmentMenu({
  visible,
  onClose,
  onSelectImage,
  onSelectFile,
}: AttachmentMenuProps) {
  const theme = useTheme();
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

  const menuItems = [
    {
      id: 'image',
      title: '添加照片和视频',
      icon: 'image-multiple',
      color: '#8B5CF6',
      onPress: () => {
        onClose();
        onSelectImage();
      },
    },
    {
      id: 'file',
      title: '添加文件',
      icon: 'file-document',
      color: '#10B981',
      onPress: () => {
        onClose();
        onSelectFile();
      },
    },
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
                  添加附件
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
                      },
                    ]}
                    onPress={item.onPress}
                    android_ripple={{
                      color: theme.colors.surfaceVariant,
                    }}
                  >
                    <View
                      style={[
                        styles.menuItemContent,
                      ]}
                    >
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

                      {/* 文字容器 - 使用固定宽度 */}
                      <View style={styles.titleWrapper}>
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
    minHeight: 72,
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
  titleWrapper: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 24,
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
