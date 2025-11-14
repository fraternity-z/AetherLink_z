import { MessageBlock, MessageBlockType, MessageBlockStatus, uuid, now } from '@/storage/core';
import { execute, queryOne, queryAll } from '@/storage/sqlite/db';

/**
 * MessageBlocksRepository - 消息块数据访问层
 *
 * 提供消息块(Message Blocks)的 CRUD 操作
 * 支持文本块、MCP 工具调用块、思考链块等
 *
 * 设计理念参考 Cherry Studio:
 * - 每个消息可以包含多个块
 * - 块状态独立管理，支持流式更新
 * - 工具块用于展示 MCP 工具的执行过程和结果
 */
export const MessageBlocksRepository = {
  /**
   * 添加消息块
   */
  async addBlock(input: {
    messageId: string;
    type: MessageBlockType;
    status: MessageBlockStatus;
    content: string;
    sortOrder: number;
    toolCallId?: string | null;
    toolName?: string | null;
    toolArgs?: string | null;
    extra?: any;
  }): Promise<MessageBlock> {
    const id = uuid();
    const createdAt = now();

    await execute(
      `INSERT INTO message_blocks (
        id, message_id, type, status, content, sort_order,
        tool_call_id, tool_name, tool_args,
        created_at, updated_at, extra
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.messageId,
        input.type,
        input.status,
        input.content,
        input.sortOrder,
        input.toolCallId ?? null,
        input.toolName ?? null,
        input.toolArgs ?? null,
        createdAt,
        createdAt,
        input.extra ? JSON.stringify(input.extra) : null,
      ]
    );

    return {
      id,
      messageId: input.messageId,
      type: input.type,
      status: input.status,
      content: input.content,
      sortOrder: input.sortOrder,
      toolCallId: input.toolCallId ?? null,
      toolName: input.toolName ?? null,
      toolArgs: input.toolArgs ?? null,
      createdAt,
      updatedAt: createdAt,
      extra: input.extra,
    };
  },

  /**
   * 更新块内容和状态（用于流式更新）
   */
  async updateBlock(input: {
    id: string;
    content?: string;
    status?: MessageBlockStatus;
  }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.content !== undefined) {
      fields.push('content = ?');
      values.push(input.content);
    }

    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }

    fields.push('updated_at = ?');
    values.push(now());

    values.push(input.id);

    if (fields.length > 0) {
      await execute(
        `UPDATE message_blocks SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  /**
   * 根据块 ID 获取块
   */
  async getBlockById(id: string): Promise<MessageBlock | null> {
    const row = await queryOne<any>(
      `SELECT * FROM message_blocks WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return this._mapRowToBlock(row);
  },

  /**
   * 根据工具调用 ID 获取块
   * （工具回调时使用）
   */
  async getBlockByToolCallId(toolCallId: string): Promise<MessageBlock | null> {
    const row = await queryOne<any>(
      `SELECT * FROM message_blocks WHERE tool_call_id = ?`,
      [toolCallId]
    );

    if (!row) return null;

    return this._mapRowToBlock(row);
  },

  /**
   * 获取消息的所有块（按 sortOrder 排序）
   */
  async getBlocksByMessageId(messageId: string): Promise<MessageBlock[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM message_blocks WHERE message_id = ? ORDER BY sort_order ASC`,
      [messageId]
    );

    return rows.map(row => this._mapRowToBlock(row));
  },

  /**
   * 批量获取多个消息的块
   * （用于消息列表加载，提升性能）
   */
  async getBlocksByMessageIds(messageIds: string[]): Promise<Map<string, MessageBlock[]>> {
    if (messageIds.length === 0) return new Map();

    const placeholders = messageIds.map(() => '?').join(',');
    const rows = await queryAll<any>(
      `SELECT * FROM message_blocks WHERE message_id IN (${placeholders}) ORDER BY sort_order ASC`,
      messageIds
    );

    const map = new Map<string, MessageBlock[]>();
    for (const row of rows) {
      const block = this._mapRowToBlock(row);
      const messageId = row.message_id;

      if (!map.has(messageId)) {
        map.set(messageId, []);
      }
      map.get(messageId)!.push(block);
    }

    return map;
  },

  /**
   * 删除块
   */
  async deleteBlock(id: string): Promise<void> {
    await execute(`DELETE FROM message_blocks WHERE id = ?`, [id]);
  },

  /**
   * 删除消息的所有块
   */
  async deleteBlocksByMessageId(messageId: string): Promise<void> {
    await execute(`DELETE FROM message_blocks WHERE message_id = ?`, [messageId]);
  },

  /**
   * 获取消息的块数量
   */
  async getBlockCountByMessageId(messageId: string): Promise<number> {
    const row = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM message_blocks WHERE message_id = ?`,
      [messageId]
    );
    return row?.count || 0;
  },

  /**
   * 获取消息的下一个 sortOrder 值
   * （用于添加新块时确定排序位置）
   */
  async getNextSortOrder(messageId: string): Promise<number> {
    const row = await queryOne<{ max_order: number | null }>(
      `SELECT MAX(sort_order) as max_order FROM message_blocks WHERE message_id = ?`,
      [messageId]
    );
    return (row?.max_order ?? -1) + 1;
  },

  /**
   * 将数据库行映射为 MessageBlock 对象
   * @private
   */
  _mapRowToBlock(row: any): MessageBlock {
    return {
      id: row.id,
      messageId: row.message_id,
      type: row.type as MessageBlockType,
      status: row.status as MessageBlockStatus,
      content: row.content,
      sortOrder: row.sort_order,
      toolCallId: row.tool_call_id ?? null,
      toolName: row.tool_name ?? null,
      toolArgs: row.tool_args ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extra: row.extra ? JSON.parse(row.extra) : undefined,
    };
  },
};
