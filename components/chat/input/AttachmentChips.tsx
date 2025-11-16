/**
 * 📎 附件预览 Chip 组件
 *
 * 功能：
 * - 在输入框上方显示已选附件的小 chip 提示
 * - 左侧显示文件图标
 * - 中间显示文件名（长文件名自动截断）
 * - 右侧显示关闭按钮可移除附件
 * - 浅蓝色背景，圆角设计
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import type { Attachment } from '@/storage/core';

interface AttachmentChipsProps {
  attachments: Attachment[];
  onRemove: (attachmentId: string) => void;
}

export function AttachmentChips({ attachments, onRemove }: AttachmentChipsProps) {
  const theme = useTheme();

  if (attachments.length === 0) {
    return null;
  }

  return (
    <View className="px-4 pb-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {attachments.map(att => (
          <View
            key={att.id}
            className="flex-row items-center rounded-full px-3 py-1.5"
            style={{
              backgroundColor: theme.dark ? '#1E3A5F' : '#E3F2FD',
              borderWidth: 1,
              borderColor: theme.dark ? '#2962FF' : '#90CAF9',
            }}
          >
            {/* 文件图标 */}
            <IconButton
              icon={att.kind === 'image' ? 'file-image' : 'file-document'}
              size={16}
              iconColor={theme.dark ? '#90CAF9' : '#1976D2'}
              style={{ margin: 0, marginRight: 4 }}
            />

            {/* 文件名（截断显示） */}
            <Text
              variant="bodySmall"
              numberOfLines={1}
              className="max-w-[150px]"
              style={{ color: theme.dark ? '#90CAF9' : '#1565C0' }}
            >
              {att.name || '附件'}
            </Text>

            {/* 关闭按钮 */}
            <TouchableOpacity
              onPress={() => onRemove(att.id)}
              className="ml-1"
            >
              <IconButton
                icon="close"
                size={14}
                iconColor={theme.dark ? '#90CAF9' : '#1976D2'}
                style={{ margin: 0 }}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
