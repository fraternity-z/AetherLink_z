/**
 * 💬 聊天主界面（作为根页面，无底部Tabs）
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput, ChatInputRef } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useLocalSearchParams } from 'expo-router';
import { TopicsSidebar } from '@/components/chat/TopicsSidebar';
import { ModelPickerDialog } from '@/components/chat/ModelPickerDialog';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { appEvents, AppEvents } from '@/utils/events';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.bottom : 0;
  const theme = useTheme();
  const chatInputRef = useRef<ChatInputRef>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quickPhrasesEnabled, setQuickPhrasesEnabled] = useState(true);
  const params = useLocalSearchParams<{ cid?: string }>();
  const settingsRepo = useMemo(() => SettingsRepository(), []);

  useEffect(() => {
    (async () => {
      const stored = await settingsRepo.get<boolean>(SettingKey.QuickPhrasesEnabled);
      if (stored === null) {
        setQuickPhrasesEnabled(true);
      } else {
        setQuickPhrasesEnabled(stored);
      }
    })();
  }, [settingsRepo]);

  useEffect(() => {
    const handleSettingChange = (enabled: boolean) => {
      setQuickPhrasesEnabled(enabled);
    };
    appEvents.on(AppEvents.QUICK_PHRASES_SETTING_CHANGED, handleSettingChange);
    return () => {
      appEvents.off(AppEvents.QUICK_PHRASES_SETTING_CHANGED, handleSettingChange);
    };
  }, []);

  const handleMenuPress = () => {
    setDrawerOpen((v) => !v);
  };

  const openQuickPhrasePicker = useCallback(() => {
    if (!quickPhrasesEnabled) {
      return;
    }
    chatInputRef.current?.openPhrasePicker();
  }, [quickPhrasesEnabled]);

  // 双击手势处理器
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(openQuickPhrasePicker)();
      }
    });

  useEffect(() => {
    if (params?.cid && typeof params.cid === 'string') {
      setConversationId(params.cid);
    }
  }, [params?.cid]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* 顶部导航栏 */}
        <ChatHeader
          onMenuPress={handleMenuPress}
          onTopicsPress={() => setTopicsOpen(true)}
          onModelPickerPress={() => setModelPickerOpen(true)}
        />

        {/* 消息列表 - 占满整个屏幕，支持双击打开快捷短语 */}
        <GestureDetector gesture={doubleTapGesture}>
          <View style={styles.messagesContainer}>
            <MessageList conversationId={conversationId} />
          </View>
        </GestureDetector>

        {/* 悬浮输入框 - 直接绝对定位在底部 */}
        <View style={styles.inputWrapper}>
          <ChatInput
            ref={chatInputRef}
            conversationId={conversationId}
            onConversationChange={setConversationId}
          />
        </View>

        {/* 侧边栏 */}
        <ChatSidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <TopicsSidebar
          visible={topicsOpen}
          onClose={() => setTopicsOpen(false)}
          onSelectTopic={(id) => setConversationId(id)}
          currentTopicId={conversationId || undefined}
        />
        <ModelPickerDialog visible={modelPickerOpen} onDismiss={() => setModelPickerOpen(false)} />
        {/* TODO: 实现消息上下文菜单（长按操作） */}
        {/* TODO: 实现消息加载更多功能 */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  inputWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
