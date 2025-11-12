/**
 * McpServersRepository - MCP 服务器数据访问层
 *
 * 提供 MCP 服务器配置的 CRUD 操作
 * 支持 Streamable HTTP 传输协议
 *
 * 创建日期: 2025-11-12
 */

import { execute, queryOne, queryAll } from '@/storage/sqlite/db';
import { uuid, now } from '@/storage/core';
import type {
  MCPServer,
  CreateMCPServerInput,
  UpdateMCPServerInput,
} from '@/types/mcp';

/**
 * 数据库行类型（snake_case 字段）
 */
interface MCPServerRow {
  id: string;
  name: string;
  base_url: string;
  description: string | null;
  headers: string | null;
  timeout: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/**
 * 将数据库行转换为 MCPServer 对象
 */
function rowToServer(row: MCPServerRow): MCPServer {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    description: row.description || undefined,
    headers: row.headers ? JSON.parse(row.headers) : undefined,
    timeout: row.timeout,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const McpServersRepository = {
  /**
   * 获取所有 MCP 服务器配置
   */
  async getAllServers(): Promise<MCPServer[]> {
    const rows = await queryAll<MCPServerRow>(
      `SELECT * FROM mcp_servers ORDER BY created_at DESC`
    );
    return rows.map(rowToServer);
  },

  /**
   * 获取所有激活的 MCP 服务器
   */
  async getActiveServers(): Promise<MCPServer[]> {
    const rows = await queryAll<MCPServerRow>(
      `SELECT * FROM mcp_servers WHERE is_active = 1 ORDER BY created_at DESC`
    );
    return rows.map(rowToServer);
  },

  /**
   * 根据 ID 获取 MCP 服务器
   */
  async getServerById(id: string): Promise<MCPServer | null> {
    const row = await queryOne<MCPServerRow>(
      `SELECT * FROM mcp_servers WHERE id = ?`,
      [id]
    );

    if (!row) return null;
    return rowToServer(row);
  },

  /**
   * 根据名称获取 MCP 服务器
   */
  async getServerByName(name: string): Promise<MCPServer | null> {
    const row = await queryOne<MCPServerRow>(
      `SELECT * FROM mcp_servers WHERE name = ?`,
      [name]
    );

    if (!row) return null;
    return rowToServer(row);
  },

  /**
   * 创建新的 MCP 服务器配置
   */
  async createServer(input: CreateMCPServerInput): Promise<MCPServer> {
    const id = uuid();
    const timestamp = now();

    await execute(
      `INSERT INTO mcp_servers (
        id, name, base_url, description, headers, timeout, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.baseUrl,
        input.description || null,
        input.headers ? JSON.stringify(input.headers) : null,
        input.timeout || 60,
        input.isActive !== false ? 1 : 0, // 默认激活
        timestamp,
        timestamp,
      ]
    );

    return {
      id,
      name: input.name,
      baseUrl: input.baseUrl,
      description: input.description,
      headers: input.headers,
      timeout: input.timeout || 60,
      isActive: input.isActive !== false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  /**
   * 更新 MCP 服务器配置
   */
  async updateServer(id: string, input: UpdateMCPServerInput): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.baseUrl !== undefined) {
      updates.push('base_url = ?');
      params.push(input.baseUrl);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description || null);
    }

    if (input.headers !== undefined) {
      updates.push('headers = ?');
      params.push(input.headers ? JSON.stringify(input.headers) : null);
    }

    if (input.timeout !== undefined) {
      updates.push('timeout = ?');
      params.push(input.timeout);
    }

    if (input.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(input.isActive ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(now());
    params.push(id);

    await execute(
      `UPDATE mcp_servers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  },

  /**
   * 删除 MCP 服务器
   */
  async deleteServer(id: string): Promise<void> {
    await execute(`DELETE FROM mcp_servers WHERE id = ?`, [id]);
  },

  /**
   * 切换服务器激活状态
   */
  async toggleServer(id: string, isActive: boolean): Promise<void> {
    await execute(
      `UPDATE mcp_servers SET is_active = ?, updated_at = ? WHERE id = ?`,
      [isActive ? 1 : 0, now(), id]
    );
  },

  /**
   * 检查服务器名称是否已存在（用于创建时验证）
   */
  async isNameExists(name: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM mcp_servers WHERE name = ?`;
    const params: any[] = [name];

    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }

    const result = await queryOne<{ count: number }>(sql, params);
    return (result?.count || 0) > 0;
  },

  /**
   * 批量删除服务器（用于清理）
   */
  async deleteServersByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    await execute(
      `DELETE FROM mcp_servers WHERE id IN (${placeholders})`,
      ids
    );
  },

  /**
   * 获取服务器总数和激活数统计
   */
  async getServerStats(): Promise<{ total: number; active: number }> {
    const result = await queryOne<{ total: number; active: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM mcp_servers`
    );

    return {
      total: result?.total || 0,
      active: result?.active || 0,
    };
  },
};
