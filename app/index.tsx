/**
 * 💬 聊天主界面（作为根页面，无底部Tabs）
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { router, useLocalSearchParams } from 'expo-router';
import { TopicsSidebar } from '@/components/chat/TopicsSidebar';
import { ModelPickerDialog } from '@/components/chat/ModelPickerDialog';

export default function ChatScreen() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const params = useLocalSearchParams<{ cid?: string }>();

  const handleMenuPress = () => {
    setDrawerOpen((v) => !v);
  };

  useEffect(() => {
    if (params?.cid && typeof params.cid === 'string') {
      setConversationId(params.cid);
    }
  }, [params?.cid]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <ChatHeader
        onMenuPress={handleMenuPress}
        onTopicsPress={() => setTopicsOpen(true)}
        onModelPickerPress={() => setModelPickerOpen(true)}
      />

      {/* 消息列表 */}
      <MessageList conversationId={conversationId} />

      {/* 底部输入框 */}
      <ChatInput conversationId={conversationId} onConversationChange={setConversationId} />

      {/* 侧边栏 */}
      <ChatSidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TopicsSidebar
        visible={topicsOpen}
        onClose={() => setTopicsOpen(false)}
        onSelectTopic={(id) => setConversationId(id)}
      />
      <ModelPickerDialog visible={modelPickerOpen} onDismiss={() => setModelPickerOpen(false)} />
      {/* TODO: 实现消息上下文菜单（长按操作） */}
      {/* TODO: 实现消息加载更多功能 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
