/**
 * 💬 消息底部工具栏组件
 *
 * 功能：
 * - 提供快捷操作按钮（复制、重新生成、分享）
 * - 显示 Token 使用统计
 * - 替代传统的长按菜单，提升交互效率
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, useTheme, IconButton as PaperIconButton } from 'react-native-paper';
import type { Message } from '@/storage/core';
import { cn } from '@/utils/classnames';

interface MessageFooterProps {
  message: Message;
  isUser: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
  onShare: () => void;
  copyState?: 'idle' | 'success';
  shareState?: 'idle' | 'success';
}

function MessageFooterComponent({
  message,
  isUser,
  onCopy,
  onRegenerate,
  onShare,
  copyState = 'idle',
  shareState = 'idle',
}: MessageFooterProps) {
  const theme = useTheme();

  // 提取 Token 使用统计
  const usage = message.extra?.usage;
  const hasUsage = usage && (usage.inputTokens || usage.outputTokens);

  // 仅助手消息显示工具栏
  if (isUser) {
    return null;
  }

  return (
    <View className="px-3 pb-2 pt-1">
      <View className="flex-row items-center justify-between">
        {/* 左侧按钮组 */}
        <View className="flex-row gap-4">
          {/* 复制按钮 - 成功时显示勾选图标 */}
          <Pressable
            onPress={onCopy}
            hitSlop={10}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            })}
          >
            <PaperIconButton
              icon={copyState === 'success' ? 'check' : 'content-copy'}
              size={18}
              iconColor={
                copyState === 'success'
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
              style={{ margin: 0 }}
            />
          </Pressable>

          {/* 重新生成按钮（仅助手消息） */}
          {!isUser && onRegenerate && (
            <Pressable
              onPress={onRegenerate}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
              })}
            >
              <PaperIconButton
                icon="refresh"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                style={{ margin: 0 }}
              />
            </Pressable>
          )}

          {/* 分享按钮 - 成功时显示勾选图标 */}
          <Pressable
            onPress={onShare}
            hitSlop={10}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            })}
          >
            <PaperIconButton
              icon={shareState === 'success' ? 'check' : 'share-variant'}
              size={18}
              iconColor={
                shareState === 'success'
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
              style={{ margin: 0 }}
            />
          </Pressable>
        </View>

        {/* 右侧 Token 统计 */}
        {hasUsage && (
          <View className="flex-row gap-2">
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 11,
              }}
            >
              ↑{usage.inputTokens || 0}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 11,
              }}
            >
              ↓{usage.outputTokens || 0}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 11,
              }}
            >
              Σ{(usage.inputTokens || 0) + (usage.outputTokens || 0)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// 🚀 性能优化：避免不必要的重新渲染
function arePropsEqual(
  prev: MessageFooterProps,
  next: MessageFooterProps
): boolean {
  // 比较消息 ID（消息内容变化会导致 ID 变化）
  if (prev.message.id !== next.message.id) {
    return false;
  }

  // 比较 Token 使用统计
  const prevUsage = prev.message.extra?.usage;
  const nextUsage = next.message.extra?.usage;
  if (
    prevUsage?.inputTokens !== nextUsage?.inputTokens ||
    prevUsage?.outputTokens !== nextUsage?.outputTokens
  ) {
    return false;
  }

  // ✨ 比较图标状态（复制、分享）
  if (
    prev.copyState !== next.copyState ||
    prev.shareState !== next.shareState
  ) {
    return false;
  }

  // 比较回调函数引用（通常不需要比较，除非回调逻辑变化）
  // 这里为了性能，我们假设回调不会频繁变化

  // 所有关键属性相同，不需要重新渲染
  return true;
}

export const MessageFooter = React.memo(MessageFooterComponent, arePropsEqual);
export default MessageFooter;
