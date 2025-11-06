/**
 * 💭 消息气泡组件
 *
 * 功能：
 * - 显示单条消息内容
 * - 区分用户消息和 AI 消息样式
 * - 现代聊天应用风格的气泡设计
 */

import { View } from 'react-native';
import { Text, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import type { Attachment } from '@/storage/core';
import { MixedRenderer } from './MixedRenderer';
import { cn } from '@/utils/classnames';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  status?: 'pending' | 'sent' | 'failed';
  attachments?: Attachment[];
}

export function MessageBubble({ content, isUser, timestamp, status, attachments = [] }: MessageBubbleProps) {
  const theme = useTheme();

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
          <Avatar.Icon
            size={36}
            icon="robot"
            className="mx-0"
            style={{ backgroundColor: theme.colors.primary }}
          />
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
          {/* 附件预览（图片缩略图 + 文件条目） */}
          {attachments.length > 0 && (
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
    </View>
  );
}

