import React, { useState } from 'react';
import { List, Switch, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function DataSettings() {
  const [analytics, setAnalytics] = useState(false);
  const [localCache, setLocalCache] = useState(true);
  return (
    <SettingScreen title="数据设置" description="存储与隐私（占位）">
      <List.Section>
        <List.Item title="启用匿名分析" right={() => <Switch value={analytics} onValueChange={setAnalytics} />} />
        <List.Item title="启用本地缓存" right={() => <Switch value={localCache} onValueChange={setLocalCache} />} />
        <Button style={{ marginTop: 12 }} mode="contained">清理缓存（占位）</Button>
      </List.Section>
    </SettingScreen>
  );
}

