/**
 * 🤖 AI模型选择器对话框（基于 UnifiedDialog）
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme, Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { ProvidersRepository, type ProviderId } from '@/storage/repositories/providers';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';

type Props = { visible: boolean; onDismiss: () => void };

const PROVIDER_META: Record<ProviderId, { name: string; icon: string; color: string }> = {
  openai: { name: 'OpenAI', icon: 'robot', color: '#10A37F' },
  anthropic: { name: 'Anthropic', icon: 'account-voice', color: '#CC785C' },
  google: { name: 'Google', icon: 'google', color: '#4285F4' },
  gemini: { name: 'Gemini', icon: 'google', color: '#4285F4' },
  deepseek: { name: 'DeepSeek', icon: 'brain', color: '#7C3AED' },
  volc: { name: '火山引擎', icon: 'fire', color: '#F97316' },
  zhipu: { name: '智谱AI', icon: 'alpha-z-circle', color: '#6366F1' },
};

export function ModelPickerDialog({ visible, onDismiss }: Props) {
  const theme = useTheme();

  const [selected, setSelected] = useState<{ provider: ProviderId; model: string } | null>(null);
  const [models, setModels] = useState<Record<ProviderId, { id: string; label: string }[]>>({} as any);
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      void loadModels();
    }
  }, [visible]);

  const loadModels = async () => {
    const providers: ProviderId[] = ['openai', 'anthropic', 'gemini', 'google', 'deepseek', 'volc', 'zhipu'];
    const enabled: ProviderId[] = [];

    for (const p of providers) {
      const cfg = await ProvidersRepository.getConfig(p);
      if (cfg.enabled) enabled.push(p);
    }

    if (enabled.length === 0) enabled.push('openai');
    setEnabledProviders(enabled);

    // 构建扁平的模型列表
    const map: Record<ProviderId, { id: string; label: string; provider: ProviderId }[]> = {} as any;
    for (const p of enabled) {
      const list = await ProviderModelsRepository.listOrDefaults(p);
      map[p] = list.map((m) => ({
        id: m.modelId,
        label: m.label || m.modelId,
        provider: p,
      }));
    }
    setModels(map);

    const sr = SettingsRepository();
    const curProvider = ((await sr.get<string>(SettingKey.DefaultProvider)) as ProviderId) || enabled[0];
    const curModel = (await sr.get<string>(SettingKey.DefaultModel)) || (map[curProvider]?.[0]?.id ?? 'gpt-4o-mini');
    setSelected({ provider: curProvider, model: curModel });
    setIsLoading(false);
  };

  const selectAndSave = async (provider: ProviderId, model: string) => {
    setSelected({ provider, model });
    const sr = SettingsRepository();
    await sr.set(SettingKey.DefaultProvider, provider);
    await sr.set(SettingKey.DefaultModel, model);
  };

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title="选择AI模型"
      icon="robot"
      iconColor={theme.colors.primary}
      actions={[{ text: '完成', type: 'primary', onPress: onDismiss }]}
    >
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>加载模型列表...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator bounces={false}>
            {/* 扁平化的模型列表 */}
            {enabledProviders.flatMap((p) =>
              (models[p] || []).map((m) => {
                const isSelected = selected?.provider === p && selected?.model === m.id;
                const providerMeta = PROVIDER_META[p] || { name: p, icon: 'help', color: theme.colors.primary };

                return (
                  <Pressable
                    key={`${p}:${m.id}`}
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
                    onPress={() => selectAndSave(p, m.id)}
                    android_ripple={{ color: theme.colors.surfaceVariant }}
                  >
                    <View style={styles.modelContent}>
                      {/* 提供商图标 */}
                      <View
                        style={[
                          styles.providerIconSmall,
                          { backgroundColor: providerMeta.color },
                        ]}
                      >
                        <Icon name={(providerMeta.icon) as any} size={16} color="#FFFFFF" />
                      </View>

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
                          {m.label}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.providerLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {providerMeta.name}
                        </Text>
                      </View>

                      {/* 选中图标 */}
                      <Icon
                        name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    maxHeight: 400,
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
  scrollView: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modelItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
  },
  modelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modelInfo: {
    flex: 1,
    minWidth: 0,
  },
  modelLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  providerLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});

