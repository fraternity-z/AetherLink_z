import { ThinkingChain, uuid, now } from '@/storage/core';
import { execute, queryOne, queryAll } from '@/storage/sqlite/db';
import { withRepositoryContext } from './error-handler';

/**
 * ThinkingChainRepository - 思考链数据访问层
 *
 * 提供思考链(Chain of Thought/Reasoning)的 CRUD 操作
 * 支持的模型: OpenAI o1/o3, DeepSeek R1, Anthropic Claude 3.7+ 等
 */
export const ThinkingChainRepository = {
  /**
   * 添加思考链记录
   */
  async addThinkingChain(input: {
    messageId: string;
    content: string;
    startTime: number;
    endTime: number;
    durationMs: number;
    tokenCount?: number | null;
    extra?: any;
  }): Promise<ThinkingChain> {
    return withRepositoryContext('ThinkingChainRepository', 'addThinkingChain', { messageId: input.messageId, table: 'thinking_chains' }, async () => {
      const id = uuid();
      await execute(
        `INSERT INTO thinking_chains (id, message_id, content, start_time, end_time, duration_ms, token_count, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.messageId,
          input.content,
          input.startTime,
          input.endTime,
          input.durationMs,
          input.tokenCount ?? null,
          input.extra ? JSON.stringify(input.extra) : null,
        ]
      );

      return {
        id,
        messageId: input.messageId,
        content: input.content,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMs: input.durationMs,
        tokenCount: input.tokenCount ?? null,
        extra: input.extra,
      };
    });
  },

  /**
   * 根据消息 ID 获取思考链
   */
  async getThinkingChainByMessageId(messageId: string): Promise<ThinkingChain | null> {
    return withRepositoryContext('ThinkingChainRepository', 'getThinkingChainByMessageId', { messageId, table: 'thinking_chains' }, async () => {
      const row = await queryOne<any>(
        `SELECT * FROM thinking_chains WHERE message_id = ?`,
        [messageId]
      );

      if (!row) return null;

      return {
        id: row.id,
        messageId: row.message_id,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMs: row.duration_ms,
        tokenCount: row.token_count,
        extra: row.extra ? JSON.parse(row.extra) : undefined,
      };
    });
  },

  /**
   * 根据思考链 ID 获取思考链
   */
  async getThinkingChainById(id: string): Promise<ThinkingChain | null> {
    return withRepositoryContext('ThinkingChainRepository', 'getThinkingChainById', { thinkingChainId: id, table: 'thinking_chains' }, async () => {
      const row = await queryOne<any>(
        `SELECT * FROM thinking_chains WHERE id = ?`,
        [id]
      );

      if (!row) return null;

      return {
        id: row.id,
        messageId: row.message_id,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMs: row.duration_ms,
        tokenCount: row.token_count,
        extra: row.extra ? JSON.parse(row.extra) : undefined,
      };
    });
  },

  /**
   * 更新思考链内容(用于流式更新)
   */
  async updateThinkingChainContent(id: string, content: string): Promise<void> {
    return withRepositoryContext('ThinkingChainRepository', 'updateThinkingChainContent', { thinkingChainId: id, table: 'thinking_chains' }, async () => {
      await execute(
        `UPDATE thinking_chains SET content = ? WHERE id = ?`,
        [content, id]
      );
    });
  },

  /**
   * 更新思考链的结束时间和耗时
   */
  async updateThinkingChainEnd(id: string, endTime: number, durationMs: number): Promise<void> {
    return withRepositoryContext('ThinkingChainRepository', 'updateThinkingChainEnd', { thinkingChainId: id, table: 'thinking_chains' }, async () => {
      await execute(
        `UPDATE thinking_chains SET end_time = ?, duration_ms = ? WHERE id = ?`,
        [endTime, durationMs, id]
      );
    });
  },

  /**
   * 删除思考链
   */
  async deleteThinkingChain(id: string): Promise<void> {
    return withRepositoryContext('ThinkingChainRepository', 'deleteThinkingChain', { thinkingChainId: id, table: 'thinking_chains' }, async () => {
      await execute(`DELETE FROM thinking_chains WHERE id = ?`, [id]);
    });
  },

  /**
   * 根据消息 ID 删除思考链
   */
  async deleteThinkingChainByMessageId(messageId: string): Promise<void> {
    return withRepositoryContext('ThinkingChainRepository', 'deleteThinkingChainByMessageId', { messageId, table: 'thinking_chains' }, async () => {
      await execute(`DELETE FROM thinking_chains WHERE message_id = ?`, [messageId]);
    });
  },

  /**
   * 批量获取多个消息的思考链(用于消息列表加载)
   */
  async getThinkingChainsByMessageIds(messageIds: string[]): Promise<Map<string, ThinkingChain>> {
    return withRepositoryContext('ThinkingChainRepository', 'getThinkingChainsByMessageIds', { messageCount: messageIds.length, table: 'thinking_chains' }, async () => {
      if (messageIds.length === 0) return new Map();

      const placeholders = messageIds.map(() => '?').join(',');
      const rows = await queryAll<any>(
        `SELECT * FROM thinking_chains WHERE message_id IN (${placeholders})`,
        messageIds
      );

      const map = new Map<string, ThinkingChain>();
      for (const row of rows) {
        map.set(row.message_id, {
          id: row.id,
          messageId: row.message_id,
          content: row.content,
          startTime: row.start_time,
          endTime: row.end_time,
          durationMs: row.duration_ms,
          tokenCount: row.token_count,
          extra: row.extra ? JSON.parse(row.extra) : undefined,
        });
      }

      return map;
    });
  },
};
