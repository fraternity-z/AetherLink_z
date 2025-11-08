/**
 * 🎨 统一弹出框组件导出
 *
 * 所有弹出框组件都采用统一的白色圆角方框样式
 */

// 基础弹出框组件
export { UnifiedDialog } from './UnifiedDialog';
export type { UnifiedDialogProps, UnifiedDialogAction } from './UnifiedDialog';

export { UnifiedBottomSheet } from './UnifiedBottomSheet';
export type { UnifiedBottomSheetProps } from './UnifiedBottomSheet';

// 功能性弹出框
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogButton } from './ConfirmDialog';

export { InputDialog } from './InputDialog';

// 弹出框样式常量
export * from './dialog-styles';
