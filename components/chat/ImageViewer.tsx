import { logger } from '@/utils/logger';
/**
 * 🖼️ 图片查看器组件
 *
 * 功能：
 * - 全屏查看图片
 * - 支持手势缩放（捏合缩放）
 * - 支持双击缩放
 * - 支持长按下载/保存
 * - 点击背景关闭
 */

import React, { useCallback, useRef } from 'react';
import {
    View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  prompt?: string; // 可选：显示提示词
}

export function ImageViewer({ visible, imageUri, onClose, prompt }: ImageViewerProps) {
  const theme = useTheme();
  const [isDownloading, setIsDownloading] = React.useState(false);

  // 缩放和平移的共享值
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 重置缩放和位置
  const resetTransform = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // 关闭查看器
  const handleClose = useCallback(() => {
    resetTransform();
    onClose();
  }, [onClose, resetTransform]);

  // 捏合手势（缩放）
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      // 限制缩放范围 0.5 - 5
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
      } else if (scale.value > 5) {
        scale.value = withSpring(5);
      }
      savedScale.value = scale.value;
    });

  // 平移手势
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // 只有在放大状态下才能平移
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // 双击手势（缩放）
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        // 已放大，恢复原始大小
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // 放大到 2 倍
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  // 组合手势
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTapGesture, pinchGesture),
    panGesture
  );

  // 动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // 下载/保存图片
  const handleDownload = async () => {
    if (!imageUri) return;

    try {
      setIsDownloading(true);

      // 如果是本地文件，直接分享
      if (imageUri.startsWith('file://')) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(imageUri);
        } else {
          Alert.alert('提示', '当前平台不支持分享功能');
        }
        return;
      }

      // 如果是网络图片，先下载
      const timestamp = new Date().getTime();
      const filename = `aetherlink_image_${timestamp}.png`;
      const file = new File(Paths.document, filename);


      // 使用 fetch 下载图片
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      // 获取图片数据并转换为 base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      // 写入文件
      await file.write(base64, { encoding: 'base64' });


      // 分享/保存图片
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: '保存图片',
        });
      } else {
        Alert.alert('成功', `图片已保存到: ${file.uri}`);
      }
    } catch (error: any) {
      logger.error('[ImageViewer] 下载失败:', error);
      Alert.alert('错误', error.message || '下载图片失败');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* 背景（点击关闭） */}
          <TouchableOpacity
            style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}
            activeOpacity={1}
            onPress={handleClose}
          >
            {/* 顶部工具栏 */}
            <View style={[styles.toolbar, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
              {prompt && (
                <View style={styles.promptContainer}>
                  <Icon name="text-box" size={16} color="#FFFFFF" />
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={[styles.promptText, { color: '#FFFFFF' }]}
                  >
                    {prompt}
                  </Text>
                </View>
              )}
              <View style={styles.toolbarButtons}>
                {/* 下载按钮 */}
                <IconButton
                  icon="download"
                  iconColor="#FFFFFF"
                  size={24}
                  onPress={handleDownload}
                  disabled={isDownloading}
                  style={styles.toolbarButton}
                />
                {/* 关闭按钮 */}
                <IconButton
                  icon="close"
                  iconColor="#FFFFFF"
                  size={24}
                  onPress={handleClose}
                  style={styles.toolbarButton}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* 图片容器（手势检测） */}
          <View style={styles.imageContainer} pointerEvents="box-none">
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <TouchableOpacity activeOpacity={1}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                  />
                </TouchableOpacity>
              </Animated.View>
            </GestureDetector>
          </View>

          {/* 底部提示 */}
          <View style={[styles.bottomHint, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <Text variant="bodySmall" style={{ color: '#FFFFFF', textAlign: 'center' }}>
              双击或捏合缩放 • 长按下载保存
            </Text>
          </View>

          {/* 下载加载提示 */}
          {isDownloading && (
            <View style={styles.downloadingOverlay}>
              <View style={[styles.downloadingBox, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 12 }}>
                  正在下载...
                </Text>
              </View>
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  toolbar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  promptContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  promptText: {
    flex: 1,
  },
  toolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarButton: {
    margin: 0,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  downloadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  downloadingBox: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
