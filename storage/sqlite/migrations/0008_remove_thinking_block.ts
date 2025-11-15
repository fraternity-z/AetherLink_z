/**
 * 数据库迁移 0008: 清理废弃的 THINKING 消息块类型
 *
 * 目标：
 * - 删除历史上遗留的 THINKING 类型数据（思考链已拥有独立表）
 * - 重新创建 message_blocks 表，使 CHECK 约束仅允许 TEXT/TOOL
 * - 继续保留原有索引结构
 *
 * 创建日期: 2025-11-16
 */

export const MIGRATION_0008 = `
-- 删除历史遗留的 THINKING 块（如有）
DELETE FROM message_blocks WHERE type = 'THINKING';

-- 采用临时表重建 schema，移除 THINKING 校验
DROP TABLE IF EXISTS message_blocks_tmp;

CREATE TABLE IF NOT EXISTS message_blocks_tmp (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('TEXT', 'TOOL')),
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'SUCCESS', 'ERROR')),
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  tool_call_id TEXT,
  tool_name TEXT,
  tool_args TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  extra TEXT,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

INSERT INTO message_blocks_tmp (
  id,
  message_id,
  type,
  status,
  content,
  sort_order,
  tool_call_id,
  tool_name,
  tool_args,
  created_at,
  updated_at,
  extra
)
SELECT
  id,
  message_id,
  type,
  status,
  content,
  sort_order,
  tool_call_id,
  tool_name,
  tool_args,
  created_at,
  updated_at,
  extra
FROM message_blocks
WHERE type IN ('TEXT', 'TOOL');

DROP TABLE IF EXISTS message_blocks;
ALTER TABLE message_blocks_tmp RENAME TO message_blocks;

CREATE INDEX IF NOT EXISTS idx_message_blocks_message ON message_blocks(message_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_message_blocks_tool_call ON message_blocks(tool_call_id) WHERE tool_call_id IS NOT NULL;
`;
