export const MIGRATION_0001 = `
PRAGMA foreign_keys = ON;

-- ============================================
-- 基础对话与消息结构
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  extra TEXT
);
CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived
  ON conversations(archived);
CREATE INDEX IF NOT EXISTS idx_conversations_archived_updated
  ON conversations(archived, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'sent',
  parent_id TEXT,
  extra TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time
  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status
  ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_conv_status
  ON messages(conversation_id, status);

-- ============================================
-- 附件与关联
-- ============================================
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  mime TEXT,
  name TEXT,
  uri TEXT NOT NULL,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  sha256 TEXT,
  created_at INTEGER NOT NULL,
  extra TEXT
);
CREATE INDEX IF NOT EXISTS idx_attachments_kind
  ON attachments(kind);
CREATE INDEX IF NOT EXISTS idx_attachments_created
  ON attachments(created_at DESC);

CREATE TABLE IF NOT EXISTS message_attachments (
  message_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  PRIMARY KEY (message_id, attachment_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_attachment
  ON message_attachments(attachment_id);

-- ============================================
-- 模型与思考链
-- ============================================
CREATE TABLE IF NOT EXISTS provider_models (
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  label TEXT,
  enabled INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, model_id)
);

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
CREATE INDEX IF NOT EXISTS idx_thinking_chains_message
  ON thinking_chains(message_id);

-- ============================================
-- MCP 服务器配置
-- ============================================
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  description TEXT,
  headers TEXT,
  timeout INTEGER DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================
-- 快捷短语
-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_quick_phrases_sort
  ON quick_phrases(sort_order);

-- ============================================
-- 消息块（文本/工具）
-- ============================================
CREATE TABLE IF NOT EXISTS message_blocks (
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
CREATE INDEX IF NOT EXISTS idx_message_blocks_message
  ON message_blocks(message_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_message_blocks_tool_call
  ON message_blocks(tool_call_id) WHERE tool_call_id IS NOT NULL;
`;
