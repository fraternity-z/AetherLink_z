/**
 * 数据库迁移 0006: 性能优化索引
 *
 * 添加关键查询路径的索引，提升数据库查询性能
 *
 * 性能提升预期:
 * - 附件批量查询: 50-80% 性能提升
 * - 消息状态筛选: 40-60% 性能提升
 * - 附件查找: 30-50% 性能提升
 *
 * 创建日期: 2025-11-14
 */

export const MIGRATION_0006 = `
-- ============================================
-- 附件关联查询优化 (MessageList 批量加载附件场景)
-- ============================================

-- message_attachments 表索引 (用于批量查询 "SELECT * FROM message_attachments WHERE message_id IN (...)")
CREATE INDEX IF NOT EXISTS idx_message_attachments_message
ON message_attachments(message_id);

-- message_attachments 表反向索引 (用于查询 "哪些消息使用了某个附件")
CREATE INDEX IF NOT EXISTS idx_message_attachments_attachment
ON message_attachments(attachment_id);

-- ============================================
-- 消息查询优化
-- ============================================

-- 消息状态筛选索引 (用于查询 "SELECT * FROM messages WHERE status = 'pending'")
CREATE INDEX IF NOT EXISTS idx_messages_status
ON messages(status);

-- 消息会话+状态复合索引 (用于查询 "SELECT * FROM messages WHERE conversation_id = ? AND status = ?")
CREATE INDEX IF NOT EXISTS idx_messages_conv_status
ON messages(conversation_id, status);

-- ============================================
-- 附件查询优化
-- ============================================

-- 附件类型筛选索引 (用于查询 "SELECT * FROM attachments WHERE kind = 'image'")
CREATE INDEX IF NOT EXISTS idx_attachments_kind
ON attachments(kind);

-- 附件创建时间索引 (用于按时间排序附件)
CREATE INDEX IF NOT EXISTS idx_attachments_created
ON attachments(created_at DESC);

-- ============================================
-- 对话查询优化
-- ============================================

-- 对话归档状态索引 (用于查询 "SELECT * FROM conversations WHERE archived = 0")
CREATE INDEX IF NOT EXISTS idx_conversations_archived
ON conversations(archived);

-- 对话归档+更新时间复合索引 (用于查询 "SELECT * FROM conversations WHERE archived = 0 ORDER BY updated_at DESC")
CREATE INDEX IF NOT EXISTS idx_conversations_archived_updated
ON conversations(archived, updated_at DESC);
`;
