# 项目任务分解规划：侧边栏自定义头像功能

## 已明确的决策

基于用户需求和项目现状，已经确定以下技术决策：

- **文件存储方案**: 使用 Expo FileSystem API 管理本地文件
- **数据持久化方案**: 使用 AsyncStorage 存储头像路径引用
- **图片选择器**: 使用 expo-image-picker 进行图片选择
- **实现位置**: 在 ChatSidebar 组件底部卡片的头像区域
- **存储架构**: 遵循现有 Repository 模式和 Settings 存储架构
- **UI 交互**: 点击头像触发图片选择,自动裁剪为圆形显示

## 整体规划概述

### 项目目标

为 AetherLink_z 应用的左侧侧边栏（ChatSidebar）添加用户自定义头像功能，允许用户：
- 点击底部卡片中的默认头像，选择本地图片作为自定义头像
- 头像图片自动保存到应用沙盒目录，持久化存储
- 重启应用后头像保持不变
- 提供重置为默认头像的功能

### 技术栈

- **图片选择**: expo-image-picker (已在项目中使用)
- **文件存储**: expo-file-system (需要安装)
- **数据持久化**: AsyncStorage (通过 SettingsRepository)
- **UI 组件**: React Native Paper (Avatar, IconButton, Menu)
- **图片处理**: React Native Image (圆形裁剪通过样式实现)

### 主要阶段

1. **环境准备与依赖安装** - 安装必要的依赖包，配置权限
2. **数据层实现** - 扩展 SettingsRepository，创建文件工具函数
3. **业务逻辑层** - 创建自定义 Hook 封装头像管理逻辑
4. **UI 交互实现** - 改造 ChatSidebar 组件，添加头像选择和显示功能
5. **测试与优化** - 测试各平台兼容性，优化用户体验

## 详细任务分解

### 阶段 1：环境准备与依赖安装

#### 任务 1.1：安装必要的依赖包

**目标**: 确保项目中安装了所需的 Expo 包

**输入**: package.json

**输出**: 更新后的 package.json 和 node_modules

**涉及文件**:
- `package.json`

**操作步骤**:
```bash
# expo-image-picker 已安装，需要确认 expo-file-system
npx expo install expo-file-system
```

**预估工作量**: 5 分钟

---

#### 任务 1.2：配置应用权限

**目标**: 确保应用具有相册访问和文件读写权限

**输入**: app.json 或 app.config.js

**输出**: 添加权限配置的配置文件

**涉及文件**:
- `app.json`

**操作内容**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "允许 $(PRODUCT_NAME) 访问您的相册以选择头像"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "需要访问相册以选择头像",
        "NSPhotoLibraryAddUsageDescription": "需要保存头像到相册"
      }
    },
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**预估工作量**: 10 分钟

---

### 阶段 2：数据层实现

#### 任务 2.1：扩展 SettingsRepository

**目标**: 在 SettingsRepository 中添加用户头像路径的存储键

**输入**:
- `storage/repositories/settings.ts`

**输出**:
- 添加新的 SettingKey.UserAvatar 枚举项

**涉及文件**:
- `storage/repositories/settings.ts`

**实现代码**:
```typescript
export enum SettingKey {
  // ... 现有的键
  // 用户头像设置
  UserAvatar = 'al:settings:user_avatar',
  UserName = 'al:settings:user_name',
  UserEmail = 'al:settings:user_email',
}
```

**预估工作量**: 5 分钟

---

#### 任务 2.2：创建文件存储工具函数

**目标**: 创建通用的文件管理工具模块

**输入**: 无

**输出**: 新文件 `utils/file-storage.ts`

**涉及文件**:
- 新建 `utils/file-storage.ts`

