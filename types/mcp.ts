/**
 * MCP (Model Context Protocol) 类型定义
 *
 * 定义了 MCP 服务器、工具、资源、提示词等相关的 TypeScript 类型
 *
 * @module types/mcp
 * @see https://modelcontextprotocol.io
 */

/**
 * JSON Schema 类型定义
 * 用于描述工具的输入参数结构
 */
export type JSONSchema = {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  additionalProperties?: boolean;
  [key: string]: any;
};

/**
 * MCP 服务器配置
 *
 * 存储在 SQLite 中的服务器配置信息
 */
export interface MCPServer {
  /** 唯一标识符 (UUID) */
  id: string;

  /** 显示名称 */
  name: string;

  /** 服务器 URL (HTTP/HTTPS) */
  baseUrl: string;

  /** 服务器描述 */
  description?: string;

  /** 自定义请求头 (如 Authorization, X-API-Key 等) */
  headers?: Record<string, string>;

  /** 请求超时时间 (秒)，默认 60 */
  timeout?: number;

  /** 是否激活该服务器 */
  isActive: boolean;

  /** 创建时间戳 (Unix ms) */
  createdAt: number;

  /** 更新时间戳 (Unix ms) */
  updatedAt: number;
}

/**
 * 创建 MCP 服务器的输入参数
 */
export interface CreateMCPServerInput {
  name: string;
  baseUrl: string;
  description?: string;
  headers?: Record<string, string>;
  timeout?: number;
  isActive?: boolean;
}

/**
 * 更新 MCP 服务器的输入参数
 */
export type UpdateMCPServerInput = Partial<Omit<MCPServer, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * MCP 工具定义
 *
 * 从 MCP 服务器获取的工具信息
 */
export interface MCPTool {
  /** 工具名称 (唯一标识符) */
  name: string;

  /** 工具描述 */
  description?: string;

  /** 输入参数的 JSON Schema */
  inputSchema: JSONSchema;

  /** 工具所属的服务器 ID */
  serverId?: string;

  /** 工具所属的服务器名称 */
  serverName?: string;
}

/**
 * MCP 工具调用请求
 */
export interface MCPToolCallRequest {
  /** 服务器 ID */
  serverId: string;

  /** 工具名称 */
  name: string;

  /** 工具参数 */
  arguments: Record<string, unknown>;
}

/**
 * MCP 工具调用结果的内容项
 */
export interface MCPToolResultContent {
  /** 内容类型 */
  type: 'text' | 'image' | 'resource';

  /** 文本内容 (type=text 时使用) */
  text?: string;

  /** Base64 编码的数据 (type=image 时使用) */
  data?: string;

  /** MIME 类型 */
  mimeType?: string;

  /** 资源 URI (type=resource 时使用) */
  uri?: string;
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  /** 结果内容数组 */
  content: MCPToolResultContent[];

  /** 是否为错误结果 */
  isError?: boolean;

  /** 结构化输出 (可选) */
  structuredContent?: any;
}

/**
 * MCP 资源定义
 *
 * 资源是 MCP 服务器提供的数据源（如文件、API 端点等）
 */
export interface MCPResource {
  /** 资源 URI (唯一标识符) */
  uri: string;

  /** 资源名称 */
  name: string;

  /** 资源描述 */
  description?: string;

  /** MIME 类型 */
  mimeType?: string;

  /** 资源所属的服务器 ID */
  serverId?: string;
}

/**
 * MCP 资源内容
 */
export interface MCPResourceContent {
  /** 资源 URI */
  uri: string;

  /** 文本内容 */
  text?: string;

  /** Blob 数据 */
  blob?: string;

  /** MIME 类型 */
  mimeType?: string;
}

/**
 * MCP 提示词参数定义
 */
export interface MCPPromptArgument {
  /** 参数名称 */
  name: string;

  /** 参数描述 */
  description?: string;

  /** 是否必需 */
  required?: boolean;
}

/**
 * MCP 提示词定义
 *
 * 提示词是预定义的模板，可以帮助用户快速生成对话
 */
export interface MCPPrompt {
  /** 提示词名称 (唯一标识符) */
  name: string;

  /** 提示词描述 */
  description?: string;

  /** 提示词参数列表 */
  arguments?: MCPPromptArgument[];

  /** 提示词所属的服务器 ID */
  serverId?: string;
}

/**
 * MCP 提示词结果
 */
export interface MCPPromptResult {
  /** 提示词描述 */
  description?: string;

  /** 生成的消息列表 */
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
    };
  }>;
}

/**
 * MCP 客户端连接状态
 */
export enum MCPConnectionStatus {
  /** 未连接 */
  DISCONNECTED = 'disconnected',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
  /** 连接失败 */
  FAILED = 'failed',
}

/**
 * MCP 客户端连接信息
 */
export interface MCPClientConnection {
  /** 服务器 ID */
  serverId: string;

  /** 连接状态 */
  status: MCPConnectionStatus;

  /** 连接时间戳 */
  connectedAt?: number;

  /** 错误信息 (连接失败时) */
  error?: string;
}

/**
 * MCP 服务器健康检查结果
 */
export interface MCPHealthCheck {
  /** 服务器 ID */
  serverId: string;

  /** 是否在线（原语义） */
  isOnline: boolean;

  /** 兼容 UI 的别名（healthy） */
  healthy?: boolean;

  /** 响应时间 (ms) */
  responseTime?: number;

  /** 服务器版本 */
  version?: string;

  /** 错误信息 */
  error?: string;

  /** 检查时间戳 */
  checkedAt: number;
}

/**
 * 预设的热门 MCP 服务器配置
 */
export interface MCPServerPreset {
  /** 名称 */
  name: string;

  /** 描述 */
  description: string;

  /** 基础 URL */
  baseUrl: string;

  /** 图标 URL 或 emoji */
  icon?: string;

  /** 标签 */
  tags?: string[];

  /** 是否需要 API 密钥 */
  requiresAuth?: boolean;

  /** API 密钥的请求头名称 */
  authHeaderName?: string;

  /** 文档 URL */
  docsUrl?: string;
}
