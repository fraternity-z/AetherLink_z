/**
 * ⚡ 确认对话框 Hook
 *
 * 功能：
 * - 提供简单的 API 来显示确认对话框
 * - 替代原生 Alert.alert
 * - 支持 Promise 返回结果
 */

import React, { useState, useCallback, createContext, useContext } from 'react';
import { ConfirmDialog, ConfirmDialogButton } from '@/components/common/ConfirmDialog';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  buttons?: ConfirmDialogButton[];
  icon?: {
    name: string;
    type?: string;
    color?: string;
  };
}

interface ConfirmDialogContextType {
  showDialog: (options: ConfirmDialogOptions) => void;
  hideDialog: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    visible: boolean;
    options: ConfirmDialogOptions | null;
  }>({
    visible: false,
    options: null,
  });

  const showDialog = useCallback((options: ConfirmDialogOptions) => {
    setDialogState({
      visible: true,
      options,
    });
  }, []);

  const hideDialog = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      {dialogState.options && (
        <ConfirmDialog
          visible={dialogState.visible}
          title={dialogState.options.title}
          message={dialogState.options.message}
          buttons={dialogState.options.buttons}
          icon={dialogState.options.icon}
          onDismiss={hideDialog}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

/**
 * 使用确认对话框的 Hook
 *
 * @example
 * const { confirm } = useConfirmDialog();
 *
 * // 简单用法
 * confirm({
 *   title: '删除确认',
 *   message: '确定要删除这条记录吗？',
 *   buttons: [
 *     { text: '取消', style: 'cancel' },
 *     { text: '删除', style: 'destructive', onPress: () => handleDelete() }
 *   ]
 * });
 */
export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }

  const { showDialog, hideDialog } = context;

  /**
   * 显示确认对话框
   */
  const confirm = useCallback((options: ConfirmDialogOptions) => {
    showDialog(options);
  }, [showDialog]);

  /**
   * 显示简单的提示对话框
   */
  const alert = useCallback((title: string, message: string, onOk?: () => void) => {
    showDialog({
      title,
      message,
      buttons: [
        {
          text: '确定',
          style: 'default',
          onPress: onOk,
        },
      ],
    });
  }, [showDialog]);

  /**
   * 显示确认/取消对话框
   */
  const confirmAction = useCallback((
    title: string,
    message: string,
    onConfirm?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => {
    showDialog({
      title,
      message,
      buttons: [
        {
          text: options?.cancelText || '取消',
          style: 'cancel',
        },
        {
          text: options?.confirmText || '确定',
          style: options?.destructive ? 'destructive' : 'default',
          onPress: onConfirm,
        },
      ],
    });
  }, [showDialog]);

  return {
    confirm,
    alert,
    confirmAction,
    hide: hideDialog,
  };
}
