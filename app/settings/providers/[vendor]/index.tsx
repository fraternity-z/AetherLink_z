import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, HelperText, List, SegmentedButtons, Surface, Switch, Text, TextInput, useTheme, Snackbar, Portal } from 'react-native-paper';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ProviderKeyManagementRepository } from '@/storage/repositories/provider-key-management';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { fetchProviderModels, type DiscoveredModel, validateProviderModel } from '@/services/ai';
import { ModelDiscoveryDialog } from '@/components/settings/ModelDiscoveryDialog';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import { logger } from '@/utils/logger';

type VendorMeta = {
  id: string;
  name: string;
  desc: string;
  color: string;
  letter: string;
};

const VENDORS: Record<string, VendorMeta> = {
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
  const [multiKeyEnabled, setMultiKeyEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<'key' | 'base'>('key');
  const [baseUrl, setBaseUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [addDialog, setAddDialog] = useState<{ visible: boolean; id: string; label: string }>({ visible: false, id: '', label: '' });
  const [discoverDialog, setDiscoverDialog] = useState<{ visible: boolean; items: DiscoveredModel[]; loading: boolean }>({ visible: false, items: [], loading: false });

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

      // 加载多 Key 模式状态
      const isMultiKey = await ProviderKeyManagementRepository.isMultiKeyEnabled(id);
      setMultiKeyEnabled(isMultiKey);

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
        logger.error('[Persist Error]', err);
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
        (async () => {
          try {
            await persist();
          } catch (err) {
            logger.error('[Focus Blur Persist]', err);
          }
        })();
      };
    }, [persist])
  );

  // 输入实时保存：对 apiKey/baseUrl 变化做轻量去抖，避免频繁 IO
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      (async () => {
        try {
          await persist();
        } catch (err) {
          logger.error('[Auto Save]', err);
        }
      })();
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
          title="多 Key 负载均衡模式"
          description={multiKeyEnabled ? '已启用（支持多个 API Key 轮询）' : '未启用（单 Key 模式）'}
          right={() => (
            <Switch
              value={multiKeyEnabled}
              onValueChange={async (v) => {
                setMultiKeyEnabled(v);
                await ProviderKeyManagementRepository.setMultiKeyEnabled(meta.id as ProviderId, v);
                setSaveStatus({ visible: true, message: v ? '✓ 多 Key 模式已启用' : '✓ 已切换到单 Key 模式' });
              }}
            />
          )}
        />

        {/* 多 Key 模式：显示管理入口 */}
        {multiKeyEnabled ? (
          <>
            <Button
              mode="contained"
              onPress={() => {
                router.push(`/settings/providers/${meta.id}/keys` as any);
              }}
              style={{ marginTop: 12 }}
            >
              管理多个 API 密钥
            </Button>
            <HelperText type="info">
              在多 Key 模式下，系统会自动轮询使用多个 API Key，实现负载均衡和故障转移
            </HelperText>
          </>
        ) : (
          <>
            {/* 单 Key 模式：显示传统输入框 */}
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
                        logger.error('[API Key Save Error]', err);
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
                      logger.error('[Base URL Save Error]', err);
                      setSaveStatus({ visible: true, message: '✗ Base URL 保存失败' });
                    }
                  }}
                />
                <HelperText type="info">为该提供商设置自定义 Base URL（OpenAI 兼容厂商如 DeepSeek/火山/智谱 可填其兼容地址）</HelperText>
              </>
            )}
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
                // 立即弹窗，显示加载状态
                setDiscoverDialog({ visible: true, items: [], loading: true });

                try {
                  const discovered = await fetchProviderModels(meta.id as ProviderId);
                  setDiscoverDialog({ visible: true, items: discovered, loading: false });
                } catch (e: any) {
                  // 关闭弹窗并显示错误提示
                  setDiscoverDialog({ visible: false, items: [], loading: false });
                  setSaveStatus({ visible: true, message: `✗ 获取失败：${e?.message || e}` });
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
                <Button
                  compact
                  onPress={async () => {
                    setSaveStatus({ visible: true, message: `校验中：${m.id} …` });
                    const r = await validateProviderModel(meta.id as ProviderId, m.id);
                    setSaveStatus({ visible: true, message: `${r.ok ? '✓' : '✗'} ${r.message}` });
                  }}
                >校验</Button>
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
        {/* 自动获取 → 选择添加 - 使用新的优化组件 */}
        <ModelDiscoveryDialog
          visible={discoverDialog.visible}
          loading={discoverDialog.loading}
          models={discoverDialog.items}
          onDismiss={() => setDiscoverDialog({ visible: false, items: [], loading: false })}
          onConfirm={async (selectedIds) => {
            const picks = discoverDialog.items.filter((m) => selectedIds.includes(m.id));
            for (const m of picks) {
              await ProviderModelsRepository.upsert(meta.id as ProviderId, m.id, m.label ?? m.id, true);
            }
            setDiscoverDialog({ visible: false, items: [], loading: false });
            await loadModels();
            setSaveStatus({ visible: true, message: `✓ 已添加 ${picks.length} 个模型` });
          }}
        />

        <UnifiedDialog
          visible={addDialog.visible}
          onClose={() => setAddDialog({ visible: false, id: '', label: '' })}
          title="添加模型"
          icon="cube"
          actions={[
            { text: '取消', type: 'cancel', onPress: () => setAddDialog({ visible: false, id: '', label: '' }) },
            {
              text: '保存',
              type: 'primary',
              onPress: async () => {
                if (!addDialog.id.trim()) return;
                await ProviderModelsRepository.upsert(
                  meta.id as ProviderId,
                  addDialog.id.trim(),
                  addDialog.label?.trim() || addDialog.id.trim(),
                  true,
                );
                setAddDialog({ visible: false, id: '', label: '' });
                await loadModels();
              },
            },
          ]}
        >
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
        </UnifiedDialog>
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
