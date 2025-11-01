/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 显示示例消息（静态数据）
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';

// 示例消息数据
const EXAMPLE_MESSAGES = [
  {
    id: '1',
    content: '你好！我是 AetherLink AI 助手，很高兴为您服务 😊',
    isUser: false,
    timestamp: '10:00',
  },
  {
    id: '2',
    content: '你能帮我做什么？',
    isUser: true,
    timestamp: '10:01',
  },
  {
    id: '3',
    content: '我可以帮您：\n\n1. 回答问题和提供信息\n2. 进行创意写作和内容生成\n3. 代码编写和调试\n4. 数据分析和总结\n5. 语言翻译\n\n请告诉我您需要什么帮助！',
    isUser: false,
    timestamp: '10:01',
  },
  {
    id: '4',
    content: '太好了！我想了解一下 React Native 的最佳实践',
    isUser: true,
    timestamp: '10:02',
  },
];

export function MessageList() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* TODO: 实现消息数据加载逻辑 */}
      {/* TODO: 实现下拉刷新加载更多消息 */}
      {/* TODO: 实现自动滚动到底部 */}

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

      {/* 占位提示 */}
      <View style={styles.todoHint}>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          💡 TODO: 加载实际消息数据
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  todoHint: {
    padding: 16,
    alignItems: 'center',
  },
});
