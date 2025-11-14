import { streamText, experimental_generateImage as generateImage, type ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ImageGenerationError, ImageModelResolutionError } from './errors';
import { isDedicatedImageGenerationModel } from './ModelDiscovery';
import { logger } from '@/utils/logger';
import { mcpClient } from '@/services/mcp/McpClient';
import { McpServersRepository } from '@/storage/repositories/mcp';
import type { MCPTool, MCPToolResult } from '@/types/mcp';

export type Provider = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu';

export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  onToken?: (delta: string) => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;

  // 思考链回调 (用于支持推理模型如 OpenAI o1/o3, DeepSeek R1 等)
  onThinkingToken?: (delta: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;

  // MCP 工具集成 (Model Context Protocol)
  enableMcpTools?: boolean; // 是否启用 MCP 工具
  onToolCall?: (toolName: string, args: any) => void; // 工具调用开始回调
  onToolResult?: (toolName: string, result: any) => void; // 工具执行完成回调
}

async function getApiKey(provider: Provider): Promise<string> {
  // 统一使用 ProvidersRepository 获取所有提供商的 API Key
  const normalizedProvider = provider === 'gemini' ? 'google' : provider;
  return (await ProvidersRepository.getApiKey(normalizedProvider as ProviderId)) ?? '';
}

/**
 * 检测模型是否支持思考链(Reasoning)功能
 */
function supportsReasoning(provider: Provider, model: string): boolean {
  const modelLower = model.toLowerCase();

  // OpenAI o1/o3/o4 系列
  if (provider === 'openai' && /^o[134](-preview|-mini)?$/i.test(model)) {
    return true;
  }

  // DeepSeek R1 系列 (支持通过 openai 兼容接口或 deepseek 直接调用)
  // 匹配: deepseek-r1, deepseek-reasoner, r1, 等
  if (/deepseek.*r1|^r1$|reasoner/i.test(modelLower)) {
    return true;
  }

  // Anthropic Claude 3.7+
  if (provider === 'anthropic' && /claude-3\.[789]|claude-[4-9]/i.test(model)) {
    return true;
  }

  // Google Gemini Thinking 模型
  if ((provider === 'google' || provider === 'gemini') && /thinking/i.test(model)) {
    return true;
  }

  return false;
}

/**
 * 获取推理模型的 providerOptions 配置
 */
function getProviderOptions(provider: Provider, model: string): any {
  // OpenAI o1/o3 系列 - 需要 reasoningSummary 配置
  if (provider === 'openai' && /^o[134]/i.test(model)) {
    return {
      providerOptions: {
        openai: {
          reasoningSummary: 'detailed',
        },
      },
    };
  }

  // Anthropic Claude 3.7+ - 需要启用 thinking
  if (provider === 'anthropic' && /claude-3\.[789]|claude-[4-9]/i.test(model)) {
    return {
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 12000,
          },
        },
      },
    };
  }

  // DeepSeek R1 和 Google Thinking 可能不需要特殊配置
  return {};
}

