import { useEffect, useState, useCallback } from 'react';
import { QuickPhrase } from '@/storage/core';
import { QuickPhrasesRepository } from '@/storage/repositories/quick-phrases';

/**
 * useQuickPhrases Hook - 快捷短语业务逻辑封装
 *
 * 提供快捷短语的完整管理功能，包括 CRUD 操作和排序功能
 */
export function useQuickPhrases() {
  const [phrases, setPhrases] = useState<QuickPhrase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 刷新快捷短语列表
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await QuickPhrasesRepository.getAll();
      setPhrases(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 创建快捷短语
   */
  const create = useCallback(async (input: {
    title: string;
    content: string;
    icon?: string | null;
    color?: string | null;
  }) => {
    try {
      const newPhrase = await QuickPhrasesRepository.create({
        ...input,
        sortOrder: phrases.length, // 新短语排在最后
      });
      setPhrases(prev => [...prev, newPhrase]);
      return newPhrase;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, [phrases.length]);

  /**
   * 更新快捷短语
   */
  const update = useCallback(async (
    id: string,
    updates: Partial<Omit<QuickPhrase, 'id' | 'createdAt'>>
  ) => {
    try {
      await QuickPhrasesRepository.update(id, updates);
      setPhrases(prev =>
        prev.map(phrase =>
          phrase.id === id
            ? { ...phrase, ...updates, updatedAt: Date.now() }
            : phrase
        )
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  /**
   * 删除快捷短语
   */
  const deletePhrase = useCallback(async (id: string) => {
    try {
      await QuickPhrasesRepository.delete(id);
      setPhrases(prev => prev.filter(phrase => phrase.id !== id));
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  /**
   * 重新排序快捷短语
   * @param ids 按新顺序排列的 ID 数组
   */
  const reorder = useCallback(async (ids: string[]) => {
    try {
      await QuickPhrasesRepository.reorder(ids);
      // 乐观更新 UI
      setPhrases(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        return ids
          .map((id, index) => {
            const phrase = map.get(id);
            return phrase ? { ...phrase, sortOrder: index } : null;
          })
          .filter((p): p is QuickPhrase => p !== null);
      });
    } catch (e) {
      setError(e as Error);
      // 发生错误时重新加载以恢复正确顺序
      await refresh();
      throw e;
    }
  }, [refresh]);

  /**
   * 搜索快捷短语
   */
  const search = useCallback(async (keyword: string) => {
    try {
      const results = await QuickPhrasesRepository.search(keyword);
      return results;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    phrases,
    loading,
    error,
    refresh,
    create,
    update,
    delete: deletePhrase,
    reorder,
    search,
  } as const;
}
