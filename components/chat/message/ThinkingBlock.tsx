/**
 * 💡 思考链(Thinking Chain)组件
 *
 * 用于显示 AI 模型的思考过程(仅支持推理模型如 OpenAI o1/o3, DeepSeek R1 等)
 *
 * 功能特性:
 * - 默认折叠状态,可展开查看完整思考过程
 * - 折叠状态下显示滚动渐隐的内容预览（参考 Cherry Studio）
 * - 显示思考耗时统计
 * - 支持 Markdown 渲染思考内容
 * - 流畅的展开/折叠动画（箭头旋转180°）
 * - 加载状态的闪烁效果和转圈动画
 * - LinearGradient 渐变背景（低调灰色系）
 * - 自适应深色/浅色主题
 *
 * 创建日期: 2025-11-08
 * 最后更新: 2025-11-22
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ThinkingBlockProps {
  content: string;         // 思考过程内容
  durationMs: number;      // 思考耗时(毫秒)
  isExpanded?: boolean;    // 是否默认展开(默认 false)
  onToggle?: () => void;   // 展开/折叠回调
  isStreaming?: boolean;   // 正文是否仍在流式输出（用于自动展开/折叠）
}

/**
 * 格式化耗时(毫秒 → 秒,保留一位小数)
 */
function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(1);
}

/**
 * 闪烁动画组件（用于加载状态）
 */
const ShimmerText: React.FC<{ children: React.ReactNode; enabled: boolean }> = ({
  children,
  enabled,
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (enabled) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      opacity.value = 1;
    }
  }, [enabled, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

/**
 * 滚动渐隐预览组件（参考 Cherry Studio）
 */
const MarqueePreview: React.FC<{
  content: string;
  isStreaming: boolean;
  textColor: string;
}> = ({ content, isStreaming, textColor }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const queueRef = useRef<string>('');
  const processedLengthRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  const clearAnimationFrame = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  };

  const NEXT_CONTENT_COUNT = 30;
  const startOutputQueue = () => {
    if (processedLengthRef.current === 0) return;

    const outputNextChar = () => {
      if (queueRef.current.length > NEXT_CONTENT_COUNT) {
        const nextContent = queueRef.current
          .slice(0, NEXT_CONTENT_COUNT)
          .replace(/[\r\n]+/g, ' ');
        queueRef.current = queueRef.current.slice(NEXT_CONTENT_COUNT);

        setMessages((prev) => [...prev, nextContent]);
        animationFrameIdRef.current = requestAnimationFrame(outputNextChar);
      } else {
        clearAnimationFrame();
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(outputNextChar);
  };

  useEffect(() => {
    if (isStreaming && content && content.length > processedLengthRef.current) {
      const newChars = content.slice(processedLengthRef.current);
      queueRef.current += newChars;
      processedLengthRef.current = content.length;
      startOutputQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isStreaming]);

  useEffect(() => {
    return () => {
      clearAnimationFrame();
      queueRef.current = '';
      processedLengthRef.current = 0;
    };
  }, []);

  const lineHeight = 16;
  const fixedHeight = 48; // 固定高度，确保宽度一致

  if (!isStreaming || messages.length === 0) {
    // 不显示任何内容
    return null;
  }

  return (
    <View
      style={{ height: fixedHeight, minWidth: 50, position: 'relative' }}
    >
      {/* 💡用于撑开宽度的隐形文本，解决绝对定位导致宽度塌陷的问题 */}
      <View style={{ opacity: 0, height: '100%', justifyContent: 'flex-end', paddingBottom: 4 }}>
        {messages.slice(-3).map((msg, idx) => (
          <Text key={idx} style={[styles.previewText, { lineHeight }]} numberOfLines={1}>
            {msg}
          </Text>
        ))}
      </View>

      {messages.map((message, index) => {
        const finalY = fixedHeight - (messages.length - index) * lineHeight - 4;

        if (index < messages.length - 3) return null;

        const opacity = (() => {
          const distanceFromLast = messages.length - 1 - index;
          if (distanceFromLast === 0) return 0.8;
          if (distanceFromLast === 1) return 0.5;
          if (distanceFromLast === 2) return 0.3;
          return 0.1;
        })();

        // 使用包装器分离 layout animation 和 opacity 属性，避免 Reanimated 警告
        // 外层 View 负责定位和 opacity，内层 Animated.View 负责 FadeIn 动画
        return (
          <View
            key={`${index}-${message}`}
            style={{
              position: 'absolute',
              width: '100%',
              height: lineHeight,
              top: finalY,
              opacity,
            }}
          >
            <Animated.View entering={FadeIn.duration(150)}>
              <Text
                style={[styles.previewText, { color: textColor, lineHeight }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {message}
              </Text>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  durationMs,
  isExpanded: initialExpanded = false,
  onToggle,
  isStreaming = false,
}) => {
  const theme = useTheme();
  // 默认折叠状态
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // 箭头旋转动画
  const arrowRotation = useSharedValue(0);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  // 更新箭头旋转动画
  useEffect(() => {
    arrowRotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded, arrowRotation]);

  // 主题颜色
  const borderColor = theme.dark ? 'rgba(100,100,100,0.4)' : 'rgba(200,200,200,0.6)';
  const textColor = theme.colors.onSurface;
  const iconColor = theme.colors.primary;

  // 渐变色配置（低调灰色系）
  const gradientColors = theme.dark
    ? ['rgba(60,60,60,0.3)', 'rgba(50,50,50,0.2)', 'rgba(45,45,45,0.25)']
    : ['rgba(240,240,240,0.6)', 'rgba(245,245,245,0.5)', 'rgba(248,248,248,0.6)'];

  // 是否正在加载
  const isLoading = durationMs === 0 || isStreaming;

  // 箭头动画样式
  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          borderColor,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors as any}
        locations={[0, 0.61, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* 标题栏(始终可见,可点击展开/折叠) */}
        <TouchableOpacity
          style={styles.header}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          {/* 加载指示器（仅加载时显示） */}
          {isLoading && (
            <ActivityIndicator
              size={18}
              color={iconColor}
              style={styles.spinner}
            />
          )}

          {/* 灯泡图标 */}
          {!isLoading && (
            <Text style={[styles.icon, { color: iconColor }]}>💡</Text>
          )}

          {/* 标题文本（加载时闪烁） */}
          <ShimmerText enabled={isLoading}>
            <Text style={[styles.title, { color: textColor }]}>
              {durationMs > 0
                ? `已深度思考（用时 ${formatDuration(durationMs)} 秒）`
                : '正在深度思考…'}
            </Text>
          </ShimmerText>

          {/* 展开/折叠箭头（带旋转动画） */}
          <Animated.View style={arrowAnimatedStyle}>
            <Text style={[styles.arrow, { color: textColor }]}>▼</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* 折叠状态下的滚动预览 */}
        {!isExpanded && (
          <View style={styles.previewContainer}>
            <MarqueePreview
              content={content}
              isStreaming={isStreaming || false}
              textColor={textColor}
            />
          </View>
        )}

        {/* 思考内容区域(可展开/折叠) */}
        {isExpanded && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            layout={LinearTransition.duration(300)}
          >
            <View style={styles.content}>
              <MarkdownRenderer content={content} />
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 0.7,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  spinner: {
    marginRight: 10,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  title: {
    flexGrow: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 14,
    marginLeft: 8,
  },
  previewContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  previewText: {
    fontSize: 13,
  },
  content: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
