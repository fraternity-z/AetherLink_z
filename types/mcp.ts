/**
 * MCP (Model Context Protocol) 类型定义
 *
 * 定义了 MCP 服务器、工具、资源、提示词等相关的 TypeScript 类型
 * 从 Cherry Studio 移植，适配 React Native 环境（仅支持 HTTP 传输）
 *
 * @module types/mcp
 * @see https://modelcontextprotocol.io
 */

import * as z from 'zod';
import type { BaseTool, MCPTool } from './tool';

export type { MCPTool } from './tool';

/**
 * MCP 配置示例 Schema
 */
export const MCPConfigSampleSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()).optional(),
});

export type MCPConfigSample = z.infer<typeof MCPConfigSampleSchema>;

/**
 * MCP 服务器通信类型
 *
 * - streamableHttp: 通过 HTTP Streamable 协议通信（React Native 唯一支持的方式）
 * - sse: 通过 HTTP Server-Sent Events 通信（未来可能支持）
 *
 * 注意：React Native 不支持 stdio 和 inMemory 类型
 */
export const McpServerTypeSchema = z
  .string()
  .transform((type) => {
    if (type.includes('http')) {
      return 'streamableHttp';
    }
    return type;
  })
  .pipe(
    z.union([
      z.literal('streamableHttp'),
      z.literal('sse'),
      z.literal('inMemory'), // 仅用于内置工具
    ])
  );

/**
 * MCP 服务器配置 Schema
 */
export const McpServerConfigSchema = z
  .object({
    /** 服务器内部 ID */
    id: z.string().optional().describe('Server internal id'),
    /** 服务器名称 */
    name: z.string().optional().describe('Server name for identification and display'),
    /** 服务器通信类型 */
    type: McpServerTypeSchema.optional(),
    /** 服务器描述 */
    description: z.string().optional().describe('Server description'),
    /** 服务器 URL 地址 */
    url: z.string().optional().describe('Server URL address'),
    /** url 的内部别名，优先使用 baseUrl 字段 */
    baseUrl: z.string().optional().describe('Server URL address'),
    /** 启动服务器的命令 (React Native 不适用) */
    command: z.string().optional().describe("The command to execute (not used in React Native)"),
    /** registry URL */
    registryUrl: z.string().optional().describe('Registry URL for the server'),
    /** 传递给命令的参数数组 (React Native 不适用) */
    args: z.array(z.string()).optional().describe('The arguments to pass to the command (not used in React Native)'),
    /** 启动时注入的环境变量对象 (React Native 不适用) */
    env: z.record(z.string(), z.string()).optional().describe('Environment variables for the server process (not used in React Native)'),
    /** 请求头配置 */
    headers: z.record(z.string(), z.string()).optional().describe('Custom headers configuration'),
    /** provider 名称 */
    provider: z.string().optional().describe('Provider name for the server'),
    /** provider URL */
    providerUrl: z.string().optional().describe('URL of the provider website or documentation'),
    /** logo URL */
    logoUrl: z.string().optional().describe('URL of the server logo'),
    /** 服务器标签 */
    tags: z.array(z.string()).optional().describe('Server tags for categorization'),
    /** 是否为长期运行的服务器 */
    longRunning: z.boolean().optional().describe('Whether the server is long running'),
    /** 请求超时时间（秒） */
    timeout: z.number().optional().describe('Timeout in seconds for requests to this server'),
    /** DXT 包版本号 */
    dxtVersion: z.string().optional().describe('Version of the DXT package'),
    /** DXT 包解压路径 */
    dxtPath: z.string().optional().describe('Path where the DXT package was extracted'),
    /** 参考链接 */
    reference: z.string().optional().describe('Reference link for the server'),
    /** 搜索关键字 */
    searchKey: z.string().optional().describe('Search key for the server'),
    /** 配置示例 */
    configSample: MCPConfigSampleSchema.optional().describe('Configuration sample for the server'),
    /** 禁用的工具列表 */
    disabledTools: z.array(z.string()).optional().describe('List of disabled tools for this server'),
    /** 禁用自动批准的工具列表 */
    disabledAutoApproveTools: z
      .array(z.string())
      .optional()
      .describe('List of tools that are disabled for auto-approval on this server'),
    /** 是否应该配置 */
    shouldConfig: z.boolean().optional().describe('Whether the server should be configured'),
    /** 是否激活 */
    isActive: z.boolean().optional().describe('Whether the server is active'),
  })
  .strict()
  .refine(
    (schema) => {
      if (schema.type === 'inMemory' && schema.name && !isBuiltinMCPServerName(schema.name)) {
        return false;
      }
      return true;
    },
    {
      message: 'Server type is inMemory but this is not a builtin MCP server, which is not allowed',
    }
  )
  .transform((schema) => {
    // 显式传入的 type 会覆盖掉从 url 推断的逻辑
    if (!schema.type) {
      const url = schema.baseUrl ?? schema.url ?? null;

      if (url !== null) {
        if (url.endsWith('/mcp')) {
          return {
            ...schema,
            type: 'streamableHttp' as const,
          };
        } else if (url.endsWith('/sse')) {
          return {
            ...schema,
            type: 'sse' as const,
          };
        }
      }
    }

    return schema;
  });

