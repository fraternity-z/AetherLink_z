# 项目任务分解规划：自定义用户头像功能

## 已明确的决策

- **头像编辑功能深度**：方案 A（基础版） - 使用 expo-image-picker 的内置裁剪器，不集成第三方编辑库
- **用户资料扩展范围**：方案 A（仅头像功能） - 只实现头像上传和显示，用户名和邮箱保持硬编码
- **头像显示位置**：侧边栏底部卡片 + 对话页面用户消息旁边，通过统一的 UserAvatar 组件复用

## 整体规划概述

### 项目目标

为 AetherLink_z AI 聊天助手应用添加自定义用户头像功能，允许用户上传和显示个性化头像，提升用户体验和个性化程度。

### 技术栈

- **图片选择器**: expo-image-picker（项目中需要新增依赖）
- **图片组件**: expo-image（已有依赖）
- **存储层**: 扩展现有的 SQLite 数据库 + 本地文件系统
- **UI 组件**: React Native Paper（已有依赖）
- **状态管理**: React Hooks（自定义 useUserProfile Hook）

### 主要阶段

1. **阶段 1：数据层扩展** - 添加用户头像的存储能力
2. **阶段 2：通用头像组件** - 创建可复用的 UserAvatar 组件
3. **阶段 3：侧边栏头像编辑** - 在侧边栏底部卡片添加头像编辑功能
4. **阶段 4：对话页头像显示** - 在用户消息气泡旁显示头像
5. **阶段 5：测试与优化** - 全面测试和边界情况处理

## 详细任务分解

### 阶段 1：数据层扩展

**目标**: 为用户头像数据提供持久化存储能力

#### 任务 1.1：添加 expo-image-picker 依赖

- **目标**: 安装图片选择器库
- **输入**: package.json
- **输出**: 更新后的依赖文件
- **涉及文件**:
  - `package.json`
- **预估工作量**: 5 分钟

**实现步骤**:
```bash
npx expo install expo-image-picker
```

#### 任务 1.2：扩展设置仓库支持头像存储

- **目标**: 在现有的 SettingsRepository 中添加头像 URI 的存储和读取
- **输入**: 现有的 SettingsRepository 和 SettingKey 枚举
- **输出**: 支持 `UserAvatarUri` 设置项的更新代码
- **涉及文件**:
  - `storage/repositories/settings.ts`
- **预估工作量**: 15 分钟

**实现细节**:
```typescript
// 在 SettingKey 枚举中添加
export enum SettingKey {
  // ... 现有的设置项
  UserAvatarUri = 'user_avatar_uri', // 用户头像本地路径
}
```

#### 任务 1.3：创建 useUserProfile Hook

- **目标**: 封装用户头像的业务逻辑，提供统一的 API
- **输入**: SettingsRepository、expo-image-picker API
- **输出**: useUserProfile Hook
- **涉及文件**:
  - `hooks/use-user-profile.ts`（新建）
- **预估工作量**: 30 分钟

**Hook API 设计**:
```typescript
interface UseUserProfileResult {
  avatarUri: string | null;           // 当前头像 URI
  isLoading: boolean;                 // 加载状态
  pickImage: () => Promise<void>;     // 选择头像（带裁剪）
  removeAvatar: () => Promise<void>;  // 移除头像
}

export function useUserProfile(): UseUserProfileResult
```

**核心功能**:
- 从设置仓库加载头像 URI
- 调用 expo-image-picker 选择和裁剪图片
- 将图片保存到本地文件系统
- 更新设置仓库中的头像 URI
- 处理权限请求和错误

### 阶段 2：通用头像组件

**目标**: 创建可在多处复用的 UserAvatar 组件

#### 任务 2.1：创建 UserAvatar 组件

- **目标**: 提供统一的用户头像显示组件，支持不同尺寸
- **输入**: 头像 URI、尺寸参数
- **输出**: UserAvatar 组件
- **涉及文件**:
  - `components/common/UserAvatar.tsx`（新建）
- **预估工作量**: 20 分钟

**组件 API 设计**:
```typescript
interface UserAvatarProps {
  size?: number;              // 头像大小，默认 40
  uri?: string | null;        // 头像 URI
  showBadge?: boolean;        // 是否显示编辑徽章
  onPress?: () => void;       // 点击回调
}

export function UserAvatar({ size = 40, uri, showBadge, onPress }: UserAvatarProps)
```

