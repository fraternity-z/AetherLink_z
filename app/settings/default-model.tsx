import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, List, Surface, Text, TouchableRipple, useTheme, Button } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { router } from 'expo-router';

type Provider = {
  id: string;
  name: string;
  desc: string;
  color: string;
  letter: string;
  enabled?: boolean;
  modelCount?: number;
};

const PROVIDERS: Provider[] = [
  { id: 'combine', name: '模型组合', desc: '已启用', color: '#ef4444', letter: 'C', enabled: true },
  { id: 'openai', name: 'OpenAI', desc: '已启用 1 个模型', color: '#22c55e', letter: 'O', enabled: true, modelCount: 1 },
  { id: 'gemini', name: 'Gemini', desc: '已禁用 1 个模型', color: '#60a5fa', letter: 'G', enabled: false, modelCount: 1 },
  { id: 'anthropic', name: 'Anthropic', desc: '已禁用 6 个模型', color: '#a78bfa', letter: 'A', enabled: false, modelCount: 6 },
  { id: 'deepseek', name: 'DeepSeek', desc: '已禁用 2 个模型', color: '#8b5cf6', letter: 'D', enabled: false, modelCount: 2 },
  { id: 'volc', name: '火山引擎', desc: '已禁用 4 个模型', color: '#f97316', letter: 'V', enabled: false, modelCount: 4 },
  { id: 'zhipu', name: '智谱AI', desc: '已禁用 13 个模型', color: '#6366f1', letter: 'Z', enabled: false, modelCount: 13 },
];

export default function ModelProvidersScreen() {
  const theme = useTheme();

  return (
    <SettingScreen title="模型设置" description="您可以配置多个模型服务商，点击对应的服务商进行设置和管理">
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>模型服务商</List.Subheader>
        {PROVIDERS.map((p, idx) => (
          <TouchableRipple key={p.id} onPress={() => router.push(`/settings/providers/${p.id}` as any)}>
            <View style={styles.row}>
              <Avatar.Text size={36} label={p.letter} style={{ backgroundColor: p.color }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleSmall">{p.name}</Text>
                <Text variant="labelSmall" style={{ opacity: 0.7, marginTop: 2 }}>{p.desc}</Text>
              </View>
              <Text style={{ opacity: 0.4 }}>{'>'}</Text>
            </View>
          </TouchableRipple>
        ))}
      </Surface>
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  row: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
