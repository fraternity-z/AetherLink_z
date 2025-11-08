# 思考链功能实施规划 - 迭代版本 v1.1

**基于用户反馈的最终确认方案**

---

## 📋 用户确认的关键决策

| 决策项 | 最终方案 | 实施要点 |
|--------|---------|---------|
| **UI 设计** | 按用户截图复刻 | 可折叠组件，显示时长，位于正文上方 |
| **流式显示** | 实时流式输出 | 支持实时更新，采用防抖优化性能 |
| **模型支持** | 仅原生思考链模型 | OpenAI o1, DeepSeek R1 等 |
| **默认状态** | 默认折叠 | 保持界面简洁，用户可点击展开 |
| **历史消息** | 不处理 | 向后兼容，仅新消息启用功能 |
| **技术参考** | Vercel SDK 官方文档 | 学习思考链与正文分离的解析方式 |

---

## 🎯 实施计划调整说明

基于用户反馈，对原规划进行以下调整：

### 1. UI 设计方向明确
- ✅ 已有参考截图（对话中提供）
- 设计要素：
  - 灯泡图标 💡 标识思考链
  - 标题："已深度思考（用时 X.X 秒）"
  - 可点击的展开/折叠箭头
  - 思考内容与正文明确分离

### 2. 技术实现优先级调整

**必须实现（MVP）**：
- ✅ 查阅 Vercel SDK 官方文档，了解思考链与正文分离的解析方式
- ✅ 支持 OpenAI o1 系列和 DeepSeek R1 的思考链
- ✅ 实时流式输出思考过程
- ✅ 思考块默认折叠
- ✅ 显示思考耗时统计

**可延后实现**：
- ⏳ 其他模型的思考链支持（按需扩展）
- ⏳ 思考链分享功能
- ⏳ 用户设置开关（是否显示思考链）

### 3. 数据层设计简化

**简化点**：
- 历史消息不需要回填思考链数据
- `thinking_chains` 表的 `message_id` 外键允许为空
- 查询时仅加载有思考链的消息

---

## 📊 调整后的实施阶段

### 阶段 1：技术调研（重点：Vercel SDK 文档）⭐

**时间**: 4-6 小时

**任务清单**：
1. **查阅 Vercel AI SDK 官方文档** - 重点关注思考链支持
   - 文档地址：https://sdk.vercel.ai/docs
   - 搜索关键词：`reasoning`, `thinking`, `chain of thought`, `o1`
   - 了解 `streamText` API 如何返回思考链数据
   - 确认思考链与正文的分离方式（是否有独立字段）

2. **研究 OpenAI o1 和 DeepSeek R1 的 API 格式**
   - OpenAI Reasoning API 文档
   - DeepSeek R1 API 文档（如果有）
   - 确认响应格式中的思考链字段名称

3. **分析现有流式处理代码**
   - 阅读 `services/ai/AiClient.ts` 的 `streamText` 实现
   - 确定思考链数据的插入点

**输出**：
- 技术调研报告（`.claude/research/thinking-chain-api.md`）
- 支持的模型清单
- 数据结构示例（JSON Schema）

---

### 阶段 2：数据层改造

**时间**: 4-5 小时

**任务 2.1**: 扩展数据接口
- 文件：`storage/core.ts`
- 添加 `ThinkingChain` 接口：
  ```typescript
  export interface ThinkingChain {
    id: string;
    messageId: string;
    content: string;      // 思考过程内容
    startTime: number;    // 开始时间戳
    endTime: number;      // 结束时间戳
    durationMs: number;   // 耗时（毫秒）
  }
  ```

**任务 2.2**: 创建数据库迁移
- 文件：`storage/sqlite/migrations/0003_thinking_chains.ts`
- SQL 设计：
  ```sql
  CREATE TABLE IF NOT EXISTS thinking_chains (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    content TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
  CREATE INDEX idx_thinking_chains_message ON thinking_chains(message_id);
  ```

**任务 2.3**: 创建 ThinkingChainRepository
- 文件：`storage/repositories/thinking-chains.ts`
- 方法：
  - `addThinkingChain(input)` - 新增思考链
  - `getThinkingChainByMessageId(messageId)` - 查询
  - `updateThinkingChain(id, content)` - 流式更新内容
  - `deleteThinkingChain(id)` - 删除

**任务 2.4**: 扩展 MessageRepository
- 文件：`storage/repositories/messages.ts`
- 新增方法：`getMessageWithThinkingChain(messageId)`
- 支持关联查询思考链数据

---

### 阶段 3：AI 服务集成（核心）⭐

**时间**: 6-8 小时

**任务 3.1**: 修改 AiClient 支持思考链提取

**关键要点**（基于 Vercel SDK 文档）：
- 确认 `streamText` 返回的流对象中是否有 `reasoning` 或 `thinking` 字段
- 如果有独立字段，直接提取
- 如果思考链嵌入在 `content` 中，需要解析特定格式（如 `<thinking>...</thinking>` 标签）

