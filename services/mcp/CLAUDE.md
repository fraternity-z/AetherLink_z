[根目录](../../CLAUDE.md) > [services](../) > **mcp**

# MCP 服务模块

## 模块职责

MCP (Model Context Protocol) 服务模块负责集成和管理 MCP 服务器，提供工具、资源、提示词的操作接口，支持 AI 模型通过工具调用扩展能力。

## 核心功能

- 🔌 **连接管理**: 管理与 MCP 服务器的 HTTP 连接
- 🛠️ **工具操作**: 列出工具、调用工具、处理工具结果
- 📦 **资源操作**: 列出资源、读取资源内容
- 💬 **提示词操作**: 列出提示词、获取提示词模板
- 🗂️ **缓存管理**: 缓存工具列表、资源列表，减少网络请求
- 🔔 **通知处理**: 监听 MCP 通知，自动更新缓存

## 入口与启动

### 主要服务文件
- `McpClient.ts` - MCP 客户端核心服务
- `ToolConverter.ts` - 工具转换器（MCP 工具 ↔ AI SDK 工具）
- `CacheManager.ts` - 缓存管理器

### 使用示例
```typescript
import { McpClient } from '@/services/mcp/McpClient';
import { ToolConverter } from '@/services/mcp/ToolConverter';

// 创建客户端
const mcpClient = new McpClient();

// 列出工具
const tools = await mcpClient.listTools('server-1');

// 调用工具
const result = await mcpClient.callTool('server-1', 'search_web', {
  query: 'React Native'
});

// 转换为 AI SDK 工具格式
const aiTools = ToolConverter.convertToAiSdkTools(tools, mcpClient, 'server-1');

// 关闭所有连接
await mcpClient.closeAll();
```

## 对外接口

### McpClient (MCP 客户端)
```typescript
export class McpClient {
  /**
   * 初始化或复用客户端连接
   */
  async initClient(server: MCPServer): Promise<Client>;

  /**
   * 列出所有工具
   */
  async listTools(serverId: string): Promise<MCPTool[]>;

  /**
   * 调用工具
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult>;

  /**
   * 列出所有资源
   */
  async listResources(serverId: string): Promise<MCPResource[]>;

  /**
   * 读取资源内容
   */
  async readResource(
    serverId: string,
    uri: string
  ): Promise<MCPResourceContent[]>;

  /**
   * 列出所有提示词
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]>;

  /**
   * 获取提示词
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<MCPPromptResult>;

  /**
   * 健康检查
   */
  async healthCheck(serverId: string): Promise<MCPHealthCheck>;

  /**
   * 关闭指定服务器的连接
   */
  async closeClient(serverId: string): Promise<void>;

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void>;
}
```

### ToolConverter (工具转换器)
```typescript
export class ToolConverter {
  /**
   * 将 MCP 工具转换为 AI SDK 工具格式
   */
  static convertToAiSdkTools(
    mcpTools: MCPTool[],
    mcpClient: McpClient,
    serverId: string
  ): CoreTool[];

  /**
   * 将单个 MCP 工具转换为 AI SDK 工具
   */
  static convertSingleTool(
    mcpTool: MCPTool,
    mcpClient: McpClient,
    serverId: string
  ): CoreTool;

  /**
   * 将 JSON Schema 转换为 Zod Schema
   */
  static convertJsonSchemaToZod(jsonSchema: any): z.ZodSchema;
}
```

### CacheManager (缓存管理器)
```typescript
export class CacheManager {
  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void>;

  /**
   * 清空缓存
   */
  async clear(): Promise<void>;
}

export const cacheManager = new CacheManager();

export enum CacheKeys {
  TOOLS = 'mcp:tools',
  RESOURCES = 'mcp:resources',
  PROMPTS = 'mcp:prompts',
}
```

## 关键依赖与配置

### MCP SDK
- `@modelcontextprotocol/sdk/client` - MCP 客户端核心库
- `@modelcontextprotocol/sdk/client/streamableHttp` - HTTP 传输协议
- `@modelcontextprotocol/sdk/types` - MCP 类型定义

### AI SDK 集成
- `ai` - Vercel AI SDK
- `zod` - Schema 验证（用于工具参数）

### 数据存储
- `@/storage/repositories/mcp` - MCP 服务器配置存储
- `@/utils/logger` - 日志工具

### 传输协议
React Native 仅支持 **Streamable HTTP** 传输协议（不支持 stdio、SSE）。

## 数据模型

### MCP 服务器配置
```typescript
export interface MCPServer {
  id: string;               // 服务器 ID
  name: string;             // 服务器名称
  url: string;              // HTTP 服务器地址
  enabled: boolean;         // 是否启用
  headers?: Record<string, string>; // 自定义请求头
  createdAt: number;
  updatedAt: number;
}
```

### MCP 工具
```typescript
export interface MCPTool {
  name: string;             // 工具名称
  description?: string;     // 工具描述
  inputSchema: {            // 输入参数 JSON Schema
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### MCP 工具结果
```typescript
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

### MCP 资源
```typescript
export interface MCPResource {
  uri: string;              // 资源 URI
  name: string;             // 资源名称
  description?: string;     // 资源描述
  mimeType?: string;        // MIME 类型
}
```

