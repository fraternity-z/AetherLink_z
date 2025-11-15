/**
 * ToolConverter - MCP 工具格式转换器
 *
 * 负责在 MCP 工具格式和 Vercel AI SDK 工具格式之间进行转换
 * 支持双向转换：MCP ↔ Vercel AI SDK
 *
 * 核心功能：
 * - MCP 工具 → Vercel AI SDK CoreTool
 * - Vercel AI SDK 工具调用 → MCP 工具调用请求
 * - MCP 工具结果 → Vercel AI SDK 工具结果格式
 *
 * 创建日期: 2025-11-12
 */

import { tool as createTool, Tool, ToolCallOptions, jsonSchema } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';
import type { MCPTool, MCPToolResult, MCPToolCallRequest } from '@/types/mcp';
import { mcpClient } from './McpClient';
import { logger } from '@/utils/logger';
import { McpServersRepository } from '@/storage/repositories/mcp';

const log = logger.createNamespace('ToolConverter');

/**
 * 将 JSON Schema 转换为 Zod Schema
 *
 * MCP 使用 JSON Schema，而 Vercel AI SDK 使用 Zod
 * 这个函数将 JSON Schema 转换为等价的 Zod Schema
 *
 * @param jsonSchema JSON Schema 对象
 * @returns Zod Schema
 */
function jsonSchemaToZod(jsonSchema: any): z.ZodTypeAny {
  const type = jsonSchema.type;

  switch (type) {
    case 'string':
      return z.string().describe(jsonSchema.description || '');

    case 'number':
      return z.number().describe(jsonSchema.description || '');

    case 'integer':
      return z.number().int().describe(jsonSchema.description || '');

    case 'boolean':
      return z.boolean().describe(jsonSchema.description || '');

    case 'object': {
      if (!jsonSchema.properties) {
        return z.object({}).describe(jsonSchema.description || '');
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        shape[key] = jsonSchemaToZod(propSchema);

        // 如果不在 required 列表中，设置为可选
        if (!jsonSchema.required?.includes(key)) {
          shape[key] = shape[key].optional();
        }
      }

      return z.object(shape).describe(jsonSchema.description || '');
    }

    case 'array': {
      if (!jsonSchema.items) {
        return z.array(z.any()).describe(jsonSchema.description || '');
      }

      const itemSchema = jsonSchemaToZod(jsonSchema.items);
      return z.array(itemSchema).describe(jsonSchema.description || '');
    }

    case 'null':
      return z.null().describe(jsonSchema.description || '');

    default:
      // 未知类型，使用 any
      log.warn(`未知的 JSON Schema 类型: ${type}，使用 z.any()`);
      return z.any().describe(jsonSchema.description || '');
  }
}

/**
 * 工具转换器类
 */
