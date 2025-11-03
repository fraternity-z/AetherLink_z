/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React, { useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '@/hooks/use-messages';

export function MessageList({ conversationId }: { conversationId: string | null }) {
  const theme = useTheme();
  const { items } = useMessages(conversationId ?? null, 50);
  const scrollViewRef = useRef<ScrollView>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (items.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [items.length]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    flex: 1,
    width: '100%',
  },
});
