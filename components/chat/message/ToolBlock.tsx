/**
 * 🔧 工具块组件
 *
 * 功能：
 * - 显示 MCP 工具调用的状态和结果
 * - 支持折叠/展开查看详细结果
 * - 区分不同状态：pending, success, error
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import type { MessageBlock } from '@/storage/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ToolBlockProps {
  block: MessageBlock;
}

export function ToolBlock({ block }: ToolBlockProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (block.type !== 'TOOL') {
    return null;
  }

  const isPending = block.status === 'PENDING';
  const isSuccess = block.status === 'SUCCESS';
  const isError = block.status === 'ERROR';

  // 状态图标
  const getStatusIcon = () => {
    if (isPending) return <ActivityIndicator size={16} color={theme.colors.primary} />;
    if (isSuccess) return <MaterialCommunityIcons name="wrench" size={16} color={theme.colors.primary} />;
    if (isError) return <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.error} />;
    return null;
  };

  // 格式化工具参数
  const formatArgs = () => {
    if (!block.toolArgs) return '';
    try {
      const args = typeof block.toolArgs === 'string' ? JSON.parse(block.toolArgs) : block.toolArgs;
      return JSON.stringify(args, null, 2);
    } catch {
      return String(block.toolArgs);
    }
  };

  const cardBackground = theme.dark ? 'rgba(32, 32, 36, 0.65)' : 'rgba(255, 255, 255, 0.82)';
  const codeBackground = theme.dark ? 'rgba(18, 18, 20, 0.65)' : 'rgba(255, 255, 255, 0.9)';
  const codeBorderColor = theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
  const shadowColor = theme.colors?.shadow ?? 'rgba(0, 0, 0, 0.45)';

  return (
    <Card
      style={[
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor: isError ? theme.colors.error : theme.colors.outline,
          shadowColor,
        }
      ]}
      mode="outlined"
    >
      {/* 标题栏：工具名称 + 状态图标 + 折叠按钮 */}
      <Card.Title
        title={block.toolName || '未知工具'}
        titleStyle={[styles.title, { color: theme.colors.onSurface }]}
        left={() => <View style={styles.statusIcon}>{getStatusIcon()}</View>}
        right={() => (
          <IconButton
            icon={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            onPress={() => setExpanded(!expanded)}
            iconColor={theme.colors.onSurfaceVariant}
          />
        )}
        style={styles.titleContainer}
      />

      {/* 折叠内容：工具参数和结果 */}
      {expanded && (
        <Card.Content style={styles.content}>
          {/* 工具参数 */}
          {block.toolArgs && (
            <View style={styles.section}>
              <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                参数：
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.codeText,
                  { color: theme.colors.onSurface, backgroundColor: codeBackground, borderColor: codeBorderColor },
                ]}
              >
                {formatArgs()}
              </Text>
            </View>
          )}

          {/* 工具结果 */}
          {block.content && (
            <View style={styles.section}>
              <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                结果：
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.codeText,
                  { color: theme.colors.onSurface, backgroundColor: codeBackground, borderColor: codeBorderColor },
                ]}
              >
                {block.content}
              </Text>
            </View>
          )}

          {/* 状态信息 */}
          <View style={styles.statusRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              状态: {isPending ? '执行中' : isSuccess ? '成功' : '失败'}
            </Text>
          </View>
        </Card.Content>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  titleContainer: {
    paddingVertical: 4,
    minHeight: 40,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  statusIcon: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  statusRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
