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
import { InputDialog } from '@/components/common/InputDialog';

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

interface InputDialogOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  maxLength?: number;
  icon?: {
    name: string;
    type?: string;
    color?: string;
  };
  validation?: (value: string) => { valid: boolean; error?: string };
}

interface ConfirmDialogContextType {
  showDialog: (options: ConfirmDialogOptions) => void;
  showInputDialog: (options: InputDialogOptions & { onConfirm: (value: string) => void | Promise<void> }) => void;
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

  const [inputDialogState, setInputDialogState] = useState<{
    visible: boolean;
    options: (InputDialogOptions & { onConfirm: (value: string) => void | Promise<void> }) | null;
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

  const showInputDialog = useCallback((options: InputDialogOptions & { onConfirm: (value: string) => void | Promise<void> }) => {
    setInputDialogState({
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

  const hideInputDialog = useCallback(() => {
    setInputDialogState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ showDialog, showInputDialog, hideDialog }}>
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
      {inputDialogState.options && (
        <InputDialog
          visible={inputDialogState.visible}
          title={inputDialogState.options.title}
          message={inputDialogState.options.message}
          placeholder={inputDialogState.options.placeholder}
          defaultValue={inputDialogState.options.defaultValue}
          multiline={inputDialogState.options.multiline}
          maxLength={inputDialogState.options.maxLength}
          icon={inputDialogState.options.icon}
          validation={inputDialogState.options.validation}
          buttons={[
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              style: 'primary',
              onPress: inputDialogState.options.onConfirm,
            },
          ]}
          onDismiss={hideInputDialog}
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

  const { showDialog, showInputDialog, hideDialog } = context;

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

  /**
   * 显示输入对话框
   *
   * @example
   * const { prompt } = useConfirmDialog();
   *
   * prompt({
   *   title: '重命名',
   *   placeholder: '请输入新名称',
   *   defaultValue: '原名称',
   *   onConfirm: async (value) => {
   *     await handleRename(value);
   *   },
   *   validation: (value) => ({
   *     valid: value.trim().length > 0,
   *     error: '名称不能为空',
   *   }),
   * });
   */
  const prompt = useCallback((
    options: Omit<InputDialogOptions, 'buttons'> & {
      onConfirm: (value: string) => void | Promise<void>;
    }
  ) => {
    showInputDialog(options);
  }, [showInputDialog]);

  return {
    confirm,
    alert,
    confirmAction,
    prompt,
    hide: hideDialog,
  };
}
