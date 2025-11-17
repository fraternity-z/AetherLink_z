/**
 * McpClient - MCP 客户端核心服务（完全重构版）
 *
 * 完全模仿Kelivo的实现方式，集成所有新特性：
 * - ✅ 心跳机制（12秒定时Ping + 6秒超时）
 * - ✅ 渐进式退避重连（600ms → 1200ms → 2400ms）
 * - ✅ Schema归一化引擎（修正AI生成的不规范参数）
 * - ✅ 智能错误分类（区分参数错误和网络错误）
 * - ✅ 敏感信息脱敏（日志安全）
 * - ✅ 状态管理（idle/connecting/connected/error）
 * - ✅ 缓存系统（保留AetherLink_z优势）
 * - ✅ 通知处理（MCP协议标准）
 *
 * 创建日期: 2025-11-17
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, type StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  PromptListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '@/utils/logger';
import { cacheManager, CacheKeys } from './CacheManager';
import { McpServersRepository } from '@/storage/repositories/mcp';
import { ConnectionHealthChecker, ConnectionStatus } from './ConnectionHealthChecker';
import { ErrorClassifier, ErrorCategory } from './ErrorClassifier';
import { SecurityUtils } from './SecurityUtils';
import { SchemaValidator } from './SchemaValidator';
import type {
  MCPServer,
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPResourceContent,
  MCPPrompt,
  MCPPromptResult,
  MCPHealthCheck,
} from '@/types/mcp';

const log = logger.createNamespace('McpClient');

/**
 * 客户端连接信息
 */
interface ClientConnection {
  client: Client;
  connectedAt: number;
  lastUsedAt: number;
  serverId: string;
  serverName: string;
  status: ConnectionStatus;
}

/**
 * McpClient 类（完全重构版）
 *
 * 使用示例：
 * ```typescript
 * const mcpClient = new McpClient();
 *
 * // 连接服务器
 * const server = await McpServersRepository.getServerById('server-1');
 * await mcpClient.connect(server);
 *
 * // 列出工具
 * const tools = await mcpClient.listTools('server-1');
 *
 * // 调用工具（自动Schema归一化 + 错误重试）
 * const result = await mcpClient.callTool('server-1', 'search_web', {
 *   query: 'React Native'
 * });
 * ```
 */
export class McpClient {
  /** 客户端连接池 (key: serverId) */
  private clients: Map<string, ClientConnection> = new Map();

  /** 待处理的连接初始化 Promise (key: serverId) */
  private pendingClients: Map<string, Promise<Client>> = new Map();

  /** 正在重连的服务器ID集合（防止重复重连） */
  private reconnecting: Set<string> = new Set();

  /** 服务器错误消息记录 (key: serverId) */
  private errors: Map<string, string> = new Map();

  /** 数据仓库实例 */
  private repo = McpServersRepository;

  /** 健康检查器实例 */
  private healthChecker = new ConnectionHealthChecker();

  /** 闲置连接的最大时间（毫秒），默认 10 分钟 */
  private readonly maxIdleTime: number = 10 * 60 * 1000;

  /** 自动清理定时器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    log.info('McpClient 初始化完成（完全重构版）');
    this.startAutoCleanup();
  }

  /**
   * 连接到MCP服务器
   *
   * @param server MCP服务器配置
   */
  async connect(server: MCPServer): Promise<void> {
    const serverId = server.id;

    // 如果已连接，直接返回
    if (this.isConnected(serverId)) {
      log.debug('服务器已连接', { serverId, serverName: server.name });
      return;
    }

    // 更新状态为 Connecting
    this._updateStatus(serverId, ConnectionStatus.Connecting);

    try {
      // 初始化客户端
      const client = await this.initClient(server);

      // 更新状态为 Connected
      this._updateStatus(serverId, ConnectionStatus.Connected);

      // 清除错误信息
      this.errors.delete(serverId);

      log.info('服务器连接成功', { serverId, serverName: server.name });

      // 🔥 启动心跳检查（Kelivo核心特性）
      this._startHeartbeat(serverId, client);

      // 🔥 刷新工具列表（Kelivo在连接成功后立即刷新）
      try {
        await this.refreshTools(serverId);
      } catch (error) {
        log.warn('刷新工具列表失败（不影响连接）', { serverId, error });
      }
    } catch (error: any) {
      log.error('服务器连接失败', { serverId, serverName: server.name, error });

      // 更新状态为 Error
      this._updateStatus(serverId, ConnectionStatus.Error);

      // 记录错误消息
      this.errors.set(serverId, error?.message ?? String(error));

      throw error;
    }
  }

