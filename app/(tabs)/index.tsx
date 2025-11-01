/**
 * 💬 聊天主界面
 *
 * 功能：
 * - 显示聊天消息列表
 * - 提供输入框发送消息
 * - 顶部导航栏（菜单、标题、设置）
 * - Material Design 风格
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

export default function ChatScreen() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuPress = () => {
    // TODO: 实现侧边栏打开逻辑
    setDrawerOpen(!drawerOpen);
    console.log('切换侧边栏状态:', !drawerOpen);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <ChatHeader onMenuPress={handleMenuPress} />

      {/* 消息列表 */}
      <MessageList />

      {/* 底部输入框 */}
      <ChatInput />

      {/* TODO: 实现侧边栏组件（ChatDrawer） */}
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
