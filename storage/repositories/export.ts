import { Conversation, Message, ThinkingChain, MessageBlock, Attachment } from '@/storage/core';
import { queryOne } from '@/storage/sqlite/db';
import { ChatRepository } from './chat';
import { MessageRepository } from './messages';
import { ThinkingChainRepository } from './thinking-chains';
import { MessageBlocksRepository } from './message-blocks';
import { AttachmentRepository } from './attachments';
import { withRepositoryContext } from './error-handler';

/**
 * 导出数据结构 - 包含话题的完整信息
 */
export interface TopicExportData {
  // 话题基本信息
  conversation: Conversation;

  // 消息统计
  messageCount: number;

  // 完整的消息列表（包含关联数据）
  messages: MessageExportData[];
}

/**
 * 导出消息结构 - 包含消息的所有关联数据
 */
export interface MessageExportData {
  // 消息本身
  message: Message;

  // 思考链（如果有）
  thinkingChain: ThinkingChain | null;

  // 消息块列表（MCP 工具调用等）
  blocks: MessageBlock[];

  // 附件列表
  attachments: Attachment[];
}

/**
 * ExportRepository - 导出数据访问层
 *
 * 提供话题导出所需的完整数据查询
 * 专门用于导出功能，避免污染其他 Repository
 */
export const ExportRepository = {
  /**
   * 获取话题的导出数据（包含完整的消息和关联数据）
   *
   * @param conversationId 话题 ID
   * @returns 完整的导出数据结构
   */
  async getTopicExportData(conversationId: string): Promise<TopicExportData | null> {
    return withRepositoryContext('ExportRepository', 'getTopicExportData', {
      conversationId,
      table: 'conversations, messages'
    }, async () => {
      // 1. 获取话题基本信息
      const conversation = await ChatRepository.getConversation(conversationId);
      if (!conversation) {
        return null;
      }

      // 2. 获取消息列表（默认获取所有消息）
      const messages = await MessageRepository.listMessages(conversationId, {
        limit: 10000 // 设置一个较大的限制，避免分页
      });

      // 3. 获取消息数量统计
      const countRow = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?`,
        [conversationId]
      );
      const messageCount = countRow?.count || 0;

      // 4. 批量获取所有关联数据
      const messageIds = messages.map(m => m.id);

      const [
        thinkingChains,
        blocksMap,
        attachmentsMap,
      ] = await Promise.all([
        ThinkingChainRepository.getThinkingChainsByMessageIds(messageIds),
        MessageBlocksRepository.getBlocksByMessageIds(messageIds),
        AttachmentRepository.getAttachmentsByMessageIds(messageIds),
      ]);

      // 5. 组装完整的消息数据
      const messagesWithRelations: MessageExportData[] = messages.map(message => ({
        message,
        thinkingChain: thinkingChains.get(message.id) || null,
        blocks: blocksMap.get(message.id) || [],
        attachments: attachmentsMap[message.id] || [],
      }));

      return {
        conversation,
        messageCount,
        messages: messagesWithRelations,
      };
    });
  },

  /**
   * 获取话题的消息数量统计（包含用户和助手消息分别的数量）
   *
   * @param conversationId 话题 ID
   * @returns 统计数据
   */
  async getTopicStats(conversationId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
  }> {
    return withRepositoryContext('ExportRepository', 'getTopicStats', {
      conversationId,
      table: 'messages'
    }, async () => {
      const stats = await queryOne<{
        total: number;
        user_count: number;
        assistant_count: number;
        system_count: number;
      }>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
          SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_count,
          SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as system_count
         FROM messages
         WHERE conversation_id = ?`,
        [conversationId]
      );

      return {
        totalMessages: stats?.total || 0,
        userMessages: stats?.user_count || 0,
        assistantMessages: stats?.assistant_count || 0,
        systemMessages: stats?.system_count || 0,
      };
    });
  },
};
