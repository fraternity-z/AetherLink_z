/**
 * 💭 正在思考指示器组件
 *
 * 功能：
 * - 三个跳动的点，形成优雅的波浪动画
 * - 使用 Reanimated 确保流畅性能
 * - 适配深色/浅色主题
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface TypingIndicatorProps {
  /**
   * 点的颜色（可选，默认使用主题色）
   */
  color?: string;
  /**
   * 点的大小（可选，默认 8）
   */
  dotSize?: number;
}

export function TypingIndicator({ color, dotSize = 8 }: TypingIndicatorProps) {
  const theme = useTheme();
  const dotColor = color || (theme.dark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)');

  // 三个点的动画值
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    // 跳动动画配置：向上移动 6px，然后回到原位
    const bounceAnimation = withSequence(
      withTiming(-6, { duration: 400, easing: Easing.bezier(0.33, 0.66, 0.66, 1) }),
      withTiming(0, { duration: 400, easing: Easing.bezier(0.33, 0, 0.66, 0.33) })
    );

    // 无限循环的跳动动画
    const loopAnimation = withRepeat(bounceAnimation, -1, false);

    // 三个点依次延迟启动，形成波浪效果
    dot1Y.value = loopAnimation;
    dot2Y.value = withDelay(150, loopAnimation);
    dot3Y.value = withDelay(300, loopAnimation);
  }, [dot1Y, dot2Y, dot3Y]);

  // 动画样式
  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }],
  }));

  const dotBaseStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: dotColor,
    marginHorizontal: dotSize * 0.375, // 点之间的间距（约3px）
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[dotBaseStyle, dot1Style]} />
      <Animated.View style={[dotBaseStyle, dot2Style]} />
      <Animated.View style={[dotBaseStyle, dot3Style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
