# 自定义背景功能实施规划文档

## 已明确的决策

- **图片选择方案**：使用 `expo-image-picker` 提供原生图片选择器
- **本地存储方案**：使用 Expo FileSystem API 存储图片文件 + SQLite 存储配置路径
- **UI 组件库**：延续使用 React Native Paper 5.14.5 保持设计一致性
- **Slider 组件**：使用 `@react-native-community/slider ^4.5.4`（官方推荐）
- **背景图片存储策略**：仅保留当前背景，替换时删除旧图片
- **背景效果**：仅支持不透明度调整（0-100%）
- **跨平台支持**：仅支持 iOS 和 Android，不支持 Web
- **存储位置**：所有资源仅保存在设备本地，不涉及云端同步

## 整体规划概述

### 项目目标

为 AetherLink_z 聊天应用添加自定义背景功能，允许用户：
1. 从设备相册选择图片作为聊天页面背景
2. 实时调整背景不透明度（0-100%）
3. 预览背景效果并随时重置为默认
4. 所有配置和资源仅存储在本地设备

**用户价值**：
- 🎨 提供个性化的聊天体验
- 👀 减轻长时间聊天的视觉疲劳
- 🔒 隐私优先，所有资源本地化存储
- ⚡ 无需网络连接即可使用自定义背景

### 技术栈

- **前端框架**：React Native 0.81.5 + Expo 54
- **UI 组件**：React Native Paper 5.14.5
- **路由系统**：Expo Router（文件路由）
- **图片选择**：expo-image-picker ^16.0.5
- **文件系统**：expo-file-system ^18.0.6
- **图片处理**：expo-image-manipulator ^12.1.1（用于图片优化）
- **本地存储**：Expo SQLite（配置持久化）
- **Slider 组件**：@react-native-community/slider ^4.5.4
- **状态管理**：React Hooks + Context

### 主要阶段

1. **阶段 1：基础设施搭建**（数据层 + 配置管理）
2. **阶段 2：图片选择与存储**（文件系统集成）
3. **阶段 3：UI 实现**（设置页面 + 主聊天页面背景渲染）
4. **阶段 4：性能优化与测试**（跨平台验证 + 性能调优）

---

## 详细任务分解

### 阶段 1：基础设施搭建

#### 任务 1.1：数据库 Schema 扩展

**目标**：在 settings 表中添加背景配置字段

**输入**：
- 当前数据库结构（`storage/sqlite/migrations/`）
- 设置数据模型（`storage/repositories/settings.ts`）

**输出**：
- 新增数据库迁移文件
- 更新 TypeScript 类型定义

**涉及文件**：
```
storage/sqlite/migrations/000X_add_background_settings.ts
storage/core.ts（新增 BackgroundSettings 类型）
storage/repositories/settings.ts（扩展 CRUD 方法）
```

**具体实现**：

**方案：扩展 settings 表**（推荐，与现有设置模式一致）

```typescript
// storage/sqlite/migrations/000X_add_background_settings.ts
import { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- 添加背景相关字段到 settings 表
    ALTER TABLE settings ADD COLUMN background_image_path TEXT DEFAULT NULL;
    ALTER TABLE settings ADD COLUMN background_opacity REAL DEFAULT 0.3;
    ALTER TABLE settings ADD COLUMN background_enabled INTEGER DEFAULT 0;
  `);
}

export async function down(db: SQLiteDatabase): Promise<void> {
  // SQLite 不支持 DROP COLUMN，需要重建表（仅开发环境使用）
  // 生产环境不建议执行回滚操作
}
```

**TypeScript 类型定义**：

```typescript
// storage/core.ts
export interface BackgroundSettings {
  imagePath: string | null;      // 本地文件路径
  opacity: number;                // 不透明度 (0.0-1.0)
  enabled: boolean;               // 是否启用
}

// 扩展现有的 Settings 接口
export interface Settings {
  // ... 现有字段
  backgroundImagePath?: string | null;
  backgroundOpacity?: number;
  backgroundEnabled?: boolean;
}
```

**Repository 层扩展**：

```typescript
// storage/repositories/settings.ts
export async function getBackgroundSettings(): Promise<BackgroundSettings> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    background_image_path: string | null;
    background_opacity: number;
    background_enabled: number;
  }>(`
    SELECT
      background_image_path,
      background_opacity,
      background_enabled
    FROM settings
    LIMIT 1
  `);

  return {
    imagePath: result?.background_image_path ?? null,
    opacity: result?.background_opacity ?? 0.3,
    enabled: Boolean(result?.background_enabled ?? 0),
  };
}

