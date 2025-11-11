# 项目任务分解规划：MCP (Model Context Protocol) 服务器支持功能

## 已明确的决策

基于技术调研报告和现有项目架构,以下技术决策已经确定:

- ✅ **传输协议**: 采用 SSE (Server-Sent Events) 和 Streamable HTTP,不使用 Stdio(移动端限制)
- ✅ **MCP 客户端实现**: 自行实现基于 JSON-RPC 2.0 的客户端(TypeScript),不依赖官方 SDK
- ✅ **工具集成方案**: 使用 Vercel AI SDK 的 `tools` 机制,将 MCP 工具转换为 AI SDK 工具
- ✅ **数据库扩展**: 新增 `mcp_servers` 和 `mcp_tools` 表,遵循现有迁移模式
- ✅ **连接管理**: 采用连接池 + 心跳检测机制,确保连接稳定性
- ✅ **架构模式**: 遵循现有的 Repository 模式(数据层) + Hooks(逻辑层) + Components(UI 层)
- ✅ **错误处理**: 统一使用 `logger` 工具进行日志记录,提供友好的用户错误提示

## 整体规划概述

### 项目目标

在 AetherLink_z 应用中添加 MCP (Model Context Protocol) 服务器支持功能,允许 AI 在对话过程中调用外部工具(如文件系统、数据库、API 等),增强 AI 的能力边界和实用性。

**核心价值:**
- 🔧 让 AI 可以主动调用外部工具(如搜索引擎、数据库、文件系统等)
- 🔌 支持自定义 MCP 服务器,用户可以添加自己的工具集
- 📱 移动端原生支持(iOS/Android),基于 SSE/HTTP 传输
- 🎯 无缝集成到现有聊天流程,不破坏现有功能

### 技术栈

- **MCP 协议**: JSON-RPC 2.0(自行实现客户端)
- **传输层**: SSE (Server-Sent Events) + Streamable HTTP
- **AI 集成**: Vercel AI SDK v5 (tools 机制)
- **数据库**: Expo SQLite(新增 2 张表)
- **网络请求**: Fetch API(原生支持,无额外依赖)
- **状态管理**: React Hooks + Context
- **日志系统**: 统一使用 `utils/logger.ts`

### 主要阶段

本项目分为四个主要阶段,预计总工作量: **15-20 工作日**

1. **阶段 1: 基础设施建设(5-6 天)**
   - MCP 客户端核心实现
   - 传输层(SSE + HTTP)
   - 数据库扩展和 Repository

2. **阶段 2: AI 集成层(4-5 天)**
   - MCP 工具转换为 AI SDK 工具
   - 流式响应中的工具调用处理
   - 错误处理和重试机制

3. **阶段 3: UI 开发(3-4 天)**
   - 设置页面: MCP 服务器管理
   - 对话界面: 工具调用显示
   - 交互优化和用户体验

4. **阶段 4: 测试与优化(3-5 天)**
   - 集成测试和边界测试
   - 性能优化和内存管理
   - 文档完善和示例编写

---

## 详细任务分解

### 阶段 1: 基础设施建设(5-6 天)

#### 任务 1.1: 数据库扩展 - 创建 MCP 表结构

**目标**: 扩展数据库,支持 MCP 服务器和工具的持久化存储

**输入**:
- 现有数据库架构(`storage/sqlite/db.ts`)
- 现有迁移文件模式(`migrations/0001_init.ts`, `0002_provider_models.ts`, `0003_thinking_chains.ts`)

**输出**:
- `storage/sqlite/migrations/0004_mcp_servers.ts` - 新迁移文件
- 更新 `storage/sqlite/db.ts` - 注册新迁移

**涉及文件**:
- 新建: `storage/sqlite/migrations/0004_mcp_servers.ts`
- 修改: `storage/sqlite/db.ts` (注册 MIGRATION_0004)

**表结构设计**:
```sql
-- mcp_servers 表: 存储 MCP 服务器配置
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  transport_type TEXT NOT NULL, -- 'sse' | 'http'
  enabled INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  icon TEXT,
  auth_type TEXT, -- 'none' | 'bearer' | 'basic'
  auth_config TEXT, -- JSON 存储认证信息
  metadata TEXT, -- JSON 存储额外元数据
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- mcp_tools 表: 缓存 MCP 工具列表
CREATE TABLE IF NOT EXISTS mcp_tools (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  input_schema TEXT NOT NULL, -- JSON Schema
  category TEXT, -- 'file' | 'search' | 'db' | 'api' | 'other'
  synced_at INTEGER NOT NULL,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mcp_servers_enabled ON mcp_servers(enabled);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
```

**验收标准**:
- ✅ 数据库迁移成功执行,表结构正确创建
- ✅ 外键约束和索引正确建立
- ✅ 应用启动时迁移自动运行

**预估工作量**: 0.5 天

---

#### 任务 1.2: 数据访问层 - 实现 MCP Repositories

**目标**: 实现 MCP 服务器和工具的数据访问层,遵循现有 Repository 模式

**输入**:
- 现有 Repository 实现模式(`storage/repositories/providers.ts`)
- 新创建的数据库表结构

