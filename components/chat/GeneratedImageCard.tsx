/**
 * ⚡ AI 生成图片展示卡片组件
 *
 * 功能：
 * - 显示 AI 生成的图片
 * - 显示原始提示词和优化后的提示词
 * - 支持点击查看大图
 * - AI 生成标识徽章
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme, Text, Chip } from 'react-native-paper';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { Attachment } from '@/storage/core';

interface GeneratedImageCardProps {
  attachment: Attachment;
  prompt?: string;
  revisedPrompt?: string;
  model?: string;
  onPress?: () => void; // 点击查看大图
}

export function GeneratedImageCard({
  attachment,
  prompt,
  revisedPrompt,
  model,
  onPress,
}: GeneratedImageCardProps) {
  const theme = useTheme();

  // 图片 URI
  const imageUri = attachment.uri || '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {/* 图片容器 */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.imageContainer}
        disabled={!onPress}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon name="image-off" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              图片加载失败
            </Text>
          </View>
        )}

        {/* 点击查看大图提示（悬浮在图片上） */}
        {onPress && imageUri && (
          <View style={[styles.viewHint, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
            <Icon name="magnify-plus" size={20} color="#FFFFFF" />
            <Text variant="bodySmall" style={styles.viewHintText}>
              点击查看大图
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 信息容器 */}
      <View style={styles.infoContainer}>
        {/* AI 生成标识 */}
        <View style={styles.badgeRow}>
          <Chip
            icon="sparkles"
            compact
            style={[
              styles.badge,
              { backgroundColor: `${theme.colors.primary}20` }
            ]}
            textStyle={{ color: theme.colors.primary, fontSize: 12 }}
          >
            AI 生成
          </Chip>

          {model && (
            <Chip
              icon="brain"
              compact
              style={[
                styles.modelBadge,
                { backgroundColor: `${theme.colors.secondary}20` }
              ]}
              textStyle={{ color: theme.colors.secondary, fontSize: 11 }}
            >
              {model}
            </Chip>
          )}
        </View>

        {/* 提示词信息 */}
        {prompt && (
          <View style={styles.promptSection}>
            <View style={styles.promptHeader}>
              <Icon name="text-box" size={16} color={theme.colors.onSurfaceVariant} />
              <Text
                variant="labelMedium"
                style={[styles.promptLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                提示词
              </Text>
            </View>
            <Text
              variant="bodyMedium"
              style={[styles.promptText, { color: theme.colors.onSurface }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {prompt}
            </Text>
          </View>
        )}

        {/* 优化后的提示词（DALL-E 3 特有） */}
        {revisedPrompt && revisedPrompt !== prompt && (
          <View style={styles.promptSection}>
            <View style={styles.promptHeader}>
              <Icon name="auto-fix" size={16} color={theme.colors.tertiary} />
              <Text
                variant="labelMedium"
                style={[styles.promptLabel, { color: theme.colors.tertiary }]}
              >
                AI 优化后
              </Text>
            </View>
            <Text
              variant="bodySmall"
              style={[styles.revisedPromptText, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {revisedPrompt}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // 正方形
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewHintText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  infoContainer: {
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    height: 28,
  },
  modelBadge: {
    height: 26,
  },
  promptSection: {
    gap: 6,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promptLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    lineHeight: 20,
  },
  revisedPromptText: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