export async function updateBackgroundSettings(
  settings: Partial<BackgroundSettings>
): Promise<void> {
  const db = await getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (settings.imagePath !== undefined) {
    updates.push('background_image_path = ?');
    values.push(settings.imagePath);
  }
  if (settings.opacity !== undefined) {
    updates.push('background_opacity = ?');
    values.push(settings.opacity);
  }
  if (settings.enabled !== undefined) {
    updates.push('background_enabled = ?');
    values.push(settings.enabled ? 1 : 0);
  }

  if (updates.length > 0) {
    await db.runAsync(
      `UPDATE settings SET ${updates.join(', ')}`,
      ...values
    );
  }
}
```

**预估工作量**：2 小时

---

#### 任务 1.2：创建背景配置管理 Hook

**目标**：封装背景设置的读写逻辑，提供统一的状态管理接口

**输入**：
- 数据库 Repository 层
- 现有 Settings Hook 参考（`hooks/use-setting.ts`）

**输出**：
- `hooks/use-background-settings.ts`

**涉及文件**：
```
hooks/use-background-settings.ts（新建）
storage/repositories/settings.ts（已在任务 1.1 扩展）
```

**接口设计**：

```typescript
// hooks/use-background-settings.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getBackgroundSettings,
  updateBackgroundSettings,
} from '@/storage/repositories/settings';
import { BackgroundSettings } from '@/storage/core';
import { logger } from '@/utils/logger';

