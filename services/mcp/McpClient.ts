/**
 * McpClient - MCP 客户端核心服务
 *
 * 负责管理与 MCP 服务器的连接，提供工具、资源、提示词的操作接口
 * 支持 Streamable HTTP 传输协议（React Native 唯一可用的传输方式）
 *
 * 核心功能：
 * - 连接管理：复用客户端实例，避免重复连接
 * - 工具操作：列出工具、调用工具
 * - 资源操作：列出资源、读取资源
 * - 提示词操作：列出提示词、获取提示词
 * - 缓存集成：减少网络请求，提升响应速度
 * - 通知处理：监听 MCP 通知，自动更新缓存
 *
 * 创建日期: 2025-11-12
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
  lastUsedAt: number; // 🛡️ 新增：最后使用时间（用于自动清理）
  serverId: string;
  serverName: string;
}

/**
 * McpClient 类
 *
 * 使用示例：
 * ```typescript
 * const mcpClient = new McpClient();
 *
 * // 列出工具
 * const tools = await mcpClient.listTools('server-1');
 *
 * // 调用工具
 * const result = await mcpClient.callTool('server-1', 'search_web', {
 *   query: 'React Native'
 * });
 *
 * // 关闭所有连接
 * await mcpClient.closeAll();
 * ```
 */
export class McpClient {
  /** 客户端连接池 (key: serverId) */
  private clients: Map<string, ClientConnection> = new Map();

  /** 待处理的连接初始化 Promise (key: serverId) */
  private pendingClients: Map<string, Promise<Client>> = new Map();

  /** 数据仓库实例 */
  private repo = McpServersRepository;

  /** 🛡️ 自动清理定时器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /** 🛡️ 闲置连接的最大时间（毫秒），默认 10 分钟 */
  private readonly maxIdleTime: number = 10 * 60 * 1000;

  constructor() {
    log.info('McpClient 初始化完成');
    // 🛡️ 启动自动清理定时器（每 5 分钟检查一次）
    this.startAutoCleanup();
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

    // 合并默认请求头与用户自定义头（用于鉴权/版本协商等）
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'AetherLink/1.0',
    };
    const mergedHeaders = {
      ...defaultHeaders,
      ...(server.headers ?? {}),
    } as Record<string, string>;