export async function streamCompletion(opts: StreamOptions) {
  // 统一解析与规范化 provider/model，避免兼容端点路由误判
  let provider: Provider = opts.provider;
  const model = opts.model;

  // 针对 deepseek-r1/"reasoner" 等模型：
  // 若用户在 UI 中选择了 provider=openai 但 model 属于 deepseek 系列，
  // 且 openai 的 baseURL 未指向兼容端点，则优先切换到 deepseek provider，
  // 以强制走 openai-compatible 流程，避免首条消息误连 openai 官方端点报错。
  // 标记是否已完成（用于忽略 "finish" 之后的晚到错误）
  let didFinish = false;

  try {
    const openaiCfg = provider === 'openai' ? await ProvidersRepository.getConfig('openai' as ProviderId) : null;
    const openaiBase = provider === 'openai' ? String(openaiCfg?.baseURL || '').replace(/\/$/, '') : '';
    const isOpenAIOfficial = provider === 'openai' && (!openaiBase || /^https?:\/\/api\.openai\.com\/?v1?$/i.test(openaiBase));

    const isOpenAIOfficialModel = (m: string) => {
      const s = m.toLowerCase();
      return (
        /^gpt-/.test(s) ||
        /^o[0-9]/.test(s) ||
        s.includes('dall-e') ||
        s.startsWith('gpt-image-') ||
        s.startsWith('text-embedding-') ||
        s.startsWith('whisper-')
      );
    };

    async function pickCompatibleProvider(): Promise<Provider | null> {
      const candidates: Provider[] = ['deepseek', 'volc', 'zhipu'];
      for (const id of candidates) {
        const key = await ProvidersRepository.getApiKey(id as ProviderId);
        const cfg = await ProvidersRepository.getConfig(id as ProviderId);
        if (key || cfg?.baseURL) return id;
      }
      return null;
    }

    if (isOpenAIOfficial && !isOpenAIOfficialModel(model)) {
      const compat = await pickCompatibleProvider();
      if (compat) {
        provider = compat;
        const cfg = await ProvidersRepository.getConfig(compat as ProviderId);
        logger.info('[AiClient] 规范化路由: openai 官方端点 + 非官方模型 -> 切换到兼容提供商', {
          model,
          compatProvider: provider,
          baseURL: cfg?.baseURL || '(default)'
        });
      } else {
        logger.warn('[AiClient] 检测到 openai 官方端点 + 非官方模型，但未发现已配置的兼容提供商', { model });
      }
    }
  } catch (e) {
    // 仅记录调试，不阻断流程
    logger.debug('[AiClient] provider/model 规范化检查异常（忽略继续）', e);
  }

  // 兼容别名
  if (provider === 'gemini') provider = 'google';

  const apiKey = await getApiKey(provider);
  if (!apiKey) throw new Error('Missing API key for ' + provider);

  // resolve baseURL for openai-compatible vendors
  let baseURL: string | undefined;
  if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
    const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
    baseURL = cfg.baseURL || undefined;
  }

  // resolve baseURL for anthropic
  let anthropicBaseURL: string | undefined;
  if (provider === 'anthropic') {
    const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
    anthropicBaseURL = cfg.baseURL || undefined;
  }

  // choose provider factory with compatibility for OpenAI-compatible gateways
  const useOpenAICompatible = (
    provider === 'deepseek' || provider === 'volc' || provider === 'zhipu' ||
    (provider === 'openai' && !!baseURL && !/^https?:\/\/api\.openai\.com\/?v1\/?$/i.test(String(baseURL).replace(/\/$/, '')))
  );

  const factory =
    provider === 'anthropic'
      ? () => createAnthropic({ apiKey, baseURL: anthropicBaseURL })
      : provider === 'google'
      ? () => createGoogleGenerativeAI({ apiKey })
      : useOpenAICompatible
      ? () => createOpenAICompatible({
        apiKey, baseURL: baseURL ?? 'https://api.openai.com/v1',
        name: ''
      })
      : () => createOpenAI({ apiKey, baseURL });

  // 检查模型是否支持思考链
  const hasReasoningSupport = supportsReasoning(provider, model);

  // MCP 工具集成：如果启用，加载所有激活的 MCP 工具
  let mcpTools: Record<string, any> | undefined;
  if (opts.enableMcpTools) {
    try {
      const { ToolConverter } = await import('@/services/mcp/ToolConverter');
      mcpTools = await ToolConverter.getAllActiveTools();
      logger.info('[AiClient] MCP 工具已加载', {
        toolCount: Object.keys(mcpTools).length,
      });
    } catch (error: any) {
      // 统一日志形态：error 放第二参，附加字段放第三参
      logger.error('[AiClient] 加载 MCP 工具失败', error, { message: error?.message });
      // 即使工具加载失败，仍然继续聊天流程
      mcpTools = undefined;
    }
  }

  // 采用“方案A”：不将 MCP 工具注入 AI SDK 的 tools 机制，避免主流在工具阶段被阻塞。
  // 工具调用采用解耦的二段式：
  // 1) 第一段：纯流式文本输出，期间解析 <tool_use> 指令；
  // 2) 流结束后：并发执行工具；
  // 3) 构造带工具结果的新消息，递归开启第二段模型流。

  // 工具使用解析的聚合状态
  const toolUses: Array<{ name: string; args: any }> = [];
  let toolDetected = false; // 一旦发现完整的工具块，后续不再向 UI 输出文本，防止幻觉
  const toolParsingEnabled = opts.enableMcpTools === true;

  const extractToolUses = (aggregate: string) => {
    // 解析 <tool_use> ... <name>...</name> ... <arguments>...</arguments> ... </tool_use>
    const re = /<tool_use>[\s\S]*?<name>[\s\S]*?<\/name>[\s\S]*?<arguments>[\s\S]*?<\/arguments>[\s\S]*?<\/tool_use>/g;
    const results: Array<{ name: string; args: any }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(aggregate)) !== null) {
      const block = m[0];
      const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/);
      const argsMatch = block.match(/<arguments>([\s\S]*?)<\/arguments>/);
      if (!nameMatch || !argsMatch) continue;
      const rawName = (nameMatch[1] || '').trim();
      const rawArgs = (argsMatch[1] || '').trim();
      let parsedArgs: any = rawArgs;
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {}
      results.push({ name: rawName, args: parsedArgs });
    }
    return results;
  };

  // 如果启用 MCP 工具，向模型注入一段系统提示，告知可用工具以及使用协议
  let initialMessages = opts.messages as ModelMessage[];
  if (opts.enableMcpTools) {
    try {
      const activeServers = await McpServersRepository.getActiveServers();
      const toolNames: string[] = [];
      const toolHints: string[] = [];
      for (const srv of activeServers) {
        try {
          const tools = await mcpClient.listTools(srv.id);
          for (const t of tools) {
            toolNames.push(t.name);
            const required = Array.isArray(t.inputSchema?.required) ? t.inputSchema.required : [];
            const props = t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [];
            const keysPreview = (required as string[]).length > 0 ? `required: ${required.join(', ')}` : props.length > 0 ? `keys: ${props.slice(0,6).join(', ')}${props.length>6?'…':''}` : '';
            toolHints.push(`- ${t.name}${keysPreview ? ` (${keysPreview})` : ''}`);
          }
        } catch (e) {
          logger.warn('[AiClient] 预加载工具列表失败，跳过该服务器', { serverId: srv.id, error: (e as any)?.message });
        }
      }

      if (toolNames.length > 0) {
        const sysText = [
          'You can use external tools via Model Context Protocol (MCP).',
          'When a tool would help, emit exactly this tag and nothing else:',
          '<tool_use>\n<name>{tool_name}</name>\n<arguments>{valid JSON arguments}</arguments>\n</tool_use>',
          'Rules:',
          '- Use double quotes for all JSON keys/strings; no trailing commas;',
          '- Do NOT wrap with code fences; output only the tag above;',
          '- Stop generating immediately after </tool_use>.',
          'Available tools:',
          ...toolHints,
        ].join('\n');
        initialMessages = [{ role: 'system', content: sysText }, ...initialMessages];
      }
    } catch (e) {
      logger.warn('[AiClient] 构建 MCP 工具系统提示失败', { error: (e as any)?.message });
    }
  }

  // 递归函数：执行一段流 + 解析工具 + 二段式递归（最多 3 层）
  const runOnePass = async (
    messages: any[],
    depth: number
  ): Promise<void> => {
    const result = streamText({
      model: factory()(model),
      messages,
      abortSignal: opts.abortSignal,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
      ...(hasReasoningSupport ? getProviderOptions(provider, model) : {}),
    });

    // 每段流的本地聚合文本（仅用于检测工具块），为降低内存风险，限制到 50k。
    let aggregateText = '';
    const appendAggregate = (d: string) => {
      aggregateText += d;
      if (aggregateText.length > 50000) {
        aggregateText = aggregateText.slice(-30000);
      }
    };

    try {
      if (hasReasoningSupport && (opts.onThinkingToken || opts.onThinkingStart || opts.onThinkingEnd)) {
        let isThinking = false;
        didFinish = false;

        for await (const part of result.fullStream) {
          logger.debug('[AiClient] 🔍 fullStream part.type:', part.type);
          if (part.type === 'reasoning-start') {
            isThinking = true;
            opts.onThinkingStart?.();
          } else if (part.type === 'reasoning-delta') {
            opts.onThinkingToken?.(part.text);
          } else if (part.type === 'reasoning-end') {
            isThinking = false;
            opts.onThinkingEnd?.();
          } else if (part.type === 'text-delta') {
            if (!toolDetected) {
              appendAggregate(part.text);
              const found = extractToolUses(aggregateText);
              if (toolParsingEnabled && found.length > 0) {
                toolUses.push(...found);
                toolDetected = true;
                // 一旦检测到工具，停止向外输出正文，避免标签泄露/重复
              } else {
                opts.onToken?.(part.text);
              }
            }
          } else if (part.type === 'finish-step') {
            // usage 统计（可选）
            continue;
          } else if (part.type === 'finish') {
            if (isThinking) {
              opts.onThinkingEnd?.();
            }
            didFinish = true;
            break;
          } else if (part.type === 'error') {
            if (didFinish) {
              logger.warn('[AiClient] 忽略 finish 之后的晚到错误事件', { error: part.error });
              continue;
            }
            try { opts.onError?.(part.error); } catch (cbErr) {
              logger.warn('[AiClient] onError 回调抛异常，已忽略以保证流继续', { error: (cbErr as any)?.message });
            }
            continue;
          }
        }
      } else {
        // 无思考链，处理纯文本流
        for await (const delta of result.textStream) {
          if (!toolDetected) {
            appendAggregate(delta);
            const found = extractToolUses(aggregateText);
            if (toolParsingEnabled && found.length > 0) {
              toolUses.push(...found);
              toolDetected = true;
            } else {
              opts.onToken?.(delta);
            }
          }
        }
      }
    } catch (e: any) {
      if (didFinish && (e?.name === 'APICallError' || /abort|cancel|closed|stream/i.test(String(e?.message || '')))) {
        logger.warn('[AiClient] finish 之后的晚到异常已忽略', { name: e?.name, message: e?.message });
        return;
      }
      logger.error('[AiClient Error]', { provider, model, error: e, message: e?.message, cause: e?.cause, stack: e?.stack });
      opts.onError?.(e);
      throw e;
    }

    // 一段流结束，若发现工具且未超过递归深度，则执行工具并递归
    if (toolParsingEnabled && toolUses.length > 0 && depth < 3) {
      try {
        const toolResultsText = await runMcpToolsAndSummarize(toolUses, opts);
        const nextMessages = [
          ...messages,
          { role: 'user', content: toolResultsText },
        ];
        // 重置检测状态，允许第二段再次解析后续工具（若模型继续产生）
        toolUses.length = 0;
        toolDetected = false;
        await runOnePass(nextMessages, depth + 1);
        return;
      } catch (toolErr) {
        logger.error('[AiClient] 执行 MCP 工具失败', toolErr as any);
        // 工具失败时，不再递归，结束本轮
      }
    }
  };

  await runOnePass(initialMessages, 0);
  opts.onDone?.();
  
  return;
}

