/**
 * ConnectionHealthChecker - 连接健康检查器
 *
 * 负责通过定时心跳检测MCP连接的健康状态，并在连接断开时触发重连
 * 完全模仿Kelivo的心跳机制实现（第675-702行）
 *
 * 核心功能：
 * - 12秒定时Ping心跳
 * - 6秒Ping超时检测
 * - 连接断开自动触发重连回调
 * - 支持动态启动/停止心跳
 *
 * 创建日期: 2025-11-17
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { logger } from '@/utils/logger';

const log = logger.createNamespace('ConnectionHealthChecker');

/**
 * 连接状态枚举
 */
export enum ConnectionStatus {
  /** 空闲状态（未连接） */
  Idle = 'idle',

  /** 正在连接 */
  Connecting = 'connecting',

  /** 已连接 */
  Connected = 'connected',

  /** 错误状态（连接失败或断开） */
  Error = 'error',
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  /** 心跳间隔（毫秒），默认12000ms（12秒） */
  pingInterval?: number;

  /** Ping超时时间（毫秒），默认6000ms（6秒） */
  pingTimeout?: number;

  /** 连接状态变更回调 */
  onStatusChange?: (serverId: string, status: ConnectionStatus) => void;

  /** 连接健康检查失败回调（触发重连） */
  onHealthCheckFailed?: (serverId: string, error: any) => void;
}

/**
 * 服务器心跳信息
 */
interface HeartbeatInfo {
  serverId: string;
  client: Client;
  timer: ReturnType<typeof setInterval>;
  config: Required<HealthCheckConfig>;
  status: ConnectionStatus;
}

/**
 * ConnectionHealthChecker 类
 *
 * 使用示例：
 * ```typescript
 * const checker = new ConnectionHealthChecker();
 *
 * checker.start('server-1', client, {
 *   pingInterval: 12000,
 *   pingTimeout: 6000,
 *   onStatusChange: (id, status) => {
 *     console.log(`Server ${id} status: ${status}`);
 *   },
 *   onHealthCheckFailed: async (id, error) => {
 *     await reconnect(id);
 *   },
 * });
 * ```
 */
export class ConnectionHealthChecker {
  /** 心跳定时器映射表 (key: serverId) */
  private heartbeats: Map<string, HeartbeatInfo> = new Map();

  /** 默认配置 */
  private readonly defaultConfig: Required<Omit<HealthCheckConfig, 'onStatusChange' | 'onHealthCheckFailed'>> = {
    pingInterval: 12000, // 12秒
    pingTimeout: 6000,   // 6秒
  };

  /**
   * 启动指定服务器的心跳检查
   *
   * @param serverId 服务器ID
   * @param client MCP客户端实例
   * @param config 健康检查配置
   */
  start(serverId: string, client: Client, config?: HealthCheckConfig): void {
    // 如果已存在心跳，先停止
    this.stop(serverId);

    // 合并配置
    const fullConfig: Required<HealthCheckConfig> = {
      pingInterval: config?.pingInterval ?? this.defaultConfig.pingInterval,
      pingTimeout: config?.pingTimeout ?? this.defaultConfig.pingTimeout,
      onStatusChange: config?.onStatusChange ?? (() => {}),
      onHealthCheckFailed: config?.onHealthCheckFailed ?? (() => {}),
    };

    log.info('启动心跳检查', {
      serverId,
      pingInterval: `${fullConfig.pingInterval}ms`,
      pingTimeout: `${fullConfig.pingTimeout}ms`,
    });

    // 创建定时器
    const timer = setInterval(async () => {
      await this._performHealthCheck(serverId);
    }, fullConfig.pingInterval);

    // 保存心跳信息
    this.heartbeats.set(serverId, {
      serverId,
      client,
      timer,
      config: fullConfig,
      status: ConnectionStatus.Connected,
    });

    log.debug('心跳检查已启动', { serverId });
  }

  /**
   * 停止指定服务器的心跳检查
   *
   * @param serverId 服务器ID
   */
  stop(serverId: string): void {
    const heartbeat = this.heartbeats.get(serverId);
    if (!heartbeat) {
      return;
    }

    clearInterval(heartbeat.timer);
    this.heartbeats.delete(serverId);

    log.info('心跳检查已停止', { serverId });
  }

  /**
   * 停止所有心跳检查
   */
  stopAll(): void {
    const serverIds = Array.from(this.heartbeats.keys());

    log.info('停止所有心跳检查', { count: serverIds.length });

    for (const serverId of serverIds) {
      this.stop(serverId);
    }
  }

  /**
   * 获取指定服务器的连接状态
   *
   * @param serverId 服务器ID
   * @returns 连接状态
   */
  getStatus(serverId: string): ConnectionStatus {
    const heartbeat = this.heartbeats.get(serverId);
    return heartbeat?.status ?? ConnectionStatus.Idle;
  }

  /**
   * 手动更新服务器的连接状态
   *
   * @param serverId 服务器ID
   * @param status 新的连接状态
   */
  updateStatus(serverId: string, status: ConnectionStatus): void {
    const heartbeat = this.heartbeats.get(serverId);
    if (!heartbeat) {
      return;
    }

    const oldStatus = heartbeat.status;
    heartbeat.status = status;

    // 触发状态变更回调
    if (oldStatus !== status) {
      log.debug('连接状态已变更', { serverId, from: oldStatus, to: status });
      heartbeat.config.onStatusChange(serverId, status);
    }
  }

  /**
   * 获取所有正在监控的服务器ID
   *
   * @returns 服务器ID列表
   */
  getMonitoredServerIds(): string[] {
    return Array.from(this.heartbeats.keys());
  }

  /**
   * 获取监控的服务器数量
   *
   * @returns 服务器数量
   */
  getMonitoredCount(): number {
    return this.heartbeats.size;
  }

  // ============== 私有方法 ==============

  /**
   * 执行健康检查
   *
   * @param serverId 服务器ID
   */
  private async _performHealthCheck(serverId: string): Promise<void> {
    const heartbeat = this.heartbeats.get(serverId);
    if (!heartbeat) {
      return;
    }

    // 仅在连接状态为 Connected 时才执行心跳检查
    if (heartbeat.status !== ConnectionStatus.Connected) {
      log.debug('跳过心跳检查（状态不是Connected）', {
        serverId,
        currentStatus: heartbeat.status,
      });
      return;
    }

    try {
      log.debug('执行心跳检查', { serverId });

      // 调用 listTools 作为轻量级的连接存活检测
      // （Kelivo使用listTools，因为它相对廉价且所有MCP服务器都支持）
      const pingPromise = heartbeat.client.listTools();

      // 添加超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Ping超时（${heartbeat.config.pingTimeout}ms）`));
        }, heartbeat.config.pingTimeout);
      });

      await Promise.race([pingPromise, timeoutPromise]);

      // 心跳成功
      log.debug('心跳检查成功', { serverId });
    } catch (error: any) {
      // 心跳失败
      log.warn('心跳检查失败', { serverId, error: error?.message });

      // 更新状态为错误
      this.updateStatus(serverId, ConnectionStatus.Error);

      // 触发健康检查失败回调（通常触发重连）
      try {
        await heartbeat.config.onHealthCheckFailed(serverId, error);
      } catch (callbackError) {
        log.error('健康检查失败回调执行出错', { serverId, error: callbackError });
      }
    }
  }

  /**
   * 销毁健康检查器，清理所有资源
   */
  destroy(): void {
    log.info('销毁健康检查器');
    this.stopAll();
  }
}

/**
 * 默认的全局健康检查器实例
 */
export const healthChecker = new ConnectionHealthChecker();