    const transportOptions: StreamableHTTPClientTransportOptions = {
      // React Native 环境使用全局 fetch
      fetch: async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString();
        return fetch(u, init as any);
      },
      requestInit: {
        headers: mergedHeaders,
      },
    };

    // 创建 Streamable HTTP 传输（带请求头/自定义 fetch）
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), transportOptions);

    // 创建客户端
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

    // 连接到服务器
    try {
      await client.connect(transport);

      // 保存连接信息
      const now = Date.now();
      this.clients.set(serverId, {
        client,
        connectedAt: now,
        lastUsedAt: now, // 🛡️ 初始化最后使用时间
        serverId,
        serverName: server.name,
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
   *
   * 当服务器发送通知时，自动更新缓存
   */
  private _setupNotificationHandlers(client: Client, serverId: string): void {
    // 工具列表变更通知
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      log.debug(`收到工具列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.tools(serverId));
    });

    // 资源列表变更通知
    client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
      log.debug(`收到资源列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.resources(serverId));
    });

    // 资源更新通知
    client.setNotificationHandler(ResourceUpdatedNotificationSchema, (message: any) => {
      const uri: string | undefined = message?.params?.uri ?? message?.uri;
      log.debug(`收到资源更新通知`, { serverId, uri });
      if (typeof uri === 'string') {
        cacheManager.delete(CacheKeys.resource(serverId, uri));
      }
    });

    // 提示词列表变更通知
    client.setNotificationHandler(PromptListChangedNotificationSchema, () => {
      log.debug(`收到提示词列表变更通知`, { serverId });
      cacheManager.delete(CacheKeys.prompts(serverId));
    });
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

    // 3. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 4. 调用 listTools
    try {
      const result = await client.listTools();

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

      // 5. 缓存结果（5 分钟）
      cacheManager.set(cacheKey, tools, 5 * 60 * 1000);

      log.info(`列出工具成功`, {
        serverId,
        serverName: server.name,
        count: tools.length,
      });

      return tools;
    } catch (error) {
      log.error(`列出工具失败`, { serverId, serverName: server.name, error });
      throw error;
    }
  }

  /**
   * 调用服务器工具
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

    // 2. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 3. 调用工具
    try {
      log.info(`调用工具`, {
        serverId,
        serverName: server.name,
        toolName: name,
        args,
      });

      const result: any = await client.callTool({
        name,
        arguments: args,
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
    } catch (error) {
      log.error(`工具调用失败`, {
        serverId,
        serverName: server.name,
        toolName: name,
        error,
      });
      throw error;
    }
  }

  /**
   * 列出服务器的所有资源
   *
   * @param serverId 服务器 ID
   * @returns 资源列表
   */
  async listResources(serverId: string): Promise<MCPResource[]> {
    // 1. 检查缓存
    const cacheKey = CacheKeys.resources(serverId);
    const cached = cacheManager.get<MCPResource[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 3. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 4. 调用 listResources
    try {
      const result = await client.listResources();

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

      // 5. 缓存结果（60 分钟）
      cacheManager.set(cacheKey, resources, 60 * 60 * 1000);

      log.info(`列出资源成功`, {
        serverId,
        serverName: server.name,
        count: resources.length,
      });

      return resources;
    } catch (error) {
      log.error(`列出资源失败`, { serverId, serverName: server.name, error });
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
    // 1. 检查缓存
    const cacheKey = CacheKeys.resource(serverId, uri);
    const cached = cacheManager.get<MCPResourceContent>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 3. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 4. 调用 readResource
    try {
      const result: any = await client.readResource({ uri });
      const first = result?.contents?.[0] ?? {};
      const content: MCPResourceContent = {
        uri,
        text: typeof first?.text === 'string' ? first.text : undefined,
        blob: typeof first?.blob === 'string' ? first.blob : undefined,
        mimeType: typeof first?.mimeType === 'string' ? first.mimeType : undefined,
      };

      // 5. 缓存结果（30 分钟）
      cacheManager.set(cacheKey, content, 30 * 60 * 1000);

      log.info(`读取资源成功`, { serverId, uri });

      return content;
    } catch (error) {
      log.error(`读取资源失败`, { serverId, uri, error });
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
    // 1. 检查缓存
    const cacheKey = CacheKeys.prompts(serverId);
    const cached = cacheManager.get<MCPPrompt[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 3. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 4. 调用 listPrompts
    try {
      const result = await client.listPrompts();

      const prompts: MCPPrompt[] = result.prompts.map((prompt) => ({
        id: `${server.id}:${prompt.name}`,
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        serverId: server.id,
        serverName: server.name ?? server.id,
      }));

      // 5. 缓存结果（60 分钟）
      cacheManager.set(cacheKey, prompts, 60 * 60 * 1000);

      log.info(`列出提示词成功`, {
        serverId,
        serverName: server.name,
        count: prompts.length,
      });

      return prompts;
    } catch (error) {
      log.error(`列出提示词失败`, { serverId, serverName: server.name, error });
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
    // 1. 检查缓存（仅在无参数时使用缓存）
    if (!args || Object.keys(args).length === 0) {
      const cacheKey = CacheKeys.prompt(serverId, name);
      const cached = cacheManager.get<MCPPromptResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 2. 获取服务器配置
    const server = await this.repo.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器不存在: ${serverId}`);
    }

    // 3. 初始化客户端
    const client = await this.initClient(server);

    // 🛡️ 更新最后使用时间
    this.updateLastUsedAt(serverId);

    // 4. 调用 getPrompt
    try {
      const result = await client.getPrompt({ name, arguments: args });

      const promptResult: MCPPromptResult = {
        description: result.description,
        messages: result.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      // 5. 缓存结果（仅在无参数时，30 分钟）
      if (!args || Object.keys(args).length === 0) {
        const cacheKey = CacheKeys.prompt(serverId, name);
        cacheManager.set(cacheKey, promptResult, 30 * 60 * 1000);
      }

      log.info(`获取提示词成功`, { serverId, name });

      return promptResult;
    } catch (error) {
      log.error(`获取提示词失败`, { serverId, name, error });
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
   * 关闭指定服务器的连接
   *
   * @param serverId 服务器 ID
   */
  async closeClient(serverId: string): Promise<void> {
    const conn = this.clients.get(serverId);
    if (!conn) {
      log.debug(`连接不存在，无需关闭`, { serverId });
      return;
    }

    try {
      await conn.client.close();
      this.clients.delete(serverId);

      // 清除该服务器的所有缓存
      cacheManager.clear(CacheKeys.serverPrefix(serverId));

      log.info(`MCP 客户端已关闭`, { serverId, serverName: conn.serverName });
    } catch (error) {
      log.error(`关闭 MCP 客户端失败`, { serverId, error });
      throw error;
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());

    log.info(`关闭所有 MCP 客户端`, { count: serverIds.length });

    const promises = serverIds.map((id) => this.closeClient(id));
    await Promise.allSettled(promises);

    log.info(`所有 MCP 客户端已关闭`);
  }

  /**
   * 获取当前连接数量
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * 获取所有连接的服务器 ID
   */
  getConnectedServerIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * 🛡️ 更新连接的最后使用时间
   *
   * @param serverId 服务器 ID
   */
  private updateLastUsedAt(serverId: string): void {
    const conn = this.clients.get(serverId);
    if (conn) {
      conn.lastUsedAt = Date.now();
    }
  }

  /**
   * 🛡️ 启动自动清理定时器
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
   * 🛡️ 清理闲置的客户端连接
   */
  private async cleanupIdleClients(): Promise<void> {
    const now = Date.now();
    const idleServerIds: string[] = [];

    // 查找所有闲置连接
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

    // 关闭所有闲置连接
    const promises = idleServerIds.map((id) => this.closeClient(id));
    await Promise.allSettled(promises);

    log.info('闲置连接清理完成', { count: idleServerIds.length });
  }

  /**
   * 🛡️ 销毁 McpClient 实例，清理所有资源
   *
   * 应在应用退出或不再需要 MCP 功能时调用
   */
  async destroy(): Promise<void> {
    log.info('正在销毁 McpClient 实例...');

    // 停止自动清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      log.debug('自动清理定时器已停止');
    }

    // 关闭所有连接
    await this.closeAll();

    log.info('McpClient 实例已销毁');
  }
}

/**
 * 默认的全局 McpClient 实例
 */
export const mcpClient = new McpClient();