**实现代码**:
```typescript
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { logger } from './logger';

const AVATAR_DIR = `${FileSystem.documentDirectory}avatars/`;

/**
 * 确保头像存储目录存在
 */
export async function ensureAvatarDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(AVATAR_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AVATAR_DIR, { intermediates: true });
    logger.info('Created avatar directory', AVATAR_DIR);
  }
}

/**
 * 保存头像文件到应用沙盒目录
 * @param sourceUri 图片源 URI（来自图片选择器）
 * @returns 保存后的文件路径
 */
export async function saveAvatarImage(sourceUri: string): Promise<string> {
  try {
    await ensureAvatarDirectory();

    // 生成唯一文件名
    const fileName = `avatar_${Date.now()}.jpg`;
    const destUri = `${AVATAR_DIR}${fileName}`;

    // 复制文件到应用目录
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    logger.info('Avatar saved successfully', destUri);
    return destUri;
  } catch (error) {
    logger.error('Failed to save avatar', error);
    throw new Error('保存头像失败');
  }
}

/**
 * 删除旧的头像文件
 * @param uri 要删除的文件 URI
 */
export async function deleteAvatarImage(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith(AVATAR_DIR)) {
    return; // 只删除应用目录内的文件
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      logger.info('Old avatar deleted', uri);
    }
  } catch (error) {
    logger.warn('Failed to delete old avatar', error);
  }
}

/**
 * 清理所有头像缓存（用于数据清理功能）
 */
export async function clearAllAvatars(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AVATAR_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(AVATAR_DIR, { idempotent: true });
      logger.info('All avatars cleared');
    }
  } catch (error) {
    logger.error('Failed to clear avatars', error);
  }
}
```

**预估工作量**: 20 分钟

---

### 阶段 3：业务逻辑层实现

#### 任务 3.1：创建 useUserProfile Hook

**目标**: 封装用户头像和个人信息的管理逻辑

**输入**: SettingsRepository, file-storage 工具

**输出**: 新文件 `hooks/use-user-profile.ts`

**涉及文件**:
- 新建 `hooks/use-user-profile.ts`

**实现代码**:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import * as ImagePicker from 'expo-image-picker';
import { saveAvatarImage, deleteAvatarImage } from '@/utils/file-storage';
import { logger } from '@/utils/logger';
import { Alert, Platform } from 'react-native';

export interface UserProfile {
  avatarUri: string | null;
  userName: string | null;
  userEmail: string | null;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>({
    avatarUri: null,
    userName: '访客',
    userEmail: 'guest@example.com',
  });
  const [loading, setLoading] = useState(false);

