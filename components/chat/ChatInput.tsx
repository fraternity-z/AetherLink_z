/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 */

import React, { useRef, useState } from 'react';
import { View, Platform, TextInput as RNTextInput, ScrollView, TouchableOpacity } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { ThinkingChainRepository } from '@/storage/repositories/thinking-chains';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { AssistantsRepository } from '@/storage/repositories/assistants';
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
import { AttachmentMenu } from './AttachmentMenu';
import { MoreActionsMenu } from './MoreActionsMenu';
import { appEvents, AppEvents } from '@/utils/events';

export function ChatInput({ conversationId, onConversationChange }: { conversationId: string | null; onConversationChange: (id: string) => void; }) {
  const theme = useTheme();
  const { alert } = useConfirmDialog();
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [currentSearchEngine, setCurrentSearchEngine] = useState<SearchEngine>('bing');
  const [enterToSend, setEnterToSend] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [moreActionsMenuVisible, setMoreActionsMenuVisible] = useState(false);
  const [hasContextReset, setHasContextReset] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 加载 Enter 键发送设置
  React.useEffect(() => {
    (async () => {
      const sr = SettingsRepository();
      const ets = await sr.get<boolean>(SettingKey.EnterToSend);
      if (ets !== null) setEnterToSend(ets);
    })();
  }, []);

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
          alert(
            '网络搜索失败',
            `${errorMessage}\n${errorHint}`
          );

          // 搜索失败不记录历史
        } finally {
          setIsSearching(false);
        }
      }
      // 判断是否首轮对话：在创建话题前检查
      if (!cid) {
        const c = await ChatRepository.createConversation('新话题');
        cid = c.id;
        isFirstTurn = true; // 新话题必定是首轮对话
        // 延迟触发 UI 更新，避免竞态条件
        // 等待用户消息写入后再通知父组件
      } else {
        // 已有话题，检查是否有历史消息
        const __prev = await MessageRepository.listMessages(cid, { limit: 1 });
        isFirstTurn = __prev.length === 0;
      }

      // 获取聊天设置参数（提前获取以便保存到消息）
      const sr = SettingsRepository();
      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gemini-1.5-flash');

      // 先创建用户消息，并关联所选附件
      const attachmentIds = selectedAttachments.map(a => a.id);
      await MessageRepository.addMessage({ conversationId: cid!, role: 'user', text: userMessage, status: 'sent', attachmentIds });

      // 如果是新创建的话题，在用户消息写入后再通知父组件切换话题
      // 避免竞态条件：确保话题和消息都已就绪后再触发 UI 更新
      if (isFirstTurn && conversationId === null) {
        onConversationChange(cid!);
      }

      // 创建 assistant 消息，保存模型信息到 extra 字段
      assistant = await MessageRepository.addMessage({
        conversationId: cid!,
        role: 'assistant',
        text: '',
        status: 'pending',
        extra: { model, provider } // 保存模型和提供商信息
      });

      const controller = new AbortController();
      abortRef.current = controller;
      const temperature = (await sr.get<number>(SettingKey.ChatTemperature)) ?? 0.7;
      const maxTokensEnabled = (await sr.get<boolean>(SettingKey.ChatMaxTokensEnabled)) ?? false;
      const maxTokens = maxTokensEnabled ? ((await sr.get<number>(SettingKey.ChatMaxTokens)) ?? 2048) : undefined;
      const contextCount = (await sr.get<number>(SettingKey.ChatContextCount)) ?? 10;

      // 获取当前助手的系统提示词（仅使用助手定义的提示词）
      let systemPrompt: string | null = null;
      const currentAssistantId = (await sr.get<string>(SettingKey.CurrentAssistantId)) ?? 'default';
      const assistantsRepo = AssistantsRepository();
      const currentAssistant = await assistantsRepo.getById(currentAssistantId);

      if (currentAssistant?.systemPrompt) {
        systemPrompt = currentAssistant.systemPrompt;
        console.log('[ChatInput] 使用助手提示词:', currentAssistant.name);
      } else {
        console.log('[ChatInput] 无系统提示词（使用纯对话上下文）');
      }

    // 构建消息数组（根据上下文数目）
      const msgs: CoreMessage[] = [];

      if (contextCount > 0) {
        // 仅在存在助手提示词时添加 system 消息
        if (systemPrompt && systemPrompt.trim()) {
          msgs.push({ role: 'system', content: systemPrompt });
        }

        // 获取并添加历史消息（断点之后的最近 contextCount 条对话，每条包含 user 和 assistant）
        const resetAt = cid ? (await ChatRepository.getContextResetAt(cid)) ?? undefined : undefined;
        const historyMessages = await MessageRepository.listMessages(cid!, { limit: contextCount * 2, after: resetAt });
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

      // 思考链相关状态
      let thinkingId: string | null = null;
      let thinkingContent = '';
      let thinkingStartTime: number | null = null;
      let lastThinkingUpdateAt = 0;

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
        // 思考链开始回调
        onThinkingStart: async () => {
          thinkingStartTime = Date.now();
          thinkingContent = '';

          try {
            const rec = await ThinkingChainRepository.addThinkingChain({
              messageId: assistant.id,
              content: '',
              startTime: thinkingStartTime,
              endTime: thinkingStartTime,
              durationMs: 0,
            });
            thinkingId = rec.id;
            console.log('[ChatInput] 思考链开始并创建记录', { thinkingId });
            appEvents.emit(AppEvents.MESSAGE_CHANGED);
          } catch (e) {
            console.error('[ChatInput] 创建思考链记录失败', e);
          }
        },
        // 思考链流式内容回调(每100ms防抖更新)
        onThinkingToken: async (delta) => {
          thinkingContent += delta;
          if (thinkingId) {
            const now = Date.now();
            if (now - lastThinkingUpdateAt > 120) {
              lastThinkingUpdateAt = now;
              try {
                await ThinkingChainRepository.updateThinkingChainContent(thinkingId, thinkingContent);
                appEvents.emit(AppEvents.MESSAGE_CHANGED);
              } catch (e) {
                // 忽略单次失败，最终会在结束时写入完整内容
              }
            }
          }
        },
        // 思考链结束回调
        onThinkingEnd: async () => {
          if (thinkingId && thinkingStartTime) {
            const endTime = Date.now();
            const durationMs = endTime - thinkingStartTime;
            try {
              await ThinkingChainRepository.updateThinkingChainContent(thinkingId, thinkingContent);
              await ThinkingChainRepository.updateThinkingChainEnd(thinkingId, endTime, durationMs);

              console.log('[ChatInput] 思考链已完成并保存', {
                thinkingId,
                messageId: assistant.id,
                durationMs: `${(durationMs / 1000).toFixed(1)}秒`,
                contentLength: thinkingContent.length,
              });

              appEvents.emit(AppEvents.MESSAGE_CHANGED);
            } catch (e) {
              console.error('[ChatInput] 结束保存思考链失败', e);
            }
          }
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
          // 用户主动取消，静默处理
          if (isUserCanceled(e)) {
            console.log('[ChatInput] 用户主动取消请求');
            if (assistant) {
              // 如果助手消息为空或内容很少，直接删除；否则保留但标记为失败
              const currentText = assistant.text || '';
              if (currentText.trim().length < 10) {
                // 内容太少，直接删除空消息
                await MessageRepository.deleteMessage(assistant.id);
                console.log('[ChatInput] 已删除空的助手消息');
              } else {
                // 已经有一些内容，标记为失败状态保留
                await MessageRepository.updateMessageStatus(assistant.id, 'failed');
                console.log('[ChatInput] 助手消息已标记为失败状态');
              }
            }
            setIsGenerating(false);
            return;
          }

          // 真实错误，记录并显示提示
          console.error('[ChatInput] Stream error', e);
          if (assistant) {
            await MessageRepository.updateMessageStatus(assistant.id, 'failed');
          }
          setIsGenerating(false);

          // 显示友好的错误提示
          const errorMessage = getErrorMessage(e);
          alert('发送失败', errorMessage);
        },
      });
    } catch (error: any) {
      // 用户主动取消，静默处理
      if (isUserCanceled(error)) {
        console.log('[ChatInput] 用户主动取消请求（外层捕获）');
        if (assistant) {
          // 同样的逻辑：内容太少就删除，否则保留
          const currentText = assistant.text || '';
          if (currentText.trim().length < 10) {
            await MessageRepository.deleteMessage(assistant.id);
            console.log('[ChatInput] 已删除空的助手消息（外层）');
          } else {
            await MessageRepository.updateMessageStatus(assistant.id, 'failed');
            console.log('[ChatInput] 助手消息已标记为失败状态（外层）');
          }
        }
        setIsGenerating(false);
        abortRef.current = null;
        return;
      }

      // 真实错误，记录详细信息
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
      alert('发送失败', errorMessage);
    } finally {
      abortRef.current = null;
    }
  };

  /**
   * 判断是否为用户主动取消
   */
  const isUserCanceled = (error: any): boolean => {
    const errorMessage = error?.message || '';
    const errorName = error?.name || '';

    // 常见的取消请求错误标识
    return (
      errorMessage.includes('canceled') ||
      errorMessage.includes('cancelled') ||
      errorMessage.includes('abort') ||
      errorName === 'AbortError' ||
      errorName === 'CancelError'
    );
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

    // 超时错误（排除用户主动取消）
    if (!isUserCanceled(error) && errorMessage.includes('timeout')) {
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
    // 显示底部菜单
    setAttachmentMenuVisible(true);
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

  const handleMoreActions = () => {
    // 打开前刷新“清除上下文”状态
    (async () => {
      if (conversationId) {
        const ts = await ChatRepository.getContextResetAt(conversationId);
        setHasContextReset(!!ts);
      } else {
        setHasContextReset(false);
      }
      setMoreActionsMenuVisible(true);
    })();
  };

  const handleClearConversation = async () => {
    if (!conversationId) return;

    try {
      // 清空当前对话的所有消息
      await MessageRepository.clearConversationMessages(conversationId);

      // 立即发送事件通知消息列表刷新
      appEvents.emit(AppEvents.MESSAGES_CLEARED, conversationId);

      // 提示用户
      alert('成功', '对话已清空');
    } catch (error) {
      console.error('[ChatInput] 清除对话失败', error);
      alert('错误', '清除对话失败，请重试');
    }
  };

  const handleClearContext = async () => {
    if (!conversationId) return;
    await ChatRepository.setContextResetAt(conversationId, Date.now());
    setHasContextReset(true);
    alert('已清除上下文', '从下次提问起不再引用之前上文');
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsGenerating(false);
    }
  };

  return (
    <View>
      {/* 附件选择底部菜单 */}
      <AttachmentMenu
        visible={attachmentMenuVisible}
        onClose={() => setAttachmentMenuVisible(false)}
        onSelectImage={pickImage}
        onSelectFile={pickFile}
      />

      {/* 更多功能底部菜单 */}
      <MoreActionsMenu
        visible={moreActionsMenuVisible}
        onClose={() => setMoreActionsMenuVisible(false)}
        onClearConversation={handleClearConversation}
        conversationId={conversationId}
        onClearContext={handleClearContext}
        hasContextReset={hasContextReset}
      />

      <View className="px-4 pt-2 pb-2">
        {/* 搜索加载指示器 */}
        {isSearching && (
          <SearchLoadingIndicator
            engine={currentSearchEngine}
            query={currentSearchQuery}
          />
        )}

        {/* 圆角悬浮方框容器 */}
        <View
          className="rounded-[20px] border overflow-hidden"
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              shadowColor: '#000',
            },
            Platform.select({
              ios: {
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 4,
              },
            }),
          ]}
        >
          {/* 上层：输入框 */}
          <RNTextInput
            placeholder={enterToSend ? "和助手说点什么… (Shift+Enter 换行)" : "和助手说点什么… (Ctrl+Enter 展开)"}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            className="text-[15px] leading-5 px-4 pt-3 pb-2 min-h-11 max-h-[120px]"
            style={{
              textAlignVertical: 'top',
              color: theme.colors.onSurface,
            }}
            onKeyPress={(e) => {
              // Web 平台支持键盘事件
              if (Platform.OS === 'web') {
                const nativeEvent = e.nativeEvent as any;
                // 如果启用了 Enter 发送，且按下 Enter 键（非 Shift+Enter）
                if (enterToSend && nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                  e.preventDefault();
                  if (message.trim() || selectedAttachments.length > 0) {
                    handleSend();
                  }
                }
              }
            }}
          />

          {/* 已选附件预览 */}
          {selectedAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-2 pb-1.5"
              contentContainerStyle={{ alignItems: 'center', gap: 8 }}
            >
              {selectedAttachments.map(att => (
                att.kind === 'image' && att.uri ? (
                  <View key={att.id} className="relative">
                    <Image
                      source={{ uri: att.uri }}
                      className="w-24 h-16 rounded-lg"
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      className="absolute -top-2 -right-2 rounded-xl"
                      style={{ backgroundColor: theme.colors.error }}
                      onPress={() => setSelectedAttachments(prev => prev.filter(a => a.id !== att.id))}
                    >
                      <IconButton icon="close" size={14} style={{ margin: 0 }} iconColor="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    key={att.id}
                    className="flex-row items-center border rounded-2xl px-2 py-1"
                    style={{ borderColor: theme.colors.outlineVariant }}
                  >
                    <IconButton icon="file" size={16} style={{ margin: 0 }} />
                    <RNTextInput
                      editable={false}
                      value={att.name || '附件'}
                      className="min-w-[60px] max-w-[160px] py-0 px-0"
                    />
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
          <View className="flex-row items-center justify-between px-2 py-2 min-h-[52px]">
            {/* 左侧工具按钮组 */}
            <View className="flex-row items-center">
              <IconButton
                icon="web"
                iconColor={searchEnabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
                size={20}
                onPress={() => setSearchEnabled(!searchEnabled)}
                disabled={isSearching}
                style={{ marginHorizontal: 2 }}
              />
              <IconButton
                icon="attachment"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={handleAttachment}
                style={{ marginHorizontal: 2 }}
              />
              <IconButton
                icon="plus-circle-outline"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={handleMoreActions}
                style={{ marginHorizontal: 2 }}
              />
            </View>

            {/* 右侧发送按钮组 */}
            <View className="flex-row items-center">
              <IconButton
                icon="microphone"
                iconColor={theme.colors.onSurfaceVariant}
                size={20}
                onPress={handleVoice}
                style={{ marginHorizontal: 2 }}
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
                  { marginHorizontal: 2 },
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
