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
import { ThinkingChainRepository } from '@/storage/repositories/thinking-chains';
import type { Attachment, Message, ThinkingChain } from '@/storage/core';
import { appEvents, AppEvents } from '@/utils/events';

export function MessageList({ conversationId }: { conversationId: string | null }) {
  const theme = useTheme();
  const { items, reload } = useMessages(conversationId ?? null, 50);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  const [thinkingChainsMap, setThinkingChainsMap] = useState<Record<string, ThinkingChain>>({});
  const [thinkingRefreshTick, setThinkingRefreshTick] = useState(0);

  // 监听消息清空事件，立即刷新列表
  useEffect(() => {
    const handleMessagesCleared = (clearedConversationId: string) => {
      if (clearedConversationId === conversationId) {
        // 立即重新加载消息列表
        reload();
      }
    };

    const handleMessageChanged = () => {
      // 消息变化：重新加载消息，并强制刷新一次思考链
      reload();
      setThinkingRefreshTick((x) => x + 1);
    };

    appEvents.on(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);
    appEvents.on(AppEvents.MESSAGE_CHANGED, handleMessageChanged);

    return () => {
      appEvents.off(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);
      appEvents.off(AppEvents.MESSAGE_CHANGED, handleMessageChanged);
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

  // 批量加载思考链数据（仅加载AI消息的思考链）
  // 注意：思考链是在助手消息创建后才保存，因此仅监听 id 列表不足以触发刷新。
  // 这里用 id + status + 文本长度 作为变化键，确保在流式更新或状态改变后重新拉取思考链。
  useEffect(() => {
    (async () => {
      try {
        const ids = items.map(m => m.id);
        if (ids.length === 0) {
          setThinkingChainsMap({});
          return;
        }
        const map = await ThinkingChainRepository.getThinkingChainsByMessageIds(ids);

        // 将 Map 转换为普通对象
        const objMap: Record<string, ThinkingChain> = {};
        map.forEach((value, key) => {
          objMap[key] = value;
        });
        setThinkingChainsMap(objMap);
      } catch (e) {
        console.error('[MessageList] load thinking chains error', e);
      }
    })();
  }, [
    items.map(m => `${m.id}:${m.status}:${(m.text ?? '').length}`).join('|'),
    thinkingRefreshTick,
  ]);

  const renderItem: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble
      content={item.text ?? ''}
      isUser={item.role === 'user'}
      status={item.status}
      timestamp={new Date(item.createdAt).toLocaleTimeString()}
      attachments={attachmentsMap[item.id] || []}
      thinkingChain={thinkingChainsMap[item.id] || null}
      modelId={item.extra?.model} // 传递模型 ID
      extra={item.extra} // 传递完整的 extra 数据（用于图片生成等特殊消息）
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
