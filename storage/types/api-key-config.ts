/**
 * API Key 配置类型定义
 * 用于多 Key 轮询和负载均衡
 */

import type { ProviderId } from '../repositories/providers';

/**
 * Key 状态
 */
export type KeyStatus = 'active' | 'disabled' | 'error';

/**
 * 负载均衡策略
 */
export type LoadBalanceStrategy = 'round_robin' | 'priority' | 'least_used' | 'random';

/**
 * API Key 配置
 */
export interface ApiKeyConfig {
  /** 唯一标识符（UUID） */
  id: string;

  /** 提供商 ID（openai, anthropic 等） */
  providerId: ProviderId;

  /** API Key 值（明文存储在SQLite，与单Key模式一致） */
  key: string;

  /** 可选的 Key 名称/备注 */
  name?: string;

  /** 是否启用 */
  isEnabled: boolean;

  /** 是否为主要密钥（UI 显示用） */
  isPrimary: boolean;

  /** 优先级 (1-10, 数字越小优先级越高) */
  priority: number;

  /** 使用统计 */
  usage: ApiKeyUsage;

  /** Key 状态 */
  status: KeyStatus;

  /** 最后的错误信息 */
  lastError?: string;

  /** 创建时间戳 */
  createdAt: number;

  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * API Key 使用统计
 */
export interface ApiKeyUsage {
  /** 总请求数 */
  totalRequests: number;

  /** 成功请求数 */
  successfulRequests: number;

  /** 失败请求数 */
  failedRequests: number;

  /** 最后使用时间戳 */
  lastUsed?: number;

  /** 连续失败次数 */
  consecutiveFailures: number;
}

/**
 * 提供商 Key 管理配置
 */
export interface ProviderKeyManagement {
  /** 提供商 ID */
  providerId: ProviderId;

  /** 负载均衡策略（目前只支持 round_robin） */
  strategy: LoadBalanceStrategy;

  /** 是否启用多 Key 模式 */
  enableMultiKey: boolean;

  /** 连续失败多少次后禁用（默认 3） */
  maxFailuresBeforeDisable: number;

  /** 冷却期（分钟，默认 5） */
  failureRecoveryTimeMinutes: number;

  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * Key 统计数据
 */
export interface KeyStats {
  /** 总数 */
  total: number;

  /** 正常状态数量 */
  active: number;

  /** 禁用状态数量 */
  disabled: number;

  /** 错误状态数量 */
  error: number;

  /** 总请求数 */
  totalRequests: number;

  /** 成功率（0-100） */
  successRate: number;
}

/**
 * Key 选择结果
 */
export interface KeySelectionResult {
  /** 选择的 Key（null 表示没有可用 Key） */
  key: ApiKeyConfig | null;

  /** 选择原因/说明 */
  reason: string;
}
