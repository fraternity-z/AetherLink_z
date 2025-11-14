/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// 🎨 Material Design 3 主题配置（参考 AetherLink 紫色系设计）
export const AppColors = {
  primary: '#9333EA',        // 主色（紫色）
  secondary: '#754AB4',      // 次要色
  tertiary: '#8B5CF6',       // 第三色
  gradient: ['#9333EA', '#754AB4'], // 渐变色
  surface: '#F5F5F5',        // 表面色
  error: '#EF4444',          // 错误色
  success: '#10B981',        // 成功色
  warning: '#F59E0B',        // 警告色
  info: '#3B82F6',          // 信息色
};

// 📱 React Native Paper 浅色主题
export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    tertiary: AppColors.tertiary,
    surface: '#FFFFFF',
    surfaceVariant: AppColors.surface,
    background: '#FFFFFF',
    error: AppColors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#11181C',
    onBackground: '#11181C',
  },
  roundness: 12, // 圆角大小
};

// 🌙 React Native Paper 深色主题
export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    tertiary: AppColors.tertiary,
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
    background: '#121212',
    error: AppColors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#ECEDEE',
    onBackground: '#ECEDEE',
  },
  roundness: 12,
};
