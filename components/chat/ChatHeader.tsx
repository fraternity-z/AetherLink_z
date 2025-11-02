/**
 * 💬 聊天页顶部导航栏组件
 *
 * 功能：
 * - 左侧：菜单按钮（打开侧边栏）
 * - 中间：应用标题
 * - 背景色与主页面保持一致
 */

import React from 'react';
import { Appbar, useTheme } from 'react-native-paper';

interface ChatHeaderProps {
  onMenuPress?: () => void;
}

export function ChatHeader({ onMenuPress }: ChatHeaderProps) {
  const theme = useTheme();

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Action
        icon="menu"
        onPress={() => {
          // TODO: 实现侧边栏打开逻辑
          console.log('打开侧边栏');
          onMenuPress?.();
        }}
      />
      <Appbar.Content title="新的对话" />
    </Appbar.Header>
  );
}
