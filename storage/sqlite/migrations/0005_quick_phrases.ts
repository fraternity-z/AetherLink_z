/**
 * 数据库迁移 0005: 快捷短语(Quick Phrases)表
 *
 * 创建 quick_phrases 表用于存储用户的常用短语
 * 用户可以在设置中管理快捷短语，在聊天界面快速插入常用文本
 *
 * 创建日期: 2025-11-13
 */

export const MIGRATION_0005 = `
CREATE TABLE IF NOT EXISTS quick_phrases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quick_phrases_sort ON quick_phrases(sort_order);
`;
