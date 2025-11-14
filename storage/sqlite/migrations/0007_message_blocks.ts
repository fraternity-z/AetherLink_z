/**
 * 数据库迁移 0007: 消息块(Message Blocks)表
 *
 * 创建 message_blocks 表用于存储消息的结构化内容块
 * 支持文本块、MCP 工具调用块、思考链块等
 *
 * 设计理念参考 Cherry Studio:
 * - 每个消息可以包含多个块
 * - 工具块用于展示 MCP 工具的执行过程和结果
 * - 块状态独立管理，支持流式更新
 *
 * 创建日期: 2025-11-14
 */

export const MIGRATION_0007 = `
CREATE TABLE IF NOT EXISTS message_blocks (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('TEXT', 'TOOL', 'THINKING')),
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

-- 索引：按消息 ID 查询块（高频查询）
CREATE INDEX IF NOT EXISTS idx_message_blocks_message ON message_blocks(message_id, sort_order);

-- 索引：按工具调用 ID 查询块（工具回调时使用）
CREATE INDEX IF NOT EXISTS idx_message_blocks_tool_call ON message_blocks(tool_call_id) WHERE tool_call_id IS NOT NULL;
`;
