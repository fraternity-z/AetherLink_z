import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { logger } from '@/utils/logger';

/**
 * useUserProfile Hook 返回值接口
 */
export interface UseUserProfileResult {
  /** 当前头像 URI，null 表示使用默认头像 */
  avatarUri: string | null;
  /** 加载状态 */
  isLoading: boolean;
  /** 选择并设置新头像（带裁剪功能） */
  pickImage: () => Promise<void>;
  /** 移除当前头像，恢复默认头像 */
  removeAvatar: () => Promise<void>;
}

/**
 * 用户头像管理 Hook
 *
 * 提供用户头像的获取、设置和移除功能，使用 SettingsRepository 进行持久化存储。
 *
 * @example
 * ```tsx
 * const { avatarUri, isLoading, pickImage, removeAvatar } = useUserProfile();
 *
 * // 显示头像
 * {avatarUri ? (
 *   <Avatar.Image source={{ uri: avatarUri }} size={40} />
 * ) : (
 *   <Avatar.Icon icon="account" size={40} />
 * )}
 *
 * // 选择新头像
 * <Button onPress={pickImage}>更换头像</Button>
 * ```
 *
 * @returns {UseUserProfileResult} Hook 状态和操作方法
 */
export function useUserProfile(): UseUserProfileResult {
  const repo = SettingsRepository();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 加载头像 URI
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const uri = await repo.get<string>(SettingKey.UserAvatarUri);
        if (mounted) {
          setAvatarUri(uri);
        }
      } catch (error) {
        logger.error('[useUserProfile] 加载头像失败:', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * 请求相册权限
   * @returns {Promise<boolean>} 是否获得权限
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '需要相册权限',
          '请在设置中允许访问相册以选择头像。',
          [{ text: '确定' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[useUserProfile] 请求权限失败:', error);
      return false;
    }
  }, []);

  /**
   * 选择并设置新头像
   * 打开系统图片选择器，支持 1:1 裁剪，保存选择的图片 URI
   */
  const pickImage = useCallback(async () => {
    // 检查是否已在加载中
    if (isLoading) {
      return;
    }

    try {
      // 请求权限
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return;
      }

      setIsLoading(true);

      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // 正方形裁剪，适合圆形头像
        quality: 0.8, // 压缩质量 80%
      });

      // 用户取消选择
      if (result.canceled || !result.assets?.[0]) {
        setIsLoading(false);
        return;
      }

      const selectedImage = result.assets[0];
      const uri = selectedImage.uri;

      // 保存头像 URI 到设置
      await repo.set(SettingKey.UserAvatarUri, uri);

      // 更新状态
      setAvatarUri(uri);

      logger.info('[useUserProfile] 头像更新成功:', uri);
    } catch (error) {
      logger.error('[useUserProfile] 选择头像失败:', error);
      Alert.alert('错误', '无法设置头像，请重试。');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, requestPermission]);

  /**
   * 移除当前头像
   * 清除设置中的头像 URI，恢复为默认头像
   */
  const removeAvatar = useCallback(async () => {
    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      // 清除设置中的头像 URI
      await repo.set(SettingKey.UserAvatarUri, null);

      // 更新状态
      setAvatarUri(null);

      logger.info('[useUserProfile] 头像已重置为默认');
    } catch (error) {
      logger.error('[useUserProfile] 移除头像失败:', error);
      Alert.alert('错误', '无法移除头像，请重试。');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return {
    avatarUri,
    isLoading,
    pickImage,
    removeAvatar,
  };
}
