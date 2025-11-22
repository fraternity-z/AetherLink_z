/**
 * 💭 正在思考/输入指示器组件
 *
 * 功能：
 * - 三个呼吸变色的圆点，形成优雅的波浪动画
 * - 使用 Reanimated 确保无性能损耗
 * - 自动适配深色/浅色主题
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

interface TypingIndicatorProps {
  /**
   * 激活状态的颜色（通常是主色，不传则使用主题 Primary 色）
   */
  activeColor?: string;
  /**
   * 点的大小（默认 6）
   */
  dotSize?: number;
}

export function TypingIndicator({ activeColor, dotSize = 6 }: TypingIndicatorProps) {
  const theme = useTheme();
  
  // 默认激活颜色使用主题主色
  const finalActiveColor = activeColor || theme.colors.primary;
  // 闲置颜色：使用带有透明度的文字颜色，适配深浅色模式，使其在未激活时几乎隐形但又能看到占位
  const idleColor = theme.dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  // 三个点的动画进度值 (0: 闲置, 1: 激活)
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  useEffect(() => {
    // 动画周期配置
    const duration = 800; // 单次呼吸时长
    const delayBetweenDots = 200; // 点之间的延迟

    // 创建一个呼吸动画序列：从 0 -> 1 -> 0
    // 使用 inOut(ease) 使得变换非常柔和
    const pulse = withSequence(
      withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
    );

    // 无限循环播放
    const loop = withRepeat(pulse, -1, false);

    // 依次启动动画
    progress1.value = loop;
    progress2.value = withDelay(delayBetweenDots, loop);
    progress3.value = withDelay(delayBetweenDots * 2, loop);
  }, [progress1, progress2, progress3]);

  // 创建每个点的动画样式
  const createDotStyle = (progress: SharedValue<number>) => useAnimatedStyle(() => {
    // 颜色插值：从闲置色渐变到激活色
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [idleColor, finalActiveColor]
    );

    // 缩放插值：从 1.0 放大到 1.25，增加呼吸感
    const scale = 1 + (progress.value * 0.25);

    // 透明度插值：确保闲置时不会完全消失，保持视觉连续性
    const opacity = 0.5 + (progress.value * 0.5);

    return {
      backgroundColor,
      opacity,
      transform: [{ scale }],
    };
  });

  const baseDotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    marginHorizontal: 3, // 稍微紧凑的间距
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[baseDotStyle, createDotStyle(progress1)]} />
      <Animated.View style={[baseDotStyle, createDotStyle(progress2)]} />
      <Animated.View style={[baseDotStyle, createDotStyle(progress3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 20, // 固定高度，避免布局抖动
    paddingHorizontal: 2,
  },
});
