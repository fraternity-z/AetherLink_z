/**
 * ⌨️ 聊天输入框组件（重构版）
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 *
 * 架构重构：
 * - 使用 use-message-sender Hook 处理消息发送
 * - 使用 use-web-search Hook 处理搜索功能
 * - 使用 ChatInputField 组件渲染输入框
 * - 使用 ChatInputToolbar 组件渲染工具栏
 *
 * 重构成果：
 * - 从 888 行缩减到 250 行 (减少 72%)
 * - 职责清晰：主组件只负责状态管理和组件组装
 * - 业务逻辑下沉到 Hooks
 * - UI 渲染下沉到子组件
 */

import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useMessageSender } from '@/hooks/use-message-sender';
import { useWebSearch } from '@/hooks/use-web-search';
import { ChatInputField } from './ChatInputField';
import { ChatInputToolbar } from './ChatInputToolbar';
import { AttachmentChips } from './AttachmentChips';
import { AttachmentMenu } from './AttachmentMenu';
import { MoreActionsMenu } from './MoreActionsMenu';
import { ImageGenerationDialog } from './ImageGenerationDialog';
import { SearchLoadingIndicator } from './SearchLoadingIndicator';
import { McpToolsDialog } from './McpToolsDialog';
import { QuickPhrasePickerDialog } from './QuickPhrasePickerDialog';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { Attachment } from '@/storage/core';
import type { Provider } from '@/services/ai/AiClient';
import * as DocumentPicker from 'expo-document-picker';
import { appEvents, AppEvents } from '@/utils/events';
import { logger } from '@/utils/logger';

/**
 * ChatInput 组件属性
 */
export interface ChatInputProps {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
}

/**
 * ChatInput 暴露的方法
 */
export interface ChatInputRef {
  openPhrasePicker: () => void;
}

/**
 * 聊天输入框组件（重构版）
 */
