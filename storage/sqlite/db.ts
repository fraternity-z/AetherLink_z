import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_0001 } from '@/storage/sqlite/migrations/0001_init';
import { MIGRATION_0002 } from '@/storage/sqlite/migrations/0002_multi_key';
import { withDatabaseErrorHandler, withTransactionErrorHandler } from '@/storage/sqlite/error-handler';

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

/**
 * 带重试机制的序列化数据库操作
 *
 * 专门处理数据库锁定错误，使用指数退避重试
 *
 * @param operation - 数据库操作函数
 * @param maxRetries - 最大重试次数（默认 3 次）
 * @param baseDelay - 基础延迟时间（毫秒，默认 50ms）
 * @returns 操作结果
 */
function runSerializedWithRetry<T>(
  operation: (db: SQLiteDatabase) => Promise<T>,
  maxRetries = 3,
  baseDelay = 50
): Promise<T> {
  const runWithRetry = async (attemptNumber: number): Promise<T> => {
    try {
      return await operation(getDB());
    } catch (error: any) {
      // 检查是否是数据库锁定错误
      const message = error?.message || String(error);
      const isLockError = message.toLowerCase().includes('database is locked') ||
                          message.toLowerCase().includes('sqlite_locked') ||
                          message.toLowerCase().includes('sqlite_busy');

      // 如果不是锁定错误，或者已达到最大重试次数，直接抛出错误
      if (!isLockError || attemptNumber >= maxRetries) {
        throw error;
      }

      // 计算延迟时间（指数退避）
      const delay = baseDelay * Math.pow(2, attemptNumber);

      // 记录重试日志
      console.warn(`[数据库锁定] 第 ${attemptNumber + 1}/${maxRetries} 次重试，延迟 ${delay}ms`);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      return runWithRetry(attemptNumber + 1);
    }
  };

  const run = () => runWithRetry(0);
  const result = dbOperationQueue.then(run, run);
  dbOperationQueue = result.finally(() => undefined);
  return result;
}

export async function initMigrations(): Promise<void> {
  await withTransactionErrorHandler(
    '数据库迁移初始化',
    () => runSerialized(async (db) => {
      // PRAGMA 语句应该在事务外执行
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // 应用 MIGRATION_0001
      const stmts0001 = MIGRATION_0001.split(';').map(s => s.trim()).filter(Boolean);

      await db.withTransactionAsync(async () => {
        for (const sql of stmts0001) {
          await db.execAsync(sql + ';');
        }
      });

      // 补丁：对已存在的历史库进行列修复（避免 no such column: is_active）
      await ensureMcpServersSchema(db);

      // 应用 MIGRATION_0002（多 Key 轮询功能）
      const stmts0002 = MIGRATION_0002.split(';').map(s => s.trim()).filter(Boolean);

      await db.withTransactionAsync(async () => {
        for (const sql of stmts0002) {
          await db.execAsync(sql + ';');
        }
      });
    })
  );
}

export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  return withDatabaseErrorHandler(
    'query',
    () => runSerialized(async (db) => {
      if (args.length > 0) return db.getAllAsync<T>(sql, args as any);
      return db.getAllAsync<T>(sql);
    }),
    sql
  );
}

export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  return withDatabaseErrorHandler(
    'query',
    () => runSerialized(async (db) => {
      const result = args.length > 0
        ? await db.getFirstAsync<T>(sql, args as any)
        : await db.getFirstAsync<T>(sql);
      return result || null;
    }),
    sql
  );
}

export async function execute(sql: string, args: any[] = []): Promise<{ changes: number }> {
  // 根据 SQL 语句判断操作类型
  const sqlLower = sql.trim().toLowerCase();
  const operation = sqlLower.startsWith('insert')
    ? 'insert'
    : sqlLower.startsWith('update')
    ? 'update'
    : sqlLower.startsWith('delete')
    ? 'delete'
    : 'execute';

  return withDatabaseErrorHandler(
    operation,
    () => runSerializedWithRetry(async (db) => {
      const result = await db.runAsync(sql, args as any);
      return { changes: result.changes || 0 };
    }),
    sql
  );
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
  // 若表不存在，初始化脚本已创建，直接返回
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

    // 重新创建表（使用初始化脚本中的定义）
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
