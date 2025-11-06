# ChatInput 组件 NativeWind 迁移文档

## 📋 迁移概览

**组件路径**: `components/chat/ChatInput.tsx`
**迁移日期**: 2025-11-06
**迁移策略**: 混合迁移（NativeWind + StyleSheet）

## 🎯 迁移原则

### ✅ 使用 NativeWind 的场景
- 静态布局样式（padding, margin, flex）
- 简单尺寸和圆角
- 基础边框样式
- 文本对齐和字体大小

### ⚠️ 保留 StyleSheet 的场景
- 平台特定样式（`Platform.select`）
- 动态主题颜色（`theme.colors.xxx`）
- 复杂阴影效果（iOS/Android 差异）
- 状态依赖的动态样式

## 📊 迁移对照表

### 1. 外层容器 (`outerContainer`)

```typescript
// ❌ 迁移前
const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
});

<View style={styles.outerContainer}>

// ✅ 迁移后
<View className="px-4 pt-2 pb-2">
```

### 2. 输入容器 (`inputContainer`)

```typescript
// ❌ 迁移前
inputContainer: {
  borderRadius: 20,
  borderWidth: 1,
  overflow: 'hidden',
  ...Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
}

<View style={[styles.inputContainer, {
  backgroundColor: theme.colors.surface,
  borderColor: theme.colors.outlineVariant,
  shadowColor: '#000',
}]}>

// ✅ 迁移后（混合方案）
<View
  className="rounded-[20px] border overflow-hidden"
  style={[
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      shadowColor: '#000',
    },
    Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  ]}
>
```

### 3. 文本输入框 (`textInput`)

```typescript
// ❌ 迁移前
textInput: {
  fontSize: 15,
  lineHeight: 20,
  textAlignVertical: 'top',
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 8,
  minHeight: 44,
  maxHeight: 120,
}

<RNTextInput style={[styles.textInput, { color: theme.colors.onSurface }]}>

// ✅ 迁移后
<RNTextInput
  className="text-[15px] leading-5 px-4 pt-3 pb-2 min-h-11 max-h-[120px]"
  style={[
    {
      textAlignVertical: 'top',  // Web 不支持，保留
      color: theme.colors.onSurface,  // 动态主题色
    }
  ]}
>
```

### 4. 工具栏行 (`toolbarRow`)

```typescript
// ❌ 迁移前
toolbarRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 8,
  paddingVertical: 8,
  minHeight: 52,
}

// ✅ 迁移后
<View className="flex-row items-center justify-between px-2 py-2 min-h-[52px]">
```

### 5. 左右工具按钮组

```typescript
// ❌ 迁移前
leftTools: {
  flexDirection: 'row',
  alignItems: 'center',
}

rightTools: {
  flexDirection: 'row',
  alignItems: 'center',
}

// ✅ 迁移后
<View className="flex-row items-center">
```

### 6. 附件栏 (`attachmentsBar` & `attachmentsContent`)

```typescript
// ❌ 迁移前
attachmentsBar: {
  paddingHorizontal: 8,
  paddingBottom: 6,
}

attachmentsContent: {
  alignItems: 'center',
  gap: 8,
}

// ✅ 迁移后
<ScrollView
  className="px-2 pb-1.5"
  contentContainerStyle={{ alignItems: 'center', gap: 8 }}  // gap 保留，兼容性更好
>
```

### 7. 附件缩略图 (`attachmentThumb`)

```typescript
// ❌ 迁移前
attachmentThumb: {
  width: 96,
  height: 64,
  borderRadius: 8,
}

// ✅ 迁移后
<Image
  className="w-24 h-16 rounded-lg"
  source={{ uri: img.uri }}
/>
```

### 8. 删除徽章 (`removeBadge`)

```typescript
// ❌ 迁移前
removeBadge: {
  position: 'absolute',
  top: -8,
  right: -8,
  borderRadius: 12,
}

// ✅ 迁移后
<TouchableOpacity
  className="absolute -top-2 -right-2 rounded-xl"
  style={{ backgroundColor: theme.colors.error }}  // 动态主题色
>
```

### 9. 文件芯片 (`fileChip`)

```typescript
// ❌ 迁移前
fileChip: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderRadius: 16,
  paddingHorizontal: 8,
  paddingVertical: 4,
}

// ✅ 迁移后
<View
  className="flex-row items-center border rounded-2xl px-2 py-1"
  style={{ borderColor: theme.colors.outlineVariant }}
>
```

### 10. 工具按钮样式 (`toolButtonStyle`)

```typescript
// ❌ 迁移前
toolButtonStyle: {
  marginHorizontal: 2,
}

// ✅ 迁移后
<IconButton className="mx-0.5" ... />
```

## 🔧 特殊处理案例

### 案例 1: 动态背景色（发送按钮）

```typescript
// ✅ 正确做法：保留 style 属性
<IconButton
  icon={isGenerating ? "stop" : "send"}
  style={[
    isGenerating && {
      backgroundColor: theme.colors.error,
    }
  ]}
/>
```

### 案例 2: `gap` 属性

```typescript
// ⚠️ 注意：gap 在某些老版本 RN 可能不支持
// 推荐：contentContainerStyle 中使用

// ✅ 推荐写法
<ScrollView
  contentContainerStyle={{ alignItems: 'center', gap: 8 }}
>
```

## 📝 迁移检查清单

- [x] 外层容器布局迁移
- [x] 输入容器混合样式
- [x] 文本输入框混合样式
- [x] 工具栏布局迁移
- [x] 附件栏布局迁移
- [x] 附件预览样式迁移
- [x] 动态主题色保留
- [x] 平台特定阴影保留
- [x] 删除旧的 StyleSheet 定义

## 🎨 样式统计

| 类别 | 迁移到 NativeWind | 保留 StyleSheet | 混合使用 |
|------|------------------|----------------|---------|
| 布局 | 100% | 0% | 0% |
| 尺寸 | 100% | 0% | 0% |
| 圆角/边框 | 100% | 0% | 0% |
| 颜色 | 0% | 100% | 0% |
| 阴影 | 0% | 100% | 0% |
| 特殊属性 | 0% | 100% | 0% |

## 🚀 性能优化建议

1. **减少内联 style 对象**
   - 将静态样式移到 className
   - 仅在 style 中保留动态值

2. **使用 useMemo 缓存复杂样式**
   ```typescript
   const containerStyle = useMemo(() => [
     {
       backgroundColor: theme.colors.surface,
       borderColor: theme.colors.outlineVariant,
       shadowColor: '#000',
     },
     Platform.select({
       ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
       android: { elevation: 4 },
     }),
   ], [theme.colors.surface, theme.colors.outlineVariant]);
   ```

3. **避免过度使用任意值**
   - 优先使用 Tailwind 预设值（如 `rounded-lg` 而非 `rounded-[8px]`）
   - 仅在必要时使用任意值

## ⚠️ 已知问题

1. **`textAlignVertical` 在 Web 上不生效**
   - 解决方案：保留在 style 中，Web 平台自动忽略

2. **Android 阴影效果有限**
   - 解决方案：继续使用 `elevation`，不强制迁移到 NativeWind shadow

3. **IconButton 的 className 支持有限**
   - 解决方案：使用 `style` 属性替代

## 📚 参考资源

- [NativeWind 官方文档](https://www.nativewind.dev/)
- [Tailwind CSS 速查表](https://tailwindcss.com/docs)
- [React Native Platform 模块](https://reactnative.dev/docs/platform-specific-code)
