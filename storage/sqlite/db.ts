import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_0001 } from '@/storage/sqlite/migrations/0001_init';
import { MIGRATION_0002 } from '@/storage/sqlite/migrations/0002_provider_models';
import { MIGRATION_0003 } from '@/storage/sqlite/migrations/0003_thinking_chains';
import { MIGRATION_0004 } from '@/storage/sqlite/migrations/0004_add_mcp_tables';
import { MIGRATION_0005 } from '@/storage/sqlite/migrations/0005_quick_phrases';
import { MIGRATION_0006 } from '@/storage/sqlite/migrations/0006_performance_indexes';
import { MIGRATION_0007 } from '@/storage/sqlite/migrations/0007_message_blocks';
import { MIGRATION_0008 } from '@/storage/sqlite/migrations/0008_remove_thinking_block';

let dbInstance: SQLiteDatabase | null = null;
let dbOperationQueue: Promise<unknown> = Promise.resolve();

export function getDB(): SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = openDatabaseSync('aetherlink.db');
  }
  return dbInstance!;
}

function runSerialized<T>(operation: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  const run = async () => operation(getDB());
  const result = dbOperationQueue.then(run, run);
  dbOperationQueue = result.finally(() => undefined);
  return result;
}

export async function initMigrations(): Promise<void> {
  await runSerialized(async (db) => {
    // PRAGMA 语句应该在事务外执行
    await db.execAsync('PRAGMA foreign_keys = ON;');

    const all = [MIGRATION_0001, MIGRATION_0002, MIGRATION_0003, MIGRATION_0004, MIGRATION_0005, MIGRATION_0006, MIGRATION_0007, MIGRATION_0008].join('\n');
    const stmts = all.split(';').map(s => s.trim()).filter(Boolean);

    await db.withTransactionAsync(async () => {
      for (const sql of stmts) {
        await db.execAsync(sql + ';');
      }
    });

    // 补丁：对已存在的历史库进行列修复（避免 no such column: is_active）
    await ensureMcpServersSchema(db);
  });
}

export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  return runSerialized(async (db) => {
    if (args.length > 0) return db.getAllAsync<T>(sql, args as any);
    return db.getAllAsync<T>(sql);
  });
}

export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  return runSerialized(async (db) => {
    const result = args.length > 0
      ? await db.getFirstAsync<T>(sql, args as any)
      : await db.getFirstAsync<T>(sql);
    return result || null;
  });
}

export async function execute(sql: string, args: any[] = []): Promise<{ changes: number }> {
  return runSerialized(async (db) => {
    const result = await db.runAsync(sql, args as any);
    return { changes: result.changes || 0 };
  });
}

/**
 * 确保 mcp_servers 表包含必要的列和索引
 *
 * 策略：
 * 1. 检查表中所有必需的列是否存在
 * 2. 如果表结构不完整（缺少任何必需列），删除旧表并重建
 * 3. 确保所有必要的索引都已创建
 *
 * 注意：因为 MCP 功能是新增的，删除旧表不会造成数据丢失
 */
async function ensureMcpServersSchema(db: SQLiteDatabase): Promise<void> {
  // 若表不存在，按 0004 迁移已创建，直接返回
  const tables = await db.getAllAsync<any>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='mcp_servers'"
  );
  if (!tables || tables.length === 0) return;

  // 检查表中所有必需的列
  const columns = await db.getAllAsync<any>('PRAGMA table_info(mcp_servers)');
  const columnNames = new Set(columns.map((c: any) => c?.name));

  // 定义所有必需的列
  const requiredColumns = [
    'id',
    'name',
    'base_url',
    'description',
    'headers',
    'timeout',
    'is_active',
    'created_at',
    'updated_at',
  ];

  // 检查是否缺少任何必需列
  const missingColumns = requiredColumns.filter(col => !columnNames.has(col));

  if (missingColumns.length > 0) {
    // 表结构不完整，删除旧表并重建
    // 删除旧表
    await db.execAsync('DROP TABLE IF EXISTS mcp_servers;');

    // 重新创建表（使用 MIGRATION_0004 的定义）
    await db.execAsync(`
      CREATE TABLE mcp_servers (
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
    `);

    // 创建索引
    await db.execAsync('CREATE INDEX idx_mcp_servers_active ON mcp_servers(is_active);');
    await db.execAsync('CREATE INDEX idx_mcp_servers_name ON mcp_servers(name);');
  } else {
    // 表结构完整，确保索引存在
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name);');
  }
}