**输出**:
- `storage/repositories/mcp-servers.ts` - MCP 服务器数据仓库
- `storage/repositories/mcp-tools.ts` - MCP 工具数据仓库
- 类型定义文件 `storage/core.ts` 中添加 `McpServer` 和 `McpTool` 接口

**涉及文件**:
- 新建: `storage/repositories/mcp-servers.ts`
- 新建: `storage/repositories/mcp-tools.ts`
- 修改: `storage/core.ts` (新增类型定义)

**核心 API 设计**:
```typescript
// storage/core.ts 新增类型
export interface McpServer {
  id: string;
  name: string;
  url: string;
  transportType: 'sse' | 'http';
  enabled: boolean;
  description?: string;
  icon?: string;
  authType: 'none' | 'bearer' | 'basic';
  authConfig?: any; // 根据 authType 动态解析
  metadata?: any;
  createdAt: number;
  updatedAt: number;
}

export interface McpTool {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  inputSchema: any; // JSON Schema
  category?: string;
  syncedAt: number;
}

// McpServersRepository API
export namespace McpServersRepository {
  export async function createServer(data: Omit<McpServer, 'id' | 'createdAt' | 'updatedAt'>): Promise<McpServer>;
  export async function getServer(id: string): Promise<McpServer | null>;
  export async function listServers(filter?: { enabled?: boolean }): Promise<McpServer[]>;
  export async function updateServer(id: string, data: Partial<McpServer>): Promise<void>;
  export async function deleteServer(id: string): Promise<void>;
  export async function toggleEnabled(id: string, enabled: boolean): Promise<void>;
}

// McpToolsRepository API
export namespace McpToolsRepository {
  export async function syncTools(serverId: string, tools: Omit<McpTool, 'id' | 'syncedAt'>[]): Promise<void>;
  export async function getToolsByServer(serverId: string): Promise<McpTool[]>;
  export async function getTool(serverId: string, toolName: string): Promise<McpTool | null>;
  export async function searchTools(query: string): Promise<McpTool[]>;
  export async function deleteToolsByServer(serverId: string): Promise<void>;
}
```

**验收标准**:
- ✅ 所有 CRUD 操作测试通过
- ✅ 外键约束正确处理(级联删除)
- ✅ 类型安全,无 TypeScript 错误
- ✅ 错误处理完善,日志记录清晰

**预估工作量**: 1 天

---

#### 任务 1.3: MCP 客户端核心 - JSON-RPC 2.0 实现

**目标**: 实现 MCP 协议的 JSON-RPC 2.0 通信层,支持请求/响应/通知

**输入**:
- MCP 协议规范(JSON-RPC 2.0)
- 参考实现: Cherry Studio 的 `mcp-client.ts`

**输出**:
- `services/mcp/core/JsonRpcClient.ts` - JSON-RPC 客户端核心
- `services/mcp/core/types.ts` - MCP 协议类型定义

**涉及文件**:
- 新建: `services/mcp/core/JsonRpcClient.ts`
- 新建: `services/mcp/core/types.ts`
- 新建: `services/mcp/core/errors.ts` (MCP 错误类型)

**核心功能**:
```typescript
// JSON-RPC 2.0 消息类型
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

// MCP 客户端核心类
export class JsonRpcClient {
  constructor(transport: McpTransport);

  async request<T>(method: string, params?: any): Promise<T>;
  async notify(method: string, params?: any): Promise<void>;
  onNotification(method: string, handler: (params: any) => void): void;
  dispose(): void;
}
```

**验收标准**:
- ✅ 支持请求/响应模式(带 ID)
- ✅ 支持通知模式(无 ID,不等待响应)
- ✅ 正确处理 JSON-RPC 错误码
- ✅ 超时处理和重试机制
- ✅ 日志记录完整(使用 logger)

**预估工作量**: 1.5 天

---

#### 任务 1.4: 传输层实现 - SSE 和 HTTP

**目标**: 实现 SSE 和 HTTP 两种传输协议,封装底层通信细节

**输入**:
- `JsonRpcClient` 核心类
- 现有网络请求模式(Fetch API)

**输出**:
- `services/mcp/transport/SseTransport.ts` - SSE 传输层
- `services/mcp/transport/HttpTransport.ts` - HTTP 传输层
- `services/mcp/transport/types.ts` - 传输层接口定义

**涉及文件**:
- 新建: `services/mcp/transport/SseTransport.ts`
- 新建: `services/mcp/transport/HttpTransport.ts`
- 新建: `services/mcp/transport/types.ts`

**接口设计**:
```typescript
export interface McpTransport {
  send(message: string): Promise<void>;
  onMessage(handler: (message: string) => void): void;
  onError(handler: (error: Error) => void): void;
  close(): Promise<void>;
  readonly isConnected: boolean;
}

// SSE Transport (Server-Sent Events)
export class SseTransport implements McpTransport {
  constructor(url: string, options?: SseOptions);
  async connect(): Promise<void>;
  // ... 实现 McpTransport 接口
}

// HTTP Transport (请求/响应模式)
export class HttpTransport implements McpTransport {
  constructor(url: string, options?: HttpOptions);
  // ... 实现 McpTransport 接口
}
```