  // 加载用户资料
  const loadProfile = useCallback(async () => {
    try {
      const settings = SettingsRepository();
      const [avatarUri, userName, userEmail] = await Promise.all([
        settings.get<string>(SettingKey.UserAvatar),
        settings.get<string>(SettingKey.UserName),
        settings.get<string>(SettingKey.UserEmail),
      ]);

      setProfile({
        avatarUri: avatarUri || null,
        userName: userName || '访客',
        userEmail: userEmail || 'guest@example.com',
      });
    } catch (error) {
      logger.error('Failed to load user profile', error);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 请求相册权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true; // Web 平台不需要权限
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        '权限不足',
        '需要相册访问权限才能选择头像，请在设置中允许访问相册。',
        [{ text: '确定' }]
      );
      return false;
    }

    return true;
  }, []);

  // 选择并上传头像
  const pickAvatar = useCallback(async () => {
    try {
      // 检查权限
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return;
      }

      setLoading(true);

      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // 正方形裁剪
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const selectedImage = result.assets[0];

      // 保存图片到应用目录
      const savedUri = await saveAvatarImage(selectedImage.uri);

      // 删除旧头像
      if (profile.avatarUri) {
        await deleteAvatarImage(profile.avatarUri);
      }

      // 保存到设置
      const settings = SettingsRepository();
      await settings.set(SettingKey.UserAvatar, savedUri);

      // 更新状态
      setProfile(prev => ({ ...prev, avatarUri: savedUri }));

      logger.info('Avatar updated successfully');
    } catch (error) {
      logger.error('Failed to pick avatar', error);
      Alert.alert('错误', '更新头像失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [profile.avatarUri, requestPermission]);

  // 重置为默认头像
  const resetAvatar = useCallback(async () => {
    try {
      setLoading(true);

      // 删除头像文件
      if (profile.avatarUri) {
        await deleteAvatarImage(profile.avatarUri);
      }

      // 清除设置
      const settings = SettingsRepository();
      await settings.set(SettingKey.UserAvatar, null);

      // 更新状态
      setProfile(prev => ({ ...prev, avatarUri: null }));

      logger.info('Avatar reset to default');
    } catch (error) {
      logger.error('Failed to reset avatar', error);
      Alert.alert('错误', '重置头像失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [profile.avatarUri]);

  // 更新用户名
  const updateUserName = useCallback(async (name: string) => {
    try {
      const settings = SettingsRepository();
      await settings.set(SettingKey.UserName, name);
      setProfile(prev => ({ ...prev, userName: name }));
    } catch (error) {
      logger.error('Failed to update user name', error);
    }
  }, []);

  // 更新邮箱
  const updateUserEmail = useCallback(async (email: string) => {
    try {
      const settings = SettingsRepository();
      await settings.set(SettingKey.UserEmail, email);
      setProfile(prev => ({ ...prev, userEmail: email }));
    } catch (error) {
      logger.error('Failed to update user email', error);
    }
  }, []);

  return {
    profile,
    loading,
    pickAvatar,
    resetAvatar,
    updateUserName,
    updateUserEmail,
    reload: loadProfile,
  };
}
```

**预估工作量**: 30 分钟

---

### 阶段 4：UI 交互实现

#### 任务 4.1：改造 ChatSidebar 组件

**目标**: 在底部卡片添加头像点击交互和长按菜单

**输入**:
- `components/chat/ChatSidebar.tsx`
- useUserProfile Hook

**输出**:
- 更新后的 ChatSidebar 组件

**涉及文件**:
- `components/chat/ChatSidebar.tsx`

**实现代码片段**:
```typescript
// 在文件顶部导入
import { useUserProfile } from '@/hooks/use-user-profile';
import { Menu } from 'react-native-paper';
import { Image } from 'react-native';

// 在组件内部添加状态
export function ChatSidebar({ visible, onClose }: ChatSidebarProps) {
  // ... 现有代码
  const { profile, loading, pickAvatar, resetAvatar } = useUserProfile();
  const [menuVisible, setMenuVisible] = useState(false);

  // ... 其他代码

  // 替换底部卡片的头像区域 (line 277-288)
  return (
    // ... 前面的代码

    {/* 底部浮动卡片：头像 + 设置 */}
    <Surface
      elevation={0}
      style={[
        styles.bottomCard,
        {
          backgroundColor: translucentBg,
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom, 8) + 12,
        },
      ]}
      pointerEvents="auto"
    >
      <View
        style={styles.bottomRow}
        pointerEvents="auto"
        onStartShouldSetResponder={() => true}
      >
        {/* 左侧资料区：添加头像点击和长按交互 */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              onPress={pickAvatar}
              onLongPress={() => setMenuVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 4 }}
              android_ripple={{ borderless: false, radius: 100 }}
            >
              {profile.avatarUri ? (
                <Image
                  source={{ uri: profile.avatarUri }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                />
              ) : (
                <Avatar.Icon size={40} icon="account" />
              )}
              <View style={{ marginLeft: 10 }}>
                <Text variant="labelLarge">{profile.userName}</Text>
                <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                  {profile.userEmail}
                </Text>
              </View>
            </Pressable>
          }
        >
          <Menu.Item
            leadingIcon="image"
            onPress={() => {
              setMenuVisible(false);
              pickAvatar();
            }}
            title="更换头像"
          />
          {profile.avatarUri && (
            <Menu.Item
              leadingIcon="refresh"
              onPress={() => {
                setMenuVisible(false);
                resetAvatar();
              }}
              title="恢复默认"
            />
          )}
        </Menu>

        <View pointerEvents="auto">
          <IconButton
            icon="cog"
            size={22}
            onPress={() => {
              onClose();
              setTimeout(() => {
                router.push('/settings');
              }, 50);
            }}
            style={{ margin: 0 }}
          />
        </View>
      </View>
    </Surface>
    // ... 后面的代码
  );
}
```

**预估工作量**: 25 分钟

---

#### 任务 4.2：添加个人资料设置页面（可选）

**目标**: 创建独立的个人资料编辑页面

**输入**: useUserProfile Hook

**输出**: 新页面文件

**涉及文件**:
- 新建 `app/settings/profile.tsx`

**实现代码**:
```typescript
import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, Avatar, useTheme, ActivityIndicator } from 'react-native-paper';
import { Stack } from 'expo-router';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, loading, pickAvatar, resetAvatar, updateUserName, updateUserEmail } = useUserProfile();
  const [name, setName] = React.useState(profile.userName || '');
  const [email, setEmail] = React.useState(profile.userEmail || '');

  React.useEffect(() => {
    setName(profile.userName || '');
    setEmail(profile.userEmail || '');
  }, [profile]);

  const handleSave = async () => {
    await updateUserName(name);
    await updateUserEmail(email);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: '个人资料' }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        {/* 头像区域 */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} disabled={loading}>
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Icon size={100} icon="account" />
            )}
            {loading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </Pressable>
          <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7, textAlign: 'center' }}>
            点击更换头像
          </Text>
          {profile.avatarUri && (
            <Button mode="text" onPress={resetAvatar} style={{ marginTop: 8 }}>
              恢复默认
            </Button>
          )}
        </View>

        {/* 信息编辑 */}
        <View style={styles.formSection}>
          <TextInput
            label="用户名"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <TextInput
            label="邮箱"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Button mode="contained" onPress={handleSave} style={{ marginTop: 24 }}>
          保存修改
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    marginTop: 16,
  },
});
```

**UI设计建议**:
根据项目已有的 UI 风格，可以在设置列表中添加"个人资料"入口：

在 `components/settings/SettingsList.tsx` 的 SETTINGS_GROUPS 数组开头添加：
```typescript
{
  title: '个人资料',
  items: [
    {
      id: 'profile',
      title: '我的资料',
      description: '头像、用户名和个人信息',
      icon: 'account-circle',
      color: '#3b82f6',
      route: '/settings/profile',
    },
  ],
},
```

**预估工作量**: 40 分钟

---

### 阶段 5：测试与优化

#### 任务 5.1：跨平台兼容性测试

**目标**: 确保功能在 iOS、Android、Web 三端正常工作

**输入**: 完整实现的功能

**输出**: 测试报告和 bug 修复

**测试点**:
- ✅ iOS: 图片选择器权限、文件保存路径、圆形裁剪显示
- ✅ Android: 存储权限、文件访问、图片显示性能
- ✅ Web: 图片选择器兼容性、localStorage 存储、图片加载

**涉及文件**:
- 所有实现的文件

**预估工作量**: 30 分钟

---

#### 任务 5.2：边界情况处理

**目标**: 处理各种异常情况和边界条件

**测试场景**:
1. ✅ 图片过大（超过 10MB）- 添加大小检查和压缩
2. ✅ 网络图片选择 - 仅支持本地图片
3. ✅ 权限被拒绝 - 友好提示用户
4. ✅ 存储空间不足 - 捕获异常并提示
5. ✅ 文件路径无效 - 回退到默认头像
6. ✅ 快速重复点击 - 添加 loading 状态防抖

**涉及文件**:
- `hooks/use-user-profile.ts`
- `utils/file-storage.ts`

**优化措施**:
```typescript
// 在 saveAvatarImage 中添加大小检查
export async function saveAvatarImage(sourceUri: string): Promise<string> {
  try {
    // 检查文件信息
    const fileInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!fileInfo.exists) {
      throw new Error('文件不存在');
    }

    // 检查文件大小（限制 10MB）
    if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
      throw new Error('图片过大，请选择小于 10MB 的图片');
    }

    await ensureAvatarDirectory();

    const fileName = `avatar_${Date.now()}.jpg`;
    const destUri = `${AVATAR_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    logger.info('Avatar saved successfully', destUri);
    return destUri;
  } catch (error) {
    logger.error('Failed to save avatar', error);
    throw error; // 保留原始错误信息
  }
}
```