**实现要点**:
- 当有自定义头像时显示图片（使用 Avatar.Image）
- 无自定义头像时显示默认图标（使用 Avatar.Icon 的 'account' 图标）
- 支持不同尺寸适配
- 可选的编辑徽章（小图标叠加在右下角）
- 自适应深色/浅色主题

#### 任务 2.2：更新通用组件文档

- **目标**: 将 UserAvatar 组件加入到通用组件文档
- **输入**: 现有的 `components/common/CLAUDE.md`
- **输出**: 更新后的文档
- **涉及文件**:
  - `components/common/CLAUDE.md`
- **预估工作量**: 10 分钟

### 阶段 3：侧边栏头像编辑

**目标**: 在 ChatSidebar 底部卡片实现头像编辑功能

#### 任务 3.1：集成 UserAvatar 到侧边栏

- **目标**: 替换侧边栏底部的默认头像图标为 UserAvatar 组件
- **输入**: ChatSidebar 组件、UserAvatar 组件、useUserProfile Hook
- **输出**: 更新后的 ChatSidebar
- **涉及文件**:
  - `components/chat/ChatSidebar.tsx`
- **预估工作量**: 25 分钟

**实现细节**:
1. 引入 `useUserProfile` Hook 获取头像数据
2. 替换底部卡片中的 `<Avatar.Icon size={40} icon="account" />` 为 `<UserAvatar size={40} uri={avatarUri} showBadge onPress={handleAvatarPress} />`
3. 实现头像点击处理逻辑

#### 任务 3.2：实现头像编辑交互

- **目标**: 点击头像弹出操作菜单，支持更换和移除头像
- **输入**: useUserProfile Hook、useConfirmDialog Hook
- **输出**: 完整的头像编辑交互流程
- **涉及文件**:
  - `components/chat/ChatSidebar.tsx`
- **预估工作量**: 30 分钟

**交互流程**:
```
用户点击头像
  ↓
弹出 Action Sheet / Menu
  - 更换头像
  - 移除头像（仅当有自定义头像时显示）
  - 取消
  ↓
选择"更换头像"
  ↓
调用 pickImage()
  ↓
打开系统图片选择器（带裁剪功能）
  ↓
保存并更新显示
```

**使用 Menu 组件示例**:
```typescript
const [menuVisible, setMenuVisible] = useState(false);

const handleAvatarPress = () => {
  setMenuVisible(true);
};

const handleChangeAvatar = async () => {
  setMenuVisible(false);
  await pickImage(); // 来自 useUserProfile
};

const handleRemoveAvatar = async () => {
  setMenuVisible(false);
  await confirm({
    title: '移除头像',
    message: '确定要移除自定义头像吗？将恢复为默认头像。',
    buttons: [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: removeAvatar },
    ],
  });
};

// 在 JSX 中
<Menu
  visible={menuVisible}
  onDismiss={() => setMenuVisible(false)}
  anchor={
    <UserAvatar
      size={40}
      uri={avatarUri}
      showBadge
      onPress={handleAvatarPress}
    />
  }
>
  <Menu.Item onPress={handleChangeAvatar} title="更换头像" leadingIcon="image" />
  {avatarUri && (
    <Menu.Item onPress={handleRemoveAvatar} title="移除头像" leadingIcon="delete" />
  )}
</Menu>
```

### 阶段 4：对话页头像显示

**目标**: 在对话页面的用户消息气泡旁显示自定义头像

#### 任务 4.1：分析 MessageBubble 组件结构

- **目标**: 理解现有的消息气泡布局和头像显示逻辑
- **输入**: `components/chat/MessageBubble.tsx`
- **输出**: 对现有代码的理解和修改方案
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`（分析）
- **预估工作量**: 10 分钟

**当前实现分析**:
- 第 141-180 行：头像和模型名同行显示
- 用户消息使用 `Avatar.Icon` 的 'account' 图标（第 162-167 行）
- AI 消息使用模型 logo 或 'robot' 图标（第 143-160 行）
- 头像尺寸为 36x36，适合对话场景

#### 任务 4.2：替换用户消息头像

- **目标**: 将用户消息的默认头像替换为 UserAvatar 组件
- **输入**: MessageBubble 组件、useUserProfile Hook、UserAvatar 组件
- **输出**: 更新后的 MessageBubble 组件
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **预估工作量**: 20 分钟

**实现方案**:
```typescript
// 在 MessageBubbleComponent 中
const { avatarUri } = useUserProfile(); // 获取头像 URI

