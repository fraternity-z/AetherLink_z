import React from 'react';
import { List, Text } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function AboutScreen() {
  return (
    <SettingScreen title="关于我们">
      <List.Section>
        <List.Item title="AetherLink Z" description="版本 0.1.0（占位）" left={(p) => <List.Icon {...p} icon="information" />} />
        <Text style={{ marginTop: 8 }}>开源许可与鸣谢（占位）</Text>
      </List.Section>
    </SettingScreen>
  );
}

