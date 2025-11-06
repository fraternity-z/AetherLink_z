import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme, Portal, Dialog, Button, List, Avatar, Divider } from 'react-native-paper';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type Props = { visible: boolean; onDismiss: () => void };

const PROVIDER_META: Record<ProviderId, { name: string; icon: string; color: string }> = {
  openai: { name: 'OpenAI', icon: 'robot', color: '#10a37f' },
  anthropic: { name: 'Anthropic', icon: 'account-voice', color: '#cc785c' },
  google: { name: 'Google', icon: 'google', color: '#4285f4' },
  gemini: { name: 'Gemini', icon: 'google', color: '#4285f4' },
  deepseek: { name: 'DeepSeek', icon: 'brain', color: '#7c3aed' },
  volc: { name: '火山引擎', icon: 'fire', color: '#f97316' },
  zhipu: { name: '智谱AI', icon: 'alpha-z-circle', color: '#6366f1' },
};

export function ModelPickerDialog({ visible, onDismiss }: Props) {
  const theme = useTheme();
  const [selected, setSelected] = useState<{ provider: ProviderId; model: string } | null>(null);
  const [models, setModels] = useState<Record<ProviderId, { id: string; label: string }[]>>({} as any);
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[]>([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const providers: ProviderId[] = ['openai', 'anthropic', 'gemini', 'google', 'deepseek', 'volc', 'zhipu'];
      const enabled: ProviderId[] = [];
      for (const p of providers) {
        const cfg = await ProvidersRepository.getConfig(p);
        if (cfg.enabled) enabled.push(p);
      }
      if (enabled.length === 0) enabled.push('openai');
      setEnabledProviders(enabled);

      const map: Record<ProviderId, { id: string; label: string }[]> = {} as any;
      for (const p of enabled) {
        const list = await ProviderModelsRepository.listOrDefaults(p);
        map[p] = list.map((m) => ({ id: m.modelId, label: m.label || m.modelId }));
      }
      setModels(map);

      const sr = SettingsRepository();
      const curProvider = ((await sr.get<string>(SettingKey.DefaultProvider)) as ProviderId) || enabled[0];
      const curModel = (await sr.get<string>(SettingKey.DefaultModel)) || (map[curProvider]?.[0]?.id ?? 'gpt-4o-mini');
      setSelected({ provider: curProvider, model: curModel });
    })();
  }, [visible]);

  const selectAndSave = async (provider: ProviderId, model: string) => {
    setSelected({ provider, model });
    const sr = SettingsRepository();
    await sr.set(SettingKey.DefaultProvider, provider);
    await sr.set(SettingKey.DefaultModel, model);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ borderRadius: 20 }}>
        <Dialog.Title>选择AI模型</Dialog.Title>

        {enabledProviders.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="loading" color={theme.colors.primary} size={32} />
          </View>
        )}

        <Dialog.Content>
          <ScrollView style={{ maxHeight: 400 }}>
            {enabledProviders.map((p, providerIndex) => (
              <View key={p}>
                {providerIndex > 0 && <Divider style={{ marginVertical: 12 }} />}

                <List.Item
                  title={PROVIDER_META[p]?.name || p}
                  titleStyle={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }}
                  style={{
                    backgroundColor: theme.colors.primaryContainer,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                  left={() => (
                    <Avatar.Icon
                      size={40}
                      icon={PROVIDER_META[p]?.icon || 'help'}
                      color={'white'}
                      style={{ backgroundColor: PROVIDER_META[p]?.color || theme.colors.primary, marginRight: 12 }}
                    />
                  )}
                />

                {(models[p] || []).map((m) => {
                  const isSelected = selected?.provider === p && selected?.model === m.id;
                  return (
                    <List.Item
                      key={`${p}:${m.id}`}
                      title={m.label}
                      titleStyle={{
                        fontSize: 15,
                        color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface,
                      }}
                      style={{
                        backgroundColor: isSelected ? theme.colors.secondaryContainer : 'transparent',
                        borderRadius: 12,
                        marginBottom: 4,
                        marginLeft: 16,
                      }}
                      onPress={() => selectAndSave(p, m.id)}
                      left={() => (
                        <Icon
                          name={(isSelected ? 'radiobox-marked' : 'radiobox-blank') as any}
                          size={20}
                          color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                          style={{ marginRight: 12 }}
                        />
                      )}
                    />
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Dialog.Content>

        <Dialog.Actions>
          <Button mode="contained" onPress={onDismiss} style={{ borderRadius: 12 }}>
            完成
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