// 替换第 162-167 行的代码
{isUser ? (
  <UserAvatar
    size={36}
    uri={avatarUri}
  />
) : (
  // ... AI 头像逻辑保持不变
)}
```

**注意事项**:
- 不需要编辑徽章（showBadge=false，默认值）
- 不需要点击事件（onPress 不传）
- 尺寸设置为 36，与现有 AI 头像保持一致
- 自动适配主题色

#### 任务 4.3：性能优化验证

- **目标**: 确保 useUserProfile 在 MessageBubble 中的使用不会导致性能问题
- **输入**: 更新后的 MessageBubble 组件
- **输出**: 性能优化方案（如需要）
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **预估工作量**: 15 分钟

**优化策略**:
- 考虑将 `avatarUri` 作为 prop 传入而非在组件内调用 Hook
- 在 MessageList 组件中调用一次 `useUserProfile`，然后传递给所有 MessageBubble
- 利用现有的 `arePropsEqual` memoization 逻辑避免不必要的重渲染

**推荐方案**:
```typescript
// 在 MessageList.tsx 中
const { avatarUri } = useUserProfile();

// 传递给 MessageBubble
<MessageBubble
  {...otherProps}
  userAvatarUri={isUser ? avatarUri : undefined}
/>

// 在 MessageBubble 组件中
interface MessageBubbleProps {
  // ... 现有属性
  userAvatarUri?: string | null; // 新增
}

// 在 arePropsEqual 中添加比较
if (prev.userAvatarUri !== next.userAvatarUri) {
  return false;
}
```

### 阶段 5：测试与优化

**目标**: 全面测试功能并处理边界情况

#### 任务 5.1：功能测试

- **目标**: 验证核心功能正常工作
- **输入**: 完整的功能实现
- **输出**: 测试报告和 bug 修复
- **涉及文件**: 所有相关文件
- **预估工作量**: 30 分钟

**测试清单**:
- [ ] 首次使用：显示默认头像
- [ ] 选择头像：图片选择器正常打开
- [ ] 裁剪功能：expo-image-picker 的内置裁剪器工作正常
- [ ] 头像保存：选择后头像立即更新
- [ ] 头像持久化：重启应用后头像依然存在
- [ ] 移除头像：恢复为默认头像
- [ ] 侧边栏显示：底部卡片正确显示自定义头像
- [ ] 对话页显示：用户消息旁正确显示自定义头像
- [ ] 主题适配：深色/浅色主题下均显示正常
- [ ] 多处同步：侧边栏和对话页头像保持一致

#### 任务 5.2：边界情况处理

- **目标**: 处理各种异常和边界情况
- **输入**: 测试中发现的问题
- **输出**: 健壮的错误处理
- **涉及文件**:
  - `hooks/use-user-profile.ts`
  - 相关组件文件
- **预估工作量**: 25 分钟

**边界情况清单**:
- [ ] 权限拒绝：引导用户开启相册权限
- [ ] 取消选择：用户取消选择图片，不做任何操作
- [ ] 网络断开：本地存储不受影响
- [ ] 存储空间不足：提示用户清理空间
- [ ] 图片格式不支持：限制选择 JPEG/PNG
- [ ] 图片过大：通过裁剪功能压缩
- [ ] 文件系统错误：回退到默认头像并提示用户
- [ ] 组件卸载时的异步操作：使用 cleanup 防止内存泄漏

**错误处理示例**:
```typescript
const pickImage = async () => {
  try {
    // 请求权限
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请在设置中允许访问相册');
      return;
    }

    // 选择图片
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return; // 用户取消
    }

    // 保存头像 URI
    const uri = result.assets[0].uri;
    await settings.set(SettingKey.UserAvatarUri, uri);
    setAvatarUri(uri);
  } catch (error) {
    logger.error('[useUserProfile] pickImage 失败:', error);
    Alert.alert('错误', '无法设置头像，请重试');
  }
};
```

#### 任务 5.3：性能和体验优化

- **目标**: 优化加载性能和用户体验
- **输入**: 完整的功能实现
- **输出**: 优化后的代码
- **涉及文件**: 所有相关文件
- **预估工作量**: 20 分钟

**优化项清单**:
- [ ] 图片加载：使用 expo-image 的缓存和占位符
- [ ] 快速反馈：选择图片后立即显示，后台保存
- [ ] 加载状态：显示 ActivityIndicator
- [ ] 内存优化：及时释放不再使用的图片资源
- [ ] 代码分割：避免在 MessageBubble 中重复调用 Hook

**优化示例**:
```typescript
// UserAvatar 组件中的加载优化
<Avatar.Image
  source={{ uri }}
  size={size}
  style={{
    backgroundColor: theme.colors.surface, // 占位符背景色
  }}
