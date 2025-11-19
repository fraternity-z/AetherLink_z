/**
 * 📝 Markdown 自定义渲染器 Hook
 *
 * 功能：
 * - 提供自定义的 Markdown Renderer（基于 react-native-marked）
 * - 重写代码块渲染，集成语法高亮
 * - 支持明暗主题适配
 * - 集成数学公式渲染 (SVG)
 */

import { logger } from '@/utils/logger';
import React, { ReactNode, useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Text, View } from 'react-native';
import type { RendererInterface } from 'react-native-marked';
import { Renderer } from 'react-native-marked';
import { useTheme } from 'react-native-paper';
import { MarkdownCode } from './MarkdownCode';
import { ExtractMathResult, useMathEquation } from './useMathEquation';

/**
 * 自定义 Markdown 渲染器类
 */
class CustomRenderer extends Renderer implements RendererInterface {
  private isDark: boolean;
  private themeColors: any;
  private extractAllMathEquation: (text: string) => ExtractMathResult[];
  private renderInlineMath: (content: string, key?: string | number) => React.JSX.Element;
  private renderBlockMath: (content: string, key?: string | number) => React.JSX.Element;

  constructor(
    isDark: boolean,
    themeColors: any,
    extractAllMathEquation: (text: string) => ExtractMathResult[],
    renderInlineMath: (content: string, key?: string | number) => React.JSX.Element,
    renderBlockMath: (content: string, key?: string | number) => React.JSX.Element
  ) {
    super();
    this.isDark = isDark;
    this.themeColors = themeColors;
    this.extractAllMathEquation = extractAllMathEquation;
    this.renderInlineMath = renderInlineMath;
    this.renderBlockMath = renderBlockMath;
  }

  /**
   * 重写代码块渲染
   */
  code(text: string, language?: string, containerStyle?: ViewStyle, textStyle?: TextStyle): ReactNode {
    return (
      <MarkdownCode
        key={this.getKey()}
        text={text}
        language={language || 'text'}
        isDark={this.isDark}
      />
    );
  }

  /**
   * 重写行内代码渲染（自定义背景色）
   */
  codespan(text: string): ReactNode {
    const backgroundColor = this.isDark
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.03)';
    const color = this.isDark ? '#5900ffff' : '#c45ae7ff';

    return (
      <Text
        key={this.getKey()}
        style={{
          backgroundColor,
          color,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 5,
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      >
        {text}
      </Text>
    );
  }

  /**
   * 重写段落渲染
   * 使用 View 替代默认可能使用的 Text，以便正确渲染块级公式
   */
  paragraph(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      <View key={this.getKey()} style={[styles, { marginBottom: 8, flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center' }]}>
        {children}
      </View>
    );
  }

  /**
   * 重写文本渲染，处理数学公式
   */
  text(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    if (typeof text === 'string') {
      const result = this.extractAllMathEquation(text);
      const fragmentKey = this.getKey();
      return (
        <React.Fragment key={fragmentKey}>
          {result.map(({ type, content }, index) => {
            if (type === 'block-latex') {
              return this.renderBlockMath(content, `${this.getKey()}-${index}`);
            }
            if (type === 'inline-latex') {
              return this.renderInlineMath(content, `${this.getKey()}-${index}`);
            }
            return (
              <Text
                key={`${this.getKey()}-${index}`}
                style={styles}
              >
                {content}
              </Text>
            );
          })}
        </React.Fragment>
      );
    }
    return <Text key={this.getKey()} style={styles}>{text}</Text>;
  }
}

/**
 * useMarkdownRenderer Hook
 *
 * @param isDark - 是否为深色主题
 * @returns 自定义 Renderer 实例
 */
export function useMarkdownRenderer(isDark: boolean) {
  const theme = useTheme();
  const equationColor = isDark ? theme.colors.onSurface : theme.colors.onSurface;
  
  const { extractAllMathEquation, renderInlineMath, renderBlockMath } = useMathEquation(equationColor);

  const renderer = useMemo(() => {
    logger.info('[useMarkdownRenderer] Creating CustomRenderer with Math support', { isDark });
    return new CustomRenderer(
      isDark,
      theme.colors,
      extractAllMathEquation,
      renderInlineMath,
      renderBlockMath
    );
  }, [isDark, theme.colors, extractAllMathEquation, renderInlineMath, renderBlockMath]);

  return { renderer };
}
