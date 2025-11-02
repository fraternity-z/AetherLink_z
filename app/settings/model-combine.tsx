import React from 'react';
import { List, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function ModelCombineSettings() {
  return (
    <SettingScreen title="模型组合" description="创建和管理多模型组合（占位）">
      <List.Section>
        <List.Item title="组合列表（占位）" description="尚未创建任何组合" left={(p) => <List.Icon {...p} icon="source-merge" />} />
        <Button mode="contained" style={{ marginTop: 12 }}>新建组合（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

