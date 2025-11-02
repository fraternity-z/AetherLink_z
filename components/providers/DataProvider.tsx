import React, { useEffect } from 'react';
import { initMigrations } from '@/storage/sqlite/db';

type Props = { children: React.ReactNode };

export function AppDataProvider({ children }: Props) {
  useEffect(() => {
    // Initialize database schema on app start
    initMigrations().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('DB init failed', e);
    });
  }, []);

  return <>{children}</>;
}

