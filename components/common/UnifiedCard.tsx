/**
 * 🃏 统一卡片组件
 *
 * 提供统一的卡片容器样式：
 * - 圆角设计
 * - 边框与阴影选项
 * - 自适应主题
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export interface UnifiedCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
}

export function UnifiedCard({
  children,
  title,
  subtitle,
  icon,
  style,
  contentStyle,
  variant = 'elevated',
  onPress,
}: UnifiedCardProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'filled'
      ? theme.colors.surfaceVariant
      : theme.colors.surface;

  const borderColor = theme.colors.outlineVariant;

  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outlined' ? 1 : 0,
        },
        variant === 'elevated' && styles.elevated,
        style,
        onPress && pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] },
      ]}
      onPress={onPress}
    >
      {(title || icon) && (
        <View style={styles.header}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.headerText}>
            {title && (
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, fontWeight: '600' }}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});