/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Alert } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { CoreMessage } from 'ai';
import { autoNameConversation } from '@/services/ai/TopicNaming';

export function ChatInput({ conversationId, onConversationChange }: { conversationId: string | null; onConversationChange: (id: string) => void; }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 🎯 优化：动态计算键盘偏移量，适配不同设备（包括刘海屏）
  const keyboardVerticalOffset = Platform.select({
    ios: insets.bottom + 50, // iOS: 底部安全区 + Header 高度
    android: 0, // Android: height 模式不需要偏移
    default: 0,
  });

  const handleSend = async () => {
    if (!message.trim() || isGenerating) return;

    setIsGenerating(true);
    const userMessage = message;
    setMessage(''); // 立即清空输入框

    let cid = conversationId;
    let assistant: any = null;
    let isFirstTurn = false;

    try {
      if (!cid) {
        const c = await ChatRepository.createConversation('新话题');
        cid = c.id;
        onConversationChange(c.id);
      }

      // 判断是否首轮对话：在写入用户消息前检查是否已有历史
      const __prev = await MessageRepository.listMessages(cid!, { limit: 1 });
      isFirstTurn = __prev.length === 0;
      await MessageRepository.addMessage({ conversationId: cid!, role: 'user', text: userMessage, status: 'sent' });
      assistant = await MessageRepository.addMessage({ conversationId: cid!, role: 'assistant', text: '', status: 'pending' });

      const controller = new AbortController();
      abortRef.current = controller;

      // 获取聊天设置参数
      const sr = SettingsRepository();
      const temperature = (await sr.get<number>(SettingKey.ChatTemperature)) ?? 0.7;
      const maxTokensEnabled = (await sr.get<boolean>(SettingKey.ChatMaxTokensEnabled)) ?? false;
      const maxTokens = maxTokensEnabled ? ((await sr.get<number>(SettingKey.ChatMaxTokens)) ?? 2048) : undefined;
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
      msgs.push({ role: 'user', content: userMessage });

      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gemini-1.5-flash');

      console.log('[ChatInput] 发送消息', {
        提供商: provider,
        模型: model,
        温度: parseFloat(temperature.toFixed(1)),
        最大令牌: maxTokens || '自动',
        上下文轮数: contextCount
      });

      let acc = '';
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
          setIsGenerating(false);
          if (isFirstTurn) {
            try { void autoNameConversation(cid!); } catch (e) { console.warn('[ChatInput] auto naming error', e); }
          }
        },
        onError: async (e: any) => {
          console.error('[ChatInput] Stream error', e);
          if (assistant) {
            await MessageRepository.updateMessageStatus(assistant.id, 'failed');
          }
          setIsGenerating(false);

          // 显示友好的错误提示
          const errorMessage = getErrorMessage(e);
          Alert.alert('发送失败', errorMessage, [{ text: '确定' }]);
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

      if (assistant) {
        await MessageRepository.updateMessageStatus(assistant.id, 'failed');
      }
      setIsGenerating(false);

      // 显示友好的错误提示
      const errorMessage = getErrorMessage(error);
      Alert.alert('发送失败', errorMessage, [
        { text: '取消', style: 'cancel' },
        { text: '前往设置', onPress: () => console.log('TODO: 跳转到设置页面') }
      ]);
    } finally {
      abortRef.current = null;
    }
  };

  const getErrorMessage = (error: any): string => {
    const errorName = error?.name || '';
    const errorMessage = error?.message || '';

    // API Key 相关错误
    if (errorName === 'ALAPICallError' || errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return 'API Key 未配置或无效，请前往设置页面配置 AI 提供商的 API Key。';
    }

    // 网络错误
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return '网络连接失败，请检查网络连接后重试。';
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return '请求超时，请稍后重试。';
    }

    // 配额错误
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return 'API 配额已用尽，请检查账户配额或更换 API Key。';
    }

    // 默认错误信息
    return `发送消息失败：${errorMessage || '未知错误'}`;
  };

  const handleAttachment = () => {
    // TODO: 实现附件/功能菜单逻辑
    console.log('打开功能菜单');
  };

  const handleVoice = () => {
    // TODO: 实现语音输入逻辑
    console.log('打开语音输入');
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsGenerating(false);
    }
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
                icon={isGenerating ? "stop" : "send"}
                size={20}
                iconColor={
                  isGenerating
                    ? theme.colors.error
                    : message.trim()
                      ? theme.colors.primary
                      : theme.colors.onSurfaceDisabled
                }
                onPress={isGenerating ? handleStop : handleSend}
                disabled={!message.trim() && !isGenerating}
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
