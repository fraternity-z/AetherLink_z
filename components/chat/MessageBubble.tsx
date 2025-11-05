/**
 * 💭 消息气泡组件
 *
 * 功能：
 * - 显示单条消息内容
 * - 区分用户消息和 AI 消息样式
 * - 现代聊天应用风格的气泡设计
 */

import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import type { Attachment } from '@/storage/core';
import { MixedRenderer } from './MixedRenderer';

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
      return <ActivityIndicator size="small" style={styles.statusIndicator} />;
    }

    if (status === 'failed') {
      return (
        <Avatar.Icon
          size={16}
          icon="alert-circle"
          style={[styles.statusIndicator, { backgroundColor: theme.colors.error }]}
        />
      );
    }

    return null;
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer
    ]}>
      {/* 头像（上方） */}
      <View style={styles.avatarRow}>
        {!isUser ? (
          <Avatar.Icon
            size={36}
            icon="robot"
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
        ) : (
          <Avatar.Icon
            size={36}
            icon="account"
            style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}
          />
        )}
      </View>

      {/* 消息气泡容器 */}
      <View style={styles.bubbleWrapper}>
        {/* 气泡主体 */}
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: theme.colors.primary }
              : {
                  backgroundColor: theme.dark
                    ? theme.colors.surfaceVariant
                    : '#F0F0F0'
                }
          ]}
        >
          {/* 附件预览（图片缩略图 + 文件条目） */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {attachments.map(att => (
                att.kind === 'image' && att.uri ? (
                  <Image
                    key={att.id}
                    source={{ uri: att.uri }}
                    style={styles.imageThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View key={att.id} style={[
                    styles.fileItem,
                    {
                      borderColor: isUser
                        ? theme.colors.onPrimary
                        : theme.colors.outlineVariant,
                      backgroundColor: isUser
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(0, 0, 0, 0.05)'
                    }
                  ]}>
                    <Avatar.Icon
                      size={16}
                      icon="paperclip"
                      style={styles.fileIcon}
                      color={isUser ? theme.colors.onPrimary : theme.colors.onSurface}
                    />
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      style={[
                        styles.fileName,
                        { color: isUser ? theme.colors.onPrimary : theme.colors.onSurface }
                      ]}
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
              style={[
                styles.messageText,
                { color: theme.colors.onPrimary },
                attachments.length ? styles.contentWithAttachments : undefined
              ]}
            >
              {content || (status === 'pending' ? '正在发送...' : '')}
            </Text>
          ) : (
            <View style={[attachments.length ? styles.contentWithAttachments : styles.rendererContainer]}>
              <MixedRenderer
                content={content || (status === 'pending' ? '正在思考...' : '')}
              />
            </View>
          )}
        </View>

        {/* 时间戳和状态指示器 */}
        <View style={[
          styles.footerRow,
          isUser ? styles.footerRowUser : styles.footerRowAI
        ]}>
          {timestamp && (
            <Text
              variant="bodySmall"
              style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 12,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  avatarRow: {
    marginBottom: 6,
  },
  avatar: {
    marginHorizontal: 0,
  },
  bubbleWrapper: {
    flexDirection: 'column',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  footerRowUser: {
    justifyContent: 'flex-end',
  },
  footerRowAI: {
    justifyContent: 'flex-start',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  imageThumb: {
    width: 120,
    height: 80,
    borderRadius: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 200,
  },
  fileIcon: {
    marginRight: 4,
    margin: 0,
  },
  fileName: {
    flexShrink: 1,
  },
  contentWithAttachments: {
    marginTop: 4,
  },
  rendererContainer: {
    minHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  statusIndicator: {
    marginHorizontal: 4,
  },
});
