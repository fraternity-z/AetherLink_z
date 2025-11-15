[根目录](../../../CLAUDE.md) > [services](../) > **ai**

# AI 服务模块

## 模块职责

负责集成和管理多个 AI 提供商的服务，提供统一的流式对话接口，支持 OpenAI、Anthropic、Google 等主流 AI 模型。

## 入口与启动

### 主要服务文件
- `AiClient.ts` - AI 客户端核心服务
- `ModelDiscovery.ts` - 模型发现和管理

### 初始化流程
1. 应用启动时初始化数据库迁移
2. 加载用户配置的 AI 提供商设置
3. 通过 ModelDiscovery 获取可用模型列表

## 对外接口

### streamCompletion 函数
```typescript
interface StreamOptions {
  provider: Provider;
  model: string;
  messages: CoreMessage[];
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
}

export async function streamCompletion(opts: StreamOptions)
```

### 支持的提供商
- `openai` - OpenAI GPT 系列
- `anthropic` - Claude 系列
- `google` / `gemini` - Google Gemini
- `deepseek` - DeepSeek 模型
- `volc` - 火山方舟
- `zhipu` - 智谱 AI

## 关键依赖与配置

### 外部依赖
- `ai` - Vercel AI SDK 核心库
- `@ai-sdk/openai` - OpenAI 适配器
- `@ai-sdk/anthropic` - Anthropic 适配器
- `@ai-sdk/google` - Google 适配器

### 内部依赖
- `@/storage/repositories/providers` - 提供商配置管理
- `@/storage/repositories/provider-models` - 模型信息存储

### 配置管理
每个提供商支持以下配置：
- `enabled` - 是否启用
- `baseURL` - 自定义 API 地址
- `apiKey` - API 密钥 (安全存储)

## 数据模型

### Provider 类型定义
```typescript
export type Provider = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu';
export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'google' | 'deepseek' | 'volc' | 'zhipu';
```

### 消息格式
使用 Vercel AI SDK 的 `CoreMessage` 格式：
```typescript
interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: 'text' | 'image'; text?: string; image?: string }>;
}
```

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试覆盖
- **AiClient**: 各提供商流式响应、错误处理、参数传递
- **ModelDiscovery**: 模型列表获取、缓存机制
- **配置管理**: API 密钥读取、自定义地址设置

### 测试要点
- 模拟不同提供商的 API 响应
- 测试网络超时和重试机制
- 验证错误日志和用户提示
- 测试并发请求处理

## 常见问题 (FAQ)

### Q: 如何添加新的 AI 提供商？
A: 在 `AiClient.ts` 中添加新的 provider 类型，实现相应的 API 客户端创建逻辑。

### Q: 如何处理提供商的限流？
A: 在流式响应中捕获限流错误，通过 `onError` 回调通知用户，实现重试机制。

### Q: 如何支持自定义模型参数？
A: 扩展 `StreamOptions` 接口，在 `streamText` 调用中传递相应参数。

### Q: API 密钥如何安全存储？
A: 使用 `expo-secure-store` 通过 `ProvidersRepository` 统一管理密钥。

## 相关文件清单

### 核心服务
- `AiClient.ts` - AI 客户端主服务
- `ModelDiscovery.ts` - 模型发现和管理

### 依赖模块
- `../data/` - 数据处理服务 (备份、清理、统计)
- `../../storage/repositories/providers.ts` - 提供商配置
- `../../storage/repositories/provider-models.ts` - 模型数据

### 配置文件
- `../../storage/sqlite/migrations/0001_init.ts` - 模型数据表结构

## 变更记录 (Changelog)

### 2025-11-03 18:47:44
- 创建 AI 服务模块文档
- 分析提供商集成架构
- 识别核心接口和依赖关系
