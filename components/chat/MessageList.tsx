/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '@/hooks/use-messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import type { Attachment } from '@/storage/core';

export function MessageList({ conversationId }: { conversationId: string | null }) {
  const theme = useTheme();
  const { items } = useMessages(conversationId ?? null, 50);
  const scrollViewRef = useRef<ScrollView>(null);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});

  // 自动滚动到最新消息
  useEffect(() => {
    if (items.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [items.length]);

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

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        items.length === 0 ? styles.contentContainerEmpty : styles.contentContainerWithMessages
      ]}
    >
      {/* 空状态欢迎提示 */}
      {(items.length === 0) && (
        <View style={styles.emptyStateContainer}>
          <Text
            variant="bodyLarge"
            style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}
          >
            新的对话已开始，幽浮喵是一个乐于助帮手，提供快速这道问答服务。浮浮酱会很认真服务您呢♪ (´▽`)
          </Text>
        </View>
      )}

      {/* 消息列表 */}
      {items.length > 0 && (
        <View style={styles.messagesContainer}>
          {items.map((m) => (
            <MessageBubble
              key={m.id}
              content={m.text ?? ''}
              isUser={m.role === 'user'}
              status={m.status}
              timestamp={new Date(m.createdAt).toLocaleTimeString()}
              attachments={attachmentsMap[m.id] || []}
            />
          ))}
        </View>
      )}
    </ScrollView>
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
  contentContainerWithMessages: {
    paddingVertical: 16,
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
