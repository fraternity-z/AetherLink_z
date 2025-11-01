/**
 * ⚙️ 设置主页面
 *
 * 功能：
 * - 显示分组的设置选项
 * - Material Design 风格
 * - 参考 AetherLink 设计
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { SettingsList } from '@/components/settings/SettingsList';

export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <Appbar.Header elevated>
        <Appbar.BackAction
          onPress={() => {
            router.back();
          }}
        />
        <Appbar.Content title="设置" />
      </Appbar.Header>

      {/* 设置列表 */}
      <SettingsList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
