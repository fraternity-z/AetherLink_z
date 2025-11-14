/**
 * BlockManager - 消息块状态管理核心类
 *
 * 职责：
 * - 管理当前消息的所有块（内存状态 + 数据库持久化）
 * - 提供块的添加、更新、删除操作
 * - 智能写入策略：工具块立即写入，文本块缓冲写入
 * - 维护 toolCallId → blockId 映射（用于工具回调时快速查找）
 *
 * 设计理念参考 Cherry Studio:
 * - 块类型改变/完成时立即写入数据库
 * - 同类型块使用节流缓存，减少数据库操作
 * - 工具块始终立即写入，确保状态一致性
 *
 * 创建日期: 2025-11-14
 */

import { MessageBlock, MessageBlockType, MessageBlockStatus, now } from '@/storage/core';
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

  /** 文本块缓冲写入定时器 */
  private textBlockFlushTimer: ReturnType<typeof setTimeout> | null = null;

  /** 文本块缓冲写入延迟（毫秒） */
  private readonly TEXT_BLOCK_FLUSH_DELAY = 200;

  /** 待写入的块 ID 集合 */
  private pendingFlushBlockIds: Set<string> = new Set();

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

    // 创建块对象
    const block = await MessageBlocksRepository.addBlock({
      messageId: this.messageId,
      type: input.type,
      status: input.status,
      content: input.content,
      sortOrder,
      toolCallId: input.toolCallId ?? null,
      toolName: input.toolName ?? null,
      toolArgs: input.toolArgs ? JSON.stringify(input.toolArgs) : null,
    });

    // 添加到内存列表
    this.blocks.push(block);

    // 如果是工具块，建立映射
    if (input.type === 'TOOL' && input.toolCallId) {
      this.toolCallMap.set(input.toolCallId, block.id);
      log.debug('工具块映射已建立', {
        toolCallId: input.toolCallId,
        blockId: block.id,
        toolName: input.toolName,
      });
    }

    // 🔔 触发消息变更事件
    appEvents.emit(AppEvents.MESSAGE_CHANGED);

    log.debug('块已添加', {
      blockId: block.id,
      type: block.type,
      status: block.status,
      sortOrder,
    });

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

    // 智能写入策略
    const shouldFlushImmediately =
      block.type === 'TOOL' || // 工具块立即写入
      updates.status !== undefined || // 状态变更立即写入
      block.status === 'ERROR' || // 错误状态立即写入
      block.status === 'SUCCESS'; // 成功状态立即写入

    if (shouldFlushImmediately) {
      // 立即写入数据库
      await this.flushBlock(blockId);
      log.debug('块已立即写入数据库', {
        blockId,
        type: block.type,
        status: block.status,
        reason: updates.status !== undefined ? '状态变更' : '工具块/错误状态',
      });
    } else {
      // 文本块使用缓冲写入（节流）
      this.scheduleTextBlockFlush(blockId);
    }

    // 🔔 触发消息变更事件
    appEvents.emit(AppEvents.MESSAGE_CHANGED);

    log.debug('块已更新', {
      blockId,
      type: block.type,
      oldStatus,
      newStatus: block.status,
      contentLength: block.content.length,
    });
  }

  /**
   * 立即将块写入数据库
   *
   * @param blockId 块 ID
   */
  async flushBlock(blockId: string): Promise<void> {
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) {
      log.warn('写入块失败：块不存在', { blockId });
      return;
    }

    try {
      await MessageBlocksRepository.updateBlock({
        id: blockId,
        content: block.content,
        status: block.status,
      });

      // 从待写入集合中移除
      this.pendingFlushBlockIds.delete(blockId);

      log.debug('块已写入数据库', {
        blockId,
        type: block.type,
        status: block.status,
        contentLength: block.content.length,
      });
    } catch (error) {
      log.error('写入块失败', error, { blockId });
    }
  }

  /**
   * 计划文本块的缓冲写入
   * （节流策略：200ms 内的多次更新合并为一次数据库写入）
   *
   * @param blockId 块 ID
   */
  private scheduleTextBlockFlush(blockId: string): void {
    // 添加到待写入集合
    this.pendingFlushBlockIds.add(blockId);

    // 清除旧的定时器
    if (this.textBlockFlushTimer) {
      clearTimeout(this.textBlockFlushTimer);
    }

    // 设置新的定时器
    this.textBlockFlushTimer = setTimeout(async () => {
      await this.flushPendingBlocks();
    }, this.TEXT_BLOCK_FLUSH_DELAY);
  }

  /**
   * 写入所有待写入的块
   */
  private async flushPendingBlocks(): Promise<void> {
    const blockIds = Array.from(this.pendingFlushBlockIds);
    if (blockIds.length === 0) return;

    log.debug('批量写入文本块', { count: blockIds.length });

    for (const blockId of blockIds) {
      await this.flushBlock(blockId);
    }

    this.pendingFlushBlockIds.clear();
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
    // 清除定时器
    if (this.textBlockFlushTimer) {
      clearTimeout(this.textBlockFlushTimer);
      this.textBlockFlushTimer = null;
    }

    // 写入所有待写入的块
    await this.flushPendingBlocks();

    // 清空映射
    this.toolCallMap.clear();

    log.debug('BlockManager 已清理', {
      messageId: this.messageId,
      totalBlocks: this.blocks.length,
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
}
