/**
 * 🤖 AI模型选择器对话框（基于 UnifiedDialog）
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { CustomProvidersRepository } from '@/storage/repositories/custom-providers';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { ChatRepository } from '@/storage/repositories/chat';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import { logger } from '@/utils/logger';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /**
   * 话题 ID（必须提供）
   * ⚠️ 此组件仅用于话题级别的模型选择，不修改全局默认设置
   * 全局默认模型请在设置页面配置
   */
  conversationId: string | null;
};

// 提供商元数据（预设提供商）
const PROVIDER_META: Record<ProviderId, { name: string; icon: string; color: string }> = {
  openai: { name: 'OpenAI', icon: 'robot', color: '#10A37F' },
  anthropic: { name: 'Anthropic', icon: 'account-voice', color: '#CC785C' },
  google: { name: 'Google', icon: 'google', color: '#4285F4' },
  gemini: { name: 'Gemini', icon: 'google', color: '#4285F4' },
  deepseek: { name: 'DeepSeek', icon: 'brain', color: '#7C3AED' },
  volc: { name: '火山引擎', icon: 'fire', color: '#F97316' },
  zhipu: { name: '智谱AI', icon: 'alpha-z-circle', color: '#6366F1' },
};

// 自定义提供商类型对应的图标
const CUSTOM_TYPE_META: Record<string, { icon: string; color: string }> = {
  'openai-compatible': { icon: 'api', color: '#8B5CF6' },
  'anthropic': { icon: 'account-voice', color: '#CC785C' },
  'google': { icon: 'google', color: '#4285F4' },
};

// 统一的提供商信息类型
interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
  enabled: boolean;
  models: { id: string; label: string }[];
}

