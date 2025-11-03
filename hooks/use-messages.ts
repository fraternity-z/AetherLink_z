import { useEffect, useState, useCallback } from 'react';
import { Message } from '@/storage/core';
import { MessageRepository } from '@/storage/repositories/messages';

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

  // 实时轮询更新消息（用于流式响应）
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      try {
        const latestMessages = await MessageRepository.listMessages(conversationId, { limit: pageSize });
        if (latestMessages.length > items.length) {
          setItems(latestMessages);
        } else if (latestMessages.length === items.length) {
          // 检查最后一条消息是否有更新（流式响应）
          const lastMessage = latestMessages[latestMessages.length - 1];
          const currentLastMessage = items[items.length - 1];
          if (lastMessage && currentLastMessage && lastMessage.id === currentLastMessage.id) {
            if (lastMessage.text !== currentLastMessage.text || lastMessage.status !== currentLastMessage.status) {
              setItems(latestMessages);
            }
          }
        }
      } catch (e) {
        console.error('[useMessages] Polling error', e);
      }
    }, 500); // 每500ms检查一次

    return () => clearInterval(interval);
  }, [conversationId, pageSize, items.length]);

  return { items, loading, error, loadMore: () => load(false), reload: () => load(true) } as const;
}

