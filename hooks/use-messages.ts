import { useEffect, useState, useCallback } from 'react';
import { Message } from '@/storage/core';
import { MessageRepository } from '@/storage/repositories/messages';
import { appEvents, AppEvents } from '@/utils/events';

export function useMessages(conversationId: string | null, pageSize = 50) {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [endCursor, setEndCursor] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (reset = false) => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const before = reset || endCursor == null ? Number.MAX_SAFE_INTEGER : endCursor;
      const data = await MessageRepository.listMessages(conversationId, { limit: pageSize, before });
      if (reset) setItems(data);
      else setItems(prev => [...prev, ...data]);
      if (data.length > 0) setEndCursor(data[data.length - 1].createdAt);
    } catch (e) {
      setError(e as any);
    } finally {
      setLoading(false);
    }
  }, [conversationId, pageSize, endCursor]);

  useEffect(() => {
    setItems([]);
    setEndCursor(null);
    if (conversationId) void load(true);
  }, [conversationId]);

  // 🎯 事件驱动更新消息（替代轮询机制，性能优化）
  useEffect(() => {
    if (!conversationId) return;

    // 监听消息变化事件，当消息有任何变化时触发重载
    const handleMessageChanged = (changedConversationId?: string) => {
      // 如果事件携带 conversationId，则仅在匹配时重载
      if (!changedConversationId || changedConversationId === conversationId) {
        void load(true); // 重新加载消息列表
      }
    };

    appEvents.on(AppEvents.MESSAGE_CHANGED, handleMessageChanged);

    return () => {
      appEvents.off(AppEvents.MESSAGE_CHANGED, handleMessageChanged);
    };
  }, [conversationId, load]);

  return { items, loading, error, loadMore: () => load(false), reload: () => load(true) } as const;
}

