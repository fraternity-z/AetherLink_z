/**
 * 📝 Markdown 渲染组件
 *
 * 功能：
 * - 渲染基础 Markdown 语法（标题、列表、链接、粗体、斜体等）
 * - 支持代码块和语法高亮
 * - 适配应用主题（明暗模式）
 * - 检测和分离数学公式内容
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Markdown from 'react-native-marked';
import { logger } from '@/utils/logger';
import { useMarkdownRenderer } from './useMarkdownRenderer';

// 内容解析结果类型
interface ParsedContent {
  hasMath: boolean;
  markdownContent: string;
  mathFragments: {
    id: string;
    formula: string;
    isInline: boolean;
  }[];
}

// 检测和分离数学公式的正则表达式
const MATH_PATTERNS = {
  // 块级公式：$$...$$
  block: /\$\$([\s\S]*?)\$\$/g,
  // 行内公式：$...$（非贪婪匹配，避免与块级冲突）
  inline: /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g,
};

export interface MarkdownRendererProps {
  content: string;
  onMathDetected?: (mathFragments: ParsedContent['mathFragments']) => void;
}

/**
 * 解析内容，分离数学公式和 Markdown 内容
 */
export function parseContentWithMath(content: string): ParsedContent {
  const mathFragments: ParsedContent['mathFragments'] = [];
  let processedContent = content;
  let blockIndex = 0;
  let inlineIndex = 0;

  // 首先处理块级公式（$$...$$）
  processedContent = processedContent.replace(MATH_PATTERNS.block, (match, formula) => {
    const id = `math-block-${blockIndex++}`;
    mathFragments.push({
      id,
      formula: formula.trim(),
      isInline: false,
    });
    return `{{MATH_${id}}}`;
  });

  // 然后处理行内公式（$...$）
  processedContent = processedContent.replace(MATH_PATTERNS.inline, (match, formula) => {
    const id = `math-inline-${inlineIndex++}`;
    mathFragments.push({
      id,
      formula: formula.trim(),
      isInline: true,
    });
    return `{{MATH_${id}}}`;
  });

  return {
    hasMath: mathFragments.length > 0,
    markdownContent: processedContent,
    mathFragments,
  };
}


/**
 * Markdown 渲染组件
 */
export function MarkdownRenderer({ content, onMathDetected }: MarkdownRendererProps) {
  const theme = useTheme();
  const isDark = theme.dark;

  // 解析数学公式
  const parsedContent = useMemo(() => {
    return parseContentWithMath(content);
  }, [content]);

  // 回调数学公式检测结果
  React.useEffect(() => {
    if (onMathDetected && parsedContent.hasMath) {
      onMathDetected(parsedContent.mathFragments);
    }
  }, [onMathDetected, parsedContent.hasMath, parsedContent.mathFragments]);

  // 获取自定义渲染器
  const { renderer } = useMarkdownRenderer(isDark);

  // 最终要渲染的内容
  const markdownContent = parsedContent.hasMath ? parsedContent.markdownContent : content;

  // 如果没有内容，返回空
  if (!markdownContent || markdownContent.trim() === '') {
    return null;
  }

  // 主题颜色配置（使用更柔和的颜色）
  const colors = useMemo(() => ({
    code: theme.colors.surfaceVariant,
    link: theme.colors.primary,
    // 使用柔和的文字颜色，避免过于刺眼
    text: isDark ? '#f9f9f9' : '#202020',
    border: theme.colors.outline,
  }), [theme.colors, isDark]);

  logger.info('[MarkdownRenderer] Rendering', {
    contentLength: markdownContent.length,
    hasMath: parsedContent.hasMath,
    isDark
  });

  // 使用 react-native-marked 渲染
  return (
    <View style={styles.container}>
      <Markdown
        theme={{ colors }}
        value={markdownContent}
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
    // 不占满父容器，随内容自适应高度
    width: '100%',
    flexShrink: 1,
  },
});
