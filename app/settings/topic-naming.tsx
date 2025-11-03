import React, { useEffect, useState } from 'react';
import { List, Switch, TextInput, Button, Portal, Dialog, RadioButton, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';

export default function TopicNamingSettings() {
  const theme = useTheme();
  const sr = SettingsRepository();

  const [autoName, setAutoName] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('请用简短中文总结本次对话主题');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [selected, setSelected] = useState<{ provider: ProviderId; model: string } | null>(null);
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[]>([]);
  const [models, setModels] = useState<Record<ProviderId, { id: string; label: string }[]>>({} as any);

  useEffect(() => {
    (async () => {
      const enabled = (await sr.get<boolean>(SettingKey.TopicAutoNameEnabled)) ?? true;
      const p = (await sr.get<string>(SettingKey.TopicAutoNamePrompt)) ?? '请用简短中文总结本次对话主题';
      const prov = (await sr.get<string>(SettingKey.TopicNamingProvider)) as ProviderId | null;
      const mdl = (await sr.get<string>(SettingKey.TopicNamingModel)) || null;
      setAutoName(enabled);
      setPrompt(p);

      const ps: ProviderId[] = ['openai', 'anthropic', 'gemini', 'google', 'deepseek', 'volc', 'zhipu'];
      const enabledList: ProviderId[] = [];
      for (const x of ps) {
        const cfg = await ProvidersRepository.getConfig(x);
        if (cfg.enabled) enabledList.push(x);
      }
      if (enabledList.length === 0) enabledList.push('openai');
      setEnabledProviders(enabledList);

      const map: Record<ProviderId, { id: string; label: string }[]> = {} as any;
      for (const pvd of enabledList) {
        const list = await ProviderModelsRepository.listOrDefaults(pvd);
        map[pvd] = list.map((m) => ({ id: m.modelId, label: m.label || m.modelId }));
      }
      setModels(map);

      const curProvider = (prov as ProviderId) || enabledList[0];
      const curModel = mdl || (map[curProvider]?.[0]?.id ?? 'gpt-4o-mini');
      setSelected({ provider: curProvider, model: curModel });
    })();
  }, []);

  const persistAuto = async (v: boolean) => {
    setAutoName(v);
    await sr.set(SettingKey.TopicAutoNameEnabled, v);
  };

  const persistPrompt = async (v: string) => {
    setPrompt(v);
    await sr.set(SettingKey.TopicAutoNamePrompt, v);
  };

  const saveModel = async (provider: ProviderId, model: string) => {
    setSelected({ provider, model });
    await sr.set(SettingKey.TopicNamingProvider, provider);
    await sr.set(SettingKey.TopicNamingModel, model);
  };

  return (
    <SettingScreen title="话题命名设置" description="配置话题自动命名功能">
      <List.Section>
        <List.Item title="启用自动命名" right={() => <Switch value={autoName} onValueChange={persistAuto} />} />
        <TextInput label="命名提示词" value={prompt} onChangeText={persistPrompt} multiline style={{ marginHorizontal: 16 }} />
        <List.Item
          title="命名所用模型"
          description={selected ? `${selected.provider} · ${selected.model}` : '未选择'}
          onPress={() => setModelPickerOpen(true)}
          right={() => <List.Icon icon="chevron-right" />}
        />
      </List.Section>

      <Portal>
        <Dialog visible={modelPickerOpen} onDismiss={() => setModelPickerOpen(false)}>
          <Dialog.Title>选择模型</Dialog.Title>
          <Dialog.ScrollArea>
            <RadioButton.Group
              onValueChange={async (val) => {
                const [pvd, mdl] = String(val).split('|');
                await saveModel(pvd as ProviderId, mdl);
                setModelPickerOpen(false);
              }}
              value={selected ? `${selected.provider}|${selected.model}` : ''}
            >
              {enabledProviders.map((pvd) => (
                <React.Fragment key={pvd}>
                  <List.Subheader>{pvd}</List.Subheader>
                  {(models[pvd] || []).map((m) => (
                    <RadioButton.Item key={`${pvd}:${m.id}`} label={`${m.label}`} value={`${pvd}|${m.id}`} />
                  ))}
                </React.Fragment>
              ))}
            </RadioButton.Group>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setModelPickerOpen(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SettingScreen>
  );
}
