/**
 * 🎨 统一弹出框样式配置
 *
 * 提供所有弹出框组件共享的样式常量和工具函数
 */

import { Platform, StyleSheet } from 'react-native';

/**
 * 弹出框圆角大小
 */
export const DIALOG_RADIUS = {
  dialog: 24,      // 居中对话框圆角
  sheet: 24,       // 底部Sheet顶部圆角
  button: 12,      // 按钮圆角
  card: 16,        // 卡片圆角
  icon: 16,        // 图标容器圆角
} as const;

/**
 * 弹出框间距
 */
export const DIALOG_SPACING = {
  padding: 24,     // 标准内边距
  gap: 12,         // 元素间距
  buttonHeight: 48, // 按钮高度
} as const;

/**
 * 弹出框阴影样式
 */
export const DIALOG_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  android: {
    elevation: 16,
  },
  default: {},
});

/**
 * 底部Sheet阴影样式
 */
export const SHEET_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  android: {
    elevation: 12,
  },
  default: {},
});

/**
 * 创建统一的覆盖层样式
 */
export const createOverlayStyle = () =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    centerOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    bottomOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  });

/**
 * 动画配置
 */
export const DIALOG_ANIMATION = {
  duration: 200,
  springTension: 80,
  springFriction: 12,
} as const;

export const SHEET_ANIMATION = {
  duration: 200,
  springTension: 65,
  springFriction: 10,
} as const;
