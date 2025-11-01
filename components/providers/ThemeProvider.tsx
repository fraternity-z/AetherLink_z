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

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  // 获取系统主题偏好
  const colorScheme = useColorScheme();

  // 根据系统主题选择对应的 Paper 主题
  const theme = colorScheme === 'dark' ? paperDarkTheme : paperLightTheme;

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}
