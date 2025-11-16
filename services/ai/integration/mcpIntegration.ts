/**
 * MCP AI SDK 集成
 *
 * 提供 MCP 工具与 Vercel AI SDK 的集成功能
 * 从 Cherry Studio 移植，适配 React Native 环境
 *
 * @module services/ai/mcpIntegration
 */

import { type Tool, type ToolSet, jsonSchema, tool } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import { logger } from '@/utils/logger';
import type { MCPToolResponse, MCPToolResult, MCPServer } from '@/types/mcp';
import type { MCPTool } from '@/types/tool';
import { callMCPTool, callBuiltInTool, isToolAutoApproved } from '@/utils/mcpTool';
import { mcpClient } from '@/services/mcp/McpClient';
import { McpServersRepository } from '@/storage/repositories/mcp';

const log = logger.createNamespace('mcpIntegration');

/**
 * 设置工具配置（基于提供的参数）
 *
 * 从 Cherry Studio 移植
 */
export function setupToolsConfig(mcpTools?: MCPTool[]): Record<string, Tool> | undefined {
  if (!mcpTools?.length) {
    return undefined;
  }

  const builtInTools = mcpTools.filter((tool) => tool.isBuiltIn);
  const externalTools = mcpTools.filter((tool) => !tool.isBuiltIn);

  const externalToolSet = convertMcpToolsToAiSdkTools(externalTools);
  const builtInToolSet = convertBuiltInToolsToAiSdkTools(builtInTools);

  // 合并两个工具集
  const tools: ToolSet = {
    ...externalToolSet,
    ...builtInToolSet,
  };

  return tools;
}

/**
 * 将 MCP 工具转换为 AI SDK 工具格式
 *
 * 从 Cherry Studio 移植
 */
export function convertMcpToolsToAiSdkTools(mcpTools: MCPTool[]): ToolSet {
  const tools: ToolSet = {};

  for (const mcpTool of mcpTools) {
    tools[mcpTool.name] = tool({
      description: mcpTool.description || `Tool from ${mcpTool.serverName}`,
      inputSchema: jsonSchema(mcpTool.inputSchema as JSONSchema7),
      execute: async (params, { toolCallId }) => {
        const execStartTime = Date.now();

        log.info(`🚀 开始执行 MCP 工具`, {
          toolName: mcpTool.name,
          serverId: mcpTool.serverId,
          serverName: mcpTool.serverName,
          args: params,
          toolCallId,
        });

        try {
          // 检查是否启用自动批准
          // 注意：React Native 环境暂时默认自动批准
          const confirmed = true;

          if (!confirmed) {
            log.debug(`用户取消执行工具: ${mcpTool.name}`);
            return {
              content: [
                {
                  type: 'text',
                  text: `User declined to execute tool "${mcpTool.name}".`,
                },
              ],
              isError: false,
            };
          }

          // 用户确认或自动批准，执行工具
          log.debug(`执行工具: ${mcpTool.name}`);

          // 创建适配的 MCPToolResponse 对象
          const toolResponse: MCPToolResponse = {
            id: toolCallId,
            tool: mcpTool,
            arguments: params,
            status: 'pending',
            toolCallId,
          };

          // 根据工具类型调用不同的处理函数
          let result;
          if (mcpTool.isBuiltIn) {
            const builtInResult = await callBuiltInTool(toolResponse);
            if (builtInResult) {
              result = builtInResult;
            } else {
              throw new Error(`Built-in tool ${mcpTool.name} not implemented`);
            }
          } else {
            result = await callMCPTool(toolResponse);
          }

          const execDuration = Date.now() - execStartTime;
          log.info(`✅ MCP 工具执行成功`, {
            toolName: mcpTool.name,
            duration: `${execDuration}ms`,
            isError: result.isError,
          });

          // 检查错误
          if (result.isError) {
            const errorText = result.content
              .filter((c) => c.type === 'text')
              .map((c) => c.text)
              .join('\n');
            throw new Error(errorText || 'MCP tool execution failed');
          }

          // ✨ 将 MCP 的 content 数组转换为 AI SDK 可接受的格式
          // AI SDK 期望简单的字符串或对象，而不是 {content: [...], isError: false} 格式
          const textContent = result.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('\n');

          const imageContent = result.content.filter((c) => c.type === 'image');

          // 如果只有文本内容，直接返回文本
          if (imageContent.length === 0) {
            return textContent;
          }

          // 如果有图片和文本，返回组合对象
          return {
            text: textContent,
            images: imageContent.map((img) => ({
              data: img.data,
              mimeType: img.mimeType,
            })),
          };
        } catch (error: any) {
          const execDuration = Date.now() - execStartTime;

          log.error(`❌ MCP 工具执行失败`, {
            toolName: mcpTool.name,
            duration: `${execDuration}ms`,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
          });

          // 返回错误信息（而不是抛出异常，避免中断流）
          const message = typeof error?.message === 'string' ? error.message : String(error);
          const errorResult = `MCP 工具执行失败: ${message}`;

          return errorResult;
        }
      },
    });
  }

  return tools;
}

