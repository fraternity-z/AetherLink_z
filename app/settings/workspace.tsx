import React from 'react';
import { List, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function WorkspaceSettings() {
  return (
    <SettingScreen title="工作区管理" description="创建与管理工作区（占位）">
      <List.Section>
        <List.Item title="当前工作区" description="default" left={(p) => <List.Icon {...p} icon="folder-cog" />} />
        <Button mode="contained" style={{ marginTop: 12 }}>新建工作区（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

