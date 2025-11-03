import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { List, Switch, Button, Card, Text, Divider, Portal, Dialog, ActivityIndicator, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { DataStatsService, DataStatistics } from '@/services/data/DataStats';
import { DataBackupService, BackupData } from '@/services/data/DataBackup';
import { DataCleanupService } from '@/services/data/DataCleanup';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export default function DataSettings() {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(false);
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
      console.error('[DataSettings] Failed to load stats:', e);
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
    const analyticsEnabled = await sr.get<boolean>(SettingKey.AnalyticsEnabled);
    const cacheEnabled = await sr.get<boolean>(SettingKey.LocalCacheEnabled);
    setAnalytics(analyticsEnabled ?? false);
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
      Alert.alert('成功', '数据已导出');
    } catch (e: any) {
      Alert.alert('导出失败', e?.message || String(e));
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
          Alert.alert('成功', '数据已恢复');
          await loadStats();
        } catch (e: any) {
          Alert.alert('导入失败', e?.message || String(e));
          console.error('[DataSettings] Import failed:', e);
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
        Alert.alert('成功', '缓存已清理');
        await loadStats();
      } catch (e: any) {
        Alert.alert('清理失败', e?.message || String(e));
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
        Alert.alert('成功', `已删除 ${count} 个已归档会话`);
        await loadStats();
      } catch (e: any) {
        Alert.alert('清理失败', e?.message || String(e));
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
        Alert.alert('成功', `已删除 ${count} 条失败消息`);
        await loadStats();
      } catch (e: any) {
        Alert.alert('清理失败', e?.message || String(e));
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
        Alert.alert('最终确认', '确定要清空所有数据吗？', [
          { text: '取消', style: 'cancel' },
          {
            text: '确定清空',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await DataCleanupService.clearAllData();
                Alert.alert('已清空', '所有数据已被清除');
                await loadStats();
              } catch (e: any) {
                Alert.alert('清理失败', e?.message || String(e));
              } finally {
                setLoading(false);
                hideConfirm();
              }
            },
          },
        ]);
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
            title="启用匿名分析"
            description="帮助改进应用体验"
            left={(props) => <List.Icon {...props} icon="chart-box" />}
            right={() => (
              <Switch
                value={analytics}
                onValueChange={async (v) => {
                  setAnalytics(v);
                  const sr = SettingsRepository();
                  await sr.set(SettingKey.AnalyticsEnabled, v);
                }}
              />
            )}
          />
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

      {/* 确认对话框 */}
      <Portal>
        <Dialog visible={confirmDialog.visible} onDismiss={hideConfirm}>
          <Dialog.Title>{confirmDialog.title}</Dialog.Title>
          <Dialog.Content>
            <Text>{confirmDialog.message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideConfirm}>取消</Button>
            <Button
              onPress={() => {
                confirmDialog.onConfirm();
              }}
            >
              确定
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
