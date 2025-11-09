/**
 * 💭 消息气泡组件
 *
 * 功能：
 * - 显示单条消息内容
 * - 区分用户消息和 AI 消息样式
 * - 现代聊天应用风格的气泡设计
 */

import React from 'react';
import { View, Alert } from 'react-native';
import { Text, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import type { Attachment, ThinkingChain, Message } from '@/storage/core';
import { MixedRenderer } from './MixedRenderer';
import { ThinkingBlock } from './ThinkingBlock';
import { GeneratedImageCard } from './GeneratedImageCard';
import { ImageViewer } from './ImageViewer';
import { cn } from '@/utils/classnames';
import { useModelLogo } from '@/utils/model-logo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  status?: 'pending' | 'sent' | 'failed';
  attachments?: Attachment[];
  thinkingChain?: ThinkingChain | null; // 思考链数据(仅AI消息)
  modelId?: string; // AI 模型 ID（用于显示对应的 logo）
  extra?: Message['extra']; // 消息额外数据（用于图片生成等特殊消息类型）
}

function MessageBubbleComponent({ content, isUser, timestamp, status, attachments = [], thinkingChain, modelId, extra }: MessageBubbleProps) {
  const theme = useTheme();
  const modelLogo = useModelLogo(modelId); // 获取模型 logo
  const [logoError, setLogoError] = React.useState(false);

  // 图片查看器状态
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [currentImageUri, setCurrentImageUri] = React.useState<string>('');
  const [currentImagePrompt, setCurrentImagePrompt] = React.useState<string | undefined>(undefined);

  // 调试日志: 检查思考链数据
  if (!isUser && thinkingChain) {
    console.log('[MessageBubble] 🎯 显示思考链:', {
      contentLength: thinkingChain.content.length,
      durationMs: thinkingChain.durationMs,
      messageContent: content.substring(0, 50),
    });
  }

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

      console.log('[MessageBubble] 开始下载图片:', imageUri);

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

      console.log('[MessageBubble] 下载成功:', file.uri);

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
      console.error('[MessageBubble] 下载失败:', error);
      Alert.alert('错误', error.message || '下载图片失败');
    }
  }, []);

  const getStatusIndicator = () => {
    if (!status || status === 'sent') return null;

    if (status === 'pending') {
      return <ActivityIndicator size="small" className="mx-1" />;
    }

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
      {/* 头像（上方） */}
      <View className="mb-1.5">
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
          <Avatar.Icon
            size={36}
            icon="account"
            className="mx-0"
            style={{ backgroundColor: theme.colors.secondary }}
          />
        )}
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

        {/* 气泡主体 */}
        <View
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            backgroundColor: isUser
              ? theme.colors.primary
              : theme.dark
                ? theme.colors.surfaceVariant
                : '#F0F0F0'
          }}
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
              ) : (
                /* 普通附件：图片缩略图 + 文件条目 */
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
                          borderColor: isUser
                            ? theme.colors.onPrimary
                            : theme.colors.outlineVariant,
                          backgroundColor: isUser
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Avatar.Icon
                          size={16}
                          icon="paperclip"
                          className="mr-1 m-0"
                          color={isUser ? theme.colors.onPrimary : theme.colors.onSurface}
                        />
                        <Text
                          variant="bodySmall"
                          numberOfLines={1}
                          className="flex-shrink"
                          style={{ color: isUser ? theme.colors.onPrimary : theme.colors.onSurface }}
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
              className={cn('text-[15px] leading-[22px]', attachments.length > 0 && 'mt-1')}
              style={{ color: theme.colors.onPrimary }}
            >
              {content || (status === 'pending' ? '正在发送...' : '')}
            </Text>
          ) : (
            <View className={attachments.length > 0 ? 'mt-1' : 'min-h-[20px]'}>
              <MixedRenderer
                content={content || (status === 'pending' ? '正在思考...' : '')}
              />
            </View>
          )}
        </View>

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

export const MessageBubble = React.memo(MessageBubbleComponent);
