/**
 * 💡 思考链(Thinking Chain)组件
 *
 * 用于显示 AI 模型的思考过程(仅支持推理模型如 OpenAI o1/o3, DeepSeek R1 等)
 *
 * 功能特性:
 * - 默认折叠状态,可展开查看完整思考过程
 * - 显示思考耗时统计
 * - 支持 Markdown 渲染思考内容
 * - 流畅的展开/折叠动画
 * - 自适应深色/浅色主题
 *
 * 创建日期: 2025-11-08
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MixedRenderer } from './MixedRenderer';

export interface ThinkingBlockProps {
  content: string;         // 思考过程内容
  durationMs: number;      // 思考耗时(毫秒)
  isExpanded?: boolean;    // 是否默认展开(默认 false)
  onToggle?: () => void;   // 展开/折叠回调
}

/**
 * 格式化耗时(毫秒 → 秒,保留一位小数)
 */
function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(1);
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  durationMs,
  isExpanded: initialExpanded = false,
  onToggle,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  // 动画样式(展开/折叠)
  const animatedContentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(isExpanded ? 10000 : 0, { duration: 300 }),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 200 }),
    overflow: 'hidden',
  }));

  // 主题颜色
  const backgroundColor = theme.dark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = theme.dark ? '#444' : '#e0e0e0';
  const textColor = theme.colors.onSurface;
  const iconColor = theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {/* 标题栏(始终可见,可点击展开/折叠) */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* 灯泡图标 */}
        <Text style={[styles.icon, { color: iconColor }]}>💡</Text>

        {/* 标题文本 */}
        <Text style={[styles.title, { color: textColor }]}>
          已深度思考（用时 {formatDuration(durationMs)} 秒）
        </Text>

        {/* 展开/折叠箭头 */}
        <Text style={[styles.arrow, { color: textColor }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* 思考内容区域(可展开/折叠) */}
      <Animated.View style={animatedContentStyle}>
        <View style={styles.content}>
          <MixedRenderer content={content} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