**技术要点**:
- SSE 使用 `EventSource` API(React Native 需要 polyfill,推荐 `eventsource` 库)
- HTTP 使用 Fetch API + 轮询或长轮询
- 支持认证(Bearer Token / Basic Auth)
- 断线重连机制(指数退避算法)
- 心跳检测(每 30 秒发送 ping)

**验收标准**:
- ✅ SSE 连接稳定,自动重连
- ✅ HTTP 传输正常,支持长轮询
- ✅ 认证信息正确携带
- ✅ 心跳检测工作正常
- ✅ 网络错误正确处理和上报

**预估工作量**: 2 天

---

#### 任务 1.5: MCP 客户端管理 - 连接池和生命周期

**目标**: 实现 MCP 客户端管理器,支持多服务器连接、连接池、生命周期管理

**输入**:
- `JsonRpcClient` 核心类
- `McpTransport` 传输层
- `McpServersRepository` 数据仓库

**输出**:
- `services/mcp/McpManager.ts` - MCP 客户端管理器
- `services/mcp/McpClient.ts` - 单个 MCP 服务器客户端封装

**涉及文件**:
- 新建: `services/mcp/McpManager.ts`
- 新建: `services/mcp/McpClient.ts`
- 新建: `services/mcp/index.ts` (统一导出)

**核心 API 设计**:
```typescript
// 单个 MCP 客户端封装
export class McpClient {
  constructor(server: McpServer, transport: McpTransport);

  async initialize(): Promise<void>;
  async listTools(): Promise<McpTool[]>;
  async callTool(name: string, args: any): Promise<any>;
  async ping(): Promise<boolean>;
  dispose(): void;

  readonly serverId: string;
  readonly isConnected: boolean;
}

// MCP 客户端管理器(单例模式)
export class McpManager {
  static getInstance(): McpManager;

  async connectServer(serverId: string): Promise<McpClient>;
  async disconnectServer(serverId: string): Promise<void>;
  async refreshTools(serverId: string): Promise<void>;
  async getAllTools(): Promise<McpTool[]>;
  getClient(serverId: string): McpClient | undefined;
  disposeAll(): void;

  onToolsChanged(handler: () => void): void;
}
```

**技术要点**:
- 连接池管理(最多同时连接 5 个服务器)
- 懒加载连接(仅在需要时建立连接)
- 自动重连机制(断线后 3 次重试)
- 工具列表缓存和同步策略
- 生命周期钩子(onConnected, onDisconnected, onError)

**验收标准**:
- ✅ 多服务器并发连接正常
- ✅ 连接池限制生效
- ✅ 断线重连机制工作
- ✅ 工具列表正确缓存和更新
- ✅ 内存泄漏检测通过

**预估工作量**: 1 天

---

### 阶段 2: AI 集成层(4-5 天)

#### 任务 2.1: MCP 工具转换器 - 适配 Vercel AI SDK

**目标**: 将 MCP 工具转换为 Vercel AI SDK 的 `tools` 格式,实现无缝集成

**输入**:
- MCP 工具列表(`McpTool[]`)
- Vercel AI SDK `streamText` 的 `tools` 参数规范

**输出**:
- `services/mcp/adapters/McpToolAdapter.ts` - MCP 工具适配器
- `services/mcp/adapters/types.ts` - 适配器类型定义

**涉及文件**:
- 新建: `services/mcp/adapters/McpToolAdapter.ts`
- 新建: `services/mcp/adapters/types.ts`

**核心功能**:
```typescript
// Vercel AI SDK 工具格式
interface AiSdkTool {
  description?: string;
  parameters: z.ZodTypeAny; // Zod schema
  execute: (args: any) => Promise<any>;
}

export class McpToolAdapter {
  /**
   * 将 MCP 工具转换为 AI SDK 工具
   */
  static convertToAiTool(mcpTool: McpTool, mcpClient: McpClient): AiSdkTool {
    return {
      description: mcpTool.description,
      parameters: this.jsonSchemaToZod(mcpTool.inputSchema),
      execute: async (args: any) => {
        const result = await mcpClient.callTool(mcpTool.name, args);
        return result;
      }
    };
  }

  /**
   * JSON Schema 转 Zod Schema
   */
  static jsonSchemaToZod(jsonSchema: any): z.ZodTypeAny {
    // 实现 JSON Schema -> Zod Schema 转换逻辑
    // 支持基本类型: string, number, boolean, object, array
  }

  /**
   * 批量转换所有可用工具
   */
  static async convertAllTools(): Promise<Record<string, AiSdkTool>> {
    const mcpManager = McpManager.getInstance();
    const allTools = await mcpManager.getAllTools();

    const tools: Record<string, AiSdkTool> = {};
    for (const tool of allTools) {
      const client = mcpManager.getClient(tool.serverId);
      if (client) {
        tools[`${tool.serverId}__${tool.name}`] = this.convertToAiTool(tool, client);
      }
    }
    return tools;
  }
}
```

**技术要点**:
- JSON Schema 到 Zod Schema 的准确转换
- 支持嵌套对象和数组
- 处理可选字段和默认值
- 工具执行错误处理和重试

