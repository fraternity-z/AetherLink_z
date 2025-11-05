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
import { View, StyleSheet } from 'react-native';
import { List, Switch, Text, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

export default function BehaviorSettings() {
  const theme = useTheme();
  const sr = SettingsRepository();
  const [enterToSend, setEnterToSend] = React.useState(false);
  const [mobileInputMode, setMobileInputMode] = React.useState(false);

  // 加载持久化设置
  React.useEffect(() => {
    (async () => {
      const ets = await sr.get<boolean>(SettingKey.EnterToSend);
      const mim = await sr.get<boolean>(SettingKey.MobileInputMode);
      if (ets !== null) setEnterToSend(ets);
      if (mim !== null) setMobileInputMode(mim);
    })();
  }, []);

  return (
    <SettingScreen title="行为设置" description="自定义应用的交互方式和通知设置">
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
                onValueChange={async (value) => {
                  setEnterToSend(value);
                  await sr.set(SettingKey.EnterToSend, value);
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
                onValueChange={async (value) => {
                  setMobileInputMode(value);
                  await sr.set(SettingKey.MobileInputMode, value);
                }}
              />
            </View>
          </View>
        </List.Section>
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
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
});
