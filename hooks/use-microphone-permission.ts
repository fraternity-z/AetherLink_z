import { useState, useEffect } from 'react';
import { Platform, Linking } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import type { PermissionStatus } from 'expo-modules-core';
import { logger } from '@/utils/logger';
import { PermissionError } from '@/utils/errors';
import { ErrorCode } from '@/utils/error-codes';

/**
 * 麦克风权限管理 Hook
 *
 * 提供麦克风权限的检查、请求和设置页面打开功能
 */
export function useMicrophonePermission() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查权限状态
  useEffect(() => {
    (async () => {
      try {
        const response = await getRecordingPermissionsAsync();
        setPermissionStatus(response.status);
        logger.debug('[MicrophonePermission] Initial status:', response.status);
      } catch (error) {
        const permError = new PermissionError(
          '无法检查麦克风权限状态',
          ErrorCode.PERM_ERR_CHECK,
          { platform: Platform.OS },
          error instanceof Error ? error : undefined
        );
        logger.error('[MicrophonePermission] Initial check failed', permError, permError.getContext());
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * 检查麦克风权限状态
   */
  const checkPermission = async (): Promise<boolean> => {
    try {
      logger.debug('[MicrophonePermission] Checking permission');
      const response = await getRecordingPermissionsAsync();
      setPermissionStatus(response.status);
      return response.status === 'granted';
    } catch (error) {
      const permError = new PermissionError(
        '检查麦克风权限失败',
        ErrorCode.PERM_ERR_CHECK,
        { platform: Platform.OS },
        error instanceof Error ? error : undefined
      );
      logger.error('[MicrophonePermission] Check failed', permError, permError.getContext());
      return false;
    }
  };

  /**
   * 请求麦克风权限
   */
  const requestPermissionAsync = async (): Promise<boolean> => {
    try {
      logger.debug('[MicrophonePermission] Requesting permission');
      const response = await requestRecordingPermissionsAsync();
      setPermissionStatus(response.status);

      if (response.status === 'granted') {
        logger.info('[MicrophonePermission] Permission granted', {
          platform: Platform.OS,
        });
        return true;
      } else if (response.status === 'denied') {
        logger.warn('[MicrophonePermission] Permission denied by user', {
          platform: Platform.OS,
          status: response.status,
        });
      }

      return false;
    } catch (error) {
      const permError = new PermissionError(
        '请求麦克风权限失败',
        ErrorCode.PERM_ERR_REQUEST,
        { platform: Platform.OS },
        error instanceof Error ? error : undefined
      );
      logger.error('[MicrophonePermission] Request failed', permError, permError.getContext());
      return false;
    }
  };

  /**
   * 打开系统设置页面
   */
  const openSettings = async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
      logger.info('[MicrophonePermission] Opened system settings', {
        platform: Platform.OS,
      });
    } catch (error) {
      const permError = new PermissionError(
        '无法打开系统设置页面',
        ErrorCode.PERM_ERR_SETTINGS,
        { platform: Platform.OS },
        error instanceof Error ? error : undefined
      );
      logger.error('[MicrophonePermission] Failed to open settings', permError, permError.getContext());
    }
  };

  return {
    permissionStatus,
    isLoading,
    isGranted: permissionStatus === 'granted',
    isDenied: permissionStatus === 'denied',
    isUndetermined: permissionStatus === 'undetermined' || permissionStatus === null,
    checkPermission,
    requestPermission: requestPermissionAsync,
    openSettings,
  };
}