**预估工作量**: 20 分钟

---

#### 任务 5.3：性能优化和用户体验提升

**目标**: 优化图片加载和交互体验

**优化点**:
1. ✅ 图片懒加载 - 使用 React Native 的 Image 组件自带的缓存
2. ✅ 加载状态指示 - 添加 ActivityIndicator
3. ✅ 触觉反馈 - 使用 Haptics API
4. ✅ 动画过渡 - 头像切换时的淡入淡出效果
5. ✅ 错误重试机制 - 失败后允许用户重试

**涉及文件**:
- `components/chat/ChatSidebar.tsx`
- `hooks/use-user-profile.ts`

**实现示例**:
```typescript
// 添加触觉反馈
import * as Haptics from 'expo-haptics';

const pickAvatar = useCallback(async () => {
  // 触发触觉反馈
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  // ... 原有逻辑
}, []);

// 添加动画效果（在 ChatSidebar 中）
const fadeAnim = useRef(new Animated.Value(1)).current;

const animateAvatarChange = () => {
  Animated.sequence([
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start();
};

// 头像显示组件
<Animated.View style={{ opacity: fadeAnim }}>
  {profile.avatarUri ? (
    <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
  ) : (
    <Avatar.Icon size={40} icon="account" />
  )}
</Animated.View>
```

