import { AssistantsRepository } from '@/storage/repositories/assistants';
import { SettingKey, SettingsRepository } from '@/storage/repositories/settings';
import type { Assistant } from '@/types/assistant';
import { appEvents, AppEvents } from '@/utils/events';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ASSISTANTS_EVENT_SOURCE = 'use-assistants-hook';

export function useAssistants() {
  const assistantsRepo = useMemo(() => AssistantsRepository(), []);
  const settingsRepo = useMemo(() => SettingsRepository(), []);
  
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('default');

  // 加载助手列表和当前选中的助手
  const loadAssistants = useCallback(async () => {
    const allAssistants = await assistantsRepo.getAll();
    setAssistants(allAssistants);

    const currentId = await settingsRepo.get<string>(SettingKey.CurrentAssistantId);
    setCurrentAssistantId(currentId || 'default');
  }, [assistantsRepo, settingsRepo]);

  // 初始化加载
  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  // 监听助手更新事件
  useEffect(() => {
    const handleAssistantsUpdated = (source?: string) => {
      // 如果是自己发出的更新事件，可以选择忽略，或者为了保险起见也刷新
      if (source === ASSISTANTS_EVENT_SOURCE) {
        return;
      }
      loadAssistants();
    };

    appEvents.on(AppEvents.ASSISTANTS_UPDATED, handleAssistantsUpdated);
    return () => {
      appEvents.off(AppEvents.ASSISTANTS_UPDATED, handleAssistantsUpdated);
    };
  }, [loadAssistants]);

  const notifyAssistantsUpdated = useCallback(() => {
    appEvents.emit(AppEvents.ASSISTANTS_UPDATED, ASSISTANTS_EVENT_SOURCE);
  }, []);

  // 切换助手
  const selectAssistant = useCallback(async (assistantId: string) => {
    await settingsRepo.set(SettingKey.CurrentAssistantId, assistantId);
    setCurrentAssistantId(assistantId);
    appEvents.emit(AppEvents.ASSISTANT_CHANGED, assistantId);
  }, [settingsRepo]);

  // 添加助手
  const addAssistant = useCallback(async (assistant: Assistant) => {
    await assistantsRepo.enableAssistant(assistant.id);
    await loadAssistants();
    notifyAssistantsUpdated();
  }, [assistantsRepo, loadAssistants, notifyAssistantsUpdated]);

  // 移除助手
  const removeAssistant = useCallback(async (assistantId: string) => {
    await assistantsRepo.disableAssistant(assistantId);
    
    // 如果移除的是当前助手，切换到默认助手
    if (assistantId === currentAssistantId) {
      await selectAssistant('default');
    }

    await loadAssistants();
    notifyAssistantsUpdated();
  }, [assistantsRepo, currentAssistantId, loadAssistants, notifyAssistantsUpdated, selectAssistant]);

  return {
    assistants,
    currentAssistantId,
    selectAssistant,
    addAssistant,
    removeAssistant,
    reloadAssistants: loadAssistants,
  };
}