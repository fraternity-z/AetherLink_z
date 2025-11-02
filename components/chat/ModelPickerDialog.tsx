import React, { useEffect, useState } from 'react';
import { Portal, Dialog, Button, List, RadioButton, useTheme } from 'react-native-paper';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

type Props = { visible: boolean; onDismiss: () => void };

const PROVIDER_META: Record<ProviderId, { name: string; icon: string }> = {
  openai: { name: 'OpenAI', icon: 'robot' },
  anthropic: { name: 'Anthropic', icon: 'account-voice' },
  google: { name: 'Google', icon: 'google' },
  gemini: { name: 'Gemini', icon: 'google' },
  deepseek: { name: 'DeepSeek', icon: 'brain' },
  volc: { name: '火山引擎', icon: 'fire' },
  zhipu: { name: '智谱AI', icon: 'alpha-z-circle' },
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
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '80%' }}>
        <Dialog.Title>选择模型</Dialog.Title>
        <Dialog.ScrollArea>
          <RadioButton.Group
            onValueChange={(val) => {
              const [provider, model] = String(val).split('|');
              void selectAndSave(provider as ProviderId, model);
            }}
            value={selected ? `${selected.provider}|${selected.model}` : ''}
          >
            {enabledProviders.map((p) => (
              <React.Fragment key={p}>
                <List.Subheader>{PROVIDER_META[p]?.name || p}</List.Subheader>
                {(models[p] || []).map((m) => (
                  <RadioButton.Item
                    key={`${p}:${m.id}`}
                    label={`${m.label}`}
                    value={`${p}|${m.id}`}
                  />
                ))}
              </React.Fragment>
            ))}
          </RadioButton.Group>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>完成</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

