/**
 * 聊天输入工具栏组件
 *
 * 职责：
 * - 显示工具按钮（搜索、附件、更多、语音、发送）
 * - 按钮状态管理（禁用、激活）
 * - 视觉反馈
 */

import React from 'react';
import { View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { VoiceInputButton } from './VoiceInputButton';

/**
 * ChatInputToolbar 组件属性
 */
export interface ChatInputToolbarProps {
  // 搜索相关
  searchEnabled: boolean;
  isSearching: boolean;
  onToggleSearch: () => void;

  // 附件相关
  onAttachment: () => void;

  // 更多操作
  onMoreActions: () => void;

  // 语音输入
  onVoiceTextRecognized: (text: string) => void;

  // 发送相关
  isGenerating: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
}

/**
 * 聊天输入工具栏组件
 */
export const ChatInputToolbar = React.memo(function ChatInputToolbar({
  searchEnabled,
  isSearching,
  onToggleSearch,
  onAttachment,
  onMoreActions,
  onVoiceTextRecognized,
  isGenerating,
  canSend,
  onSend,
  onStop,
}: ChatInputToolbarProps) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center justify-between px-2 py-2 min-h-[52px]">
      {/* 左侧工具按钮组 */}
      <View className="flex-row items-center">
        {/* 网络搜索按钮 */}
        <IconButton
          icon="web"
          iconColor={searchEnabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
          size={20}
          onPress={onToggleSearch}
          disabled={isSearching}
          style={{ marginHorizontal: 2 }}
        />

        {/* 附件按钮 */}
        <IconButton
          icon="attachment"
          iconColor={theme.colors.onSurfaceVariant}
          size={20}
          onPress={onAttachment}
          style={{ marginHorizontal: 2 }}
        />

        {/* 更多操作按钮 */}
        <IconButton
          icon="plus-circle-outline"
          iconColor={theme.colors.onSurfaceVariant}
          size={20}
          onPress={onMoreActions}
          style={{ marginHorizontal: 2 }}
        />
      </View>

      {/* 右侧发送按钮组 */}
      <View className="flex-row items-center">
        {/* 语音输入按钮 */}
        <VoiceInputButton onTextRecognized={onVoiceTextRecognized} />

        {/* 发送/停止按钮 */}
        <IconButton
          icon={isGenerating ? "stop" : "send"}
          iconColor={
            isGenerating
              ? "#fff"
              : canSend
                ? theme.colors.primary
                : theme.colors.onSurfaceDisabled
          }
          size={20}
          onPress={isGenerating ? onStop : onSend}
          disabled={!canSend && !isGenerating}
          style={[
            { marginHorizontal: 2 },
            isGenerating && {
              backgroundColor: theme.colors.error,
            }
          ]}
        />
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // 优化渲染：仅当关键属性变化时重新渲染
  return (
    prevProps.searchEnabled === nextProps.searchEnabled &&
    prevProps.isSearching === nextProps.isSearching &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.canSend === nextProps.canSend
  );
});
