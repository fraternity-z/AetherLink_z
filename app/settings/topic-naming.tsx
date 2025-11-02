import React, { useState } from 'react';
import { List, Switch, TextInput } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function TopicNamingSettings() {
  const [autoName, setAutoName] = useState(true);
  const [prompt, setPrompt] = useState('请用简短中文总结本次对话主题');
  return (
    <SettingScreen title="话题命名设置" description="配置话题自动命名功能（占位）">
      <List.Section>
        <List.Item title="启用自动命名" right={() => <Switch value={autoName} onValueChange={setAutoName} />} />
        <TextInput label="命名提示词" value={prompt} onChangeText={setPrompt} multiline />
      </List.Section>
    </SettingScreen>
  );
}