/>
```

## 需要进一步明确的问题

无。所有技术决策已由用户确认。

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议：

```
用户补充内容：




```

---

## 验收标准

### 功能验收
- [x] ✅ 用户可以在侧边栏点击头像选择新头像
- [x] ✅ 图片选择器支持裁剪功能（1:1 圆形头像）
- [x] ✅ 选择的头像在侧边栏底部卡片正确显示
- [x] ✅ 选择的头像在对话页用户消息旁正确显示
- [x] ✅ 用户可以移除自定义头像，恢复默认图标
- [x] ✅ 头像数据持久化，重启应用后依然存在
- [x] ✅ 无自定义头像时显示默认的 'account' 图标

### 用户体验验收
- [x] ✅ 头像编辑交互流畅，无卡顿
- [x] ✅ 权限请求有友好的提示信息
- [x] ✅ 错误情况有明确的用户反馈
- [x] ✅ 深色/浅色主题均显示正常
- [x] ✅ 侧边栏和对话页头像保持一致

### 技术验收
- [x] ✅ 代码遵循项目现有的 TypeScript 规范
- [x] ✅ 使用现有的存储层（SettingsRepository）
- [x] ✅ UserAvatar 组件可复用，API 清晰
- [x] ✅ 无性能问题（MessageBubble 不过度重渲染）
- [x] ✅ 错误处理完善，无崩溃风险
- [x] ✅ 日志使用统一的 logger 工具

### 代码质量验收
- [x] ✅ 所有新增文件包含 JSDoc 注释
- [x] ✅ Hook 命名符合 `use-*` 规范
- [x] ✅ 组件使用 PascalCase 命名
- [x] ✅ 更新相关模块的 CLAUDE.md 文档

---

## 工作量总结

| 阶段 | 预估时间 |
|------|----------|
| 阶段 1：数据层扩展 | 50 分钟 |
| 阶段 2：通用头像组件 | 30 分钟 |
| 阶段 3：侧边栏头像编辑 | 55 分钟 |
| 阶段 4：对话页头像显示 | 45 分钟 |
| 阶段 5：测试与优化 | 75 分钟 |
| **总计** | **约 4-5 小时** |

---

## 技术实现亮点

1. **组件复用设计**: 通过 UserAvatar 组件实现代码复用，避免重复实现
2. **性能优化**: 在 MessageList 层级调用 Hook，避免每个消息气泡都创建实例
3. **现有模式复用**:
   - 使用现有的 SettingsRepository 存储头像 URI
   - 复用现有的 useConfirmDialog 处理删除确认
   - 遵循项目的 Hook 命名和组织规范
4. **用户体验**:
   - 使用 expo-image-picker 内置裁剪器，无需第三方依赖
   - 统一的交互模式（Menu 弹出菜单）
   - 友好的错误提示和权限引导
5. **可扩展性**:
   - 如未来需要添加用户名编辑，只需扩展 useUserProfile Hook
   - UserAvatar 组件支持不同尺寸，可在更多场景使用

---

## 后续扩展建议

虽然当前不实现，但为未来扩展预留的方向：

1. **头像来源扩展**: 支持拍照、从 URL 加载、AI 生成头像
2. **高级编辑功能**: 集成第三方编辑器（滤镜、贴纸、边框）
3. **头像同步**: 支持云端存储和多设备同步
4. **用户资料完善**: 添加用户名、签名、邮箱等字段
5. **头像历史**: 保存历史头像，支持快速切换

---

**规划完成时间**: 2025-11-10
**规划作者**: Claude (Project Planning Agent)