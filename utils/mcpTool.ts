/**
 * MCP 工具转换器
 *
 * 提供 MCP 工具与各种 AI SDK 格式之间的转换功能
 * 从 Cherry Studio 移植，适配 React Native 环境
 *
 * 注意：这是一个纯工具模块，只包含格式转换函数，不依赖业务服务
 * 工具调用逻辑请使用 services/mcp/ToolCaller.ts
 *
 * @module utils/mcpTool
 */

import { logger } from '@/utils/logger';
import type {
  MCPServer,
  MCPToolResponse,
  MCPCallToolResponse,
} from '@/types/mcp';
import type { MCPTool } from '@/types/tool';
import { filterProperties, processSchemaForO3 } from './mcpSchema';

const log = logger.createNamespace('mcpTool');

/**
 * ============================================================================
 * OpenAI 格式转换
 * ============================================================================
 */

/**
 * 将 MCP 工具转换为 OpenAI Chat Completion Tools 格式
 */
export function mcpToolsToOpenAIChatTools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => {
    const parameters = processSchemaForO3(tool.inputSchema);

    return {
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          ...parameters,
        },
        strict: true,
      },
    };
  });
}

/**
 * 将 MCP 工具转换为 OpenAI Responses Tools 格式
 */
export function mcpToolsToOpenAIResponseTools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => {
    const parameters = processSchemaForO3(tool.inputSchema);

    return {
      type: 'function',
      name: tool.id,
      parameters: {
        type: 'object' as const,
        ...parameters,
      },
      strict: true,
    };
  });
}

/**
 * 从 OpenAI 工具调用中找到对应的 MCP 工具
 */
export function openAIToolsToMcpTool(
  mcpTools: MCPTool[],
  toolCall: any
): MCPTool | undefined {
  let toolName = '';

  try {
    if ('name' in toolCall) {
      toolName = toolCall.name;
    } else if (toolCall.type === 'function' && 'function' in toolCall) {
      toolName = toolCall.function.name;
    } else {
      throw new Error('Unknown tool call type');
    }
  } catch (error) {
    log.error(`解析工具调用失败: ${toolCall}`, { error });
    return undefined;
  }

  const tools = mcpTools.filter((mcpTool) => {
    return mcpTool.id === toolName || mcpTool.name === toolName;
  });

  if (tools.length > 1) {
    log.warn(`找到多个匹配的 MCP 工具: ${toolName}`);
  }

  if (tools.length === 0) {
    log.warn(`未找到匹配的 MCP 工具: ${toolName}`);
    return undefined;
  }

  return tools[0];
}

/**
 * 将 MCP 工具调用响应转换为 OpenAI 兼容的消息格式
 */
export function mcpToolCallResponseToOpenAICompatibleMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false,
  noSupportArrayContent: boolean = false
): any {
  const message: any = {
    role: 'user',
  };

  if (resp.isError) {
    message.content = JSON.stringify(resp.content);
  } else if (noSupportArrayContent) {
    let content: string = `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:\n`;

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content += (item.text || 'no content') + '\n';
            break;
          case 'image':
            content += `Here is a image result: data:${item.mimeType};base64,${item.data}\n`;
            break;
          case 'audio':
            content += `Here is a audio result: data:${item.mimeType};base64,${item.data}\n`;
            break;
          default:
            content += `Here is a unsupported result type: ${item.type}\n`;
            break;
        }
      }
    } else {
      content += JSON.stringify(resp.content);
      content += '\n';
    }

    message.content = content;
  } else {
    const content: any[] = [
      {
        type: 'text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`,
      },
    ];

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content.push({
              type: 'text',
              text: item.text || 'no content',
            });
            break;
          case 'image':
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${item.mimeType};base64,${item.data}`,
                detail: 'auto',
              },
            });
            break;
          case 'audio':
            content.push({
              type: 'input_audio',
              input_audio: {
                data: `data:${item.mimeType};base64,${item.data}`,
                format: 'mp3',
              },
            });
            break;
          default:
            content.push({
              type: 'text',
              text: `Unsupported type: ${item.type}`,
            });
            break;
        }
      }
    } else {
      content.push({
        type: 'text',
        text: JSON.stringify(resp.content),
      });
    }

    message.content = content;
  }

  return message;
}

/**
 * ============================================================================
 * Anthropic 格式转换
 * ============================================================================
 */

/**
 * 将 MCP 工具转换为 Anthropic Tools 格式
 */
export function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => {
    return {
      name: tool.id,
      description: tool.description,
      input_schema: tool.inputSchema,
    };
  });
}

/**
 * 从 Anthropic ToolUse 中找到对应的 MCP 工具
 */
export function anthropicToolUseToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolUse: any
): MCPTool | undefined {
  if (!mcpTools) return undefined;
  const tools = mcpTools.filter((tool) => tool.id === toolUse.name);

  if (tools.length === 0) {
    log.warn(`未找到匹配的 MCP 工具: ${toolUse.name}`);
    return undefined;
  }

  if (tools.length > 1) {
    log.warn(`找到多个匹配的 MCP 工具: ${toolUse.name}`);
  }

  return tools[0];
}

/**
 * 将 MCP 工具调用响应转换为 Anthropic 消息格式
 */
export function mcpToolCallResponseToAnthropicMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse
): any {
  const message: any = {
    role: 'user',
  };

  if (resp.isError) {
    message.content = JSON.stringify(resp.content);
  } else {
    const content: any[] = [
      {
        type: 'text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`,
      },
    ];

    for (const item of resp.content) {
      switch (item.type) {
        case 'text':
          content.push({
            type: 'text',
            text: item.text || 'no content',
          });
          break;
        case 'image':
          if (
            item.mimeType === 'image/png' ||
            item.mimeType === 'image/jpeg' ||
            item.mimeType === 'image/webp' ||
            item.mimeType === 'image/gif'
          ) {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                data: `data:${item.mimeType};base64,${item.data}`,
                media_type: item.mimeType,
              },
            });
          } else {
            content.push({
              type: 'text',
              text: `Unsupported image type: ${item.mimeType}`,
            });
          }
          break;
        default:
          content.push({
            type: 'text',
            text: `Unsupported type: ${item.type}`,
          });
          break;
      }
    }

    message.content = content;
  }

  return message;
}

