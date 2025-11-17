/**
 * 📝 Markdown 自定义渲染器 Hook
 *
 * 功能：
 * - 提供自定义的 Markdown Renderer（基于 react-native-marked）
 * - 重写代码块渲染，集成语法高亮
 * - 支持明暗主题适配
 */

import React, { useMemo, ReactNode } from 'react';
import { Text } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import type { RendererInterface } from 'react-native-marked';
import { Renderer } from 'react-native-marked';
import { MarkdownCode } from './MarkdownCode';
import { logger } from '@/utils/logger';

/**
 * 自定义 Markdown 渲染器类
 */
class CustomRenderer extends Renderer implements RendererInterface {
  private isDark: boolean;

  constructor(isDark: boolean) {
    super();
    this.isDark = isDark;
  }

  /**
   * 重写代码块渲染
   */
  code(text: string, language?: string, containerStyle?: ViewStyle, textStyle?: TextStyle): ReactNode {
    logger.info('[CustomRenderer] Rendering code block', {
      language: language || 'text',
      textLength: text.length
    });

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
    // 行内代码的背景色和文字颜色
    const backgroundColor = this.isDark
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.03)';
    const color = this.isDark ? '#5900ffff' : '#c45ae7ff'; // 使用绿色突出显示

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
}

/**
 * useMarkdownRenderer Hook
 *
 * @param isDark - 是否为深色主题
 * @returns 自定义 Renderer 实例
 */
export function useMarkdownRenderer(isDark: boolean) {
  const renderer = useMemo(() => {
    logger.info('[useMarkdownRenderer] Creating CustomRenderer', { isDark });
    return new CustomRenderer(isDark);
  }, [isDark]);

  return { renderer };
}