**验收标准**:
- ✅ JSON Schema 转换准确无误
- ✅ 工具执行成功返回结果
- ✅ 错误信息正确上报给 AI
- ✅ 类型安全,无 TypeScript 错误

**预估工作量**: 1.5 天

---

#### 任务 2.2: 增强 AiClient - 集成 MCP 工具调用

**目标**: 在现有 `AiClient.ts` 中集成 MCP 工具,支持 AI 流式响应中的工具调用

**输入**:
- 现有 `services/ai/AiClient.ts`
- `McpToolAdapter` 工具适配器
- Vercel AI SDK `streamText` API

**输出**:
- 修改后的 `services/ai/AiClient.ts`
- 新增 `onToolCall` 回调参数

**涉及文件**:
- 修改: `services/ai/AiClient.ts`
- 新建: `services/ai/types.ts` (新增工具调用相关类型)

**接口扩展**:
```typescript
// 扩展 StreamOptions 接口
export interface StreamOptions {
  // ... 现有字段

  // MCP 工具支持
  enableMcp?: boolean; // 是否启用 MCP 工具(默认 true)
  onToolCall?: (toolName: string, args: any) => void; // 工具调用开始
  onToolResult?: (toolName: string, result: any) => void; // 工具调用完成
  onToolError?: (toolName: string, error: Error) => void; // 工具调用失败
}

// 修改 streamCompletion 函数
export async function streamCompletion(opts: StreamOptions) {
  // ... 现有逻辑

  // 如果启用 MCP,加载可用工具
  let tools: Record<string, AiSdkTool> = {};
  if (opts.enableMcp !== false) {
    try {
      tools = await McpToolAdapter.convertAllTools();
      logger.debug('[AiClient] 已加载 MCP 工具', { count: Object.keys(tools).length });
    } catch (error) {
      logger.error('[AiClient] 加载 MCP 工具失败', error);
    }
  }

  const result = streamText({
    model: factory()(opts.model),
    messages: opts.messages,
    tools: tools, // 传递工具给 AI SDK
    // ... 其他参数
  });

  // 监听工具调用事件
  for await (const part of result.fullStream) {
    if (part.type === 'tool-call') {
      opts.onToolCall?.(part.toolName, part.args);
    } else if (part.type === 'tool-result') {
      opts.onToolResult?.(part.toolName, part.result);
    } else if (part.type === 'tool-error') {
      opts.onToolError?.(part.toolName, part.error);
    }
    // ... 处理其他事件
  }
}
```

**技术要点**:
- 工具加载失败不应阻断对话
- 工具调用超时设置(默认 30 秒)
- 工具调用结果格式化
- 错误信息用户友好化

**验收标准**:
- ✅ AI 能正确识别并调用 MCP 工具
- ✅ 工具调用结果正确返回给 AI
- ✅ 工具调用失败时对话仍可继续
- ✅ 流式响应不中断
- ✅ 工具调用过程有日志记录

**预估工作量**: 1.5 天

---

#### 任务 2.3: 工具调用持久化 - 存储工具调用历史

**目标**: 持久化存储 AI 的工具调用记录,便于审计和调试

**输入**:
- 工具调用事件(`onToolCall`, `onToolResult`, `onToolError`)
- 现有消息存储架构

**输出**:
- 数据库迁移: `storage/sqlite/migrations/0005_tool_calls.ts`
- 数据仓库: `storage/repositories/tool-calls.ts`

**涉及文件**:
- 新建: `storage/sqlite/migrations/0005_tool_calls.ts`
- 新建: `storage/repositories/tool-calls.ts`
- 修改: `storage/sqlite/db.ts` (注册 MIGRATION_0005)
- 修改: `storage/core.ts` (新增 ToolCall 类型)

**表结构设计**:
```sql
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  server_id TEXT NOT NULL,
  args TEXT NOT NULL, -- JSON
  result TEXT, -- JSON
  error TEXT, -- JSON (错误信息)
  status TEXT NOT NULL, -- 'pending' | 'success' | 'failed'
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_server ON tool_calls(server_id);
```

**Repository API**:
```typescript
export interface ToolCall {
  id: string;
  messageId: string;
  toolName: string;
  serverId: string;
  args: any;
  result?: any;
  error?: any;
  status: 'pending' | 'success' | 'failed';
  durationMs?: number;
  createdAt: number;
}

export namespace ToolCallsRepository {
  export async function createToolCall(data: Omit<ToolCall, 'id' | 'createdAt'>): Promise<ToolCall>;
  export async function updateToolCall(id: string, updates: Partial<ToolCall>): Promise<void>;
  export async function getToolCallsByMessage(messageId: string): Promise<ToolCall[]>;
  export async function getToolCallStats(serverId: string): Promise<{ total: number; success: number; failed: number }>;
}
```

**验收标准**:
- ✅ 工具调用记录正确存储
- ✅ 支持按消息查询工具调用
- ✅ 统计功能正常工作
- ✅ 外键约束正确处理

**预估工作量**: 1 天

---

#### 任务 2.4: 错误处理和重试机制

