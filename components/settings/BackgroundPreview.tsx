import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface BackgroundPreviewProps {
  imagePath: string;
  opacity: number;
}

/**
 * 背景预览组件
 * 在设置页面展示背景效果的实时预览
 */
export function BackgroundPreview({ imagePath, opacity }: BackgroundPreviewProps) {
  const theme = useTheme();

  return (
    <Card style={styles.previewCard}>
      {/* 背景图片层 */}
      <Image
        source={{ uri: imagePath }}
        style={[styles.backgroundImage, { opacity }]}
        resizeMode="cover"
      />

      {/* 模拟聊天气泡 */}
      <View style={styles.mockChat}>
        <Card
          style={[
            styles.userBubble,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              这是预览效果
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.aiBubble,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              背景看起来不错！
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* 提示文字 */}
      <View style={styles.hintContainer}>
        <Text variant="labelSmall" style={styles.hintText}>
          ↑ 实时预览效果
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    height: 200,
    margin: 16,
    overflow: 'hidden',
    borderRadius: 12,
    elevation: 2,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  mockChat: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '70%',
    marginBottom: 8,
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hintText: {
    color: '#fff',
  },
});
