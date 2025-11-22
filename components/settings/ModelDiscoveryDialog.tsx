/**
 * 🔍 模型发现对话框组件（基于 UnifiedDialog）
 * 
 * 样式优化：统一卡片风格、复选框样式
 */

import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import type { DiscoveredModel } from '@/services/ai';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Searchbar, Text, useTheme } from 'react-native-paper';

interface ModelGroup {
  title: string;
  models: DiscoveredModel[];
}

interface Props {
  visible: boolean;
  loading: boolean;
  models: DiscoveredModel[];
  onDismiss: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

// 独立的模型项组件 - 避免不必要的重渲染
interface ModelItemProps {
  model: DiscoveredModel;
  isSelected: boolean;
  isLast: boolean;
  onToggle: (id: string) => void;
  primaryColor: string;
  theme: any;
}

const ModelItem = memo(({ model, isSelected, isLast, onToggle, primaryColor, theme }: ModelItemProps) => {
  return (
    <Pressable
      onPress={() => onToggle(model.id)}
      style={({ pressed }) => [
        styles.modelItem,
        {
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
            backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
        }
      ]}
    >
      <View style={styles.modelInfo}>
        <Text variant="bodyLarge" style={{ fontWeight: isSelected ? '600' : '400', color: theme.colors.onSurface }}>
          {model.label || model.id}
        </Text>
        {model.label && model.label !== model.id && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {model.id}
          </Text>
        )}
      </View>

      {/* 圆形勾选框 - 纯 CSS */}
      <View
        style={[
            styles.checkbox,
            { borderColor: isSelected ? primaryColor : theme.colors.outline },
            isSelected && { backgroundColor: primaryColor }
        ]}
      >
        {isSelected && <Icon name="check" size={14} color="#FFF" />}
      </View>
    </Pressable>
  );
});

ModelItem.displayName = 'ModelItem';

export function ModelDiscoveryDialog({ visible, loading, models, onDismiss, onConfirm }: Props) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(models.map((m) => m.id)));

  // 模型分组：按提供商前缀分组
  const groups = useMemo<ModelGroup[]>(() => {
    const filtered = models.filter(
      (m) => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || (m.label && m.label.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const groupMap = new Map<string, DiscoveredModel[]>();
    for (const model of filtered) {
      const prefix = model.id.split('-')[0] || 'other';
      if (!groupMap.has(prefix)) groupMap.set(prefix, []);
      groupMap.get(prefix)!.push(model);
    }
    return Array.from(groupMap.entries())
      .map(([title, models]) => ({ title, models }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [models, searchQuery]);

  // 切换单个模型的选中状态
  const toggleModel = useCallback((modelId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }, []);

  // 全选/取消全选
  const selectAll = useCallback(() => setSelectedIds(new Set(models.map((m) => m.id))), [models]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);
  const allSelected = selectedIds.size > 0 && selectedIds.size === models.length;
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [allSelected, deselectAll, selectAll]);

  // 确认添加
  const handleConfirm = useCallback(() => onConfirm(Array.from(selectedIds)), [selectedIds, onConfirm]);
  const selectedCount = selectedIds.size;

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title="发现模型"
      icon="download"
      iconColor={theme.colors.primary}
      actions={[
        { text: allSelected ? '取消全选' : '全选', onPress: toggleSelectAll, type: 'neutral' },
        { text: `添加 (${selectedCount})`, type: 'primary', onPress: handleConfirm, disabled: loading || selectedCount === 0 },
      ]}
      maxHeight={'80%'}
    >
      <View style={{ flex: 1 }}>
        {/* 搜索栏 */}
        {!loading && models.length > 0 && (
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="搜索模型 ID 或名称"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
              inputStyle={styles.searchInput}
              iconColor={theme.colors.onSurfaceVariant}
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
          </View>
        )}

        {/* 内容区 */}
        <View style={styles.scrollContainer}>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {loading ? (
                <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>正在获取模型列表...</Text>
                </View>
            ) : models.length === 0 ? (
                <View style={styles.emptyContainer}>
                <Icon name="robot-confused" size={48} color={theme.colors.outline} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>未获取到任何模型</Text>
                </View>
            ) : (
                groups.map((group) => (
                <View key={group.title} style={{ marginBottom: 16 }}>
                    {/* 卡片式分组 */}
                    <View style={[styles.groupCard, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                    <View style={[styles.groupHeader, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outlineVariant }]}>
                        <Text style={{ fontWeight: '600', color: theme.colors.onSurface, textTransform: 'uppercase' }}>{group.title}</Text>
                        <View style={[styles.groupBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text style={[styles.groupBadgeText, { color: theme.colors.onSecondaryContainer }]}>{group.models.length}</Text>
                        </View>
                    </View>
                    <View style={styles.modelList}>
                        {group.models.map((m, idx) => (
                        <ModelItem
                            key={m.id}
                            model={m}
                            isSelected={selectedIds.has(m.id)}
                            isLast={idx === group.models.length - 1}
                            onToggle={toggleModel}
                            primaryColor={theme.colors.primary}
                            theme={theme}
                        />
                        ))}
                    </View>
                    </View>
                </View>
                ))
            )}
            </ScrollView>
        </View>
      </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingBottom: 12,
  },
  searchBar: {
      elevation: 0,
      height: 44,
      borderRadius: 12,
  },
  searchInput: {
      fontSize: 14,
      minHeight: 0, // Fix for some RN versions
  },
  scrollContainer: {
      flex: 1,
      marginHorizontal: -24, // 抵消 UnifiedDialog 的 padding
  },
  scrollArea: {
    paddingHorizontal: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  // 卡片式分组容器
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modelList: {
    // backgroundColor: 'white', // Controlled by theme
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modelInfo: {
    flex: 1,
    marginRight: 12,
  },
  // 自定义勾选框 - 圆形
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
