/**
 * 🔍 模型发现对话框组件（基于 UnifiedDialog）
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme, Button, Searchbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { DiscoveredModel } from '@/services/ai/ModelDiscovery';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';

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
}

const ModelItem = memo(({ model, isSelected, isLast, onToggle, primaryColor }: ModelItemProps) => {
  return (
    <Pressable onPress={() => onToggle(model.id)} style={[styles.modelItem, !isLast && { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }] }>
      <View style={styles.modelInfo}>
        <Text variant="bodyMedium" style={{ fontWeight: '500', color: '#000' }}>
          {model.label || model.id}
        </Text>
        {model.label && model.label !== model.id && (
          <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
            {model.id}
          </Text>
        )}
      </View>

      {/* 圆形勾选框 - 纯 CSS */}
      <View style={[styles.checkbox, isSelected && [styles.checkboxChecked, { backgroundColor: primaryColor, borderColor: primaryColor }]]}>
        {isSelected && <Icon name="check" size={14} color="#FFF" />}
      </View>
    </Pressable>
  );
});

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

  // 全选/取消全选（合并为一个切换按钮，避免两个动作贴在一起）
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
      title="从接口获取的模型"
      icon="download"
      iconColor={theme.colors.primary}
      actions={[
        { text: allSelected ? '取消全选' : '全选', onPress: toggleSelectAll, type: 'cancel' },
        { text: `确定添加 (${selectedCount})`, type: 'primary', onPress: handleConfirm, disabled: loading || selectedCount === 0 },
      ]}
      maxHeight={'80%'}
    >
      {/* 搜索栏 */}
      {!loading && models.length > 0 && (
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="搜索模型 ID 或名称"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ elevation: 0, backgroundColor: '#F5F5F5' }}
            inputStyle={{ fontSize: 14 }}
          />
        </View>
      )}

      {/* 内容区 */}
      <ScrollView style={styles.scrollArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>正在获取模型列表...</Text>
          </View>
        ) : models.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text>未获取到任何模型</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title} style={{ marginBottom: 12 }}>
              {/* 卡片式分组 */}
              <View style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={{ fontWeight: '600' }}>{group.title}</Text>
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{group.models.length}</Text>
                  </View>
                </View>
                <View style={styles.modelList}>
                  {group.models.map((m, idx) => (
                    <ModelItem key={m.id} model={m} isSelected={selectedIds.has(m.id)} isLast={idx === group.models.length - 1} onToggle={toggleModel} primaryColor={theme.colors.primary} />
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollArea: {
    paddingHorizontal: 16,
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  modelList: {
    backgroundColor: '#FFF',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  modelInfo: {
    flex: 1,
    marginRight: 12,
  },
  // 自定义勾选框 - 圆形
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
});
