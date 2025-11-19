import { LegacyKeyAdapter } from '@/storage/adapters/legacy-key-adapter';
import { initMigrations } from '@/storage/sqlite/db';
import { logger } from '@/utils/logger';
import { fetch as expoFetch } from 'expo/fetch';
import React, { createContext, useContext, useEffect, useState } from 'react';

type DataContextType = {
  isReady: boolean;
};

const DataContext = createContext<DataContextType>({ isReady: false });

export const useAppData = () => useContext(DataContext);

type Props = { children: React.ReactNode };

export function AppDataProvider({ children }: Props) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 覆盖原生端 fetch 为 expo/fetch，确保流式稳定
    // @ts-expect-error RN 类型不完全匹配
    globalThis.fetch = expoFetch;

    // Initialize database schema and migrate legacy data on app start
    (async () => {
      try {
        // 1. 初始化数据库结构
        await initMigrations();

        // 2. 自动迁移单 Key 到多 Key 表（向后兼容）
        await LegacyKeyAdapter.migrateFromAsyncStorage();

        logger.info('[AppDataProvider] 数据库初始化和迁移完成');
      } catch (e) {
        logger.error('[AppDataProvider] 数据库初始化失败', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  return (
    <DataContext.Provider value={{ isReady }}>
      {children}
    </DataContext.Provider>
  );
}
