import React, { useState } from 'react';
import { ImageBackground, StyleSheet, View, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useBackgroundSettings } from '@/hooks/use-background-settings';
import { logger } from '@/utils/logger';

interface ChatBackgroundProps {
  children: React.ReactNode;
}

/**
 * 聊天背景组件
 * 根据用户设置渲染自定义背景图片
 */
export function ChatBackground({ children }: ChatBackgroundProps) {
  const { settings, updateImagePath } = useBackgroundSettings();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理图片加载失败
   */
  const handleImageError = () => {
    logger.error('Failed to load background image', {
      path: settings.imagePath,
    });

    // 禁用背景并提示用户
    Alert.alert(
      '背景加载失败',
      '无法加载背景图片，已恢复默认背景',
      [
        {
          text: '确定',
          onPress: async () => {
            try {
              await updateImagePath(null);
            } catch (error) {
              logger.error('Failed to reset background', { error });
            }
          },
        },
      ]
    );
  };

  /**
   * 处理图片加载开始
   */
  const handleLoadStart = () => {
    setIsLoading(true);
  };

  /**
   * 处理图片加载完成
   */
  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // 未启用或无图片路径时，直接渲染子组件
  if (!settings.enabled || !settings.imagePath) {
    return <>{children}</>;
  }

  return (
    <ImageBackground
      source={{ uri: settings.imagePath }}
      style={styles.background}
      imageStyle={[styles.backgroundImage, { opacity: settings.opacity }]}
      resizeMode="cover"
      onError={handleImageError}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
    >
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    // opacity 通过 props 动态设置
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
});
