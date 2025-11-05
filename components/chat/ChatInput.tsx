/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform, TextInput as RNTextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { CoreMessage } from 'ai';
import { autoNameConversation } from '@/services/ai/TopicNaming';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import type { Attachment } from '@/storage/core';
import { Image } from 'expo-image';
import { performSearch } from '@/services/search/SearchClient';
import type { SearchEngine } from '@/services/search/types';
import { SearchLoadingIndicator } from './SearchLoadingIndicator';

export function ChatInput({ conversationId, onConversationChange }: { conversationId: string | null; onConversationChange: (id: string) => void; }) {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [currentSearchEngine, setCurrentSearchEngine] = useState<SearchEngine>('bing');
  const abortRef = useRef<AbortController | null>(null);

  const supportsVision = (provider: Provider, model: string) => {
    const m = (model || '').toLowerCase();
    switch (provider) {
      case 'openai':
        return m.includes('gpt-4o') || m.includes('4.1') || m.includes('o1');
      case 'anthropic':
        return m.includes('claude-3');
      case 'google':
      case 'gemini':
        return m.includes('gemini');
      default:
        return false;
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && selectedAttachments.length === 0) || isGenerating) return;

    setIsGenerating(true);
    const userMessage = message;
    setMessage(''); // 立即清空输入框

    let cid = conversationId;
    let assistant: any = null;
    let isFirstTurn = false;
    let searchResults: string | null = null;

    try {
      // 执行网络搜索（如果启用）
      if (searchEnabled && userMessage.trim()) {
        try {
          const sr = SettingsRepository();
          const webSearchEnabled = (await sr.get<boolean>(SettingKey.WebSearchEnabled)) ?? false;

          if (webSearchEnabled) {
            const searchEngine = (await sr.get<SearchEngine>(SettingKey.WebSearchEngine)) ?? 'bing';
            const maxResults = (await sr.get<number>(SettingKey.WebSearchMaxResults)) ?? 5;
            const tavilyApiKey = searchEngine === 'tavily' ? ((await sr.get<string>(SettingKey.TavilySearchApiKey)) || undefined) : undefined;

            // 设置搜索状态，显示加载指示器
            setCurrentSearchEngine(searchEngine);
            setCurrentSearchQuery(userMessage);
            setIsSearching(true);

            console.log('[ChatInput] 开始网络搜索', { engine: searchEngine, query: userMessage });

            const results = await performSearch({
              engine: searchEngine,
              query: userMessage,
              maxResults,
              apiKey: tavilyApiKey,
            });

            // 格式化搜索结果，优化 AI 可读性
            if (results.length > 0) {
              const timestamp = new Date().toLocaleString('zh-CN');
              const engineName = searchEngine === 'bing' ? 'Bing' : searchEngine === 'google' ? 'Google' : 'Tavily';

              searchResults = `\n\n<网络搜索结果>\n` +
                `搜索引擎: ${engineName}\n` +
                `搜索时间: ${timestamp}\n` +
                `查询内容: ${userMessage}\n` +
                `结果数量: ${results.length}\n\n` +
                results.map((r, i) => {
                  // 清理并截断摘要
                  const cleanSnippet = r.snippet.trim().substring(0, 300);
                  return `【结果 ${i + 1}】\n` +
                    `标题: ${r.title}\n` +
                    `链接: ${r.url}\n` +
                    `内容摘要: ${cleanSnippet}${r.snippet.length > 300 ? '...' : ''}\n`;
                }).join('\n') +
                `\n</网络搜索结果>\n\n` +
                `请根据以上搜索结果，结合你的知识，为用户提供准确、全面的回答。`;

              console.log(`[ChatInput] 搜索成功，找到 ${results.length} 条结果`);
            }
          }
        } catch (error: any) {
          console.error('[ChatInput] 搜索失败:', error);

          // 根据错误类型生成友好的错误消息
          let errorMessage = '未知错误';
          let errorHint = '';

          if (error.code === 'CAPTCHA') {
            errorMessage = '搜索引擎检测到异常流量';
            errorHint = '建议：稍后重试或切换到其他搜索引擎（如 Tavily）';
          } else if (error.code === 'TIMEOUT') {
            errorMessage = '搜索请求超时';
            errorHint = '建议：检查网络连接或稍后重试';
          } else if (error.code === 'API_ERROR') {
            errorMessage = error.message || 'API 调用失败';
            errorHint = '建议：检查 API Key 配置或查看设置页面';
          } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = '网络连接失败';
            errorHint = '建议：检查网络连接';
          } else if (error.code === 'PARSE_ERROR') {
            errorMessage = '搜索结果解析失败';
            errorHint = '建议：搜索引擎页面结构可能已更新，请切换到其他搜索引擎';
          } else {
            errorMessage = error.message || '未知错误';
          }

          // 格式化错误信息
          searchResults = `\n\n<网络搜索失败>\n` +
            `错误信息: ${errorMessage}\n` +
            (errorHint ? `${errorHint}\n` : '') +
            `\n注意：搜索失败不影响对话，我将基于现有知识为您解答。\n` +
            `</网络搜索失败>\n`;

          // 显示错误提示给用户
          Alert.alert(
            '网络搜索失败',
            `${errorMessage}\n${errorHint}`,
            [{ text: '知道了' }]
          );

          // 搜索失败不记录历史
        } finally {
          setIsSearching(false);
        }
      }
      if (!cid) {
        const c = await ChatRepository.createConversation('新话题');
        cid = c.id;
        onConversationChange(c.id);
      }

      // 判断是否首轮对话：在写入用户消息前检查是否已有历史
      const __prev = await MessageRepository.listMessages(cid!, { limit: 1 });
      isFirstTurn = __prev.length === 0;
      // 先创建用户消息，并关联所选附件
      const attachmentIds = selectedAttachments.map(a => a.id);
      await MessageRepository.addMessage({ conversationId: cid!, role: 'user', text: userMessage, status: 'sent', attachmentIds });
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
      // 若包含图片附件且模型支持多模态，则构造为多段内容
      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gemini-1.5-flash');

      const images = selectedAttachments.filter(a => a.kind === 'image' && a.uri);
      if (images.length > 0 && supportsVision(provider, model)) {
        const parts: any[] = [];
        if (userMessage.trim()) parts.push({ type: 'text', text: userMessage });
        // 读取图片为 data URL 片段
        for (const img of images) {
          try {
            const base64 = await FileSystem.readAsStringAsync(img.uri as string, { encoding: 'base64' as any });
            const mime = img.mime || 'image/png';
            parts.push({ type: 'image', image: `data:${mime};base64,${base64}` });
          } catch (e) {
            console.warn('[ChatInput] 读取图片失败，跳过该图片: ', img.uri, e);
          }
        }
        msgs.push({ role: 'user', content: parts });
      } else {
        // 不支持多模态或无图片，仅发送文本，同时提示附带了文件
        const fileSuffix = selectedAttachments.length > 0 && !userMessage.trim()
          ? `(已附加 ${selectedAttachments.length} 个附件)`
          : (selectedAttachments.length > 0 ? `\n(附加 ${selectedAttachments.length} 个附件)` : '');

        // 拼接搜索结果（如果有）
        const finalMessage = userMessage + fileSuffix + (searchResults || '');
        msgs.push({ role: 'user', content: finalMessage.trim() });
      }

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
          setSelectedAttachments([]);
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
    // 简易选择：图片 或 文件
    Alert.alert('添加附件', '请选择要添加的内容类型', [
      { text: '图片', onPress: () => pickImage() },
      { text: '文件', onPress: () => pickFile() },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false });
      const file = 'assets' in res ? res.assets?.[0] : res;
      if (!file || res.canceled || file.type === 'cancel') return;
      const att = await AttachmentRepository.saveAttachmentFromUri(file.uri, {
        kind: 'image',
        mime: file.mimeType || file.mime || null,
        name: file.name || 'image',
        size: file.size || null,
      });
      setSelectedAttachments(prev => [...prev, att]);
    } catch (e) {
      console.warn('[ChatInput] 选择图片失败', e);
    }
  };

  const pickFile = async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
      const file = 'assets' in res ? res.assets?.[0] : res;
      if (!file || res.canceled || file.type === 'cancel') return;
      const att = await AttachmentRepository.saveAttachmentFromUri(file.uri, {
        kind: 'file',
        mime: file.mimeType || file.mime || null,
        name: file.name || 'file',
        size: file.size || null,
      });
      setSelectedAttachments(prev => [...prev, att]);
    } catch (e) {
      console.warn('[ChatInput] 选择文件失败', e);
    }
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
    <View
    >
      <View style={styles.outerContainer}>
        {/* 搜索加载指示器 */}
        {isSearching && (
          <SearchLoadingIndicator
            engine={currentSearchEngine}
            query={currentSearchQuery}
          />
        )}

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

          {/* 已选附件预览 */}
          {selectedAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.attachmentsBar}
              contentContainerStyle={styles.attachmentsContent}
            >
              {selectedAttachments.map(att => (
                att.kind === 'image' && att.uri ? (
                  <View key={att.id} style={styles.attachmentItem}>
                    <Image source={{ uri: att.uri }} style={styles.attachmentThumb} contentFit="cover" />
                    <TouchableOpacity
                      style={[styles.removeBadge, { backgroundColor: theme.colors.error }]}
                      onPress={() => setSelectedAttachments(prev => prev.filter(a => a.id !== att.id))}
                    >
                      <IconButton icon="close" size={14} style={styles.removeIcon} iconColor="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View key={att.id} style={[styles.fileChip, { borderColor: theme.colors.outlineVariant }]}> 
                    <IconButton icon="file" size={16} style={{ margin: 0 }} />
                    <RNTextInput editable={false} value={att.name || '附件'} style={styles.fileChipText} />
                    <IconButton
                      icon="close"
                      size={14}
                      style={{ margin: 0 }}
                      onPress={() => setSelectedAttachments(prev => prev.filter(a => a.id !== att.id))}
                    />
                  </View>
                )
              ))}
            </ScrollView>
          )}

          {/* 下层：工具按钮行 */}
          <View style={styles.toolbarRow}>
            {/* 左侧工具按钮组 */}
            <View style={styles.leftTools}>
              <IconButton
                icon="web"
                iconColor={searchEnabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
                size={20}
                onPress={() => setSearchEnabled(!searchEnabled)}
                disabled={isSearching}
                style={styles.toolButtonStyle}
              />
              <IconButton
                icon="attachment"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={handleAttachment}
                style={styles.toolButtonStyle}
              />
              <IconButton
                icon="plus-circle-outline"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={() => console.log('更多功能')}
                style={styles.toolButtonStyle}
              />
            </View>

            {/* 右侧发送按钮组 */}
            <View style={styles.rightTools}>
              <IconButton
                icon="microphone"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={handleVoice}
                style={styles.toolButtonStyle}
              />
              <IconButton
                icon={isGenerating ? "stop" : "send"}
                iconColor={
                  isGenerating
                    ? "#fff"
                    : (message.trim() || selectedAttachments.length > 0)
                      ? theme.colors.primary
                      : theme.colors.onSurfaceDisabled
                }
                size={20}
                onPress={isGenerating ? handleStop : handleSend}
                disabled={!message.trim() && selectedAttachments.length === 0 && !isGenerating}
                style={[
                  styles.toolButtonStyle,
                  isGenerating && {
                    backgroundColor: theme.colors.error,
                  }
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
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
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: 'top',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  attachmentsBar: {
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  attachmentsContent: {
    alignItems: 'center',
    gap: 8,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 96,
    height: 64,
    borderRadius: 8,
  },
  removeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  removeIcon: {
    margin: 0,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileChipText: {
    minWidth: 60,
    maxWidth: 160,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 52,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButtonStyle: {
    marginHorizontal: 2,
  },
});
