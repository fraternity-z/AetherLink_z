/**
 * MCP 内置工具配置
 *
 * 定义应用内置的 MCP 工具和服务器
 * 从 Cherry Studio 移植，适配 React Native 环境
 *
 * @module constants/mcp
 */

import { uuid } from '@/storage/core';
import type { MCPServer } from '@/types/mcp';
import type { MCPTool } from '@/types/tool';

/**
 * 内置 MCP 工具 ID 常量
 */
export type BuiltinMcpId = keyof typeof BuiltinMcpIds;

export const BuiltinMcpIds = {
  '@aether/fetch': '@aether/fetch',
  '@aether/time': '@aether/time',
} as const;

/**
 * 内置 MCP 工具定义
 *
 * 这些工具不需要通过 MCP 协议调用，而是直接在应用内实现
 */
export const BUILTIN_TOOLS: Record<BuiltinMcpId, MCPTool[]> = {
  '@aether/fetch': [
    {
      id: uuid(),
      name: 'FetchUrlAsHtml',
      serverId: uuid(),
      serverName: '@aether/fetch',
      isBuiltIn: true,
      type: 'mcp',
      description: '获取 URL 内容并以 HTML 格式返回',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: '要获取的 URL 地址',
          },
        },
        required: ['url'],
      },
    },
    {
      id: uuid(),
      name: 'FetchUrlAsJson',
      serverId: uuid(),
      serverName: '@aether/fetch',
      isBuiltIn: true,
      type: 'mcp',
      description: '获取 URL 内容并以 JSON 格式返回',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: '要获取的 URL 地址',
          },
        },
        required: ['url'],
      },
    },
  ],
  '@aether/time': [
    {
      id: uuid(),
      name: 'GetCurrentTime',
      type: 'mcp',
      serverId: uuid(),
      serverName: '@aether/time',
      isBuiltIn: true,
      description: '获取当前时间和日期',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
};

/**
 * 初始化内置 MCP 服务器配置
 *
 * @returns 内置 MCP 服务器列表
 */
export function initBuiltinMcp(): MCPServer[] {
  return [
    {
      id: '@aether/fetch',
      name: '@aether/fetch',
      type: 'inMemory',
      description: '内置 HTTP 请求工具，用于获取网络资源',
      isActive: false,
    },
    {
      id: '@aether/time',
      name: '@aether/time',
      type: 'inMemory',
      description: '内置时间工具，用于获取当前时间和日期',
      isActive: false,
    },
  ];
}

/**
 * 获取所有内置工具
 *
 * @returns 所有内置工具的扁平数组
 */
export function getAllBuiltinTools(): MCPTool[] {
  return Object.values(BUILTIN_TOOLS).flat();
}

/**
 * 根据服务器名称获取内置工具
 *
 * @param serverName 服务器名称
 * @returns 该服务器的工具列表
 */
export function getBuiltinToolsByServer(serverName: BuiltinMcpId): MCPTool[] {
  return BUILTIN_TOOLS[serverName] || [];
}

/**
 * 判断是否为内置工具
 *
 * @param tool MCP 工具
 * @returns 是否为内置工具
 */
export function isBuiltinTool(tool: MCPTool): boolean {
  return tool.isBuiltIn === true;
}