**目标**: 完善 MCP 工具调用的错误处理,实现智能重试和降级策略

**输入**:
- 现有错误处理模式(`services/ai/errors.ts`)
- MCP 客户端和工具适配器

**输出**:
- `services/mcp/errors.ts` - MCP 错误类型定义
- `services/mcp/retry.ts` - 重试策略实现

**涉及文件**:
- 新建: `services/mcp/errors.ts`
- 新建: `services/mcp/retry.ts`
- 修改: `services/mcp/McpClient.ts` (集成重试)

**错误类型设计**:
```typescript
// MCP 错误基类
export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly serverId?: string,
    public readonly toolName?: string
  ) {
    super(message);
    this.name = 'McpError';
  }
}

// 连接错误
export class McpConnectionError extends McpError {
  constructor(serverId: string, message: string) {
    super(message, 'MCP_CONNECTION_ERROR', serverId);
  }
}

// 工具调用错误
export class McpToolCallError extends McpError {
  constructor(serverId: string, toolName: string, message: string) {
    super(message, 'MCP_TOOL_CALL_ERROR', serverId, toolName);
  }
}

// 超时错误
export class McpTimeoutError extends McpError {
  constructor(serverId: string, message: string) {
    super(message, 'MCP_TIMEOUT_ERROR', serverId);
  }
}
```

**重试策略**:
```typescript
export interface RetryOptions {
  maxAttempts: number; // 最大重试次数(默认 3)
  initialDelay: number; // 初始延迟(毫秒,默认 1000)
  maxDelay: number; // 最大延迟(毫秒,默认 10000)
  backoffMultiplier: number; // 退避乘数(默认 2)
  retryableErrors: string[]; // 可重试的错误码
}

export class RetryStrategy {
  async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    // 实现指数退避重试逻辑
  }
}
```

**降级策略**:
- 工具调用失败后,AI 仍可继续对话
- 超时工具自动跳过,不阻塞流程
- 连接失败的服务器自动禁用(24 小时后自动重试)

**验收标准**:
- ✅ 错误类型清晰,便于调试
- ✅ 重试机制工作正常
- ✅ 降级策略不影响用户体验
- ✅ 错误日志完整记录

**预估工作量**: 0.5 天

---

### 阶段 3: UI 开发(3-4 天)

#### 任务 3.1: 设置页面 - MCP 服务器管理 UI(需要 UI 设计支持)

**目标**: 在设置页面添加 MCP 服务器管理功能,支持增删改查和测试连接

**输入**:
- 现有设置页面架构(`components/settings/SettingsList.tsx`)
- `McpServersRepository` 数据仓库
- `McpManager` 客户端管理器

**输出**:
- `app/settings/mcp-servers.tsx` - MCP 服务器列表页面
- `app/settings/mcp-server-edit.tsx` - MCP 服务器编辑页面
- `components/settings/McpServerCard.tsx` - 服务器卡片组件
- `hooks/use-mcp-servers.ts` - MCP 服务器管理 Hook

**⚠️ 需要 UI 设计支持**:
在实施此任务前,需要使用 **ui-ux-designer agent** 获取以下设计:
- MCP 服务器列表页面的布局和样式
- 服务器卡片的视觉设计(包括启用/禁用状态、图标、连接状态指示器)
- 服务器编辑表单的布局和交互
- 连接测试的加载状态和反馈设计

**涉及文件**:
- 新建: `app/settings/mcp-servers.tsx`
- 新建: `app/settings/mcp-server-edit.tsx`
- 新建: `components/settings/McpServerCard.tsx`
- 新建: `hooks/use-mcp-servers.ts`
- 修改: `components/settings/SettingsList.tsx` (添加入口)

**核心功能**:
1. 服务器列表展示(卡片式)
2. 添加新服务器(表单)
3. 编辑服务器配置(表单)
4. 删除服务器(确认对话框)
5. 启用/禁用服务器(切换按钮)
6. 测试连接(加载状态 + 成功/失败反馈)
7. 查看工具列表(展开卡片)

**Hook 设计**:
```typescript
export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(false);

  const loadServers = async () => { /* ... */ };
  const addServer = async (data: Omit<McpServer, 'id'>) => { /* ... */ };
  const updateServer = async (id: string, data: Partial<McpServer>) => { /* ... */ };
  const deleteServer = async (id: string) => { /* ... */ };
  const testConnection = async (id: string) => { /* ... */ };
  const toggleEnabled = async (id: string, enabled: boolean) => { /* ... */ };

  return { servers, loading, loadServers, addServer, updateServer, deleteServer, testConnection, toggleEnabled };
}
```

**验收标准**:
- ✅ 所有 CRUD 操作功能正常
- ✅ 测试连接准确反馈状态
- ✅ 表单验证完善(URL 格式、必填字段)
- ✅ 用户体验流畅,加载状态清晰
- ✅ 适配深色/浅色主题
- ✅ 响应式布局,支持不同屏幕尺寸

**预估工作量**: 2 天(含 UI 设计对接)

---

#### 任务 3.2: 对话界面 - 工具调用可视化(需要 UI 设计支持)

**目标**: 在消息气泡中展示 AI 的工具调用过程,增强透明度和可调试性

