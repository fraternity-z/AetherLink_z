import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, List, Surface, Text, TouchableRipple, useTheme, Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { router } from 'expo-router';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import { CustomProvidersRepository, type CustomProvider, type CustomProviderType } from '@/storage/repositories/custom-providers';

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
  { id: 'openai', name: 'OpenAI', desc: '已启用 1 个模型', color: '#22c55e', letter: 'O', enabled: true, modelCount: 1 },
  { id: 'gemini', name: 'Gemini', desc: '已禁用 1 个模型', color: '#60a5fa', letter: 'G', enabled: false, modelCount: 1 },
  { id: 'anthropic', name: 'Anthropic', desc: '已禁用 6 个模型', color: '#a78bfa', letter: 'A', enabled: false, modelCount: 6 },
  { id: 'deepseek', name: 'DeepSeek', desc: '已禁用 2 个模型', color: '#8b5cf6', letter: 'D', enabled: false, modelCount: 2 },
  { id: 'volc', name: '火山引擎', desc: '已禁用 4 个模型', color: '#f97316', letter: 'V', enabled: false, modelCount: 4 },
  { id: 'zhipu', name: '智谱AI', desc: '已禁用 13 个模型', color: '#6366f1', letter: 'Z', enabled: false, modelCount: 13 },
];

export default function ModelProvidersScreen() {
  const theme = useTheme();
  const [customs, setCustoms] = useState<CustomProvider[]>([]);
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState<{ name: string; type: CustomProviderType; baseURL: string; apiKey: string }>({ name: '', type: 'openai-compatible', baseURL: '', apiKey: '' });

  const loadCustoms = async () => {
    const list = await CustomProvidersRepository.list();
    setCustoms(list);
  };
  useEffect(() => { void loadCustoms(); }, []);

  return (
    <SettingScreen title="模型设置" description="您可以配置多个模型服务商，点击默认服务商进行管理；也可添加自定义提供商（与默认分开存储）">
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

      {/* 自定义提供商（单独存储/可删除） */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 12 }]}>
        <List.Subheader>自定义提供商</List.Subheader>
        {customs.length === 0 && (
          <View style={{ padding: 12 }}>
            <Text style={{ opacity: 0.7 }}>尚未添加任何自定义提供商</Text>
          </View>
        )}
        {customs.map((p) => (
          <TouchableRipple key={p.id} onPress={() => router.push(`/settings/custom-providers/${p.id}` as any)}>
            <View style={styles.row}>
              <Avatar.Text size={36} label={(p.name?.[0] || 'C').toUpperCase()} style={{ backgroundColor: '#ef4444' }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleSmall">{p.name}</Text>
                <Text variant="labelSmall" style={{ opacity: 0.7, marginTop: 2 }}>类型：{p.type}{p.baseURL ? ` · ${p.baseURL}` : ''}</Text>
              </View>
              <Text style={{ opacity: 0.4 }}>{'>'}</Text>
            </View>
          </TouchableRipple>
        ))}
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          <Button mode="contained" onPress={() => setAddVisible(true)}>添加自定义提供商</Button>
        </View>
      </Surface>

      {/* 添加自定义提供商对话框 */}
      <UnifiedDialog
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        title="添加自定义提供商"
        icon="plus"
        actions={[
          { text: '取消', type: 'cancel', onPress: () => setAddVisible(false) },
          { text: '保存', type: 'primary', onPress: async () => {
              if (!form.name.trim()) return;
              await CustomProvidersRepository.add({ name: form.name.trim(), type: form.type, enabled: true });
              setAddVisible(false);
              setForm({ name: '', type: 'openai-compatible', baseURL: '', apiKey: '' });
              await loadCustoms();
            }
          }
        ]}
      >
        <TextInput label="显示名称" value={form.name} onChangeText={(t)=>setForm(s=>({...s,name:t}))} style={{ marginBottom: 8 }} />
        <SegmentedButtons
          value={form.type}
          onValueChange={(v)=>setForm(s=>({...s, type: v as CustomProviderType}))}
          buttons={[
            { value: 'openai-compatible', label: 'OpenAI兼容' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google/Gemini' },
          ]}
          style={{ marginBottom: 8 }}
        />
        {/* 按你的要求：这里只选择名称和类型，其他配置到详情页填写 */}
      </UnifiedDialog>
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
