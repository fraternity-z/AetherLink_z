/**
 * 智能体助手数据仓库
 *
 * 管理用户启用的助手（从系统预设中选择 + 自定义助手）
 */

import { IKeyValueStore } from '@/storage/core';
import { AsyncKVStore } from '@/storage/adapters/async-storage';
import type { Assistant } from '@/types/assistant';
import { SYSTEM_ASSISTANTS, getAssistantById } from '@/constants/assistants';

const ENABLED_ASSISTANTS_KEY = 'al:assistants:enabled'; // 用户启用的助手 ID 列表
const CUSTOM_ASSISTANTS_KEY = 'al:assistants:custom'; // 用户自定义助手

export const AssistantsRepository = (store: IKeyValueStore = AsyncKVStore) => ({
  /**
   * 获取用户启用的助手列表
   * 初始只包含默认助手，用户可以添加其他助手
   */
  async getAll(): Promise<Assistant[]> {
    const enabledIds = await store.get<string[]>(ENABLED_ASSISTANTS_KEY);
    const customAssistants = await store.get<Assistant[]>(CUSTOM_ASSISTANTS_KEY);

    // 如果是第一次使用，初始化为只包含默认助手
    if (!enabledIds) {
      await store.set(ENABLED_ASSISTANTS_KEY, ['default']);
      const defaultAssistant = getAssistantById('default');
      return defaultAssistant ? [defaultAssistant] : [];
    }

    // 从系统预设中获取启用的助手
    const systemAssistants = enabledIds
      .map(id => getAssistantById(id))
      .filter((a): a is Assistant => a !== undefined);

    return [...systemAssistants, ...(customAssistants || [])];
  },

  /**
   * 根据 ID 获取助手（包括未启用的系统助手）
   */
  async getById(id: string): Promise<Assistant | undefined> {
    // 先从已启用的助手中查找
    const all = await this.getAll();
    const found = all.find(a => a.id === id);
    if (found) return found;

    // 如果没找到，尝试从系统预设中查找
    return getAssistantById(id);
  },

  /**
   * 获取所有可用的系统预设助手
   */
  async getAllSystemAssistants(): Promise<Assistant[]> {
    return SYSTEM_ASSISTANTS;
  },

  /**
   * 获取已启用的助手 ID 列表
   */
  async getEnabledIds(): Promise<string[]> {
    const ids = await store.get<string[]>(ENABLED_ASSISTANTS_KEY);
    return ids || ['default'];
  },

  /**
   * 启用一个系统助手
   */
  async enableAssistant(assistantId: string): Promise<void> {
    const enabledIds = await this.getEnabledIds();
    if (!enabledIds.includes(assistantId)) {
      enabledIds.push(assistantId);
      await store.set(ENABLED_ASSISTANTS_KEY, enabledIds);
    }
  },

  /**
   * 禁用一个助手
   */
  async disableAssistant(assistantId: string): Promise<void> {
    // 不能禁用默认助手
    if (assistantId === 'default') {
      throw new Error('不能禁用默认助手');
    }

    const enabledIds = await this.getEnabledIds();
    const filtered = enabledIds.filter(id => id !== assistantId);
    await store.set(ENABLED_ASSISTANTS_KEY, filtered);
  },

  /**
   * 获取用户自定义助手
   */
  async getCustom(): Promise<Assistant[]> {
    const custom = await store.get<Assistant[]>(CUSTOM_ASSISTANTS_KEY);
    return custom || [];
  },

  /**
   * 保存用户自定义助手
   */
  async saveCustom(assistants: Assistant[]): Promise<void> {
    await store.set(CUSTOM_ASSISTANTS_KEY, assistants);
  },

  /**
   * 添加自定义助手
   */
  async add(assistant: Assistant): Promise<void> {
    const custom = await this.getCustom();
    const newAssistant = {
      ...assistant,
      id: assistant.id || `custom-${Date.now()}`,
      isSystem: false,
      createdAt: assistant.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveCustom([...custom, newAssistant]);
  },

  /**
   * 更新自定义助手
   */
  async update(id: string, updates: Partial<Assistant>): Promise<void> {
    const custom = await this.getCustom();
    const index = custom.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error(`助手 ${id} 不存在`);
    }

    // 不允许修改系统预设助手
    const assistant = custom[index];
    if (assistant.isSystem) {
      throw new Error('不能修改系统预设助手');
    }

    custom[index] = {
      ...assistant,
      ...updates,
      id, // 保持 ID 不变
      isSystem: false, // 保持非系统助手
      updatedAt: new Date().toISOString(),
    };

    await this.saveCustom(custom);
  },

  /**
   * 删除自定义助手
   */
  async delete(id: string): Promise<void> {
    const custom = await this.getCustom();
    const assistant = custom.find(a => a.id === id);

    if (!assistant) {
      throw new Error(`助手 ${id} 不存在`);
    }

    if (assistant.isSystem) {
      throw new Error('不能删除系统预设助手');
    }

    const filtered = custom.filter(a => a.id !== id);
    await this.saveCustom(filtered);
  },

  /**
   * 清空所有自定义助手
   */
  async clearCustom(): Promise<void> {
    await store.set(CUSTOM_ASSISTANTS_KEY, []);
  },
});
