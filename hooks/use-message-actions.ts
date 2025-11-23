/**
 * 🛠️ 消息操作业务逻辑 Hook
 *
 * 功能：
 * - 复制消息内容到剪贴板
 * - 分享消息内容
 * - 重新生成 AI 回答
 * - 提供触觉反馈和图标状态变化
 */

import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import type { Message } from '@/storage/core';
import { logger } from '@/utils/logger';
import { MessageBlocksRepository } from '@/storage/repositories/message-blocks';

interface UseMessageActionsProps {
  message?: Message;
  content: string; // ✨ 实际显示的内容（从 blocks 组合而来）
  onRegenerate?: () => void;
}

export function useMessageActions({
  message,
  content,
  onRegenerate,
}: UseMessageActionsProps) {
  const hasMessage = !!message;

  // ✨ 图标状态管理
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'success'>('idle');

  /**
   * 复制消息内容到剪贴板
   */
  const handleCopy = useCallback(async () => {
    try {
      // 触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let textToCopy = content;

      // 🐛 修复：如果 content 为空，从数据库重新获取 blocks 组合文本
      if (!textToCopy || textToCopy.trim() === '') {
        if (message) {
          logger.debug('[useMessageActions] content 为空，尝试从 blocks 重新获取', {
            messageId: message.id,
            contentLength: content.length,
          });

          const blocks = await MessageBlocksRepository.getBlocksByMessageId(message.id);
          const textBlocks = blocks
            .filter((b) => b.type === 'TEXT')
            .sort((a, b) => a.sortOrder - b.sortOrder);

          if (textBlocks.length > 0) {
            textToCopy = textBlocks.map((b) => b.content).join('');
            logger.debug('[useMessageActions] 从 blocks 获取到文本', {
              length: textToCopy.length,
            });
          } else {
            // 最后的 fallback：使用 message.text（兼容旧数据）
            textToCopy = message.text || '';
            logger.debug('[useMessageActions] 使用 message.text 作为 fallback', {
              length: textToCopy.length,
            });
          }
        }
      }

      // 复制到剪贴板
      await Clipboard.setStringAsync(textToCopy);

      // ✨ 图标状态变化：显示成功图标
      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 1500); // 1.5秒后恢复

      logger.debug('[useMessageActions] 复制成功', { length: textToCopy.length });
    } catch (error: any) {
      logger.error('[useMessageActions] 复制失败:', error);
    }
  }, [content, message]);

  /**
   * 分享消息内容
   */
  const handleShare = useCallback(async () => {
    try {
      // 触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 检查分享功能是否可用
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        logger.warn('[useMessageActions] 当前平台不支持分享功能');
        return;
      }

      let textToShare = content;

      // 🐛 修复：如果 content 为空，从数据库重新获取 blocks 组合文本
      if (!textToShare || textToShare.trim() === '') {
        if (message) {
          logger.debug('[useMessageActions] content 为空，尝试从 blocks 重新获取', {
            messageId: message.id,
            contentLength: content.length,
          });

          const blocks = await MessageBlocksRepository.getBlocksByMessageId(message.id);
          const textBlocks = blocks
            .filter((b) => b.type === 'TEXT')
            .sort((a, b) => a.sortOrder - b.sortOrder);

          if (textBlocks.length > 0) {
            textToShare = textBlocks.map((b) => b.content).join('');
            logger.debug('[useMessageActions] 从 blocks 获取到文本', {
              length: textToShare.length,
            });
          } else {
            // 最后的 fallback：使用 message.text（兼容旧数据）
            textToShare = message.text || '';
            logger.debug('[useMessageActions] 使用 message.text 作为 fallback', {
              length: textToShare.length,
            });
          }
        }
      }

      // 分享消息内容（复制到剪贴板）
      await Clipboard.setStringAsync(textToShare);

      // ✨ 图标状态变化：显示成功图标
      setShareState('success');
      setTimeout(() => setShareState('idle'), 1500); // 1.5秒后恢复

      logger.debug('[useMessageActions] 分享成功', { length: textToShare.length });
    } catch (error: any) {
      logger.error('[useMessageActions] 分享失败:', error);
    }
  }, [content, message]);

  /**
   * 重新生成 AI 回答
   */
  const handleRegenerateAction = useCallback(async () => {
    if (!hasMessage) return;

    try {
      // 触觉反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 调用回调函数
      if (onRegenerate) {
        onRegenerate();
      }
    } catch (error: any) {
      logger.error('[useMessageActions] 重新生成失败:', error);
    }
  }, [hasMessage, onRegenerate]);

  return {
    handleCopy,
    handleShare,
    handleRegenerate: handleRegenerateAction,
    copyState,
    shareState,
  };
}
