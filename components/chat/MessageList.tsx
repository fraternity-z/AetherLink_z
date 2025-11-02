/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';

// 示例消息数据（空数组表示新对话）
const EXAMPLE_MESSAGES: any[] = [];

export function MessageList() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 空状态欢迎提示 */}
      {EXAMPLE_MESSAGES.length === 0 && (
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
      {EXAMPLE_MESSAGES.length > 0 && (
        <View style={styles.messagesContainer}>
          {EXAMPLE_MESSAGES.map((message) => (
            <MessageBubble
              key={message.id}
              content={message.content}
              isUser={message.isUser}
              timestamp={message.timestamp}
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
