/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// 🎨 主题风格定义
export type ThemeStyle = 
  | 'default' 
  | 'claude' 
  | 'nature' 
  | 'tech' 
  | 'soft' 
  | 'ocean' 
  | 'sunset' 
  | 'slate' 
  | 'horizon' 
  | 'cherry';

export interface ThemeColorSpec {
  primary: string;
  secondary: string;
  tertiary: string;
  gradient: string[];
  description: string;
  label: string;
}

// 🎨 主题预设配置
export const ThemePresets: Record<ThemeStyle, ThemeColorSpec> = {
  default: {
    label: '默认主题',
    description: '简洁现代的默认设计风格',
    primary: '#9333EA',
    secondary: '#754AB4',
    tertiary: '#8B5CF6',
    gradient: ['#9333EA', '#754AB4'],
  },
  claude: {
    label: 'Claude 风格',
    description: '温暖优雅的 Claude AI 设计风格',
    primary: '#D97757',
    secondary: '#C46245',
    tertiary: '#E6967B',
    gradient: ['#D97757', '#C46245'],
  },
  nature: {
    label: '自然风格',
    description: '2025年流行的自然系大地色调设计',
    primary: '#50623A',
    secondary: '#41522D',
    tertiary: '#6E7F54',
    gradient: ['#50623A', '#41522D'],
  },
  tech: {
    label: '未来科技',
    description: '2025年流行的科技感设计，冷色调与玻璃态效果',
    primary: '#3B82F6',
    secondary: '#2563EB',
    tertiary: '#60A5FA',
    gradient: ['#3B82F6', '#2563EB'],
  },
  soft: {
    label: '柔和渐变',
    description: '2025年流行的柔和渐变设计，温暖舒适的视觉体验',
    primary: '#EC4899',
    secondary: '#DB2777',
    tertiary: '#F472B6',
    gradient: ['#EC4899', '#DB2777'],
  },
  ocean: {
    label: '海洋风格',
    description: '2025年流行的海洋蓝绿色系，清新舒适的视觉体验',
    primary: '#06B6D4',
    secondary: '#0891B2',
    tertiary: '#22D3EE',
    gradient: ['#06B6D4', '#0891B2'],
  },
  sunset: {
    label: '日落风格',
    description: '2025年流行的日落色系，温暖浪漫的视觉氛围',
    primary: '#F97316',
    secondary: '#EA580C',
    tertiary: '#FB923C',
    gradient: ['#F97316', '#EA580C'],
  },
  slate: {
    label: '肉桂板岩',
    description: '2025年流行趋势：深邃温暖的色调，带来内心的平静',
    primary: '#8D6E63', // Brownish
    secondary: '#795548',
    tertiary: '#A1887F',
    gradient: ['#8D6E63', '#795548'],
  },
  horizon: {
    label: '地平线绿',
    description: '2025年日本代表色：带蓝调的绿色，象征希望与自然',
    primary: '#10B981',
    secondary: '#059669',
    tertiary: '#34D399',
    gradient: ['#10B981', '#059669'],
  },
  cherry: {
    label: '樱桃编码',
    description: '2025年流行趋势：深樱桃红色，传达热情与活力',
    primary: '#E11D48',
    secondary: '#BE123C',
    tertiary: '#FB7185',
    gradient: ['#E11D48', '#BE123C'],
  },
};

// 兼容旧代码的 AppColors (使用默认主题)
export const AppColors = {
  ...ThemePresets.default,
  surface: '#F5F5F5',        // 表面色
  error: '#EF4444',          // 错误色
  success: '#10B981',        // 成功色
  warning: '#F59E0B',        // 警告色
  info: '#3B82F6',          // 信息色
};

// 辅助函数：生成特定风格的主题
export const getThemeColors = (style: ThemeStyle) => {
  const preset = ThemePresets[style] || ThemePresets.default;
  return {
    ...AppColors, // 基础颜色
    primary: preset.primary,
    secondary: preset.secondary,
    tertiary: preset.tertiary,
    gradient: preset.gradient,
  };
};

// 📱 React Native Paper 浅色主题 (默认)
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

// 🌙 React Native Paper 深色主题 (默认)
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
