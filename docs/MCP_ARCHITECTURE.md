# MCP 集成架构设计文档

## 项目概述

为 **AetherLink_z** (React Native 应用) 集成 **Model Context Protocol (MCP)** 功能，采用官方 `@modelcontextprotocol/sdk` TypeScript SDK，支持 **Streamable HTTP** 传输协议，实现与各类 MCP 服务器的连接和交互。

---

## 核心挑战与解决方案

### 挑战 1：平台限制

**问题**：React Native 不支持 Node.js 子进程，无法使用 Stdio 传输（Cherry Studio 的主要方式）

**解决方案**：
- ✅ 采用 **Streamable HTTP** 作为唯一传输方式
- ✅ 仅支持远程 MCP 服务器（HTTP/HTTPS URL）
- ❌ 放弃 Stdio 本地子进程通信

### 挑战 2：与现有架构集成

**问题**：需要与 Vercel AI SDK、SQLite、现有 UI 组件无缝集成

**解决方案**：
- 参考现有 `services/ai/AiClient.ts` 的设计模式
- 使用 `storage/repositories/` 存储 MCP 配置
- 通过工具转换适配 Vercel AI SDK 的 `tools` 参数

### 挑战 3：用户体验

**问题**：移动端用户需要简单的配置和使用流程

**解决方案**：
- 提供预设的热门 MCP 服务器列表（如 Brave Search、Fetch 等）
- 可视化工具选择界面
- 自动重连和错误处理

---

## 架构设计

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React Native Components)                        │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐│
│  │ McpSettings     │  │ ChatInput     │  │ ToolSelector  ││
│  │ (设置MCP服务器)  │  │ (工具按钮)     │  │ (选择工具)    ││
│  └────────┬────────┘  └───────┬───────┘  └───────┬───────┘│
└───────────┼─────────────────────┼──────────────────┼────────┘
            │                     │                  │
            ▼                     ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Business Logic Layer (Services & Hooks)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  McpClient (services/mcp/McpClient.ts)                │  │
│  │  ├─ initClient(): Promise<Client>                     │  │
│  │  ├─ listTools(serverId): Promise<MCPTool[]>           │  │
│  │  ├─ callTool(serverId, name, args): Promise<Result>   │  │
│  │  ├─ listResources(serverId): Promise<MCPResource[]>   │  │
│  │  └─ closeClient(serverId): Promise<void>              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ToolConverter (services/mcp/ToolConverter.ts)        │  │
│  │  ├─ toVercelAiTools(mcpTools): CoreTool[]             │  │
│  │  ├─ fromVercelToolCall(call): MCPToolCall             │  │
│  │  └─ formatToolResult(result): ToolResultContent[]     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CacheManager (services/mcp/CacheManager.ts)          │  │
│  │  ├─ get<T>(key): T | undefined                        │  │
│  │  ├─ set<T>(key, value, ttl): void                     │  │
│  │  ├─ has(key): boolean                                 │  │
│  │  └─ clear(prefix): void                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Layer (Storage)                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  McpServersRepository (storage/repositories/mcp.ts)   │  │
│  │  ├─ getAllServers(): Promise<MCPServer[]>             │  │
│  │  ├─ getServerById(id): Promise<MCPServer | null>      │  │
│  │  ├─ createServer(config): Promise<MCPServer>          │  │
│  │  ├─ updateServer(id, config): Promise<void>           │  │
│  │  ├─ deleteServer(id): Promise<void>                   │  │
│  │  └─ toggleServer(id, active): Promise<void>           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  SQLite Tables:                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  mcp_servers                                          │  │
│  │  ├─ id: TEXT PRIMARY KEY                              │  │
│  │  ├─ name: TEXT NOT NULL                               │  │
│  │  ├─ base_url: TEXT NOT NULL                           │  │
│  │  ├─ description: TEXT                                 │  │
│  │  ├─ headers: TEXT (JSON)                              │  │
│  │  ├─ timeout: INTEGER                                  │  │
│  │  ├─ is_active: INTEGER (0/1)                          │  │
│  │  ├─ created_at: INTEGER                               │  │
│  │  └─ updated_at: INTEGER                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP SDK (@modelcontextprotocol/sdk)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Client (from '@modelcontextprotocol/sdk/client')     │  │
│  │  └─ StreamableHTTPClientTransport                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
      ┌────────────────────┐
      │  Remote MCP Server │
      │  (HTTP/HTTPS)      │
      └────────────────────┘
