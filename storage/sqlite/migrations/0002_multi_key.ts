/**
 * 数据库迁移 0002 - 多 Key 轮询功能
 *
 * 新增表：
 * 1. provider_api_keys - 存储多个 API Key 配置
 * 2. provider_key_management - 存储负载均衡策略配置
 */
export const MIGRATION_0002 = `
-- ============================================
-- 提供商多 Key 管理
-- ============================================

-- API Key 配置表
CREATE TABLE IF NOT EXISTS provider_api_keys (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT,
  is_enabled INTEGER DEFAULT 1,
  is_primary INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 5,

  -- 使用统计
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_used INTEGER,
  consecutive_failures INTEGER DEFAULT 0,

  -- 状态信息
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled', 'error')),
  last_error TEXT,

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- 约束：同一提供商的 Key 不能重复
  UNIQUE(provider_id, key)
);

-- 索引：按提供商查询
CREATE INDEX IF NOT EXISTS idx_provider_keys_provider
  ON provider_api_keys(provider_id);

-- 索引：按提供商和状态查询（用于选择可用 Key）
CREATE INDEX IF NOT EXISTS idx_provider_keys_status
  ON provider_api_keys(provider_id, status, is_enabled);

-- 索引：按优先级查询
CREATE INDEX IF NOT EXISTS idx_provider_keys_priority
  ON provider_api_keys(provider_id, priority);

-- Key 管理配置表
CREATE TABLE IF NOT EXISTS provider_key_management (
  provider_id TEXT PRIMARY KEY,
  strategy TEXT DEFAULT 'round_robin' CHECK(strategy IN ('round_robin', 'priority', 'least_used', 'random')),
  enable_multi_key INTEGER DEFAULT 0,
  max_failures_before_disable INTEGER DEFAULT 3,
  failure_recovery_time_minutes INTEGER DEFAULT 5,
  updated_at INTEGER NOT NULL
);
`;