/**
 * 将服务器别名映射到其配置的对象
 */
export const McpServersMapSchema = z.record(z.string(), McpServerConfigSchema);

/**
 * 顶层配置对象 Schema
 */
export const McpConfigSchema = z.object({
  mcpServers: McpServersMapSchema.describe('Mapping of server aliases to their configurations'),
});

// 数据校验用类型
export type McpServerType = z.infer<typeof McpServerTypeSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpServersMap = z.infer<typeof McpServersMapSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;

/**
 * 验证 MCP 配置
 */
export function validateMcpConfig(config: unknown): McpConfig {
  return McpConfigSchema.parse(config);
}

/**
 * 安全验证 MCP 配置
 */
export function safeValidateMcpConfig(config: unknown) {
  return McpConfigSchema.safeParse(config);
}

/**
 * 安全验证 MCP 服务器配置
 */
export function safeValidateMcpServerConfig(config: unknown) {
  return McpServerConfigSchema.safeParse(config);
}

// MCP 参数类型
export type MCPArgType = 'string' | 'list' | 'number';
export type MCPEnvType = 'string' | 'number';
export type MCPArgParameter = { [key: string]: MCPArgType };
export type MCPEnvParameter = { [key: string]: MCPEnvType };

export interface MCPServerParameter {
  name: string;
  type: MCPArgType | MCPEnvType;
  description: string;
}

/**
 * MCP 服务器配置
 */
export interface MCPServer {
  id: string; // internal id
  name: string; // mcp name, generally as unique key
  type?: McpServerType | 'inMemory';
  description?: string;
  baseUrl?: string;
  command?: string;
  registryUrl?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  provider?: string;
  providerUrl?: string;
  logoUrl?: string;
  tags?: string[];
  longRunning?: boolean;
  timeout?: number;
  dxtVersion?: string;
  dxtPath?: string;
  reference?: string;
  searchKey?: string;
  configSample?: MCPConfigSample;
  disabledTools?: string[];
  disabledAutoApproveTools?: string[];
  shouldConfig?: boolean;
  isActive: boolean;
}

/**
 * 内置 MCP 服务器
 */
export type BuiltinMCPServer = MCPServer & {
  type: 'inMemory';
  name: BuiltinMCPServerName;
};

/**
 * 判断是否为内置 MCP 服务器
 */
export const isBuiltinMCPServer = (server: MCPServer): server is BuiltinMCPServer => {
  return server.type === 'inMemory' && isBuiltinMCPServerName(server.name);
};

/**
 * 内置 MCP 服务器名称常量
 */
export const BuiltinMCPServerNames = {
  fetch: '@aether/fetch',
  time: '@aether/time',
} as const;

export type BuiltinMCPServerName = (typeof BuiltinMCPServerNames)[keyof typeof BuiltinMCPServerNames];

