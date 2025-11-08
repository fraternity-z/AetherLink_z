# 思考链(Thinking Chain)功能文档

**版本**: v1.0
**创建日期**: 2025-11-08
**状态**: ✅ 已实现

---

## 📋 功能概述

思考链功能用于显示 AI 推理模型(如 OpenAI o1/o3、DeepSeek R1 等)的思考过程,将思考内容与最终回答分离展示,帮助用户理解 AI 的推理逻辑。

### 核心特性

- ✅ 支持多个推理模型提供商
- ✅ 实时流式显示思考过程
- ✅ 思考链与正文内容分离
- ✅ 可折叠/展开的思考块 UI
- ✅ 显示思考耗时统计
- ✅ 数据库持久化存储
- ✅ 自适应深色/浅色主题

---

## 🤖 支持的模型

### OpenAI 系列
- **o1** - 完整推理模型
- **o1-mini** - 轻量级推理模型
- **o1-preview** - 预览版推理模型
- **o3-mini** - 最新推理模型

### DeepSeek 系列
- **DeepSeek R1** 及其所有变体

### Anthropic 系列
- **Claude 3.7 Sonnet** 及以上版本

### Google 系列
- **Gemini 2.0 Flash Thinking Exp**
- **Gemini 2.5** 系列(部分支持)

---

## 🏗️ 架构设计

### 数据流程

```
用户发送消息
    ↓
ChatInput 调用 streamCompletion
    ↓
AiClient 检测模型是否支持思考链
    ↓
使用 fullStream 分离 reasoning 和 text
    ↓
onThinkingToken 回调实时接收思考内容
    ↓
onThinkingEnd 保存到数据库
    ↓
MessageList 加载思考链数据
    ↓
MessageBubble 显示 ThinkingBlock 组件
```

### 数据结构

#### ThinkingChain 接口

```typescript
export interface ThinkingChain {
  id: string;              // 主键
  messageId: string;       // 关联的消息 ID
  content: string;         // 完整的思考过程内容
  startTime: number;       // 开始时间戳 (毫秒)
  endTime: number;         // 结束时间戳 (毫秒)
  durationMs: number;      // 耗时 (毫秒)
  tokenCount?: number | null; // 思考链使用的 token 数量 (可选)
  extra?: any;             // 扩展字段
}
```

#### 数据库表结构

```sql
CREATE TABLE IF NOT EXISTS thinking_chains (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  token_count INTEGER,
  extra TEXT,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_thinking_chains_message ON thinking_chains(message_id);
```

---

## 🔧 技术实现

### 1. AiClient 集成

**文件**: `services/ai/AiClient.ts`

**关键函数**:

- `supportsReasoning(provider, model)` - 检测模型是否支持思考链
- `getProviderOptions(provider, model)` - 获取推理模型的配置

**流式处理**:

```typescript
for await (const part of result.fullStream) {
  if (part.type === 'reasoning') {
    // 思考链内容
    opts.onThinkingToken?.(part.textDelta);
  } else if (part.type === 'text-delta') {
    // 正文内容
    opts.onToken?.(part.textDelta);
  }
}
```

### 2. ChatInput 处理

**文件**: `components/chat/ChatInput.tsx`

**思考链回调**:

```typescript
onThinkingStart: () => {
  thinkingStartTime = Date.now();
  thinkingContent = '';
},
onThinkingToken: (delta) => {
  thinkingContent += delta;
},
onThinkingEnd: async () => {
  await ThinkingChainRepository.addThinkingChain({
    messageId: assistant.id,
    content: thinkingContent,
    startTime: thinkingStartTime,
    endTime: Date.now(),
    durationMs: Date.now() - thinkingStartTime,
  });
},
```

### 3. ThinkingBlock UI 组件

**文件**: `components/chat/ThinkingBlock.tsx`

**特性**:

