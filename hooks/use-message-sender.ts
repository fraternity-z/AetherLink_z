/**
 * 消息发送 Hook
 *
 * 职责：
 * - 管理消息发送的完整流程
 * - 对话创建和管理
 * - 上下文构建
 * - 附件处理（图片、文件）
 * - AI 流式响应调用
 * - 错误处理和状态管理
 */

import { useState, useRef, useCallback } from 'react';
import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { ThinkingChainRepository } from '@/storage/repositories/thinking-chains';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { MessageBlocksRepository } from '@/storage/repositories/message-blocks';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { AssistantsRepository } from '@/storage/repositories/assistants';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import { supportsVision } from '@/services/ai/ModelCapabilities';
import { autoNameConversation } from '@/services/ai/TopicNaming';
import { File } from 'expo-file-system';
import type { ModelMessage } from 'ai';
import type { Attachment } from '@/storage/core';
import { appEvents, AppEvents } from '@/utils/events';
import { logger } from '@/utils/logger';
import { BlockManager } from '@/services/messageStreaming/BlockManager';

/**
 * 助手消息接口
 */
interface AssistantMessage {
  id: string;
  role: 'assistant';
  text: string;
  status: 'pending' | 'sent' | 'failed';
  extra?: {
    model: string;
    provider: string;
  };
  createdAt: number;
}

/**
 * 消息发送选项
 */
export interface SendMessageOptions {
  text: string;
  attachments: Attachment[];
  searchResults?: string | null;
  onProgress?: (stage: 'creating' | 'sending' | 'streaming' | 'done') => void;
  /** 是否在本次发送中启用 MCP 工具 */
  enableMcpTools?: boolean;
}

/**
 * use-message-sender Hook 返回值
 */
export interface UseMessageSenderResult {
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * 消息发送 Hook
 */
export function useMessageSender(
  conversationId: string | null,
  onConversationChange?: (id: string) => void
): UseMessageSenderResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  /**
   * 判断是否为文本类型文件
   */
  const isTextFile = useCallback((mime: string | null | undefined): boolean => {
    if (!mime) return false;
    return mime.startsWith('text/') ||
           ['application/json', 'application/xml', 'application/javascript'].includes(mime);
  }, []);

  /**
   * 读取文本文件内容
   */
  const readTextFiles = useCallback(async (attachments: Attachment[]): Promise<string> => {
    const textFiles = attachments.filter(a => a.kind === 'file' && a.uri && isTextFile(a.mime));

    if (textFiles.length === 0) return '';

    logger.debug('[useMessageSender] 📄 检测到文本文件附件', { count: textFiles.length });

    let textFileContents = '';

    for (const file of textFiles) {
      try {
        logger.debug('[useMessageSender] 📖 读取文本文件:', {
          uri: file.uri,
          name: file.name,
          mime: file.mime,
        });

        const content = await new File(file.uri as string).text();
        const maxLength = 50000;
        const truncated = content.length > maxLength;
        const finalContent = truncated ? content.substring(0, maxLength) : content;

        logger.debug('[useMessageSender] ✅ 文本文件读取成功', {
          name: file.name,
          length: content.length,
          truncated,
        });

        textFileContents += `\n\n=== 📄 文件: ${file.name || '未命名文件'} ===\n${finalContent}${truncated ? '\n\n[... 文件内容过长，已截断 ...]' : ''}\n=== 文件结束 ===\n`;
      } catch (e) {
        logger.error('[useMessageSender] ❌ 读取文本文件失败，跳过该文件', e, {
          uri: file.uri,
          name: file.name,
        });
        textFileContents += `\n\n=== 📄 文件: ${file.name || '未命名文件'} ===\n[读取失败: ${(e as Error).message}]\n=== 文件结束 ===\n`;
      }
    }

    return textFileContents;
  }, [isTextFile]);