export const ChatInput = React.forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  conversationId,
  onConversationChange,
}, ref) {
  const theme = useTheme();
  const { alert } = useConfirmDialog();

  // ========== 状态管理 ==========
  const [message, setMessage] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [enterToSend, setEnterToSend] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [moreActionsMenuVisible, setMoreActionsMenuVisible] = useState(false);
  const [imageDialogVisible, setImageDialogVisible] = useState(false);
  const [mcpDialogVisible, setMcpDialogVisible] = useState(false);
  const [phrasePickerVisible, setPhrasePickerVisible] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [hasContextReset, setHasContextReset] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Provider>('openai');
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o-mini');

  // ========== Hooks 集成 ==========
  // 消息发送 Hook
  const { sendMessage, stopGeneration, isGenerating, error: sendError } = useMessageSender(
    conversationId,
    onConversationChange
  );

  // 网络搜索 Hook
  const {
    isSearching,
    searchEnabled,
    currentEngine,
    currentQuery,
    error: searchError,
    setSearchEnabled,
    performWebSearch,
  } = useWebSearch();

  // ========== 初始化设置 ==========
  React.useEffect(() => {
    (async () => {
      const sr = SettingsRepository();
      const ets = await sr.get<boolean>(SettingKey.EnterToSend);
      if (ets !== null) setEnterToSend(ets);

      // 加载当前 provider 和 model（用于图片生成）
      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (
        provider === 'openai' ? 'gpt-4o-mini' :
        provider === 'anthropic' ? 'claude-3-5-haiku-latest' :
        'gemini-1.5-flash'
      );
      setCurrentProvider(provider);
      setCurrentModel(model);
    })();
  }, []);

  // ========== 错误处理 ==========
  React.useEffect(() => {
    if (sendError) {
      const errorMessage = getErrorMessage(sendError);
      alert('发送失败', errorMessage);
    }
  }, [sendError, alert]);

  React.useEffect(() => {
    if (searchError) {
      alert(
        '网络搜索失败',
        `${searchError.message}\n${getSearchErrorHint(searchError.code)}`
      );
    }
  }, [searchError, alert]);

  // ========== 发送处理 ==========
  const handleSend = React.useCallback(async () => {
    if ((!message.trim() && selectedAttachments.length === 0) || isGenerating) {
      return;
    }

    const userMessage = message;
    const userAttachments = selectedAttachments;

    // 立即清空输入框和附件
    setMessage('');
    setSelectedAttachments([]);

    try {
      // 执行网络搜索（如果启用）
      let searchResults: string | null = null;
      if (searchEnabled && userMessage.trim()) {
        searchResults = await performWebSearch(userMessage);
      }

      // 发送消息
      await sendMessage({
        text: userMessage,
        attachments: userAttachments,
        searchResults,
        enableMcpTools: mcpEnabled,
      });
    } catch (error) {
      // 错误已在 useEffect 中处理
      logger.error('[ChatInput] 发送消息失败', error);
    }
  }, [message, selectedAttachments, isGenerating, searchEnabled, performWebSearch, sendMessage, mcpEnabled]);

  // ========== 附件处理 ==========
  const pickImage = React.useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false }) as any;
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
      logger.warn('[ChatInput] 选择图片失败', e);
    }
  }, []);

  const pickFile = React.useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false }) as any;
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
      logger.warn('[ChatInput] 选择文件失败', e);
    }
  }, []);

  // ========== 语音输入处理 ==========
  const handleVoiceTextRecognized = React.useCallback((text: string) => {
    if (text && text.trim()) {
      setMessage((prev) => prev ? `${prev}\n${text}` : text);
      logger.debug('[ChatInput] Voice text recognized:', text);
    }
  }, []);

  // ========== 更多操作处理 ==========
  const handleMoreActions = React.useCallback(() => {
    (async () => {
      if (conversationId) {
        const ts = await ChatRepository.getContextResetAt(conversationId);
        setHasContextReset(!!ts);
      } else {
        setHasContextReset(false);
      }
      setMoreActionsMenuVisible(true);
    })();
  }, [conversationId]);

  // ========== MCP 开关对话框 ==========
  const handleOpenMcpDialog = React.useCallback(() => {
    setMcpDialogVisible(true);
  }, []);

  const handleClearConversation = React.useCallback(async () => {
    if (!conversationId) return;

    try {
      await MessageRepository.clearConversationMessages(conversationId);
      appEvents.emit(AppEvents.MESSAGES_CLEARED, conversationId);
      alert('成功', '对话已清空');
    } catch (error) {
      logger.error('[ChatInput] 清除对话失败', error);
      alert('错误', '清除对话失败，请重试');
    }
  }, [conversationId, alert]);

  const handleClearContext = React.useCallback(async () => {
    if (!conversationId) return;
    await ChatRepository.setContextResetAt(conversationId, Date.now());
    setHasContextReset(true);
    alert('已清除上下文', '从下次提问起不再引用之前上文');
  }, [conversationId, alert]);

  // ========== 快捷短语处理 ==========
  const handlePhraseSelect = React.useCallback((phrase: any) => {
    // 将短语内容追加到输入框
    setMessage((prev) => (prev ? `${prev}\n${phrase.content}` : phrase.content));
    logger.debug('[ChatInput] Quick phrase selected:', phrase.title);
  }, []);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    openPhrasePicker: () => {
      setPhrasePickerVisible(true);
      logger.debug('[ChatInput] Quick phrase picker opened via ref');
    },
  }), []);

  // ========== 渲染 ==========
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
        onOpenImageGeneration={() => setImageDialogVisible(true)}
        provider={currentProvider}
        model={currentModel}
      />

      {/* 图片生成对话框 */}
      <ImageGenerationDialog
        visible={imageDialogVisible}
        onDismiss={() => setImageDialogVisible(false)}
        conversationId={conversationId}
        provider={currentProvider}
        model={currentModel}
      />

      {/* MCP 工具开关对话框 */}
      <McpToolsDialog
        visible={mcpDialogVisible}
        onDismiss={() => setMcpDialogVisible(false)}
        enabled={mcpEnabled}
        onChangeEnabled={setMcpEnabled}
      />

      {/* 快捷短语选择弹窗 */}
      <QuickPhrasePickerDialog
        visible={phrasePickerVisible}
        onDismiss={() => setPhrasePickerVisible(false)}
        onSelect={handlePhraseSelect}
      />

      <View className="px-4 pt-2 pb-2">
        {/* 搜索加载指示器 */}
        {isSearching && (
          <SearchLoadingIndicator
            engine={currentEngine}
            query={currentQuery}
          />
        )}

        {/* 附件预览 Chips */}
        <AttachmentChips
          attachments={selectedAttachments}
          onRemove={(id) => setSelectedAttachments(prev => prev.filter(a => a.id !== id))}
        />

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
          {/* 输入框组件 */}
          <ChatInputField
            value={message}
            onChangeText={setMessage}
            onSend={handleSend}
            enterToSend={enterToSend}
            disabled={isGenerating}
          />

          {/* 工具栏组件 */}
          <ChatInputToolbar
            searchEnabled={searchEnabled}
            isSearching={isSearching}
            onToggleSearch={() => setSearchEnabled(!searchEnabled)}
            onAttachment={() => setAttachmentMenuVisible(true)}
            onMoreActions={handleMoreActions}
            mcpEnabled={mcpEnabled}
            onOpenMcpDialog={handleOpenMcpDialog}
            onVoiceTextRecognized={handleVoiceTextRecognized}
            isGenerating={isGenerating}
            canSend={!!message.trim() || selectedAttachments.length > 0}
            onSend={handleSend}
            onStop={stopGeneration}
          />
        </View>
      </View>
    </View>
  );
});

// ========== 工具函数 ==========

/**
 * 获取错误提示消息
 */
function getErrorMessage(error: Error): string {
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
  if (errorMessage.includes('timeout')) {
    return '请求超时，请稍后重试。';
  }

  // 配额错误
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return 'API 配额已用尽，请检查账户配额或更换 API Key。';
  }

  // 默认错误信息
  return `发送消息失败：${errorMessage || '未知错误'}`;
}

/**
 * 获取搜索错误提示
 */
function getSearchErrorHint(code?: string): string {
  switch (code) {
    case 'CAPTCHA':
      return '建议：稍后重试或切换到其他搜索引擎（如 Tavily）';
    case 'TIMEOUT':
      return '建议：检查网络连接或稍后重试';
    case 'API_ERROR':
      return '建议：检查 API Key 配置或查看设置页面';
    case 'NETWORK_ERROR':
      return '建议：检查网络连接';
    case 'PARSE_ERROR':
      return '建议：搜索引擎页面结构可能已更新，请切换到其他搜索引擎';
    default:
      return '';
  }
}
