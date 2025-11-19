import { useColorScheme } from '@/hooks/use-color-scheme';
import { logger } from '@/utils/logger';
import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface SplashScreenProps {
  isReady: boolean;
  onAnimationFinish?: () => void;
}

interface ParticleProps {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
}

/**
 * 单个粒子组件（独立组件避免 Hooks 规则错误）
 */
const Particle = memo(({ angle, distance, size, delay, color }: ParticleProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.8, { duration: 600, easing: Easing.ease }),
        withTiming(0, { duration: 1000, easing: Easing.ease })
      )
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1, { damping: 10, stiffness: 80 }),
        withTiming(0, { duration: 800, easing: Easing.ease })
      )
    );

    translateX.value = withDelay(
      delay,
      withTiming(endX, {
        duration: 1600,
        easing: Easing.out(Easing.quad),
      })
    );

    translateY.value = withDelay(
      delay,
      withTiming(endY, {
        duration: 1600,
        easing: Easing.out(Easing.quad),
      })
    );

    // 循环粒子动画
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        true
      );
    }, delay + 1600);
  }, [angle, delay, distance, opacity, scale, translateX, translateY]);

  const particleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      width: size,
      height: size,
    };
  });

  return <Animated.View style={[styles.particle, particleStyle, { backgroundColor: color }]} />;
});

Particle.displayName = 'Particle';

/**
 * AetherLink 炫酷开屏动画组件
 *
 * 动画效果：
 * 1. Logo 缩放入场 + 360°旋转（弹性效果）
 * 2. 霓虹灯发光效果（脉动）
 * 3. 粒子飘散效果（随机动画）
 * 4. 渐变背景动画
 * 5. 丝滑退场动画
 *
 * 性能优化：
 * - 使用 expo-image 硬件加速渲染 SVG
 * - 所有动画运行在 UI 线程（Reanimated）
 * - 粒子数量控制在 20 个以内
 * - 启用 memo 优化粒子组件
 */
export default function SplashScreen({ isReady, onAnimationFinish }: SplashScreenProps) {
  // 动画共享值
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const backgroundProgress = useSharedValue(0);

  const [isHidden, setIsHidden] = useState(false);
  const [isLogoEntryFinished, setIsLogoEntryFinished] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 粒子配置数据（纯数据，不包含 Hooks）
  const particleColor = isDark ? '#667eea' : '#4facfe';

  useEffect(() => {
    // 1. Logo 入场动画（0-1.2s）
    logoScale.value = withSpring(
      1,
      {
        damping: 8,
        stiffness: 100,
        mass: 0.5,
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsLogoEntryFinished)(true);
        }
      }
    );

    logoRotate.value = withTiming(360, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });

    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.ease,
    });

    // 2. 发光效果（0.8s 后开始脉动）
    glowOpacity.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.ease }),
          withTiming(0.5, { duration: 1000, easing: Easing.ease })
        ),
        -1, // 无限循环
        true
      )
    );

    // 3. 背景渐变动画
    backgroundProgress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      true
    );

    logger.info('SplashScreen: Animation started with SVG logo');
  }, [backgroundProgress, glowOpacity, logoOpacity, logoRotate, logoScale]);

  const handleAnimationFinish = useCallback(() => {
    setIsHidden(true);
    onAnimationFinish?.();
    logger.info('SplashScreen: Animation finished');
  }, [onAnimationFinish]);

  const fadeOut = useCallback(() => {
    containerOpacity.value = withDelay(
      300,
      withTiming(0, { duration: 600, easing: Easing.ease }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationFinish)();
        }
      })
    );
  }, [containerOpacity, handleAnimationFinish]);

  useEffect(() => {
    if (isReady && isLogoEntryFinished) {
      fadeOut();
    }
  }, [fadeOut, isLogoEntryFinished, isReady]);

  // 容器样式
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
      zIndex: containerOpacity.value === 0 ? -1 : 1000,
    };
  });

  // 背景渐变样式
  const backgroundStyle = useAnimatedStyle(() => {
    const colorStart = isDark ? 0 : 255;
    const colorEnd = isDark ? 20 : 245;
    const color = colorStart + (colorEnd - colorStart) * backgroundProgress.value;

    return {
      backgroundColor: isDark
        ? `rgb(${color * 0.1}, ${color * 0.1}, ${color * 0.2})`
        : `rgb(${color}, ${color}, ${color})`,
    };
  });

  // Logo 样式
  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
      opacity: logoOpacity.value,
    };
  });

  // 发光层样式
  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value * 0.6,
    };
  });

  if (isHidden) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle, containerStyle]}>
      <View style={styles.container}>
        {/* 粒子层 */}
        <View style={styles.particlesContainer}>
          {Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 80 + Math.random() * 60;
            const size = 4 + Math.random() * 6;
            const delay = Math.random() * 800;

            return (
              <Particle
                key={i}
                angle={angle}
                distance={distance}
                size={size}
                delay={delay}
                color={particleColor}
              />
            );
          })}
        </View>

        {/* 外层发光（霓虹灯效果） */}
        <Animated.View style={[styles.glowContainer, glowStyle]}>
          <View
            style={[styles.glow, styles.glowOuter, { shadowColor: isDark ? '#667eea' : '#4facfe' }]}
          />
          <View
            style={[styles.glow, styles.glowInner, { shadowColor: isDark ? '#4facfe' : '#667eea' }]}
          />
        </Animated.View>

        {/* Logo 主体 */}
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/assets/aetherlink_logo.svg')}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 100, // 圆形裁剪
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
  },
  glowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  glowOuter: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 0, // 移除 Android elevation，避免方形边框
  },
  glowInner: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 0, // 移除 Android elevation，避免方形边框
  },
});