**代码修改**：
- 文件：`services/ai/AiClient.ts`
- 扩展 `StreamOptions` 接口：
  ```typescript
  export interface StreamOptions {
    // ... 现有字段
    onThinkingToken?: (delta: string) => void;
    onThinkingStart?: () => void;
    onThinkingEnd?: () => void;
  }
  ```
- 在 `streamGenerateText` 方法中解析思考链数据

**任务 3.2**: 更新 ChatInput 处理思考链

- 文件：`components/chat/ChatInput.tsx`
- 添加状态管理：
  ```typescript
  const [thinkingContent, setThinkingContent] = useState('');
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
  const thinkingContentRef = useRef('');
  ```
- 实现回调函数：
  ```typescript
  const handleThinkingStart = () => {
    setThinkingStartTime(Date.now());
    thinkingContentRef.current = '';
  };

  const handleThinkingToken = (delta: string) => {
    thinkingContentRef.current += delta;
    // 防抖更新 UI
    debouncedUpdateThinking(thinkingContentRef.current);
  };

  const handleThinkingEnd = async () => {
    const endTime = Date.now();
    const durationMs = endTime - (thinkingStartTime || endTime);

    // 保存到数据库
    await ThinkingChainRepository.addThinkingChain({
      id: generateId(),
      messageId: currentMessageId,
      content: thinkingContentRef.current,
      startTime: thinkingStartTime!,
      endTime,
      durationMs,
    });
  };
  ```

**任务 3.3**: 防抖优化
- 使用 `lodash.debounce` 或自定义防抖函数
- 每 100ms 更新一次 UI，避免过度渲染

---

### 阶段 4：UI 组件开发（按截图复刻）⭐

**时间**: 8-11 小时

**任务 4.1**: 创建 ThinkingBlock 组件

- 文件：`components/chat/ThinkingBlock.tsx`
- 组件接口：
  ```typescript
  interface ThinkingBlockProps {
    content: string;        // 思考内容
    durationMs: number;     // 耗时（毫秒）
    isExpanded?: boolean;   // 是否展开（默认 false）
    onToggle?: () => void;  // 切换回调
  }
  ```

**UI 设计要素**（参考截图）：
- 折叠状态：
  - 💡 图标 + "已深度思考（用时 2.9 秒）" + ▼ 箭头
  - 背景色：浅灰色（浅色模式），深灰色（深色模式）
  - 圆角：8px
  - 内边距：12px
- 展开状态：
  - 标题行：💡 + "已深度思考（用时 2.9 秒）" + ▲ 箭头
  - 思考内容区域：完整的 Markdown 渲染
  - 边框：1px 实线
  - 与正文之间间距：12px

**代码示例**：
```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MixedRenderer } from './MixedRenderer';

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  durationMs,
  isExpanded: initialExpanded = false,
  onToggle,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  const formatDuration = (ms: number) => {
    return (ms / 1000).toFixed(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: withTiming(isExpanded ? 'auto' : 0),
    opacity: withTiming(isExpanded ? 1 : 0),
  }));

  return (
    <View style={{
      backgroundColor: theme.dark ? '#2a2a2a' : '#f5f5f5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    }}>
      <TouchableOpacity onPress={handleToggle} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>💡</Text>
        <Text style={{ flex: 1, fontSize: 14, color: theme.colors.onSurface }}>
          已深度思考（用时 {formatDuration(durationMs)} 秒）
        </Text>
        <Text style={{ fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View style={[{ marginTop: 12 }, animatedStyle]}>
          <MixedRenderer content={content} />
        </Animated.View>
      )}
    </View>
  );
};
```

**任务 4.2**: 集成到 MessageBubble

- 文件：`components/chat/MessageBubble.tsx`
- 在消息气泡中添加思考块（仅 AI 消息）
- 条件渲染：
  ```typescript
  {message.role === 'assistant' && thinkingChain && (
    <ThinkingBlock
      content={thinkingChain.content}
      durationMs={thinkingChain.durationMs}
    />
  )}
  <MixedRenderer content={message.content} />
  ```

**任务 4.3**: 主题适配
- 使用 `useTheme()` 获取当前主题
- 深色模式调整背景色和边框色
- 确保文字对比度符合无障碍标准

---

### 阶段 5：集成测试

**时间**: 7-9 小时

**测试用例**：
1. **流式思考链测试**
   - 使用 OpenAI o1-mini 模型发送消息
   - 验证思考过程是否实时显示
   - 检查耗时统计是否准确

2. **展开/折叠交互测试**
   - 点击思考块，验证动画流畅度
   - 检查展开后内容是否完整显示

3. **数据持久化测试**
   - 发送消息后，刷新应用
   - 验证思考链数据是否正确加载

4. **跨平台测试**
   - iOS 模拟器测试
   - Android 模拟器测试
   - Web 浏览器测试

5. **边界情况测试**
   - 网络中断时的处理
   - 超长思考链（>2000 字）的渲染
   - 不支持思考链的模型（应正常显示回答）

