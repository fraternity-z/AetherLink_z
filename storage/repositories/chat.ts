import { Conversation, now, uuid, safeJSON } from '@/storage/core';
import { execute, queryAll, queryOne } from '@/storage/sqlite/db';

export const ChatRepository = {
  async getConversation(id: string): Promise<Conversation | null> {
    const row = await queryOne<any>(
      `SELECT id, title, created_at as createdAt, updated_at as updatedAt, archived
       FROM conversations WHERE id = ?`,
      [id]
    );
    if (!row) return null;
    return { ...row, archived: !!row.archived };
  },

  async createConversation(title?: string | null): Promise<Conversation> {
    const id = uuid();
    const createdAt = now();
    const updatedAt = createdAt;
    const archived = false;
    await execute(
      `INSERT INTO conversations (id, title, created_at, updated_at, archived, extra) VALUES (?, ?, ?, ?, ?, NULL)`,
      [id, title ?? null, createdAt, updatedAt, archived ? 1 : 0]
    );
    return { id, title: title ?? null, createdAt, updatedAt, archived };
  },

  async createConversationWithId(input: {
    id: string;
    title?: string | null;
    createdAt: number;
    updatedAt: number;
    archived: boolean;
  }): Promise<Conversation> {
    await execute(
      `INSERT INTO conversations (id, title, created_at, updated_at, archived, extra) VALUES (?, ?, ?, ?, ?, NULL)`,
      [input.id, input.title ?? null, input.createdAt, input.updatedAt, input.archived ? 1 : 0]
    );
    return {
      id: input.id,
      title: input.title ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      archived: input.archived,
    };
  },

  async listConversations(opts?: { archived?: boolean; limit?: number; offset?: number }): Promise<Conversation[]> {
    const archived = opts?.archived;
    const limit = Math.max(0, opts?.limit ?? 50);
    const offset = Math.max(0, opts?.offset ?? 0);
    const where = archived === undefined ? '' : 'WHERE archived = ?';
    const params: any[] = [];
    if (archived !== undefined) params.push(archived ? 1 : 0);
    params.push(limit, offset);
    const rows = await queryAll<any>(
      `SELECT id, title, created_at as createdAt, updated_at as updatedAt, archived
       FROM conversations ${where}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows.map(r => ({ ...r, archived: !!r.archived }));
  },

  async renameConversation(id: string, title: string): Promise<void> {
    await execute(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`, [title, now(), id]);
  },

  async archiveConversation(id: string, archived = true): Promise<void> {
    await execute(`UPDATE conversations SET archived = ?, updated_at = ? WHERE id = ?`, [archived ? 1 : 0, now(), id]);
  },

  async deleteConversation(id: string): Promise<void> {
    // ON DELETE CASCADE will remove messages and links; attachments cleanup is handled via orphan GC elsewhere if needed
    await execute(`DELETE FROM conversations WHERE id = ?`, [id]);
  },

  async getContextResetAt(id: string): Promise<number | null> {
    const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
    if (!row || !row.extra) return null;
    const obj = safeJSON.parse<any>(row.extra);
    const v = obj?.contextResetAt;
    return typeof v === 'number' ? v : null;
  },

  async setContextResetAt(id: string, ts: number): Promise<void> {
    const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
    let obj: any = {};
    if (row?.extra) {
      const parsed = safeJSON.parse<any>(row.extra);
      if (parsed && typeof parsed === 'object') obj = parsed;
    }
    obj.contextResetAt = ts;
    await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(obj), now(), id]);
  },

  async clearContextReset(id: string): Promise<void> {
    const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
    if (!row?.extra) return;
    const obj = safeJSON.parse<any>(row.extra) || {};
    if (obj.contextResetAt !== undefined) delete obj.contextResetAt;
    const newExtra = Object.keys(obj).length ? JSON.stringify(obj) : null;
    await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [newExtra, now(), id]);
  },
};
