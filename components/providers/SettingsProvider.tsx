import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppSettings = {
  fontScale: number; // 基准 16
  setFontScale: (v: number) => Promise<void>;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => Promise<void>;
};

const SettingsContext = createContext<AppSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const sr = useMemo(() => SettingsRepository(), []);
  const [fontScale, _setFontScale] = useState<number>(16);
  const [themeMode, _setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const fs = await sr.get<number>(SettingKey.FontScale);
      const tm = await sr.get<ThemeMode>(SettingKey.Theme);
      if (typeof fs === 'number' && !Number.isNaN(fs)) _setFontScale(fs);
      if (tm === 'light' || tm === 'dark' || tm === 'system') _setThemeMode(tm);
    })();
  }, [sr]);

  const setFontScale = useCallback(async (v: number) => {
    const rounded = Math.round(v);
    _setFontScale(rounded);
    await sr.set(SettingKey.FontScale, rounded);
  }, [sr]);

  const setThemeMode = useCallback(async (m: ThemeMode) => {
    _setThemeMode(m);
    await sr.set(SettingKey.Theme, m);
  }, [sr]);

  const value = useMemo<AppSettings>(() => ({ fontScale, setFontScale, themeMode, setThemeMode }), [fontScale, setFontScale, setThemeMode, themeMode]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within SettingsProvider');
  return ctx;
}
