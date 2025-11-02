import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface BackupData {
  version: string;
  timestamp: number;
  conversations: any[];
  messages: any[];
  attachments: any[];
  settings: Record<string, any>;
}

export const DataBackupService = {
  /**
   * 导出所有数据到 JSON
   */
  async exportToJSON(): Promise<BackupData> {
    // 获取所有会话
    const conversations = await ChatRepository.listConversations({ limit: 999999 });

    // 获取所有消息
    const messages = await MessageRepository.getAllMessages();

    // 获取所有附件元数据（不包含文件本身）
    const attachments = await AttachmentRepository.getAllAttachments();

    // 获取所有设置
    const allKeys = await AsyncStorage.getAllKeys();
    const alKeys = allKeys.filter(k => k.startsWith('al:'));
    const settingsData = await AsyncStorage.multiGet(alKeys);
    const settings: Record<string, any> = {};
    settingsData.forEach(([key, value]) => {
      if (value) {
        try {
          settings[key] = JSON.parse(value);
        } catch {
          settings[key] = value;
        }
      }
    });

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      conversations,
      messages,
      attachments: attachments.map(a => ({
        ...a,
        uri: undefined, // 不导出文件路径，仅保留元数据
      })),
      settings,
    };
  },

  /**
   * 导出并分享备份文件
   */
  async exportAndShare(): Promise<void> {
    const data = await this.exportToJSON();
    const json = JSON.stringify(data, null, 2);
    const fileName = `aetherlink_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const dir = new Directory(Paths.document, 'backups');
    dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, fileName);
    file.write(json, { encoding: 'utf8' });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: '导出数据备份',
      });
    } else {
      throw new Error('分享功能不可用');
    }
  },

  /**
   * 从 JSON 恢复数据
   */
  async restoreFromJSON(backup: BackupData): Promise<void> {
    // 验证备份数据
    if (!backup.version || !backup.conversations || !backup.messages) {
      throw new Error('无效的备份数据格式');
    }

    // 警告：这将清空现有数据
    console.warn('[DataBackup] Restoring data will clear existing data');

    try {
      // 1. 清空现有数据（使用 DataCleanupService）
      const { DataCleanupService } = await import('./DataCleanup');
      await DataCleanupService.clearAllData();

      // 2. 恢复会话
      for (const conv of backup.conversations) {
        await ChatRepository.createConversationWithId({
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          archived: conv.archived,
        });
      }

      // 3. 恢复消息
      for (const msg of backup.messages) {
        await MessageRepository.addMessageWithId({
          id: msg.id,
          conversationId: msg.conversationId,
          role: msg.role,
          text: msg.text,
          createdAt: msg.createdAt,
          status: msg.status || 'sent',
          parentId: msg.parentId,
          extra: msg.extra,
        });
      }

      // 4. 恢复附件元数据（仅元数据，文件本身无法恢复）
      for (const att of backup.attachments) {
        if (att.id && att.kind && att.name) {
          await AttachmentRepository.addAttachmentWithId({
            id: att.id,
            kind: att.kind,
            name: att.name,
            size: att.size,
            createdAt: att.createdAt,
          });
        }
      }

      // 5. 恢复设置
      const settingsData = Object.entries(backup.settings);
      for (const [key, value] of settingsData) {
        try {
          await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (e) {
          console.error(`[DataBackup] Failed to restore setting ${key}:`, e);
        }
      }

      console.log('[DataBackup] Data restored successfully');
    } catch (error) {
      console.error('[DataBackup] Restore failed:', error);
      throw new Error(`数据恢复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 估算备份文件大小
   */
  async estimateBackupSize(): Promise<number> {
    const data = await this.exportToJSON();
    const json = JSON.stringify(data);
    return new Blob([json]).size;
  },
};
