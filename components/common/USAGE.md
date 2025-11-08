# 📱 统一弹出框使用指南

## 快速开始

```typescript
import {
  UnifiedDialog,
  UnifiedBottomSheet,
} from '@/components/common';
```

## 基础示例

### 1. 简单的确认对话框

```typescript
function DeleteConfirm() {
  const [visible, setVisible] = useState(false);

  return (
    <UnifiedDialog
      visible={visible}
      onClose={() => setVisible(false)}
      title="删除确认"
      icon="alert-circle"
      iconColor="#EF4444"
      actions={[
        { text: '取消', onPress: () => setVisible(false), type: 'cancel' },
        { text: '删除', onPress: handleDelete, type: 'destructive' },
      ]}
    >
      <Text>确定要删除这个项目吗？此操作无法撤销。</Text>
    </UnifiedDialog>
  );
}
```

### 2. 底部操作菜单

```typescript
function ActionMenu() {
  const [visible, setVisible] = useState(false);

  return (
    <UnifiedBottomSheet
      visible={visible}
      onClose={() => setVisible(false)}
      title="选择操作"
    >
      <View style={{ gap: 12 }}>
        <MenuItem icon="pencil" text="编辑" onPress={handleEdit} />
        <MenuItem icon="share" text="分享" onPress={handleShare} />
        <MenuItem icon="delete" text="删除" color="#EF4444" onPress={handleDelete} />
      </View>
    </UnifiedBottomSheet>
  );
}
```

## 高级用法

### 带输入框的对话框

```typescript
function CustomInputDialog() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');

  return (
    <UnifiedDialog
      visible={visible}
      onClose={() => setVisible(false)}
      title="自定义输入"
      icon="pencil"
      actions={[
        { text: '取消', onPress: () => setVisible(false), type: 'cancel' },
        { text: '确定', onPress: () => handleSubmit(value), type: 'primary' },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="请输入内容..."
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
    </UnifiedDialog>
  );
}
```

### 多选列表

```typescript
function MultiSelectDialog() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onClose}
      title="选择标签"
      actions={[
        { text: '取消', onPress: onClose, type: 'cancel' },
        { text: '确定', onPress: () => handleConfirm(selected), type: 'primary' },
      ]}
    >
      <ScrollView style={{ maxHeight: 300 }}>
        {tags.map(tag => (
          <Pressable
            key={tag}
            onPress={() => toggleTag(tag)}
            style={{ flexDirection: 'row', padding: 12 }}
          >
            <Icon
              name={selected.includes(tag) ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
            />
            <Text>{tag}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </UnifiedDialog>
  );
}
```

## 样式定制

所有弹出框都自动适配主题，无需手动设置颜色。

```typescript
// ✅ 自动适配主题
<UnifiedDialog
  title="标题"
  // backgroundColor 会自动使用 theme.colors.surface
  // textColor 会自动使用 theme.colors.onSurface
/>

// ❌ 不要手动设置背景色
<UnifiedDialog
  title="标题"
  style={{ backgroundColor: '#FFF' }} // 错误！
/>
```

## 常用图标

| 图标名 | 适用场景 | 推荐颜色 |
|-------|---------|---------|
| `alert-circle` | 警告、错误 | #EF4444 |
| `information` | 信息提示 | #3B82F6 |
| `check-circle` | 成功 | #10B981 |
| `help-circle` | 帮助、问题 | theme.colors.primary |
| `delete` | 删除 | #EF4444 |
| `pencil` | 编辑 | theme.colors.primary |
| `cog` | 设置 | #6B7280 |

完整文档请参考 [DIALOG_SYSTEM.md](../../docs/DIALOG_SYSTEM.md)
