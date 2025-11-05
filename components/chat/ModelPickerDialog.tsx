import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Dialog, Button, ListItem, Avatar, Icon, Divider } from '@rneui/themed';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

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
      // load enabled providers
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
    // 实时生效：ChatInput 每次发送前都会读取 SettingsRepository
  };

  return (
    <Dialog
      isVisible={visible}
      onBackdropPress={onDismiss}
      overlayStyle={{
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        maxHeight: '80%',
        width: '90%',
        maxWidth: 500,
      }}
      animationType="fade"
    >
      <Dialog.Title title="选择AI模型" titleStyle={{ fontSize: 20, fontWeight: '700' }} />

      {enabledProviders.length === 0 && (
        <View style={{
          padding: 40,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon
            name="loading"
            type="material-community"
            color={theme.colors.primary}
            size={32}
          />
        </View>
      )}

      <ScrollView style={{ maxHeight: 400 }}>
        {enabledProviders.map((p, providerIndex) => (
          <View key={p}>
            {providerIndex > 0 && <Divider style={{ marginVertical: 12 }} />}

            <ListItem containerStyle={{
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <Avatar key="avatar"
                rounded
                icon={{
                  name: PROVIDER_META[p]?.icon || 'help',
                  type: 'material-community',
                  color: 'white',
                  size: 24,
                }}
                containerStyle={{
                  backgroundColor: PROVIDER_META[p]?.color || theme.colors.primary,
                  marginRight: 12,
                }}
              />
              <ListItem.Content key="content">
                <ListItem.Title style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.colors.onPrimaryContainer
                }}>
                  {PROVIDER_META[p]?.name || p}
                </ListItem.Title>
              </ListItem.Content>
            </ListItem>

            {(models[p] || []).map((m) => {
              const isSelected = selected?.provider === p && selected?.model === m.id;
              return (
                <ListItem
                  key={`${p}:${m.id}`}
                  containerStyle={{
                    backgroundColor: isSelected
                      ? theme.colors.secondaryContainer
                      : 'transparent',
                    borderRadius: 12,
                    marginBottom: 4,
                    marginLeft: 16,
                  }}
                  onPress={() => selectAndSave(p, m.id)}
                >
                  <Icon key="radio"
                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                    type="material-community"
                    color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    size={20}
                    style={{ marginRight: 12 }}
                  />
                  <ListItem.Content key="content">
                    <ListItem.Title style={{
                      fontSize: 15,
                      color: isSelected
                        ? theme.colors.onSecondaryContainer
                        : theme.colors.onSurface
                    }}>
                      {m.label}
                    </ListItem.Title>
                  </ListItem.Content>
                </ListItem>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Dialog.Actions>
        <Button
          title="完成"
          onPress={onDismiss}
          buttonStyle={{
            backgroundColor: theme.colors.primary,
            borderRadius: 12,
            paddingHorizontal: 24,
          }}
          titleStyle={{ fontWeight: '600' }}
        />
      </Dialog.Actions>
    </Dialog>
  );
}

