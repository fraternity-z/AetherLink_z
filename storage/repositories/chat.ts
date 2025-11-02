import { Conversation, now, uuid } from '@/storage/core';
import { execute, queryAll } from '@/storage/sqlite/db';

export const ChatRepository = {
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
};

