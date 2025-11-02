/**
 * ⚙️ 行为设置页面
 *
 * 功能：
 * - Enter键发送消息设置
 * - 启用通知设置
 * - 移动端输入法拦截模式
 * - 参考设计图样式实现
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, List, Switch, Text, useTheme, Divider } from 'react-native-paper';
import { router } from 'expo-router';

export default function BehaviorSettings() {
  const theme = useTheme();
  const [enterToSend, setEnterToSend] = React.useState(false);
  const [enableNotifications, setEnableNotifications] = React.useState(false);
  const [mobileInputMode, setMobileInputMode] = React.useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="行为设置" />
      </Appbar.Header>

      {/* 设置内容 */}
      <ScrollView>
        {/* 标题说明 */}
        <View style={styles.headerSection}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onBackground, marginBottom: 4 }}
          >
            交互行为
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            自定义应用的交互方式和通知设置
          </Text>
        </View>

        {/* 设置列表 */}
        <List.Section>
          {/* 使用Enter键发送清息 */}
          <View style={[styles.settingCard, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          }]}>
            <View style={styles.settingRow}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Text style={{ fontSize: 18 }}>🚀</Text>
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  使用Enter键发送清息
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  按Enter键快速发送消息，使用Shift+Enter添加换行
                </Text>
              </View>
              <Switch
                value={enterToSend}
                onValueChange={(value) => {
                  setEnterToSend(value);
                  // TODO: 实现Enter键发送逻辑切换
                  console.log('Enter键发送:', value);
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* 启用通知 */}
          <View style={[styles.settingCard, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          }]}>
            <View style={styles.settingRow}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={{ fontSize: 18 }}>🔔</Text>
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  启用通知
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  当AI助手回复完成时，显示系统桌面通知
                </Text>
              </View>
              <Switch
                value={enableNotifications}
                onValueChange={(value) => {
                  setEnableNotifications(value);
                  // TODO: 实现通知逻辑切换
                  console.log('启用通知:', value);
                }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* 移动端输入法拦截模式 */}
          <View style={[styles.settingCard, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          }]}>
            <View style={styles.settingRow}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={{ fontSize: 18 }}>📱</Text>
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  移动端输入法拦截模式
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  开启后，移动端输入法的发送按钮将发送消息而非发送清息
                </Text>
              </View>
              <Switch
                value={mobileInputMode}
                onValueChange={(value) => {
                  setMobileInputMode(value);
                  // TODO: 实现移动端输入法拦截逻辑
                  console.log('移动端输入法拦截:', value);
                }}
              />
            </View>
          </View>
        </List.Section>

        {/* TODO 提示 */}
        <View style={styles.todoHint}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
          >
            💡 TODO: 实现设置项的持久化存储
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
          >
            💡 TODO: 实现Enter键发送消息功能
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
          >
            💡 TODO: 实现系统通知功能
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  settingCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  divider: {
    height: 12,
  },
  todoHint: {
    marginTop: 32,
    marginBottom: 24,
    paddingHorizontal: 24,
    opacity: 0.5,
  },
});