```

---

## 2. 模块设计

### 2.1 核心服务：McpClient

**文件路径**：`services/mcp/McpClient.ts`

**职责**：
- MCP 客户端连接管理
- 工具/资源/提示词的列表和调用
- 连接池管理（复用客户端实例）
- 错误处理和自动重连

**关键 API**：

```typescript
export class McpClient {
  private clients: Map<string, Client> = new Map();
  private pendingClients: Map<string, Promise<Client>> = new Map();

  /**
   * 初始化或复用客户端连接
   */
  async initClient(server: MCPServer): Promise<Client>

  /**
   * 列出服务器的所有工具（带缓存）
   */
  async listTools(serverId: string): Promise<MCPTool[]>

  /**
   * 调用指定工具
   */
  async callTool(
    serverId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult>

  /**
   * 列出服务器的所有资源
   */
  async listResources(serverId: string): Promise<MCPResource[]>

  /**
   * 读取指定资源
   */
  async readResource(serverId: string, uri: string): Promise<MCPResourceContent>

  /**
   * 列出服务器的所有提示词
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]>

  /**
   * 获取指定提示词
   */
  async getPrompt(
    serverId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<MCPPromptResult>

  /**
   * 关闭指定服务器的连接
   */
  async closeClient(serverId: string): Promise<void>

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void>
}
```

---

### 2.2 工具转换器：ToolConverter

**文件路径**：`services/mcp/ToolConverter.ts`

**职责**：
- 将 MCP 工具格式转换为 Vercel AI SDK 的 `CoreTool` 格式
- 将 AI SDK 的工具调用转换为 MCP 格式
- 格式化工具执行结果

**关键 API**：

```typescript
export class ToolConverter {
  /**
   * 将 MCP 工具列表转换为 Vercel AI SDK 格式
   * @param mcpTools MCP 工具列表
   * @returns CoreTool[] (Vercel AI SDK 格式)
   */
  static toVercelAiTools(mcpTools: MCPTool[]): CoreTool[]

  /**
   * 将 Vercel AI SDK 的工具调用转换为 MCP 格式
   */
  static fromVercelToolCall(toolCall: any): {
    serverId: string;
    toolName: string;
    args: Record<string, unknown>;
  }

  /**
   * 格式化 MCP 工具结果为 AI SDK 的内容格式
   */
  static formatToolResult(result: MCPToolResult): ToolResultContent[]
}
```

---

### 2.3 缓存管理器：CacheManager

**文件路径**：`services/mcp/CacheManager.ts`

**职责**：
- 内存缓存实现（带 TTL）
- 缓存键生成和管理
- 通知驱动的缓存失效

**关键 API**：

```typescript
export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | undefined

  /**
   * 设置缓存值（带 TTL）
   * @param ttl 生存时间（毫秒），默认 5 分钟
   */
  set<T>(key: string, value: T, ttl?: number): void

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean

  /**
   * 清除指定前缀的所有缓存
   */
  clear(prefix: string): void

  /**
   * 清除所有过期缓存
   */
  clearExpired(): void
}
```

**缓存策略**（参考 Cherry Studio）：

| 操作 | TTL | 缓存键格式 |
|------|-----|-----------|
| `listTools` | 5 分钟 | `mcp:tools:{serverId}` |
| `listResources` | 60 分钟 | `mcp:resources:{serverId}` |
| `listPrompts` | 60 分钟 | `mcp:prompts:{serverId}` |
| `getPrompt` | 30 分钟 | `mcp:prompt:{serverId}:{name}` |
| `readResource` | 30 分钟 | `mcp:resource:{serverId}:{uri}` |

---

### 2.4 数据仓库：McpServersRepository

**文件路径**：`storage/repositories/mcp.ts`

**职责**：
- MCP 服务器配置的 CRUD 操作
- SQLite 数据持久化

**关键 API**：

```typescript
export class McpServersRepository {
  /**
   * 获取所有服务器配置
   */
  async getAllServers(): Promise<MCPServer[]>

  /**
   * 获取激活的服务器
   */
  async getActiveServers(): Promise<MCPServer[]>

  /**
   * 根据 ID 获取服务器
   */
  async getServerById(id: string): Promise<MCPServer | null>

  /**
   * 创建新服务器
   */
  async createServer(config: CreateMCPServerInput): Promise<MCPServer>

  /**
   * 更新服务器配置
   */
  async updateServer(id: string, config: Partial<MCPServer>): Promise<void>

