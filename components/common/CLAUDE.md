[根目录](../../CLAUDE.md) > **components** > **common**

# 通用组件模块

## 模块职责

提供应用中可复用的通用 UI 组件，包括对话框、头像、输入组件等基础交互元素。

## 核心组件

### ConfirmDialog - 确认对话框
统一的确认对话框组件，提供现代化的 UI 设计和流畅的动画效果。

**特性**:
- 🎨 现代化设计，圆角阴影
- ✅ 支持确认和取消按钮
- 🌓 自动适配深色模式
- 📱 完美支持跨平台（iOS、Android、Web）

**使用方式**:
```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirm } = useConfirmDialog();

await confirm({
  title: '删除对话',
  message: '确定要删除这个对话吗？',
  confirmText: '删除',
  cancelText: '取消',
});
```

---

### InputDialog - 输入对话框
统一的输入对话框组件，用于获取用户输入。

**特性**:
- ⌨️ 键盘优化和自动聚焦
- ✅ 输入验证和实时错误提示
- 🔄 异步操作支持和加载状态
- 🎨 现代化设计，支持流畅动画

**使用方式**:
```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { prompt } = useConfirmDialog();

const result = await prompt({
  title: '重命名',
  message: '请输入新的名称',
  placeholder: '输入名称...',
  defaultValue: '旧名称',
});

if (result) {
  // 用户确认并输入了内容
  console.log('新名称:', result);
}
```

---

### UnifiedDialog - 统一对话框
底层对话框组件，ConfirmDialog 和 InputDialog 的基础实现。

**特性**:
- 🔧 高度可定制
- 🎭 支持自定义内容
- 📦 统一的样式和行为

---

### UserAvatar - 用户头像组件
统一的用户头像显示组件，支持自定义头像和默认图标的切换。

**特性**:
- 📷 支持自定义头像图片
- 🎨 自适应主题（深色/浅色）
- 🔧 可配置尺寸和编辑徽章
- ♻️ 可在多处复用（侧边栏、对话页等）
- 👆 支持点击交互

**组件 API**:
```typescript
interface UserAvatarProps {
  size?: number;              // 头像大小，默认 40
  uri?: string | null;        // 头像 URI，null 时显示默认图标
  showBadge?: boolean;        // 是否显示编辑徽章，默认 false
  onPress?: () => void;       // 点击回调
}
```

**使用示例**:
```tsx
import { UserAvatar } from '@/components/common/UserAvatar';
import { useUserProfile } from '@/hooks/use-user-profile';

// 基础用法 - 显示头像
<UserAvatar size={40} uri={avatarUri} />

// 可编辑头像 - 带徽章和点击事件
const { avatarUri, pickImage } = useUserProfile();
<UserAvatar
  size={40}
  uri={avatarUri}
  showBadge
  onPress={pickImage}
/>

// 对话页用户头像 - 小尺寸，无交互
<UserAvatar size={36} uri={avatarUri} />
```

**设计说明**:
- 有自定义头像时：显示圆形图片（Avatar.Image）
- 无自定义头像时：显示默认 'account' 图标（Avatar.Icon）
- 编辑徽章：小的铅笔图标，位于右下角
- 主题适配：自动使用当前主题的颜色

---

## 对外接口

### Hooks
- `useConfirmDialog()` - 提供 `confirm` 和 `prompt` 方法，用于显示对话框

### Components
- `<UserAvatar />` - 用户头像组件
- `<ConfirmDialog />` - 确认对话框（通常通过 Hook 使用）
- `<InputDialog />` - 输入对话框（通常通过 Hook 使用）
- `<UnifiedDialog />` - 统一对话框基础组件

## 关键依赖

### UI 框架
- **React Native Paper**: 提供 Avatar、IconButton 等基础组件
- **React Native**: 核心组件（View、Pressable、StyleSheet）

### 数据依赖
- **SettingsRepository**: UserAvatar 通过 useUserProfile Hook 访问头像数据
- **expo-image-picker**: 图片选择功能

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试覆盖
- **UserAvatar**: 头像显示、尺寸变化、主题适配、点击事件
- **ConfirmDialog**: 对话框显示、按钮点击、取消操作
- **InputDialog**: 输入验证、键盘交互、提交操作

## 常见问题 (FAQ)

### Q: UserAvatar 如何获取头像数据？
A: 使用 `useUserProfile` Hook 获取头像 URI，然后传递给 UserAvatar 组件。

### Q: 如何自定义对话框样式？
A: 可以通过修改 UnifiedDialog 组件的样式或使用自定义组件。

### Q: UserAvatar 支持哪些图片格式？
A: 支持所有 React Native Image 支持的格式（JPEG、PNG、GIF、WebP等）。

## 相关文件清单

### 组件文件
- `UserAvatar.tsx` - 用户头像组件
- `ConfirmDialog.tsx` - 确认对话框
- `InputDialog.tsx` - 输入对话框
- `UnifiedDialog.tsx` - 统一对话框基础组件

### 相关 Hooks
- `hooks/use-confirm-dialog.tsx` - 对话框 Hook
- `hooks/use-user-profile.ts` - 用户头像管理 Hook

### 文档
- `DIALOG_USAGE.md` - 对话框使用指南（如存在）

## 变更记录 (Changelog)

### 2025-11-10
- ✨ 新增 UserAvatar 组件，支持自定义头像显示
- 📝 创建通用组件模块文档
- 🔗 集成 useUserProfile Hook，实现头像数据管理

### 2025-11-05
- ✨ 创建统一的弹窗管理系统
- 新增 InputDialog 组件用于输入场景
- 优化 ConfirmDialog 视觉样式
- 扩展 use-confirm-dialog Hook，新增 prompt 方法