  /**
   * 断开连接
   *
   * @param serverId 服务器ID
   */
  async disconnect(serverId: string): Promise<void> {
    log.info('断开服务器连接', { serverId });

    // 停止心跳
    this.healthChecker.stop(serverId);

    // 关闭客户端
    const conn = this.clients.get(serverId);
    if (conn) {
      try {
        await conn.client.close();
      } catch (error) {
        log.warn('关闭客户端时出错', { serverId, error });
      }
      this.clients.delete(serverId);
    }

    // 更新状态为 Idle
    this._updateStatus(serverId, ConnectionStatus.Idle);

    // 清除错误信息
    this.errors.delete(serverId);

    // 清除缓存
    cacheManager.clear(CacheKeys.serverPrefix(serverId));

    log.debug('服务器已断开连接', { serverId });
  }

  /**
   * 重连服务器（断开 + 重新连接）
   *
   * @param serverId 服务器ID
   */
  async reconnect(serverId: string): Promise<void> {
    log.info('重连服务器', { serverId });

    await this.disconnect(serverId);

    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    await this.connect(server);
  }

  /**
   * 🔥 渐进式退避重连（Kelivo核心特性）
   *
   * 重连策略：
   * - 第1次：延迟 600ms
   * - 第2次：延迟 1200ms
   * - 第3次：延迟 2400ms
   *
   * @param serverId 服务器ID
   * @param maxAttempts 最大重试次数（默认3次）
   * @returns 是否重连成功
   */
  async reconnectWithBackoff(serverId: string, maxAttempts: number = 3): Promise<boolean> {
    // 防止重复重连
    if (this.reconnecting.has(serverId)) {
      log.debug('跳过重连（已在重连中）', { serverId });
      return false;
    }

    this.reconnecting.add(serverId);

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log.info(`尝试重连`, { serverId, attempt, maxAttempts });

        // 计算延迟时间（渐进式退避）
        if (attempt > 1) {
          const delayMs = 600 * Math.pow(2, attempt - 2); // 600, 1200, 2400
          log.debug('等待后重连', { serverId, delayMs });
          await this._sleep(delayMs);
        }

        // 尝试重连
        try {
          await this.reconnect(serverId);

          // 检查是否连接成功
          if (this.isConnected(serverId)) {
            log.info('重连成功', { serverId, attempt });
            return true;
          }
        } catch (error) {
          log.warn(`重连失败（尝试 ${attempt}/${maxAttempts}）`, { serverId, error });
        }
      }