export class ToolConverter {
  /**
   * 将 MCP 工具转换为 Vercel AI SDK 的 CoreTool
   *
   * @param mcpTools MCP 工具列表
   * @returns CoreTool 列表
   */
  static toVercelAiTools(mcpTools: MCPTool[]): Record<string, Tool<any, any>> {
    const tools: Record<string, Tool<any, any>> = {};

    for (const mcpTool of mcpTools) {
      try {
        // 生成唯一的工具 ID: {serverId}_{toolName}
        const toolId = `${mcpTool.serverId}_${mcpTool.name}`;

        // 直接使用 AI SDK 提供的 jsonSchema，避免自定义 Zod 转换导致的不兼容
        const parametersSchema = jsonSchema(mcpTool.inputSchema as JSONSchema7);

        // 创建 Vercel AI SDK 工具
        tools[toolId] = createTool({
          description: mcpTool.description || `${mcpTool.name} from ${mcpTool.serverName}`,
          inputSchema: parametersSchema,
          execute: async (args: any, options: ToolCallOptions) => {
            const execStartTime = Date.now();

            log.info(`🚀 [execute] 开始执行 MCP 工具`, {
              toolId,
              serverId: mcpTool.serverId,
              toolName: mcpTool.name,
              args,
              toolCallId: options?.toolCallId,
            });

            try {
              // 依据服务器配置设置超时（秒->ms），默认 20s
              let timeoutMs = 20000;
              try {
                if (mcpTool.serverId) {
                  const srv = await McpServersRepository.getServerById(mcpTool.serverId);
                  if (srv?.timeout && srv.timeout > 0) {
                    timeoutMs = srv.timeout * 1000;
                    log.debug(`[execute] 使用服务器自定义超时`, { timeoutMs, serverId: mcpTool.serverId });
                  }
                }
              } catch (configError: any) {
                log.warn(`[execute] 获取服务器超时配置失败，使用默认值`, {
                  error: configError.message,
                  timeoutMs,
                });
              }

              const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
                new Promise<T>((resolve, reject) => {
                  const id = setTimeout(() => {
                    log.error(`⏰ [execute] 工具执行超时`, { toolId, timeoutMs: ms });
                    reject(new Error(`MCP tool timeout after ${ms}ms`));
                  }, ms);
                  p.then(v => { clearTimeout(id); resolve(v); })
                   .catch(e => { clearTimeout(id); reject(e); });
                });

              log.debug(`⏳ [execute] 准备调用 mcpClient.callTool`, { toolId, timeoutMs });

              // 调用 MCP 工具（带超时保护）
              const result = await withTimeout(
                mcpClient.callTool(
                  mcpTool.serverId!,
                  mcpTool.name,
                  args
                ),
                timeoutMs
              );

              const execDuration = Date.now() - execStartTime;
              log.info(`✅ [execute] MCP 工具执行成功`, {
                toolId,
                toolName: mcpTool.name,
                duration: `${execDuration}ms`,
                isError: result.isError,
              });

              // 转换结果格式
              const formattedResult = ToolConverter.formatToolResult(result);
              log.debug(`📦 [execute] 工具结果已格式化`, { toolId, formattedResult });

              return formattedResult;
            } catch (error: any) {
              const execDuration = Date.now() - execStartTime;

              log.error(`❌ [execute] MCP 工具执行失败`, {
                toolId,
                toolName: mcpTool.name,
                duration: `${execDuration}ms`,
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
              });

              // 返回错误信息（而不是抛出异常，避免中断流）
              const message = typeof error?.message === 'string' ? error.message : String(error);
              const errorResult = `MCP 工具执行失败: ${message}`;

              log.debug(`🔄 [execute] 返回错误信息而不是抛出异常`, { toolId, errorResult });

              return errorResult;
            }
          },
        });

        log.debug(`MCP 工具已转换`, {
          toolId,
          mcpToolName: mcpTool.name,
          serverId: mcpTool.serverId,
          serverName: mcpTool.serverName,
        });
      } catch (error: any) {
        log.error(`转换 MCP 工具失败`, {
          toolName: mcpTool.name,
          serverId: mcpTool.serverId,
          error: error.message,
        });
      }
    }

    log.info(`MCP 工具转换完成`, {
      total: mcpTools.length,
      converted: Object.keys(tools).length,
    });

    return tools;
  }

  /**
   * 从 Vercel AI SDK 工具调用中提取 MCP 工具调用信息
   *
   * @param toolCallId 工具调用 ID (格式: {serverId}_{toolName})
   * @param args 工具参数
   * @returns MCP 工具调用请求
   */
  static fromVercelToolCall(
    toolCallId: string,
    args: Record<string, unknown>
  ): MCPToolCallRequest {
    // 解析工具 ID: {serverId}_{toolName}
    const parts = toolCallId.split('_');

    if (parts.length < 2) {
      throw new Error(`无效的工具 ID 格式: ${toolCallId}，应为 {serverId}_{toolName}`);
    }

    const serverId = parts[0];
    const toolName = parts.slice(1).join('_'); // 支持工具名称中包含下划线

    return {
      serverId,
      name: toolName,
      arguments: args,
    };
  }

  /**
   * 格式化 MCP 工具结果为 AI SDK 可接受的格式
   *
   * @param result MCP 工具结果
   * @returns 格式化后的结果
   */
  static formatToolResult(result: MCPToolResult): any {
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

  /**
   * 获取所有激活服务器的工具并转换
   *
   * 这是一个便捷方法，用于一次性获取所有可用工具
   *
   * @returns CoreTool 映射
   */
  static async getAllActiveTools(): Promise<Record<string, Tool<any, any>>> {
    const { McpServersRepository } = await import('@/storage/repositories/mcp');
    const activeServers = await McpServersRepository.getActiveServers();

    log.info(`开始获取激活服务器的工具`, {
      serverCount: activeServers.length,
    });

    const allTools: Record<string, Tool<any, any>> = {};

    for (const server of activeServers) {
      try {
        const mcpTools = await mcpClient.listTools(server.id);
        const convertedTools = ToolConverter.toVercelAiTools(mcpTools);

        // 合并工具
        Object.assign(allTools, convertedTools);

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

    log.info(`所有激活服务器的工具已加载`, {
      totalTools: Object.keys(allTools).length,
    });

    return allTools;
  }

  /**
   * 解析工具 ID，提取服务器 ID 和工具名称
   *
   * @param toolId 工具 ID (格式: {serverId}_{toolName})
   * @returns 解析结果
   */
  static parseToolId(toolId: string): { serverId: string; toolName: string } {
    const parts = toolId.split('_');

    if (parts.length < 2) {
      throw new Error(`无效的工具 ID 格式: ${toolId}`);
    }

    return {
      serverId: parts[0],
      toolName: parts.slice(1).join('_'),
    };
  }
}
