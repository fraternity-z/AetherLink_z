/**
 * MCP 工具开关与服务器查看对话框
 *
 * 展示：已激活的 MCP 服务器列表 + 对话内是否启用 MCP 工具的开关
 * 说明：启用后，后续对话发送将注入工具（enableMcpTools=true），
 *       工具来源为“设置 > MCP 服务端”中标记为激活的服务器。
 */

import React from 'react';
import { View } from 'react-native';
import { Chip, Divider, Switch, Text, useTheme } from 'react-native-paper';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import { McpServersRepository } from '@/storage/repositories/mcp';
import type { MCPServer } from '@/types/mcp';
import { router } from 'expo-router';

export interface McpToolsDialogProps {
  visible: boolean;
  onDismiss: () => void;
  enabled: boolean;
  onChangeEnabled: (v: boolean) => void;
}

export function McpToolsDialog({ visible, onDismiss, enabled, onChangeEnabled }: McpToolsDialogProps) {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [servers, setServers] = React.useState<MCPServer[]>([]);

  React.useEffect(() => {
    if (!visible) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await McpServersRepository.getActiveServers();
        if (mounted) setServers(list);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible]);

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title="MCP 工具"
      icon={enabled ? 'puzzle' : 'puzzle-outline'}
      iconColor={enabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
      actions={[
        { text: '去设置', onPress: () => { onDismiss(); router.push('/settings/mcp-server'); } },
        { text: '关闭', type: 'cancel', onPress: onDismiss },
      ]}
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            对话内启用 MCP 工具
          </Text>
          <Switch value={enabled} onValueChange={onChangeEnabled} />
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          启用后，将在后续消息中注入 MCP 工具。工具来自下方已激活的服务器列表。
        </Text>

        <Divider />

        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          已激活的服务器
        </Text>

        {loading ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>加载中…</Text>
        ) : servers.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            暂无激活服务器。请点击“去设置”添加并激活。
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {servers.map((s) => (
              <Chip key={s.id} mode="outlined" selected>{s.name}</Chip>
            ))}
          </View>
        )}
      </View>
    </UnifiedDialog>
  );
}