- 默认折叠状态
- 点击标题展开/折叠
- 使用 React Native Reanimated 实现流畅动画
- 使用 MixedRenderer 渲染 Markdown 内容
- 显示耗时统计(秒,保留一位小数)

### 4. MessageBubble 集成

**文件**: `components/chat/MessageBubble.tsx`

**集成方式**:

```typescript
{!isUser && thinkingChain && (
  <ThinkingBlock
    content={thinkingChain.content}
    durationMs={thinkingChain.durationMs}
  />
)}
```

### 5. MessageList 加载

**文件**: `components/chat/MessageList.tsx`

**批量加载**:

```typescript
const map = await ThinkingChainRepository.getThinkingChainsByMessageIds(ids);
setThinkingChainsMap(objMap);
```

---

## 📊 性能优化

### 1. 流式更新优化

- 思考链内容在内存中累积,不频繁写数据库
- 仅在 `onThinkingEnd` 时一次性保存到数据库

### 2. 数据库查询优化

- 批量查询思考链数据 (`getThinkingChainsByMessageIds`)
- 创建索引优化查询性能 (`idx_thinking_chains_message`)

### 3. UI 渲染优化

- 使用 `React.memo` 包裹 MessageBubble 和 ThinkingBlock
- 默认折叠状态减少初始渲染负担
- 使用 React Native Reanimated 的原生动画

---

## 🧪 测试要点

### 功能测试

- [ ] OpenAI o1-mini 模型能正确显示思考链
- [ ] DeepSeek R1 模型能正确显示思考链
- [ ] 思考块可展开/折叠,动画流畅
- [ ] 耗时统计准确(误差 < 100ms)
- [ ] 思考链内容正确保存到数据库
- [ ] 历史消息加载正常(无思考链也不报错)

### 跨平台测试

- [ ] iOS 模拟器测试
- [ ] Android 模拟器测试
- [ ] Web 浏览器测试

### 边界情况测试

- [ ] 网络中断时的处理
- [ ] 超长思考链(>2000 字)的渲染
- [ ] 不支持思考链的模型(应正常显示回答)
- [ ] 数据库迁移升级(新旧数据兼容)

---

## 🐛 故障排除

### 问题 1: 思考链不显示

**可能原因**:
- 模型不支持思考链
- 数据库迁移未执行
- 思考链内容为空

**解决方案**:
1. 检查模型是否在支持列表中
2. 重启应用,确保数据库迁移执行
3. 查看控制台日志,检查 `[ChatInput] 思考链已保存` 日志

### 问题 2: 思考链内容显示为空

**可能原因**:
- API 未返回 reasoning 数据
- providerOptions 配置错误

**解决方案**:
1. 检查 AiClient 中的 `getProviderOptions` 配置
2. 确认 API 密钥有效
3. 查看网络请求,确认响应中包�� reasoning 字段

### 问题 3: 思考链动画卡顿

**可能原因**:
- 思考链内容过长
- React Native Reanimated 未正确安装

**解决方案**:
1. 检查 Reanimated 安装是否完整
2. 考虑为超长内容添加虚拟化渲染

---

## 📝 后续优化方向

### 功能扩展

- [ ] 思考链分享功能
- [ ] 思考链搜索功能
- [ ] 思考链分析统计
- [ ] 自定义思考块样式

### 性能优化

- [ ] 虚拟化渲染超长思考链
- [ ] 思考链内容压缩存储
- [ ] 增量加载思考链内容

### 用户体验

- [ ] 用户设置开关(是否显示思考链)
- [ ] 思考链高亮关键步骤
- [ ] 思考过程动画效果

---

## 📚 相关文档

- [技术调研报告](./.claude/research/thinking-chain-api.md)
- [实施规划](../.claude/plan/thinking-chain-feature-1.md)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [OpenAI Reasoning 文档](https://platform.openai.com/docs/guides/reasoning)

---

**最后更新**: 2025-11-08
**维护者**: AetherLink_z Development Team
