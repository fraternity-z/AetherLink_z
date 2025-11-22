/**
 * 🤖 默认模型设置页面
 *
 * 功能：
 * - 对话默认模型设置
 * - 话题命名模型设置
 * - 翻译模型设置（TODO）
 * - 其他默认模型设置（TODO）
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { List, Switch, TextInput, Snackbar, useTheme, Divider, Text, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { CustomProvidersRepository } from '@/storage/repositories/custom-providers';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';

type ModelType = 'chat' | 'topicNaming' | 'translation';

interface ModelSelection {
  provider: string;
  model: string;
}

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

export default function DefaultModelSettings() {
  const theme = useTheme();
  const sr = useMemo(() => SettingsRepository(), []);

  // 对话默认模型
  const [chatModel, setChatModel] = useState<ModelSelection | null>(null);

  // 话题命名模型
  const [topicNamingEnabled, setTopicNamingEnabled] = useState<boolean>(true);
  const [topicNamingPrompt, setTopicNamingPrompt] = useState<string>('请用简短中文总结本次对话主题');
  const [topicNamingModel, setTopicNamingModel] = useState<ModelSelection | null>(null);

  // 翻译模型（TODO）
  const [translationModel, setTranslationModel] = useState<ModelSelection | null>(null);

  // 通用状态
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [currentEditingType, setCurrentEditingType] = useState<ModelType | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('all'); // 'all' 或提供商ID
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 加载所有提供商和模型
  const loadProvidersAndModels = async () => {
    setIsLoading(true);
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
    setIsLoading(false);
    return allProviders;
  };

  // 验证并修复模型选择
  const validateAndFixModel = (
    provider: string | null,
    modelId: string | null,
    allProviders: ProviderInfo[]
  ): { selection: ModelSelection; changed: boolean } => {
    const providerInfo = allProviders.find((p) => p.id === provider);
    // 使用找到的 provider 的 id，确保类型为 string
    const nextProvider: string = providerInfo?.id ?? allProviders[0]?.id ?? 'openai';
    const nextProviderInfo = allProviders.find((p) => p.id === nextProvider) || allProviders[0];

    const exists = modelId && nextProviderInfo?.models.some((m) => m.id === modelId);
    const nextModel: string = exists ? (modelId as string) : (nextProviderInfo?.models[0]?.id ?? 'gpt-4o-mini');

    const changed = nextProvider !== provider || nextModel !== modelId;
    return { selection: { provider: nextProvider, model: nextModel }, changed };
  };

  // 初始化数据
  useEffect(() => {
    (async () => {
      const allProviders = await loadProvidersAndModels();

      // 加载对话默认模型
      const chatProvider = (await sr.get<string>(SettingKey.DefaultProvider)) || null;
      const chatModelId = (await sr.get<string>(SettingKey.DefaultModel)) || null;
      const validatedChat = validateAndFixModel(chatProvider, chatModelId, allProviders);
      setChatModel(validatedChat.selection);
      if (validatedChat.changed) {
        await sr.set(SettingKey.DefaultProvider, validatedChat.selection.provider);
        await sr.set(SettingKey.DefaultModel, validatedChat.selection.model);
      }

      // 加载话题命名设置
      const namingEnabled = (await sr.get<boolean>(SettingKey.TopicAutoNameEnabled)) ?? true;
      const namingPrompt = (await sr.get<string>(SettingKey.TopicAutoNamePrompt)) ?? '请用简短中文总结本次对话主题';
      const namingProvider = (await sr.get<string>(SettingKey.TopicNamingProvider)) || null;
      const namingModelId = (await sr.get<string>(SettingKey.TopicNamingModel)) || null;
      setTopicNamingEnabled(namingEnabled);
      setTopicNamingPrompt(namingPrompt);

      const validatedNaming = validateAndFixModel(namingProvider, namingModelId, allProviders);
      setTopicNamingModel(validatedNaming.selection);
      if (validatedNaming.changed) {
        await sr.set(SettingKey.TopicNamingProvider, validatedNaming.selection.provider);
        await sr.set(SettingKey.TopicNamingModel, validatedNaming.selection.model);
        setNotice('上次选择的模型不可用，已自动切换');
      }

      // 加载翻译模型设置（TODO）
      // const translationProvider = (await sr.get<string>(SettingKey.TranslationProvider)) || null;
      // const translationModelId = (await sr.get<string>(SettingKey.TranslationModel)) || null;
      // const validatedTranslation = validateAndFixModel(translationProvider, translationModelId, allProviders);
      // setTranslationModel(validatedTranslation.selection);
    })();
  }, [sr]);

  // 打开模型选择器
  const openModelPicker = (type: ModelType) => {
    setCurrentEditingType(type);
    // 设置默认选中的标签
    const currentSelection = type === 'chat' ? chatModel : type === 'topicNaming' ? topicNamingModel : translationModel;
    if (currentSelection) {
      setSelectedTab(currentSelection.provider);
    } else {
      setSelectedTab('all');
    }
    setModelPickerOpen(true);
  };

  // 保存模型选择
  const saveModel = async (provider: string, model: string) => {
    const selection = { provider, model };

    if (currentEditingType === 'chat') {
      setChatModel(selection);
      await sr.set(SettingKey.DefaultProvider, provider);
      await sr.set(SettingKey.DefaultModel, model);
    } else if (currentEditingType === 'topicNaming') {
      setTopicNamingModel(selection);
      await sr.set(SettingKey.TopicNamingProvider, provider);
      await sr.set(SettingKey.TopicNamingModel, model);
    } else if (currentEditingType === 'translation') {
      // TODO: 实现翻译模型保存
      setTranslationModel(selection);
      await sr.set(SettingKey.TranslationProvider, provider);
      await sr.set(SettingKey.TranslationModel, model);
    }

    setModelPickerOpen(false);
  };

  // 获取当前选中的模型
  const getCurrentSelection = (): ModelSelection | null => {
    if (currentEditingType === 'chat') return chatModel;
    if (currentEditingType === 'topicNaming') return topicNamingModel;
    if (currentEditingType === 'translation') return translationModel;
    return null;
  };

  // 根据选中的标签筛选模型
  const displayedModels = React.useMemo(() => {
    const currentSelection = getCurrentSelection();
    if (selectedTab === 'all') {
      // 显示所有提供商的所有模型
      return providers.flatMap((p) => p.models.map((m) => ({ ...m, provider: p })));
    } else {
      // 显示选中提供商的模型
      const provider = providers.find((p) => p.id === selectedTab);
      return provider ? provider.models.map((m) => ({ ...m, provider })) : [];
    }
  }, [selectedTab, providers, currentEditingType]);

  // 获取提供商名称
  const getProviderName = (providerId: string): string => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || providerId;
  };

  return (
    <SettingScreen title="默认模型设置" description="配置各功能使用的默认AI模型">
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {/* 对话默认模型 */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            对话默认模型
          </Text>
          <Card mode="outlined" style={styles.card}>
            <List.Item
              title="默认对话模型"
              description={
                chatModel
                  ? `${getProviderName(chatModel.provider)} · ${chatModel.model}`
                  : '未选择'
              }
              onPress={() => openModelPicker('chat')}
              left={(props) => <List.Icon {...props} icon="chat" color={theme.colors.primary} />}
              right={() => <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />}
              style={{ paddingVertical: 4 }}
            />
          </Card>
        </View>

        {/* 话题命名模型 */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            话题命名模型
          </Text>
          <Card mode="outlined" style={styles.card}>
            <List.Item
              title="启用自动命名"
              right={() => (
                <Switch
                  value={topicNamingEnabled}
                  onValueChange={async (v) => {
                    setTopicNamingEnabled(v);
                    await sr.set(SettingKey.TopicAutoNameEnabled, v);
                  }}
                />
              )}
              style={{ paddingVertical: 4 }}
            />
            <Divider style={{ marginHorizontal: 16 }} />
            <View style={{ padding: 16 }}>
              <TextInput
                label="命名提示词"
                value={topicNamingPrompt}
                onChangeText={async (v) => {
                  setTopicNamingPrompt(v);
                  await sr.set(SettingKey.TopicAutoNamePrompt, v);
                }}
                multiline
                numberOfLines={3}
                mode="outlined"
              />
            </View>
            <Divider style={{ marginHorizontal: 16 }} />
            <List.Item
              title="命名所用模型"
              description={
                topicNamingModel
                  ? `${getProviderName(topicNamingModel.provider)} · ${topicNamingModel.model}`
                  : '未选择'
              }
              onPress={() => openModelPicker('topicNaming')}
              left={(props) => <List.Icon {...props} icon="tag" color={theme.colors.secondary} />}
              right={() => <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />}
              style={{ paddingVertical: 4 }}
            />
          </Card>
        </View>

        {/* 翻译模型（TODO） */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            翻译模型 (即将推出)
          </Text>
          <Card mode="outlined" style={[styles.card, { opacity: 0.6 }]}>
            <List.Item
              title="翻译所用模型"
              description="功能开发中..."
              disabled
              left={(props) => <List.Icon {...props} icon="translate" color={theme.colors.onSurfaceDisabled} />}
              right={() => <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceDisabled} />}
              style={{ paddingVertical: 4 }}
            />
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                💡 TODO: 添加翻译模型配置功能
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* 模型选择对话框 */}
      <UnifiedDialog
        visible={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        title="选择AI模型"
        maxHeight="80%"
        actions={[{ text: '完成', type: 'primary', onPress: () => setModelPickerOpen(false) }]}
      >
        <View style={styles.dialogContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                加载模型列表...
              </Text>
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
                    {
                      backgroundColor:
                        selectedTab === 'all' ? theme.colors.primaryContainer : 'transparent',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          selectedTab === 'all'
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
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
                      {
                        backgroundColor:
                          selectedTab === provider.id ? theme.colors.primaryContainer : 'transparent',
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            selectedTab === provider.id
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurfaceVariant,
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
                  const currentSelection = getCurrentSelection();
                  const isSelected =
                    currentSelection?.provider === item.provider.id &&
                    currentSelection?.model === item.id;

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
                      onPress={() => saveModel(item.provider.id, item.id)}
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

      {/* 通知消息 */}
      <Snackbar
        visible={!!notice}
        onDismiss={() => setNotice(null)}
        duration={2500}
        style={{ marginBottom: 20 }}
      >
        {notice}
      </Snackbar>
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
  },
  dialogContent: {
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
