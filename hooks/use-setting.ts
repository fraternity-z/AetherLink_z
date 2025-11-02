import { useEffect, useState, useCallback } from 'react';
import { SettingKey, SettingsRepository } from '@/storage/repositories/settings';

export function useSetting<T>(key: SettingKey, defaultValue: T) {
  const repo = SettingsRepository();
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await repo.get<T>(key);
        if (mounted && v !== null && v !== undefined) setValue(v as T);
      } catch (e: any) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  const update = useCallback(async (next: T) => {
    setValue(next);
    try {
      await repo.set<T>(key, next);
    } catch (e) {
      setError(e as any);
    }
  }, [key]);

  return [value, update, { loading, error }] as const;
}

