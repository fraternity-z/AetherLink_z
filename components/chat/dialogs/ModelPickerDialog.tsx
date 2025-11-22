/**
 * 🤖 AI模型选择器对话框（基于 UnifiedDialog）
 *
 * 简化版：不与话题绑定，直接通过回调更新全局模型状态
 * 样式优化：现代化标签栏、列表项、分组显示
 */

import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import { UnifiedListItem } from '@/components/common/UnifiedListItem';
import { CustomProvidersRepository } from '@/storage/repositories/custom-providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /**
   * 当前选择的模型（用于显示）
   */
  currentModel: { provider: string; model: string } | null;
  /**
   * 模型选择回调
   */
  onModelSelect: (provider: string, model: string) => void;
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

export function ModelPickerDialog({ visible, onDismiss, currentModel, onModelSelect }: Props) {
  const theme = useTheme();

  const [selected, setSelected] = useState<{ provider: string; model: string } | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('all'); // 'all' 或提供商ID
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = useCallback(async (currentModel: { provider: string; model: string } | null) => {
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

    // 4. 显示当前选择的模型（从父组件传入）
    const curProvider = currentModel?.provider || allProviders[0]?.id || 'openai';
    const curModel = currentModel?.model || allProviders[0]?.models[0]?.id || 'gpt-4o-mini';

    setSelected({ provider: curProvider, model: curModel });

    // 5. 设置默认选中的标签为当前提供商 (如果不在all模式下可能需要切换)
    // 这里默认还是保留在All或者切换到当前Provider，体验更好的是如果All里能找到就All，否则...
    // 简单起见，初始化时如果不在All，可以切过去。但为了浏览方便，保持All也许更好？
    // 逻辑：如果用户刚打开，可以定位到当前Provider
    setSelectedTab(curProvider);

    setIsLoading(false);
  }, [theme.colors.primary]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      void loadModels(currentModel);
    }
  }, [visible, currentModel, loadModels]);

  const selectAndSave = async (provider: string, model: string) => {
    setSelected({ provider, model });
    onModelSelect(provider, model);
    // 稍微延迟关闭，提供视觉反馈
    setTimeout(onDismiss, 150);
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
      title="选择模型"
      maxHeight="80%"
      actions={[{ text: '取消', type: 'neutral', onPress: onDismiss }]}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              加载模型列表...
            </Text>
          </View>
        ) : (
          <>
            {/* 顶部提供商标签栏 */}
            <View style={styles.tabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContent}
              >
                {/* "全部" 标签 */}
                <Pressable
                  onPress={() => setSelectedTab('all')}
                  style={({ pressed }) => [
                    styles.tab,
                    selectedTab === 'all'
                        ? { backgroundColor: theme.colors.onSurface }
                        : { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.outlineVariant },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: selectedTab === 'all'
                          ? theme.colors.surface
                          : theme.colors.onSurfaceVariant,
                        fontWeight: selectedTab === 'all' ? '600' : '400',
                      },
                    ]}
                  >
                    全部
                  </Text>
                </Pressable>

                {/* 提供商标签列表 */}
                {providers.map((provider) => {
                    const isActive = selectedTab === provider.id;
                    return (
                        <Pressable
                          key={provider.id}
                          onPress={() => setSelectedTab(provider.id)}
                          style={({ pressed }) => [
                            styles.tab,
                            isActive
                                ? { backgroundColor: theme.colors.onSurface }
                                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.outlineVariant },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabText,
                              {
                                color: isActive ? theme.colors.surface : theme.colors.onSurfaceVariant,
                                fontWeight: isActive ? '600' : '400',
                              },
                            ]}
                          >
                            {provider.name}
                          </Text>
                        </Pressable>
                    );
                })}
              </ScrollView>
            </View>

            {/* 模型列表 */}
            <View style={styles.listContainer}>
              {displayedModels.map((item, index) => {
                const isSelected = selected?.provider === item.provider.id && selected?.model === item.id;
                
                return (
                    <UnifiedListItem
                        key={`${item.provider.id}:${item.id}`}
                        title={item.label}
                        description={selectedTab === 'all' ? item.provider.name : undefined}
                        leftIcon={item.provider.icon}
                        leftIconColor={item.provider.color}
                        rightIcon={isSelected ? 'check-circle' : undefined}
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderRadius: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? theme.colors.onSurface : theme.colors.outlineVariant,
                            // 卡片式阴影效果
                            ...Platform.select({
                                ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} },
                                android: { elevation: 1 }
                            })
                        }}
                        titleStyle={{
                            fontWeight: isSelected ? '600' : '400',
                            color: theme.colors.onSurface,
                        }}
                        showDivider={false}
                        onPress={() => selectAndSave(item.provider.id, item.id)}
                    />
                );
              })}
              
              {displayedModels.length === 0 && (
                  <View style={styles.emptyState}>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>暂无可用模型</Text>
                  </View>
              )}
            </View>
          </>
        )}
      </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  tabsWrapper: {
    marginBottom: 12,
  },
  tabsContent: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
  },
  tabText: {
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
      padding: 24,
      alignItems: 'center',
  }
});
