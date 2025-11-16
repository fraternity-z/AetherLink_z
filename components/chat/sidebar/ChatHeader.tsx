/**
 * 💬 聊天页顶部导航栏组件
 *
 * 功能：
 * - 左侧：菜单按钮（打开侧边栏）
 * - 中间：当前助手名称和图标
 * - 背景色与主页面保持一致
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Appbar, useTheme, Text } from 'react-native-paper';
import { AssistantsRepository } from '@/storage/repositories/assistants';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { Assistant } from '@/types/assistant';
import { appEvents, AppEvents } from '@/utils/events';

interface ChatHeaderProps {
  onMenuPress?: () => void;
  onTopicsPress?: () => void;
  onModelPickerPress?: () => void;
}

export function ChatHeader({ onMenuPress, onTopicsPress, onModelPickerPress }: ChatHeaderProps) {
  const theme = useTheme();
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  // 加载当前助手信息
  useEffect(() => {
    const loadCurrentAssistant = async () => {
      const settings = SettingsRepository();
      const currentId = (await settings.get<string>(SettingKey.CurrentAssistantId)) ?? 'default';

      const repo = AssistantsRepository();
      const assistant = await repo.getById(currentId);
      setCurrentAssistant(assistant || null);
    };

    loadCurrentAssistant();

    // 监听助手切换事件
    const handleAssistantChanged = () => {
      loadCurrentAssistant();
    };

    appEvents.on(AppEvents.ASSISTANT_CHANGED, handleAssistantChanged);

    return () => {
      appEvents.off(AppEvents.ASSISTANT_CHANGED, handleAssistantChanged);
    };
  }, []);

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Action
        icon="menu"
        onPress={() => {
          onMenuPress?.();
        }}
      />
      <Appbar.Content
        title={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>
              {currentAssistant?.emoji || '🤖'}
            </Text>
            <Text variant="titleMedium">
              {currentAssistant?.name || '助手'}
            </Text>
          </View>
        }
      />
      <Appbar.Action
        icon="tune-variant"
        onPress={() => onModelPickerPress?.()}
        accessibilityLabel="模型选择器"
      />
      <Appbar.Action
        icon="message-text-outline"
        onPress={() => {
          onTopicsPress?.();
        }}
        accessibilityLabel="话题列表"
      />
    </Appbar.Header>
  );
}
