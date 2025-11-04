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
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from 'react-native-paper';
import RenderHtml from 'react-native-render-html';
import { marked } from 'marked';

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
  const { width } = useWindowDimensions();

  const parsedContent = useMemo(() => {
    return parseContentWithMath(content);
  }, [content]);

  // 回调数学公式检测结果
  React.useEffect(() => {
    if (onMathDetected && parsedContent.hasMath) {
      onMathDetected(parsedContent.mathFragments);
    }
  }, [onMathDetected, parsedContent.hasMath, parsedContent.mathFragments]);

  // 将 Markdown 转换为 HTML
  const htmlContent = useMemo(() => {
    try {
      const result = marked.parse(parsedContent.hasMath ? parsedContent.markdownContent : content);
      // marked.parse 可能返回 Promise，但在同步模式下返回字符串
      return typeof result === 'string' ? result : content;
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content;
    }
  }, [content, parsedContent.hasMath, parsedContent.markdownContent]);

  // 定义 HTML 标签样式
  const tagsStyles = useMemo(() => ({
    body: {
      color: theme.colors.onSurface,
    },
    p: {
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    h1: {
      color: theme.colors.onSurface,
      fontWeight: 'bold' as const,
      marginBottom: 8,
      marginTop: 16,
    },
    h2: {
      color: theme.colors.onSurface,
      fontWeight: 'bold' as const,
      marginBottom: 6,
      marginTop: 12,
    },
    h3: {
      color: theme.colors.onSurface,
      fontWeight: 'bold' as const,
      marginBottom: 4,
      marginTop: 8,
    },
    code: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'monospace',
      fontSize: 14,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    pre: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.onSurfaceVariant,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: theme.colors.surface,
      borderLeftColor: theme.colors.primary,
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    a: {
      color: theme.colors.primary,
      textDecorationLine: 'underline' as const,
    },
    li: {
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    strong: {
      fontWeight: 'bold' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
  }), [theme.colors]);

  // 如果没有内容，返回空
  if (!htmlContent || htmlContent.trim() === '') {
    return null;
  }

  // 渲染 HTML 内容
  return (
    <View style={styles.container}>
      <RenderHtml
        contentWidth={width}
        source={{ html: htmlContent }}
        tagsStyles={tagsStyles}
        baseStyle={{
          color: theme.colors.onSurface,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});