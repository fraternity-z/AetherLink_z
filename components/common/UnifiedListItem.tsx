/**
 * 📄 统一列表项组件
 *
 * 提供统一的列表项样式：
 * - 支持左侧图标/头像
 * - 支持标题和副标题
 * - 支持右侧操作或箭头
 * - 统一的按压态
 */

import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export interface UnifiedListItemProps {
  title: string;
  description?: string;
  leftIcon?: string;
  leftIconColor?: string;
  rightIcon?: string;
  rightText?: string;
  onPress?: () => void;
  style?: ViewStyle;
  showDivider?: boolean;
  titleStyle?: object;
}

export function UnifiedListItem({
  title,
  description,
  leftIcon,
  leftIconColor,
  rightIcon = 'chevron-right',
  rightText,
  onPress,
  style,
  showDivider = true,
  titleStyle,
}: UnifiedListItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
        },
        style,
      ]}
    >
      <View style={[
        styles.content,
        showDivider && { borderBottomColor: theme.colors.outlineVariant, borderBottomWidth: 0.5 }
      ]}>
        {/* 左侧图标 */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Icon
              name={leftIcon as any}
              size={24}
              color={leftIconColor || theme.colors.onSurfaceVariant}
            />
          </View>
        )}

        {/* 中间文本 */}
        <View style={styles.textContainer}>
          <Text
            variant="bodyLarge"
            style={[
              styles.title,
              { color: theme.colors.onSurface },
              titleStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {description && (
            <Text
              variant="bodySmall"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
        </View>

        {/* 右侧内容 */}
        <View style={styles.rightContainer}>
          {rightText && (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}
            >
              {rightText}
            </Text>
          )}
          {(rightIcon || onPress) && (
            <Icon
              name={rightIcon as any}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  leftIconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: '500',
  },
  description: {
    marginTop: 2,
    opacity: 0.8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});