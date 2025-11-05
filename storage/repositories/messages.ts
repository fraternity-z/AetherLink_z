import { Message, Role, now, uuid } from '@/storage/core';
import { execute, queryAll } from '@/storage/sqlite/db';

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

  async listMessages(conversationId: string, opts?: { limit?: number; before?: number }): Promise<Message[]> {
    const limit = Math.max(1, opts?.limit ?? 50);
    const before = opts?.before ?? Number.MAX_SAFE_INTEGER;
    const rows = await queryAll<any>(
      `SELECT id, conversation_id as conversationId, role, text, created_at as createdAt, status, parent_id as parentId
       FROM messages
       WHERE conversation_id = ? AND created_at < ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, before, limit]
    );
    return rows;
  },

  async updateMessageText(id: string, text: string): Promise<void> {
    await execute(`UPDATE messages SET text = ? WHERE id = ?`, [text, id]);
  },

  async updateMessageStatus(id: string, status: 'pending' | 'sent' | 'failed'): Promise<void> {
    await execute(`UPDATE messages SET status = ? WHERE id = ?`, [status, id]);
  },

  async deleteMessage(id: string): Promise<void> {
    await execute(`DELETE FROM messages WHERE id = ?`, [id]);
  },

  async clearConversationMessages(conversationId: string): Promise<void> {
    // 清空指定对话的所有消息（但保留对话本身）
    await execute(`DELETE FROM messages WHERE conversation_id = ?`, [conversationId]);
    // 更新对话的 updated_at 时间戳
    await execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [now(), conversationId]);
  },

  async getAllMessages(): Promise<Message[]> {
    const rows = await queryAll<any>(
      `SELECT id, conversation_id as conversationId, role, text, created_at as createdAt, status, parent_id as parentId
       FROM messages
       ORDER BY created_at ASC`
    );
    return rows;
  },

  async getMessageCountByRole(): Promise<{ role: Role; count: number }[]> {
    const rows = await queryAll<any>(
      `SELECT role, COUNT(*) as count FROM messages GROUP BY role`
    );
    return rows;
  },
};
