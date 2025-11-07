/**
 * 🔍 模型发现对话框组件
 *
 * 功能：
 * - 从 API 自动获取可用模型列表
 * - 支持分组展示和搜索过滤
 * - 支持全选/取消/批量添加
 * - 优化的勾选框性能（纯 CSS 实现）
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Portal, Dialog, Text, useTheme, Button, Searchbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { DiscoveredModel } from '@/services/ai/ModelDiscovery';

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
    <Pressable
      onPress={() => onToggle(model.id)}
      style={[
        styles.modelItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }
      ]}
    >
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
      <View style={[
        styles.checkbox,
        isSelected && [styles.checkboxChecked, { backgroundColor: primaryColor, borderColor: primaryColor }]
      ]}>
        {isSelected && (
          <Icon name="check" size={14} color="#FFF" />
        )}
      </View>
    </Pressable>
  );
});

export function ModelDiscoveryDialog({ visible, loading, models, onDismiss, onConfirm }: Props) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(models.map(m => m.id)));

  // 模型分组：按提供商前缀分组
  const groups = useMemo<ModelGroup[]>(() => {
    const filtered = models.filter(m =>
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.label && m.label.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const groupMap = new Map<string, DiscoveredModel[]>();

    for (const model of filtered) {
      // 从模型 ID 提取前缀作为分组名（如 "gpt-4" -> "gpt"）
      const prefix = model.id.split('-')[0] || 'other';
      if (!groupMap.has(prefix)) {
        groupMap.set(prefix, []);
      }
      groupMap.get(prefix)!.push(model);
    }

    // 转换为数组并排序
    return Array.from(groupMap.entries())
      .map(([title, models]) => ({ title, models }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [models, searchQuery]);

  // 切换单个模型的选中状态 - 优化为立即响应
  const toggleModel = useCallback((modelId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }, []);

  // 全选
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(models.map(m => m.id)));
  }, [models]);

  // 取消全选
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 确认添加
  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedIds));
  }, [selectedIds, onConfirm]);

  const selectedCount = selectedIds.size;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[styles.dialog, { backgroundColor: '#FFFFFF' }]}
      >
        {/* 标题栏 */}
        <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Text variant="headlineSmall" style={{ fontWeight: '600', color: '#000' }}>
            从接口获取的模型
          </Text>
          <Pressable onPress={onDismiss} style={styles.closeButton}>
            <Icon name="close" size={24} color="#000" />
          </Pressable>
        </View>

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

        {/* 内容区域 */}
        <Dialog.ScrollArea style={styles.scrollArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: '#666' }]}>
                正在加载模型列表...
              </Text>
            </View>
          ) : models.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: '#666' }}>
                没有获取到可用模型
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {groups.map((group, groupIdx) => (
                <View key={group.title} style={[styles.groupCard, groupIdx > 0 && { marginTop: 12 }]}>
                  {/* 分组标题 */}
                  <View style={styles.groupHeader}>
                    <Text variant="labelLarge" style={{ color: '#333', fontWeight: '600' }}>
                      {group.title}
                    </Text>
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupBadgeText}>
                        {group.models.length}
                      </Text>
                    </View>
                  </View>

                  {/* 模型列表 */}
                  <View style={styles.modelList}>
                    {group.models.map((model, idx) => (
                      <ModelItem
                        key={model.id}
                        model={model}
                        isSelected={selectedIds.has(model.id)}
                        isLast={idx === group.models.length - 1}
                        onToggle={toggleModel}
                        primaryColor={theme.colors.primary}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Dialog.ScrollArea>

        {/* 底部操作栏 */}
        <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
          <View style={styles.leftActions}>
            <Button
              mode="text"
              onPress={selectAll}
              disabled={loading || models.length === 0}
              textColor={theme.colors.primary}
            >
              全选
            </Button>
            <Button
              mode="text"
              onPress={deselectAll}
              disabled={loading || models.length === 0}
              textColor={theme.colors.primary}
            >
              取消
            </Button>
          </View>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={loading || selectedCount === 0}
            style={styles.confirmButton}
          >
            添加所选 {selectedCount > 0 && `(${selectedCount})`}
          </Button>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollArea: {
    maxHeight: 500,
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
    borderRadius: 10, // 圆形
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0, // 选中时去掉边框
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    borderRadius: 20,
  },
});
