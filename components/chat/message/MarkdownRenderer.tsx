/**
 * 📝 Markdown 渲染组件
 *
 * 功能：
 * - 渲染基础 Markdown 语法（标题、列表、链接、粗体、斜体等）
 * - 支持代码块和语法高亮
 * - 适配应用主题（明暗模式）
 * - 集成数学公式渲染 (SVG)
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-marked';
import { useTheme } from 'react-native-paper';
import { useMarkdownRenderer } from './useMarkdownRenderer';

export interface MarkdownRendererProps {
  content: string;
}

/**
 * Markdown 渲染组件
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const theme = useTheme();
  const isDark = theme.dark;

  // 获取自定义渲染器 (包含数学公式支持)
  const { renderer } = useMarkdownRenderer(isDark);

  // 主题颜色配置
  const colors = React.useMemo(() => ({
    code: theme.colors.surfaceVariant,
    link: theme.colors.primary,
    text: isDark ? '#f9f9f9' : '#202020',
    border: theme.colors.outline,
  }), [theme.colors, isDark]);

  // 如果没有内容，返回空
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Markdown
        theme={{ colors }}
        value={content}
        renderer={renderer}
        flatListProps={{
          scrollEnabled: false,
          nestedScrollEnabled: false,
          showsVerticalScrollIndicator: false,
          style: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexShrink: 1,
  },
});