export function ModelPickerDialog({ visible, onDismiss, conversationId }: Props) {
  const theme = useTheme();

  const [selected, setSelected] = useState<{ provider: string; model: string } | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('all'); // 'all' 或提供商ID
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = useCallback(async (cid?: string | null) => {
    const presetProviderIds: ProviderId[] = ['openai', 'anthropic', 'gemini', 'google', 'deepseek', 'volc', 'zhipu'];
    const allProviders: ProviderInfo[] = [];

    // 1. 加载预设提供商
    for (const p of presetProviderIds) {
      const cfg = await ProvidersRepository.getConfig(p);
      if (!cfg.enabled) continue;

      const models = await ProviderModelsRepository.listOrDefaults(p);
      const meta = PROVIDER_META[p] || { name: p, icon: 'help', color: theme.colors.primary };

      allProviders.push({
        id: p,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        isCustom: false,
        enabled: true,
        models: models.map((m) => ({ id: m.modelId, label: m.label || m.modelId })),
      });
    }

    // 2. 加载自定义提供商
    const customProviders = await CustomProvidersRepository.list();
    for (const cp of customProviders) {
      if (!cp.enabled) continue;

      const models = await ProviderModelsRepository.listOrDefaults(cp.id);
      const typeMeta = CUSTOM_TYPE_META[cp.type] || { icon: 'api', color: '#8B5CF6' };

      allProviders.push({
        id: cp.id,
        name: cp.name,
        icon: typeMeta.icon,
        color: typeMeta.color,
        isCustom: true,
        enabled: true,
        models: models.map((m) => ({ id: m.modelId, label: m.label || m.modelId })),
      });
    }

    // 3. 如果没有启用的提供商，默认添加 OpenAI
    if (allProviders.length === 0) {
      const models = await ProviderModelsRepository.listOrDefaults('openai');
      const meta = PROVIDER_META['openai'];
      allProviders.push({
        id: 'openai',
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        isCustom: false,
        enabled: true,
        models: models.map((m) => ({ id: m.modelId, label: m.label || m.modelId })),
      });
    }

    setProviders(allProviders);

    // 4. 恢复当前选中的提供商和模型
    // 优先级：话题级别模型 > 默认模型（仅用于显示初始选择）
    let curProvider: string;
    let curModel: string;

    if (cid) {
      // 尝试获取话题级别的模型选择
      const conversationModel = await ChatRepository.getConversationModel(cid);
      if (conversationModel) {
        // 使用话题级别的模型
        curProvider = conversationModel.provider;
        curModel = conversationModel.model;
        logger.debug('[ModelPickerDialog] 恢复话题级别模型:', { provider: curProvider, model: curModel });
      } else {
        // 话题未选择模型，显示默认模型（但不会保存到默认模型）
        const sr = SettingsRepository();
        curProvider = (await sr.get<string>(SettingKey.DefaultProvider)) || allProviders[0].id;
        curModel = (await sr.get<string>(SettingKey.DefaultModel)) || allProviders[0].models[0]?.id || 'gpt-4o-mini';
        logger.debug('[ModelPickerDialog] 话题未选择模型，显示默认模型:', { provider: curProvider, model: curModel });
      }
    } else {
      // ⚠️ conversationId 为 null，使用第一个可用模型作为占位
      // 此时用户选择模型会因为 selectAndSave 的检查而无法保存
      curProvider = allProviders[0]?.id || 'openai';
      curModel = allProviders[0]?.models[0]?.id || 'gpt-4o-mini';
      logger.warn('[ModelPickerDialog] conversationId 为空，使用占位模型');
    }

    setSelected({ provider: curProvider, model: curModel });

    // 5. 设置默认选中的标签为当前提供商
    setSelectedTab(curProvider);

    setIsLoading(false);
  }, [theme.colors.primary]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      void loadModels(conversationId);
    }
  }, [visible, conversationId, loadModels]);

  const selectAndSave = async (provider: string, model: string) => {
    setSelected({ provider, model });

    // ⚠️ 对话页面的模型选择器只修改话题级别的模型
    // conversationId 必须存在，否则不应该打开这个对话框
    if (!conversationId) {
      logger.error('[ModelPickerDialog] conversationId 为空，无法保存模型选择');
      return;
    }

    await ChatRepository.setConversationModel(conversationId, provider, model);
    logger.debug('[ModelPickerDialog] 模型已保存到话题级别:', {
      conversationId,
      provider,
      model,
    });
  };

  // 根据选中的标签筛选模型
  const displayedModels = React.useMemo(() => {
    if (selectedTab === 'all') {
      // 显示所有提供商的所有模型
      return providers.flatMap((p) =>
        p.models.map((m) => ({ ...m, provider: p }))
      );
    } else {
      // 显示选中提供商的模型
      const provider = providers.find((p) => p.id === selectedTab);
      return provider ? provider.models.map((m) => ({ ...m, provider })) : [];
    }
  }, [selectedTab, providers]);

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title="选择AI模型"
      maxHeight="80%"
      actions={[{ text: '完成', type: 'primary', onPress: onDismiss }]}
    >
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>加载模型列表...</Text>
          </View>
        ) : (
          <>
            {/* 顶部横向滚动的标签栏 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsContainer}
              contentContainerStyle={styles.tabsContent}
            >
              {/* "全部" 标签 */}
              <Pressable
                onPress={() => setSelectedTab('all')}
                style={({ pressed }) => [
                  styles.tab,
                  selectedTab === 'all' && styles.tabActive,
                  { backgroundColor: selectedTab === 'all' ? theme.colors.primaryContainer : 'transparent' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: selectedTab === 'all' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                      fontWeight: selectedTab === 'all' ? '600' : '500',
                    },
                  ]}
                >
                  全部
                </Text>
              </Pressable>

              {/* 提供商标签 */}
              {providers.map((provider) => (
                <Pressable
                  key={provider.id}
                  onPress={() => setSelectedTab(provider.id)}
                  style={({ pressed }) => [
                    styles.tab,
                    selectedTab === provider.id && styles.tabActive,
                    { backgroundColor: selectedTab === provider.id ? theme.colors.primaryContainer : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: selectedTab === provider.id ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                        fontWeight: selectedTab === provider.id ? '600' : '500',
                      },
                    ]}
                  >
                    {provider.name.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Divider />

            {/* 模型列表 */}
            <ScrollView style={styles.modelsContainer}>
              {displayedModels.map((item) => {
                const isSelected = selected?.provider === item.provider.id && selected?.model === item.id;

                return (
                  <Pressable
                    key={`${item.provider.id}:${item.id}`}
                    style={({ pressed }) => [
                      styles.modelItem,
                      {
                        backgroundColor: isSelected
                          ? `${theme.colors.primary}10`
                          : pressed
                          ? theme.colors.surfaceVariant
                          : 'transparent',
                      },
                    ]}
                    onPress={() => selectAndSave(item.provider.id, item.id)}
                    android_ripple={{ color: theme.colors.surfaceVariant }}
                  >
                    <View style={styles.modelContent}>
                      {/* 模型信息 */}
                      <View style={styles.modelInfo}>
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.modelLabel,
                            {
                              color: isSelected ? theme.colors.primary : theme.colors.onSurface,
                              fontWeight: isSelected ? '600' : '500',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        {selectedTab === 'all' && (
                          <Text
                            variant="bodySmall"
                            style={[styles.modelProviderLabel, { color: theme.colors.onSurfaceVariant }]}
                          >
                            {item.provider.name}
                          </Text>
                        )}
                      </View>

                      {/* 选中图标 */}
                      <Icon
                        name={isSelected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  tabsContainer: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    // 激活状态样式由动态背景色控制
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  modelsContainer: {
    flex: 1,
    paddingTop: 8,
  },
  modelItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
  },
  modelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modelInfo: {
    flex: 1,
    minWidth: 0,
  },
  modelLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  modelProviderLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
