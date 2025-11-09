import { ChatRepository } from '@/storage/repositories/chat';
import { MessageRepository } from '@/storage/repositories/messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { execute, queryAll } from '@/storage/sqlite/db';

export const DataCleanupService = {
  /**
   * 清理已归档的会话
   */
  async clearArchivedConversations(): Promise<number> {
    const archived = await ChatRepository.listConversations({ archived: true, limit: 999999 });
    let count = 0;

    for (const conv of archived) {
      await ChatRepository.deleteConversation(conv.id);
      count++;
    }

    return count;
  },

  /**
   * 清理孤儿附件（没有关联消息的附件）
   */
  async clearOrphanAttachments(): Promise<number> {
    const allAttachments = await AttachmentRepository.getAllAttachments();
    let count = 0;

    for (const att of allAttachments) {
      await AttachmentRepository.removeAttachmentIfOrphan(att.id);
      count++;
    }

    return count;
  },

  /**
   * 清理失败的消息
   */
  async clearFailedMessages(): Promise<number> {
    const result = await execute(
      `DELETE FROM messages WHERE status = ?`,
      ['failed']
    );
    return result.changes || 0;
  },

  /**
   * 清理特定时间之前的会话
   */
  async clearOldConversations(beforeTimestamp: number): Promise<number> {
    const allConversations = await ChatRepository.listConversations({ limit: 999999 });
    const oldConversations = allConversations.filter(c => c.updatedAt < beforeTimestamp);
    let count = 0;

    for (const conv of oldConversations) {
      await ChatRepository.deleteConversation(conv.id);
      count++;
    }

    return count;
  },

  /**
   * 清理所有数据（危险操作！）
   */
  async clearAllData(): Promise<void> {
    // 清空 SQLite 表
    await execute(`DELETE FROM message_attachments`);
    await execute(`DELETE FROM attachments`);
    await execute(`DELETE FROM messages`);
    await execute(`DELETE FROM conversations`);

    // 清空 AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    const alKeys = allKeys.filter(k => k.startsWith('al:'));
    if (alKeys.length > 0) {
      await AsyncStorage.multiRemove(alKeys);
    }

  },

  /**
   * 清理缓存（仅 AsyncStorage 中的临时数据）
   */
  async clearCache(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(k => k.startsWith('al:cache:'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  },

  /**
   * 获取可清理的数据统计
   */
  async getCleanableStats(): Promise<{
    archivedConversations: number;
    failedMessages: number;
    orphanAttachments: number;
  }> {
    const archived = await ChatRepository.listConversations({ archived: true, limit: 999999 });

    const failedMessages = await queryAll(
      `SELECT COUNT(*) as count FROM messages WHERE status = ?`,
      ['failed']
    );

    // 简化版：假设所有附件都可能是孤儿
    const allAttachments = await AttachmentRepository.getAllAttachments();

    return {
      archivedConversations: archived.length,
      failedMessages: (failedMessages[0]?.count as number) || 0,
      orphanAttachments: allAttachments.length, // 简化统计
    };
  },
};