**预估工作量**: 25 分钟

---

## 需要进一步明确的问题

### 问题 1：头像编辑功能的深度

**推荐方案**:

- **方案 A：基础版（推荐）**
  - 仅支持选择图片，使用 expo-image-picker 的内置裁剪功能
  - 优点：实现简单，开发快速，满足基本需求
  - 缺点：编辑功能有限，依赖系统裁剪器

- **方案 B：增强版**
  - 集成第三方图片编辑库（如 react-native-image-crop-picker）
  - 支持缩放、旋转、滤镜等高级编辑
  - 优点：功能丰富，用户体验更好
  - 缺点：增加依赖，开发时间更长

**等待用户选择**:
```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A - 基础版（推荐）
[ ] 方案 B - 增强版
[ ] 其他方案：__________
```

---

### 问题 2：用户资料的扩展范围

**推荐方案**:

- **方案 A：仅头像（最小 MVP）**
  - 只实现头像上传和显示功能
  - 用户名和邮箱保持硬编码
  - 优点：开发最快，专注核心功能
  - 缺点：功能单一，缺乏个性化

- **方案 B：基础资料（推荐）**
  - 实现头像 + 用户名 + 邮箱编辑
  - 添加独立的个人资料设置页面
  - 优点：功能完整，用户体验好
  - 缺点：开发时间略长

- **方案 C：完整用户系统**
  - 增加用户认证、多用户切换等功能
  - 集成云端同步
  - 优点：功能强大，支持多场景
  - 缺点：复杂度高，偏离当前需求

**等待用户选择**:
```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A - 仅头像（最小 MVP）
[ ] 方案 B - 基础资料（推荐）
[ ] 方案 C - 完整用户系统
[ ] 其他方案：__________
```

---

### 问题 3：头像显示位置

**推荐方案**:

- **方案 A：仅侧边栏显示（当前需求）**
  - 只在 ChatSidebar 底部卡片显示头像
  - 优点：实现简单，符合需求
  - 缺点：头像使用场景单一

- **方案 B：多处显示**
  - 侧边栏 + 设置页面顶部 + 话题列表（可选）
  - 创建独立的 UserAvatar 组件，统一复用
  - 优点：一致性好，增强个性化体验
  - 缺点：需要改动更多文件

**等待用户选择**:
```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A - 仅侧边栏显示
[ ] 方案 B - 多处显示
[ ] 其他方案：__________
```

---

## 验收标准

### 功能测试点

