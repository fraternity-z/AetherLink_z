import { Conversation, now, uuid, safeJSON } from '@/storage/core';
import { execute, queryAll, queryOne } from '@/storage/sqlite/db';
import { withRepositoryContext } from './error-handler';

export const ChatRepository = {
  async getConversation(id: string): Promise<Conversation | null> {
    return withRepositoryContext('ChatRepository', 'getConversation', { conversationId: id, table: 'conversations' }, async () => {
      const row = await queryOne<any>(
        `SELECT id, title, created_at as createdAt, updated_at as updatedAt, archived
         FROM conversations WHERE id = ?`,
        [id]
      );
      if (!row) return null;
      return { ...row, archived: !!row.archived };
    });
  },

  async createConversation(title?: string | null): Promise<Conversation> {
    return withRepositoryContext('ChatRepository', 'createConversation', { title, table: 'conversations' }, async () => {
      const id = uuid();
      const createdAt = now();
      const updatedAt = createdAt;
      const archived = false;
      await execute(
        `INSERT INTO conversations (id, title, created_at, updated_at, archived, extra) VALUES (?, ?, ?, ?, ?, NULL)`,
        [id, title ?? null, createdAt, updatedAt, archived ? 1 : 0]
      );
      return { id, title: title ?? null, createdAt, updatedAt, archived };
    });
  },

  async createConversationWithId(input: {
    id: string;
    title?: string | null;
    createdAt: number;
    updatedAt: number;
    archived: boolean;
  }): Promise<Conversation> {
    return withRepositoryContext('ChatRepository', 'createConversationWithId', { conversationId: input.id, table: 'conversations' }, async () => {
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
    });
  },

  async listConversations(opts?: { archived?: boolean; limit?: number; offset?: number }): Promise<Conversation[]> {
    return withRepositoryContext('ChatRepository', 'listConversations', { options: opts, table: 'conversations' }, async () => {
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
    });
  },

  async renameConversation(id: string, title: string): Promise<void> {
    return withRepositoryContext('ChatRepository', 'renameConversation', { conversationId: id, title, table: 'conversations' }, async () => {
      await execute(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`, [title, now(), id]);
    });
  },

  async archiveConversation(id: string, archived = true): Promise<void> {
    return withRepositoryContext('ChatRepository', 'archiveConversation', { conversationId: id, archived, table: 'conversations' }, async () => {
      await execute(`UPDATE conversations SET archived = ?, updated_at = ? WHERE id = ?`, [archived ? 1 : 0, now(), id]);
    });
  },

  async deleteConversation(id: string): Promise<void> {
    return withRepositoryContext('ChatRepository', 'deleteConversation', { conversationId: id, table: 'conversations' }, async () => {
      // ON DELETE CASCADE will remove messages and links; attachments cleanup is handled via orphan GC elsewhere if needed
      await execute(`DELETE FROM conversations WHERE id = ?`, [id]);
    });
  },

  async getContextResetAt(id: string): Promise<number | null> {
    return withRepositoryContext('ChatRepository', 'getContextResetAt', { conversationId: id, table: 'conversations' }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      if (!row || !row.extra) return null;
      const obj = safeJSON.parse<any>(row.extra);
      const v = obj?.contextResetAt;
      return typeof v === 'number' ? v : null;
    });
  },

  async setContextResetAt(id: string, ts: number): Promise<void> {
    return withRepositoryContext('ChatRepository', 'setContextResetAt', { conversationId: id, timestamp: ts, table: 'conversations' }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      let obj: any = {};
      if (row?.extra) {
        const parsed = safeJSON.parse<any>(row.extra);
        if (parsed && typeof parsed === 'object') obj = parsed;
      }
      obj.contextResetAt = ts;
      await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(obj), now(), id]);
    });
  },

  async clearContextReset(id: string): Promise<void> {
    return withRepositoryContext('ChatRepository', 'clearContextReset', { conversationId: id, table: 'conversations' }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      if (!row?.extra) return;
      const obj = safeJSON.parse<any>(row.extra) || {};
      if (obj.contextResetAt !== undefined) delete obj.contextResetAt;
      const newExtra = Object.keys(obj).length ? JSON.stringify(obj) : null;
      await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [newExtra, now(), id]);
    });
  },

  /**
   * 获取话题级别的模型选择
   * @param id 话题 ID
   * @returns { provider, model } 或 null（如果未设置则使用默认模型）
   */
  async getConversationModel(id: string): Promise<{ provider: string; model: string } | null> {
    return withRepositoryContext('ChatRepository', 'getConversationModel', { conversationId: id, table: 'conversations' }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      if (!row || !row.extra) return null;
      const obj = safeJSON.parse<any>(row.extra);
      if (!obj?.selectedModel) return null;
      const { provider, model } = obj.selectedModel;
      return (provider && model) ? { provider, model } : null;
    });
  },

  /**
   * 设置话题级别的模型选择（用户选择优先）
   * @param id 话题 ID
   * @param provider 提供商 ID
   * @param model 模型 ID
   */
  async setConversationModel(id: string, provider: string, model: string): Promise<void> {
    return withRepositoryContext('ChatRepository', 'setConversationModel', {
      conversationId: id,
      provider,
      model,
      table: 'conversations'
    }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      let obj: any = {};
      if (row?.extra) {
        const parsed = safeJSON.parse<any>(row.extra);
        if (parsed && typeof parsed === 'object') obj = parsed;
      }
      obj.selectedModel = { provider, model };
      await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(obj), now(), id]);
    });
  },

  /**
   * 清除话题级别的模型选择（恢复使用默认模型）
   * @param id 话题 ID
   */
  async clearConversationModel(id: string): Promise<void> {
    return withRepositoryContext('ChatRepository', 'clearConversationModel', { conversationId: id, table: 'conversations' }, async () => {
      const row = await queryOne<any>(`SELECT extra FROM conversations WHERE id = ?`, [id]);
      if (!row?.extra) return;
      const obj = safeJSON.parse<any>(row.extra) || {};
      if (obj.selectedModel !== undefined) delete obj.selectedModel;
      const newExtra = Object.keys(obj).length ? JSON.stringify(obj) : null;
      await execute(`UPDATE conversations SET extra = ?, updated_at = ? WHERE id = ?`, [newExtra, now(), id]);
    });
  },
};
