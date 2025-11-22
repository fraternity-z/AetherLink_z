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

import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useMessageSender } from '@/hooks/use-message-sender';
import { useWebSearch } from '@/hooks/use-web-search';
import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ImageGenerationDialog } from '../dialogs/ImageGenerationDialog';
import { McpToolsDialog } from '../dialogs/McpToolsDialog';
import { QuickPhrasePickerDialog } from '../dialogs/QuickPhrasePickerDialog';
import { MoreActionsMenu } from '../menus/MoreActionsMenu';
import { SearchLoadingIndicator } from '../misc/SearchLoadingIndicator';
import { AttachmentChips } from './AttachmentChips';
import { AttachmentMenu } from './AttachmentMenu';
import { ChatInputField } from './ChatInputField';
import { ChatInputToolbar } from './ChatInputToolbar';
import { useAttachmentPicker } from './hooks/useAttachmentPicker';
import { useChatDialogs } from './hooks/useChatDialogs';
import { useChatInputSettings } from './hooks/useChatInputSettings';
import { useConversationActions } from './hooks/useConversationActions';

/**
 * ChatInput 组件属性
 */
export interface ChatInputProps {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  /** 当前选择的模型（全局状态） */
  currentModel?: { provider: string; model: string } | null;
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
const ChatInputComponent = React.forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  conversationId,
  onConversationChange,
  currentModel,
}, ref) {
  const theme = useTheme();
  const { alert } = useConfirmDialog();

  // ========== 状态管理 ==========
  const [message, setMessage] = useState('');
  const {
    selectedAttachments,
    pickImage,
    pickFile,
    removeAttachment,
    resetAttachments,
  } = useAttachmentPicker();
  const { enterToSend } = useChatInputSettings();
  const {
    attachmentMenuVisible,
    openAttachmentMenu,
    closeAttachmentMenu,
    moreActionsMenuVisible,
    openMoreActionsMenu,
    closeMoreActionsMenu,
    imageDialogVisible,
    openImageDialog,
    closeImageDialog,
    mcpDialogVisible,
    openMcpDialog,
    closeMcpDialog,
    phrasePickerVisible,
    openPhrasePicker,
    closePhrasePicker,
  } = useChatDialogs();
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const {
    hasContextReset,
    syncContextResetState,
    clearConversation,
    clearContext,
  } = useConversationActions(conversationId, alert);

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
    resetAttachments();

    try {
      // 执行网络搜索（如果启用）
      let searchResults: string | null = null;
      if (searchEnabled && userMessage.trim()) {
        logger.debug('[ChatInput] 开始执行网络搜索', { query: userMessage });
        searchResults = await performWebSearch(userMessage);
        logger.debug('[ChatInput] 网络搜索完成', {
          hasResults: !!searchResults,
          resultsLength: searchResults?.length || 0,
        });
      }

      // 发送消息
      await sendMessage({
        text: userMessage,
        attachments: userAttachments,
        searchResults,
        enableMcpTools: mcpEnabled,
        currentModel: currentModel || undefined,
      });
    } catch (error) {
      // 错误已在 useEffect 中处理
      logger.error('[ChatInput] 发送消息失败', error);
    }
  }, [message, selectedAttachments, isGenerating, searchEnabled, performWebSearch, sendMessage, mcpEnabled, resetAttachments, currentModel]);

  // ========== 语音输入处理 ==========
  const handleVoiceTextRecognized = React.useCallback((text: string) => {
    if (text && text.trim()) {
      setMessage((prev) => prev ? `${prev}\n${text}` : text);
      logger.debug('[ChatInput] Voice text recognized:', text);
    }
  }, []);

  // ========== 更多操作处理 ==========
  const handleMoreActions = React.useCallback(() => {
    void syncContextResetState();
    openMoreActionsMenu();
  }, [syncContextResetState, openMoreActionsMenu]);

  // ========== 快捷短语处理 ==========
  const handlePhraseSelect = React.useCallback((phrase: { id: string; title: string; content: string }) => {
    // 将短语内容追加到输入框
    setMessage((prev) => (prev ? `${prev}\n${phrase.content}` : phrase.content));
    logger.debug('[ChatInput] Quick phrase selected:', phrase.title);
  }, []);

  const openPhrasePickerFromRef = React.useCallback(() => {
    openPhrasePicker();
    logger.debug('[ChatInput] Quick phrase picker opened via ref');
  }, [openPhrasePicker]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    openPhrasePicker: openPhrasePickerFromRef,
  }), [openPhrasePickerFromRef]);

  // ========== 渲染 ==========
  return (
    <View>
      {/* 附件选择底部菜单 */}
      <AttachmentMenu
        visible={attachmentMenuVisible}
        onClose={closeAttachmentMenu}
        onSelectImage={pickImage}
        onSelectFile={pickFile}
      />

      {/* 更多功能底部菜单 */}
      <MoreActionsMenu
        visible={moreActionsMenuVisible}
        onClose={closeMoreActionsMenu}
        onClearConversation={clearConversation}
        conversationId={conversationId}
        onClearContext={clearContext}
        hasContextReset={hasContextReset}
        onOpenImageGeneration={openImageDialog}
        provider={(currentModel?.provider || 'openai') as any}
        model={currentModel?.model || 'gpt-4o-mini'}
      />

      {/* 图片生成对话框 */}
      <ImageGenerationDialog
        visible={imageDialogVisible}
        onDismiss={closeImageDialog}
        conversationId={conversationId}
        provider={(currentModel?.provider || 'openai') as any}
        model={currentModel?.model || 'gpt-4o-mini'}
      />

      {/* MCP 工具开关对话框 */}
      <McpToolsDialog
        visible={mcpDialogVisible}
        onDismiss={closeMcpDialog}
        enabled={mcpEnabled}
        onChangeEnabled={setMcpEnabled}
      />

      {/* 快捷短语选择弹窗 */}
      <QuickPhrasePickerDialog
        visible={phrasePickerVisible}
        onDismiss={closePhrasePicker}
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
          onRemove={removeAttachment}
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
            onAttachment={openAttachmentMenu}
            onMoreActions={handleMoreActions}
            mcpEnabled={mcpEnabled}
            onOpenMcpDialog={openMcpDialog}
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

// 🚀 性能优化：使用 React.memo 避免不必要的重渲染
// 只在 conversationId 或 onConversationChange 改变时才重新渲染
export const ChatInput = React.memo(ChatInputComponent, (prev, next) => {
  return prev.conversationId === next.conversationId &&
         prev.onConversationChange === next.onConversationChange;
});
