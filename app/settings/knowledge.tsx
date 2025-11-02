import React from 'react';
import { List, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function KnowledgeSettings() {
  return (
    <SettingScreen title="知识库设置" description="管理知识库配置和嵌入模型（占位）">
      <List.Section>
        <List.Item title="知识库列表（占位）" description="尚未配置" left={(p) => <List.Icon {...p} icon="database-search" />} />
        <Button mode="contained" style={{ marginTop: 12 }}>新增知识库（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