  /**
   * 删除服务器
   */
  async deleteServer(id: string): Promise<void>

  /**
   * 切换服务器激活状态
   */
  async toggleServer(id: string, isActive: boolean): Promise<void>
}
```

---

## 3. 数据模型

### 3.1 TypeScript 类型定义

**文件路径**：`types/mcp.ts`

```typescript
/**
 * MCP 服务器配置
 */
export interface MCPServer {
  id: string;                          // 唯一标识符
  name: string;                        // 显示名称
  baseUrl: string;                     // 服务器 URL (HTTP/HTTPS)
  description?: string;                // 描述
  headers?: Record<string, string>;    // 自定义请求头（如 Authorization）
  timeout?: number;                    // 超时时间（秒），默认 60
  isActive: boolean;                   // 是否激活
  createdAt: number;                   // 创建时间戳
  updatedAt: number;                   // 更新时间戳
}

/**
 * MCP 工具定义
 */
export interface MCPTool {
  name: string;                        // 工具名称
  description?: string;                // 工具描述
  inputSchema: JSONSchema;             // 输入参数 Schema
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP 资源定义
 */
export interface MCPResource {
  uri: string;                         // 资源 URI
  name: string;                        // 资源名称
  description?: string;                // 资源描述
  mimeType?: string;                   // MIME 类型
}

/**
 * MCP 提示词定义
 */
export interface MCPPrompt {
  name: string;                        // 提示词名称
  description?: string;                // 提示词描述
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}
```

---

### 3.2 数据库迁移

**文件路径**：`storage/sqlite/migrations/0004_add_mcp_tables.ts`

```typescript
export const migration_0004 = {
  version: 4,
  name: 'add_mcp_tables',
  up: async (db: SQLiteDatabase) => {
    // 创建 MCP 服务器配置表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        description TEXT,
        headers TEXT,               -- JSON 格式的请求头
        timeout INTEGER DEFAULT 60, -- 超时（秒）
        is_active INTEGER DEFAULT 1,-- 0=未激活, 1=激活
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 创建索引
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_active
      ON mcp_servers(is_active);
    `);
  },
  down: async (db: SQLiteDatabase) => {
    await db.execAsync('DROP TABLE IF EXISTS mcp_servers;');
  }
};
```

---

## 4. 与 Vercel AI SDK 集成

### 4.1 在 AiClient 中集成 MCP 工具

**文件路径**：`services/ai/AiClient.ts`

**修改点**：

```typescript
import { McpClient } from '../mcp/McpClient';
import { ToolConverter } from '../mcp/ToolConverter';
import { McpServersRepository } from '@/storage/repositories/mcp';

export class AiClient {
  private mcpClient: McpClient;
  private mcpRepo: McpServersRepository;

  constructor() {
    this.mcpClient = new McpClient();
    this.mcpRepo = new McpServersRepository();
  }

  /**
   * 获取所有可用的 MCP 工具（合并所有激活的服务器）
   */
  private async getMcpTools(): Promise<CoreTool[]> {
    const activeServers = await this.mcpRepo.getActiveServers();
    const allTools: CoreTool[] = [];

    for (const server of activeServers) {
      try {
        const mcpTools = await this.mcpClient.listTools(server.id);
        const convertedTools = ToolConverter.toVercelAiTools(mcpTools);
        allTools.push(...convertedTools);
      } catch (error) {
        logger.error(`Failed to fetch tools from ${server.name}`, error);
      }
    }

    return allTools;
  }

  /**
   * 流式聊天（增强版，支持 MCP 工具）
   */
  async *streamChat(params: StreamChatParams): AsyncGenerator<ChatResponse> {
    const { messages, modelId, temperature, maxTokens } = params;

    // 1. 获取 MCP 工具
    const mcpTools = await this.getMcpTools();

    // 2. 调用 AI 模型（传入 MCP 工具）
    const result = await streamText({
      model: this.getModel(modelId),
      messages,
      temperature,
      maxTokens,
      tools: mcpTools,  // ← 注入 MCP 工具
      onFinish: async ({ toolCalls }) => {
        // 3. 执行 MCP 工具调用
        if (toolCalls) {
          for (const call of toolCalls) {
            const { serverId, toolName, args } = ToolConverter.fromVercelToolCall(call);
            const result = await this.mcpClient.callTool(serverId, toolName, args);
            // 将结果返回给 AI 模型
            yield {
              type: 'tool-result',
              toolCallId: call.toolCallId,
              result: ToolConverter.formatToolResult(result)
            };
          }
        }
      }
    });

    // 4. 流式返回结果
    for await (const chunk of result.textStream) {
      yield { type: 'text', content: chunk };
    }
  }
}
```

---

## 5. UI 组件设计

### 5.1 MCP 设置页面

**文件路径**：`app/settings/mcp.tsx`

**功能**：
- 显示所有配置的 MCP 服务器
- 添加/编辑/删除服务器
- 激活/禁用服务器
- 测试连接

**界面布局**：

```
┌─────────────────────────────────────────┐
│  ← 返回    MCP 服务器                    │
├─────────────────────────────────────────┤
│  [+ 添加服务器]                          │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 🌐 Brave Search                  │   │
│  │ https://mcp.brave.com/api       │   │
│  │ [●激活] [编辑] [测试连接]         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Google Search                │   │
│  │ https://mcp.google.com/search   │   │
│  │ [○未激活] [编辑] [删除]           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### 5.2 工具选择器（聊天输入栏）

**文件路径**：`components/chat/ToolSelector.tsx`

**功能**：
- 显示所有可用的 MCP 工具
- 多选工具
- 显示工具来源（哪个服务器）

**界面布局**：

```
┌─────────────────────────────────────────┐
│  选择工具                                │
├─────────────────────────────────────────┤
│  [搜索工具...]                           │
├─────────────────────────────────────────┤
│  ☑ search_web (Brave Search)           │
│  ☐ fetch_url (Fetch Server)            │
│  ☐ calculate (Calculator)              │
│  ☐ get_weather (Weather API)           │
├─────────────────────────────────────────┤
│  [取消]                    [确定(2)]     │
└─────────────────────────────────────────┘
```

---

## 6. 实施计划

### 阶段 1：基础架构（第 1-2 天）

- [x] 调研 Cherry Studio MCP 实现
- [x] 学习 MCP TypeScript SDK
- [x] 设计架构方案
- [ ] 创建数据模型和类型定义
- [ ] 创建数据库迁移
- [ ] 实现 `McpServersRepository`

### 阶段 2：核心服务（第 3-4 天）

- [ ] 实现 `CacheManager`
- [ ] 实现 `McpClient`（连接管理、工具列表/调用）
- [ ] 实现 `ToolConverter`
- [ ] 单元测试核心服务

### 阶段 3：AI 集成（第 5 天）

- [ ] 在 `AiClient` 中集成 MCP 工具
- [ ] 测试工具调用流程
- [ ] 测试流式响应

### 阶段 4：UI 开发（第 6-7 天）

- [ ] 实现 MCP 设置页面
- [ ] 实现工具选择器组件
- [ ] 实现预设服务器列表
- [ ] UI 测试和优化

### 阶段 5：测试与文档（第 8 天）

- [ ] 集成测试（完整流程）
- [ ] 错误处理和边界情况
- [ ] 编写用户文档
- [ ] 性能优化

---

## 7. 依赖包安装

```bash
npm install @modelcontextprotocol/sdk
npm install -D @types/node  # 如果还没有
```

---

## 8. 参考资料

- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP 规范文档](https://modelcontextprotocol.io)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- Cherry Studio MCP 实现：`E:\code\cherry-studio-main\src\main\services\MCPService.ts`

---

## 9. 未来扩展方向

### 短期（1-2 个月）
- 🌟 支持 OAuth 认证的 MCP 服务器
- 📊 工具执行统计和日志
- 🔔 工具执行进度提示

### 长期（3-6 个月）
- 🎨 MCP 资源（Resources）和提示词（Prompts）的 UI 展示
- 🤖 内置常用 MCP 服务器（Brave Search、Tavily、Exa 等）
- 🌐 社区共享的 MCP 服务器市场

---

## 10. 注意事项

### 安全性
- ⚠️ 用户输入的服务器 URL 需要验证（HTTPS 优先）
- ⚠️ 自定义请求头中的敏感信息需要加密存储
- ⚠️ 工具调用需要用户确认（特别是写操作）

### 性能
- ✅ 使用连接池复用客户端
- ✅ 缓存工具列表和资源
- ✅ 超时控制和错误重试

### 兼容性
- ✅ 仅支持 Streamable HTTP（React Native 限制）
- ✅ 需要 iOS 13+ / Android 5.0+（Expo 要求）
- ✅ 测试 Web 平台兼容性

---

_文档创建时间：2025-11-12_
_最后更新：2025-11-12_
