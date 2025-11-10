import { useState, useEffect } from 'react';
import { Platform, Linking } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import type { PermissionStatus } from 'expo-modules-core';
import { logger } from '@/utils/logger';

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
        logger.error('[MicrophonePermission] Initial check failed:', error);
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
      logger.error('[MicrophonePermission] Check failed:', error);
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
        return true;
      } else if (response.status === 'denied') {
        logger.warn('[MicrophonePermission] Permission denied');
      }

      return false;
    } catch (error) {
      logger.error('[MicrophonePermission] Request failed:', error);
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
      logger.debug('[MicrophonePermission] Opened settings');
    } catch (error) {
      logger.error('[MicrophonePermission] Failed to open settings:', error);
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
