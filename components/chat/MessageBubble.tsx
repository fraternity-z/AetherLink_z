/**
 * 💭 消息气泡组件
 *
 * 功能：
 * - 显示单条消息内容
 * - 区分用户消息和 AI 消息样式
 * - Material Design 卡片样式
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme, Avatar, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import type { Attachment } from '@/storage/core';

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
      <View style={styles.messageRow}>
        {!isUser && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
        )}

        <Card
          style={[
            styles.card,
            isUser ? { backgroundColor: theme.colors.primaryContainer } : {}
          ]}
        >
          <Card.Content>
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
                    <View key={att.id} style={[styles.fileItem, { borderColor: theme.colors.outlineVariant }]}> 
                      <Avatar.Icon size={16} icon="paperclip" style={styles.fileIcon} />
                      <Text variant="bodySmall" numberOfLines={1} style={styles.fileName}>
                        {att.name || '附件'}
                      </Text>
                    </View>
                  )
                ))}
              </View>
            )}

            <Text variant="bodyMedium" style={attachments.length ? styles.contentWithAttachments : undefined}>
              {content || (status === 'pending' ? '正在思考...' : '')}
            </Text>
            <View style={styles.footerRow}>
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
          </Card.Content>
        </Card>

        {isUser && (
          <Avatar.Icon
            size={32}
            icon="account"
            style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  avatar: {
    marginHorizontal: 8,
  },
  card: {
    flex: 1,
    elevation: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  imageThumb: {
    width: 120,
    height: 80,
    borderRadius: 8,
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
    marginRight: 6,
  },
  fileName: {
    flexShrink: 1,
  },
  contentWithAttachments: {
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    marginRight: 4,
  },
  statusIndicator: {
    marginLeft: 4,
  },
});
