import React, { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, HelperText, List, SegmentedButtons, Surface, Switch, Text, TextInput, useTheme, Snackbar, Portal } from 'react-native-paper';
import { CustomProvidersRepository, type CustomProvider } from '@/storage/repositories/custom-providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { fetchCustomProviderModels, validateCustomProviderModel } from '@/services/ai';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';

export default function CustomProviderConfig() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cp, setCP] = useState<CustomProvider | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [tab, setTab] = useState<'key' | 'base'>('key');
  const [saveStatus, setSaveStatus] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [addDialog, setAddDialog] = useState<{ visible: boolean; id: string; label: string }>({ visible: false, id: '', label: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await CustomProvidersRepository.list();
      const item = list.find(x => x.id === id) || null;
      setCP(item);
      if (item) {
        setEnabled(item.enabled);
        setApiKey(item.apiKey || '');
        setBaseUrl(item.baseURL || '');
        const ms = await ProviderModelsRepository.listOrDefaults(item.id);
        setModels(ms.map(m => ({ id: m.modelId, label: m.label || m.modelId })));
      }
    })();
  }, [id]);

  const persistBasics = async (show = false) => {
    if (!cp) return;
    try {
      await CustomProvidersRepository.update(cp.id, { enabled, apiKey, baseURL: baseUrl });
      if (show) setSaveStatus({ visible: true, message: '✓ 配置已保存' });
    } catch {
      if (show) setSaveStatus({ visible: true, message: '✗ 保存失败' });
    }
  };

  const loadModels = async () => {
    if (!cp) return;
    const list = await ProviderModelsRepository.listOrDefaults(cp.id);
    setModels(list.map(m => ({ id: m.modelId, label: m.label || m.modelId })));
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: cp?.name || '自定义提供商' }} />

      {/* 顶部名片 */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar.Text size={48} label={(cp?.name?.[0] || 'C').toUpperCase()} style={{ backgroundColor: '#ef4444' }} />
          <View style={{ marginLeft: 12 }}>
            <Text variant="titleMedium">{cp?.name || ''}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>{cp?.type}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {cp && (
            <Button mode="text" textColor={theme.colors.error} onPress={() => setConfirmDelete(true)}>删除</Button>
          )}
        </View>
      </Surface>

      {/* API配置 */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <List.Subheader>API 配置</List.Subheader>
        <List.Item title="启用状态" right={() => <Switch value={enabled} onValueChange={async (v) => { setEnabled(v); await CustomProvidersRepository.setEnabled(cp!.id, v); }} />} />

        <SegmentedButtons value={tab} onValueChange={(v)=>setTab(v as any)} buttons={[{ value:'key', label:'API 密钥' }, { value:'base', label:'基础配置' }]} style={{ marginTop: 8 }} />

        {tab === 'key' ? (
          <>
            <TextInput label="API 密钥" value={apiKey} onChangeText={setApiKey} secureTextEntry style={{ marginTop: 8 }} onBlur={()=>persistBasics(true)} />
            <HelperText type="info">已写入本地存储（设备本地 AsyncStorage）</HelperText>
          </>
        ) : (
          <>
            <TextInput label="Base URL" placeholder="例如：https://api.xxx.com/v1" value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" style={{ marginTop: 8 }} onBlur={()=>persistBasics(true)} />
            <HelperText type="info">OpenAI 兼容类型建议填写兼容接口地址</HelperText>
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
                if (!cp) return;
                try {
                  const discovered = await fetchCustomProviderModels({ ...cp, apiKey, baseURL: baseUrl });
                  // 批量添加
                  for (const m of discovered) {
                    await ProviderModelsRepository.upsert(cp.id, m.id, m.label || m.id, true);
                  }
                  await loadModels();
                  setSaveStatus({ visible: true, message: `✓ 已同步 ${discovered.length} 个模型` });
                } catch (e: any) {
                  setSaveStatus({ visible: true, message: `✗ 获取失败：${e?.message || e}` });
                }
              }}
            >自动获取</Button>
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
                <Button compact onPress={async ()=>{
                  if (!cp) return;
                  setSaveStatus({ visible: true, message: `校验中：${m.id} …` });
                  const r = await validateCustomProviderModel({ ...cp, apiKey, baseURL: baseUrl }, m.id);
                  setSaveStatus({ visible: true, message: `${r.ok ? '✓' : '✗'} ${r.message}` });
                }}>校验</Button>
                <Button compact onPress={async ()=>{ if(!cp) return; await ProviderModelsRepository.remove(cp.id, m.id); await loadModels(); }}>删除</Button>
              </View>
            )}
          />
        ))}
      </Surface>

      {/* 手动添加模型 */}
      <Portal>
        {/* 删除确认 */}
        <UnifiedDialog
          visible={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="删除自定义提供商"
          icon="trash-can"
          actions={[
            { text: '取消', type: 'cancel', onPress: () => setConfirmDelete(false) },
            {
              text: '删除', type: 'destructive', onPress: async () => {
                if (!cp) return;
                try {
                  await ProviderModelsRepository.removeAll(cp.id);
                  await CustomProvidersRepository.remove(cp.id);
                } finally {
                  setConfirmDelete(false);
                  router.replace('/settings/default-model' as any);
                }
              }
            }
          ]}
        >
          <Text>此操作将删除该自定义提供商及其模型列表，且不可撤销。</Text>
        </UnifiedDialog>

        <UnifiedDialog
          visible={addDialog.visible}
          onClose={() => setAddDialog({ visible: false, id: '', label: '' })}
          title="添加模型"
          icon="cube"
          actions={[
            { text: '取消', type: 'cancel', onPress: () => setAddDialog({ visible: false, id: '', label: '' }) },
            { text: '保存', type: 'primary', onPress: async () => { if(!cp) return; if(!addDialog.id.trim()) return; await ProviderModelsRepository.upsert(cp.id, addDialog.id.trim(), addDialog.label?.trim() || addDialog.id.trim(), true); setAddDialog({ visible: false, id: '', label: '' }); await loadModels(); } }
          ]}
        >
          <TextInput label="模型 ID" value={addDialog.id} onChangeText={(t)=>setAddDialog(s=>({ ...s, id: t }))} autoCapitalize="none" style={{ marginBottom: 8 }} />
          <TextInput label="显示名称（可选）" value={addDialog.label} onChangeText={(t)=>setAddDialog(s=>({ ...s, label: t }))} autoCapitalize="none" />
        </UnifiedDialog>
      </Portal>

      {/* 保存状态提示 */}
      <Snackbar visible={saveStatus.visible} onDismiss={() => setSaveStatus({ visible: false, message: '' })} duration={2000} style={{ marginBottom: 20 }}>{saveStatus.message}</Snackbar>
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