  /**
   * 构建消息内容（支持多模态）
   */
  const buildMessageContent = useCallback(async (
    text: string,
    attachments: Attachment[],
    provider: Provider,
    model: string,
    textFileContents: string,
    searchResults?: string | null
  ): Promise<ModelMessage> => {
    const images = attachments.filter(a => a.kind === 'image' && a.uri);

    // 如果支持多模态且有图片，构造多段内容
    if (images.length > 0 && supportsVision(provider, model)) {
      logger.debug('[useMessageSender] 🖼️ 检测到图片附件，准备发送多模态消息', {
        imageCount: images.length,
        provider,
        model,
      });

      const parts: Array<{ type: 'text'; text: string } | { type: 'image'; image: Uint8Array }> = [];
      const combinedText = text + textFileContents;
      if (combinedText.trim()) parts.push({ type: 'text', text: combinedText });

      // 读取图片为字节数组
      for (const img of images) {
        try {
          logger.debug('[useMessageSender] 📖 读取图片:', { uri: img.uri, mime: img.mime });

          const bytes = await new File(img.uri as string).bytes();

          logger.debug('[useMessageSender] ✅ 图片读取成功', {
            mime: img.mime,
            byteLength: bytes.length,
            sizeKB: (bytes.length / 1024).toFixed(2),
          });

          parts.push({ type: 'image', image: bytes });
        } catch (e) {
          logger.error('[useMessageSender] ❌ 读取图片失败，跳过该图片', e, {
            uri: img.uri,
            mime: img.mime,
          });
        }
      }

      logger.debug('[useMessageSender] 📤 多模态消息构建完成', {
        totalParts: parts.length,
        hasText: parts.some(p => p.type === 'text'),
        imageCount: parts.filter(p => p.type === 'image').length,
      });

      return { role: 'user', content: parts };
    }

    // 不支持多模态或无图片，仅发送文本
    const otherFiles = attachments.filter(a => a.kind === 'file' && !isTextFile(a.mime));
    const fileSuffix = otherFiles.length > 0
      ? (text.trim() ? `\n(附加 ${otherFiles.length} 个文件，但当前模型不支持文件识别)` : `(已附加 ${otherFiles.length} 个文件，但当前模型不支持文件识别)`)
      : '';

    const finalMessage = text + textFileContents + fileSuffix + (searchResults || '');
    return { role: 'user', content: finalMessage.trim() };
  }, [isTextFile]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (options: SendMessageOptions) => {
    const { text, attachments, searchResults, onProgress } = options;

    if (!text.trim() && attachments.length === 0) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    let cid = conversationId;
    let assistant: AssistantMessage | null = null;
    let isFirstTurn = false;

    try {
      onProgress?.('creating');

      // 判断是否首轮对话
      if (!cid) {
        const c = await ChatRepository.createConversation('新话题');
        cid = c.id;
        isFirstTurn = true;
      } else {
        const prevMessages = await MessageRepository.listMessages(cid, { limit: 1 });
        isFirstTurn = prevMessages.length === 0;
      }

      // 获取聊天设置参数
      const sr = SettingsRepository();
      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? (
        provider === 'openai' ? 'gpt-4o-mini' :
        provider === 'anthropic' ? 'claude-3-5-haiku-latest' :
        'gemini-1.5-flash'
      );
      const temperature = (await sr.get<number>(SettingKey.ChatTemperature)) ?? 0.7;
      const maxTokensEnabled = (await sr.get<boolean>(SettingKey.ChatMaxTokensEnabled)) ?? false;
      const maxTokens = maxTokensEnabled ? ((await sr.get<number>(SettingKey.ChatMaxTokens)) ?? 2048) : undefined;
      const contextCount = (await sr.get<number>(SettingKey.ChatContextCount)) ?? 10;

      // 读取文本文件内容
      const textFileContents = await readTextFiles(attachments);

      // 先创建用户消息，并关联所选附件
      const attachmentIds = attachments.map(a => a.id);

      // 🐛 调试日志：记录保存到数据库前的消息内容
      logger.debug('[useMessageSender] 准备保存用户消息到数据库', {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        hasURL: /https?:\/\//.test(text),
        conversationId: cid,
      });

      const userMessage = await MessageRepository.addMessage({
        conversationId: cid!,
        role: 'user',
        text: '', // 用户消息内容也通过块系统管理
        status: 'sent',
        attachmentIds,
      });

      // 🐛 调试日志：确认保存成功
      logger.debug('[useMessageSender] 用户消息已保存到数据库');

      // 📦 为用户消息创建 TEXT 块
      await MessageBlocksRepository.addBlock({
        messageId: userMessage.id,
        type: 'TEXT',
        status: 'SUCCESS',
        content: text,
        sortOrder: 0,
      });

      logger.debug('[useMessageSender] 用户消息的 TEXT 块已创建');

      // 如果是新创建的话题，在用户消息写入后再通知父组件切换话题
      if (isFirstTurn && conversationId === null && onConversationChange) {
        onConversationChange(cid!);
      }

      onProgress?.('sending');

      // 创建 assistant 消息，保存模型信息到 extra 字段
      assistant = await MessageRepository.addMessage({
        conversationId: cid!,
        role: 'assistant',
        text: '',
        status: 'pending',
        extra: { model, provider },
      }) as AssistantMessage;

      // 获取当前助手的系统提示词
      let systemPrompt: string | null = null;
      const currentAssistantId = (await sr.get<string>(SettingKey.CurrentAssistantId)) ?? 'default';
      const assistantsRepo = AssistantsRepository();
      const currentAssistant = await assistantsRepo.getById(currentAssistantId);

      if (currentAssistant?.systemPrompt) {
        systemPrompt = currentAssistant.systemPrompt;
        logger.debug('[useMessageSender] 使用助手提示词:', currentAssistant.name);
      } else {
        logger.debug('[useMessageSender] 无系统提示词（使用纯对话上下文）');
      }

      // 构建消息数组
      const msgs: ModelMessage[] = [];

      if (contextCount > 0) {
        // 添加 system 消息
        if (systemPrompt && systemPrompt.trim()) {
          msgs.push({ role: 'system', content: systemPrompt });
        }

        // 获取历史消息
        const resetAt = cid ? (await ChatRepository.getContextResetAt(cid)) ?? undefined : undefined;
        const historyMessages = await MessageRepository.listMessages(cid!, {
          limit: contextCount * 2,
          after: resetAt,
        });
        const recentHistory = historyMessages.slice(-contextCount * 2);

        // ✨ 批量获取所有历史消息的块（性能优化）
        const messageIds = recentHistory.map(m => m.id);
        const blocksMap = await MessageBlocksRepository.getBlocksByMessageIds(messageIds);

        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const blocks = blocksMap.get(msg.id) || [];

            // ✨ 从块中组合内容（按 sortOrder 排序）
            const sortedBlocks = blocks.sort((a, b) => a.sortOrder - b.sortOrder);

            let content = '';

            // 组合 TEXT 块内容
            const textBlocks = sortedBlocks.filter(b => b.type === 'TEXT');
            if (textBlocks.length > 0) {
              content = textBlocks.map(b => b.content).join('');
            } else if (msg.text) {
              // ⚠️ 兼容旧数据：如果没有块，回退到 message.text
              content = msg.text;
              logger.warn('[useMessageSender] 消息没有块，使用旧的 message.text', {
                messageId: msg.id,
              });
            }

            // 附加工具块信息（如果有）
            if (msg.role === 'assistant') {
              const toolBlocks = sortedBlocks.filter(b => b.type === 'TOOL');

              if (toolBlocks.length > 0) {
                const toolResults = toolBlocks.map(block => {
                  const status = block.status === 'SUCCESS' ? '✅ 成功' : block.status === 'ERROR' ? '❌ 失败' : '⏳ 执行中';
                  const args = block.toolArgs ? `\n参数: ${block.toolArgs}` : '';
                  return `\n\n[工具调用: ${block.toolName}${args}]\n状态: ${status}\n结果: ${block.content}`;
                }).join('\n');

                content += toolResults;

                logger.debug('[useMessageSender] 历史消息包含工具块', {
                  messageId: msg.id,
                  toolBlockCount: toolBlocks.length,
                  toolNames: toolBlocks.map(b => b.toolName),
                });
              }
            }

            msgs.push({
              role: msg.role,
              content,
            });
          }
        }
      }

      // 添加当前用户消息
      const userMessage = await buildMessageContent(
        text,
        attachments,
        provider,
        model,
        textFileContents,
        searchResults
      );
      msgs.push(userMessage);

      logger.debug('[useMessageSender] 🔍 消息数组详情', {
        总消息数: msgs.length,
        消息列表: msgs.map((m, i) => ({
          索引: i,
          角色: m.role,
          内容长度: typeof m.content === 'string' ? m.content.length : (Array.isArray(m.content) ? m.content.length : 0),
          内容预览: typeof m.content === 'string' ? m.content.substring(0, 50) : '[多段内容]',
        })),
        是否首轮: isFirstTurn,
        会话ID: cid,
      });

      logger.debug('[useMessageSender] 发送消息', {
        提供商: provider,
        模型: model,
        温度: parseFloat(temperature.toFixed(1)),
        最大令牌: maxTokens || '自动',
        上下文轮数: contextCount,
      });

      onProgress?.('streaming');

      const controller = new AbortController();
      abortRef.current = controller;

      let acc = '';

      // 思考链相关状态
      let thinkingId: string | null = null;
      let thinkingContent = '';
      let thinkingStartTime: number | null = null;
      let lastThinkingUpdateAt = 0;

      // ✨ 块管理器（统一管理所有块：正文TEXT、工具TOOL等）
      const blockManager = new BlockManager(assistant!.id);
      logger.debug('[useMessageSender] BlockManager 已初始化', {
        messageId: assistant!.id,
      });

      // ✨ 创建初始的正文块（TEXT 类型）
      const textBlock = await blockManager.addBlock({
        type: 'TEXT',
        status: 'SUCCESS',
        content: '',
      });
      logger.debug('[useMessageSender] 正文块已创建', { blockId: textBlock.id });

      await streamCompletion({
        provider,
        model,
        messages: msgs,
        temperature,
        maxTokens,
        abortSignal: controller.signal,
        enableMcpTools: options.enableMcpTools === true,
        onToken: async (d) => {
          acc += d;
          // ✨ 新方式：更新 TEXT 块（BlockManager 内部有 200ms 节流）
          await blockManager.updateBlock(textBlock.id, {
            content: acc,
          });
        },
        onThinkingStart: async () => {
          thinkingStartTime = Date.now();
          thinkingContent = '';

          try {
            const rec = await ThinkingChainRepository.addThinkingChain({
              messageId: assistant!.id,
              content: '',
              startTime: thinkingStartTime,
              endTime: thinkingStartTime,
              durationMs: 0,
            });
            thinkingId = rec.id;
            logger.debug('[useMessageSender] 思考链开始并创建记录', { thinkingId });
            appEvents.emit(AppEvents.MESSAGE_CHANGED);
          } catch (e) {
            logger.error('[useMessageSender] 创建思考链记录失败', e);
          }
        },
        onThinkingToken: async (delta) => {
          thinkingContent += delta;
          if (thinkingId) {
            const now = Date.now();
            if (now - lastThinkingUpdateAt > 120) {
              lastThinkingUpdateAt = now;
              try {
                await ThinkingChainRepository.updateThinkingChainContent(thinkingId, thinkingContent);
                appEvents.emit(AppEvents.MESSAGE_CHANGED);
              } catch (e) {
                // 忽略单次失败
              }
            }
          }
        },
        onThinkingEnd: async () => {
          if (thinkingId && thinkingStartTime) {
            const endTime = Date.now();
            const durationMs = endTime - thinkingStartTime;
            try {
              await ThinkingChainRepository.updateThinkingChainContent(thinkingId, thinkingContent);
              await ThinkingChainRepository.updateThinkingChainEnd(thinkingId, endTime, durationMs);

              logger.debug('[useMessageSender] 思考链已完成并保存', {
                thinkingId,
                messageId: assistant!.id,
                durationMs: `${(durationMs / 1000).toFixed(1)}秒`,
                contentLength: thinkingContent.length,
              });

              appEvents.emit(AppEvents.MESSAGE_CHANGED);
            } catch (e) {
              logger.error('[useMessageSender] 结束保存思考链失败', e);
            }
          }
        },
        // ✨ MCP 工具调用回调（Cherry Studio 设计参考）
        onToolCall: async (toolName, args) => {
          try {
            logger.info('[useMessageSender] 🔧 工具调用开始', { toolName, args });

            // 创建 PENDING 状态的工具块
            await blockManager.addBlock({
              type: 'TOOL',
              status: 'PENDING',
              content: '', // 初始内容为空，等待工具执行结果
              toolCallId: `${toolName}_${Date.now()}`, // 生成唯一的工具调用 ID
              toolName,
              toolArgs: args,
            });

            logger.debug('[useMessageSender] 工具块已创建（PENDING）', { toolName });
          } catch (error) {
            logger.error('[useMessageSender] 创建工具块失败', error, { toolName });
          }
        },
        onToolResult: async (toolName, result) => {
          try {
            logger.info('[useMessageSender] ✅ 工具执行完成', { toolName, result });

            // 查找对应的工具块（通过 toolName 匹配）
            const blocks = blockManager.getBlocks();
            const toolBlock = blocks.find(
              b => b.type === 'TOOL' && b.toolName === toolName && b.status === 'PENDING'
            );

            if (!toolBlock) {
              logger.warn('[useMessageSender] 未找到对应的工具块', { toolName });
              return;
            }

            // 格式化工具结果
            const formattedResult = typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2);

            // 更新工具块状态和结果
            await blockManager.updateBlock(toolBlock.id, {
              content: formattedResult,
              status: 'SUCCESS',
            });

            logger.debug('[useMessageSender] 工具块已更新（SUCCESS）', {
              toolName,
              resultLength: formattedResult.length,
            });
          } catch (error) {
            logger.error('[useMessageSender] 更新工具块失败', error, { toolName });
          }
        },
        onDone: async () => {
          // ✨ 清理 BlockManager（确保所有块都已写入数据库）
          try {
            await blockManager.cleanup();
            logger.debug('[useMessageSender] BlockManager 已清理');
          } catch (error) {
            logger.error('[useMessageSender] 清理 BlockManager 失败', error);
          }

          await MessageRepository.updateMessageStatus(assistant!.id, 'sent');

          setIsGenerating(false);
          onProgress?.('done');

          if (isFirstTurn) {
            try {
              void autoNameConversation(cid!);
            } catch (e) {
              logger.warn('[useMessageSender] auto naming error', e);
            }
          }
        },
        onError: async (e) => {
          // ✨ 清理 BlockManager（无论成功还是失败）
          try {
            await blockManager.cleanup();
            logger.debug('[useMessageSender] BlockManager 已清理（错误处理）');
          } catch (cleanupError) {
            logger.error('[useMessageSender] 清理 BlockManager 失败', cleanupError);
          }

          // 用户主动取消，静默处理
          if (isUserCanceled(e)) {
            logger.debug('[useMessageSender] 用户主动取消请求');
            if (assistant) {
              // 检查TEXT块内容，如果内容很少则删除消息
              const blocks = blockManager.getBlocks();
              const textBlocks = blocks.filter(b => b.type === 'TEXT');
              const totalText = textBlocks.map(b => b.content).join('');

              if (totalText.trim().length < 10) {
                await MessageRepository.deleteMessage(assistant.id);
                logger.debug('[useMessageSender] 已删除空的助手消息');
              } else {
                await MessageRepository.updateMessageStatus(assistant.id, 'failed');
                logger.debug('[useMessageSender] 助手消息已标记为失败状态');
              }
            }
            setIsGenerating(false);
            return;
          }

          // 真实错误
          logger.error('[useMessageSender] Stream error', e);
          if (assistant) {
            await MessageRepository.updateMessageStatus(assistant.id, 'failed');
          }
          setIsGenerating(false);
          setError(e as Error);
          throw e;
        },
      });
    } catch (error) {
      // 用户主动取消（外层捕获，一般不会到这里，因为 onError 已处理）
      if (isUserCanceled(error)) {
        logger.debug('[useMessageSender] 用户主动取消请求（外层捕获）');
        if (assistant) {
          await MessageRepository.updateMessageStatus(assistant.id, 'failed');
          logger.debug('[useMessageSender] 助手消息已标记为失败状态（外层）');
        }
        setIsGenerating(false);
        abortRef.current = null;
        return;
      }

      // 真实错误
      logger.error('[useMessageSender] Fatal error', error, {
        message: (error as Error)?.message,
      });

      if (assistant) {
        await MessageRepository.updateMessageStatus(assistant.id, 'failed');
      }
      setIsGenerating(false);
      setError(error as Error);
      throw error;
    } finally {
      abortRef.current = null;
    }
  }, [conversationId, onConversationChange, readTextFiles, buildMessageContent, isTextFile]);

  return {
    sendMessage,
    stopGeneration,
    isGenerating,
    error,
  };
}

/**
 * 判断是否为用户主动取消
 */
function isUserCanceled(error: unknown): boolean {
  const errorMessage = (error as Error)?.message || '';
  const errorName = (error as Error)?.name || '';

  return (
    errorMessage.includes('canceled') ||
    errorMessage.includes('cancelled') ||
    errorMessage.includes('abort') ||
    errorName === 'AbortError' ||
    errorName === 'CancelError'
  );
}
