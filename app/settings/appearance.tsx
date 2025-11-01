/**
 * 🎨 外观设置页面
 *
 * 功能：
 * - 主题模式切换（浅色/深色/跟随系统）
 * - 字体大小调节
 * - 占位实现，使用 TODO 标注
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, List, Switch, Divider, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

export default function AppearanceSettings() {
  const theme = useTheme();
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="外观设置" />
      </Appbar.Header>

      {/* 设置内容 */}
      <ScrollView>
        <List.Section>
          <List.Subheader>主题</List.Subheader>

          <List.Item
            title="深色模式"
            description="切换深色或浅色主题"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={(value) => {
                  setDarkMode(value);
                  // TODO: 实现主题切换逻辑
                  console.log('切换主题:', value ? '深色' : '浅色');
                }}
              />
            )}
          />
          <Divider />

          <List.Item
            title="跟随系统主题"
            description="自动匹配系统主题设置"
            left={(props) => <List.Icon {...props} icon="auto-fix" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: 实现跟随系统主题逻辑
              console.log('切换跟随系统主题');
            }}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>文字</List.Subheader>

          <List.Item
            title="字体大小"
            description="调整应用内文字大小"
            left={(props) => <List.Icon {...props} icon="format-size" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: 实现字体大小调节逻辑
              console.log('打开字体大小设置');
            }}
          />
        </List.Section>

        {/* TODO 提示 */}
        <View style={styles.todoHint}>
          <List.Item
            title="💡 TODO: 实现主题切换持久化"
            description="使用 AsyncStorage 或 Redux Persist 保存主题偏好"
            titleStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            descriptionStyle={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}
          />
          <List.Item
            title="💡 TODO: 实现字体大小调节滑块"
            description="添加 Slider 组件控制全局字体比例"
            titleStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            descriptionStyle={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  todoHint: {
    marginTop: 24,
    opacity: 0.5,
  },
});