- ✅ 点击头像能打开图片选择器
- ✅ 选择图片后能正确保存到本地
- ✅ 头像显示为圆形，且清晰无失真
- ✅ 长按头像能显示更多选项菜单
- ✅ 重置头像后恢复为默认图标
- ✅ 重启应用后头像保持不变
- ✅ 权限被拒绝时有友好提示
- ✅ 文件操作失败时有错误提示

### 边界情况处理

- ✅ 图片过大时拒绝或自动压缩
- ✅ 选择非图片文件时拒绝
- ✅ 存储空间不足时提示用户
- ✅ 网络异常时使用本地缓存
- ✅ 文件路径无效时回退到默认头像
- ✅ 快速重复点击不会触发多次选择

### 性能要求

- ✅ 图片加载时间小于 500ms
- ✅ 头像切换动画流畅（60fps）
- ✅ 文件保存操作不阻塞 UI
- ✅ 内存占用合理（头像文件小于 1MB）

### 用户体验

- ✅ 操作流程清晰，无需指引
- ✅ 加载状态有明确指示
- ✅ 错误提示友好且可操作
- ✅ 触觉反馈及时
- ✅ 支持深色模式

---

## 潜在风险和注意事项

### 1. 文件存储风险

- **风险**: iOS 和 Android 的沙盒机制不同，文件路径可能不一致
- **缓解措施**: 使用 Expo FileSystem 提供的标准路径常量
- **验证**: 在两个平台上分别测试文件读写

### 2. 图片大小和格式

- **风险**: 用户选择超大图片导致 OOM 或存储空间不足
- **缓解措施**:
  - 限制图片大小（建议 10MB 以内）
  - 使用 expo-image-picker 的 quality 参数压缩
  - 仅支持常见格式（JPEG, PNG）
- **验证**: 测试选择各种大小和格式的图片

### 3. 权限处理

- **风险**: Android 11+ 的存储权限变更，iOS 14+ 的隐私权限提示
- **缓解措施**:
  - 使用 expo-image-picker 的权限管理 API
  - 在 app.json 中正确配置权限说明
  - 友好提示用户授权
- **验证**: 在最新系统版本上测试权限请求流程

### 4. 跨平台兼容性

- **风险**: Web 平台的文件系统 API 和移动端不同
- **缓解措施**:
  - Web 使用 Blob URL 或 base64
  - 移动端使用文件路径
  - 统一封装存储逻辑
- **验证**: 分别在 iOS、Android、Web 三端测试

### 5. 性能问题

- **风险**: 大图片加载导致界面卡顿
- **缓解措施**:
  - 使用 React Native Image 的缓存机制
  - 异步加载图片
  - 添加加载占位符
- **验证**: 使用 React DevTools Profiler 检测性能

### 6. 数据迁移

- **风险**: 用户更新应用后头像丢失
- **缓解措施**:
  - AsyncStorage 数据在应用更新后保留
  - FileSystem 文件在应用更新后保留（非清除数据）
  - 添加数据备份功能
- **验证**: 测试应用升级场景

---

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议：

```
用户补充内容：
（请选择上述"需要进一步明确的问题"中的方案，或提出其他建议）

1. 头像编辑功能深度：[ 方案 A / 方案 B / 其他 ]

2. 用户资料扩展范围：[ 方案 A / 方案 B / 方案 C / 其他 ]

3. 头像显示位置：[ 方案 A / 方案 B / 其他 ]

4. 其他需求或建议：





```

---

## 总结

本规划文档详细拆解了侧边栏自定义头像功能的实现步骤，预估总开发时间约 **3-4 小时**（基础版方案）。所有实现遵循项目现有架构模式（Repository、Hooks、TypeScript），确保代码质量和可维护性。

**核心优势**:
- 完全本地化存储，无需后端支持
- 遵循 Expo 最佳实践，跨平台兼容性好
- 利用现有基础设施（AsyncStorage、日志系统）
- 用户体验流畅，符合 Material Design 规范

**下一步行动**:
1. 用户确认上述"需要进一步明确的问题"中的方案选择
2. 根据反馈调整规划细节
3. 按阶段顺序开始实施开发任务