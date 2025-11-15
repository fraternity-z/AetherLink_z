/**
 * 工具类型定义 (Tool Types)
 *
 * 定义了应用中使用的各种工具类型，包括内置工具、提供商工具和 MCP 工具
 *
 * @module types/tool
 * 从 Cherry Studio 移植
 */

import * as z from 'zod';

/**
 * 工具类型枚举
 */
export type ToolType = 'builtin' | 'provider' | 'mcp';

/**
 * 基础工具接口
 */
export interface BaseTool {
  /** 工具唯一标识符 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 工具类型 */
  type: ToolType;
}

/**
 * MCP 工具输出 Schema
 */
export const MCPToolOutputSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
}).passthrough();

/**
 * MCP 工具输入 Schema
 */
export const MCPToolInputSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
}).passthrough();

/**
 * 内置工具接口
 */
export interface BuiltinTool extends BaseTool {
  /** 输入参数 Schema */
  inputSchema: z.infer<typeof MCPToolInputSchema>;
  /** 工具类型（必须为 builtin） */
  type: 'builtin';
}

/**
 * MCP 工具接口
 *
 * 通过 Model Context Protocol 提供的工具
 */
export interface MCPTool extends BaseTool {
  /** 工具唯一标识符 */
  id: string;
  /** 服务器 ID */
  serverId: string;
  /** 服务器名称 */
  serverName: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 输入参数 Schema */
  inputSchema: z.infer<typeof MCPToolInputSchema>;
  /** 输出参数 Schema */
  outputSchema?: z.infer<typeof MCPToolOutputSchema>;
  /** 是否为内置工具（内置工具不通过 MCP 协议调用） */
  isBuiltIn?: boolean;
  /** 工具类型（必须为 mcp） */
  type: 'mcp';
}
