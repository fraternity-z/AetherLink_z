import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, useTheme, IconButton } from 'react-native-paper';

/**
 * UserAvatar 组件属性接口
 */
export interface UserAvatarProps {
  /** 头像大小，默认 40 */
  size?: number;
  /** 头像图片 URI，null 时显示默认图标 */
  uri?: string | null;
  /** 是否显示编辑徽章（右下角小图标），默认 false */
  showBadge?: boolean;
  /** 点击回调 */
  onPress?: () => void;
}

/**
 * 用户头像组件
 *
 * 统一的用户头像显示组件，支持自定义头像和默认图标的切换。
 * 可在侧边栏、对话页等多处复用。
 *
 * @example
 * ```tsx
 * // 基础用法 - 显示头像
 * <UserAvatar size={40} uri={avatarUri} />
 *
 * // 可编辑头像 - 带徽章和点击事件
 * <UserAvatar
 *   size={40}
 *   uri={avatarUri}
 *   showBadge
 *   onPress={() => handleEditAvatar()}
 * />
 *
 * // 对话页用户头像 - 小尺寸
 * <UserAvatar size={36} uri={avatarUri} />
 * ```
 *
 * @param {UserAvatarProps} props - 组件属性
 * @returns {JSX.Element} 头像组件
 */
export function UserAvatar({
  size = 40,
  uri,
  showBadge = false,
  onPress,
}: UserAvatarProps): JSX.Element {
  const theme = useTheme();

  // 头像内容
  const avatarContent = uri ? (
    <Avatar.Image
      source={{ uri }}
      size={size}
      style={{
        backgroundColor: theme.colors.surfaceVariant,
      }}
    />
  ) : (
    <Avatar.Icon
      icon="account"
      size={size}
      style={{
        backgroundColor: theme.colors.primary,
      }}
    />
  );

  // 如果有点击事件，包裹 Pressable
  const interactiveAvatar = onPress ? (
    <Pressable onPress={onPress} style={styles.pressable}>
      {avatarContent}
    </Pressable>
  ) : (
    avatarContent
  );

  // 如果需要编辑徽章，包裹 View 并添加徽章
  if (showBadge) {
    return (
      <View style={styles.badgeContainer}>
        {interactiveAvatar}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.surface,
            },
          ]}
        >
          <IconButton
            icon="pencil"
            size={size * 0.35}
            iconColor={theme.colors.onPrimary}
            style={styles.badgeIcon}
          />
        </View>
      </View>
    );
  }

  return interactiveAvatar;
}

const styles = StyleSheet.create({
  pressable: {
    // 确保 Pressable 不影响布局
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 100,
    borderWidth: 2,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    margin: 0,
    padding: 0,
  },
});
