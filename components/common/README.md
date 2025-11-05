# 通用组件库

本目录包含应用中通用的 UI 组件，可在多个页面和功能中复用。

## 组件列表

### 弹窗组件

#### [ConfirmDialog](./ConfirmDialog.tsx)
现代化确认对话框组件，替代原生 Alert。

**特性：**
- ✨ 优雅的圆角设计和流畅动画
- 🎨 支持自定义图标和按钮
- ⚠️ 支持危险操作（destructive）样式
- 🌓 自动适配深色模式

**快速使用：**
```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirmAction } = useConfirmDialog();

confirmAction(
  '删除确认',
  '确定要删除吗？',
  async () => {
    await deleteItem();
  },
  { destructive: true }
);
```

#### [InputDialog](./InputDialog.tsx)
现代化输入对话框组件，用于需要用户输入的场景。

**特性：**
- 📝 支持单行/多行输入
- ✅ 实时输入验证和错误提示
- ⌨️ 键盘优化和自动聚焦
- 🔢 可选字数统计
- 🔄 异步处理支持

**快速使用：**
```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { prompt } = useConfirmDialog();

prompt({
  title: '重命名',
  placeholder: '请输入新名称',
  defaultValue: '旧名称',
  maxLength: 50,
  validation: (value) => ({
    valid: value.trim().length > 0,
    error: '名称不能为空',
  }),
  onConfirm: async (value) => {
    await rename(value);
  },
});
```

#### [DialogShowcase](./DialogShowcase.tsx)
弹窗组件展示页面，包含所有弹窗样式的示例。

**用途：**
- 🎨 视觉效果预览
- 🧪 测试和调试
- 📚 学习参考

---

## 使用指南

### 1. 添加 Provider

在应用根组件中添加 `ConfirmDialogProvider`：

```tsx
import { ConfirmDialogProvider } from '@/hooks/use-confirm-dialog';

export default function RootLayout() {
  return (
    <ConfirmDialogProvider>
      {/* 你的应用内容 */}
    </ConfirmDialogProvider>
  );
}
```

### 2. 使用 Hook

```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

function MyComponent() {
  const { alert, confirmAction, prompt } = useConfirmDialog();

  // 简单提示
  const showAlert = () => {
    alert('提示', '操作已完成');
  };

  // 确认操作
  const handleDelete = () => {
    confirmAction(
      '删除确认',
      '确定要删除吗？',
      async () => {
        await deleteItem();
      },
      { destructive: true }
    );
  };

  // 输入对话框
  const handleRename = () => {
    prompt({
      title: '重命名',
      placeholder: '请输入新名称',
      onConfirm: async (value) => {
        await rename(value);
      },
    });
  };

  return (
    <View>
      <Button onPress={showAlert}>显示提示</Button>
      <Button onPress={handleDelete}>删除项目</Button>
      <Button onPress={handleRename}>重命名</Button>
    </View>
  );
}
```

---

## 完整文档

详细的使用指南和 API 文档请参阅：
- 📖 [弹窗组件完整文档](../../docs/DIALOG_USAGE.md)

---

## 贡献指南

### 添加新组件

1. 在此目录下创建新的组件文件
2. 使用 TypeScript 编写，包含完整的类型定义
3. 添加详细的 JSDoc 注释
4. 更新本 README.md 文件

### 组件规范

- ✅ 使用 React Native Paper 和 React Native Elements 的主题系统
- ✅ 支持深色模式
- ✅ 跨平台兼容（iOS、Android、Web）
- ✅ 完整的 TypeScript 类型
- ✅ 清晰的 Props 接口定义
- ✅ 响应式设计

---

## 技术栈

- **UI 库**: React Native Paper, React Native Elements
- **动画**: React Native Animated
- **图标**: @rneui/themed (Material Community Icons)
- **类型**: TypeScript

---

最后更新：2025-11-05
