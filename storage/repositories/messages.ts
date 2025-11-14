import { Message, Role, now, uuid, ThinkingChain } from '@/storage/core';
import { execute, queryAll, queryOne } from '@/storage/sqlite/db';
import { logger } from '@/utils/logger';
import { appEvents, AppEvents } from '@/utils/events';

// ============================================
// 文本缓写（流式合并写入）
// ============================================
type TextBufferState = {
  latestText: string;
  timer: ReturnType<typeof setTimeout> | null;
  debounceMs: number;
};

const messageTextBuffers: Map<string, TextBufferState> = new Map();

async function persistMessageTextOnce(id: string, text: string): Promise<void> {
  await execute(`UPDATE messages SET text = ? WHERE id = ?`, [text, id]);
  // 与 updateMessageText 保持一致：使用节流事件，避免频繁重渲染
  appEvents.emitThrottled(AppEvents.MESSAGE_CHANGED, 200);
}

export const MessageRepository = {
  async addMessage(input: {
    conversationId: string;
    role: Role;
    text?: string;
    attachmentIds?: string[];
    status?: 'pending' | 'sent' | 'failed';
    parentId?: string | null;
    extra?: any;
  }): Promise<Message> {
    const id = uuid();
    const createdAt = now();
    const status = input.status ?? 'sent';
    await execute(
      `INSERT INTO messages (id, conversation_id, role, text, created_at, status, parent_id, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        id,
        input.conversationId,
        input.role,
        input.text ?? null,
        createdAt,
        status,
        input.parentId ?? null,
        input.extra ? JSON.stringify(input.extra) : null,
      ]
    );
    // update conversation updated_at
    await execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [createdAt, input.conversationId]);
    // link attachments if any
    if (input.attachmentIds?.length) {
      for (const aid of input.attachmentIds) {
        await execute(`INSERT OR IGNORE INTO message_attachments (message_id, attachment_id) VALUES (?, ?)`, [id, aid]);
      }
    }
    // 触发消息变化事件，通知 UI 更新
    appEvents.emit(AppEvents.MESSAGE_CHANGED, input.conversationId);
    return {
      id,
      conversationId: input.conversationId,
      role: input.role,
      text: input.text ?? null,
      createdAt,
      status,
      parentId: input.parentId ?? null,
      extra: input.extra,
    };
  },

  async addMessageWithId(input: {
    id: string;
    conversationId: string;
    role: Role;
    text?: string;
    createdAt: number;
    status?: 'pending' | 'sent' | 'failed';
    parentId?: string | null;
    extra?: any;
  }): Promise<Message> {
    const status = input.status ?? 'sent';
    await execute(
      `INSERT INTO messages (id, conversation_id, role, text, created_at, status, parent_id, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.conversationId,
        input.role,
        input.text ?? null,
        input.createdAt,
        status,
        input.parentId ?? null,
        input.extra ? JSON.stringify(input.extra) : null,
      ]
    );
    // 触发消息变化事件，通知 UI 更新
    appEvents.emit(AppEvents.MESSAGE_CHANGED, input.conversationId);
    return {
      id: input.id,
      conversationId: input.conversationId,
      role: input.role,
      text: input.text ?? null,
      createdAt: input.createdAt,
      status,
      parentId: input.parentId ?? null,
      extra: input.extra,
    };
  },

  async listMessages(conversationId: string, opts?: { limit?: number; before?: number; after?: number }): Promise<Message[]> {
    const limit = Math.max(1, opts?.limit ?? 50);
    const before = opts?.before ?? Number.MAX_SAFE_INTEGER;
    const after = opts?.after ?? -1;
    const rows = await queryAll<any>(
      `SELECT id,
              conversation_id as conversationId,
              role,
              text,
              created_at as createdAt,
              status,
              parent_id as parentId,
              extra
       FROM messages
       WHERE conversation_id = ? AND created_at < ? AND created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, before, after, limit]
    );
    // 解析 extra 字段，保持与 addMessage 行为一致
    return rows.map((r: any) => ({
      ...r,
      extra: r.extra ? JSON.parse(r.extra) : undefined,
    }));
  },

  async updateMessageText(id: string, text: string): Promise<void> {
    await execute(`UPDATE messages SET text = ? WHERE id = ?`, [text, id]);
    // 🚀 使用节流事件触发（AI 流式响应时避免频繁重渲染）
    appEvents.emitThrottled(AppEvents.MESSAGE_CHANGED, 200);
  },

  /**
   * 缓写文本：仅缓存，不立即写库，等待窗口期结束统一写入
   *
   * @deprecated 已废弃！请使用 BlockManager 的文本块缓冲机制替代。
   * 新实现在 services/messageStreaming/BlockManager.ts 中。
   *
   * @param id 消息ID
   * @param text 最新完整文本（将覆盖以前的缓存）
   * @param debounceMs 去抖时间窗，默认200ms
   */
  bufferMessageText(id: string, text: string, debounceMs = 200): void {
    const state = messageTextBuffers.get(id) ?? { latestText: '', timer: null, debounceMs };
    state.latestText = text;
    state.debounceMs = debounceMs;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    state.timer = setTimeout(() => {
      // 定时落库：统一使用 try/catch（不 await 调用方，不阻塞回调）
      (async () => {
        try {
          await persistMessageTextOnce(id, state.latestText);
        } catch (e) {
          logger.debug('[MessageRepository] single persist failed (debounced); will be covered by flush/end', e);
        }
      })();
      state.timer = null;
    }, state.debounceMs);
    messageTextBuffers.set(id, state);
  },

  /**
   * 立即写入当前缓冲的文本（如有）
   *
   * @deprecated 已废弃！请使用 BlockManager.flushBlock() 替代。
   */
  async flushBufferedMessageText(id: string): Promise<void> {
    const state = messageTextBuffers.get(id);
    if (!state) return;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    await persistMessageTextOnce(id, state.latestText);
  },

  /**
   * 结束缓写：刷新一次并清理缓冲状态
   *
   * @deprecated 已废弃！请使用 BlockManager.cleanup() 替代。
   */
  async endBufferedMessageText(id: string): Promise<void> {
    const state = messageTextBuffers.get(id);
    if (!state) return;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    await persistMessageTextOnce(id, state.latestText);
    messageTextBuffers.delete(id);
  },

  async updateMessageStatus(id: string, status: 'pending' | 'sent' | 'failed'): Promise<void> {
    await execute(`UPDATE messages SET status = ? WHERE id = ?`, [status, id]);
    // 触发消息变化事件，通知 UI 更新
    appEvents.emit(AppEvents.MESSAGE_CHANGED);
  },

  async deleteMessage(id: string): Promise<void> {
    await execute(`DELETE FROM messages WHERE id = ?`, [id]);
    // 触发消息变化事件，通知 UI 更新
    appEvents.emit(AppEvents.MESSAGE_CHANGED);
  },

  async clearConversationMessages(conversationId: string): Promise<void> {
    // 清空指定对话的所有消息（但保留对话本身）
    await execute(`DELETE FROM messages WHERE conversation_id = ?`, [conversationId]);
    // 更新对话的 updated_at 时间戳
    await execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [now(), conversationId]);
  },

  async getAllMessages(): Promise<Message[]> {
    const rows = await queryAll<any>(
      `SELECT id,
              conversation_id as conversationId,
              role,
              text,
              created_at as createdAt,
              status,
              parent_id as parentId,
              extra
       FROM messages
       ORDER BY created_at ASC`
    );
    return rows.map((r: any) => ({
      ...r,
      extra: r.extra ? JSON.parse(r.extra) : undefined,
    }));
  },

  async getMessageCountByRole(): Promise<{ role: Role; count: number }[]> {
    const rows = await queryAll<any>(
      `SELECT role, COUNT(*) as count FROM messages GROUP BY role`
    );
    return rows;
  },

  /**
   * 获取单个消息及其关联的思考链(如果有)
   */
  async getMessageWithThinkingChain(
    messageId: string
  ): Promise<{ message: Message; thinkingChain: ThinkingChain | null } | null> {
    const messageRow = await queryOne<any>(
      `SELECT id, conversation_id as conversationId, role, text, created_at as createdAt, status, parent_id as parentId, extra
       FROM messages
       WHERE id = ?`,
      [messageId]
    );

    if (!messageRow) return null;

    const message: Message = {
      id: messageRow.id,
      conversationId: messageRow.conversationId,
      role: messageRow.role,
      text: messageRow.text,
      createdAt: messageRow.createdAt,
      status: messageRow.status,
      parentId: messageRow.parentId,
      extra: messageRow.extra ? JSON.parse(messageRow.extra) : undefined,
    };

    // 查询关联的思考链
    const thinkingRow = await queryOne<any>(
      `SELECT * FROM thinking_chains WHERE message_id = ?`,
      [messageId]
    );

    const thinkingChain: ThinkingChain | null = thinkingRow
      ? {
          id: thinkingRow.id,
          messageId: thinkingRow.message_id,
          content: thinkingRow.content,
          startTime: thinkingRow.start_time,
          endTime: thinkingRow.end_time,
          durationMs: thinkingRow.duration_ms,
          tokenCount: thinkingRow.token_count,
          extra: thinkingRow.extra ? JSON.parse(thinkingRow.extra) : undefined,
        }
      : null;

    return { message, thinkingChain };
  },
};
