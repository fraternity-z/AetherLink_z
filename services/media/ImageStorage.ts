import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '@/utils/logger';

const BACKGROUND_DIR = `${FileSystemLegacy.documentDirectory}backgrounds/`;
const CURRENT_BACKGROUND_FILENAME = 'current_background.jpg';

/**
 * 保存背景图片到本地存储
 * 注意：会自动删除旧背景图片，仅保留当前背景
 *
 * @param uri - 原始图片 URI
 * @returns 保存后的本地文件路径
 */
export async function saveBackgroundImage(uri: string): Promise<string> {
  try {
    // 1. 确保目录存在
    await ensureDirectoryExists();

    // 2. 删除旧背景图片
    await deleteOldBackground();

    // 3. 图片优化（压缩 + 缩放）
    logger.debug('Optimizing background image', { uri });
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // 限制宽度，保持宽高比
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // 4. 保存到固定路径（覆盖旧文件）
    const destPath = `${BACKGROUND_DIR}${CURRENT_BACKGROUND_FILENAME}`;
    await FileSystemLegacy.moveAsync({
      from: manipResult.uri,
      to: destPath,
    });

    // 5. 验证文件大小
    const fileInfo = await FileSystemLegacy.getInfoAsync(destPath);
    if (!fileInfo.exists) {
      throw new Error('Failed to save background image');
    }

    const fileSizeMB = fileInfo.size / 1024 / 1024;
    logger.info('Background image saved', {
      path: destPath,
      size: `${fileSizeMB.toFixed(2)} MB`,
    });

    return destPath;

  } catch (error) {
    logger.error('Failed to save background image', { error });
    throw error;
  }
}

/**
 * 删除当前背景图片
 * 用于重置背景或更换图片时清理存储
 */
export async function deleteBackgroundImage(path?: string): Promise<void> {
  try {
    const targetPath = path ?? `${BACKGROUND_DIR}${CURRENT_BACKGROUND_FILENAME}`;
    const fileInfo = await FileSystemLegacy.getInfoAsync(targetPath);

    if (fileInfo.exists) {
      await FileSystemLegacy.deleteAsync(targetPath);
      logger.info('Background image deleted', { path: targetPath });
    }
  } catch (error) {
    logger.error('Failed to delete background image', { error });
    // 不抛出错误，避免影响后续操作
  }
}

/**
 * 删除旧背景图片（内部方法）
 */
async function deleteOldBackground(): Promise<void> {
  const oldPath = `${BACKGROUND_DIR}${CURRENT_BACKGROUND_FILENAME}`;
  await deleteBackgroundImage(oldPath);
}

/**
 * 确保背景图片目录存在
 */
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystemLegacy.getInfoAsync(BACKGROUND_DIR);
  if (!dirInfo.exists) {
    await FileSystemLegacy.makeDirectoryAsync(BACKGROUND_DIR, { intermediates: true });
    logger.debug('Background directory created', { path: BACKGROUND_DIR });
  }
}

/**
 * 检查存储空间是否充足
 * @param requiredMB - 所需空间（MB）
 * @returns 空间是否充足
 */
export async function checkStorageSpace(requiredMB: number = 10): Promise<boolean> {
  try {
    const freeSpace = await FileSystemLegacy.getFreeDiskStorageAsync();
    const freeSpaceMB = freeSpace / 1024 / 1024;

    logger.debug('Storage space check', {
      free: `${freeSpaceMB.toFixed(2)} MB`,
      required: `${requiredMB} MB`,
    });

    return freeSpaceMB >= 50; // 最小剩余空间 50MB
  } catch (error) {
    logger.error('Failed to check storage space', { error });
    return true; // 默认认为空间充足，避免阻塞用户操作
  }
}
