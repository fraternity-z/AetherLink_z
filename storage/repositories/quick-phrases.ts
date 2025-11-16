import { QuickPhrase, uuid, now } from '@/storage/core';
import { execute, queryOne, queryAll } from '@/storage/sqlite/db';
import { withRepositoryContext } from './error-handler';

/**
 * QuickPhrasesRepository - 快捷短语数据访问层
 *
 * 提供快捷短语的 CRUD 操作，支持用户在聊天中快速插入常用文本
 */
export const QuickPhrasesRepository = {
  /**
   * 创建快捷短语
   */
  async create(input: {
    title: string;
    content: string;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number;
  }): Promise<QuickPhrase> {
    return withRepositoryContext('QuickPhrasesRepository', 'create', {
      table: 'quick_phrases',
      title: input.title,
    }, async () => {
      const id = uuid();
      const timestamp = now();
      const sortOrder = input.sortOrder ?? 0;

      await execute(
        `INSERT INTO quick_phrases (id, title, content, icon, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.title,
          input.content,
          input.icon ?? null,
          input.color ?? null,
          sortOrder,
          timestamp,
          timestamp,
        ]
      );

      return {
        id,
        title: input.title,
        content: input.content,
        icon: input.icon ?? null,
        color: input.color ?? null,
        sortOrder,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });
  },

  /**
   * 获取所有快捷短语(按 sortOrder 排序)
   */
  async getAll(): Promise<QuickPhrase[]> {
    return withRepositoryContext('QuickPhrasesRepository', 'getAll', {
      table: 'quick_phrases',
    }, async () => {
      const rows = await queryAll<any>(
        `SELECT * FROM quick_phrases ORDER BY sort_order ASC, created_at ASC`
      );

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        icon: row.icon,
        color: row.color,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    });
  },

  /**
   * 根据 ID 获取快捷短语
   */
  async getById(id: string): Promise<QuickPhrase | null> {
    return withRepositoryContext('QuickPhrasesRepository', 'getById', {
      table: 'quick_phrases',
      id,
    }, async () => {
      const row = await queryOne<any>(
        `SELECT * FROM quick_phrases WHERE id = ?`,
        [id]
      );

      if (!row) return null;

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        icon: row.icon,
        color: row.color,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  },

  /**
   * 更新快捷短语
   */
  async update(id: string, updates: Partial<Omit<QuickPhrase, 'id' | 'createdAt'>>): Promise<void> {
    return withRepositoryContext('QuickPhrasesRepository', 'update', {
      table: 'quick_phrases',
      id,
      updates,
    }, async () => {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }

      if (updates.content !== undefined) {
        fields.push('content = ?');
        values.push(updates.content);
      }

      if (updates.icon !== undefined) {
        fields.push('icon = ?');
        values.push(updates.icon);
      }

      if (updates.color !== undefined) {
        fields.push('color = ?');
        values.push(updates.color);
      }

      if (updates.sortOrder !== undefined) {
        fields.push('sort_order = ?');
        values.push(updates.sortOrder);
      }

      // 始终更新 updatedAt
      fields.push('updated_at = ?');
      values.push(now());

      if (fields.length === 1) return; // 仅更新 updatedAt，不执行

      values.push(id); // WHERE 条件

      await execute(
        `UPDATE quick_phrases SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    });
  },

  /**
   * 删除快捷短语
   */
  async delete(id: string): Promise<void> {
    return withRepositoryContext('QuickPhrasesRepository', 'delete', {
      table: 'quick_phrases',
      id,
    }, async () => {
      await execute(`DELETE FROM quick_phrases WHERE id = ?`, [id]);
    });
  },

  /**
   * 批量更新排序顺序
   * @param ids 按新顺序排列的 ID 数组
   */
  async reorder(ids: string[]): Promise<void> {
    return withRepositoryContext('QuickPhrasesRepository', 'reorder', {
      table: 'quick_phrases',
      count: ids.length,
    }, async () => {
      if (ids.length === 0) return;

      // 使用事务批量更新
      const updates = ids.map((id, index) => ({
        id,
        sortOrder: index,
      }));

      for (const { id, sortOrder } of updates) {
        await execute(
          `UPDATE quick_phrases SET sort_order = ?, updated_at = ? WHERE id = ?`,
          [sortOrder, now(), id]
        );
      }
    });
  },

  /**
   * 搜索快捷短语(按标题或内容模糊匹配)
   */
  async search(keyword: string): Promise<QuickPhrase[]> {
    return withRepositoryContext('QuickPhrasesRepository', 'search', {
      table: 'quick_phrases',
      keyword,
    }, async () => {
      const pattern = `%${keyword}%`;
      const rows = await queryAll<any>(
        `SELECT * FROM quick_phrases
         WHERE title LIKE ? OR content LIKE ?
         ORDER BY sort_order ASC, created_at ASC`,
        [pattern, pattern]
      );

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        icon: row.icon,
        color: row.color,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    });
  },
};
