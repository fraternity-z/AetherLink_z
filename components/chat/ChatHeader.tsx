/**
 * 💬 聊天页顶部导航栏组件
 *
 * 功能：
 * - 左侧：菜单按钮（打开侧边栏）
 * - 中间：应用标题
 * - 右侧：设置按钮（跳转设置页）
 */

import React from 'react';
import { Appbar } from 'react-native-paper';
import { router } from 'expo-router';

interface ChatHeaderProps {
  onMenuPress?: () => void;
}

export function ChatHeader({ onMenuPress }: ChatHeaderProps) {
  return (
    <Appbar.Header elevated>
      <Appbar.Action
        icon="menu"
        onPress={() => {
          // TODO: 实现侧边栏打开逻辑
          console.log('打开侧边栏');
          onMenuPress?.();
        }}
      />
      <Appbar.Content title="AetherLink" />
      <Appbar.Action
        icon="cog"
        onPress={() => {
          // 跳转到设置页面
          router.push('/settings' as any);
        }}
      />
    </Appbar.Header>
  );
}