**输入**:
- 现有消息组件(`components/chat/MessageBubble.tsx`)
- `ToolCallsRepository` 数据仓库
- 工具调用事件流

**输出**:
- `components/chat/ToolCallBlock.tsx` - 工具调用展示组件
- 修改 `components/chat/MessageBubble.tsx` - 集成工具调用块
- 修改 `hooks/use-messages.ts` - 加载工具调用数据

**⚠️ 需要 UI 设计支持**:
在实施此任务前,需要使用 **ui-ux-designer agent** 获取以下设计:
- 工具调用块的视觉设计(参考 ChatGPT 的工具调用样式)
- 工具调用状态的图标和颜色方案(pending、success、failed)
- 工具调用参数和结果的折叠/展开交互
- 工具调用时间线的展示方式(多个工具连续调用)
- 深色/浅色主题下的配色方案

**涉及文件**:
- 新建: `components/chat/ToolCallBlock.tsx`
- 修改: `components/chat/MessageBubble.tsx`
- 修改: `hooks/use-messages.ts`

**UI 设计参考**(需要 ui-ux-designer 细化):
```
┌─────────────────────────────────────┐
│ 🤖 AI 正在使用工具...               │
├─────────────────────────────────────┤
│ 🔧 search_web                       │
│ 参数: { "query": "React Native" }   │
│ [展开查看结果] ▼                    │
├─────────────────────────────────────┤
│ ✅ 搜索完成 (耗时 1.2s)              │
└─────────────────────────────────────┘
```

**核心功能**:
1. 工具调用卡片展示(工具名、参数、结果)
2. 状态指示器(pending、success、failed)
3. 折叠/展开参数和结果
4. 耗时统计
5. 错误信息展示
6. 多个工具调用的时间线展示

**验收标准**:
- ✅ 工具调用过程清晰可见
- ✅ 状态变化实时更新
- ✅ 参数和结果格式化展示(JSON 高亮)
- ✅ 适配深色/浅色主题
- ✅ 不影响消息列表滚动性能

**预估工作量**: 1.5 天(含 UI 设计对接)

---

#### 任务 3.3: 用户引导和帮助文档

**目标**: 提供 MCP 功能的用户引导和帮助文档,降低学习成本

**输入**:
- MCP 功能的完整实现
- 现有文档模式(`docs/` 目录)

**输出**:
- `docs/MCP_USER_GUIDE.md` - 用户使用指南
- `docs/MCP_SERVER_EXAMPLES.md` - MCP 服务器示例
- 应用内引导提示(首次使用)

**涉及文件**:
- 新建: `docs/MCP_USER_GUIDE.md`
- 新建: `docs/MCP_SERVER_EXAMPLES.md`
- 新建: `components/common/McpOnboardingDialog.tsx` (首次使用引导)
- 修改: `app/settings/mcp-servers.tsx` (添加帮助按钮)

**文档内容**:
1. **用户使用指南**
   - 什么是 MCP?
   - 如何添加 MCP 服务器?
   - 如何使用工具?
   - 常见问题解答
   - 故障排查指南

2. **服务器示例**
   - 官方 MCP 服务器列表
   - 社区推荐服务器
   - 自建服务器教程
   - 配置示例和模板

3. **首次使用引导**
   - 弹窗介绍 MCP 功能
   - 推荐添加官方服务器
   - 快速体验工具调用

**验收标准**:
- ✅ 文档清晰易懂
- ✅ 示例可直接复制使用
- ✅ 首次引导流程流畅
- ✅ 帮助按钮易于发现

**预估工作量**: 0.5 天

---

### 阶段 4: 测试与优化(3-5 天)

#### 任务 4.1: 集成测试 - MCP 端到端测试

**目标**: 编写 MCP 功能的集成测试,覆盖核心流程

**输入**:
- 完整的 MCP 功能实现
- 测试服务器(本地搭建)

**输出**:
- `__tests__/mcp/integration.test.ts` - 集成测试套件
- `__tests__/mcp/mock-server.ts` - 模拟 MCP 服务器

**涉及文件**:
- 新建: `__tests__/mcp/integration.test.ts`
- 新建: `__tests__/mcp/mock-server.ts`
- 新建: `__tests__/mcp/fixtures.ts` (测试数据)

**测试覆盖**:
1. **连接测试**
   - SSE 连接建立和断线重连
   - HTTP 传输正常工作
   - 认证流程正确

2. **工具发现**
   - 工具列表正确获取
   - 工具信息正确缓存
   - 工具更新正确同步

3. **工具调用**
   - 工具参数正确传递
   - 工具结果正确返回
   - 工具错误正确处理

4. **AI 集成**
   - AI 正确识别工具
   - 工具调用流程完整
   - 流式响应不中断

5. **数据持久化**
   - 服务器配置正确存储
   - 工具列表正确缓存
   - 工具调用历史正确记录

**验收标准**:
- ✅ 所有测试用例通过
- ✅ 代码覆盖率 > 80%
- ✅ 边界情况正确处理
- ✅ 测试执行稳定可靠

**预估工作量**: 2 天

---

#### 任务 4.2: 性能优化和内存管理

