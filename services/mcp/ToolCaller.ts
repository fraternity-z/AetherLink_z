/**
 * MCP 工具调用服务
 *
 * 负责执行 MCP 工具调用，包括：
 * - 标准 MCP 工具调用
 * - 内置工具调用
 * - 工具自动批准检查
 *
 * @module services/mcp/ToolCaller
 */

import { logger } from '@/utils/logger';
import type { MCPToolResponse, MCPCallToolResponse, MCPToolResultContent, MCPServer } from '@/types/mcp';
import type { MCPTool } from '@/types/tool';
import { mcpClient } from './McpClient';

const log = logger.createNamespace('ToolCaller');

/**
 * 获取工具所属的 MCP 服务器
 */
export function getMcpServerByTool(tool: MCPTool): MCPServer | undefined {
  // 这里需要从全局状态或数据库获取服务器信息
  // 暂时返回 undefined，后续需要实现
  log.warn('getMcpServerByTool 尚未完全实现');
  return undefined;
}

/**
 * 判断工具是否自动批准
 */
export function isToolAutoApproved(tool: MCPTool, server?: MCPServer): boolean {
  if (tool.isBuiltIn) {
    return true;
  }

  const effectiveServer = server ?? getMcpServerByTool(tool);
  return effectiveServer ? !effectiveServer.disabledAutoApproveTools?.includes(tool.name) : false;
}

/**
 * 调用 MCP 工具
 */
export async function callMCPTool(
  toolResponse: MCPToolResponse
): Promise<MCPCallToolResponse> {
  log.info(`调用 MCP 工具: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`);

  try {
    const result = await mcpClient.callTool(
      toolResponse.tool.serverId,
      toolResponse.tool.name,
      toolResponse.arguments || {}
    );

    log.info(`工具调用成功: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, {
      isError: result.isError,
    });

    return {
      content: result.content as MCPToolResultContent[],
      isError: result.isError,
    };
  } catch (error) {
    log.error(`工具调用失败: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, { error });

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error calling tool ${toolResponse.tool.name}: ${
            error instanceof Error ? error.stack || error.message || 'No error details available' : JSON.stringify(error)
          }`,
        },
      ],
    };
  }
}

/**
 * 调用内置工具（未来实现）
 */
export async function callBuiltInTool(toolResponse: MCPToolResponse): Promise<MCPCallToolResponse | undefined> {
  log.info(`调用内置工具: ${toolResponse.tool.name}`);

  // 内置工具实现，根据工具名称分发
  if (toolResponse.tool.name === 'think') {
    const thought = toolResponse.arguments?.thought;
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: (thought as string) || '',
        },
      ],
    };
  }

  log.warn(`未实现的内置工具: ${toolResponse.tool.name}`);
  return undefined;
}
