# 思考链 API 技术调研报告

**调研日期**: 2025-11-08
**调研人员**: AI Assistant
**项目**: AetherLink_z 思考链功能
**AI SDK 版本**: v5.0.86

---

## 📋 调研概要

本报告总结了 Vercel AI SDK 对思考链(Chain of Thought/Reasoning)功能的支持情况,包括支持的模型、API 使用方式、数据结构设计等关键信息。

---

## ✅ 核心发现

### 1. Vercel AI SDK 原生支持思考链

**支持版本**: AI SDK 4.2+ (当前项目使用 v5.0.86 ✅)

**关键特性**:
- ✅ 支持多个提供商的思考链模型
- ✅ 提供 `reasoning` 属性访问思考过程
- ✅ 支持流式访问思考链内容
- ✅ 统计 reasoning tokens 使用量

---

## 🤖 支持的模型列表

根据官方文档和 GitHub 示例,以下模型原生支持思考链:

### OpenAI 系列
- ✅ **o1** - 完整的推理模型
- ✅ **o1-mini** - 轻量级推理模型
- ✅ **o1-preview** - 预览版推理模型
- ✅ **o3-mini** - 最新推理模型 (2025)
- ✅ **o4** 系列 (如果发布)

**配置示例**:
```typescript
providerOptions: {
  openai: {
    reasoningSummary: "detailed" // 获取详细的推理过程
  }
}
```

### Anthropic 系列
- ✅ **Claude 3.7 Sonnet** - 支持思考模式

**配置示例**:
```typescript
providerOptions: {
  anthropic: {
    thinking: {
      type: 'enabled',
      budgetTokens: 12000 // 分配给思考的 token 数量
    }
  }
}
```

### Google 系列
- ✅ **Gemini 2.0 Flash Thinking Exp** - 实验性思考模型
- ✅ **Gemini 2.5** 系列 (部分支持)

### DeepSeek 系列
- ✅ **DeepSeek R1** - 推理模型
- ✅ **DeepSeek R1 系列** (所有变体)

**官方指南**: https://sdk.vercel.ai/docs/guides/r1

---

## 🔧 API 使用方式

### 方式 1: 使用 `fullStream` 访问 Reasoning 部分 (推荐)

这是官方推荐的方式,可以实时流式访问思考链内容。

**代码示例** (基于官方示例重构):

```typescript
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: createAnthropic({ apiKey })(
    'claude-3-7-sonnet-20250219',
  ),
  prompt: 'Explain quantum computing',
  providerOptions: {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: 12000,
      },
    },
  },
});

// 遍历 fullStream 获取所有部分
for await (const part of result.fullStream) {
  if (part.type === 'reasoning') {
    // 思考链内容
    console.log('Reasoning:', part.textDelta);
    onThinkingToken(part.textDelta);
  } else if (part.type === 'text-delta') {
    // 正文内容
    console.log('Text:', part.textDelta);
    onToken(part.textDelta);
  }
}
```

**关键点**:
- `fullStream` 返回的是一个异步迭代器
- 每个 `part` 都有 `type` 字段区分内容类型
- `part.type === 'reasoning'` 表示思考链内容
- `part.type === 'text-delta'` 表示正文内容
- `part.textDelta` 是增量文本 (流式输出)

### 方式 2: 使用 Promise 访问完整 Reasoning (备选)

```typescript
const result = await streamText({
  model: openai('o1-mini'),
  prompt: 'Solve this problem...',
});

// 等待流式完成后获取完整的 reasoning
const reasoningText = await result.reasoning;
const reasoningDetails = await result.reasoningDetails;

console.log('Reasoning:', reasoningText);
console.log('Details:', reasoningDetails);
```

**注意**: 这种方式需要等待流式完成,不适合实时显示。

---

## 📊 数据结构设计

### StreamText 返回的 Part 类型

根据官方文档和示例,`fullStream` 中的 `part` 对象结构如下:

```typescript
// 思考链部分
interface ReasoningPart {
  type: 'reasoning';
  textDelta: string;  // 增量思考内容
}

// 正文部分
interface TextDeltaPart {
  type: 'text-delta';
  textDelta: string;  // 增量正文内容
}

// 其他部分类型
interface OtherParts {
  type: 'finish' | 'error' | 'step-finish' | ...;
  // ... 其他字段
}
```

### 本地数据库设计

基于 API 特性,我们的数据库表设计:

```typescript
export interface ThinkingChain {
  id: string;              // 主键
  messageId: string;       // 关联的消息 ID
  content: string;         // 完整的思考过程内容
  startTime: number;       // 开始时间戳 (毫秒)
  endTime: number;         // 结束时间戳 (毫秒)
  durationMs: number;      // 耗时 (毫秒)
  tokenCount?: number;     // 思考链使用的 token 数量 (可选)
}
```

---

## 🚀 实现策略

### 阶段 1: 修改 AiClient 支持 `fullStream`

**当前代码** (services/ai/AiClient.ts:67-78):
```typescript
const { textStream } = streamText({
  model: factory()(opts.model),
  messages: opts.messages,
  abortSignal: opts.abortSignal,
  temperature: opts.temperature,
  maxOutputTokens: opts.maxTokens,
});

for await (const part of textStream) opts.onToken?.(part);
```