**目标**: 优化 MCP 功能的性能,避免内存泄漏和卡顿

**输入**:
- 性能分析结果
- 内存泄漏检测报告

**输出**:
- 性能优化报告
- 优化后的代码

**优化方向**:
1. **连接池优化**
   - 限制并发连接数(最多 5 个)
   - 实现连接复用
   - 自动清理闲置连接

2. **工具列表缓存**
   - 内存缓存(5 分钟过期)
   - 持久化缓存(数据库)
   - 增量更新机制

3. **大结果处理**
   - 分块传输大数据
   - 流式处理避免内存暴涨
   - 限制单次结果大小(最大 10MB)

4. **UI 渲染优化**
   - 虚拟列表加载工具列表
   - 延迟渲染工具调用详情
   - 防抖搜索和过滤

5. **内存泄漏防护**
   - 正确清理事件监听器
   - 取消未完成的请求
   - 释放不再使用的连接

**验收标准**:
- ✅ 内存占用稳定(< 50MB 增长)
- ✅ UI 响应流畅(无卡顿)
- ✅ 连接池工作正常
- ✅ 无内存泄漏检测到

**预估工作量**: 1.5 天

---

#### 任务 4.3: 文档完善和代码审查

**目标**: 完善技术文档,进行代码审查,确保代码质量

**输入**:
- 完整的 MCP 功能实现
- 测试结果和性能报告

**输出**:
- `services/mcp/CLAUDE.md` - MCP 服务模块文档
- `docs/MCP_ARCHITECTURE.md` - MCP 架构设计文档
- `docs/MCP_API_REFERENCE.md` - API 参考文档
- 代码审查清单和改进建议

**涉及文件**:
- 新建: `services/mcp/CLAUDE.md`
- 新建: `docs/MCP_ARCHITECTURE.md`
- 新建: `docs/MCP_API_REFERENCE.md`
- 更新: `CLAUDE.md` (根目录,添加 MCP 模块索引)

**文档内容**:
1. **模块文档** (`services/mcp/CLAUDE.md`)
   - 模块职责和功能
   - 核心类和接口
   - 使用示例和最佳实践
   - 常见问题解答

2. **架构设计文档** (`docs/MCP_ARCHITECTURE.md`)
   - 整体架构图
   - 各层职责划分
   - 数据流和交互流程
   - 关键设计决策

3. **API 参考文档** (`docs/MCP_API_REFERENCE.md`)
   - 所有公开 API 的详细说明
   - 参数和返回值定义
   - 错误码和异常处理
   - 示例代码

**代码审查清单**:
- ✅ TypeScript 类型安全
- ✅ 错误处理完善
- ✅ 日志记录清晰
- ✅ 代码注释充分
- ✅ 单元测试覆盖
- ✅ 性能优化到位
- ✅ 内存泄漏检测通过
- ✅ 安全性审查(认证、敏感数据)

**验收标准**:
- ✅ 文档完整清晰
- ✅ 代码审查通过
- ✅ 技术债务清零
- ✅ 可维护性良好

**预估工作量**: 1.5 天

---

## 需要进一步明确的问题

### 问题 1: SSE 传输层的 Polyfill 选择

React Native 原生不支持 `EventSource` API,需要使用 polyfill 库。

**推荐方案**:

**方案 A: 使用 `react-native-event-source`**
- 优点: 专为 React Native 设计,兼容性好
- 缺点: 维护不够活跃(最后更新 2 年前)
- 使用场景: 优先选择

**方案 B: 使用 `eventsource` (Web 标准库) + Polyfill**
- 优点: Web 标准兼容,维护活跃
- 缺点: 需要额外的 polyfill 配置
- 使用场景: 方案 A 不可用时的备选

**等待用户选择**:
```
请选择您偏好的 SSE polyfill 方案:
[ ] 方案 A: react-native-event-source
[ ] 方案 B: eventsource + polyfill
[ ] 其他方案: _________________
```

---

### 问题 2: 工具调用结果的大小限制策略

MCP 工具可能返回大量数据(如文件内容、数据库查询结果),需要限制大小。

**推荐方案**:

**方案 A: 硬限制 + 截断**
- 单次工具调用结果最大 10MB
- 超过限制自动截断,保留前 10MB
- 优点: 简单直接,防止内存暴涨
- 缺点: 可能丢失关键数据

**方案 B: 分块传输 + 流式处理**
- 大结果分块传输(每块 1MB)
- 支持流式处理和增量加载
- 优点: 完整传输数据,支持大文件
- 缺点: 实现复杂,需要修改协议

**等待用户选择**:
```
请选择您偏好的大结果处理方案:
[ ] 方案 A: 硬限制 + 截断(简单实用)
[ ] 方案 B: 分块传输(完整支持)
[ ] 其他方案: _________________
```

---

### 问题 3: MCP 服务器认证方式的实现优先级

MCP 协议支持多种认证方式,需要确定实现优先级。

**推荐方案**:

**优先级 1: 无认证 (None)**
- 适用场景: 本地服务器、内网服务器
- 实现难度: 低

**优先级 2: Bearer Token**
- 适用场景: 云端 MCP 服务(最常见)
- 实现难度: 中

