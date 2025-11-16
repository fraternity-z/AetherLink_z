import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Switch, Button, Card, Text, Divider, Portal, ActivityIndicator, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { DataStatsService, DataStatistics } from '@/services/data/DataStats';
import { DataBackupService, BackupData } from '@/services/data/DataBackup';
import { DataCleanupService } from '@/services/data/DataCleanup';
import { LegacyImportService } from '@/services/data/LegacyImport';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { logger } from '@/utils/logger';

export default function DataSettings() {
  const theme = useTheme();
  const { alert, confirmAction } = useConfirmDialog();
  const [localCache, setLocalCache] = useState(true);
  const [stats, setStats] = useState<DataStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  // 加载统计数据
  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await DataStatsService.getStatistics();
      setStats(data);
    } catch (e: any) {
      logger.error('[DataSettings] Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    const sr = SettingsRepository();
    const cacheEnabled = await sr.get<boolean>(SettingKey.LocalCacheEnabled);
    setLocalCache(cacheEnabled ?? true);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ visible: true, title, message, onConfirm });
  };

  const hideConfirm = () => {
    setConfirmDialog({ ...confirmDialog, visible: false });
  };

  // 导出数据
  const handleExport = async () => {
    try {
      setLoading(true);
      await DataBackupService.exportAndShare();
      alert('成功', '数据已导出');
    } catch (e: any) {
      alert('导出失败', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // 导入数据
  const handleImport = async () => {
    showConfirm(
      '⚠️ 导入数据',
      '警告：导入数据将清空所有现有数据！请确保已导出当前数据备份。',
      async () => {
        try {
          // 选择文件
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
          });

          if (result.canceled) {
            hideConfirm();
            return;
          }

          const fileUri = result.assets[0].uri;

          // 读取文件内容
          const file = new File(fileUri);
          const content = await file.text();
          const backupData: BackupData = JSON.parse(content);

          // 执行恢复
          setLoading(true);
          await DataBackupService.restoreFromJSON(backupData);
          alert('成功', '数据已恢复');
          await loadStats();
        } catch (e: any) {
          alert('导入失败', e?.message || String(e));
          logger.error('[DataSettings] Import failed:', e);
        } finally {
          setLoading(false);
          hideConfirm();
        }
      }
    );
  };

  // 导入旧版备份（仅提供商和模型配置）
  const handleLegacyImport = async () => {
    showConfirm(
      '导入旧版配置',
      '此功能将从旧版 AetherLink 备份文件中导入提供商配置、API 密钥和模型列表。不会导入会话和消息数据。',
      async () => {
        try {
          // 选择文件
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
          });

          if (result.canceled) {
            hideConfirm();
            return;
          }

          const fileUri = result.assets[0].uri;

          // 读取文件内容
          const file = new File(fileUri);
          const content = await file.text();
          const legacyData = JSON.parse(content);

          // 验证格式
          if (!LegacyImportService.validateBackup(legacyData)) {
            alert('格式错误', '不是有效的旧版备份文件');
            hideConfirm();
            return;
          }

          // 执行导入
          setLoading(true);
          const result_1 = await LegacyImportService.importProvidersAndModels(legacyData, {
            overwriteExisting: false,
            importApiKeys: true,
          });

          // 显示结果
          const summary = [
            `✓ 已导入 ${result_1.providersImported} 个官方提供商`,
            `✓ 已创建 ${result_1.customProvidersCreated} 个自定义提供商`,
            `✓ 已导入 ${result_1.modelsImported} 个模型`,
          ];

          if (result_1.errors.length > 0) {
            summary.push(`\n⚠️ ${result_1.errors.length} 个错误（已记录）`);
          }

          alert('导入完成', summary.join('\n'));
          logger.info('[DataSettings] Legacy import result:', result_1);

        } catch (e: any) {
          alert('导入失败', e?.message || String(e));
          logger.error('[DataSettings] Legacy import failed:', e);
        } finally {
          setLoading(false);
          hideConfirm();
        }
      }
    );
  };

  // 清理缓存
  const handleClearCache = async () => {
    showConfirm('清理缓存', '确定要清理所有缓存数据吗？', async () => {
      try {
        setLoading(true);
        await DataCleanupService.clearCache();
        alert('成功', '缓存已清理');
        await loadStats();
      } catch (e: any) {
        alert('清理失败', e?.message || String(e));
      } finally {
        setLoading(false);
        hideConfirm();
      }
    });
  };

  // 清理已归档会话
  const handleClearArchived = async () => {
    showConfirm('清理已归档会话', '确定要删除所有已归档的会话吗？此操作不可恢复。', async () => {
      try {
        setLoading(true);
        const count = await DataCleanupService.clearArchivedConversations();
        alert('成功', `已删除 ${count} 个已归档会话`);
        await loadStats();
      } catch (e: any) {
        alert('清理失败', e?.message || String(e));
      } finally {
        setLoading(false);
        hideConfirm();
      }
    });
  };

  // 清理失败消息
  const handleClearFailed = async () => {
    showConfirm('清理失败消息', '确定要删除所有发送失败的消息吗？', async () => {
      try {
        setLoading(true);
        const count = await DataCleanupService.clearFailedMessages();
        alert('成功', `已删除 ${count} 条失败消息`);
        await loadStats();
      } catch (e: any) {
        alert('清理失败', e?.message || String(e));
      } finally {
        setLoading(false);
        hideConfirm();
      }
    });
  };

  // 清理所有数据
  const handleClearAll = async () => {
    showConfirm(
      '⚠️ 清空所有数据',
      '警告：此操作将删除所有会话、消息、附件和设置，且不可恢复！请确保已导出备份。',
      async () => {
        // 二次确认
        confirmAction(
          '最终确认',
          '确定要清空所有数据吗？',
          async () => {
            try {
              setLoading(true);
              await DataCleanupService.clearAllData();
              alert('已清空', '所有数据已被清除');
              await loadStats();
            } catch (e: any) {
              alert('清理失败', e?.message || String(e));
            } finally {
              setLoading(false);
              hideConfirm();
            }
          },
          {
            confirmText: '确定清空',
            cancelText: '取消',
            destructive: true,
          }
        );
      }
    );
  };

  return (
    <SettingScreen title="数据设置" description="存储与隐私">
      <ScrollView style={{ flex: 1 }}>
        {/* 数据统计 */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Title title="数据统计" />
          <Card.Content>
            {loading && !stats ? (
              <ActivityIndicator />
            ) : stats ? (
              <View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">会话总数</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats.conversations.total} ({stats.conversations.active} 活跃, {stats.conversations.archived} 已归档)
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">消息总数</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats.messages.total}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodySmall" style={{ marginLeft: 16 }}>
                    用户 / 助手 / 系统
                  </Text>
                  <Text variant="bodySmall" style={styles.statValue}>
                    {stats.messages.user} / {stats.messages.assistant} / {stats.messages.system}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">附件总数</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats.attachments.total}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodySmall" style={{ marginLeft: 16 }}>
                    图片 / 文件 / 音频 / 视频
                  </Text>
                  <Text variant="bodySmall" style={styles.statValue}>
                    {stats.attachments.images} / {stats.attachments.files} / {stats.attachments.audio} /{' '}
                    {stats.attachments.video}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">附件大小</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {DataStatsService.formatBytes(stats.attachments.totalSize)}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">存储占用</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {DataStatsService.formatBytes(stats.storage.estimatedSize)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text>无法加载统计数据</Text>
            )}
          </Card.Content>
          <Card.Actions>
            <Button onPress={loadStats} disabled={loading}>
              刷新统计
            </Button>
          </Card.Actions>
        </Card>

        <Divider style={{ marginVertical: 8 }} />

        {/* 数据备份 */}
        <List.Section>
          <List.Subheader>备份与恢复</List.Subheader>
          <List.Item
            title="导出数据"
            description="导出所有会话、消息和设置"
            left={(props) => <List.Icon {...props} icon="export" />}
            onPress={handleExport}
            disabled={loading}
          />
          <List.Item
            title="导入数据"
            description="从备份文件恢复数据"
            left={(props) => <List.Icon {...props} icon="import" />}
            onPress={handleImport}
            disabled={loading}
          />
          <List.Item
            title="导入旧版配置"
            description="从旧版 AetherLink 导入提供商和模型"
            left={(props) => <List.Icon {...props} icon="cog-transfer" />}
            onPress={handleLegacyImport}
            disabled={loading}
          />
        </List.Section>

        <Divider style={{ marginVertical: 8 }} />

        {/* 数据清理 */}
        <List.Section>
          <List.Subheader>数据清理</List.Subheader>
          <List.Item
            title="清理缓存"
            description="清除临时缓存数据"
            left={(props) => <List.Icon {...props} icon="cached" />}
            onPress={handleClearCache}
            disabled={loading}
          />
          <List.Item
            title="清理已归档会话"
            description={`删除 ${stats?.conversations.archived || 0} 个已归档会话`}
            left={(props) => <List.Icon {...props} icon="archive" />}
            onPress={handleClearArchived}
            disabled={loading || !stats?.conversations.archived}
          />
          <List.Item
            title="清理失败消息"
            description="删除发送失败的消息"
            left={(props) => <List.Icon {...props} icon="alert-circle" />}
            onPress={handleClearFailed}
            disabled={loading}
          />
          <List.Item
            title="清空所有数据"
            description="⚠️ 危险操作：删除所有数据"
            left={(props) => <List.Icon {...props} icon="delete-forever" color={theme.colors.error} />}
            onPress={handleClearAll}
            disabled={loading}
            titleStyle={{ color: theme.colors.error }}
          />
        </List.Section>

        <Divider style={{ marginVertical: 8 }} />

        {/* 隐私设置 */}
        <List.Section>
          <List.Subheader>隐私设置</List.Subheader>
          <List.Item
            title="启用本地缓存"
            description="提高应用响应速度"
            left={(props) => <List.Icon {...props} icon="database" />}
            right={() => (
              <Switch
                value={localCache}
                onValueChange={async (v) => {
                  setLocalCache(v);
                  const sr = SettingsRepository();
                  await sr.set(SettingKey.LocalCacheEnabled, v);
                }}
              />
            )}
          />
        </List.Section>
      </ScrollView>

      {/* 确认对话框（统一弹出框） */}
      <UnifiedDialog
        visible={confirmDialog.visible}
        onClose={hideConfirm}
        title={confirmDialog.title}
        icon="alert-circle"
        actions={[
          { text: '取消', type: 'cancel', onPress: hideConfirm },
          { text: '确定', type: 'primary', onPress: confirmDialog.onConfirm },
        ]}
      >
        <Text>{confirmDialog.message}</Text>
      </UnifiedDialog>

      {/* 加载指示器 */}
      {loading && (
        <Portal>
          <View style={styles.loadingOverlay}>
            <Card>
              <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>处理中...</Text>
              </Card.Content>
            </Card>
          </View>
        </Portal>
      )}
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    borderRadius: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statValue: {
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