**修改后**:
```typescript
const result = streamText({
  model: factory()(opts.model),
  messages: opts.messages,
  abortSignal: opts.abortSignal,
  temperature: opts.temperature,
  maxOutputTokens: opts.maxTokens,
  // 根据模型添加 providerOptions
  ...getProviderOptions(opts.provider, opts.model),
});

// 使用 fullStream 替代 textStream
for await (const part of result.fullStream) {
  if (part.type === 'reasoning') {
    opts.onThinkingToken?.(part.textDelta);
  } else if (part.type === 'text-delta') {
    opts.onToken?.(part.textDelta);
  } else if (part.type === 'finish') {
    opts.onDone?.();
  } else if (part.type === 'error') {
    opts.onError?.(part.error);
  }
}
```

### 阶段 2: 扩展 StreamOptions 接口

```typescript
export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: CoreMessage[];
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;

  // 原有回调
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;

  // 新增思考链回调
  onThinkingToken?: (delta: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
}
```

### 阶段 3: 模型检测和 ProviderOptions 配置

```typescript
function getProviderOptions(provider: Provider, model: string) {
  // OpenAI o1/o3 系列
  if (provider === 'openai' && /^o[134]/.test(model)) {
    return {
      providerOptions: {
        openai: {
          reasoningSummary: 'detailed',
        },
      },
    };
  }

  // Anthropic Claude 3.7+
  if (provider === 'anthropic' && model.includes('3.7')) {
    return {
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 12000,
          },
        },
      },
    };
  }

  // DeepSeek R1
  if (provider === 'deepseek' && /r1/i.test(model)) {
    return {
      // DeepSeek R1 可能不需要特殊配置
    };
  }

  // Google Gemini Thinking
  if (provider === 'google' && model.includes('thinking')) {
    return {
      // Google 可能不需要特殊配置
    };
  }

  return {};
}
```

---

## ⚠️ 已知问题和注意事项

### 1. Claude 3.7 的 Reasoning 可能返回 undefined

**问题**: GitHub Issue #5087 报告,使用 `streamText` 和 Claude 3.7 时,`reasoning` promise 可能始终为 `undefined`。

**解决方案**: 使用 `fullStream` 遍历,而不是依赖 `result.reasoning` promise。

### 2. OpenAI Reasoning Models 可能返回空的 Reasoning Text

**问题**: GitHub Issue #8048 报告,虽然 reasoning tokens 被正确统计,但 `reasoningText` 可能为空。

**解决方案**: 确保设置 `providerOptions.openai.reasoningSummary: "detailed"`。

### 3. 不同提供商的 Reasoning 格式可能不一致

**问题**: Anthropic 需要显式启用 `thinking`,OpenAI 自动包含,Google 使用不同的实现。

**解决方案**: 通过 `getProviderOptions` 函数统一配置,屏蔽差异。

### 4. Token 统计可能包含 Reasoning Tokens

**问题**: `usage.totalTokens` 可能包含 reasoning tokens,导致与 `inputTokens + outputTokens` 不一致。

**解决方案**: 单独跟踪 reasoning tokens,如果提供商支持的话。

---

## 📈 性能考虑

### 1. 流式更新频率

思考链内容可能很长,需要防抖优化:

```typescript
const thinkingContentRef = useRef('');
const debouncedUpdate = useMemo(
  () => debounce((content: string) => setThinkingContent(content), 100),
  []
);

const onThinkingToken = (delta: string) => {
  thinkingContentRef.current += delta;
  debouncedUpdate(thinkingContentRef.current);
};
```

### 2. 数据库写入策略

思考链完成后才写入数据库,避免频繁 I/O:

```typescript
const onThinkingEnd = async () => {
  const endTime = Date.now();
  await ThinkingChainRepository.addThinkingChain({
    id: generateId(),
    messageId: currentMessageId,
    content: thinkingContentRef.current,
    startTime: thinkingStartTime,
    endTime,
    durationMs: endTime - thinkingStartTime,
  });
};
```

---

## 🎯 MVP 实现清单

基于调研结果,MVP 需要实现:

- [x] ✅ 确认 AI SDK v5.0.86 支持 reasoning
- [ ] 修改 AiClient 使用 `fullStream` 替代 `textStream`
- [ ] 扩展 `StreamOptions` 接口,添加思考链回调
- [ ] 实现 `getProviderOptions` 函数配置不同模型
- [ ] 在 `fullStream` 循环中区分 `reasoning` 和 `text-delta`
- [ ] 支持 OpenAI o1 系列
- [ ] 支持 DeepSeek R1
- [ ] 支持 Anthropic Claude 3.7 (可选)
- [ ] 支持 Google Gemini Thinking (可选)

---

## 📚 参考资料

### 官方文档
- Vercel AI SDK 主站: https://sdk.vercel.ai/ (或 https://ai-sdk.dev/)
- OpenAI o1 指南: https://sdk.vercel.ai/docs/guides/o1
- DeepSeek R1 指南: https://sdk.vercel.ai/docs/guides/r1
- streamText API 参考: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

### GitHub 示例代码
- Anthropic Reasoning 示例: `examples/ai-core/src/stream-text/anthropic-reasoning.ts`
- Google Reasoning 示例: `examples/ai-core/src/stream-text/google-reasoning-fullstream.ts`
- Reasoning Steps Template: https://vercel.com/templates/next.js/reasoning-steps-ai-sdk

### GitHub Issues (已知问题)
- #5087: Claude 3.7 reasoning undefined
- #4809: 无法获取 reasoning tokens
- #8048: OpenAI reasoning models 返回空 reasoning text
- #4630: Google Gemini thinking 不显示 reasoning

---

## 🚀 下一步行动

1. ✅ 完成技术调研
2. 开始实现阶段 2: 数据层改造
3. 实现阶段 3: AI 服务集成 (核心)
4. 创建 UI 组件展示思考链

---

**报告版本**: v1.0
**状态**: ✅ 调研完成
**下一阶段**: 数据层改造
