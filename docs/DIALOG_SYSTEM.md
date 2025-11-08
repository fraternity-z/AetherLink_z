# 📱 统一弹出框系统文档

## 概述

AetherLink_z 采用统一的弹出框设计系统，所有弹出框都使用白色圆角方框样式，确保界面一致性和用户体验。

## 设计规范

### 视觉风格

- ✅ **圆角**: 24px 大圆角设计
- ✅ **背景**: 白色/深色模式自适应表面色
- ✅ **阴影**: iOS 柔和阴影 + Android Elevation
- ✅ **动画**: 缩放 + 淡入淡出组合动画
- ✅ **遮罩**: 50% 透明度黑色背景

### 布局结构

```
弹出框容器 (24px 圆角)
├─ 图标区域 (可选, 64x64)
├─ 标题区域 (居中, 粗体)
├─ 内容区域 (可滚动)
└─ 操作按钮区域 (12px 圆角按钮)
```

## 核心组件

### 1. UnifiedDialog - 居中对话框

用于显示警告、确认、输入等居中弹出框。

```typescript
import { UnifiedDialog } from '@/components/common';

<UnifiedDialog
  visible={visible}
  onClose={() => setVisible(false)}
  title="标题"
  icon="alert-circle"
  iconColor="#EF4444"
  showCloseButton={true}
  actions={[
    { text: '取消', onPress: () => {}, type: 'cancel' },
    { text: '确定', onPress: () => {}, type: 'primary' },
  ]}
>
  <Text>这里是内容</Text>
</UnifiedDialog>
```

**Props:**
- `visible`: boolean - 是否显示
- `onClose`: () => void - 关闭回调
- `title`: string - 标题文字
- `icon`: string - Material Community Icons 图标名
- `iconColor`: string - 图标颜色
- `children`: ReactNode - 内容区域
- `actions`: UnifiedDialogAction[] - 操作按钮数组
- `showCloseButton`: boolean - 是否显示关闭按钮
- `maxHeight`: number | string - 最大高度

**Action 类型:**
- `primary` - 主要操作 (紫色背景 + 白色文字)
- `destructive` - 危险操作 (红色边框 + 红色文字)
- `cancel` - 取消操作 (灰色边框 + 主色文字)

### 2. UnifiedBottomSheet - 底部弹出Sheet

用于从底部上拉的操作菜单或选择器。

```typescript
import { UnifiedBottomSheet } from '@/components/common';

<UnifiedBottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  title="选择操作"
  showDragIndicator={true}
  maxHeight="80%"
>
  <View>{/* 你的内容 */}</View>
</UnifiedBottomSheet>
```

**Props:**
- `visible`: boolean - 是否显示
- `onClose`: () => void - 关闭回调
- `title`: string - 标题文字
- `children`: ReactNode - 内容区域
- `maxHeight`: number | string - 最大高度
- `showDragIndicator`: boolean - 显示拖动指示器

### 3. ConfirmDialog - 确认对话框

已有的确认对话框组件，采用统一样式。

```typescript
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirmAction } = useConfirmDialog();

confirmAction(
  '删除确认',
  '确定要删除这条消息吗？',
  () => console.log('确认'),
  {
    confirmText: '确定删除',
    cancelText: '取消',
    destructive: true,
  }
);
```

### 4. InputDialog - 输入对话框

用于获取用户输入的对话框。

```typescript
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { prompt } = useConfirmDialog();

const result = await prompt(
  '重命名',
  '请输入新名称',
  {
    defaultValue: '原名称',
    placeholder: '请输入...',
  }
);
```

## 已美化的弹出框组件

### 聊天相关

- ✅ **ModelPickerDialog** - AI 模型选择器
  - 分组显示各提供商模型
  - 单选模式 + 自动保存
  - 统一白色圆角样式

- ✅ **AttachmentMenu** - 附件选择菜单 (底部Sheet)
  - 卡片式布局
  - 图标 + 文字清晰显示

- ✅ **MoreActionsMenu** - 更多操作菜单 (底部Sheet)
  - 支持多个操作项
  - 带描述文字

### 待美化组件

