/**
 * 🎨 应用主题提供者
 *
 * 功能：
 * - 集成 React Native Paper 的 PaperProvider
 * - 根据系统主题自动切换浅色/深色模式
 * - 提供统一的主题管理
 */

import { getThemeColors, paperDarkTheme, paperLightTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { useAppSettings } from './SettingsProvider';

interface AppThemeProviderProps {
  children: React.ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  // 获取系统主题偏好
  const colorScheme = useColorScheme();
  const { fontScale, themeMode, themeStyle } = useAppSettings();
  const scheme = themeMode === 'system' ? colorScheme : themeMode;
  
  // 获取基础主题（包含默认颜色）
  const baseTheme = scheme === 'dark' ? paperDarkTheme : paperLightTheme;
  
  // 获取当前风格的颜色
  const currentStyleColors = React.useMemo(() => getThemeColors(themeStyle), [themeStyle]);

  // 合并主题：将风格颜色应用到 Paper 主题中
  const mergedTheme = React.useMemo(() => {
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: currentStyleColors.primary,
        secondary: currentStyleColors.secondary,
        tertiary: currentStyleColors.tertiary,
        error: currentStyleColors.error,
        // 确保 surfaceVariant 在浅色模式下使用风格化颜色或保持默认
        // 这里我们主要覆盖主色调
      },
    };
  }, [baseTheme, currentStyleColors]);

  const ratio = Math.max(0.5, Math.min(3, fontScale / 16));

  const scaledFonts = React.useMemo(() => {
    // 定义字体配置接口
    interface ThemeFontConfig {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string;
      letterSpacing?: number;
      lineHeight?: number;
    }

    // 使用 Record<string, ThemeFontConfig> 替代 any
    const f = mergedTheme.fonts as unknown as Record<string, ThemeFontConfig>;
    const out: Record<string, ThemeFontConfig> = {};
    
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
    ...mergedTheme,
    fonts: scaledFonts,
  }), [mergedTheme, scaledFonts]);

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}
