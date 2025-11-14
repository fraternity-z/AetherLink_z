/**
 * MCP 服务器管理页面
 *
 * 功能：
 * - 服务器列表显示
 * - 添加/编辑/删除服务器
 * - 启用/禁用服务器
 * - 健康检查和连接测试
 * - 服务器统计信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  List,
  Button,
  Card,
  Text,
  useTheme,
  Portal,
  ActivityIndicator,
  Switch,
  IconButton,
  Divider,
  Chip,
  TextInput,
} from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { McpServersRepository } from '@/storage/repositories/mcp';
import { mcpClient } from '@/services/mcp/McpClient';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import type { MCPServer, CreateMCPServerInput, UpdateMCPServerInput } from '@/types/mcp';
import { logger } from '@/utils/logger';

const log = logger.createNamespace('MCPServerSettings');

/**
 * 服务器健康状态
 */
interface ServerHealth {
  serverId: string;
  healthy: boolean;
  responseTime?: number;
  toolsCount?: number;
  resourcesCount?: number;
  error?: string;
}

/**
 * 服务器表单数据
 */
interface ServerFormData {
  name: string;
  baseUrl: string;
  description: string;
  headers: string; // JSON string
  timeout: string; // number string
}

/**
 * MCP 服务器设置页面主组件
 */
