/**
 * 🎨 混合渲染组件 (Markdown + MathJax)
 *
 * 功能：
 * - 智能分离 Markdown 内容和数学公式
 * - 分别渲染普通文本和数学公式
 * - 保持布局一致性和性能优化
 * - 支持数学公式的缓存机制
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MarkdownRenderer, parseContentWithMath } from './MarkdownRenderer';
import type { MathFormula } from './MathJaxRenderer';
import { MathJaxRenderer } from './MathJaxRenderer';
import { logger } from '@/utils/logger';

export interface MixedRendererProps {
  content: string;
  style?: any;
}

/**
 * 内容片段类型
 */
interface ContentFragment {
  id: string;
  type: 'markdown' | 'math';
  content: string;
  formula?: MathFormula;
}

/**
 * 解析内容为片段序列
 */
function parseContentToFragments(content: string): ContentFragment[] {
  const parsed = parseContentWithMath(content);
  const fragments: ContentFragment[] = [];

  if (!parsed.hasMath) {
    // 纯 Markdown 内容
    fragments.push({
      id: 'md-main',
      type: 'markdown',
      content: content,
    });
  } else {
    // 包含数学公式的混合内容
    let markdownContent = parsed.markdownContent;
    let fragmentIndex = 0;

    // 替换数学公式占位符为片段
    // 修复: 占位 id 包含连字符(如 "math-block-2"), 原先使用 (\w+) 导致匹配中断并残留占位文本。
    // 使用 ([\w-]+) 以正确捕获包含连字符的占位 id。
    const parts = markdownContent.split(/{{MATH_([\w-]+)}}/);

    parts.forEach((part, index) => {
      if (part.startsWith('math-block-') || part.startsWith('math-inline-')) {
        const formula = parsed.mathFragments.find(f => f.id === part);
        if (formula) {
          fragments.push({
            id: `math-${fragmentIndex++}`,
            type: 'math',
            content: '',
            formula: formula,
          });
        } else {
          // 容错：若未找到对应公式，按原文本占位符回退显示，避免内容“消失”
          fragments.push({
            id: `md-${fragmentIndex++}`,
            type: 'markdown',
            content: `{{MATH_${part}}}`,
          });
        }
      } else if (part.trim()) {
        // Markdown 内容片段
        fragments.push({
          id: `md-${fragmentIndex++}`,
          type: 'markdown',
          content: part,
        });
      }
    });
  }

  return fragments;
}

/**
 * 混合渲染组件
 */
export function MixedRenderer({ content, style }: MixedRendererProps) {
  const theme = useTheme();
  const [formulaHeights, setFormulaHeights] = useState<{ [key: string]: number }>({});

  // 解析内容片段
  const fragments = useMemo(() => {
    return parseContentToFragments(content);
  }, [content]);

  // 处理数学公式高度更新
  const handleFormulaHeights = useCallback((heights: { [formulaId: string]: number }) => {
    setFormulaHeights((prev: { [key: string]: number }) => ({ ...prev, ...heights }));
  }, []);

  // 按序渲染，不再单独汇总数学公式

  // 如果没有内容，返回空视图
  if (!content.trim()) {
    return null;
  }

  // 纯 Markdown 内容，直接渲染
  if (fragments.length === 1 && fragments[0].type === 'markdown') {
    return (
      <View style={[styles.container, style]}>
        <MarkdownRenderer content={fragments[0].content} />
      </View>
    );
  }

  // 按顺序渲染（修复：占位符位置的公式被挪到结尾的问题）
  return (
    <View style={[styles.container, style]}>
      {fragments.map(fragment => {
        if (fragment.type === 'markdown') {
          return (
            <View key={fragment.id} style={styles.fragmentContainer}>
              <MarkdownRenderer content={fragment.content} />
            </View>
          );
        }
        // 数学片段：以单条公式渲染，保持相对顺序
        return (
          <View key={fragment.id} style={[styles.mathContainer, fragment.formula?.isInline && styles.inlineMath]}>
            <MathJaxRenderer
              formulas={[fragment.formula!]}
              onComplete={handleFormulaHeights}
              onError={(error) => {
                logger.error('MathJax rendering error:', error);
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 避免在 ScrollView/气泡容器中被拉伸占满可用空间
    // 保持按内容自然高度收缩
    width: '100%',
    flexShrink: 1,
  },
  fragmentContainer: {
    marginVertical: 2,
  },
  mathContainer: {
    marginVertical: 4,
  },
  inlineMath: {
    // 行内公式相邻文本更紧凑一些
    marginVertical: 0,
  },
});
