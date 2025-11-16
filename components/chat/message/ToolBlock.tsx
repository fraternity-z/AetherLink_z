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

  return (
    <Card
      style={[
        styles.container,
        {
          backgroundColor: theme.dark ? theme.colors.surfaceVariant : '#F5F5F5',
          borderColor: isError ? theme.colors.error : theme.colors.outline,
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
                style={[styles.codeText, { color: theme.colors.onSurface, backgroundColor: theme.dark ? '#1E1E1E' : '#FAFAFA' }]}
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
                style={[styles.codeText, { color: theme.colors.onSurface, backgroundColor: theme.dark ? '#1E1E1E' : '#FAFAFA' }]}
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
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  titleContainer: {
    paddingVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
