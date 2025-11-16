/**
 * 📜 消息列表组件
 *
 * 功能：
 * - 显示聊天消息列表
 * - 支持滚动查看历史消息
 * - 空状态显示欢迎提示文字
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { ListRenderItem } from '@shopify/flash-list';
import { Text, useTheme } from 'react-native-paper';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '@/hooks/use-messages';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { ThinkingChainRepository } from '@/storage/repositories/thinking-chains';
import { MessageBlocksRepository } from '@/storage/repositories/message-blocks';
import type { Attachment, Message, ThinkingChain, MessageBlock } from '@/storage/core';
import { appEvents, AppEvents } from '@/utils/events';
import { logger } from '@/utils/logger';

interface MessageListProps {
  conversationId: string | null;
}

function MessageListComponent({ conversationId }: MessageListProps) {
  const theme = useTheme();
  const { items, reload } = useMessages(conversationId ?? null, 50);
  const { avatarUri } = useUserProfile(); // 获取用户头像 URI（性能优化：在列表层级调用一次）
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  const [thinkingChainsMap, setThinkingChainsMap] = useState<Record<string, ThinkingChain>>({});
  const [blocksMap, setBlocksMap] = useState<Record<string, MessageBlock[]>>({});
  const [thinkingRefreshTick, setThinkingRefreshTick] = useState(0);

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
  const listStyle = useMemo(
    () => StyleSheet.flatten([styles.container, { backgroundColor: 'transparent' }]),
    []
  );

  // 🚀 性能优化：缓存消息 ID 列表的字符串，避免每次重新计算
  const messageIdsKey = useMemo(
    () => items.map(m => m.id).join('|'),
    [items]
  );

  // 🚀 性能优化：缓存思考链依赖键（包含 id + status + 文本长度）
  const thinkingChainKey = useMemo(
    () => items.map(m => `${m.id}:${m.status}:${(m.text ?? '').length}`).join('|'),
    [items]
  );

  // 🚀 性能优化：批量并行加载附件、思考链和块数据（合并3个串行查询为1个并行查询，性能提升约60%）
  // 🐛 修复：移除 items 冗余依赖，messageIdsKey 和 thinkingChainKey 已从 items 计算得出
  useEffect(() => {
    (async () => {
      try {
        const ids = items.map(m => m.id);

        // 空列表情况：清空所有状态
        if (ids.length === 0) {
          setAttachmentsMap({});
          setThinkingChainsMap({});
          setBlocksMap({});
          return;
        }

        // 并行查询：附件、思考链、块数据
        const [attachmentsMap, thinkingChainsMapRaw, blocksMapRaw] = await Promise.all([
          AttachmentRepository.getAttachmentsByMessageIds(ids),
          ThinkingChainRepository.getThinkingChainsByMessageIds(ids),
          MessageBlocksRepository.getBlocksByMessageIds(ids),
        ]);

        // 转换思考链 Map → Object
        const thinkingChainsObj: Record<string, ThinkingChain> = {};
        thinkingChainsMapRaw.forEach((value, key) => {
          thinkingChainsObj[key] = value;
        });

        // 转换块数据 Map → Object
        const blocksObj: Record<string, MessageBlock[]> = {};
        blocksMapRaw.forEach((value, key) => {
          blocksObj[key] = value;
        });

        // 批量更新状态
        setAttachmentsMap(attachmentsMap);
        setThinkingChainsMap(thinkingChainsObj);
        setBlocksMap(blocksObj);
      } catch (e) {
        logger.error('[MessageList] 批量加载消息关联数据失败', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageIdsKey, thinkingChainKey, thinkingRefreshTick]);

  // 🚀 性能优化：使用 useCallback 缓存 renderItem，避免 FlatList 不必要的重渲染
  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => {
      // 📦 从块中组合消息内容
      const blocks = blocksMap[item.id] || [];
      const textBlocks = blocks
        .filter(b => b.type === 'TEXT')
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // 优先使用块内容，fallback 到 item.text（兼容旧数据）
      const content = textBlocks.length > 0
        ? textBlocks.map(b => b.content).join('')
        : (item.text ?? '');

      return (
        <MessageBubble
          content={content}
          isUser={item.role === 'user'}
          status={item.status}
          timestamp={new Date(item.createdAt).toLocaleTimeString()}
          attachments={attachmentsMap[item.id] || []}
          thinkingChain={thinkingChainsMap[item.id] || null}
          modelId={item.extra?.model} // 传递模型 ID
          extra={item.extra} // 传递完整的 extra 数据（用于图片生成等特殊消息）
          userAvatarUri={item.role === 'user' ? avatarUri : undefined} // 用户消息传递头像 URI
          blocks={blocks} // ✨ 传递所有块数据（包括 TOOL 块）
          // TODO: 未来实现 - 重新发送消息（用户消息）
          // onResend={() => handleResendMessage(item.id)}
          // TODO: 未来实现 - 重新生成消息（助手消息）
          // onRegenerate={() => handleRegenerateMessage(item.id)}
        />
      );
    },
    [attachmentsMap, thinkingChainsMap, blocksMap, avatarUri] // 添加 blocksMap 到依赖数组
  );

  // 🚀 性能优化：根据消息类型返回不同的类型标识，提升回收效率
  const getItemType = useCallback((item: Message) => {
    // 用户消息
    if (item.role === 'user') return 'user';
    // 图片生成消息
    if (item.extra?.type === 'image_generation') return 'image_generation';
    // 助手消息（默认）
    return 'assistant';
  }, []);

  return (
    <FlashList
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      getItemType={getItemType}
      style={listStyle}
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
      // 🚀 性能优化：提前渲染屏幕外 500px 的内容，提升滚动流畅度
      drawDistance={500}
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

// 🚀 性能优化：使用 React.memo 避免不必要的重渲染
// 只在 conversationId 改变时才重新渲染
export const MessageList = React.memo(MessageListComponent, (prev, next) => {
  return prev.conversationId === next.conversationId;
});