/**
 * 执行解析到的 MCP 工具并生成可供第二轮对话使用的用户消息文本
 */
async function runMcpToolsAndSummarize(
  toolUses: Array<{ name: string; args: any }>,
  opts: StreamOptions
): Promise<string> {
  // 构建 name -> { serverId, tool } 索引
  const activeServers = await McpServersRepository.getActiveServers();
  const nameIndex = new Map<string, { serverId: string; tool: MCPTool }>();
  for (const srv of activeServers) {
    try {
      const tools = await mcpClient.listTools(srv.id);
      for (const t of tools) {
        if (!nameIndex.has(t.name)) {
          nameIndex.set(t.name, { serverId: srv.id, tool: t });
        }
      }
    } catch (e) {
      logger.warn('[AiClient] 加载服务器工具失败，跳过该服务器', { serverId: srv.id, error: (e as any)?.message });
    }
  }

  let summary = '';
  for (const use of toolUses) {
    try {
      const entry = nameIndex.get(use.name);
      if (!entry) {
        const notFound = `MCP 工具未找到: ${use.name}`;
        summary += `Here is the result of mcp tool use \`${use.name}\`:\n${notFound}\n`;
        try { opts.onToolResult?.(use.name, { error: notFound }); } catch {}
        continue;
      }

      try { opts.onToolCall?.(use.name, use.args); } catch {}
      const result: MCPToolResult = await mcpClient.callTool(entry.serverId, use.name, use.args || {});
      try { opts.onToolResult?.(use.name, result); } catch {}

      const text = formatMcpResultToMessageText(use.name, result);
      summary += text + '\n';
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : String(err);
      summary += `Here is the result of mcp tool use \`${use.name}\`:\nError: ${msg}\n`;
      try { opts.onToolResult?.(use.name, { error: msg }); } catch {}
    }
  }
  return summary.trim();
}

