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
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { Icon } from '@rneui/themed';

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
      title: '添加照片和文件',
      icon: 'attachment',
      iconType: 'material-community',
      color: theme.colors.primary,
      onPress: () => {
        onClose();
        onSelectImage();
      },
    },
    {
      id: 'file',
      title: '添加文件',
      icon: 'file-document-outline',
      iconType: 'material-community',
      color: '#10b981',
      onPress: () => {
        onClose();
        onSelectFile();
      },
    },
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
                  添加附件
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
                      },
                    ]}
                    onPress={item.onPress}
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
                        name={item.icon}
                        type={item.iconType as any}
                        color={item.color}
                        size={24}
                      />
                    </View>
                    <Text
                      variant="bodyLarge"
                      style={{
                        color: theme.colors.onSurface,
                        flex: 1,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Icon
                      name="chevron-right"
                      type="material-community"
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
