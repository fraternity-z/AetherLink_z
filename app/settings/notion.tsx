import React, { useState } from 'react';
import { List, TextInput, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function NotionSettings() {
  const [token, setToken] = useState('');
  const [db, setDb] = useState('');
  return (
    <SettingScreen title="Notion 集成" description="配置 Notion 数据库导出（占位）">
      <List.Section>
        <TextInput label="Notion Token" value={token} onChangeText={setToken} secureTextEntry />
        <TextInput label="数据库 ID" value={db} onChangeText={setDb} />
        <Button style={{ marginTop: 12 }} mode="contained">保存（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