export default function MCPServerSettings() {
  const theme = useTheme();
  const { alert, confirmAction } = useConfirmDialog();

  // ========== 状态管理 ==========
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [healthChecks, setHealthChecks] = useState<Map<string, ServerHealth>>(new Map());

  // 对话框状态
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    baseUrl: '',
    description: '',
    headers: '{}',
    timeout: '60',
  });
  const [formErrors, setFormErrors] = useState<Partial<ServerFormData>>({});

  // ========== 数据加载 ==========

  /**
   * 加载服务器列表
   */
  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await McpServersRepository.getAllServers();
      setServers(data);
      log.info('服务器列表已加载', { count: data.length });
    } catch (e: any) {
      log.error('加载服务器列表失败', { error: e.message });
      alert('加载失败', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  // ========== 服务器操作 ==========

  /**
   * 添加服务器
   */
  const handleAddServer = () => {
    setEditingServer(null);
    setFormData({
      name: '',
      baseUrl: '',
      description: '',
      headers: '{}',
      timeout: '60',
    });
    setFormErrors({});
    setEditDialogVisible(true);
    log.debug('打开添加服务器对话框');
  };

  /**
   * 编辑服务器
   */
  const handleEditServer = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      baseUrl: server.baseUrl,
      description: server.description || '',
      headers: JSON.stringify(server.headers || {}, null, 2),
      timeout: String(server.timeout || 60),
    });
    setFormErrors({});
    setEditDialogVisible(true);
    log.debug('打开编辑服务器对话框', { serverId: server.id, name: server.name });
  };

  /**
   * 删除服务器
   */
  const handleDeleteServer = (server: MCPServer) => {
    confirmAction(
      '删除服务器',
      `确定要删除服务器 "${server.name}" 吗？此操作不可恢复。`,
      async () => {
        try {
          setLoading(true);
          await McpServersRepository.deleteServer(server.id);
          await loadServers();
          alert('成功', '服务器已删除');
          log.info('服务器已删除', { serverId: server.id, name: server.name });
        } catch (e: any) {
          log.error('删除服务器失败', { serverId: server.id, error: e.message });
          alert('删除失败', e?.message || String(e));
        } finally {
          setLoading(false);
        }
      },
      { confirmText: '删除', destructive: true }
    );
  };

  /**
   * 切换服务器激活状态
   */
  const handleToggleServer = async (server: MCPServer, isActive: boolean) => {
    try {
      await McpServersRepository.toggleServer(server.id, isActive);
      await loadServers();
      log.info('服务器状态已切换', { serverId: server.id, isActive });
    } catch (e: any) {
      log.error('切换服务器状态失败', { serverId: server.id, error: e.message });
      alert('操作失败', e?.message || String(e));
    }
  };

  /**
   * 健康检查
   */
  const handleHealthCheck = async (server: MCPServer) => {
    try {
      setLoading(true);
      const startTime = Date.now();

      log.info('开始健康检查', { serverId: server.id, name: server.name });
      const result = await mcpClient.checkHealth(server.id);
      const responseTime = Date.now() - startTime;

      // 获取工具和资源数量
      let toolsCount = 0;
      let resourcesCount = 0;

      if (result.healthy) {
        try {
          const tools = await mcpClient.listTools(server.id);
          const resources = await mcpClient.listResources(server.id);
          toolsCount = tools.length;
          resourcesCount = resources.length;
          log.info('健康检查成功', {
            serverId: server.id,
            responseTime,
            toolsCount,
            resourcesCount,
          });
        } catch (e: any) {
          log.warn('获取工具/资源失败', { serverId: server.id, error: e.message });
        }
      } else {
        log.warn('健康检查失败', { serverId: server.id, error: result.error });
      }

      const healthData: ServerHealth = {
        serverId: server.id,
        healthy: result.healthy ?? false,
        responseTime,
        toolsCount,
        resourcesCount,
        error: result.error,
      };

      setHealthChecks((prev) => new Map(prev).set(server.id, healthData));

      if (result.healthy) {
        alert(
          '健康检查',
          `✅ 服务器连接正常\n\n📊 响应时间: ${responseTime}ms\n🔧 工具数: ${toolsCount} 个\n📦 资源数: ${resourcesCount} 个`
        );
      } else {
        alert('健康检查', `❌ 服务器连接失败\n\n错误信息:\n${result.error}`);
      }
    } catch (e: any) {
      log.error('健康检查失败', { serverId: server.id, error: e.message });
      alert('检查失败', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存服务器（添加或编辑）
   */
  const handleSaveServer = async () => {
    // 表单验证
    const errors: Partial<ServerFormData> = {};

    if (!formData.name.trim()) {
      errors.name = '名称不能为空';
    }

    if (!formData.baseUrl.trim()) {
      errors.baseUrl = 'URL 不能为空';
    } else if (!formData.baseUrl.startsWith('http://') && !formData.baseUrl.startsWith('https://')) {
      errors.baseUrl = 'URL 必须以 http:// 或 https:// 开头';
    }

    // 验证 headers JSON
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(formData.headers);
      if (typeof headers !== 'object' || Array.isArray(headers)) {
        throw new Error('Headers 必须是 JSON 对象');
      }
    } catch (e: any) {
      errors.headers = e.message || 'Headers 必须是有效的 JSON 对象';
    }

    // 验证 timeout
    const timeout = parseInt(formData.timeout);
    if (isNaN(timeout) || timeout <= 0) {
      errors.timeout = '超时时间必须是正整数';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      log.warn('表单验证失败', { errors });
      return;
    }

    try {
      setLoading(true);

      if (editingServer) {
        // 更新服务器
        const input: UpdateMCPServerInput = {
          name: formData.name.trim(),
          baseUrl: formData.baseUrl.trim(),
          description: formData.description.trim() || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          timeout,
        };
        await McpServersRepository.updateServer(editingServer.id, input);
        alert('成功', '服务器已更新');
        log.info('服务器已更新', { serverId: editingServer.id, name: input.name });
      } else {
        // 添加服务器
        const input: CreateMCPServerInput = {
          name: formData.name.trim(),
          baseUrl: formData.baseUrl.trim(),
          description: formData.description.trim() || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          timeout,
        };
        const newServer = await McpServersRepository.createServer(input);
        alert('成功', '服务器已添加');
        log.info('服务器已添加', { serverId: newServer.id, name: input.name });
      }

      setEditDialogVisible(false);
      await loadServers();
    } catch (e: any) {
      log.error('保存服务器失败', { error: e.message });
      alert('保存失败', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // ========== 渲染 ==========

  /**
   * 渲染服务器卡片
   */
  const renderServerCard = (server: MCPServer) => {
    const health = healthChecks.get(server.id);

    return (
      <Card key={server.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title
          title={server.name}
          subtitle={server.baseUrl}
          titleStyle={{ fontWeight: '600' }}
          right={() => (
            <View style={styles.cardActions}>
              <Switch value={server.isActive} onValueChange={(value) => handleToggleServer(server, value)} />
              <IconButton icon="pencil" size={20} onPress={() => handleEditServer(server)} />
              <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => handleDeleteServer(server)} />
            </View>
          )}
        />
        <Card.Content>
          {server.description ? (
            <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
              {server.description}
            </Text>
          ) : null}

          <View style={styles.statusRow}>
            <Chip icon={server.isActive ? 'check-circle' : 'circle-outline'} style={styles.chip} textStyle={styles.chipText}>
              {server.isActive ? '已激活' : '已禁用'}
            </Chip>

            {health && (
              <Chip
                icon={health.healthy ? 'connection' : 'close-circle'}
                style={[styles.chip, { backgroundColor: health.healthy ? theme.colors.primaryContainer : theme.colors.errorContainer }]}
                textStyle={styles.chipText}
              >
                {health.healthy ? `${health.responseTime}ms` : '连接失败'}
              </Chip>
            )}
          </View>

          {health && health.healthy && (
            <View style={styles.statsRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                🔧 工具: {health.toolsCount} | 📦 资源: {health.resourcesCount}
              </Text>
            </View>
          )}
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => handleHealthCheck(server)} disabled={loading}>
            测试连接
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SettingScreen title="MCP 服务器" description="Model Context Protocol 服务器管理">
      <ScrollView style={{ flex: 1 }}>
        {/* 统计信息 */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Title title="📊 服务器统计" />
          <Card.Content>
            <View style={styles.statRow}>
              <Text variant="bodyMedium">服务器总数</Text>
              <Text variant="bodyMedium" style={styles.statValue}>
                {servers.length}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text variant="bodyMedium">已激活</Text>
              <Text variant="bodyMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
                {servers.filter((s) => s.isActive).length}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Divider style={{ marginVertical: 8 }} />

        {/* 添加服务器按钮 */}
        <Button mode="contained" icon="plus" onPress={handleAddServer} style={styles.addButton} disabled={loading}>
          添加服务器
        </Button>

        {/* 服务器列表 */}
        <List.Section>
          <List.Subheader>服务器列表</List.Subheader>
          {servers.length === 0 ? (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                  😺 暂无服务器，点击上方按钮添加喵～
                </Text>
              </Card.Content>
            </Card>
          ) : (
            servers.map(renderServerCard)
          )}
        </List.Section>
      </ScrollView>

      {/* 编辑服务器对话框 */}
      <UnifiedDialog
        visible={editDialogVisible}
        onClose={() => setEditDialogVisible(false)}
        title={editingServer ? '✏️ 编辑服务器' : '➕ 添加服务器'}
        icon="server"
        actions={[
          { text: '取消', type: 'cancel', onPress: () => setEditDialogVisible(false) },
          { text: '保存', type: 'primary', onPress: handleSaveServer },
        ]}
      >
        <ScrollView style={styles.dialogContent}>
          {/* 名称 */}
          <TextInput
            label="名称 *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            error={!!formErrors.name}
            mode="outlined"
            style={styles.input}
            placeholder="我的 MCP 服务器"
          />
          {formErrors.name && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
              {formErrors.name}
            </Text>
          )}

          {/* URL */}
          <TextInput
            label="服务器 URL *"
            value={formData.baseUrl}
            onChangeText={(text) => setFormData({ ...formData, baseUrl: text })}
            error={!!formErrors.baseUrl}
            mode="outlined"
            style={styles.input}
            placeholder="https://example.com/mcp"
            autoCapitalize="none"
            keyboardType="url"
          />
          {formErrors.baseUrl && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
              {formErrors.baseUrl}
            </Text>
          )}

          {/* 描述 */}
          <TextInput
            label="描述（可选）"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={2}
            placeholder="简单描述这个服务器的用途"
          />

          {/* Headers */}
          <TextInput
            label="Headers (JSON 格式，可选)"
            value={formData.headers}
            onChangeText={(text) => setFormData({ ...formData, headers: text })}
            error={!!formErrors.headers}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder='{"Authorization": "Bearer token"}'
            autoCapitalize="none"
          />
          {formErrors.headers && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
              {formErrors.headers}
            </Text>
          )}

          {/* 超时时间 */}
          <TextInput
            label="超时时间（秒）"
            value={formData.timeout}
            onChangeText={(text) => setFormData({ ...formData, timeout: text })}
            error={!!formErrors.timeout}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            placeholder="60"
          />
          {formErrors.timeout && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
              {formErrors.timeout}
            </Text>
          )}
        </ScrollView>
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

// ========== 样式 ==========

const styles = StyleSheet.create({
  card: {
    margin: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
  },
  statsRow: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statValue: {
    fontWeight: '600',
  },
  addButton: {
    margin: 12,
    borderRadius: 8,
  },
  dialogContent: {
    maxHeight: 400,
  },
  input: {
    marginBottom: 12,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
