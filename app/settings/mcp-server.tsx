import React, { useState } from 'react';
import { List, Switch, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function MCPServerSettings() {
  const [enabled, setEnabled] = useState(false);
  return (
    <SettingScreen title="MCP 服务端" description="高级服务器配置管理（占位）">
      <List.Section>
        <List.Item title="启用 MCP" right={() => <Switch value={enabled} onValueChange={setEnabled} />} />
        <Button mode="contained" style={{ marginTop: 12 }}>管理服务（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