function formatMcpResultToMessageText(toolName: string, result: MCPToolResult): string {
  if (!result) {
    return `Here is the result of mcp tool use \`${toolName}\`:\n(no content)`;
  }
  if (result.isError) {
    const errText = (result.content || [])
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n');
    return `Here is the result of mcp tool use \`${toolName}\`:\nError: ${errText || 'unknown error'}`;
  }
  const lines: string[] = [`Here is the result of mcp tool use \`${toolName}\`:`];
  for (const item of result.content || []) {
    if (item.type === 'text' && typeof item.text === 'string') {
      lines.push(item.text);
    } else if (item.type === 'image' && item.data && item.mimeType) {
      lines.push(`image: data:${item.mimeType};base64,${item.data}`);
    } else if (item.type === 'resource' && item.uri) {
      lines.push(`resource: ${item.uri}`);
    }
  }
  if (lines.length === 1) lines.push('(no content)');
  return lines.join('\n');
}

// ============================================
// 图片生成功能
// ============================================

/**
 * 图片生成选项接口
 */
export interface GenerateImageOptions {
  provider: Provider;
  model: string;
  prompt: string;
  n?: number; // 生成数量（默认 1）
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512'; // 图片尺寸
  quality?: 'standard' | 'hd'; // 图片质量（仅 DALL-E 3）
  style?: 'vivid' | 'natural'; // 风格（仅 DALL-E 3）
  abortSignal?: AbortSignal;

