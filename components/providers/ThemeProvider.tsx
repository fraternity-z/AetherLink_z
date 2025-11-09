/**
 * 🎨 应用主题提供者
 *
 * 功能：
 * - 集成 React Native Paper 的 PaperProvider
 * - 根据系统主题自动切换浅色/深色模式
 * - 提供统一的主题管理
 */

import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { paperLightTheme, paperDarkTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppThemeProviderProps {
  children: React.ReactNode;
}

import { useAppSettings } from './SettingsProvider';

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  // 获取系统主题偏好
  const colorScheme = useColorScheme();
  const { fontScale, themeMode } = useAppSettings();
  const scheme = themeMode === 'system' ? colorScheme : themeMode;
  const baseTheme = scheme === 'dark' ? paperDarkTheme : paperLightTheme;

  const ratio = Math.max(0.5, Math.min(3, fontScale / 16));

  const scaledFonts = React.useMemo(() => {
    const f: any = baseTheme.fonts as any;
    const out: any = {};
    for (const k in f) {
      const item = f[k];
      if (item && typeof item === 'object') {
        const newSize = typeof item.fontSize === 'number' ? Math.round(item.fontSize * ratio) : item.fontSize;
        const newLine = typeof item.lineHeight === 'number' ? Math.round(item.lineHeight * ratio) : item.lineHeight;
        out[k] = { ...item, fontSize: newSize, lineHeight: newLine };
      } else {
        out[k] = item;
      }
    }
    return out;
  }, [baseTheme, ratio]);

  const theme = React.useMemo(() => ({
    ...baseTheme,
    fonts: scaledFonts,
  }), [baseTheme, scaledFonts]);

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}