/**
 * 将内置工具转换为 AI SDK 工具格式
 *
 * 从 Cherry Studio 移植（简化版，暂不支持 SystemTool）
 */
export function convertBuiltInToolsToAiSdkTools(builtInTools: MCPTool[]): ToolSet {
  const tools: ToolSet = {};

  for (const builtInTool of builtInTools) {
    // React Native 环境暂时使用简化的内置工具实现
    tools[builtInTool.name] = tool({
      description: builtInTool.description || `Built-in tool: ${builtInTool.name}`,
      inputSchema: jsonSchema(builtInTool.inputSchema as JSONSchema7),
      execute: async (params, { toolCallId }) => {
        log.info(`执行内置工具: ${builtInTool.name}`);

        const toolResponse: MCPToolResponse = {
          id: toolCallId,
          tool: builtInTool,
          arguments: params,
          status: 'pending',
          toolCallId,
        };

        const result = await callBuiltInTool(toolResponse);

        if (!result) {
          throw new Error(`Built-in tool ${builtInTool.name} not implemented`);
        }

        return result;
      },
    });
  }

  return tools;
}

/**
 * 获取所有激活服务器的工具并转换
 *
 * 项目特有功能（保留）
 */
export async function getAllActiveTools(): Promise<Record<string, Tool<any, any>>> {
  const activeServers = await McpServersRepository.getActiveServers();

  log.info(`开始获取激活服务器的工具`, {
    serverCount: activeServers.length,
  });

  const allMcpTools: MCPTool[] = [];

  for (const server of activeServers) {
    try {
      const mcpTools = await mcpClient.listTools(server.id);
      allMcpTools.push(...mcpTools);

      log.info(`服务器工具已加载`, {
        serverId: server.id,
        serverName: server.name,
        toolCount: mcpTools.length,
      });
    } catch (error: any) {
      log.error(`加载服务器工具失败`, {
        serverId: server.id,
        serverName: server.name,
        error: error.message,
      });
    }
  }

  // 使用新的转换函数
  const allTools = setupToolsConfig(allMcpTools) || {};

  // 🐛 调试：输出工具的详细信息
  log.info(`所有激活服务器的工具已加载`, {
    totalTools: Object.keys(allTools).length,
    toolNames: Object.keys(allTools),
  });

  // 🐛 输出每个工具的描述（用于调试 AI 是否能理解工具用途）
  for (const mcpTool of allMcpTools) {
    log.debug(`MCP 工具详情`, {
      name: mcpTool.name,
      description: mcpTool.description || '(无描述)',
      serverName: mcpTool.serverName,
      inputSchema: mcpTool.inputSchema,
    });
  }

  return allTools;
}

/**
 * 格式化 MCP 工具结果为 AI SDK 可接受的格式
 *
 * 项目特有功能（保留）
 */
export function formatToolResult(result: MCPToolResult): any {
  // 如果是错误结果
  if (result.isError) {
    const errorText = result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return {
      error: errorText || 'MCP tool execution failed',
      isError: true,
    };
  }

  // 处理不同类型的内容
  const textContent = result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const imageContent = result.content.filter((c) => c.type === 'image');

  // 如果只有文本内容
  if (imageContent.length === 0) {
    return textContent;
  }

  // 如果有图片和文本，返回组合结果
  return {
    text: textContent,
    images: imageContent.map((img) => ({
      data: img.data,
      mimeType: img.mimeType,
    })),
  };
}
