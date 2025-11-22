import { useColorScheme } from '@/hooks/use-color-scheme';
import { logger } from '@/utils/logger';
import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  isReady: boolean;
  onAnimationFinish?: () => void;
}

/**
 * 科技感光环 - 优化版
 * 使用 View 变换代替 SVG 属性动画，大幅提升性能
 */
const TechRings = memo(({ isDark }: { isDark: boolean }) => {
  const outerRotation = useSharedValue(0);
  const innerRotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  
  const strokeColor = isDark ? 'rgba(147, 197, 253, 0.3)' : 'rgba(59, 130, 246, 0.3)';

  useEffect(() => {
    // 外圈慢速旋转
    outerRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    
    // 内圈反向旋转
    innerRotation.value = withRepeat(
      withTiming(-360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    // 呼吸效果
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [innerRotation, outerRotation, pulse]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRotation.value}deg` }, { scale: pulse.value }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRotation.value}deg` }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 外圈 */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.centerContent, outerStyle]}>
        <Svg height="400" width="400" viewBox="0 0 400 400">
          <Circle
            cx="200"
            cy="200"
            r="130"
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="20, 40"
            strokeOpacity="0.8"
            fill="none"
          />
          <Circle
            cx="200"
            cy="200"
            r="125"
            stroke={strokeColor}
            strokeWidth="0.5"
            strokeOpacity="0.4"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* 内圈 */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.centerContent, innerStyle]}>
        <Svg height="400" width="400" viewBox="0 0 400 400">
          <Circle
            cx="200"
            cy="200"
            r="110"
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="4, 10"
            strokeOpacity="0.5"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
});

TechRings.displayName = 'TechRings';

/**
 * 背景光晕 - 静态 SVG，仅做简单的 View 缩放动画
 */
const BackgroundGlow = memo(({ isDark }: { isDark: boolean }) => {
  const scale = useSharedValue(1);
  
  const colors = isDark 
    ? { center: '#3B82F6', mid: '#1E3A8A', edge: '#0F172A' }
    : { center: '#DBEAFE', mid: '#EFF6FF', edge: '#FFFFFF' };

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="grad"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.center} stopOpacity="0.15" />
            <Stop offset="0.6" stopColor={colors.mid} stopOpacity="0.05" />
            <Stop offset="1" stopColor={colors.edge} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={SCREEN_HEIGHT / 2}
          r={SCREEN_WIDTH}
          fill="url(#grad)"
        />
      </Svg>
    </Animated.View>
  );
});

BackgroundGlow.displayName = 'BackgroundGlow';

/**
 * AetherLink 极速版开屏动画 (v2.1 - Performance Optimized)
 * 
 * 优化策略：
 * 1. 移除所有 JS 驱动的 SVG 属性动画，全部替换为 Native View Transforms
 * 2. 移除粒子系统 (Particle System)，减少大量视图节点
 * 3. 简化阴影效果，使用透明度叠加代替 heavy shadows
 * 4. 保持视觉核心：光环 + 呼吸感 + 流畅进出场
 */
export default function SplashScreen({ isReady, onAnimationFinish }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  
  const [isHidden, setIsHidden] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // 入场
  useEffect(() => {
    logoScale.value = withSpring(1, {
      damping: 15,
      stiffness: 90,
    });

    logoOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    }, (finished) => {
      if (finished) {
        runOnJS(setHasEntered)(true);
      }
    });
    
    logger.info('SplashScreen: Animation started');
  }, [logoOpacity, logoScale]);

  // 退场
  useEffect(() => {
    if (isReady && hasEntered) {
      containerOpacity.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished) {
          runOnJS(setIsHidden)(true);
          if (onAnimationFinish) runOnJS(onAnimationFinish)();
        }
      });
    }
  }, [isReady, hasEntered, containerOpacity, onAnimationFinish]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const backgroundColor = isDark ? '#0F172A' : '#F8FAFC'; 

  if (isHidden) return null;

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill, 
        styles.container, 
        { backgroundColor }, 
        containerStyle
      ]}
      pointerEvents="none" // 避免拦截触摸事件
    >
      <BackgroundGlow isDark={isDark} />

      <View style={styles.centerContent}>
        <TechRings isDark={isDark} />

        <Animated.View style={[styles.logoWrapper, logoStyle]}>
          {/* 模拟辉光 - 使用 View 而不是 shadow */}
          <View style={[
            styles.logoGlow, 
            { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 197, 253, 0.4)' }
          ]} />
          
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
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    width: 400,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 160,
    height: 160,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
});