- ⏳ **AssistantPickerDialog** - 助手选择器
- ⏳ **ModelDiscoveryDialog** - 模型发现对话框

## 样式常量

所有弹出框共享的样式常量在 `dialog-styles.ts` 中定义：

```typescript
import { DIALOG_RADIUS, DIALOG_SPACING, DIALOG_SHADOW } from '@/components/common';

// 使用示例
const styles = StyleSheet.create({
  dialog: {
    borderRadius: DIALOG_RADIUS.dialog, // 24
    padding: DIALOG_SPACING.padding, // 24
    ...DIALOG_SHADOW,
  },
});
```

## 动画配置

### 居中对话框动画
- **入场**: 缩放 0.9 → 1.0 + 淡入
- **退场**: 缩放 1.0 → 0.9 + 淡出
- **弹性**: Spring (tension: 80, friction: 12)
- **时长**: 200ms

### 底部Sheet动画
- **入场**: 向上滑动 + 淡入
- **退场**: 向下滑动 + 淡出
- **弹性**: Spring (tension: 65, friction: 10)
- **时长**: 200ms

## 最佳实践

### 1. 选择合适的组件类型

- **简单确认/警告** → `ConfirmDialog` (via useConfirmDialog)
- **需要用户输入** → `InputDialog` (via useConfirmDialog.prompt)
- **复杂内容/选择器** → `UnifiedDialog`
- **操作菜单** → `UnifiedBottomSheet`

### 2. 图标使用

- **信息提示** → `information` (蓝色)
- **警告** → `alert` (黄色)
- **错误/危险** → `alert-circle` (红色)
- **成功** → `check-circle` (绿色)
- **问题** → `help-circle` (紫色)

### 3. 按钮配置

```typescript
// 推荐按钮顺序: 取消在左,确定在右
actions={[
  { text: '取消', onPress: onCancel, type: 'cancel' },
  { text: '确定', onPress: onConfirm, type: 'primary' },
]}

// 危险操作
actions={[
  { text: '取消', onPress: onCancel, type: 'cancel' },
  { text: '删除', onPress: onDelete, type: 'destructive' },
]}
```

### 4. 内容区域

- 使用 `ScrollView` 处理长内容
- 设置合理的 `maxHeight` (建议 80-85%)
- 内容区域留足内边距 (24px)

### 5. 响应式设计

- 对话框最大宽度 400-420px
- 移动端两侧留 20px 边距
- Sheet 从底部完全展开

## 迁移指南

### 从 React Native Paper Dialog 迁移

**Before:**
```typescript
<Portal>
  <Dialog visible={visible} onDismiss={onDismiss}>
    <Dialog.Title>标题</Dialog.Title>
    <Dialog.Content>
      <Text>内容</Text>
    </Dialog.Content>
    <Dialog.Actions>
      <Button onPress={onDismiss}>确定</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

**After:**
```typescript
<UnifiedDialog
  visible={visible}
  onClose={onDismiss}
  title="标题"
  actions={[
    { text: '确定', onPress: onDismiss, type: 'primary' }
  ]}
>
  <Text>内容</Text>
</UnifiedDialog>
```

### 优势

- ✅ 更简洁的API
- ✅ 统一的视觉样式
- ✅ 更好的动画效果
- ✅ 自动主题适配
- ✅ 跨平台一致性

## 示例代码

完整示例请参考:
- `components/common/DialogShowcase.tsx` - 所有弹出框样式展示
- `components/chat/ModelPickerDialog.tsx` - 模型选择器实现
- `components/chat/MoreActionsMenu.tsx` - 更多操作菜单实现

## 注意事项

1. **性能**: 使用 `React.memo` 优化重渲染
2. **键盘**: 输入对话框自动处理键盘避让
3. **动画**: 避免在动画过程中执行耗时操作
4. **Portal**: 不需要手动使用 Portal，组件内部使用 Modal
5. **可访问性**: 确保所有按钮都有清晰的文字描述

## 更新日志

### 2025-11-08
- ✨ 创建统一弹出框系统
- ✨ 重构 AttachmentMenu 和 MoreActionsMenu
- ✨ 重构 ModelPickerDialog 使用统一样式
- 📚 完善弹出框系统文档
