/**
 * MCP 工具调用服务（完全重构版）
 *
 * 负责执行 MCP 工具调用，主要职责：
 * - 调用 McpClient.callTool（Schema归一化和错误重试已在McpClient中处理）
 * - 格式化工具调用结果
 * - 提供与现有代码兼容的接口
 *
 * @module services/mcp/ToolCaller
 * 创建日期: 2025-11-17
 */

import { logger } from '@/utils/logger';
import type { MCPToolResponse, MCPCallToolResponse, MCPToolResultContent, MCPServer } from '@/types/mcp';
import type { MCPTool } from '@/types/tool';
import { mcpClient } from './McpClient';
import { ErrorClassifier } from './ErrorClassifier';

const log = logger.createNamespace('ToolCaller');

/**
 * 获取工具所属的 MCP 服务器
 *
 * @param tool MCP 工具
 * @returns 服务器信息（如果存在）
 */
export function getMcpServerByTool(tool: MCPTool): MCPServer | undefined {
  // TODO: 从全局状态或数据库获取服务器信息
  // 暂时返回 undefined
  log.warn('getMcpServerByTool 尚未完全实现');
  return undefined;
}

/**
 * 判断工具是否自动批准
 *
 * @param tool MCP 工具
 * @param server MCP 服务器（可选）
 * @returns 是否自动批准
 */
export function isToolAutoApproved(tool: MCPTool, server?: MCPServer): boolean {
  // 内置工具自动批准
  if (tool.isBuiltIn) {
    return true;
  }

  // 检查服务器的禁用自动批准列表
  const effectiveServer = server ?? getMcpServerByTool(tool);
  return effectiveServer ? !effectiveServer.disabledAutoApproveTools?.includes(tool.name) : false;
}

/**
 * 调用 MCP 工具（完全重构版）
 *
 * 所有复杂逻辑（Schema归一化、错误分类、智能重试）已在 McpClient.callTool 中处理
 * 这里只负责调用 McpClient 并格式化结果
 *
 * @param toolResponse 工具调用请求
 * @returns 工具调用响应
 */
export async function callMCPTool(
  toolResponse: MCPToolResponse
): Promise<MCPCallToolResponse> {
  log.info(`调用 MCP 工具: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`);

  try {
    // 🔥 调用 McpClient.callTool（已集成所有Kelivo特性）
    // - Schema归一化（SchemaValidator）
    // - 特殊工具修正（firecrawl_search等）
    // - 智能错误分类（ErrorClassifier）
    // - 自动重连和重试（reconnectWithBackoff）
    const result = await mcpClient.callTool(
      toolResponse.tool.serverId,
      toolResponse.tool.name,
      toolResponse.arguments || {}
    );

    log.info(`工具调用成功: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, {
      isError: result.isError,
      contentLength: result.content.length,
    });

    // 格式化返回结果（保持与现有代码兼容）
    return {
      content: result.content as MCPToolResultContent[],
      isError: result.isError,
    };
  } catch (error: any) {
    log.error(`工具调用失败: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, {
      error: ErrorClassifier.getErrorDetails(error),
    });

    // 返回错误响应（保持与现有代码兼容）
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error calling tool ${toolResponse.tool.name}: ${
            error instanceof Error
              ? error.stack || error.message || 'No error details available'
              : JSON.stringify(error)
          }`,
        },
      ],
    };
  }
}

/**
 * 调用内置工具
 *
 * 内置工具是客户端实现的工具（非 MCP 服务器提供）
 *
 * @param toolResponse 工具调用请求
 * @returns 工具调用响应（如果是内置工具）
 */
export async function callBuiltInTool(
  toolResponse: MCPToolResponse
): Promise<MCPCallToolResponse | undefined> {
  log.info(`调用内置工具: ${toolResponse.tool.name}`);

  // 内置工具实现，根据工具名称分发
  if (toolResponse.tool.name === 'think') {
    // 'think' 工具：用于模型的思考过程
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

  // 未实现的内置工具
  log.warn(`未实现的内置工具: ${toolResponse.tool.name}`);
  return undefined;
}

/**
 * 统一的工具调用入口
 *
 * 自动判断是内置工具还是 MCP 工具，并调用相应的处理函数
 *
 * @param toolResponse 工具调用请求
 * @returns 工具调用响应
 */
export async function callTool(
  toolResponse: MCPToolResponse
): Promise<MCPCallToolResponse> {
  // 判断是否为内置工具
  if (toolResponse.tool.isBuiltIn) {
    const result = await callBuiltInTool(toolResponse);
    if (result) {
      return result;
    }
    // 内置工具未实现，返回错误
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Built-in tool '${toolResponse.tool.name}' is not implemented`,
        },
      ],
    };
  }

  // MCP 工具
  return callMCPTool(toolResponse);
}

/**
 * 批量调用工具
 *
 * @param toolResponses 工具调用请求列表
 * @returns 工具调用响应列表
 */
export async function callToolsBatch(
  toolResponses: MCPToolResponse[]
): Promise<MCPCallToolResponse[]> {
  log.info(`批量调用工具`, { count: toolResponses.length });

  // 并行调用所有工具
  const promises = toolResponses.map((toolResponse) => callTool(toolResponse));
  const results = await Promise.allSettled(promises);

  // 处理结果
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // 调用失败，返回错误响应
      log.error(`批量调用工具失败（索引 ${index}）`, { error: result.reason });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          },
        ],
      };
    }
  });
}
