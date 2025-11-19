import { useColorScheme } from '@/hooks/use-color-scheme';
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

// "AetherLink" artistic signature paths
const DEFAULT_AETHER_PATHS = [
  // A
  "M 40 140 Q 60 40 80 140", 
  "M 45 110 Q 60 110 75 110",
  // e
  "M 80 140 Q 95 100 85 115 Q 80 125 95 140",
  // t
  "M 105 140 L 105 60",
  "M 95 80 L 115 80",
  // h
  "M 125 140 L 125 50 L 125 110 Q 145 90 145 140",
  // e
  "M 150 140 Q 165 100 155 115 Q 150 125 165 140",
  // r
  "M 175 140 L 175 110 Q 185 100 185 110 L 185 140",
  // L
  "M 205 50 L 205 140 L 225 140",
  // i
  "M 235 110 L 235 140",
  "M 235 90 L 235 95", // dot
  // n
  "M 245 140 L 245 110 Q 265 90 265 140",
  // k
  "M 275 50 L 275 140",
  "M 275 120 L 295 100",
  "M 275 120 L 295 140"
];

const LOGO_SVG_SOURCE = require('../../assets/aetherlink_logo.svg');
// 匹配 path 元素，同时捕获 fill 和 stroke 属性
const PATH_REGEX = /<path([^>]*)d=(?:"([^"]+)"|'([^']+)')([^>]*)>/gi;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SplashScreenProps {
  isReady: boolean;
  onAnimationFinish?: () => void;
}

interface PathWithColor {
  d: string;
  color: string;
}

export default function SplashScreen({ isReady, onAnimationFinish }: SplashScreenProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [aetherPaths, setAetherPaths] = useState<PathWithColor[]>(
    DEFAULT_AETHER_PATHS.map(d => ({ d, color: '#2F5AB2' }))
  );
  const [isHidden, setIsHidden] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const backgroundColor = isDark ? '#000000' : '#FFFFFF';

  useEffect(() => {
    let isMounted = true;

    const loadLogoPaths = async () => {
      try {
        const asset = Asset.fromModule(LOGO_SVG_SOURCE);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }

        const svgUri = asset.localUri ?? asset.uri;
        if (!svgUri) return;

        const svgContent = await FileSystem.readAsStringAsync(svgUri);

        // 提取所有 path 元素及其颜色
        const pathMatches = Array.from(svgContent.matchAll(PATH_REGEX));
        const pathsWithColors: PathWithColor[] = pathMatches
          .map((match) => {
            const beforeD = match[1] || '';
            const afterD = match[4] || '';
            const allAttrs = beforeD + afterD;
            const pathD = match[2] ?? match[3];

            // 提取 fill 颜色
            const fillMatch = allAttrs.match(/fill\s*=\s*["']([^"']+)["']/);
            const fillColor = fillMatch ? fillMatch[1] : '#000000';

            return pathD ? { d: pathD, color: fillColor } : null;
          })
          .filter((item): item is PathWithColor => item !== null)
          // 过滤掉白色背景路径（通常是最外层的矩形框）
          .filter((item) => {
            const isWhite = /^#(FFFFFF|FFF|FEFEFF|F{6})$/i.test(item.color);
            const isNone = item.color === 'none';
            return !isWhite && !isNone;
          })
          .slice(0, 40); // 限制最多 40 个路径，避免性能问题

        if (isMounted && pathsWithColors.length > 0) {
          setAetherPaths(pathsWithColors);
          logger.info(`SplashScreen: Loaded ${pathsWithColors.length} colored paths from SVG`);
        }
      } catch (error) {
        logger.warn('SplashScreen: Failed to load logo SVG', { error });
      }
    };

    loadLogoPaths();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Start the handwriting animation
    // 根据路径数量动态调整动画时长（每个路径约 100ms）
    const duration = Math.max(2000, Math.min(5000, aetherPaths.length * 100));

    progress.value = withTiming(1, {
      duration,
      easing: Easing.bezier(0.37, 0, 0.63, 1),
    });
  }, [aetherPaths.length]);

  useEffect(() => {
    if (isReady && progress.value === 1) {
       fadeOut();
    } else if (isReady) {
        const interval = setInterval(() => {
            if (progress.value >= 0.99) {
                clearInterval(interval);
                fadeOut();
            }
        }, 100);
        return () => clearInterval(interval);
    }
  }, [isReady]);

  const handleAnimationFinish = useCallback(() => {
    setIsHidden(true);
    onAnimationFinish?.();
  }, [onAnimationFinish]);

  const fadeOut = () => {
    opacity.value = withDelay(500, withTiming(0, { duration: 800 }, (finished) => {
      if (finished) {
        runOnJS(handleAnimationFinish)();
      }
    }));
  };

  const animatedProps = useAnimatedProps(() => {
    // 使用较大的 strokeDasharray 以适应复杂路径
    const length = 5000;
    return {
      strokeDashoffset: length - progress.value * length,
      strokeDasharray: length,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      zIndex: opacity.value === 0 ? -1 : 1000,
    };
  });

  if (isHidden) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor }, containerStyle]}>
      <Svg height="300" width="100%" viewBox="0 0 1024 1024" style={{ maxWidth: 600 }}>
        <G>
          {aetherPaths.map((pathData, index) => (
            <AnimatedPath
              key={index}
              d={pathData.d}
              stroke={pathData.color}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={animatedProps}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
