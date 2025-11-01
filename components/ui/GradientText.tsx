/**
 * 🎨 渐变文字组件
 *
 * 功能：
 * - 实现紫色系渐变文字效果
 * - 参考 AetherLink 的标题样式
 * - 使用 LinearGradient 实现
 */

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { AppColors } from '@/constants/theme';

interface GradientTextProps extends TextProps {
  colors?: [string, string, ...string[]];
}

export function GradientText({
  colors = AppColors.gradient as [string, string, ...string[]],
  style,
  children,
  ...props
}: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <Text {...props} style={[styles.text, style]}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text {...props} style={[styles.text, style, styles.transparent]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
  },
  transparent: {
    opacity: 0,
  },
});
