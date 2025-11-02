# Expo 移动端集成 Vercel AI SDK（OpenAI / Claude / Gemini）

> 目标：在 iOS/Android（无 Web、无服务端）环境下，使用 Vercel AI SDK 以“纯客户端直连 + expo/fetch 流式”完成多厂商（OpenAI、Anthropic Claude、Google Gemini）模型接入；并与本项目已实现的本地存储（SQLite/FileSystem）无缝协作。

- 平台范围：仅移动端（Expo 52+，项目当前 54 OK）。
- 安全策略：密钥存于 SecureStore（Web 不在范围内，因此不落盘问题可忽略）。
- 设计原则：KISS（直连 + 最少依赖）、YAGNI（暂不做服务端代理/RAG/加密）、SOLID/DRY（服务层解耦，复用已有仓储）。

## 1. 安装依赖

```bash
npm i ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

说明：
- `ai` 为 Vercel AI SDK Core。
- 选择性安装更多 Provider 时，保持相同用法。

## 2. 在原生端注入 expo/fetch（启用稳定流式）

Expo 原生环境中，使用 `expo/fetch` 作为全局 fetch 更稳定地支持流式。

文件：`components/providers/DataProvider.tsx`

```ts
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { initMigrations } from '@/storage/sqlite/db';

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 仅原生端覆盖全局 fetch
    if (Platform.OS !== 'web') {
      // @ts-expect-error RN 环境下类型不完全匹配
      globalThis.fetch = expoFetch;
    }

    initMigrations().catch((e) => console.error('DB init failed', e));
  }, []);

  return <>{children}</>;
}
```

## 3. 密钥管理（SecureStore）

- 通过现有的 `SecretsRepository` 进行读写：
  - 建议 key 约定：
    - `openai_api_key`
    - `anthropic_api_key`
    - `google_api_key`
- 设置页可提供输入框，将值写入 `SecretsRepository().set(key, value)`。

## 4. Provider 初始化与统一模型选择

新建：`services/ai/AiClient.ts`

```ts
// services/ai/AiClient.ts
import { streamText, convertToCoreMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Message as UIMessage } from 'ai';
import { SecretsRepository } from '@/storage/repositories/secrets';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface StreamOptions {
  provider: Provider;
  model: string; // 例如：gpt-4o-mini / claude-3-5-haiku-latest / gemini-1.5-flash
  messages: UIMessage[]; // 或自行映射的 Core messages，见第 5 节
  abortSignal?: AbortSignal;
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
}

async function getApiKey(provider: Provider) {
  const secrets = SecretsRepository();
  if (provider === 'openai') return (await secrets.get('openai_api_key')) ?? '';
  if (provider === 'anthropic') return (await secrets.get('anthropic_api_key')) ?? '';
  return (await secrets.get('google_api_key')) ?? '';
}

export async function streamCompletion(opts: StreamOptions) {
  const apiKey = await getApiKey(opts.provider);
  if (!apiKey) throw new Error('Missing API key for ' + opts.provider);

  // 初始化 Provider（复用全局 fetch：DataProvider 中已注入 expo/fetch）
  const openai = () => createOpenAI({ apiKey });
  const anthropic = () => createAnthropic({ apiKey });
  const google = () => createGoogleGenerativeAI({ apiKey });

  const modelFactory =
    opts.provider === 'openai'
      ? openai
      : opts.provider === 'anthropic'
      ? anthropic
      : google;

  const { textStream } = streamText({
    model: modelFactory()(opts.model),
    messages: convertToCoreMessages(opts.messages),
    abortSignal: opts.abortSignal,
  });

  try {
    for await (const part of textStream) {
      opts.onToken?.(part);
    }
    opts.onDone?.();
  } catch (e) {
    opts.onError?.(e);
    throw e;
  }
}
```

- 说明：此处直接使用 `streamText` + Provider 的 `create*` 工厂；`convertToCoreMessages` 能接受 `@ai-sdk/react` 的 UI 消息结构，如未使用 UI 包，可自行构造 Core messages（见下）。

## 5. 将本地消息映射为 AI SDK Core Messages

若不使用 `@ai-sdk/react/useChat`，可从本地数据库（`messages` 表）取历史，并映射为 Core messages。示例：

```ts
// services/ai/message-mapping.ts
import type { Message as CoreMessage } from 'ai';
import type { Message } from '@/storage/core';

