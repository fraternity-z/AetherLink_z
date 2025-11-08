import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_0001 } from '@/storage/sqlite/migrations/0001_init';
import { MIGRATION_0002 } from '@/storage/sqlite/migrations/0002_provider_models';
import { MIGRATION_0003 } from '@/storage/sqlite/migrations/0003_thinking_chains';

let dbInstance: SQLiteDatabase | null = null;

export function getDB(): SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = openDatabaseSync('aetherlink.db');
  }
  return dbInstance!;
}

export async function initMigrations(): Promise<void> {
  const db = getDB();
  const all = [MIGRATION_0001, MIGRATION_0002, MIGRATION_0003].join('\n');
  const stmts = all.split(';').map(s => s.trim()).filter(Boolean);
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    for (const sql of stmts) {
      await db.execAsync(sql + ';');
    }
  });
}

export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const db = getDB();
  if (args.length > 0) return db.getAllAsync<T>(sql, args as any);
  return db.getAllAsync<T>(sql);
}

export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  const db = getDB();
  const result = args.length > 0
    ? await db.getFirstAsync<T>(sql, args as any)
    : await db.getFirstAsync<T>(sql);
  return result || null;
}

export async function execute(sql: string, args: any[] = []): Promise<{ changes: number }> {
  const db = getDB();
  const result = await db.runAsync(sql, args as any);
  return { changes: result.changes || 0 };
}
