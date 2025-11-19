import { useEffect, useState } from 'react';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { Provider } from '@/services/ai/AiClient';

export interface ChatInputSettings {
  enterToSend: boolean;
  currentProvider: Provider;
  currentModel: string;
}

export function useChatInputSettings(): ChatInputSettings {
  const [enterToSend, setEnterToSend] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Provider>('openai');
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o-mini');

  useEffect(() => {
    (async () => {
      const sr = SettingsRepository();
      const ets = await sr.get<boolean>(SettingKey.EnterToSend);
      if (ets !== null) setEnterToSend(ets);

      const provider = ((await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
      const fallbackModel =
        provider === 'openai'
          ? 'gpt-4o-mini'
          : provider === 'anthropic'
            ? 'claude-3-5-haiku-latest'
            : 'gemini-1.5-flash';
      const model = (await sr.get<string>(SettingKey.DefaultModel)) ?? fallbackModel;
      setCurrentProvider(provider);
      setCurrentModel(model);
    })();
  }, []);

  return { enterToSend, currentProvider, currentModel };
}
