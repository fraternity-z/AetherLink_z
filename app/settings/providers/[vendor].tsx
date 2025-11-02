import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, HelperText, List, SegmentedButtons, Surface, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';

type VendorMeta = {
  id: string;
  name: string;
  desc: string;
  color: string;
  letter: string;
};

const VENDORS: Record<string, VendorMeta> = {
  combine: { id: 'combine', name: '模型组合', desc: '创建和管理多模型组合', color: '#ef4444', letter: 'C' },
  openai: { id: 'openai', name: 'OpenAI', desc: 'openai API', color: '#22c55e', letter: 'O' },
  gemini: { id: 'gemini', name: 'Gemini', desc: 'google API', color: '#60a5fa', letter: 'G' },
  anthropic: { id: 'anthropic', name: 'Anthropic', desc: 'anthropic API', color: '#a78bfa', letter: 'A' },
  deepseek: { id: 'deepseek', name: 'DeepSeek', desc: 'deepseek API', color: '#8b5cf6', letter: 'D' },
  volc: { id: 'volc', name: '火山引擎', desc: '火山引擎 API', color: '#f97316', letter: 'V' },
  zhipu: { id: 'zhipu', name: '智谱AI', desc: '智谱 API', color: '#6366f1', letter: 'Z' },
};

export default function ProviderConfig() {
  const theme = useTheme();
  const { vendor } = useLocalSearchParams<{ vendor: string }>();
  const meta = VENDORS[String(vendor)] ?? VENDORS.openai;

  const [enabled, setEnabled] = useState(true);
  const [singleKey, setSingleKey] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<'key' | 'base'>('key');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    (async () => {
      const id = meta.id as ProviderId;
      const cfg = await ProvidersRepository.getConfig(id);
      setEnabled(cfg.enabled);
      setBaseUrl(cfg.baseURL ?? '');
      const key = await ProvidersRepository.getApiKey(id);
      setApiKey(key ?? '');
    })();
  }, [meta.id]);

  const HeaderRight = useMemo(() => {
    const Comp = () => (
      <Button
        mode="contained"
        compact
        onPress={async () => {
          const id = meta.id as ProviderId;
          await ProvidersRepository.setEnabled(id, enabled);
          await ProvidersRepository.setBaseURL(id, baseUrl);
          if (apiKey) await ProvidersRepository.setApiKey(id, apiKey);
        }}
      >
        保存
      </Button>
    );
    Comp.displayName = 'ProviderSaveButton';
    return Comp;
  }, [meta.id, enabled, baseUrl, apiKey]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: meta.name, headerRight: HeaderRight }} />

      {/* 顶部名片 */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}
        elevation={1}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar.Text size={48} label={meta.letter} style={{ backgroundColor: meta.color }} />
          <View style={{ marginLeft: 12 }}>
            <Text variant="titleMedium">{meta.name}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>{meta.desc}</Text>
          </View>
        </View>
      </Surface>

      {/* API配置 */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <List.Subheader>API 配置</List.Subheader>
        <List.Item title="启用状态" right={() => <Switch value={enabled} onValueChange={setEnabled} />} />
        <List.Item
          title="API Key 管理模式"
          description={singleKey ? '单 Key 模式（传统）' : '多 Key 模式（占位）'}
          right={() => <Switch value={singleKey} onValueChange={setSingleKey} />}
        />

        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as 'key' | 'base')}
          buttons={[{ value: 'key', label: 'API 密钥' }, { value: 'base', label: '基础配置' }]}
          style={{ marginTop: 8 }}
        />

        {tab === 'key' ? (
          <>
            <TextInput
              label="API 密钥"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showKey}
              right={<TextInput.Icon icon={showKey ? 'eye-off' : 'eye'} onPress={() => setShowKey((v) => !v)} />}
              style={{ marginTop: 8 }}
            />
            <HelperText type="info">已写入安全存储（设备本地 SecureStore）</HelperText>
          </>
        ) : (
          <>
            <TextInput
              label="Base URL"
              placeholder="例如：https://api.openai.com/v1"
              value={baseUrl}
              onChangeText={setBaseUrl}
              autoCapitalize="none"
              style={{ marginTop: 8 }}
            />
            <HelperText type="info">为该提供商设置自定义 Base URL（OpenAI 兼容厂商如 DeepSeek/火山/智谱 可填其兼容地址）</HelperText>
          </>
        )}
      </Surface>

      {/* 可用模型 */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.modelsHeader}>
          <List.Subheader style={{ marginBottom: 0 }}>可用模型</List.Subheader>
          <View style={{ flexDirection: 'row' }}>
            <Button mode="text" onPress={() => console.log('自动获取', meta.id)}>自动获取</Button>
            <Button mode="text" onPress={() => console.log('手动添加', meta.id)}>手动添加</Button>
          </View>
        </View>
        <List.Item
          title={meta.id === 'openai' ? 'gpt-4o-mini' : '示例模型'}
          description={meta.id === 'openai' ? 'id: gpt-4o-mini' : '占位 id'}
          left={(p) => <List.Icon {...p} icon="cube" />}
          right={(p) => <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button compact onPress={() => console.log('校验', meta.id)}>校验</Button>
            <Button compact onPress={() => console.log('删除', meta.id)}>删除</Button>
          </View>}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  modelsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
