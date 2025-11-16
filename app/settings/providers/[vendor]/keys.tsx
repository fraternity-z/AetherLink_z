/**
 * 多 Key 管理页面
 * 路由：/settings/providers/[vendor]/keys
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Surface,
  Text,
  List,
  Button,
  FAB,
  Snackbar,
  Portal,
  useTheme,
  Chip,
  Switch,
  IconButton,
  Divider,
} from 'react-native-paper';
import { ProviderKeysRepository } from '@/storage/repositories/provider-keys';
import { ProviderKeyManagementRepository } from '@/storage/repositories/provider-key-management';
import type {
  ApiKeyConfig,
  KeyStats,
  LoadBalanceStrategy,
} from '@/storage/types/api-key-config';
import type { ProviderId } from '@/storage/repositories/providers';
import { maskApiKey } from '@/utils/mask-api-key';
import { logger } from '@/utils/logger';

export default function ProviderKeysManagement() {
  const theme = useTheme();
  const { vendor } = useLocalSearchParams<{ vendor: string }>();
  const providerId = (vendor || 'openai') as ProviderId;

  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [strategy, setStrategy] = useState<LoadBalanceStrategy>('round_robin');
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  // 加载数据
  const loadKeys = useCallback(async () => {
    try {
      const keysList = await ProviderKeysRepository.listByProvider(providerId);
      setKeys(keysList);
      logger.info('[KeysManagement] 加载 Keys', { count: keysList.length });
    } catch (error) {
      logger.error('[KeysManagement] 加载 Keys 失败', error);
      setSnackbar({ visible: true, message: '加载失败' });
    }
  }, [providerId]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await ProviderKeysRepository.getKeyStats(providerId);
      setStats(statsData);
    } catch (error) {
      logger.error('[KeysManagement] 加载统计失败', error);
    }
  }, [providerId]);

  const loadStrategy = useCallback(async () => {
    try {
      const strategyData = await ProviderKeyManagementRepository.getStrategy(providerId);
      setStrategy(strategyData);
    } catch (error) {
      logger.error('[KeysManagement] 加载策略失败', error);
    }
  }, [providerId]);

  useEffect(() => {
    loadKeys();
    loadStats();
    loadStrategy();
  }, [loadKeys, loadStats, loadStrategy]);

  // 切换启用/禁用
  const handleToggleEnabled = async (keyId: string, isEnabled: boolean) => {
    try {
      await ProviderKeysRepository.update(keyId, { isEnabled });
      await loadKeys();
      await loadStats();
      setSnackbar({ visible: true, message: isEnabled ? '已启用' : '已禁用' });
    } catch (error) {
      logger.error('[KeysManagement] 切换启用状态失败', error);
      setSnackbar({ visible: true, message: '操作失败' });
    }
  };

  // 删除 Key
  const handleDelete = async (keyId: string) => {
    try {
      await ProviderKeysRepository.delete(keyId);
      await loadKeys();
      await loadStats();
      setSnackbar({ visible: true, message: '✓ 已删除' });
    } catch (error) {
      logger.error('[KeysManagement] 删除 Key 失败', error);
      setSnackbar({ visible: true, message: '✗ 删除失败' });
    }
  };

  // 渲染统计卡片
  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Surface style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
              {stats.total}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              总数
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="displaySmall" style={{ color: '#22c55e' }}>
              {stats.active}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              正常
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="displaySmall" style={{ color: '#ef4444' }}>
              {stats.error}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              错误
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
              {stats.successRate}%
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              成功率
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  // 渲染策略选择器
  const renderStrategySelector = () => {
    return (
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <List.Subheader>负载均衡策略</List.Subheader>
        <View style={styles.strategyContainer}>
          <Text variant="bodyMedium">轮询 (Round Robin)</Text>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            循环使用所有可用的 API Key
          </Text>
        </View>
      </Surface>
    );
  };

  // 渲染 Key 列表项
  const renderKeyItem = (key: ApiKeyConfig) => {
    const maskedKey = maskApiKey(key.key);
    const statusColor =
      key.status === 'active' ? '#22c55e' : key.status === 'error' ? '#ef4444' : '#94a3b8';

    return (
      <View key={key.id}>
        <View style={styles.keyItem}>
          {/* 左侧：Key 信息 */}
          <View style={styles.keyInfo}>
            <View style={styles.keyHeader}>
              {key.isPrimary && (
                <Chip
                  mode="flat"
                  style={{
                    backgroundColor: '#22c55e',
                    marginRight: 8,
                    height: 24,
                  }}
                  textStyle={{ color: '#fff', fontSize: 11 }}
                >
                  主要密钥
                </Chip>
              )}
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                优先级: {key.priority}
              </Text>
            </View>

            <Text variant="bodyMedium" style={{ fontFamily: 'monospace', marginTop: 4 }}>
              {maskedKey}
            </Text>

            <View style={styles.keyStats}>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                请求: {key.usage.totalRequests} | 成功: {key.usage.successfulRequests} | 失败:{' '}
                {key.usage.failedRequests}
              </Text>
            </View>
          </View>

          {/* 右侧：操作按钮 */}
          <View style={styles.keyActions}>
            <Switch
              value={key.isEnabled}
              onValueChange={(value) => handleToggleEnabled(key.id, value)}
            />
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => {
                // TODO: 打开编辑对话框
                setSnackbar({ visible: true, message: '编辑功能开发中' });
              }}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDelete(key.id)}
            />
          </View>
        </View>
        <Divider />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${vendor} - 多 Key 管理` }} />

      <ScrollView style={{ flex: 1 }}>
        {/* 统计卡片 */}
        {renderStatsCards()}

        {/* 策略选择器 */}
        {renderStrategySelector()}

        {/* API Keys 列表 */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.listHeader}>
            <List.Subheader style={{ marginBottom: 0 }}>
              API Keys ({keys.length})
            </List.Subheader>
            <Button
              mode="text"
              onPress={() => {
                // TODO: 打开添加对话框
                setSnackbar({ visible: true, message: '添加功能开发中' });
              }}
            >
              添加 Key
            </Button>
          </View>

          {keys.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                暂无 API Key
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4 }}>
                点击右上角"添加 Key"按钮添加
              </Text>
            </View>
          ) : (
            keys.map(renderKeyItem)
          )}
        </Surface>
      </ScrollView>

      {/* Snackbar 提示 */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2000}
        style={{ marginBottom: 20 }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  strategyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  keyInfo: {
    flex: 1,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyStats: {
    marginTop: 8,
  },
  keyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
});
