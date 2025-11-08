/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, View, StyleSheet, ListRenderItem } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '@/hooks/use-messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import type { Attachment, Message } from '@/storage/core';
import { appEvents, AppEvents } from '@/utils/events';

export function MessageList({ conversationId }: { conversationId: string | null }) {
  const theme = useTheme();
  const { items, reload } = useMessages(conversationId ?? null, 50);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});

  // 监听消息清空事件，立即刷新列表
  useEffect(() => {
    const handleMessagesCleared = (clearedConversationId: string) => {
      if (clearedConversationId === conversationId) {
        // 立即重新加载消息列表
        reload();
      }
    };

    appEvents.on(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);

    return () => {
      appEvents.off(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);
    };
  }, [conversationId, reload]);

  // FlatList 数据：倒序以配合 inverted 列表（最新在底部）
  const data = useMemo(() => [...items].reverse(), [items]);

  // 批量加载当前页消息的附件（减少查询次数）
  useEffect(() => {
    (async () => {
      try {
        const ids = items.map(m => m.id);
        if (ids.length === 0) {
          setAttachmentsMap({});
          return;
        }
        const map = await AttachmentRepository.getAttachmentsByMessageIds(ids);
        setAttachmentsMap(map);
      } catch (e) {
        console.warn('[MessageList] load attachments error', e);
      }
    })();
  }, [items.map(m => m.id).join('|')]);

  const renderItem: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble
      content={item.text ?? ''}
      isUser={item.role === 'user'}
      status={item.status}
      timestamp={new Date(item.createdAt).toLocaleTimeString()}
      attachments={attachmentsMap[item.id] || []}
    />
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      inverted
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={items.length === 0 ? styles.contentContainerEmpty : styles.contentContainerInverted}
      ListEmptyComponent={
        <View style={styles.emptyStateContainer}>
          <Text
            variant="bodyLarge"
            style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}
          >
            新对话已开启。幽浮喵是一位乐于助人的助手，为您提供快捷高效的问答服务。浮浮酱将认真为您服务哦♪ (´▽`)
          </Text>
        </View>
      }
      // 虚拟化与性能参数
      windowSize={5}
      initialNumToRender={20}
      maxToRenderPerBatch={12}
      removeClippedSubviews
      maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // inverted 列表中，为底部输入框预留空间应使用 paddingTop
  contentContainerInverted: {
    paddingTop: 170, // 为输入框预留空间（输入框高度约 100-150px + 额外边距）
    paddingBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  messagesContainer: {
    width: '100%',
  },
});