export function useBackgroundSettings() {
  const [settings, setSettings] = useState<BackgroundSettings>({
    imagePath: null,
    opacity: 0.3,
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 初始化加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getBackgroundSettings();
      setSettings(data);
    } catch (error) {
      logger.error('Failed to load background settings', { error });
    } finally {
      setIsLoading(false);
    }
  };

  // 更新图片路径
  const updateImagePath = useCallback(async (path: string | null) => {
    try {
      await updateBackgroundSettings({ imagePath: path });
      setSettings((prev) => ({ ...prev, imagePath: path }));
    } catch (error) {
      logger.error('Failed to update background image path', { error });
      throw error;
    }
  }, []);

  // 更新不透明度
  const updateOpacity = useCallback(async (opacity: number) => {
    // 确保值在 0.0-1.0 范围内
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    try {
      await updateBackgroundSettings({ opacity: clampedOpacity });
      setSettings((prev) => ({ ...prev, opacity: clampedOpacity }));
    } catch (error) {
      logger.error('Failed to update background opacity', { error });
      throw error;
    }
  }, []);

  // 切换启用状态
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    try {
      await updateBackgroundSettings({ enabled });
      setSettings((prev) => ({ ...prev, enabled }));
    } catch (error) {
      logger.error('Failed to toggle background enabled', { error });
      throw error;
    }
  }, []);

  // 重置为默认设置
  const reset = useCallback(async () => {
    try {
      await updateBackgroundSettings({
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
```

**预估工作量**：3 小时

---

### 阶段 2：图片选择与存储

#### 任务 2.1：集成图片选择器

**目标**：允许用户从相册选择图片（仅 iOS 和 Android）

**输入**：
- Expo Image Picker API
- 当前权限管理逻辑

**输出**：
- 图片选择服务模块

**涉及文件**：
```
services/media/ImagePicker.ts（新建）
app.json（配置权限）
```

**实现要点**：

```typescript
// services/media/ImagePicker.ts
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
```

**权限配置**（app.json）：

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "允许 AetherLink 访问您的相册以选择聊天背景图片"
        }
      ]
    ]
  }
}
```

**预估工作量**：2 小时

---

#### 任务 2.2：图片优化与本地存储

**目标**：压缩图片并保存到应用私有目录，替换时删除旧图片

**输入**：
- 用户选择的原始图片 URI
- Expo FileSystem API
- Expo Image Manipulator API

**输出**：
- 优化后的本地图片路径

**涉及文件**：
```
services/media/ImageStorage.ts（新建）
constants/app-config.ts（新增文件路径常量）
```

**实现逻辑**：

```typescript
// services/media/ImageStorage.ts
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '@/utils/logger';

const BACKGROUND_DIR = `${FileSystem.documentDirectory}backgrounds/`;
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
    await FileSystem.moveAsync({
      from: manipResult.uri,
      to: destPath,
    });

    // 5. 验证文件大小
    const fileInfo = await FileSystem.getInfoAsync(destPath);
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
    const fileInfo = await FileSystem.getInfoAsync(targetPath);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(targetPath);
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
  const dirInfo = await FileSystem.getInfoAsync(BACKGROUND_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKGROUND_DIR, { intermediates: true });
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
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const freeSpaceMB = freeSpace / 1024 / 1024;

    logger.debug('Storage space check', {
      free: `${freeSpaceMB.toFixed(2)} MB`,
      required: `${requiredMB} MB`,
    });

    return freeSpaceMB >= requiredMB;
  } catch (error) {
    logger.error('Failed to check storage space', { error });
    return true; // 默认认为空间充足，避免阻塞用户操作
  }
}
```

**常量配置**：

```typescript
// constants/app-config.ts
export const STORAGE_CONFIG = {
  BACKGROUND_DIR: `${FileSystem.documentDirectory}backgrounds/`,
  MAX_IMAGE_WIDTH: 1080,           // 最大宽度（px）
  JPEG_QUALITY: 0.7,               // JPEG 压缩率
  MAX_FILE_SIZE_MB: 10,            // 最大文件大小（MB）
  MIN_FREE_SPACE_MB: 50,           // 最小剩余空间（MB）
};
```

**性能优化考虑**：
- 图片宽度限制为 1080px（平衡质量与性能）
- JPEG 压缩率 70%（减小文件大小）
- **仅保留当前背景，替换时自动删除旧文件**
- 固定文件名避免文件堆积

**预估工作量**：4 小时

---

### 阶段 3：UI 实现

#### 任务 3.1：外观设置页面扩展

**目标**：在 `app/settings/appearance.tsx` 添加背景配置 UI

**输入**：
- 现有外观设置页面
- useBackgroundSettings Hook
- React Native Paper 组件
- @react-native-community/slider 组件

**输出**：
- 背景图片选择器
- 不透明度滑块
- 启用开关
- 预览和重置按钮

**涉及文件**：
```
app/settings/appearance.tsx（修改）
components/settings/BackgroundPreview.tsx（新建）
package.json（新增 @react-native-community/slider 依赖）
```

**UI 布局结构**：

```tsx
// app/settings/appearance.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { List, Switch, Button, ActivityIndicator } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useBackgroundSettings } from '@/hooks/use-background-settings';
import { selectBackgroundImage } from '@/services/media/ImagePicker';
import {
  saveBackgroundImage,
  deleteBackgroundImage,
  checkStorageSpace,
} from '@/services/media/ImageStorage';
import { BackgroundPreview } from '@/components/settings/BackgroundPreview';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { logger } from '@/utils/logger';

export default function AppearanceSettings() {
  const {
    settings,
    updateImagePath,
    updateOpacity,
    toggleEnabled,
    reset,
    isLoading,
  } = useBackgroundSettings();
  const [isSaving, setIsSaving] = useState(false);
  const { confirm } = useConfirmDialog();

  /**
   * 处理图片选择
   */
  const handleSelectImage = async () => {
    try {
      // 1. 检查存储空间
      const hasSpace = await checkStorageSpace(10);
      if (!hasSpace) {
        Alert.alert('存储空间不足', '请清理设备存储后重试（建议保留至少 50MB 空间）');
        return;
      }

      // 2. 打开图片选择器
      const uri = await selectBackgroundImage();
      if (!uri) {
        return;
      }

      // 3. 保存图片
      setIsSaving(true);
      const newPath = await saveBackgroundImage(uri);
      await updateImagePath(newPath);

      // 4. 自动启用背景
      if (!settings.enabled) {
        await toggleEnabled(true);
      }

      Alert.alert('成功', '背景图片已更新');

    } catch (error) {
      logger.error('Failed to save background image', { error });
      Alert.alert('保存失败', '无法保存背景图片，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 处理不透明度变化
   */
  const handleOpacityChange = async (value: number) => {
    try {
      await updateOpacity(value);
    } catch (error) {
      logger.error('Failed to update opacity', { error });
    }
  };

  /**
   * 处理重置背景
   */
  const handleReset = async () => {
    const confirmed = await confirm({
      title: '重置背景',
      message: '确定要恢复默认背景吗？此操作将删除当前背景图片。',
    });

    if (!confirmed) {
      return;
    }

    try {
      // 删除图片文件
      if (settings.imagePath) {
        await deleteBackgroundImage(settings.imagePath);
      }

      // 重置设置
      await reset();

      Alert.alert('成功', '已恢复默认背景');
    } catch (error) {
      logger.error('Failed to reset background', { error });
      Alert.alert('重置失败', '无法重置背景，请稍后重试');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 现有主题设置... */}

      <List.Section>
        <List.Subheader>聊天背景</List.Subheader>

        {/* 启用开关 */}
        <List.Item
          title="自定义背景"
          description="为聊天页面设置个性化背景图片"
          right={() => (
            <Switch
              value={settings.enabled}
              onValueChange={toggleEnabled}
              disabled={!settings.imagePath} // 未选择图片时禁用
            />
          )}
        />

        {/* 图片选择按钮 */}
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            icon="image-plus"
            onPress={handleSelectImage}
            loading={isSaving}
            disabled={isSaving}
            style={styles.button}
          >
            {settings.imagePath ? '更换背景图片' : '选择背景图片'}
          </Button>
        </View>

        {/* 背景预览 */}
        {settings.imagePath && (
          <BackgroundPreview
            imagePath={settings.imagePath}
            opacity={settings.opacity}
          />
        )}

        {/* 不透明度滑块 */}
        {settings.imagePath && (
          <>
            <List.Item
              title={`不透明度：${Math.round(settings.opacity * 100)}%`}
              description="调整背景图片的透明程度"
            />
            <View style={styles.sliderContainer}>
              <Slider
                value={settings.opacity}
                onValueChange={handleOpacityChange}
                minimumValue={0.1}
                maximumValue={1.0}
                step={0.05}
                minimumTrackTintColor="#6200ee"
                maximumTrackTintColor="#cccccc"
                thumbTintColor="#6200ee"
                style={styles.slider}
              />
            </View>
          </>
        )}

        {/* 重置按钮 */}
        {settings.imagePath && (
          <View style={styles.buttonContainer}>
            <Button
              mode="text"
              icon="restore"
              onPress={handleReset}
              style={styles.button}
            >
              恢复默认背景
            </Button>
          </View>
        )}

        {/* 使用提示 */}
        <List.Item
          title="💡 使用提示"
          description="建议选择色彩柔和的图片，避免影响聊天内容的可读性"
          descriptionNumberOfLines={3}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    marginVertical: 4,
  },
  sliderContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
```

**依赖安装**：

```bash
npm install @react-native-community/slider@^4.5.4
```

**package.json 更新**：

```json
{
  "dependencies": {
    "@react-native-community/slider": "^4.5.4"
  }
}
```

**Slider 组件使用说明**：

```tsx
import Slider from '@react-native-community/slider';

<Slider
  value={settings.opacity}              // 当前值
  onValueChange={handleOpacityChange}   // 实时回调
  minimumValue={0.1}                    // 最小值（10%）
  maximumValue={1.0}                    // 最大值（100%）
  step={0.05}                           // 步进（5%）
  minimumTrackTintColor="#6200ee"       // 左侧轨道颜色（Material Purple）
  maximumTrackTintColor="#cccccc"       // 右侧轨道颜色
  thumbTintColor="#6200ee"              // 滑块颜色
  style={styles.slider}
/>
```

**预估工作量**：5 小时

---

#### 任务 3.2：主聊天页面背景渲染

**目标**：在 `app/index.tsx` 渲染自定义背景图片

**输入**：
- useBackgroundSettings Hook
- 现有聊天页面结构

**输出**：
- 背景图片层（最底层）
- 与现有组件的层级协调

**涉及文件**：
```
app/index.tsx（修改）
components/chat/ChatBackground.tsx（新建）
```

**实现方案：使用 ImageBackground 组件**（推荐）

```tsx
// components/chat/ChatBackground.tsx
import React, { useState } from 'react';
import { ImageBackground, StyleSheet, View, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useBackgroundSettings } from '@/hooks/use-background-settings';
import { logger } from '@/utils/logger';

interface ChatBackgroundProps {
  children: React.ReactNode;
}

/**
 * 聊天背景组件
 * 根据用户设置渲染自定义背景图片
 */
export function ChatBackground({ children }: ChatBackgroundProps) {
  const { settings, updateImagePath } = useBackgroundSettings();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 处理图片加载失败
   */
  const handleImageError = () => {
    logger.error('Failed to load background image', {
      path: settings.imagePath,
    });

    // 禁用背景并提示用户
    Alert.alert(
      '背景加载失败',
      '无法加载背景图片，已恢复默认背景',
      [
        {
          text: '确定',
          onPress: async () => {
            try {
              await updateImagePath(null);
            } catch (error) {
              logger.error('Failed to reset background', { error });
            }
          },
        },
      ]
    );
  };

  /**
   * 处理图片加载开始
   */
  const handleLoadStart = () => {
    setIsLoading(true);
  };

  /**
   * 处理图片加载完成
   */
  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // 未启用或无图片路径时，直接渲染子组件
  if (!settings.enabled || !settings.imagePath) {
    return <>{children}</>;
  }

  return (
    <ImageBackground
      source={{ uri: settings.imagePath }}
      style={styles.background}
      imageStyle={[styles.backgroundImage, { opacity: settings.opacity }]}
      resizeMode="cover"
      onError={handleImageError}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
    >
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    // opacity 通过 props 动态设置
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
});
```

**集成到主聊天页面**：

```tsx
// app/index.tsx
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatBackground } from '@/components/chat/ChatBackground';

export default function ChatScreen() {
  return (
    <ChatBackground>
      <SafeAreaView style={styles.container}>
        <MessageList />
        <ChatInput />
      </SafeAreaView>
    </ChatBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

**优点**：
- 代码简洁，易于维护
- 自动处理图片加载和缓存
- 性能较好，利用原生 ImageBackground 组件
- 不透明度通过 imageStyle 设置，不影响子组件

**预估工作量**：3 小时

---

#### 任务 3.3：背景预览组件

**目标**：在设置页面提供实时预览效果

**输入**：
- 当前背景设置
- 模拟聊天气泡

**输出**：
- 可交互的预览组件

**涉及文件**：
```
components/settings/BackgroundPreview.tsx（新建）
```

**实现示例**：

```tsx
// components/settings/BackgroundPreview.tsx
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface BackgroundPreviewProps {
  imagePath: string;
  opacity: number;
}

/**
 * 背景预览组件
 * 在设置页面展示背景效果的实时预览
 */
export function BackgroundPreview({ imagePath, opacity }: BackgroundPreviewProps) {
  const theme = useTheme();

  return (
    <Card style={styles.previewCard}>
      {/* 背景图片层 */}
      <Image
        source={{ uri: imagePath }}
        style={[styles.backgroundImage, { opacity }]}
        resizeMode="cover"
      />

      {/* 模拟聊天气泡 */}
      <View style={styles.mockChat}>
        <Card
          style={[
            styles.userBubble,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              这是预览效果
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.aiBubble,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              背景看起来不错！
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* 提示文字 */}
      <View style={styles.hintContainer}>
        <Text variant="labelSmall" style={styles.hintText}>
          ↑ 实时预览效果
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    height: 200,
    margin: 16,
    overflow: 'hidden',
    borderRadius: 12,
    elevation: 2,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  mockChat: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '70%',
    marginBottom: 8,
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hintText: {
    color: '#fff',
  },
});
```

**预览功能特点**：
- 实时反映不透明度变化
- 模拟真实聊天气泡样式
- 自动适配明暗主题
- 提供视觉提示文字

**预估工作量**：2 小时

---

### 阶段 4：性能优化与测试

#### 任务 4.1：图片加载性能优化

**目标**：避免大图片导致的卡顿和内存溢出

**优化措施**：

1. **图片尺寸限制**（已在任务 2.2 实现）
   - 最大宽度 1080px
   - JPEG 压缩 70%

2. **使用 expo-image 替代原生 Image**（更好的缓存和性能）

```bash
npm install expo-image
```

```tsx
// components/chat/ChatBackground.tsx
import { ImageBackground } from 'expo-image'; // 替代 react-native 的 ImageBackground

<ImageBackground
  source={{ uri: settings.imagePath }}
  contentFit="cover"
  transition={200}                  // 渐显动画
  cachePolicy="memory-disk"         // 启用内存和磁盘缓存
  style={styles.background}
  imageStyle={{ opacity: settings.opacity }}
>
  {children}
</ImageBackground>
```

3. **内存监控**（开发环境）

```typescript
// services/media/ImageStorage.ts
if (__DEV__) {
  export async function logImageInfo(path: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(path);
    logger.debug('Background image info', {
      path,
      size: `${(info.size / 1024 / 1024).toFixed(2)} MB`,
      exists: info.exists,
    });
  }
}
```

4. **降级策略**

```tsx
// components/chat/ChatBackground.tsx
const handleImageError = () => {
  logger.warn('Background image failed to load, disabling custom background');
  Alert.alert(
    '背景加载失败',
    '无法加载背景图片，已恢复默认背景',
    [
      {
        text: '确定',
        onPress: async () => {
          await updateImagePath(null);
        },
      },
    ]
  );
};

<ImageBackground
  source={{ uri: settings.imagePath }}
  onError={handleImageError}
>
```

**涉及文件**：
```
components/chat/ChatBackground.tsx（修改）
package.json（新增 expo-image 依赖）
```

**预估工作量**：3 小时

---

#### 任务 4.2：跨平台兼容性测试（仅 iOS 和 Android）

**目标**：确保功能在 iOS 和 Android 两端正常工作

**测试点**：

| 测试项 | iOS | Android | 备注 |
|--------|-----|---------|------|
| 图片选择器权限请求 | ✅ | ✅ | 测试权限弹窗和引导 |
| 图片压缩和优化 | ✅ | ✅ | 验证压缩后文件大小 |
| 文件系统存储 | ✅ | ✅ | 验证文件保存和删除 |
| 背景渲染性能 | ✅ | ✅ | 测试滚动聊天时的帧率 |
| 明暗模式切换 | ✅ | ✅ | 验证主题切换不影响背景 |
| 横竖屏适配 | ✅ | ✅ | 测试屏幕旋转时背景正确缩放 |
| 不透明度滑块 | ✅ | ✅ | 验证滑块手势响应和值更新 |
| 图片加载失败 | ✅ | ✅ | 测试错误提示和降级处理 |
| 存储空间不足 | ✅ | ✅ | 模拟低存储空间场景 |

**测试用例示例**：

```typescript
// __tests__/background-settings.test.ts
describe('Background Settings', () => {
  it('should save background image and update database', async () => {
    const mockUri = 'file:///mock/image.jpg';
    const savedPath = await saveBackgroundImage(mockUri);
    expect(savedPath).toContain('backgrounds/current_background.jpg');

    const settings = await getBackgroundSettings();
    expect(settings.imagePath).toBe(savedPath);
  });

  it('should delete old background when saving new one', async () => {
    // 保存第一张图片
    await saveBackgroundImage('file:///mock/image1.jpg');

    // 保存第二张图片
    await saveBackgroundImage('file:///mock/image2.jpg');

    // 验证只有一张图片存在
    const dirContent = await FileSystem.readDirectoryAsync(BACKGROUND_DIR);
    expect(dirContent.length).toBe(1);
    expect(dirContent[0]).toBe('current_background.jpg');
  });

  it('should reset background settings', async () => {
    await updateBackgroundSettings({
      imagePath: '/path/to/image.jpg',
      opacity: 0.5,
      enabled: true,
    });

    await reset();

    const settings = await getBackgroundSettings();
    expect(settings.imagePath).toBeNull();
    expect(settings.opacity).toBe(0.3);
    expect(settings.enabled).toBe(false);
  });
});
```

**手动测试清单**：

```markdown
## iOS 测试
- [ ] 首次打开图片选择器时显示权限弹窗
- [ ] 权限被拒绝后点击"去设置"可跳转到系统设置
- [ ] 选择超过 10MB 的图片时提示错误
- [ ] 横竖屏切换时背景正确适配
- [ ] 明暗模式切换时背景保持显示
- [ ] Slider 滑块手势流畅，无卡顿

## Android 测试
- [ ] 首次打开图片选择器时显示权限弹窗
- [ ] 权限被拒绝后点击"去设置"可跳转到应用设置
- [ ] 选择超过 10MB 的图片时提示错误
- [ ] 横竖屏切换时背景正确适配
- [ ] 明暗模式切换时背景保持显示
- [ ] Slider 滑块手势流畅，无卡顿
- [ ] 低端设备（2GB RAM）性能测试
```

**预估工作量**：4 小时（移除 Web 平台后减少 1 小时）

---

#### 任务 4.3：边界情况处理

**目标**：处理异常场景，提升用户体验

**场景清单**：

1. **权限被拒绝**

```typescript
// services/media/ImagePicker.ts
if (status !== 'granted') {
  Alert.alert(
    '需要相册权限',
    '请在系统设置中允许 AetherLink 访问相册',
    [
      { text: '取消', style: 'cancel' },
      { text: '去设置', onPress: () => Linking.openSettings() },
    ]
  );
}
```

2. **图片过大（>10MB）**

```typescript
// services/media/ImageStorage.ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function validateImageSize(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri);

  if (info.size > MAX_FILE_SIZE) {
    Alert.alert('图片过大', '请选择小于 10MB 的图片');
    return false;
  }

  return true;
}
```

3. **存储空间不足**

```typescript
// services/media/ImageStorage.ts
const MIN_FREE_SPACE = 50 * 1024 * 1024; // 50MB

export async function checkStorageSpace(requiredMB: number = 10): Promise<boolean> {
  const freeSpace = await FileSystem.getFreeDiskStorageAsync();

  if (freeSpace < MIN_FREE_SPACE) {
    Alert.alert('存储空间不足', '请清理设备存储后重试（建议保留至少 50MB 空间）');
    return false;
  }

  return true;
}
```

4. **图片加载失败**

```tsx
// components/chat/ChatBackground.tsx
<ImageBackground
  source={{ uri: settings.imagePath }}
  onError={() => {
    Alert.alert('背景加载失败', '已恢复默认背景');
    updateImagePath(null);
  }}
>
```

5. **数据库写入失败**

```typescript
// app/settings/appearance.tsx
try {
  const newPath = await saveBackgroundImage(uri);
  await updateImagePath(newPath);
} catch (error) {
  logger.error('Failed to save background settings', { error });

  // 清理已保存的图片文件
  if (newPath) {
    await deleteBackgroundImage(newPath);
  }

  Alert.alert('保存失败', '无法保存背景设置，请稍后重试');
}
```

6. **应用卸载时清理文件**

```typescript
// 在应用卸载时，系统会自动清理 documentDirectory 中的文件
// 无需额外处理
```

**预估工作量**：3 小时

---

## 验收标准

### 功能完整性检查

- [ ] 用户可以从设备相册选择图片（iOS 和 Android）
- [ ] 图片自动压缩优化（≤1080px 宽度，JPEG 70% 质量）
- [ ] 图片保存到应用私有目录（`${documentDirectory}backgrounds/`）
- [ ] 不透明度滑块范围 10%-100%，步进 5%
- [ ] 设置页面提供实时预览效果
- [ ] 主聊天页面正确渲染背景图片
- [ ] 启用/禁用开关工作正常
- [ ] 重置功能可恢复默认背景并清理图片文件
- [ ] 配置持久化到 SQLite 数据库
- [ ] 权限被拒绝时有友好提示
- [ ] 仅保留当前背景，替换时自动删除旧图片

### 性能指标要求

- [ ] 图片加载时间 < 500ms（1080p 设备）
- [ ] 聊天页面渲染帧率 ≥ 55 FPS
- [ ] 单张背景图片大小 < 500KB
- [ ] 应用启动时间增加 < 100ms
- [ ] 内存占用增加 < 20MB

### 跨平台兼容性（仅 iOS 和 Android）

- [ ] iOS：图片选择、存储、渲染正常
- [ ] Android：图片选择、存储、渲染正常
- [ ] 明暗模式切换不影响背景显示
- [ ] 横竖屏切换时背景正确适配
- [ ] 低端设备（2GB RAM）性能可接受

### 边界情况处理

- [ ] 图片大于 10MB 时拒绝并提示
- [ ] 存储空间不足时阻止保存并提示
- [ ] 图片加载失败时自动禁用背景
- [ ] 权限被拒绝时引导用户到系统设置
- [ ] 数据库写入失败时清理已保存文件
- [ ] 无效图片路径时降级到默认背景

---

## 潜在风险和挑战

### 技术难点

1. **大图片性能问题**
   - **风险**：用户选择高分辨率图片（如 4K）可能导致卡顿
   - **影响**：聊天体验下降
   - **缓解措施**：强制图片压缩 + 尺寸限制 + 使用 expo-image 优化缓存

2. **iOS 相册权限限制**
   - **风险**：iOS 14+ "有限照片访问"模式可能导致权限流程复杂
   - **影响**：用户困惑
   - **缓解措施**：提供清晰的权限说明，引导用户选择"允许访问所有照片"

3. **Android 低端设备性能**
   - **风险**：2GB RAM 设备可能出现内存不足
   - **影响**：应用崩溃或卡顿
   - **缓解措施**：严格限制图片尺寸，使用 expo-image 的内存优化

### 兼容性风险

1. **Slider 组件样式一致性**
   - **风险**：@react-native-community/slider 在 iOS 和 Android 上样式不完全一致
   - **缓解措施**：通过 minimumTrackTintColor/maximumTrackTintColor/thumbTintColor 统一样式

2. **文件系统权限**
   - **风险**：某些 Android ROM 可能限制文件访问
   - **缓解措施**：使用 documentDirectory（应用私有目录）避免权限问题

### 用户体验风险

1. **背景图片影响文字可读性**
   - **风险**：某些图片颜色可能导致聊天气泡文字难以阅读
   - **缓解措施**：
     - 建议默认不透明度 30%
     - 在预览组件中明确提示"请选择色彩柔和的图片"
     - 考虑为聊天气泡添加半透明背景蒙层

2. **存储空间浪费**（已解决）
   - **方案**：仅保留当前背景，替换时自动删除旧图片
   - **存储占用**：单张图片 < 500KB，总占用 < 1MB

---

## 后续优化方向

### 短期优化（v1.1）

1. **背景图片库**
   - 提供 5-10 张预设背景图片供快速选择
   - 减少用户寻找合适图片的时间成本

2. **拍照功能**
   - 集成 `expo-camera`，允许用户直接拍摄照片作为背景
   - 适用于风景、纯色墙面等场景

3. **性能监控**
   - 在开发环境中添加性能指标面板
   - 显示背景渲染帧率、图片加载时间、内存占用

### 中期优化（v1.2）

1. **背景历史记录**
   - 可选功能：保留最近 3 张背景供快速切换
   - 提供"清理背景缓存"功能

2. **智能背景推荐**
   - 根据当前主题（明暗模式）推荐合适的背景
   - 提供"清新"、"温暖"、"科技"等预设风格

3. **背景效果增强**
   - 可选功能：增加模糊效果（使用 expo-blur）
   - 提供滤镜选项（灰度、棕褐色等）

### 长期优化（v2.0）

1. **AI 生成背景**
   - 集成 DALL-E 或 Stable Diffusion API
   - 用户输入文字描述生成专属背景
   - 需要考虑成本和隐私问题

2. **背景交互效果**
   - 滑动聊天时背景产生视差效果（Parallax）
   - 支持手势缩放背景图片

3. **Web 平台支持**
   - 使用 IndexedDB 存储背景图片
   - 提供与移动端一致的功能体验

---

## 总结

本规划文档详细拆解了"自定义背景功能"的实施路径，共分为 **4 个阶段、13 个任务**，预估总工作量约 **26 小时**。

### 工时分配

| 阶段 | 任务数 | 总工时 |
|------|--------|--------|
| 阶段 1：基础设施搭建 | 2 | 5 小时 |
| 阶段 2：图片选择与存储 | 2 | 6 小时 |
| 阶段 3：UI 实现 | 3 | 10 小时 |
| 阶段 4：性能优化与测试 | 3 | 10 小时 |
| **总计** | **10** | **26 小时** |

### 核心技术方案

- **图片选择**：expo-image-picker
- **图片优化**：expo-image-manipulator（压缩至 1080px 宽度，JPEG 70% 质量）
- **本地存储**：expo-file-system（仅保留当前背景）
- **配置持久化**：SQLite（扩展 settings 表）
- **UI 组件**：React Native Paper + @react-native-community/slider
- **背景渲染**：ImageBackground（仅支持不透明度调整）
- **平台支持**：仅 iOS 和 Android

### 关键决策

1. ✅ 使用官方推荐的 @react-native-community/slider
2. ✅ 仅保留当前背景，替换时删除旧图片
3. ✅ 仅支持不透明度调整，不支持模糊和滤镜
4. ✅ 仅支持 iOS 和 Android，不支持 Web

### 开始实施前的准备

1. 安装新依赖：
   ```bash
   npm install @react-native-community/slider@^4.5.4 expo-image
   ```

2. 配置权限（app.json）：
   ```json
   {
     "expo": {
       "plugins": [
         ["expo-image-picker", {
           "photosPermission": "允许 AetherLink 访问您的相册以选择聊天背景图片"
         }]
       ]
     }
   }
   ```

3. 创建目录结构：
   ```
   services/media/
   ├── ImagePicker.ts
   └── ImageStorage.ts
   ```

4. 运行数据库迁移脚本

**准备就绪后即可开始实施！🚀**
