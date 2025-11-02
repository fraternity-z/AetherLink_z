import React from 'react';
import { List, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function PromptCollections() {
  return (
    <SettingScreen title="智能体提示词集合" description="浏览和使用常用提示词模板（占位）">
      <List.Section>
        <List.Item title="市场 / 社区（占位）" description="从社区检索与导入模板" left={(p) => <List.Icon {...p} icon="cloud-download" />} />
        <List.Item title="本地模板（占位）" description="管理本地提示词" left={(p) => <List.Icon {...p} icon="file-document" />} />
        <Button mode="contained" style={{ marginTop: 12 }}>新建模板（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

