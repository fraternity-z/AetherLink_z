/**
 * 数据库迁移 0004: MCP (Model Context Protocol) 服务器表
 *
 * 创建 mcp_servers 表用于存储 MCP 服务器配置
 * 支持 Streamable HTTP 传输协议
 *
 * 注意：索引创建移至 ensureMcpServersSchema() 中，
 * 确保在列修复后再创建索引，避免 "no such column" 错误
 *
 * 创建日期: 2025-11-12
 */

export const MIGRATION_0004 = `
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
`;