export const BuiltinMCPServerNamesArray = Object.values(BuiltinMCPServerNames);

export const isBuiltinMCPServerName = (name: string): name is BuiltinMCPServerName => {
  return BuiltinMCPServerNamesArray.some((n) => n === name);
};

/**
 * MCP 工具输入 Schema
 */
export interface MCPToolInputSchema {
  type: string;
  title?: string;
  description?: string;
  required?: string[];
  properties: Record<string, object>;
}

/**
 * MCP 工具输出 Schema
 */
export const MCPToolOutputSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()),
});

/**
 * MCP 提示词参数
 */
export interface MCPPromptArguments {
  name: string;
  description?: string;
  required?: boolean;
}

/**
 * MCP 提示词
 */
export interface MCPPrompt {
  id: string;
  name: string;
  description?: string;
  arguments?: MCPPromptArguments[];
  serverId: string;
  serverName: string;
}

/**
 * 获取 MCP 提示词响应
 */
export interface GetMCPPromptResponse {
  description?: string;
  messages: {
    role: string;
    content: {
      type: 'text' | 'image' | 'audio' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }[];
}

/**
 * MCP 配置
 */
export interface MCPConfig {
  servers: MCPServer[];
  isUvInstalled: boolean;
  isBunInstalled: boolean;
}

/**
 * MCP 工具响应状态
 */
export type MCPToolResponseStatus = 'pending' | 'cancelled' | 'invoking' | 'done' | 'error';

/**
 * 基础工具响应
 */
interface BaseToolResponse {
  id: string;
  tool: BaseTool | MCPTool;
  arguments: Record<string, unknown> | undefined;
  status: MCPToolResponseStatus;
  response?: any;
}

/**
 * 工具使用响应（Anthropic 风格）
 */
export interface ToolUseResponse extends BaseToolResponse {
  toolUseId: string;
}

/**
 * 工具调用响应（OpenAI 风格）
 */
export interface ToolCallResponse extends BaseToolResponse {
  toolCallId?: string;
}

/**
 * MCP 工具响应
 */
export interface MCPToolResponse extends Omit<ToolUseResponse | ToolCallResponse, 'tool'> {
  tool: MCPTool;
  toolCallId?: string;
  toolUseId?: string;
}

/**
 * 普通工具响应
 */
export interface NormalToolResponse extends Omit<ToolCallResponse, 'tool'> {
  tool: BaseTool;
  toolCallId: string;
}

/**
 * MCP 工具结果内容
 */
export interface MCPToolResultContent {
  type: 'text' | 'image' | 'audio' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri?: string;
    text?: string;
    mimeType?: string;
    blob?: string;
  };
}

/**
 * MCP 调用工具响应
 */
export interface MCPCallToolResponse {
  content: MCPToolResultContent[];
  isError?: boolean;
}

/**
 * MCP 资源
 */
export interface MCPResource {
  serverId: string;
  serverName: string;
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
  text?: string;
  blob?: string;
}

/**
 * MCP 资源内容
 */
export interface MCPResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

/**
 * MCP 提示词结果
 */
export interface MCPPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
    };
  }>;
}

/**
 * MCP 工具调用请求
 */
export interface MCPToolCallRequest {
  serverId: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * MCP 工具结果（旧接口，保持向后兼容）
 */
export interface MCPToolResult {
  content: MCPToolResultContent[];
  isError?: boolean;
  structuredContent?: any;
}

/**
 * MCP 客户端连接状态
 */
export enum MCPConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

/**
 * MCP 客户端连接信息
 */
export interface MCPClientConnection {
  serverId: string;
  status: MCPConnectionStatus;
  connectedAt?: number;
  error?: string;
}

/**
 * MCP 服务器健康检查结果
 */
export interface MCPHealthCheck {
  serverId: string;
  isOnline: boolean;
  healthy?: boolean;
  responseTime?: number;
  version?: string;
  error?: string;
  checkedAt: number;
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
