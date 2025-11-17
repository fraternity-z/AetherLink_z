/**
 * 📝 代码块组件
 *
 * 功能：
 * - 支持代码语法高亮
 * - 提供代码复制功能
 * - 显示编程语言标识
 * - 自适应明暗主题
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CodeHighlighter from 'react-native-code-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import * as Clipboard from 'expo-clipboard';
import { logger } from '@/utils/logger';

export interface MarkdownCodeProps {
  /** 代码内容 */
  text: string;
  /** 编程语言 */
  language?: string;
  /** 是否为深色主题 */
  isDark: boolean;
}

/**
 * 代码块组件
 */
export function MarkdownCode({ text, language = 'text', isDark }: MarkdownCodeProps) {
  const theme = useTheme();

  // 复制代码到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('✅ 已复制', '代码已复制到剪贴板');
      logger.info('Code copied to clipboard', { language, length: text.length });
    } catch (error) {
      logger.error('Failed to copy code:', error);
      Alert.alert('❌ 复制失败', '无法复制代码到剪贴板');
    }
  }, [text, language]);

  // 获取语法高亮主题
  const syntaxTheme = isDark ? atomOneDark : atomOneLight;

  // 容器背景色（半透明）
  const containerBg = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.container, { backgroundColor: containerBg, borderColor }]}>
      {/* 顶部工具栏 */}
      <View style={[styles.toolbar, { borderBottomColor: borderColor }]}>
        <View style={styles.languageContainer}>
          <MaterialCommunityIcons
            name="code-tags"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelMedium"
            style={[styles.languageText, { color: theme.colors.onSurfaceVariant }]}
          >
            {language.toUpperCase()}
          </Text>
        </View>
        <IconButton
          icon="content-copy"
          size={16}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={handleCopy}
          style={styles.copyButton}
        />
      </View>

      {/* 代码内容 */}
      {/* @ts-ignore - CodeHighlighter 类型定义不完整，但实际支持 children */}
      <CodeHighlighter
        customStyle={{
          backgroundColor: 'transparent',
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 8,
        }}
        scrollViewProps={{
          contentContainerStyle: {
            backgroundColor: 'transparent',
          },
          showsHorizontalScrollIndicator: false,
        }}
        textStyle={{
          fontSize: 12,
          fontFamily: 'monospace',
        }}
        hljsStyle={syntaxTheme}
        language={language}
        wrapLines={true}
        wrapLongLines={true}
        lineProps={{ style: { flexWrap: 'wrap' } }}
      >
        {text}
      </CodeHighlighter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageText: {
    fontWeight: '600',
  },
  copyButton: {
    margin: 0,
  },
});