export function mapToCoreMessages(history: Message[]): CoreMessage[] {
  return history.map((m) => ({
    role: m.role, // 'user' | 'assistant' | 'system'
    content: m.text ? [{ type: 'text', text: m.text }] : [],
  }));
}
```

多模态图片（从本地附件读取为 base64 Data URL）：

```ts
import { File } from 'expo-file-system';

export async function imagePartFromLocalUri(uri: string, mime = 'image/png') {
  const file = new File(uri);
  const b64 = file.base64();
  return { type: 'image' as const, image: `data:${mime};base64,${b64}` };
}
```

将图片部件追加到某条 user 消息的 content 数组即可。

## 6. 与本地存储的协作流程（发送 -> 流式 -> 落库）

- 发送前：
  - 若无会话：`createConversation()`
  - 写入一条 user 消息（status='sent'）
  - 写入一条 assistant 占位消息（status='pending'，text 为空）
- 调用 `streamCompletion`：
  - onToken：累积到该占位消息的文本；节流 `UPDATE messages SET text=... WHERE id=?`
  - onDone：`updateMessageStatus(id,'sent')`
  - onError：`updateMessageStatus(id,'failed')`
- 展示：`useMessages(conversationId)` 自动刷新渲染

## 7. 在 ChatInput 中接入（伪代码）

```ts
import { streamCompletion } from '@/services/ai/AiClient';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';

async function sendText(conversationIdRef: { current: string | null }, text: string) {
  let cid = conversationIdRef.current;
  if (!cid) {
    const conv = await ChatRepository.createConversation();
    cid = conversationIdRef.current = conv.id;
  }
  await MessageRepository.addMessage({ conversationId: cid, role: 'user', text, status: 'sent' });
  const assistant = await MessageRepository.addMessage({ conversationId: cid, role: 'assistant', text: '', status: 'pending' });

  let acc = '';
  await streamCompletion({
    provider: 'openai', // 或来自设置页：'anthropic' | 'google'
    model: 'gpt-4o-mini',
    messages: [
      { id: 'sys', role: 'system', content: [{ type: 'text', text: 'You are a helpful assistant.' }] },
      { id: 'u1', role: 'user', content: [{ type: 'text', text }] },
    ],
    onToken: async (d) => {
      acc += d;
      // 可做节流，按需提供 updateText(id, text)
    },
    onDone: async () => {
      // 一次性落库（或提供 updateText 方法逐步写入）
      await MessageRepository.addMessage({ conversationId: cid!, role: 'assistant', text: acc, status: 'sent' });
    },
    onError: async () => {
      await MessageRepository.updateMessageStatus(assistant.id, 'failed');
    },
  });
}
```

> 注：建议为 `MessageRepository` 增加 `updateText(id, text)`，比重新插入更高效。

## 8. Provider/模型选择（设置集成）

- 使用 `SettingsRepository` 存用户选择：
  - `provider: 'openai' | 'anthropic' | 'google'`
  - `model: string`（如 `gpt-4o-mini` / `claude-3-5-haiku-latest` / `gemini-1.5-flash`）
- 读取设置后传入 `streamCompletion`。

常用模型标识示例：
- OpenAI: `gpt-4o-mini`, `o4-mini`
- Anthropic: `claude-3-5-haiku-latest`, `claude-3-5-sonnet-latest`
- Google: `gemini-1.5-flash`, `gemini-1.5-pro`

## 9. 错误处理与取消

- 取消：传入 `AbortController.signal`，在 UI 提供“停止生成”。
- 错误：捕获并将 pending 置为 `failed`，支持重试。
- 性能：合并 token 块，减少 SQLite 写入频次。

## 10. 安全与限制

- 移动端密钥仅保存在 SecureStore；不要硬编码在仓库。
- 附件体积控制：直连模式建议优先图片；大文档走摘要。
- 若未来要上架/多人使用，建议切换“服务端代理模式”。

## 11. 可选：@ai-sdk/react/useChat（无服务端）

- 若想快速搭 UI，可以使用 `useChat`；但纯客户端直连用 Core 更灵活。

---

### Checklist
- [ ] 安装 `ai @ai-sdk/{openai,anthropic,google}`
- [ ] DataProvider 注入 `globalThis.fetch = expo/fetch`
- [ ] 设置页写入密钥（openai/anthropic/google）
- [ ] 新建 `services/ai/AiClient.ts`，实现 `streamCompletion`
- [ ] ChatInput 串流接入；MessageList 使用 `useMessages`

需要我继续根据本文档生成 `services/ai/AiClient.ts` 与 ChatInput 接入代码吗？
