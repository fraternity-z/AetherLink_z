import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';
import { logger } from '@/utils/logger';

/**
 * 打开图片选择器，允许用户从相册选择背景图片
 * @returns 选择的图片 URI，如果取消则返回 null
 */
export async function selectBackgroundImage(): Promise<string | null> {
  try {
    // 1. 请求权限
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      handlePermissionDenied();
      return null;
    }

    // 2. 打开图片选择器
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],  // 建议竖屏比例
      quality: 0.8,     // 初步压缩质量
    });

    if (result.canceled) {
      logger.debug('User cancelled image picker');
      return null;
    }

    const uri = result.assets[0].uri;
    logger.info('Image selected', { uri });
    return uri;

  } catch (error) {
    logger.error('Failed to select background image', { error });
    Alert.alert('选择失败', '无法打开图片选择器，请稍后重试');
    return null;
  }
}

/**
 * 处理权限被拒绝的情况
 */
function handlePermissionDenied(): void {
  Alert.alert(
    '需要相册权限',
    '请在系统设置中允许 AetherLink 访问相册以选择背景图片',
    [
      { text: '取消', style: 'cancel' },
      {
        text: '去设置',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
        },
      },
    ]
  );
}
