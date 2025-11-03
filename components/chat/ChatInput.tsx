/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { CoreMessage } from 'ai';

export function ChatInput({ conversationId, onConversationChange }: { conversationId: string | null; onConversationChange: (id: string) => void; }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // 🎯 优化：动态计算键盘偏移量，适配不同设备（包括刘海屏）
  const keyboardVerticalOffset = Platform.select({
    ios: insets.bottom + 50, // iOS: 底部安全区 + Header 高度
    android: 0, // Android: height 模式不需要偏移
    default: 0,
  });

  const handleSend = async () => {
    if (!message.trim()) return;
    let cid = conversationId;
    if (!cid) {
      const c = await ChatRepository.createConversation('新话题');
      cid = c.id;
      onConversationChange(c.id);
    }

    await MessageRepository.addMessage({ conversationId: cid!, role: 'user', text: message, status: 'sent' });
    const assistant = await MessageRepository.addMessage({ conversationId: cid!, role: 'assistant', text: '', status: 'pending' });

    const controller = new AbortController();
    abortRef.current = controller;

    // 获取聊天设置参数
    const sr = SettingsRepository();
    const temperature = (await sr.get<number>(SettingKey.ChatTemperature)) ?? 0.7;
    const maxTokens = (await sr.get<number>(SettingKey.ChatMaxTokens)) ?? 2048;
    const contextCount = (await sr.get<number>(SettingKey.ChatContextCount)) ?? 10;
    const systemPrompt = (await sr.get<string>(SettingKey.ChatSystemPrompt)) ?? 'You are a helpful assistant.';

    // 构建消息数组（根据上下文数目）
    const msgs: CoreMessage[] = [];

    if (contextCount > 0) {
      // 系统提示词
      msgs.push({ role: 'system', content: systemPrompt });

      // 获取并添加历史消息（只取最近的 contextCount 条对话，每条对话包含 user 和 assistant）
      const historyMessages = await MessageRepository.listMessages(cid!, { limit: contextCount * 2 });
      const recentHistory = historyMessages.slice(-contextCount * 2);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          msgs.push({
            role: msg.role,
            content: msg.text ?? '',
          });
        }
      }
    }

    // 添加当前用户消息（当 contextCount === 0 时，不包含上文和系统提示）
    msgs.push({ role: 'user', content: message });

    let acc = '';
    try {
      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gemini-1.5-flash');

      console.log('[ChatInput] Sending message', { provider, model, messagesCount: msgs.length, temperature, maxTokens });

      await streamCompletion({
        provider,
        model,
        messages: msgs,
        temperature,
        maxTokens,
        abortSignal: controller.signal,
        onToken: async (d) => {
          acc += d;
          await MessageRepository.updateMessageText(assistant.id, acc);
        },
        onDone: async () => {
          await MessageRepository.updateMessageStatus(assistant.id, 'sent');
        },
        onError: async (e: any) => {
          console.error('[ChatInput] Stream error', e);
          await MessageRepository.updateMessageStatus(assistant.id, 'failed');
        },
      });
    } catch (error: any) {
      console.error('[ChatInput] Fatal error', {
        error,
        message: error?.message,
        cause: error?.cause,
        statusCode: error?.statusCode,
        responseBody: error?.responseBody,
      });
      await MessageRepository.updateMessageStatus(assistant.id, 'failed');
    } finally {
      abortRef.current = null;
    }

    setMessage('');
  };

  const handleAttachment = () => {
    // TODO: 实现附件/功能菜单逻辑
    console.log('打开功能菜单');
  };

  const handleVoice = () => {
    // TODO: 实现语音输入逻辑
    console.log('打开语音输入');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.outerContainer}>
        {/* 圆角悬浮方框容器 */}
        <View style={[styles.inputContainer, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          shadowColor: '#000',
        }]}>
          {/* 上层：输入框 */}
          <RNTextInput
            placeholder="和助手说点什么… (Ctrl+Enter 展开)"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            style={[styles.textInput, { color: theme.colors.onSurface }]}
          />

          {/* 下层：工具按钮行 */}
          <View style={styles.toolbarRow}>
            {/* 左侧工具按钮组 */}
            <View style={styles.leftTools}>
              <IconButton
                icon="paperclip"
                size={20}
                onPress={handleAttachment}
                style={styles.toolButton}
              />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => console.log('更多功能')}
                style={styles.toolButton}
              />
            </View>

            {/* 右侧发送按钮组 */}
            <View style={styles.rightTools}>
              <IconButton
                icon="microphone"
                size={20}
                onPress={handleVoice}
                style={styles.toolButton}
              />
              <IconButton
                icon="send"
                size={20}
                iconColor={message.trim() ? theme.colors.primary : theme.colors.onSurfaceDisabled}
                onPress={handleSend}
                disabled={!message.trim()}
                style={styles.toolButton}
              />
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    // 悬浮阴影效果
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textInput: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 15,
    lineHeight: 20,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    minHeight: 40,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButton: {
    margin: 0,
    width: 36,
    height: 36,
  },
});
