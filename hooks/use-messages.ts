import { useEffect, useState, useCallback, useRef } from 'react';
import { Message } from '@/storage/core';
import { MessageRepository } from '@/storage/repositories/messages';
import { appEvents, AppEvents } from '@/utils/events';

export function useMessages(conversationId: string | null, pageSize = 50) {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [endCursor, setEndCursor] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 🚀 性能优化：节流重载定时器（避免高频事件导致频繁数据库查询）
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setError(e instanceof Error ? e : new Error(String(e)));
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
        // 🚀 性能优化：使用节流重载，避免高频事件导致频繁数据库查询
        // 清除之前的定时器
        if (reloadTimerRef.current) {
          clearTimeout(reloadTimerRef.current);
        }

        // 设置新的定时器（300ms 内的多次变更合并为一次重载）
        reloadTimerRef.current = setTimeout(() => {
          void load(true);
          reloadTimerRef.current = null;
        }, 300);
      }
    };

    appEvents.on(AppEvents.MESSAGE_CHANGED, handleMessageChanged);

    return () => {
      appEvents.off(AppEvents.MESSAGE_CHANGED, handleMessageChanged);
      // 清理定时器
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [conversationId, load]);

  return { items, loading, error, loadMore: () => load(false), reload: () => load(true) } as const;
}

