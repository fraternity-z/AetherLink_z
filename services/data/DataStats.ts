import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

export interface DataStatistics {
  conversations: {
    total: number;
    archived: number;
    active: number;
  };
  messages: {
    total: number;
    user: number;
    assistant: number;
    system: number;
  };
  attachments: {
    total: number;
    images: number;
    files: number;
    audio: number;
    video: number;
    totalSize: number; // bytes
  };
  storage: {
    totalKeys: number;
    estimatedSize: number; // bytes
  };
}

export const DataStatsService = {
  async getStatistics(): Promise<DataStatistics> {
    // 获取会话统计
    const allConversations = await ChatRepository.listConversations({ limit: 999999 });
    const archivedConversations = allConversations.filter(c => c.archived);

    // 获取消息统计（优化版：使用聚合查询）
    const messageCounts = await MessageRepository.getMessageCountByRole();
    const messageStats = {
      total: messageCounts.reduce((sum, r) => sum + r.count, 0),
      user: messageCounts.find(r => r.role === 'user')?.count || 0,
      assistant: messageCounts.find(r => r.role === 'assistant')?.count || 0,
      system: messageCounts.find(r => r.role === 'system')?.count || 0,
    };

    // 获取附件统计（优化版：使用聚合查询）
    const attachmentCounts = await AttachmentRepository.getAttachmentCountByKind();
    const attachmentStats = {
      total: attachmentCounts.reduce((sum, r) => sum + r.count, 0),
      images: attachmentCounts.find(r => r.kind === 'image')?.count || 0,
      files: attachmentCounts.find(r => r.kind === 'file')?.count || 0,
      audio: attachmentCounts.find(r => r.kind === 'audio')?.count || 0,
      video: attachmentCounts.find(r => r.kind === 'video')?.count || 0,
      totalSize: attachmentCounts.reduce((sum, r) => sum + (r.totalSize || 0), 0),
    };

    // 获取存储统计
    const allKeys = await AsyncStorage.getAllKeys();
    const alKeys = allKeys.filter(k => k.startsWith('al:'));

    // 估算存储大小（简化版）
    let estimatedSize = 0;
    try {
      const multiGet = await AsyncStorage.multiGet(alKeys);
      estimatedSize = multiGet.reduce((sum, [key, value]) => {
        return sum + (key?.length || 0) + (value?.length || 0);
      }, 0);
    } catch (e) {
      logger.error('[DataStats] Failed to estimate storage size:', e);
    }

    return {
      conversations: {
        total: allConversations.length,
        archived: archivedConversations.length,
        active: allConversations.length - archivedConversations.length,
      },
      messages: messageStats,
      attachments: attachmentStats,
      storage: {
        totalKeys: alKeys.length,
        estimatedSize,
      },
    };
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  },
};