      log.error('重连失败（已达最大重试次数）', { serverId, maxAttempts });
      return false;
    } finally {
      this.reconnecting.delete(serverId);
    }
  }

  /**
   * 确保服务器已连接（如果未连接，尝试重连）
   *
   * @param serverId 服务器ID
   */
  async ensureConnected(serverId: string): Promise<void> {
    // 检查服务器是否启用
    const server = await this.repo.getServerById(serverId);
    if (!server || !server.isActive) {
      throw new Error(`服务器未启用或不存在: ${serverId}`);
    }

    // 如果已连接，直接返回
    if (this.isConnected(serverId)) {
      return;
    }

    // 尝试重连
    const success = await this.reconnectWithBackoff(serverId, 3);
    if (!success) {
      throw new Error(`无法连接到服务器: ${serverId}`);
    }
  }

  /**
   * 初始化或复用客户端连接
   *
   * @param server MCP 服务器配置
   * @returns Client 实例
   */
  async initClient(server: MCPServer): Promise<Client> {
    const serverId = server.id;

    // 1. 如果有待处理的连接，等待它完成
    const pendingClient = this.pendingClients.get(serverId);
    if (pendingClient) {
      log.debug(`等待待处理的连接`, { serverId, serverName: server.name });
      return pendingClient;
    }

    // 2. 检查现有连接是否可用
    const existingConn = this.clients.get(serverId);
    if (existingConn) {
      try {
        // Ping 测试连接
        const pingResult = await existingConn.client.ping({ timeout: 3000 });
        if (pingResult) {
          log.debug(`复用现有连接`, { serverId, serverName: server.name });
          existingConn.lastUsedAt = Date.now(); // 更新最后使用时间
          return existingConn.client;
        } else {
          // Ping 失败，移除连接
          log.warn(`连接 Ping 失败，移除连接`, { serverId });
          this.clients.delete(serverId);
        }
      } catch (error) {
        log.error(`连接 Ping 出错，移除连接`, { serverId, error });
        this.clients.delete(serverId);
      }
    }

    // 3. 创建新连接
    const initPromise = this._createNewClient(server);
    this.pendingClients.set(serverId, initPromise);

    try {
      const client = await initPromise;
      return client;
    } finally {
      this.pendingClients.delete(serverId);
    }
  }

  /**
   * 列出服务器的所有工具
   *
   * @param serverId 服务器 ID
   * @returns 工具列表
   */
  async listTools(serverId: string): Promise<MCPTool[]> {
    // 1. 检查缓存
    const cacheKey = CacheKeys.tools(serverId);
    const cached = cacheManager.get<MCPTool[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 3. 确保已连接
    await this.ensureConnected(serverId);

    // 4. 获取客户端
    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    // 更新最后使用时间
    conn.lastUsedAt = Date.now();

    // 5. 调用 listTools
    try {
      const result = await conn.client.listTools();

      const tools: MCPTool[] = result.tools.map((tool, idx) => ({
        id: `${server.id}:tool:${tool.name ?? idx}`,
        type: 'mcp',
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        outputSchema: tool.outputSchema as any,
        serverId: server.id,
        serverName: server.name ?? server.id,
        isBuiltIn: false,
      }));

      // 6. 缓存结果（5 分钟）
      cacheManager.set(cacheKey, tools, 5 * 60 * 1000);

      log.info(`列出工具成功`, {
        serverId,
        serverName: server.name,
        count: tools.length,
      });

      return tools;
    } catch (error) {
      log.error(`列出工具失败`, { serverId, serverName: server.name, error });
      ErrorClassifier.recordError(serverId, error);
      throw error;
    }
  }

  /**
   * 🔥 调用服务器工具（集成Schema归一化 + 智能错误重试）
   *
   * @param serverId 服务器 ID
   * @param name 工具名称
   * @param args 工具参数
   * @returns 工具执行结果
   */
  async callTool(
    serverId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    // 1. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 2. 确保已连接
    await this.ensureConnected(serverId);

    // 3. 获取客户端
    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    // 更新最后使用时间
    conn.lastUsedAt = Date.now();

    // 4. 🔥 获取工具Schema并归一化参数（Kelivo核心特性）
    let normalizedArgs = args;
    try {
      const tools = await this.listTools(serverId);
      const tool = tools.find((t) => t.name === name);
      if (tool && tool.inputSchema) {
        // Schema归一化
        normalizedArgs = SchemaValidator.normalizeBySchema(args, tool.inputSchema as any) as Record<string, unknown>;

        // 应用特殊工具修正
        normalizedArgs = SchemaValidator.applyToolFixer(name, normalizedArgs as Record<string, any>);

        if (JSON.stringify(normalizedArgs) !== JSON.stringify(args)) {
          log.debug('参数已归一化', {
            serverId,
            toolName: name,
            before: SecurityUtils.safeStringify(args),
            after: SecurityUtils.safeStringify(normalizedArgs),
          });
        }
      }
    } catch (error) {
      log.warn('参数归一化失败，使用原始参数', { serverId, toolName: name, error });
    }

    // 5. 调用工具
    try {
      log.info(`调用工具`, {
        serverId,
        serverName: server.name,
        toolName: name,
        args: SecurityUtils.safeStringify(normalizedArgs),
      });

      const result: any = await conn.client.callTool({
        name,
        arguments: normalizedArgs,
      });

      log.info(`工具调用成功`, {
        serverId,
        toolName: name,
        isError: result.isError,
      });

      const rawContent: any[] = Array.isArray(result?.content) ? result.content : [];
      const mappedContent = rawContent.map((item) => ({
        type: (item?.type as 'text' | 'image' | 'resource') ?? 'text',
        text: typeof item?.text === 'string' ? item.text : undefined,
        data: typeof item?.data === 'string' ? item.data : undefined,
        mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
        uri: typeof item?.uri === 'string' ? item.uri : undefined,
      }));

      const isError: boolean | undefined =
        typeof result?.isError === 'boolean' ? result.isError : undefined;

      return {
        content: mappedContent,
        isError,
      };
    } catch (error: any) {
      log.error(`工具调用失败`, {
        serverId,
        serverName: server.name,
        toolName: name,
        error: ErrorClassifier.getErrorDetails(error),
      });

      // 记录错误统计
      ErrorClassifier.recordError(serverId, error);

      // 🔥 智能错误处理（Kelivo核心特性）
      const category = ErrorClassifier.classify(error);

      // 如果是参数错误（-32602），不重试，直接抛出
      if (category === ErrorCategory.ParameterError) {
        log.warn('参数验证错误，不重试', { serverId, toolName: name });
        this.errors.set(serverId, error?.message ?? String(error));
        throw error;
      }

      // 如果是可重试错误（网络/超时/服务器），尝试重连并重试一次
      if (ErrorClassifier.isRetryable(category)) {
        log.info('检测到可重试错误，尝试重连并重试', { serverId, toolName: name, category });

        // 更新状态为 Error
        this._updateStatus(serverId, ConnectionStatus.Error);
        this.errors.set(serverId, error?.message ?? String(error));

        // 重连
        const reconnected = await this.reconnectWithBackoff(serverId, 3);

        if (reconnected && this.isConnected(serverId)) {
          log.info('重连成功，重试工具调用', { serverId, toolName: name });

          try {
            const result: any = await conn.client.callTool({
              name,
              arguments: normalizedArgs,
            });

            // 重试成功，更新状态
            this._updateStatus(serverId, ConnectionStatus.Connected);
            this.errors.delete(serverId);

            log.info(`工具调用重试成功`, { serverId, toolName: name });

            const rawContent: any[] = Array.isArray(result?.content) ? result.content : [];
            const mappedContent = rawContent.map((item) => ({
              type: (item?.type as 'text' | 'image' | 'resource') ?? 'text',
              text: typeof item?.text === 'string' ? item.text : undefined,
              data: typeof item?.data === 'string' ? item.data : undefined,
              mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
              uri: typeof item?.uri === 'string' ? item.uri : undefined,
            }));

            const isError: boolean | undefined =
              typeof result?.isError === 'boolean' ? result.isError : undefined;

            return {
              content: mappedContent,
              isError,
            };
          } catch (retryError: any) {
            log.error('工具调用重试失败', { serverId, toolName: name, error: retryError });
            ErrorClassifier.recordError(serverId, retryError);
            throw retryError;
          }
        }
      }

      throw error;
    }
  }

  /**
   * 刷新工具列表（从服务器重新获取并合并配置）
   *
   * @param serverId 服务器ID
   */
  async refreshTools(serverId: string): Promise<void> {
    log.info('刷新工具列表', { serverId });

    // 清除缓存
    cacheManager.delete(CacheKeys.tools(serverId));

    // 重新列出工具
    await this.listTools(serverId);
  }

  /**
   * 列出服务器的所有资源
   *
   * @param serverId 服务器 ID
   * @returns 资源列表
   */
  async listResources(serverId: string): Promise<MCPResource[]> {
    // 检查缓存
    const cacheKey = CacheKeys.resources(serverId);
    const cached = cacheManager.get<MCPResource[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    await this.ensureConnected(serverId);

    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    conn.lastUsedAt = Date.now();

    try {
      const result = await conn.client.listResources();

      const resources: MCPResource[] = result.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverId: server.id,
        serverName: server.name ?? server.id,
        size: typeof resource.size === 'number' ? resource.size : undefined,
        text: typeof resource.text === 'string' ? resource.text : undefined,
        blob: typeof resource.blob === 'string' ? resource.blob : undefined,
      }));

      cacheManager.set(cacheKey, resources, 60 * 60 * 1000);

      log.info(`列出资源成功`, {
        serverId,
        serverName: server.name,
        count: resources.length,
      });

      return resources;
    } catch (error) {
      log.error(`列出资源失败`, { serverId, serverName: server.name, error });
      ErrorClassifier.recordError(serverId, error);
      throw error;
    }
  }

  /**
   * 读取指定资源
   *
   * @param serverId 服务器 ID
   * @param uri 资源 URI
   * @returns 资源内容
   */
  async readResource(serverId: string, uri: string): Promise<MCPResourceContent> {
    const cacheKey = CacheKeys.resource(serverId, uri);
    const cached = cacheManager.get<MCPResourceContent>(cacheKey);
    if (cached) {
      return cached;
    }

    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    await this.ensureConnected(serverId);

    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    conn.lastUsedAt = Date.now();

    try {
      const result: any = await conn.client.readResource({ uri });
      const first = result?.contents?.[0] ?? {};
      const content: MCPResourceContent = {
        uri,
        text: typeof first?.text === 'string' ? first.text : undefined,
        blob: typeof first?.blob === 'string' ? first.blob : undefined,
        mimeType: typeof first?.mimeType === 'string' ? first.mimeType : undefined,
      };

      cacheManager.set(cacheKey, content, 30 * 60 * 1000);

      log.info(`读取资源成功`, { serverId, uri });

      return content;
    } catch (error) {
      log.error(`读取资源失败`, { serverId, uri, error });
      ErrorClassifier.recordError(serverId, error);
      throw error;
    }
  }

  /**
   * 列出服务器的所有提示词
   *
   * @param serverId 服务器 ID
   * @returns 提示词列表
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const cacheKey = CacheKeys.prompts(serverId);
    const cached = cacheManager.get<MCPPrompt[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    await this.ensureConnected(serverId);

    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    conn.lastUsedAt = Date.now();

    try {
      const result = await conn.client.listPrompts();

      const prompts: MCPPrompt[] = result.prompts.map((prompt) => ({
        id: `${server.id}:${prompt.name}`,
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        serverId: server.id,
        serverName: server.name ?? server.id,
      }));

      cacheManager.set(cacheKey, prompts, 60 * 60 * 1000);

      log.info(`列出提示词成功`, {
        serverId,
        serverName: server.name,
        count: prompts.length,
      });

      return prompts;
    } catch (error) {
      log.error(`列出提示词失败`, { serverId, serverName: server.name, error });
      ErrorClassifier.recordError(serverId, error);
      throw error;
    }
  }

  /**
   * 获取指定提示词
   *
   * @param serverId 服务器 ID
   * @param name 提示词名称
   * @param args 提示词参数
   * @returns 提示词结果
   */
  async getPrompt(
    serverId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<MCPPromptResult> {
    if (!args || Object.keys(args).length === 0) {
      const cacheKey = CacheKeys.prompt(serverId, name);
      const cached = cacheManager.get<MCPPromptResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    await this.ensureConnected(serverId);

    const conn = this.clients.get(serverId);
    if (!conn) {
      throw new Error(`客户端未初始化: ${serverId}`);
    }

    conn.lastUsedAt = Date.now();

    try {
      const result = await conn.client.getPrompt({ name, arguments: args });

      const promptResult: MCPPromptResult = {
        description: result.description,
        messages: result.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      if (!args || Object.keys(args).length === 0) {
        const cacheKey = CacheKeys.prompt(serverId, name);
        cacheManager.set(cacheKey, promptResult, 30 * 60 * 1000);
      }

      log.info(`获取提示词成功`, { serverId, name });

      return promptResult;
    } catch (error) {
      log.error(`获取提示词失败`, { serverId, name, error });
      ErrorClassifier.recordError(serverId, error);
      throw error;
    }
  }

  /**
   * 检查服务器健康状态
   *
   * @param serverId 服务器 ID
   * @returns 健康检查结果
   */
  async checkHealth(serverId: string): Promise<MCPHealthCheck> {
    const startTime = Date.now();

    try {
      const server = await this.repo.getServerById(serverId);
      if (!server) {
        throw new Error(`服务器不存在: ${serverId}`);
      }

      const client = await this.initClient(server);
      const pingResult = await client.ping({ timeout: 5000 });

      const responseTime = Date.now() - startTime;
      const healthy = !!pingResult;

      if (healthy) {
        return {
          serverId,
          isOnline: true,
          healthy: true,
          responseTime,
          checkedAt: Date.now(),
        };
      } else {
        return {
          serverId,
          isOnline: false,
          healthy: false,
          error: 'Ping 失败',
          checkedAt: Date.now(),
        };
      }
    } catch (error: any) {
      return {
        serverId,
        isOnline: false,
        healthy: false,
        error: error?.message,
        checkedAt: Date.now(),
      };
    }
  }

  /**
   * 获取服务器的连接状态
   *
   * @param serverId 服务器ID
   * @returns 连接状态
   */
  getStatus(serverId: string): ConnectionStatus {
    const conn = this.clients.get(serverId);
    return conn?.status ?? ConnectionStatus.Idle;
  }

  /**
   * 判断服务器是否已连接
   *
   * @param serverId 服务器ID
   * @returns 是否已连接
   */
  isConnected(serverId: string): boolean {
    return this.clients.has(serverId) && this.getStatus(serverId) === ConnectionStatus.Connected;
  }

  /**
   * 获取服务器的最后错误信息
   *
   * @param serverId 服务器ID
   * @returns 错误信息
   */
  getError(serverId: string): string | undefined {
    return this.errors.get(serverId);
  }

  /**
   * 获取所有已连接的服务器
   *
   * @returns 服务器ID列表
   */
  getConnectedServerIds(): string[] {
    return Array.from(this.clients.keys()).filter((id) => this.isConnected(id));
  }

  /**
   * 获取当前连接数量
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());

    log.info(`关闭所有 MCP 客户端`, { count: serverIds.length });

    const promises = serverIds.map((id) => this.disconnect(id));
    await Promise.allSettled(promises);

    log.info(`所有 MCP 客户端已关闭`);
  }

  /**
   * 销毁 McpClient 实例，清理所有资源
   */
  async destroy(): Promise<void> {
    log.info('正在销毁 McpClient 实例...');

    // 停止自动清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      log.debug('自动清理定时器已停止');
    }

    // 销毁健康检查器
    this.healthChecker.destroy();

    // 关闭所有连接
    await this.closeAll();

    log.info('McpClient 实例已销毁');
  }

  // ============== 私有方法 ==============

  /**
   * 创建新的 MCP 客户端
   */
  private async _createNewClient(server: MCPServer): Promise<Client> {
    const serverId = server.id;

    const baseUrl = server.baseUrl;
    if (!baseUrl) {
      throw new Error(`MCP 服务器 ${server.name ?? serverId} 未配置 baseUrl/url，无法建立连接`);
    }

    log.info(`创建新的 MCP 客户端`, {
      serverId,
      serverName: server.name,
      baseUrl,
    });

    // 合并默认请求头与用户自定义头
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'AetherLink/1.0',
    };
    const mergedHeaders = {
      ...defaultHeaders,
      ...(server.headers ?? {}),
    } as Record<string, string>;

    // 🔥 日志中脱敏敏感头部（Kelivo核心特性）
    log.debug('请求头', {
      serverId,
      headers: SecurityUtils.maskHeaders(mergedHeaders),
    });

    const transportOptions: StreamableHTTPClientTransportOptions = {
      fetch: async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString();
        return fetch(u, init as any);
      },
      requestInit: {
        headers: mergedHeaders,
      },
    };

    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), transportOptions);

    const client = new Client(
      {
        name: 'AetherLink',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // 设置通知处理器
    this._setupNotificationHandlers(client, serverId);

    try {
      await client.connect(transport);

      const now = Date.now();
      this.clients.set(serverId, {
        client,
        connectedAt: now,
        lastUsedAt: now,
        serverId,
        serverName: server.name,
        status: ConnectionStatus.Connected,
      });

      log.info(`MCP 客户端连接成功`, {
        serverId,
        serverName: server.name,
      });

      return client;
    } catch (error) {
      log.error(`MCP 客户端连接失败`, {
        serverId,
        serverName: server.name,
        error,
      });
      throw error;
    }
  }

  /**
   * 设置 MCP 通知处理器
   */
  private _setupNotificationHandlers(client: Client, serverId: string): void {
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      log.debug(`收到工具列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.tools(serverId));
    });

    client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
      log.debug(`收到资源列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.resources(serverId));
    });

    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (message: any) => {
      const uri: string | undefined = message?.params?.uri ?? message?.uri;
      log.debug(`收到资源更新通知`, { serverId, uri });
      if (typeof uri === 'string') {
        cacheManager.delete(CacheKeys.resource(serverId, uri));
      }
    });

    client.setNotificationHandler(PromptListChangedNotificationSchema, () => {
      log.debug(`收到提示词列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.prompts(serverId));
    });
  }

  /**
   * 🔥 启动心跳检查（Kelivo核心特性）
   */
  private _startHeartbeat(serverId: string, client: Client): void {
    this.healthChecker.start(serverId, client, {
      pingInterval: 12000, // 12秒
      pingTimeout: 6000,   // 6秒
      onStatusChange: (id, status) => {
        this._updateStatus(id, status);
      },
      onHealthCheckFailed: async (id, error) => {
        log.warn('心跳检查失败，触发重连', { serverId: id, error });
        await this.reconnectWithBackoff(id, 3);
      },
    });
  }

  /**
   * 更新服务器连接状态
   */
  private _updateStatus(serverId: string, status: ConnectionStatus): void {
    const conn = this.clients.get(serverId);
    if (conn) {
      conn.status = status;
    }

    // 同步更新健康检查器状态
    this.healthChecker.updateStatus(serverId, status);
  }

  /**
   * 启动自动清理定时器
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    // 每 5 分钟检查一次闲置连接
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleClients().catch((err) => {
        log.error('自动清理闲置连接失败', err);
      });
    }, 5 * 60 * 1000);

    log.debug('自动清理定时器已启动', {
      checkInterval: '5分钟',
      maxIdleTime: `${this.maxIdleTime / 1000 / 60}分钟`,
    });
  }

  /**
   * 清理闲置的客户端连接
   */
  private async cleanupIdleClients(): Promise<void> {
    const now = Date.now();
    const idleServerIds: string[] = [];

    for (const [serverId, conn] of this.clients) {
      if (now - conn.lastUsedAt > this.maxIdleTime) {
        idleServerIds.push(serverId);
      }
    }

    if (idleServerIds.length === 0) {
      return;
    }

    log.info('检测到闲置连接，开始清理', {
      count: idleServerIds.length,
      serverIds: idleServerIds,
    });

    const promises = idleServerIds.map((id) => this.disconnect(id));
    await Promise.allSettled(promises);

    log.info('闲置连接清理完成', { count: idleServerIds.length });
  }

  /**
   * 睡眠辅助函数
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 默认的全局 McpClient 实例
 */
export const mcpClient = new McpClient();
