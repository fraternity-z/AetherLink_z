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

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  status?: 'pending' | 'sent' | 'failed';
}

export function MessageBubble({ content, isUser, timestamp, status }: MessageBubbleProps) {
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
            <Text variant="bodyMedium">{content || (status === 'pending' ? '正在思考...' : '')}</Text>
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
  timestamp: {
    fontSize: 10,
    marginRight: 4,
  },
  statusIndicator: {
    marginLeft: 4,
  },
});