**优先级 3: Basic Auth**
- 适用场景: 传统 HTTP 认证
- 实现难度: 低

**优先级 4: OAuth 2.0**
- 适用场景: 第三方服务集成
- 实现难度: 高

**等待用户选择**:
```
请确认认证方式的实现优先级:
[ ] 同意推荐优先级(None > Bearer > Basic > OAuth)
[ ] 调整优先级: _________________
[ ] 仅实现前 N 种: _________________
```

---

### 问题 4: 工具调用的并发策略

AI 可能同时调用多个工具,需要确定并发策略。

**推荐方案**:

**方案 A: 串行执行**
- 工具依次执行,严格顺序
- 优点: 简单可靠,易于调试
- 缺点: 性能较低,耗时长

**方案 B: 并行执行(有限并发)**
- 同时执行多个工具(最多 3 个)
- 优点: 性能高,缩短总耗时
- 缺点: 复杂度高,可能竞态

**方案 C: 智能混合**
- 有依赖关系的串行,无依赖的并行
- 优点: 性能和可靠性平衡
- 缺点: 实现复杂,需要依赖分析

**等待用户选择**:
```
请选择您偏好的并发策略:
[ ] 方案 A: 串行执行(简单可靠)
[ ] 方案 B: 并行执行(性能优先)
[ ] 方案 C: 智能混合(平衡方案)
```

---

### 问题 5: UI 设计风格偏好

MCP 相关的 UI 需要与现有应用风格保持一致。

**当前应用风格**:
- 使用 React Native Paper + React Native Elements
- 支持深色/浅色主题
- 采用卡片式布局
- 圆角和阴影效果

**需要确认**:
```
MCP UI 设计偏好:
[ ] 完全遵循现有风格(推荐)
[ ] 添加独特的视觉标识(如特殊图标、配色)
[ ] 其他建议: _________________
```

---

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议:

```
用户补充内容:

---
(请在此填写您的反馈、建议或调整需求)
---

```

---

## 附录: 技术要点和风险评估

### 关键技术难点

1. **JSON Schema 到 Zod Schema 转换**
   - 难点: 复杂嵌套结构、自定义校验规则
   - 解决方案: 使用 `zod-openapi` 库辅助转换
   - 风险等级: 中

2. **SSE 连接稳定性**
   - 难点: 移动网络不稳定、断线重连
   - 解决方案: 心跳检测 + 指数退避重连
   - 风险等级: 中高

3. **工具调用超时处理**
   - 难点: 超时时机不确定、部分结果丢失
   - 解决方案: 设置合理超时(30s) + 优雅降级
   - 风险等级: 中

4. **大结果内存管理**
   - 难点: 大文件/大数据导致内存暴涨
   - 解决方案: 分块处理 + 流式传输 + 大小限制
   - 风险等级: 高

5. **多服务器并发管理**
   - 难点: 连接池、状态同步、资源竞争
   - 解决方案: 连接池限制 + 锁机制
   - 风险等级: 中

### 潜在风险和应对策略

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|----------|
| MCP 服务器不可用 | 功能不可用 | 高 | 服务器健康检查 + 降级提示 |
| 工具调用失败频繁 | 用户体验差 | 中 | 重试机制 + 错误提示优化 |
| 内存泄漏导致崩溃 | 应用崩溃 | 中 | 完善清理逻辑 + 内存监控 |
| SSE 连接不稳定 | 工具调用中断 | 高 | 自动重连 + HTTP 降级 |
| 工具结果过大 | 内存暴涨 | 中 | 大小限制 + 分块处理 |
| TypeScript 类型不匹配 | 运行时错误 | 低 | 严格类型检查 + 单元测试 |
| UI 性能下降 | 卡顿 | 中 | 虚拟列表 + 延迟渲染 |

### 性能指标和验收标准

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| MCP 连接建立时间 | < 2 秒 | 从发起连接到收到第一个消息 |
| 工具列表加载时间 | < 1 秒 | 从请求到渲染完成 |
| 工具调用响应时间 | < 5 秒 | 从发起调用到收到结果 |
| 内存增长 | < 50MB | 使用 1 小时后的内存增量 |
| UI 帧率 | > 50 FPS | 工具调用时的 UI 响应 |
| 连接成功率 | > 95% | 100 次连接尝试的成功次数 |

### 技术债务和后续优化方向

1. **第一阶段暂不实现的功能**:
   - OAuth 2.0 认证(复杂度高)
   - WebSocket 传输(移动端支持有限)
   - 工具调用日志分析和可视化
   - MCP 服务器市场和推荐系统

2. **后续优化方向**:
   - 工具调用性能分析和优化
   - 更智能的错误处理和自动修复
   - 工具组合和流程编排
   - 跨设备同步 MCP 配置

3. **社区贡献方向**:
   - 编写官方 MCP 服务器接入教程
   - 开源常用工具的 MCP 封装
   - 提供 MCP 调试工具和日志分析

---

**规划完成!** 请审阅并在"用户反馈区域"和"需要进一步明确的问题"部分提供您的意见。确认后即可开始分阶段执行。
