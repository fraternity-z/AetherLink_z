import { Directory, File, Paths } from 'expo-file-system';
import { Attachment, now, uuid } from '@/storage/core';
import { logger } from '@/utils/logger';
import { execute, queryAll } from '@/storage/sqlite/db';
import { withRepositoryContext } from './error-handler';

function ensureDir(dir: Directory) {
  if (!dir.info().exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

function guessExt(name?: string | null, mime?: string | null): string {
  if (name && name.includes('.')) return name.split('.').pop() as string;
  if (!mime) return 'bin';
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
  };
  return map[mime] || 'bin';
}

export const AttachmentRepository = {
  async saveAttachmentFromUri(localUri: string, meta?: Partial<Attachment>): Promise<Attachment> {
    return withRepositoryContext('AttachmentRepository', 'saveAttachmentFromUri', { table: 'attachments', localUri, kind: meta?.kind }, async () => {
      const id = uuid();
      const createdAt = now();
      const base = new Directory(Paths.document, 'attachments');
      ensureDir(base);
      const ext = guessExt(meta?.name ?? null, meta?.mime ?? null);
      const src = new File(localUri);
      const target = new File(base, `${id}.${ext}`);
      src.copy(target);
      const info = target.info();

      const attachment: Attachment = {
        id,
        kind: (meta?.kind as any) || 'file',
        mime: meta?.mime ?? null,
        name: meta?.name ?? null,
        uri: target.uri,
        size: info.size ?? meta?.size ?? null,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
        durationMs: meta?.durationMs ?? null,
        sha256: meta?.sha256 ?? null,
        createdAt,
        extra: meta?.extra,
      };

      await execute(
        `INSERT INTO attachments (id, kind, mime, name, uri, size, width, height, duration_ms, sha256, created_at, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attachment.id,
          attachment.kind,
          attachment.mime,
          attachment.name,
          attachment.uri,
          attachment.size,
          attachment.width,
          attachment.height,
          attachment.durationMs,
          attachment.sha256,
          attachment.createdAt,
          attachment.extra ? JSON.stringify(attachment.extra) : null,
        ]
      );

      return attachment;
    });
  },

  async linkToMessage(messageId: string, attachmentId: string): Promise<void> {
    return withRepositoryContext('AttachmentRepository', 'linkToMessage', { table: 'message_attachments', messageId, attachmentId }, async () => {
      await execute(
        `INSERT OR IGNORE INTO message_attachments (message_id, attachment_id) VALUES (?, ?)`,
        [messageId, attachmentId]
      );
    });
  },

  async addAttachmentWithId(input: {
    id: string;
    kind: string;
    name: string | null;
    size: number | null;
    createdAt: number;
  }): Promise<Attachment> {
    return withRepositoryContext('AttachmentRepository', 'addAttachmentWithId', { table: 'attachments', attachmentId: input.id, kind: input.kind }, async () => {
      const attachment: Attachment = {
        id: input.id,
        kind: input.kind as any,
        mime: null,
        name: input.name,
        uri: null,
        size: input.size,
        width: null,
        height: null,
        durationMs: null,
        sha256: null,
        createdAt: input.createdAt,
        extra: undefined,
      };

      await execute(
        `INSERT INTO attachments (id, kind, mime, name, uri, size, width, height, duration_ms, sha256, created_at, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attachment.id,
          attachment.kind,
          attachment.mime,
          attachment.name,
          attachment.uri,
          attachment.size,
          attachment.width,
          attachment.height,
          attachment.durationMs,
          attachment.sha256,
          attachment.createdAt,
          null,
        ]
      );

      return attachment;
    });
  },

  async removeAttachmentIfOrphan(attachmentId: string): Promise<void> {
    return withRepositoryContext('AttachmentRepository', 'removeAttachmentIfOrphan', { table: 'attachments', attachmentId }, async () => {
      const rows = await queryAll<{ c: number }>(
        `SELECT COUNT(*) as c FROM message_attachments WHERE attachment_id = ?`,
        [attachmentId]
      );
      const c = rows[0]?.c || 0;
      if (c > 0) return; // still referenced

      // get uri then delete
      const att = await queryAll<{ uri: string }>(`SELECT uri FROM attachments WHERE id = ?`, [attachmentId]);
      const uri = att[0]?.uri;
      if (uri) {
        try {
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch (e) {
          logger.debug('[AttachmentRepository] delete file failed', e);
        }
      }
      await execute(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);
    });
  },

  async getAllAttachments(): Promise<Attachment[]> {
    return withRepositoryContext('AttachmentRepository', 'getAllAttachments', { table: 'attachments' }, async () => {
      const rows = await queryAll<any>(
        `SELECT id, kind, mime, name, uri, size, width, height, duration_ms as durationMs, sha256, created_at as createdAt, extra
         FROM attachments
         ORDER BY created_at DESC`
      );
      return rows.map(r => ({
        ...r,
        extra: r.extra ? JSON.parse(r.extra) : undefined,
      }));
    });
  },

  async getAttachmentCountByKind(): Promise<{ kind: string; count: number; totalSize: number }[]> {
    return withRepositoryContext('AttachmentRepository', 'getAttachmentCountByKind', { table: 'attachments' }, async () => {
      const rows = await queryAll<any>(
        `SELECT kind, COUNT(*) as count, SUM(COALESCE(size, 0)) as totalSize
         FROM attachments
         GROUP BY kind`
      );
      return rows;
    });
  },
  
  // 新增：按消息ID查询附件列表（单条消息）
  async getAttachmentsForMessage(messageId: string): Promise<Attachment[]> {
    return withRepositoryContext('AttachmentRepository', 'getAttachmentsForMessage', { table: 'message_attachments', messageId }, async () => {
      const rows = await queryAll<any>(
        `SELECT a.id, a.kind, a.mime, a.name, a.uri, a.size, a.width, a.height, a.duration_ms as durationMs, a.sha256, a.created_at as createdAt, a.extra
         FROM message_attachments ma
         JOIN attachments a ON a.id = ma.attachment_id
         WHERE ma.message_id = ?
         ORDER BY a.created_at ASC`,
        [messageId]
      );
      return rows.map((r: any) => ({
        ...r,
        extra: r.extra ? JSON.parse(r.extra) : undefined,
      }));
    });
  },
  
  // 新增：批量按消息ID获取附件，返回映射
  async getAttachmentsByMessageIds(messageIds: string[]): Promise<Record<string, Attachment[]>> {
    return withRepositoryContext('AttachmentRepository', 'getAttachmentsByMessageIds', { table: 'message_attachments', messageIdsCount: messageIds?.length || 0 }, async () => {
      if (!messageIds || messageIds.length === 0) return {} as Record<string, Attachment[]>;
      const placeholders = messageIds.map(() => '?').join(',');
      const rows = await queryAll<any>(
        `SELECT ma.message_id as messageId, a.id, a.kind, a.mime, a.name, a.uri, a.size, a.width, a.height, a.duration_ms as durationMs, a.sha256, a.created_at as createdAt, a.extra
         FROM message_attachments ma
         JOIN attachments a ON a.id = ma.attachment_id
         WHERE ma.message_id IN (${placeholders})
         ORDER BY a.created_at ASC`,
        messageIds
      );
      const map: Record<string, Attachment[]> = {};
      for (const r of rows) {
        const att: Attachment = {
          id: r.id,
          kind: r.kind,
          mime: r.mime,
          name: r.name,
          uri: r.uri,
          size: r.size,
          width: r.width,
          height: r.height,
          durationMs: r.durationMs,
          sha256: r.sha256,
          createdAt: r.createdAt,
          extra: r.extra ? JSON.parse(r.extra) : undefined,
        };
        const mid = String(r.messageId);
        if (!map[mid]) map[mid] = [];
        map[mid].push(att);
      }
      return map;
    });
  },
};
