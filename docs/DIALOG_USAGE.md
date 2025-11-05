# 弹窗组件使用指南

本项目提供了统一美化的弹窗管理系统，包括确认对话框和输入对话框，替代原生 Alert 提供更好的用户体验���

## 目录

- [快速开始](#快速开始)
- [ConfirmDialog 确认对话框](#confirmdialog-确认对话框)
- [InputDialog 输入对话框](#inputdialog-输入对话框)
- [useConfirmDialog Hook](#useconfirmdialog-hook)
- [高级用法](#高级用法)
- [样式定制](#样式定制)

## 快速开始

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

在需要使用弹窗的组件中引入 `useConfirmDialog`：

```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

function MyComponent() {
  const { alert, confirmAction, prompt } = useConfirmDialog();

  // 使用弹窗...
}
```

## ConfirmDialog 确认对话框

用于显示确认、提示等信息对话框。

### 基础用法

#### 1. 简单提示（Alert）

```tsx
const { alert } = useConfirmDialog();

alert('提示', '操作已完成');
```

#### 2. 确认操作（ConfirmAction）

```tsx
const { confirmAction } = useConfirmDialog();

confirmAction(
  '删除确认',
  '确定要删除这个项目吗？删除后不可恢复。',
  async () => {
    // 用户点击确认后执行
    await deleteItem();
  },
  {
    confirmText: '删除',
    cancelText: '取消',
    destructive: true, // 危险操作（红色按钮）
  }
);
```

### 高级用法

#### 自定义按钮和图标

```tsx
const { confirm } = useConfirmDialog();

confirm({
  title: '保存更改',
  message: '您有未保存的更改，是否要保存？',
  icon: {
    name: 'content-save',
    type: 'material-community',
    color: '#4CAF50',
  },
  buttons: [
    { text: '不保存', style: 'cancel' },
    { text: '取消', style: 'default' },
    {
      text: '保存',
      style: 'default',
      onPress: () => saveChanges(),
    },
  ],
});
```

### 按钮样式

- `'default'` - 默认样式（主题色）
- `'cancel'` - 取消样式（灰色边框，透明背景）
- `'destructive'` - 危险样式（红色）

## InputDialog 输入对话框

用于需要用户输入文本的场景，如���命名、编辑等。

### 基础用法

#### 1. 简单输入

```tsx
const { prompt } = useConfirmDialog();

prompt({
  title: '重命名',
  placeholder: '请输入新名称',
  defaultValue: '旧名称',
  onConfirm: async (value) => {
    await rename(value);
  },
});
```

#### 2. 带验证的输入

```tsx
prompt({
  title: '设置密码',
  placeholder: '请输入密码',
  maxLength: 20,
  validation: (value) => {
    if (value.length < 6) {
      return { valid: false, error: '密码至少需要6个字符' };
    }
    if (!/[A-Z]/.test(value)) {
      return { valid: false, error: '密码需要包含至少一个大写字母' };
    }
    return { valid: true };
  },
  onConfirm: async (value) => {
    await setPassword(value);
  },
});
```

#### 3. 多行输入

```tsx
prompt({
  title: '添加备注',
  message: '请输入备注信息',
  placeholder: '输入备注...',
  multiline: true,
  maxLength: 200,
  icon: {
    name: 'note-text',
    type: 'material-community',
    color: theme.colors.primary,
  },
  onConfirm: async (value) => {
    await saveNote(value);
  },
});
```

### InputDialog 属性

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | ✅ | 对话框标题 |
| `message` | `string` | ❌ | 描述信息 |
| `placeholder` | `string` | ❌ | 输入框占位符 |
| `defaultValue` | `string` | ❌ | 默认值 |
| `multiline` | `boolean` | ❌ | 是否多行输入 |
| `maxLength` | `number` | ❌ | ���大字符数（显示字数统计） |
| `validation` | `function` | ❌ | 验证函数 |
| `icon` | `object` | ❌ | 图标配置 |
| `onConfirm` | `function` | ✅ | 确认回调 |

## useConfirmDialog Hook

### API 说明

```tsx
const {
  alert,         // 简单提示
  confirm,       // 自定义确认对话框
  confirmAction, // 标准确认操作
  prompt,        // 输入对话框
  hide,          // 手动关闭对话框
} = useConfirmDialog();
```

#### alert(title, message, onOk?)

显示简单的提示对话框。

```tsx
alert('成功', '数据已保存', () => {
  console.log('用户点击了确定');
});
```

#### confirmAction(title, message, onConfirm?, options?)

显示标准的确认/取消对话框。

```tsx
confirmAction(
  '删除确认',
  '确定要删除吗？',
  async () => {
    await deleteItem();
  },
  {
    confirmText: '删除',
    cancelText: '取消',
    destructive: true,
  }
);
```

#### confirm(options)

显示完全自定义的确认对话框。

```tsx
confirm({
  title: '选择操作',
  message: '请选择要执行的操作',
  buttons: [
    { text: '取消', style: 'cancel' },
    { text: '操作A', onPress: () => actionA() },
    { text: '操作B', onPress: () => actionB() },
  ],
});
```

#### prompt(options)

显示输入对话框。

```tsx
prompt({
  title: '输入名称',
  placeholder: '请输入...',
  onConfirm: async (value) => {
    await save(value);
  },
  validation: (value) => ({
    valid: value.trim().length > 0,
    error: '名称不能为空',
  }),
});
```

## 高级用法

### 1. 多步骤确认

```tsx
const handleDelete = () => {
  confirmAction(
    '删除警告',
    '删除后无法恢复，是否继续？',
    () => {
      confirmAction(
        '最后确认',
        '真的要删除吗？这是最后一次确认！',
        async () => {
          await deleteItem();
          alert('完成', '删除成功');
        },
        { destructive: true }
      );
    },
    { destructive: true }
  );
};
```

### 2. 条件验证

```tsx
prompt({
  title: '输入邮箱',
  placeholder: 'your@email.com',
  validation: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value.trim()) {
      return { valid: false, error: '邮箱不能为空' };
    }

    if (!emailRegex.test(value)) {
      return { valid: false, error: '邮箱格式不正确' };
    }

    return { valid: true };
  },
  onConfirm: async (email) => {
    await saveEmail(email);
  },
});
```

### 3. 异步处理中的加载状态

```tsx
prompt({
  title: '提交反馈',
  placeholder: '请输入您的反馈...',
  multiline: true,
  onConfirm: async (feedback) => {
    // InputDialog 会自动显示 "处理中..." 状态
    await submitFeedback(feedback);
    // 完成后自动关闭
  },
});
```

## 样式定制

### 主题色

弹窗组件会自动适配 React Native Paper 的主题色：

```tsx
import { MD3LightTheme } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',  // 会影响按钮颜色
    error: '#B00020',    // 影响危险操作按钮
  },
};
```

### 自定义图标

```tsx
// 使用 Material Community Icons
icon: {
  name: 'alert-circle',
  type: 'material-community',
  color: '#FFA726',
}

// 使用其��图标库（需要在 @rneui/themed 中配置）
icon: {
  name: 'warning',
  type: 'font-awesome',
  color: '#FF5722',
}
```

## 完整示例

### 话题重命名（实际使用案例）

```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ChatRepository } from '@/storage/repositories/chat';

function TopicItem({ topic }) {
  const { prompt } = useConfirmDialog();
  const theme = useTheme();

  const handleRename = () => {
    prompt({
      title: '重命名话题',
      placeholder: '请输入新标题',
      defaultValue: topic.title || '',
      maxLength: 50,
      icon: {
        name: 'pencil',
        type: 'material-community',
        color: theme.colors.primary,
      },
      validation: (value) => ({
        valid: value.trim().length > 0,
        error: '标题不能为空',
      }),
      onConfirm: async (value) => {
        await ChatRepository.renameConversation(topic.id, value.trim());
        // 刷新列表或显示成功提示
      },
    });
  };

  return (
    <IconButton icon="pencil" onPress={handleRename} />
  );
}
```

### 删除确认（实际使用案例）

```tsx
function TopicItem({ topic, onDeleted }) {
  const { confirmAction } = useConfirmDialog();

  const handleDelete = () => {
    confirmAction(
      '删除话题',
      '删除后不可恢复，确认删除？',
      async () => {
        await ChatRepository.deleteConversation(topic.id);
        onDeleted?.();
      },
      {
        confirmText: '删除',
        cancelText: '取消',
        destructive: true,
      }
    );
  };

  return (
    <IconButton icon="delete" onPress={handleDelete} />
  );
}
```

## 最佳实践

1. **验证优先** - 使用 `validation` 属性在用户输入时进行实时验证
2. **明确操作** - 使用清晰的标题���描述，让用户明白操作的后果
3. **危险标识** - 对不可逆操作使用 `destructive: true`
4. **图标辅助** - 使用合适的图标增强视觉识别
5. **异步处理** - 在 `onConfirm` 中使用 `async/await` 处理异步操作
6. **错误处理** - 在异步操作中捕获错误，提供友好的错误提示

## 注意事项

- ⚠️ 必须在 `ConfirmDialogProvider` 内使用 `useConfirmDialog`
- ⚠️ `InputDialog` 的 `onConfirm` 会在验证通过后才执行
- ⚠️ 多个对话框不会同时显示，后者会覆盖前者
- ⚠️ 在异步操作中，对话框会显示 "处理中..." 状态并禁用按钮
- ✅ 组件支持键盘避让（KeyboardAvoidingView）
- ✅ 输入框在打开时自动获得焦点
- ✅ 支持 Enter 键提交（单行输入）
- ✅ 支持深色模式自动适配