### MCP 提示词
```typescript
export interface MCPPrompt {
  name: string;             // 提示词名称
  description?: string;     // 提示词描述
  arguments?: Array<{       // 参数列表
    name: string;
    description?: string;
    required?: boolean;
  }>;
}
```

## 实现细节

### 连接管理
- **连接池**: 使用 Map 缓存已建立的连接，避免重复连接
- **待处理队列**: 防止并发初始化同一个服务器的连接
- **连接复用**: 同一服务器的多次请求复用同一个连接
- **自动重连**: 连接失败时自动重试（最多 3 次）

### 通知处理
监听 MCP 服务器发送的通知，自动更新缓存：
- `tools/list_changed` - 工具列表变更
- `resources/list_changed` - 资源列表变更
- `resources/updated` - 资源内容更新
- `prompts/list_changed` - 提示词列表变更

### 缓存策略
- **工具列表**: 缓存 5 分钟，通知更新时立即失效
- **资源列表**: 缓存 5 分钟
- **提示词列表**: 缓存 5 分钟
- **工具结果**: 不缓存（动态结果）

### 工具转换流程
1. 读取 MCP 工具的 `inputSchema`（JSON Schema）
2. 使用 `ToolConverter` 将 JSON Schema 转换为 Zod Schema
3. 创建 AI SDK 工具对象，包装 `callTool` 方法
4. AI 模型调用工具时，自动触发 MCP 服务器请求

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试策略
- **连接测试**: 验证连接建立、复用、关闭
- **工具测试**: 测试工具列出、调用、结果解析
- **资源测试**: 测试资源列出、读取
- **缓存测试**: 验证缓存机制和失效策略
- **通知测试**: 测试通知监听和自动更新

### 测试要点
- Mock MCP 服务器响应
- 测试网络错误处理和重试
- 验证 Schema 转换的正确性
- 测试并发请求和连接池

## 常见问题 (FAQ)

### Q: 为什么只支持 HTTP 传输？
A: React Native 不支持 stdio 和 SSE 传输，只能使用 Streamable HTTP。

### Q: 如何调试 MCP 工具调用？
A: 启用日志命名空间 `McpClient`，查看详细的请求和响应日志。

### Q: 工具参数验证失败怎么办？
A: 检查工具的 `inputSchema`，确保 AI 模型生成的参数符合 Schema 定义。

### Q: 如何添加自定义 MCP 服务器？
A: 在设置页面的 MCP 服务器配置中添加服务器地址和认证信息。

### Q: MCP 通知不生效？
A: 检查服务器是否支持通知功能，确保客户端正确注册了通知处理器。

## 性能优化

### 连接优化
- 复用连接，避免重复初始化
- 使用连接池管理多个服务器
- 超时设置：30 秒（可配置）

### 缓存优化
- 智能缓存工具列表，减少网络请求
- 通知驱动的缓存失效，确保数据最新
- 支持手动清除缓存

### 并发优化
- 并发请求时排队等待连接初始化
- 工具调用支持超时和取消
- 避免并发调用同一个工具导致冲突

## 安全性考虑

### 认证和授权
- 支持自定义请求头（API Key、Token 等）
- 服务器地址验证，防止 SSRF 攻击
- 工具调用权限检查（未来功能）

### 数据安全
- 工具参数和结果不包含敏感信息
- 日志脱敏处理
- 加密传输（HTTPS）

### 错误处理
- 捕获所有异常，避免崩溃
- 友好的错误提示
- 记录错误日志，便于排查

## 扩展指南

### 添加新的传输协议
```typescript
// 理论上可以扩展，但 React Native 限制较多
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// 注意：stdio 在 React Native 中不可用
```

### 自定义工具转换逻辑
```typescript
// 在 ToolConverter 中扩展
static convertCustomTool(mcpTool: MCPTool): CoreTool {
  // 自定义转换逻辑
}
```

### 实现工具调用拦截器
```typescript
// 在调用工具前后执行自定义逻辑
class McpClientWithInterceptor extends McpClient {
  async callTool(serverId: string, toolName: string, args: any) {
    // 前置拦截
    log.info('调用工具前', { serverId, toolName, args });

    const result = await super.callTool(serverId, toolName, args);

    // 后置拦截
    log.info('调用工具后', { result });

    return result;
  }
}
```

## 相关文件清单

### 核心服务
- `McpClient.ts` - MCP 客户端
- `ToolConverter.ts` - 工具转换器
- `CacheManager.ts` - 缓存管理器

### 数据仓库
- `../../storage/repositories/mcp.ts` - MCP 服务器配置存储

### UI 组件
- `../../components/chat/McpToolsDialog.tsx` - MCP 工具选择对话框
- `../../app/settings/mcp-server.tsx` - MCP 服务器配置页面

### 类型定义
- `../../types/mcp.ts` - MCP 相关类型（待创建）

## 变更记录 (Changelog)

### 2025-11-15
- 创建 MCP 服务模块文档
- 详细记录连接管理、工具调用、资源操作
- 添加缓存策略和通知处理机制
- 提供工具转换和 AI SDK 集成指南
- 强调 React Native 的传输协议限制
