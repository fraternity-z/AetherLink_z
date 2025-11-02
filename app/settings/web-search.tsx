import React, { useState } from 'react';
import { List, Switch, TextInput } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function WebSearchSettings() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState('ddg');
  return (
    <SettingScreen title="网络搜索" description="配置网络搜索和相关服务（占位）">
      <List.Section>
        <List.Item title="启用网络搜索" right={() => <Switch value={enabled} onValueChange={setEnabled} />} />
        <TextInput label="搜索提供方" value={provider} onChangeText={setProvider} />
      </List.Section>
    </SettingScreen>
  );
}