---

### 阶段 6：优化与文档

**时间**: 6-8 小时

**任务 6.1**: 性能优化
- 使用 `React.memo` 包裹 ThinkingBlock
- 防抖策略优化（已在阶段 3 实现）
- 长内容虚拟化渲染（可选）

**任务 6.2**: 编写文档
- 开发者文档：`docs/THINKING_CHAIN.md`
  - 架构设计说明
  - API 接口文档
  - 数据库表结构
- 用户指南：`docs/USER_GUIDE_THINKING_CHAIN.md`
  - 如何使用思考链功能
  - 支持的模型列表
  - 常见问题

**任务 6.3**: 更新项目文档
- 更新 `CLAUDE.md` 的模块索引
- 更新 `components/chat/CLAUDE.md`
- 更新 `storage/CLAUDE.md`
- 添加变更日志条目

---

## 📝 关键技术要点总结

### 1. Vercel SDK 思考链解析（待文档确认）

**可能的实现方式**：

**方案 A**：SDK 原生支持
```typescript
const result = await streamText({
  model: openai('o1-mini'),
  prompt: 'Explain quantum computing',
});

for await (const chunk of result.textStream) {
  if (chunk.type === 'thinking') {
    onThinkingToken(chunk.content);
  } else if (chunk.type === 'text') {
    onToken(chunk.content);
  }
}
```

**方案 B**：解析特定格式
```typescript
// 思考链和正文通过特定标记分隔
const fullResponse = `
<thinking>
Let me break down quantum computing...
</thinking>

Quantum computing is...
`;

// 需要手动解析
const thinkingMatch = fullResponse.match(/<thinking>(.*?)<\/thinking>/s);
const thinking = thinkingMatch ? thinkingMatch[1] : '';
const mainContent = fullResponse.replace(/<thinking>.*?<\/thinking>/s, '').trim();
```

**行动**：查阅文档后确定具体方案！

### 2. 流式性能优化

- 使用 `useRef` 缓存内容，避免频繁状态更新
- 防抖更新 UI（100ms 间隔）
- 思考完成后一次性保存到数据库

### 3. 数据库设计原则

- 思考链数据与消息数据分离（独立表）
- 外键级联删除（删除消息时自动删除思考链）
- 字段允许为空（兼容旧数据和不支持思考链的模型）

---

## 🎯 MVP 功能清单（最小可行产品）

**必须实现**：
- [x] 查阅 Vercel SDK 文档，确定思考链解析方式
- [ ] 支持 OpenAI o1 系列的思考链
- [ ] 支持 DeepSeek R1 的思考链（如果 API 可用）
- [ ] 思考块 UI 组件（按截图复刻）
- [ ] 实时流式显示思考过程
- [ ] 思考耗时统计
- [ ] 思考块默认折叠
- [ ] 数据库持久化
- [ ] 历史消息兼容（无思考链正常显示）

**可延后**：
- [ ] 其他模型的思考链支持
- [ ] 用户设置开关
- [ ] 思考链分享功能
- [ ] 思考链搜索

---

## 📅 实施时间线

| 天数 | 阶段 | 主要任务 | 交付物 |
|------|------|---------|--------|
| Day 1 | 技术调研 | 查阅文档，确定方案 | 调研报告 + 数据结构 |
| Day 2 | 数据层改造 | 数据库 + Repository | 迁移脚本 + 数据接口 |
| Day 3 | AI 服务集成 | AiClient + ChatInput | 思考链提取逻辑 |
| Day 4 | UI 组件开发 | ThinkingBlock + 集成 | 可用的思考块组件 |
| Day 5 | 集成测试 | 端到端测试 | 测试报告 + Bug 修复 |
| Day 6 | 优化文档 | 性能优化 + 文档 | 完整功能 + 文档 |

---

## ✅ 验收标准

**功能验收**：
- [ ] OpenAI o1 模型能正确显示思考链
- [ ] DeepSeek R1 模型能正确显示思考链
- [ ] 思考块可展开/折叠，动画流畅
- [ ] 耗时统计准确（误差 < 100ms）
- [ ] 思考链内容正确保存到数据库
- [ ] 历史消息加载正常（无思考链也不报错）

**性能验收**：
- [ ] 长思考链（>1000 字）渲染流畅（FPS > 50）
- [ ] 数据库查询 < 100ms
- [ ] 流式更新不阻塞 UI

**代码质量验收**：
- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 代码注释完整

---

## 🚀 下一步行动

**立即开始**：
1. 查阅 Vercel AI SDK 官方文档（重点：思考链支持）
2. 查阅 OpenAI o1 API 文档
3. 查阅 DeepSeek R1 API 文档（如果有）
4. 编写技术调研报告
5. 确定数据解析方案

**等待确认**：
- 用户是否有补充需求？
- 是否现在开始实施？

---

**文档版本**: v1.1
**创建日期**: 2025-11-08
**状态**: ✅ 已确认，准备实施
**下一阶段**: 技术调研（阶段 1）
