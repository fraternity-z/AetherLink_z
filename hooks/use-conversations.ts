import { useEffect, useState, useCallback } from 'react';
import { Conversation } from '@/storage/core';
import { ChatRepository } from '@/storage/repositories/chat';

export function useConversations(opts?: { archived?: boolean; limit?: number }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ChatRepository.listConversations({ archived: opts?.archived, limit: opts?.limit ?? 50, offset: 0 });
      setItems(data);
    } catch (e) {
      setError(e as any);
    } finally {
      setLoading(false);
    }
  }, [opts?.archived, opts?.limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload } as const;
}

