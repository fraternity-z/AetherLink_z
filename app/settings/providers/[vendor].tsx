import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, HelperText, List, SegmentedButtons, Surface, Switch, Text, TextInput, useTheme, Snackbar, Portal, Dialog, Checkbox } from 'react-native-paper';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { fetchProviderModels, type DiscoveredModel } from '@/services/ai/ModelDiscovery';

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
  const [saveStatus, setSaveStatus] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [addDialog, setAddDialog] = useState<{ visible: boolean; id: string; label: string }>({ visible: false, id: '', label: '' });
  const [discoverDialog, setDiscoverDialog] = useState<{ visible: boolean; items: DiscoveredModel[]; selected: Record<string, boolean>; loading: boolean }>({ visible: false, items: [], selected: {}, loading: false });

  const loadedRef = useRef(false);
  const persistRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    (async () => {
      const id = meta.id as ProviderId;
      const cfg = await ProvidersRepository.getConfig(id);
      setEnabled(cfg.enabled);
      setBaseUrl(cfg.baseURL ?? '');
      const key = await ProvidersRepository.getApiKey(id);
      setApiKey(key ?? '');
      loadedRef.current = true;
    })();
  }, [meta.id]);

  // 载入模型列表
  const loadModels = React.useCallback(async () => {
    const id = meta.id as ProviderId;
    const list = await ProviderModelsRepository.listOrDefaults(id);
    setModels(list.map((m) => ({ id: m.modelId, label: m.label || m.modelId })));
  }, [meta.id]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  // 持久化封装（防止丢失） - 使用 ref 追踪保存 Promise，确保异步完成
  const persist = React.useCallback(async (showFeedback = false) => {
    if (!loadedRef.current) return;
    const id = meta.id as ProviderId;

    const task = (async () => {
      try {
        await ProvidersRepository.setEnabled(id, enabled);
        await ProvidersRepository.setBaseURL(id, baseUrl);
        if (apiKey && apiKey.trim().length > 0) {
          await ProvidersRepository.setApiKey(id, apiKey.trim());
        }
        if (showFeedback) {
          setSaveStatus({ visible: true, message: '✓ 配置已保存' });
        }
      } catch (err) {
        console.error('[Persist Error]', err);
        if (showFeedback) {
          setSaveStatus({ visible: true, message: '✗ 保存失败，请重试' });
        }
      }
    })();

    persistRef.current = task;
    await task;
  }, [meta.id, enabled, baseUrl, apiKey]);

  // 页面离开时自动保存（确保异步完成）
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // 立即触发保存，并等待完成
        persist().catch(err => console.error('[Focus Blur Persist]', err));
      };
    }, [persist])
  );

  // 输入实时保存：对 apiKey/baseUrl 变化做轻量去抖，避免频繁 IO
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist().catch(err => console.error('[Auto Save]', err));
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [apiKey, baseUrl, persist]);

  // 取消右上角保存按钮：改为实时保存

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: meta.name }} />

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
        <List.Item title="启用状态" right={() => <Switch value={enabled} onValueChange={async (v) => { setEnabled(v); await ProvidersRepository.setEnabled(meta.id as ProviderId, v); }} />} />
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
              onBlur={async () => {
                // onBlur 时立即保存，不等待去抖延迟
                if (apiKey && apiKey.trim()) {
                  try {
                    await ProvidersRepository.setApiKey(meta.id as ProviderId, apiKey.trim());
                    setSaveStatus({ visible: true, message: '✓ API Key 已保存' });
                  } catch (err) {
                    console.error('[API Key Save Error]', err);
                    setSaveStatus({ visible: true, message: '✗ API Key 保存失败' });
                  }
                }
              }}
            />
            <HelperText type="info">已写入本地存储（设备本地 AsyncStorage）</HelperText>
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
              onBlur={async () => {
                // onBlur 时立即保存，不等待去抖延迟
                try {
                  await ProvidersRepository.setBaseURL(meta.id as ProviderId, baseUrl);
                  setSaveStatus({ visible: true, message: '✓ Base URL 已保存' });
                } catch (err) {
                  console.error('[Base URL Save Error]', err);
                  setSaveStatus({ visible: true, message: '✗ Base URL 保存失败' });
                }
              }}
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
            <Button
              mode="text"
              onPress={async () => {
                try {
                  setModelsLoading(true);
                  const discovered = await fetchProviderModels(meta.id as ProviderId);
                  const selected: Record<string, boolean> = {};
                  for (const d of discovered) selected[d.id] = true; // 默认全选
                  setDiscoverDialog({ visible: true, items: discovered, selected, loading: false });
                } catch (e: any) {
                  setSaveStatus({ visible: true, message: `✗ 获取失败：${e?.message || e}` });
                } finally {
                  setModelsLoading(false);
                }
              }}
            >
              自动获取
            </Button>
            <Button mode="text" onPress={() => setAddDialog({ visible: true, id: '', label: '' })}>手动添加</Button>
          </View>
        </View>
        {models.map((m) => (
          <List.Item
            key={m.id}
            title={m.label}
            description={`id: ${m.id}`}
            left={(p) => <List.Icon {...p} icon="cube" />}
            right={(p) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Button compact onPress={() => console.log('校验', m.id)}>校验</Button>
                <Button
                  compact
                  onPress={async () => {
                    await ProviderModelsRepository.remove(meta.id as ProviderId, m.id);
                    await loadModels();
                  }}
                >
                  删除
                </Button>
              </View>
            )}
          />
        ))}
      </Surface>

      {/* 手动添加模型对话框 */}
      <Portal>
        {/* 自动获取 → 选择添加 */}
        <Dialog visible={discoverDialog.visible} onDismiss={() => setDiscoverDialog({ visible: false, items: [], selected: {}, loading: false })}>
          <Dialog.Title>从接口获取的模型</Dialog.Title>
          <Dialog.ScrollArea>
            {discoverDialog.items.length === 0 ? (
              <Text style={{ margin: 12, opacity: 0.7 }}>没有获取到可用模型</Text>
            ) : (
              discoverDialog.items.map((m) => (
                <Checkbox.Item
                  key={m.id}
                  label={m.label || m.id}
                  status={discoverDialog.selected[m.id] ? 'checked' : 'unchecked'}
                  onPress={() =>
                    setDiscoverDialog((s) => ({
                      ...s,
                      selected: { ...s.selected, [m.id]: !s.selected[m.id] },
                    }))
                  }
                />
              ))
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() =>
                setDiscoverDialog((s) => {
                  const all = s.items.reduce((acc, it) => ({ ...acc, [it.id]: true }), {} as Record<string, boolean>);
                  return { ...s, selected: all };
                })
              }
            >
              全选
            </Button>
            <Button onPress={() => setDiscoverDialog({ visible: false, items: [], selected: {}, loading: false })}>取消</Button>
            <Button
              mode="contained"
              onPress={async () => {
                const picks = discoverDialog.items.filter((m) => discoverDialog.selected[m.id]);
                for (const m of picks) {
                  await ProviderModelsRepository.upsert(meta.id as ProviderId, m.id, m.label ?? m.id, true);
                }
                setDiscoverDialog({ visible: false, items: [], selected: {}, loading: false });
                await loadModels();
                setSaveStatus({ visible: true, message: `✓ 已添加 ${picks.length} 个模型` });
              }}
            >
              添加所选
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={addDialog.visible} onDismiss={() => setAddDialog({ visible: false, id: '', label: '' })}>
          <Dialog.Title>添加模型</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="模型 ID"
              value={addDialog.id}
              onChangeText={(t) => setAddDialog((s) => ({ ...s, id: t }))}
              autoCapitalize="none"
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="显示名称（可选）"
              value={addDialog.label}
              onChangeText={(t) => setAddDialog((s) => ({ ...s, label: t }))}
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialog({ visible: false, id: '', label: '' })}>取消</Button>
            <Button
              onPress={async () => {
                if (!addDialog.id.trim()) return;
                await ProviderModelsRepository.upsert(
                  meta.id as ProviderId,
                  addDialog.id.trim(),
                  addDialog.label?.trim() || addDialog.id.trim(),
                  true
                );
                setAddDialog({ visible: false, id: '', label: '' });
                await loadModels();
              }}
            >
              保存
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 保存状态提示 */}
      <Snackbar
        visible={saveStatus.visible}
        onDismiss={() => setSaveStatus({ visible: false, message: '' })}
        duration={2000}
        style={{ marginBottom: 20 }}
      >
        {saveStatus.message}
      </Snackbar>
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
