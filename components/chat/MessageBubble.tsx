/**
 * 💭 消息气泡组件
 *
 * 功能：
 * - 显示单条消息内容
 * - 区分用户消息和 AI 消息样式
 * - 现代聊天应用风格的气泡设计
 */

import React from 'react';
import { View, Alert, Pressable } from 'react-native';
import { Text, useTheme, Avatar, Menu } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import type { Attachment, ThinkingChain, Message, MessageBlock } from '@/storage/core';
import { MixedRenderer } from './MixedRenderer';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolBlock } from './ToolBlock';
import { GeneratedImageCard } from './GeneratedImageCard';
import { ImageViewer } from './ImageViewer';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '@/utils/classnames';
import { useModelLogo } from '@/utils/model-logo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { logger } from '@/utils/logger';
import { UserAvatar } from '@/components/common/UserAvatar';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  status?: 'pending' | 'sent' | 'failed';
  attachments?: Attachment[];
  thinkingChain?: ThinkingChain | null; // 思考链数据(仅AI消息)
  modelId?: string; // AI 模型 ID（用于显示对应的 logo）
  extra?: Message['extra']; // 消息额外数据（用于图片生成等特殊消息类型）
  userAvatarUri?: string | null; // 用户头像 URI（仅用户消息）
  blocks?: MessageBlock[]; // ✨ 消息块数据（包括 TEXT, TOOL 等类型）

  // 功能扩展回调
  onResend?: () => void;      // TODO: 重新发送(用户消息)
  onRegenerate?: () => void;  // TODO: 重新生成(助手消息)
}

