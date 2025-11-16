import { useState, useEffect, useCallback } from 'react';
import { SettingsRepository } from '@/storage/repositories/settings';
import { BackgroundSettings } from '@/storage/core';
import { logger } from '@/utils/logger';

/**
 * 背景设置 Hook
 * 封装背景设置的读写逻辑，提供统一的状态管理接口
 *
 * @example
 * const {
 *   settings,
 *   updateImagePath,
 *   updateOpacity,
 *   toggleEnabled,
 *   reset,
 *   isLoading,
 * } = useBackgroundSettings();
 */
export function useBackgroundSettings() {
  const [settings, setSettings] = useState<BackgroundSettings>({
    imagePath: null,
    opacity: 0.3,
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const repo = SettingsRepository();

  /**
   * 加载背景设置
   */
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await repo.getBackgroundSettings();
      setSettings(data);
    } catch (error) {
      logger.error('Failed to load background settings', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 初始化加载设置
   */
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /**
   * 更新图片路径
   */
  const updateImagePath = useCallback(async (path: string | null) => {
    try {
      await repo.updateBackgroundSettings({ imagePath: path });
      setSettings((prev) => ({ ...prev, imagePath: path }));
    } catch (error) {
      logger.error('Failed to update background image path', { error });
      throw error;
    }
  }, []);

  /**
   * 更新不透明度
   */
  const updateOpacity = useCallback(async (opacity: number) => {
    // 确保值在 0.0-1.0 范围内
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    try {
      await repo.updateBackgroundSettings({ opacity: clampedOpacity });
      setSettings((prev) => ({ ...prev, opacity: clampedOpacity }));
    } catch (error) {
      logger.error('Failed to update background opacity', { error });
      throw error;
    }
  }, []);

  /**
   * 切换启用状态
   */
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    try {
      await repo.updateBackgroundSettings({ enabled });
      setSettings((prev) => ({ ...prev, enabled }));
    } catch (error) {
      logger.error('Failed to toggle background enabled', { error });
      throw error;
    }
  }, []);

  /**
   * 重置为默认设置
   */
  const reset = useCallback(async () => {
    try {
      await repo.updateBackgroundSettings({
        imagePath: null,
        opacity: 0.3,
        enabled: false,
      });
      setSettings({
        imagePath: null,
        opacity: 0.3,
        enabled: false,
      });
    } catch (error) {
      logger.error('Failed to reset background settings', { error });
      throw error;
    }
  }, []);

  return {
    settings,
    updateImagePath,
    updateOpacity,
    toggleEnabled,
    reset,
    isLoading,
    refresh: loadSettings, // 提供手动刷新方法
  };
}
