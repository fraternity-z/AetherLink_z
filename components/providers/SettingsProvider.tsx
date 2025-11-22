import { ThemeStyle } from '@/constants/theme';
import { SettingKey, SettingsRepository } from '@/storage/repositories/settings';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppSettings = {
  fontScale: number; // 基准 16
  setFontScale: (v: number) => Promise<void>;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => Promise<void>;
  themeStyle: ThemeStyle;
  setThemeStyle: (s: ThemeStyle) => Promise<void>;
};

const SettingsContext = createContext<AppSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const sr = useMemo(() => SettingsRepository(), []);
  const [fontScale, _setFontScale] = useState<number>(16);
  const [themeMode, _setThemeMode] = useState<ThemeMode>('system');
  const [themeStyle, _setThemeStyle] = useState<ThemeStyle>('default');

  useEffect(() => {
    (async () => {
      const fs = await sr.get<number>(SettingKey.FontScale);
      const tm = await sr.get<ThemeMode>(SettingKey.Theme);
      const ts = await sr.get<ThemeStyle>(SettingKey.ThemeStyle);
      
      if (typeof fs === 'number' && !Number.isNaN(fs)) _setFontScale(fs);
      if (tm === 'light' || tm === 'dark' || tm === 'system') _setThemeMode(tm);
      if (ts) _setThemeStyle(ts);
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

  const setThemeStyle = useCallback(async (s: ThemeStyle) => {
    _setThemeStyle(s);
    await sr.set(SettingKey.ThemeStyle, s);
  }, [sr]);

  const value = useMemo<AppSettings>(() => ({
    fontScale,
    setFontScale,
    themeMode,
    setThemeMode,
    themeStyle,
    setThemeStyle
  }), [fontScale, setFontScale, setThemeMode, themeMode, themeStyle, setThemeStyle]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within SettingsProvider');
  return ctx;
}
