# 话题导出功能使用指南

## 📖 概述

话题导出功能允许用户将整个对话导出为 DOCX 格式的文档，包含：
- ✅ 完整的消息内容（支持 Markdown 格式）
- ✅ 思考链（Chain of Thought）- 可选完整/摘要/不导出
- ✅ MCP 工具调用详情（参数和结果）
- ✅ 附件信息（文件名和类型）
- ✅ 自动脱敏敏感数据（API Key、Token 等）

## 🚀 快速开始

### 1. 基础用法

在任何组件中使用 `useTopicExport` Hook：

```typescript
import { useTopicExport } from '@/hooks/use-topic-export';
import { TopicExportDialog } from '@/components/chat/dialogs/TopicExportDialog';

function MyComponent() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const conversationId = 'your-conversation-id';

  const {
    exportAndShare,
    isExporting,
    progress,
    error,
  } = useTopicExport();

  const handleExport = async (options) => {
    try {
      await exportAndShare(conversationId, options);
      setDialogVisible(false);
      // 导出成功，文件已自动分享
    } catch (err) {
      console.error('导出失败', err);
    }
  };

  return (
    <>
      <Button onPress={() => setDialogVisible(true)}>
        导出话题
      </Button>

      <TopicExportDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        onConfirm={handleExport}
        progress={progress}
        isExporting={isExporting}
      />
    </>
  );
}
```

### 2. 仅导出（不分享）

如果只想导出文件而不立即分享：

```typescript
const { exportTopic } = useTopicExport();

const handleExport = async () => {
  const result = await exportTopic(conversationId, {
    includeThinking: 'full',
    includeMcpTools: true,
    includeAttachments: true,
    sanitizeSensitiveData: true,
  });

  console.log('导出成功', result);
  // result.filePath: 文件路径
  // result.fileSize: 文件大小
  // result.messageCount: 消息数量
  // result.durationMs: 导出耗时
};
```

### 3. 手动分享文件

分离导出和分享操作：

```typescript
const { exportTopic, shareFile } = useTopicExport();

// 第一步：导出
const result = await exportTopic(conversationId);

// 第二步：分享（可延迟执行）
await shareFile(result.filePath);
```

## 🎛️ 导出选项

### ExportOptions 配置

```typescript
interface ExportOptions {
  // 思考链导出模式
  includeThinking: 'full' | 'summary' | 'none';  // 默认: 'full'

  // 是否包含 MCP 工具调用
  includeMcpTools: boolean;                       // 默认: true

  // 是否包含附件信息
  includeAttachments: boolean;                    // 默认: true

  // 是否脱敏敏感数据
  sanitizeSensitiveData: boolean;                 // 默认: true
}
```

### 思考链模式说明

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `full` | 完整导出思考过程和耗时 | 需要完整记录 AI 推理过程 |
| `summary` | 仅导出摘要（前 500 字符） | 简化文档，节省空间 |
| `none` | 不导出思考链 | 不需要查看推理过程 |

## 📊 进度监控

使用 `progress` 对象监控导出进度：

```typescript
const { progress } = useTopicExport();

// progress 结构：
{
  stage: 'loading' | 'converting' | 'generating' | 'saving' | 'complete',
  percentage: number,  // 0-100
  message: string,     // 当前阶段描述
  currentMessage?: number,   // 当前处理的消息索引
  totalMessages?: number,    // 总消息数
}
```

示例：

```typescript
{progress && (
  <View>
    <Text>{progress.message}</Text>
    <ProgressBar progress={progress.percentage / 100} />
  </View>
)}
```

## 🔌 集成到现有组件

### 方案 1：添加到话题侧边栏

在 `TopicsSidebar.tsx` 中添加导出按钮：

```typescript
import { useTopicExport } from '@/hooks/use-topic-export';
import { TopicExportDialog } from '@/components/chat/dialogs/TopicExportDialog';

// 在组件中添加状态
const [exportDialogVisible, setExportDialogVisible] = useState(false);
const { exportAndShare, isExporting, progress } = useTopicExport();

// 添加按钮到话题列表项的菜单中
<Menu.Item
  leadingIcon="export"
  onPress={() => setExportDialogVisible(true)}
  title="导出话题"
/>

// 添加对话框
<TopicExportDialog
  visible={exportDialogVisible}
  onDismiss={() => setExportDialogVisible(false)}
  onConfirm={(options) => exportAndShare(currentConversationId, options)}
  progress={progress}
  isExporting={isExporting}
/>
```

