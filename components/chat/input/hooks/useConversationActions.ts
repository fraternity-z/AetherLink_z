import { useCallback, useState } from 'react';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { appEvents, AppEvents } from '@/utils/events';
import { logger } from '@/utils/logger';

const log = logger.createNamespace('ChatInputConversationActions');

export interface ConversationActions {
  hasContextReset: boolean;
  syncContextResetState: () => Promise<void>;
  clearConversation: () => Promise<void>;
  clearContext: () => Promise<void>;
}

export function useConversationActions(
  conversationId: string | null,
  alert: (title: string, message: string) => void
): ConversationActions {
  const [hasContextReset, setHasContextReset] = useState(false);

  const syncContextResetState = useCallback(async () => {
    if (!conversationId) {
      setHasContextReset(false);
      return;
    }
    const ts = await ChatRepository.getContextResetAt(conversationId);
    setHasContextReset(!!ts);
  }, [conversationId]);

  const clearConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      await MessageRepository.clearConversationMessages(conversationId);
      appEvents.emit(AppEvents.MESSAGES_CLEARED, conversationId);
      alert('成功', '对话已清空');
    } catch (error) {
      log.error('清除对话失败', error);
      alert('错误', '清除对话失败，请重试');
    }
  }, [conversationId, alert]);

  const clearContext = useCallback(async () => {
    if (!conversationId) return;
    await ChatRepository.setContextResetAt(conversationId, Date.now());
    setHasContextReset(true);
    alert('已清除上下文', '从下次提问起不再引用之前上文');
  }, [conversationId, alert]);

  return {
    hasContextReset,
    syncContextResetState,
    clearConversation,
    clearContext,
  };
}
