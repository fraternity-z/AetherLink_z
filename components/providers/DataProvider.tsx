import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { initMigrations } from '@/storage/sqlite/db';
import { logger } from '@/utils/logger';

type Props = { children: React.ReactNode };

export function AppDataProvider({ children }: Props) {
  useEffect(() => {
    // 覆盖原生端 fetch 为 expo/fetch，确保流式稳定
    if (Platform.OS !== 'web') {
      // @ts-expect-error RN 类型不完全匹配
      globalThis.fetch = expoFetch;
    }

  // Initialize database schema on app start
  (async () => {
    try {
      await initMigrations();
    } catch (e) {
      logger.error('DB init failed', e);
    }
  })();
  }, []);

  return <>{children}</>;
}
