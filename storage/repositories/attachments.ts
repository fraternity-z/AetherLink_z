import { Directory, File, Paths } from 'expo-file-system';
import { Attachment, now, uuid } from '@/storage/core';
import { execute, queryAll } from '@/storage/sqlite/db';

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
  },

  async linkToMessage(messageId: string, attachmentId: string): Promise<void> {
    await execute(
      `INSERT OR IGNORE INTO message_attachments (message_id, attachment_id) VALUES (?, ?)`,
      [messageId, attachmentId]
    );
  },

  async removeAttachmentIfOrphan(attachmentId: string): Promise<void> {
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
      } catch {}
    }
    await execute(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);
  },
};
