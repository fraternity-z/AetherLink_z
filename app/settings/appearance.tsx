import React, { useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, List, Switch, Text } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function AppearanceSettings() {
  const [themeMode, setThemeMode] = useState<'system'|'light'|'dark'>('system');
  const [compactUI, setCompactUI] = useState(false);
  const [useRounded, setUseRounded] = useState(true);

  return (
    <SettingScreen title="外观" description="主题、字体大小与语言等显示相关设置">
      <List.Section>
        <List.Subheader>主题</List.Subheader>
        <SegmentedButtons
          value={themeMode}
          onValueChange={(v) => setThemeMode(v as any)}
          buttons={[
            { value: 'system', label: '跟随系统', icon: 'theme-light-dark' },
            { value: 'light', label: '浅色', icon: 'white-balance-sunny' },
            { value: 'dark', label: '深色', icon: 'weather-night' },
          ]}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>样式</List.Subheader>
        <List.Item
          title="紧凑布局"
          description="减小内边距，显示更多内容"
          right={() => <Switch value={compactUI} onValueChange={setCompactUI} />}
        />
        <List.Item
          title="更圆润的圆角"
          right={() => <Switch value={useRounded} onValueChange={setUseRounded} />}
        />
      </List.Section>
    </SettingScreen>
  );
}

