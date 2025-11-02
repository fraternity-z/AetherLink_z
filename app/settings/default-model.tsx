import React, { useState } from 'react';
import { List, TextInput, HelperText, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function DefaultModelSettings() {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');

  return (
    <SettingScreen title="配置模型" description="管理 AI 模型和 API 密钥（占位）">
      <List.Section>
        <TextInput label="API Key" value={apiKey} onChangeText={setApiKey} secureTextEntry autoCapitalize="none" />
        <HelperText type="info">不会持久化，仅示例占位。</HelperText>
        <TextInput label="Endpoint" value={endpoint} onChangeText={setEndpoint} autoCapitalize="none" />
        <TextInput label="默认模型" value={model} onChangeText={setModel} />
        <Button mode="contained" style={{ marginTop: 12 }}>保存（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

