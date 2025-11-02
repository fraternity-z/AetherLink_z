import React from 'react';
import { List, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function QuickPhrasesSettings() {
  return (
    <SettingScreen title="快捷短语" description="创建常用提示模板（占位）">
      <List.Section>
        <List.Item title="暂无快捷短语" description="点击下方创建一个" left={(p) => <List.Icon {...p} icon="message-text" />} />
        <Button mode="contained" style={{ marginTop: 12 }}>新建短语（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

