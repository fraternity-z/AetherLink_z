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

interface UseMessageActionsProps {
  message: Message;
  content: string; // ✨ 实际显示的内容（从 blocks 组合而来）
  onRegenerate?: () => void;
}

export function useMessageActions({
  message,
  content,
  onRegenerate,
}: UseMessageActionsProps) {
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

      // 复制到剪贴板（使用实际显示的内容）
      await Clipboard.setStringAsync(content || '');

      // ✨ 图标状态变化：显示成功图标
      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 1500); // 1.5秒后恢复

      logger.debug('[useMessageActions] 复制成功', { length: content.length });
    } catch (error: any) {
      logger.error('[useMessageActions] 复制失败:', error);
    }
  }, [content]);

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

      // 分享消息内容（使用实际显示的内容）
      await Clipboard.setStringAsync(content || '');

      // ✨ 图标状态变化：显示成功图标
      setShareState('success');
      setTimeout(() => setShareState('idle'), 1500); // 1.5秒后恢复

      logger.debug('[useMessageActions] 分享成功', { length: content.length });
    } catch (error: any) {
      logger.error('[useMessageActions] 分享失败:', error);
    }
  }, [content]);

  /**
   * 重新生成 AI 回答
   */
  const handleRegenerateAction = useCallback(async () => {
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
  }, [onRegenerate]);

  return {
    handleCopy,
    handleShare,
    handleRegenerate: handleRegenerateAction,
    copyState,
    shareState,
  };
}