function MessageBubbleComponent({ content, isUser, timestamp, status, attachments = [], thinkingChain, modelId, extra, userAvatarUri, blocks = [], onResend, onRegenerate }: MessageBubbleProps) {
  const theme = useTheme();
  const modelLogo = useModelLogo(modelId); // 获取模型 logo
  const [logoError, setLogoError] = React.useState(false);

  // ✨ 筛选工具块（按 sortOrder 排序）
  const toolBlocks = blocks
    .filter(b => b.type === 'TOOL')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // 图片查看器状态
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [currentImageUri, setCurrentImageUri] = React.useState<string>('');
  const [currentImagePrompt, setCurrentImagePrompt] = React.useState<string | undefined>(undefined);

  // 长按菜单状态
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState({ x: 0, y: 0 });

  // 调试：如需检查思考链数据可在此处添加日志

  // 打开图片查看器
  const handleImagePress = React.useCallback((imageUri: string, prompt?: string) => {
    setCurrentImageUri(imageUri);
    setCurrentImagePrompt(prompt);
    setViewerVisible(true);
  }, []);

  // 关闭图片查看器
  const handleCloseViewer = React.useCallback(() => {
    setViewerVisible(false);
    setCurrentImageUri('');
    setCurrentImagePrompt(undefined);
  }, []);

  // 长按下载图片
  const handleImageLongPress = React.useCallback(async (imageUri: string) => {
    if (!imageUri) return;

    try {
      // 如果是本地文件，直接分享
      if (imageUri.startsWith('file://')) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(imageUri);
        } else {
          Alert.alert('提示', '当前平台不支持分享功能');
        }
        return;
      }

      // 如果是网络图片，先下载
      const timestamp = new Date().getTime();
      const filename = `aetherlink_image_${timestamp}.png`;
      const file = new File(Paths.document, filename);


      // 使用 fetch 下载图片
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      // 获取图片数据并转换为 base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      // 写入文件
      await file.write(base64, { encoding: 'base64' });


      // 分享/保存图片
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: '保存图片',
        });
      } else {
        Alert.alert('成功', `图片已保存到: ${file.uri}`);
      }
    } catch (error: any) {
      logger.error('[MessageBubble] 下载失败:', error);
      Alert.alert('错误', error.message || '下载图片失败');
    }
  }, []);

  // 打开长按菜单
  const openMenu = React.useCallback((event: any) => {
    // 触觉反馈
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 设置菜单锚点位置
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setMenuVisible(true);
  }, []);

  // 关闭菜单
  const closeMenu = React.useCallback(() => {
    setMenuVisible(false);
  }, []);

  // 复制消息内容
  const handleCopyMessage = React.useCallback(async () => {
    try {
      await Clipboard.setStringAsync(content);
      closeMenu();
      Alert.alert('已复制', '消息内容已复制到剪贴板');
    } catch (error: any) {
      logger.error('[MessageBubble] 复制失败:', error);
      Alert.alert('错误', '复制失败，请重试');
    }
  }, [content, closeMenu]);

  // TODO: 重新发送消息（用户消息）
  // const handleResend = React.useCallback(() => {
  //   closeMenu();
  //   onResend?.();
  // }, [onResend]);

  // TODO: 重新生成消息（助手消息）
  // const handleRegenerate = React.useCallback(() => {
  //   closeMenu();
  //   onRegenerate?.();
  // }, [onRegenerate]);

  const getStatusIndicator = () => {
    if (!status || status === 'sent' || status === 'pending') return null;

    if (status === 'failed') {
      return (
        <Avatar.Icon
          size={16}
          icon="alert-circle"
          className="mx-1"
          style={{ backgroundColor: theme.colors.error }}
        />
      );
    }

    return null;
  };

  return (
    <View className={cn(
      'my-1.5 mx-3 max-w-[85%]',
      isUser ? 'self-end items-end' : 'self-start items-start'
    )}>
      {/* 头像 + 模型名（同一行显示） */}
      <View className="mb-1.5 flex-row items-center gap-5">
        {!isUser ? (
          modelLogo && !logoError ? (
            // 使用 Avatar.Image 渲染本地静态 logo（更稳）
            <Avatar.Image
              size={36}
              source={modelLogo}
              style={{ backgroundColor: theme.dark ? '#2A2A2A' : '#F2F2F2' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            // 没有 logo 则使用默认机器人图标
            <Avatar.Icon
              size={36}
              icon="robot"
              className="mx-0"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )
        ) : (
          <UserAvatar size={36} uri={userAvatarUri} />
        )}

        {/* 模型名称标签：助手消息在头像右侧展示 */}
        {!isUser && modelId ? (
          <Text
            variant="labelSmall"
            className="ml-0"
            style={{ color: theme.colors.onSurfaceVariant, fontSize: 15, lineHeight: 20, marginLeft: 16 }}
          >
            {modelId}
          </Text>
        ) : null}
      </View>

      {/* 消息气泡容器 */}
      <View className="flex-col">
        {/* 思考链组件(仅AI消息且有思考链数据时显示,位于气泡上方) */}
        {!isUser && thinkingChain && (
          <ThinkingBlock
            content={thinkingChain.content}
            durationMs={thinkingChain.durationMs}
            isStreaming={status === 'pending'}
          />
        )}

        {/* ✨ 工具块(仅AI消息且有工具调用时显示,位于思考链和气泡之间) */}
        {!isUser && toolBlocks.length > 0 && (
          <View className="mb-2">
            {toolBlocks.map((block) => (
              <ToolBlock key={block.id} block={block} />
            ))}
          </View>
        )}

        {/* 气泡主体 */}
        <Pressable
          onLongPress={content && content.trim().length > 0 && status !== 'pending' ? openMenu : undefined}
          delayLongPress={500}
          style={({ pressed }) => ({
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: isUser
              ? theme.dark ? '#BA68C8' : '#E1BEE7' // 浅紫色
              : theme.dark
                ? theme.colors.surfaceVariant
                : '#F0F0F0',
            opacity: pressed ? 0.8 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
        >
          {/* 附件预览 */}
          {attachments.length > 0 && (
            <>
              {/* AI 图片生成消息：使用专门的 GeneratedImageCard */}
              {extra?.type === 'image_generation' ? (
                <View className="mb-2">
                  {attachments.map(att => (
                    att.kind === 'image' && att.uri ? (
                      <GeneratedImageCard
                        key={att.id}
                        attachment={att}
                        prompt={extra.prompt}
                        revisedPrompt={extra.revisedPrompt}
                        model={extra.model}
                        onPress={() => handleImagePress(att.uri!, extra.prompt)}
                        onLongPress={() => handleImageLongPress(att.uri!)}
                      />
                    ) : null
                  ))}
                </View>
              ) : isUser ? (
                /* 用户消息：使用小 chip 样式 */
                <View className="flex-row flex-wrap gap-1.5 mb-2">
                  {attachments.map(att => (
                    <View
                      key={att.id}
                      className="flex-row items-center rounded-full px-2 py-1"
                      style={{
                        backgroundColor: theme.dark
                          ? 'rgba(255, 255, 255, 0.25)'
                          : 'rgba(74, 20, 140, 0.15)', // 深紫色半透明
                        borderWidth: 1,
                        borderColor: theme.dark
                          ? 'rgba(255, 255, 255, 0.4)'
                          : 'rgba(74, 20, 140, 0.3)', // 深紫色边框
                      }}
                    >
                      {/* 文件图标 */}
                      <Avatar.Icon
                        size={14}
                        icon={att.kind === 'image' ? 'file-image' : 'file-document'}
                        style={{
                          margin: 0,
                          marginRight: 4,
                          backgroundColor: 'transparent'
                        }}
                        color={theme.dark ? '#FFFFFF' : '#4A148C'} // 深紫色图标
                      />
                      {/* 文件名 */}
                      <Text
                        variant="bodySmall"
                        numberOfLines={1}
                        className="max-w-[120px] text-[11px]"
                        style={{ color: theme.dark ? '#FFFFFF' : '#4A148C' }} // 深紫色文字
                      >
                        {att.name || '附件'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                /* AI 消息：普通附件显示（图片缩略图 + 文件条目） */
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {attachments.map(att => (
                    att.kind === 'image' && att.uri ? (
                      <Image
                        key={att.id}
                        source={{ uri: att.uri }}
                        className="w-[120px] h-20 rounded-[10px]"
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        key={att.id}
                        className="flex-row items-center border rounded-lg px-2 py-1 max-w-[200px]"
                        style={{
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Avatar.Icon
                          size={16}
                          icon="paperclip"
                          className="mr-1 m-0"
                          color={theme.colors.onSurface}
                        />
                        <Text
                          variant="bodySmall"
                          numberOfLines={1}
                          className="flex-shrink"
                          style={{ color: theme.colors.onSurface }}
                        >
                          {att.name || '附件'}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
              )}
            </>
          )}

          {/* 智能内容渲染：用户消息使用纯文本，AI 消息支持 Markdown 和数学公式 */}
          {isUser ? (
            <Text
              variant="bodyMedium"
              className={cn(
                'text-[15px] leading-[22px]',
                attachments.length > 0 && 'mt-1'
              )}
              style={{
                color: theme.dark ? '#FFFFFF' : '#4A148C', // 浅紫色背景配深紫色文字
                flexShrink: 1,
              }}
            >
              {content || (status === 'pending' ? '正在发送...' : '')}
            </Text>
          ) : (
            <View className={attachments.length > 0 ? 'mt-1' : 'min-h-[20px]'}>
              {status === 'pending' && !content ? (
                <TypingIndicator />
              ) : (
                <MixedRenderer content={content || ''} />
              )}
            </View>
          )}
        </Pressable>

        {/* 时间戳和状态指示器 */}
        <View className={cn(
          'flex-row items-center mt-1 px-0.5',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          {timestamp && (
            <Text
              variant="bodySmall"
              className="text-[11px] mx-1"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {timestamp}
            </Text>
          )}
          {getStatusIndicator()}
        </View>
      </View>

      {/* 长按菜单 */}
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={menuAnchor}
        anchorPosition="top"
        contentStyle={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          minWidth: 160,
        }}
      >
        <Menu.Item
          onPress={handleCopyMessage}
          title="复制"
          leadingIcon="content-copy"
          titleStyle={{ fontSize: 15 }}
          disabled={!content || content.trim().length === 0 || status === 'pending'}
        />

        {/* TODO: 未来功能 - 重新发送(仅用户消息) */}
        {/* {isUser && (
          <Menu.Item
            onPress={handleResend}
            title="重新发送"
            leadingIcon="send"
            titleStyle={{ fontSize: 15 }}
          />
        )} */}

        {/* TODO: 未来功能 - 重新生成(仅助手消息) */}
        {/* {!isUser && (
          <Menu.Item
            onPress={handleRegenerate}
            title="重新生成"
            leadingIcon="refresh"
            titleStyle={{ fontSize: 15 }}
          />
        )} */}
      </Menu>

      {/* 图片查看器 */}
      <ImageViewer
        visible={viewerVisible}
        imageUri={currentImageUri}
        onClose={handleCloseViewer}
        prompt={currentImagePrompt}
      />
    </View>
  );
}

// 🚀 性能优化：自定义 memo 比较函数，只在真正变化时才重新渲染
function arePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  // 比较基础字段
  if (
    prev.content !== next.content ||
    prev.isUser !== next.isUser ||
    prev.status !== next.status ||
    prev.timestamp !== next.timestamp ||
    prev.modelId !== next.modelId ||
    prev.userAvatarUri !== next.userAvatarUri
  ) {
    return false;
  }

  // 比较附件数组（处理可选值）
  const prevAtt = prev.attachments ?? [];
  const nextAtt = next.attachments ?? [];
  if (prevAtt.length !== nextAtt.length) {
    return false;
  }
  for (let i = 0; i < prevAtt.length; i++) {
    if (prevAtt[i].id !== nextAtt[i].id) {
      return false;
    }
  }

  // 比较思考链
  if (prev.thinkingChain?.id !== next.thinkingChain?.id) {
    return false;
  }
  if (prev.thinkingChain && next.thinkingChain) {
    if (
      prev.thinkingChain.content !== next.thinkingChain.content ||
      prev.thinkingChain.durationMs !== next.thinkingChain.durationMs
    ) {
      return false;
    }
  }

  // 比较 extra 字段（浅比较主要属性）
  if (prev.extra?.imageGenerationResult !== next.extra?.imageGenerationResult) {
    return false;
  }

  // 所有关键属性相同，不需要重新渲染
  return true;
}

export const MessageBubble = React.memo(MessageBubbleComponent, arePropsEqual);