  // 流式回调
  onCreated?: () => void;
  onProgress?: (progress: number) => void; // 进度（0-100）
  onComplete?: (imageData: ImageGenerationResult) => void;
  onError?: (error: ImageGenerationError) => void;
}

/**
 * 图片生成结果接口
 */
export interface ImageGenerationResult {
  type: 'url' | 'base64';
  images: string[]; // URL 列表或 Base64 数据（Data URI 格式：data:image/png;base64,...）
  revisedPrompt?: string; // DALL-E 3 返回的优化后提示词（注：当前 Vercel AI SDK 未提供）
}

/**
 * 生成图片（使用 Vercel AI SDK 官方 API）
 *
 * @example
 * ```typescript
 * const result = await generateImageWithAI({
 *   provider: 'openai',
 *   model: 'dall-e-3',
 *   prompt: '一只可爱的橘猫坐在月球上',
 *   size: '1024x1024',
 *   quality: 'hd',
 *   onCreated: () => logger.debug('开始生成'),
 *   onComplete: (data) => logger.debug('生成完成', data),
 * });
 * ```
 */
export async function generateImageWithAI(
  options: GenerateImageOptions
): Promise<ImageGenerationResult> {
  const {
    provider,
    model,
    prompt,
    n = 1,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    abortSignal,
    onCreated,
    onProgress,
    onComplete,
    onError,
  } = options;

  try {
    // 1. 验证模型支持
    if (!isDedicatedImageGenerationModel(model)) {
      throw new ImageModelResolutionError(model, provider);
    }

    // 2. 验证提示词
    if (!prompt || prompt.trim().length === 0) {
      throw new ImageGenerationError(
        '请输入图片描述提示词',
        provider,
        model
      );
    }

    // 3. 验证提示词长度（DALL-E 限制）
    if (prompt.length > 4000) {
      throw new ImageGenerationError(
        '提示词过长，请控制在 4000 字符以内',
        provider,
        model
      );
    }

    // 4. 获取 API Key
    const apiKey = await getApiKey(provider);
    if (!apiKey) {
      throw new ImageGenerationError(
        `缺少 ${provider} 的 API Key，请先在设置中配置`,
        provider,
        model
      );
    }

    // 5. 发送创建事件
    onCreated?.();
    onProgress?.(10);


    // 6. 获取 baseURL（如果有自定义）
    let baseURL: string | undefined;
    if (provider === 'openai' || provider === 'deepseek' || provider === 'volc' || provider === 'zhipu') {
      const cfg = await ProvidersRepository.getConfig(provider as ProviderId);
      baseURL = cfg.baseURL || undefined;
    }

    // 7. 创建提供商实例
    const factory = provider === 'openai'
      ? () => createOpenAI({ apiKey, baseURL })
      : provider === 'deepseek' || provider === 'volc' || provider === 'zhipu'
      ? () => createOpenAICompatible({
          apiKey,
          baseURL: baseURL ?? 'https://api.openai.com/v1',
          name: provider
        })
      : () => {
          throw new ImageGenerationError(
            `提供商 ${provider} 暂不支持图片生成`,
            provider,
            model
          );
        };

    onProgress?.(30);

    // 8. 调用 Vercel AI SDK 官方 API
    const result = await generateImage({
      model: factory().imageModel(model), // 使用 imageModel 方法
      prompt: prompt,
      n: n,
      size: size,
      ...(model.toLowerCase().includes('dall-e-3') && {
        // DALL-E 3 专属参数（通过 providerOptions 传递）
        providerOptions: {
          openai: {
            quality: quality,
            style: style,
          }
        }
      }),
      abortSignal: abortSignal,
    });

    onProgress?.(80);

    // 9. 转换结果格式：GeneratedFile[] -> string[]
    const images: string[] = [];
    if (result.images) {
      for (const image of result.images) {
        if ('base64' in image && image.base64) {
          // 将 Base64 转换为 Data URI 格式
          const mediaType = image.mediaType || 'image/png';
          images.push(`data:${mediaType};base64,${image.base64}`);
        }
      }
    }


    // 10. 处理返回结果
    const imageData: ImageGenerationResult = {
      type: 'base64',
      images: images,
      revisedPrompt: undefined, // 当前 Vercel AI SDK 未提供此字段
    };

    onProgress?.(90);

    // 10. 发送完成事件
    onComplete?.(imageData);
    onProgress?.(100);

    return imageData;
  } catch (error: any) {
    // 错误处理
    logger.error('[AiClient] 图片生成失败', {
      provider,
      model,
      error: error,
      message: error?.message,
      stack: error?.stack,
    });

    const imageError = error instanceof ImageGenerationError
      ? error
      : new ImageGenerationError(
          error.message || '图片生成失败',
          provider,
          model,
          error
        );

    onError?.(imageError);
    throw imageError;
  }
}