### 方案 2：添加到顶部导航栏

在 `app/index.tsx` 的导航栏中添加导出按钮：

```typescript
<Appbar.Action
  icon="export"
  onPress={() => setExportDialogVisible(true)}
/>
```

## ⚠️ 注意事项

### 1. 性能考虑

- 大型对话（1000+ 条消息）导出可能需要 20-30 秒
- 建议在导出时显示进度提示，避免用户误以为应用卡死
- 导出过程会占用一定内存，超大对话可能导致内存不足

### 2. 敏感信息脱敏

默认开启敏感信息脱敏，会自动识别并屏蔽：
- API Key
- Access Token
- 密码
- 长字符串（20+ 字符的随机字符串）

如需导出完整信息，请设置 `sanitizeSensitiveData: false`。

### 3. 平台兼容性

- ✅ iOS：完全支持
- ✅ Android：完全支持
- ❌ Web：暂不支持（`expo-sharing` 限制）

### 4. 文件存储

导出的文件保存在：
- iOS: `FileSystem.cacheDirectory`
- Android: `FileSystem.cacheDirectory`

文件会在应用清理缓存时被删除，建议用户及时分享或保存。

## 🐛 错误处理

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| "话题未找到" | conversationId 不存在 | 检查 ID 是否正确 |
| "无法访问临时目录" | 文件系统权限问题 | 检查应用权限 |
| "文件分享功能不可用" | 平台不支持分享 | 仅在移动端使用 |
| "导出超时" | 对话过大 | 分段导出或优化性能 |

### 错误捕获示例

```typescript
const { exportAndShare, error } = useTopicExport();

try {
  await exportAndShare(conversationId);
} catch (err) {
  // error 状态会自动更新
  if (error) {
    Alert.alert('导出失败', error);
  }
}
```

## 📝 完整示例

完整的集成示例代码：

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useTopicExport } from '@/hooks/use-topic-export';
import { TopicExportDialog } from '@/components/chat/dialogs/TopicExportDialog';

function TopicExportExample({ conversationId }: { conversationId: string }) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const {
    exportAndShare,
    isExporting,
    progress,
    error,
    result,
  } = useTopicExport();

  const handleExport = async (options) => {
    try {
      await exportAndShare(conversationId, options);
      setDialogVisible(false);
      setSnackbarVisible(true);
    } catch (err) {
      Alert.alert('导出失败', error || '未知错误');
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        icon="export"
        onPress={() => setDialogVisible(true)}
      >
        导出话题
      </Button>

      <TopicExportDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        onConfirm={handleExport}
        progress={progress}
        isExporting={isExporting}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        导出成功！共 {result?.messageCount} 条消息
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
```

## 🔧 自定义扩展

### 添加新的导出格式

如需支持其他格式（如 PDF、Markdown），可以：

1. 在 `services/export/types.ts` 中添加新格式
2. 创建对应的转换器（如 `PdfGenerator.ts`）
3. 在 `TopicExportService.ts` 中添加导出方法
4. 更新 UI 组件以支持格式选择

### 自定义文档样式

修改 `services/export/styles/DocumentStyles.ts`：

```typescript
// 自定义页眉
static createHeader(topicTitle: string, exportDate: Date): Header {
  // 修改字体、颜色、布局等
}

// 自定义页脚
static createFooter(): Footer {
  // 修改页码样式等
}
```

## 📚 API 参考

详细的 API 文档请参阅：
- `hooks/use-topic-export.ts` - React Hook
- `services/export/TopicExportService.ts` - 核心服务
- `services/export/types.ts` - 类型定义
- `components/chat/dialogs/TopicExportDialog.tsx` - UI 组件

---

**版本**: v1.0
**最后更新**: 2025-11-22
**作者**: 浮浮酱 (猫娘工程师) 喵～
