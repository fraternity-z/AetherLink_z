/**
 * BlockManager - 消息块状态管理核心类
 *
 * 职责：
 * - 管理当前消息的所有块（纯内存 streaming 状态 + 统一持久化）
 * - 提供块的添加、更新、删除操作
 * - 维护 toolCallId → blockId 映射（用于工具回调时快速查找）
 * - 通过事件将 streaming 内容推送到 UI，结束时一次性写入数据库
 *
 * 创建日期: 2025-11-14
 */

import { MessageBlock, MessageBlockType, MessageBlockStatus, now, uuid } from '@/storage/core';
import { MessageBlocksRepository } from '@/storage/repositories/message-blocks';
import { logger } from '@/utils/logger';
import { appEvents, AppEvents } from '@/utils/events';

const log = logger.createNamespace('BlockManager');

/**
 * 块管理器类
 */
export class BlockManager {
  /** 当前消息 ID */
  private messageId: string;

  /** 内存中的块列表（按 sortOrder 排序） */
  private blocks: MessageBlock[] = [];

  /** toolCallId → blockId 映射（用于工具回调时快速查找） */
  private toolCallMap: Map<string, string> = new Map();

  /** 是否已完成持久化，避免重复写入 */
  private persisted = false;

  constructor(messageId: string) {
    this.messageId = messageId;
    log.debug('BlockManager 初始化', { messageId });
  }

  /**
   * 添加块
   *
   * @param input 块输入参数
   * @returns 新创建的块
   */
  async addBlock(input: {
    type: MessageBlockType;
    status: MessageBlockStatus;
    content: string;
    toolCallId?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
  }): Promise<MessageBlock> {
    const sortOrder = this.blocks.length;

    const block: MessageBlock = {
      id: uuid(),
      messageId: this.messageId,
      type: input.type,
      status: input.status,
      content: input.content,
      sortOrder,
      toolCallId: input.toolCallId ?? null,
      toolName: input.toolName ?? null,
      toolArgs: input.toolArgs ? JSON.stringify(input.toolArgs) : null,
      createdAt: now(),
      updatedAt: now(),
    };

    this.blocks.push(block);

    if (input.type === 'TOOL' && input.toolCallId) {
      this.toolCallMap.set(input.toolCallId, block.id);
      // ⚡ 性能优化：工具块创建时使用 info 级别日志（更重要的事件）
      log.info('工具块已创建', {
        toolCallId: input.toolCallId,
        toolName: input.toolName,
        status: block.status,
      });
    }

    this.emitStreamingUpdate();

    // ⚡ 性能优化：仅在非 TEXT 块时打印日志（TEXT 块是正文，会频繁创建）
    if (block.type !== 'TEXT') {
      log.debug('块已添加', {
        blockId: block.id,
        type: block.type,
        status: block.status,
        sortOrder,
      });
    }

    return block;
  }

  /**
   * 更新块内容和状态
   *
   * @param blockId 块 ID
   * @param updates 更新字段
   */
  async updateBlock(
    blockId: string,
    updates: {
      content?: string;
      status?: MessageBlockStatus;
    }
  ): Promise<void> {
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) {
      log.warn('更新块失败：块不存在', { blockId });
      return;
    }

    const oldType = block.type;
    const oldStatus = block.status;

    // 更新内存中的块
    if (updates.content !== undefined) {
      block.content = updates.content;
    }
    if (updates.status !== undefined) {
      block.status = updates.status;
    }
    block.updatedAt = now();

    this.emitStreamingUpdate();

    // ⚡ 性能优化：移除频繁的块更新日志（流式响应时每个 token 都会触发）
    // 仅在状态改变时打印日志
    if (oldStatus !== block.status) {
      log.debug('块状态已变更', {
        blockId,
        type: block.type,
        oldStatus,
        newStatus: block.status,
        contentLength: block.content.length,
      });
    }
  }

  /** 将当前内存块写入数据库（仅在流式结束时调用） */
  async persistToRepository(): Promise<void> {
    if (this.persisted) {
      log.debug('跳过重复持久化', { messageId: this.messageId });
      return;
    }

    try {
      await MessageBlocksRepository.deleteBlocksByMessageId(this.messageId);
      for (const block of this.blocks) {
        await MessageBlocksRepository.addBlock({
          messageId: this.messageId,
          type: block.type,
          status: block.status,
          content: block.content,
          sortOrder: block.sortOrder,
          toolCallId: block.toolCallId ?? null,
          toolName: block.toolName ?? null,
          toolArgs: block.toolArgs ?? null,
        });
      }
      this.persisted = true;
      log.debug('消息块已持久化', { messageId: this.messageId, blockCount: this.blocks.length });
      appEvents.emit(AppEvents.MESSAGE_CHANGED);
    } catch (error) {
      log.error('持久化消息块失败', error, { messageId: this.messageId });
      throw error;
    }
  }

  /**
   * 通过 toolCallId 查找块
   *
   * @param toolCallId 工具调用 ID
   * @returns 块对象，若不存在则返回 null
   */
  getBlockByToolCallId(toolCallId: string): MessageBlock | null {
    const blockId = this.toolCallMap.get(toolCallId);
    if (!blockId) return null;

    return this.blocks.find(b => b.id === blockId) || null;
  }

  /**
   * 获取所有块
   *
   * @returns 块列表（按 sortOrder 排序）
   */
  getBlocks(): MessageBlock[] {
    return [...this.blocks];
  }

  /**
   * 清理资源
   * （在消息发送完成后调用）
   */
  async cleanup(): Promise<void> {
    const blockCount = this.blocks.length;
    this.toolCallMap.clear();
    this.emitStreamingClear();
    this.blocks = [];

    log.debug('BlockManager 已清理', {
      messageId: this.messageId,
      totalBlocks: blockCount,
    });
  }

  /**
   * 清除工具调用映射
   * （在工具完成后调用，防止内存泄漏）
   *
   * @param toolCallId 工具调用 ID
   */
  clearToolCallMapping(toolCallId: string): void {
    this.toolCallMap.delete(toolCallId);
    log.debug('工具调用映射已清除', { toolCallId });
  }

  /** 发出当前块的流式快照 */
  private emitStreamingUpdate(): void {
    const snapshot = this.blocks.map(block => ({ ...block }));
    appEvents.emit(AppEvents.MESSAGE_STREAMING_UPDATE, {
      messageId: this.messageId,
      blocks: snapshot,
    });
  }

  /** 通知 UI 当前流式消息已被清空 */
  private emitStreamingClear(): void {
    appEvents.emit(AppEvents.MESSAGE_STREAMING_UPDATE, {
      messageId: this.messageId,
      blocks: [],
    });
  }
}