/**
 * ============================================================================
 * Google Gemini 格式转换
 * ============================================================================
 */

/**
 * 将 MCP 工具转换为 Gemini Tools 格式
 */
export function mcpToolsToGeminiTools(mcpTools: MCPTool[]): any[] {
  return [
    {
      functionDeclarations: mcpTools?.map((tool) => {
        const filteredSchema = filterProperties(tool.inputSchema);
        return {
          name: tool.id,
          description: tool.description,
          parameters: {
            type: 'OBJECT',
            properties: filteredSchema.properties,
            required: tool.inputSchema.required,
          },
        };
      }),
    },
  ];
}

/**
 * 从 Gemini FunctionCall 中找到对应的 MCP 工具
 */
export function geminiFunctionCallToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolCall: any
): MCPTool | undefined {
  if (!toolCall) return undefined;
  if (!mcpTools) return undefined;

  const toolName = toolCall.name || toolCall.id;
  if (!toolName) return undefined;

  const tools = mcpTools.filter((tool) => tool.id.includes(toolName) || tool.name.includes(toolName));

  if (tools.length > 1) {
    log.warn(`找到多个匹配的 MCP 工具: ${toolName}`);
  }

  if (tools.length === 0) {
    log.warn(`未找到匹配的 MCP 工具: ${toolName}`);
    return undefined;
  }

  return tools[0];
}

/**
 * 将 MCP 工具调用响应转换为 Gemini 消息格式
 */
export function mcpToolCallResponseToGeminiMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false
): any {
  const message: any = {
    role: 'user',
  };

  if (resp.isError) {
    message.parts = [
      {
        text: JSON.stringify(resp.content),
      },
    ];
  } else {
    const parts: any[] = [
      {
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`,
      },
    ];

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            parts.push({
              text: item.text || 'no content',
            });
            break;
          case 'image':
            if (!item.data) {
              parts.push({
                text: 'No image data provided',
              });
            } else {
              parts.push({
                inlineData: {
                  data: item.data,
                  mimeType: item.mimeType || 'image/png',
                },
              });
            }
            break;
          default:
            parts.push({
              text: `Unsupported type: ${item.type}`,
            });
            break;
        }
      }
    } else {
      parts.push({
        text: JSON.stringify(resp.content),
      });
    }

    message.parts = parts;
  }

  return message;
}

/**
 * ============================================================================
 * MCP 工具调用和管理
 *
 * ⚠️ 已移至 services/mcp/ToolCaller.ts，请从那里导入
 * @deprecated 使用 import { callMCPTool, callBuiltInTool, isToolAutoApproved } from '@/services/mcp/ToolCaller'
 * ============================================================================
 */

/**
 * 过滤 MCP 工具列表（仅保留启用的服务器的工具）
 */
export function filterMCPTools(
  mcpTools: MCPTool[] | undefined,
  enabledServers: MCPServer[] | undefined
): MCPTool[] | undefined {
  if (mcpTools) {
    if (enabledServers) {
      mcpTools = mcpTools.filter((t) => enabledServers.some((m) => m.name === t.serverName));
    } else {
      mcpTools = [];
    }
  }

  return mcpTools;
}

/**
 * 解析文本中的工具使用（Tool Use）
 */
export function parseToolUse(
  content: string,
  mcpTools: MCPTool[],
  startIdx: number = 0
): any[] {
  if (!content || !mcpTools || mcpTools.length === 0) {
    return [];
  }

  // 支持两种格式：
  // 1. 完整的 <tool_use></tool_use> 标签包围的内容
  // 2. 只有内部内容（从 TagExtractor 提取出来的）

  let contentToProcess = content;

  // 如果内容不包含 <tool_use> 标签，说明是从 TagExtractor 提取的内部内容，需要包装
  if (!content.includes('<tool_use>')) {
    contentToProcess = `<tool_use>\n${content}\n</tool_use>`;
  }

  const toolUsePattern =
    /<tool_use>([\s\S]*?)<name>([\s\S]*?)<\/name>([\s\S]*?)<arguments>([\s\S]*?)<\/arguments>([\s\S]*?)<\/tool_use>/g;
  const tools: any[] = [];
  let match;
  let idx = startIdx;

  // 查找所有工具使用块
  while ((match = toolUsePattern.exec(contentToProcess)) !== null) {
    const toolName = match[2].trim();
    const toolArgs = match[4].trim();

    // 尝试将参数解析为 JSON
    let parsedArgs;

    try {
      parsedArgs = JSON.parse(toolArgs);
    } catch {
      // 如果解析失败，使用字符串原值
      parsedArgs = toolArgs;
    }

    const mcpTool = mcpTools.find((tool) => tool.id === toolName || tool.name === toolName);

    if (!mcpTool) {
      log.error(`未找到工具 "${toolName}"`);
      continue;
    }

    // 添加到工具数组
    tools.push({
      id: `${toolName}-${idx++}`, // 每个工具使用的唯一 ID
      toolUseId: mcpTool.id,
      tool: mcpTool,
      arguments: parsedArgs,
      status: 'pending',
    });
  }

  return tools;
}
