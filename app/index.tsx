/**
 * 💬 聊天主界面（作为根页面，无底部Tabs）
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export default function ChatScreen() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuPress = () => {
    setDrawerOpen((v) => !v);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <ChatHeader onMenuPress={handleMenuPress} />

      {/* 消息列表 */}
      <MessageList />

      {/* 底部输入框 */}
      <ChatInput />

      {/* 侧边栏 */}
      <ChatSidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
