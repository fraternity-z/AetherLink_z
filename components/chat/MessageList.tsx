/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '@/hooks/use-messages';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { ThinkingChainRepository } from '@/storage/repositories/thinking-chains';
import type { Attachment, Message, ThinkingChain } from '@/storage/core';
import { appEvents, AppEvents } from '@/utils/events';
import { logger } from '@/utils/logger';

export function MessageList({ conversationId }: { conversationId: string | null }) {
  const theme = useTheme();
  const { items, reload } = useMessages(conversationId ?? null, 50);
  const { avatarUri } = useUserProfile(); // 获取用户头像 URI（性能优化：在列表层级调用一次）
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  const [thinkingChainsMap, setThinkingChainsMap] = useState<Record<string, ThinkingChain>>({});
  const [thinkingRefreshTick, setThinkingRefreshTick] = useState(0);

  // 🚀 自动滚动功能相关状态
  const flatListRef = useRef<FlashListRef<Message>>(null);
  const itemsLengthRef = useRef(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // 是否启用自动滚动
  const lastScrollTimeRef = useRef(0); // 上次滚动时间（用于节流）
  const isUserScrollingRef = useRef(false); // 用户是否正在手动滚动
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // 用于清理定时器，防止内存泄漏

  // 🚀 智能滚动到底部函数（带节流优化，300ms 间隔）
  const scrollToBottom = useCallback((animated: boolean = true, force: boolean = false) => {
    // force 参数：强制滚动，忽略用户滚动标记
    if (!autoScrollEnabled || (!force && isUserScrollingRef.current)) {
      return; // 自动滚动被禁用或用户正在滚动，不执行
    }

    const now = Date.now();
    // 节流：距离上次滚动不足 300ms，跳过本次滚动
    if (now - lastScrollTimeRef.current < 300) {
      return;
    }

    lastScrollTimeRef.current = now;
    const count = itemsLengthRef.current;
    if (count > 0) {
      flatListRef.current?.scrollToIndex({ index: count - 1, animated });
    }
  }, [autoScrollEnabled]);

  // 🚀 使用 ref 存储 scrollToBottom，避免闭包陷阱
  const scrollToBottomRef = useRef(scrollToBottom);
  scrollToBottomRef.current = scrollToBottom;

  // 🚀 检测用户手动滚动（向上滚动时暂停自动滚动）
  // 计算是否处于 AI 流式回复（最后一条为 assistant 且 pending）
  const isAssistantStreaming = useMemo(() => {
    if (items.length === 0) return false;
    const last = items[items.length - 1];
    return last.role === 'assistant' && last.status === 'pending';
  }, [items.length, items[items.length - 1]?.role, items[items.length - 1]?.status]);

  const handleScroll = useCallback(() => {
    // 流式期间始终保持底部：忽略用户滚动打断
    if (isAssistantStreaming) return;

    // 标记用户正在滚动，短时间内禁用自动滚动
    isUserScrollingRef.current = true;

    // 清除之前的定时器，避免累积
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 2 秒后恢复自动滚动，并主动触发一次滚动以跟上最新消息
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      // 恢复后立即触发一次滚动，确保跟上最新消息
      scrollToBottomRef.current?.(true);
    }, 2000);
  }, [isAssistantStreaming]);

  // 🧹 组件卸载时清理定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 监听消息清空事件，立即刷新列表
  useEffect(() => {
    const handleMessagesCleared = (clearedConversationId: string) => {
      if (clearedConversationId === conversationId) {
        // 立即重新加载消息列表
        reload();
      }
    };

    const handleMessageChanged = () => {
      // 消息变化：重新加载消息，并强制刷新一次思考链
      reload();
      setThinkingRefreshTick((x) => x + 1);
    };

    appEvents.on(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);
    appEvents.on(AppEvents.MESSAGE_CHANGED, handleMessageChanged);

    return () => {
      appEvents.off(AppEvents.MESSAGES_CLEARED, handleMessagesCleared);
      appEvents.off(AppEvents.MESSAGE_CHANGED, handleMessageChanged);
    };
  }, [conversationId, reload]);

  // 列表数据：按时间顺序（最新在底部）
  const data = useMemo(() => items, [items]);

  // 记录长度用于滚动定位
  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  // 🚀 消息数据变化时，自动滚动到底部（流式输出时的关键逻辑）
  useEffect(() => {
    if (items.length > 0) {
      // 延迟滚动，等待 DOM 更新完成
      const timer = setTimeout(() => {
        // 流式期间强制滚动到底部；否则按原逻辑（尊重用户滚动）
        scrollToBottomRef.current(isAssistantStreaming ? false : true, isAssistantStreaming);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [items.length, items[items.length - 1]?.text, isAssistantStreaming]);

  // 🚀 性能优化：缓存消息 ID 列表的字符串，避免每次重新计算
  const messageIdsKey = useMemo(
    () => items.map(m => m.id).join('|'),
    [items]
  );

  // 批量加载当前页消息的附件（减少查询次数）
  useEffect(() => {
    (async () => {
      try {
        const ids = items.map(m => m.id);
        if (ids.length === 0) {
          setAttachmentsMap({});
          return;
        }
        const map = await AttachmentRepository.getAttachmentsByMessageIds(ids);
        setAttachmentsMap(map);
      } catch (e) {
        logger.warn('[MessageList] load attachments error', e);
      }
    })();
  }, [messageIdsKey]);

  // 🚀 性能优化：缓存思考链依赖键（包含 id + status + 文本长度）
  const thinkingChainKey = useMemo(
    () => items.map(m => `${m.id}:${m.status}:${(m.text ?? '').length}`).join('|'),
    [items]
  );

  // 批量加载思考链数据（仅加载AI消息的思考链）
  // 注意：思考链是在助手消息创建后才保存，因此仅监听 id 列表不足以触发刷新。
  // 这里用 id + status + 文本长度 作为变化键，确保在流式更新或状态改变后重新拉取思考链。
  useEffect(() => {
    (async () => {
      try {
        const ids = items.map(m => m.id);
        if (ids.length === 0) {
          setThinkingChainsMap({});
          return;
        }
        const map = await ThinkingChainRepository.getThinkingChainsByMessageIds(ids);

        // 将 Map 转换为普通对象
        const objMap: Record<string, ThinkingChain> = {};
        map.forEach((value, key) => {
          objMap[key] = value;
        });
        setThinkingChainsMap(objMap);
      } catch (e) {
        logger.error('[MessageList] load thinking chains error', e);
      }
    })();
  }, [thinkingChainKey, thinkingRefreshTick]);

  // 🚀 性能优化：使用 useCallback 缓存 renderItem，避免 FlatList 不必要的重渲染
  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <MessageBubble
        content={item.text ?? ''}
        isUser={item.role === 'user'}
        status={item.status}
        timestamp={new Date(item.createdAt).toLocaleTimeString()}
        attachments={attachmentsMap[item.id] || []}
        thinkingChain={thinkingChainsMap[item.id] || null}
        modelId={item.extra?.model} // 传递模型 ID
        extra={item.extra} // 传递完整的 extra 数据（用于图片生成等特殊消息）
        userAvatarUri={item.role === 'user' ? avatarUri : undefined} // 用户消息传递头像 URI
      />
    ),
    [attachmentsMap, thinkingChainsMap, avatarUri] // 将 avatarUri 添加到依赖数组
  );

  return (
    <FlashList
      ref={flatListRef}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={items.length === 0 ? styles.contentContainerEmpty : styles.contentContainer}
      ListEmptyComponent={
        <View style={styles.emptyStateContainer}>
          <Text
            variant="bodyLarge"
            style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}
          >
            新对话已开启。幽浮喵是一位乐于助人的助手，为您提供快捷高效的问答服务。浮浮酱将认真为您服务哦♪ (´▽`)
          </Text>
        </View>
      }
      // 若需进一步优化，可在升级 FlashList 类型后添加 estimatedItemSize
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // 非 inverted 列表：为底部输入框预留空间使用 paddingBottom
  contentContainer: {
    paddingBottom: 170, // 为输入框预留空间（输入框高度约 100-150px + 额外边距）
    paddingTop: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  messagesContainer: {
    width: '100%',
  },
});
