/**
 * 📱 统一底部弹出Sheet组件
 *
 * 提供统一的底部弹出样式：
 * - 从底部上拉的白色圆角方框
 * - 流畅的动画效果
 * - 自适应深色/浅色模式
 * - 支持拖动指示器
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';

export interface UnifiedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  maxHeight?: number | string;
  showDragIndicator?: boolean;
}

export function UnifiedBottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = '90%',
  showDragIndicator = true,
}: UnifiedBottomSheetProps) {
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

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
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
                styles.sheetContainer,
                {
                  backgroundColor: theme.colors.surface,
                  transform: [{ translateY }],
                },
                typeof maxHeight === 'string' && maxHeight.endsWith('%')
                  ? { maxHeight: maxHeight as `${number}%` }
                  : { maxHeight: maxHeight as number },
              ]}
            >
              {/* 拖动指示器 */}
              {showDragIndicator && (
                <View style={styles.dragIndicatorContainer}>
                  <View
                    style={[
                      styles.dragIndicator,
                      { backgroundColor: theme.colors.outlineVariant },
                    ]}
                  />
                </View>
              )}

              {/* 标题 */}
              {title && (
                <View style={styles.header}>
                  <Text
                    variant="titleLarge"
                    style={[
                      styles.title,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
              )}

              {/* 内容区域 */}
              <ScrollView
                style={styles.contentScrollView}
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                <View style={styles.content}>{children}</View>
              </ScrollView>
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
  sheetContainer: {
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
  title: {
    fontWeight: '700',
    fontSize: 20,
  },
  contentScrollView: {
    maxHeight: 600,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
});
