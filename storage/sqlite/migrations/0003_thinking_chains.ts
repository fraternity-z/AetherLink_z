/**
 * 数据库迁移 0003: 思考链(Thinking Chains)表
 *
 * 创建 thinking_chains 表用于存储 AI 模型的思考过程
 * 支持的模型: OpenAI o1/o3 系列、DeepSeek R1、Anthropic Claude 3.7+ 等
 *
 * 创建日期: 2025-11-08
 */

export const MIGRATION_0003 = `
CREATE TABLE IF NOT EXISTS thinking_chains (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  token_count INTEGER,
  extra TEXT,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_thinking_chains_message ON thinking_chains(message_id);
`;
