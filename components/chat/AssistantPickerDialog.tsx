/**
 * 助手选择对话框
 *
 * 用于从系统预设助手中选择并添加到侧边栏
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, Text, Searchbar, useTheme, Chip } from 'react-native-paper';
import { AssistantsRepository } from '@/storage/repositories/assistants';
import type { Assistant } from '@/types/assistant';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';

interface AssistantPickerDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (assistant: Assistant) => void;
}

export function AssistantPickerDialog({ visible, onDismiss, onSelect }: AssistantPickerDialogProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 加载所有系统助手和已启用的助手ID
  useEffect(() => {
    if (visible) {
      loadAssistants();
    }
  }, [visible]);

  const loadAssistants = async () => {
    const repo = AssistantsRepository();
    const systemAssistants = await repo.getAllSystemAssistants();
    const enabled = await repo.getEnabledIds();
    setAllAssistants(systemAssistants);
    setEnabledIds(enabled);
  };

  // 获取所有可用的标签
  const allTags = Array.from(
    new Set(allAssistants.flatMap(a => a.tags || []))
  ).sort();

  // 过滤助手
  const filteredAssistants = allAssistants.filter(assistant => {
    // 搜索过滤
    const matchesSearch = !searchQuery ||
      assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assistant.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // 标签过滤
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => assistant.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  // 分组：已启用和未启用
  const enabledAssistants = filteredAssistants.filter(a => enabledIds.includes(a.id));
  const availableAssistants = filteredAssistants.filter(a => !enabledIds.includes(a.id));

  const handleSelect = (assistant: Assistant) => {
    onSelect(assistant);
    onDismiss();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title="添加助手"
      icon="account"
      actions={[{ text: '关闭', type: 'cancel', onPress: onDismiss }]}
      maxHeight={'80%'}
    >
        <View style={styles.content}>
          {/* 搜索框 */}
          <Searchbar
            placeholder="搜索助手..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBar}
            inputStyle={{ color: '#1F2937' }}
            iconColor="#6B7280"
            placeholderTextColor="#9CA3AF"
          />

          {/* 标签过滤 */}
          {allTags.length > 0 && (
            <View style={styles.tagsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScrollContent}
              >
                {allTags.map(tag => (
                  <Chip
                    key={tag}
                    selected={selectedTags.includes(tag)}
                    onPress={() => toggleTag(tag)}
                    mode="outlined"
                    compact
                    style={[
                      styles.chip,
                      selectedTags.includes(tag) && styles.chipSelected
                    ]}
                    textStyle={[
                      styles.chipText,
                      selectedTags.includes(tag) && styles.chipTextSelected
                    ]}
                  >
                    {tag}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 助手列表 */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {/* 未启用的助手 */}
            {availableAssistants.length > 0 && (
              <View>
                <Text variant="labelMedium" style={styles.sectionTitle}>
                  可添加的助手
                </Text>
                {availableAssistants.map(assistant => (
                  <TouchableOpacity
                    key={assistant.id}
                    onPress={() => handleSelect(assistant)}
                    style={styles.assistantItem}
                  >
                    <View style={styles.assistantIcon}>
                      <Text style={styles.emoji}>
                        {assistant.emoji || '🤖'}
                      </Text>
                    </View>
                    <View style={styles.assistantContent}>
                      <Text style={styles.assistantName}>{assistant.name}</Text>
                      <Text style={styles.assistantDescription} numberOfLines={2}>
                        {assistant.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 已启用的助手 */}
            {enabledAssistants.length > 0 && (
              <View style={styles.enabledSection}>
                <Text variant="labelMedium" style={styles.sectionTitle}>
                  已添加的助手
                </Text>
                {enabledAssistants.map(assistant => (
                  <View key={assistant.id} style={[styles.assistantItem, styles.disabledItem]}>
                    <View style={styles.assistantIcon}>
                      <Text style={styles.emoji}>
                        {assistant.emoji || '🤖'}
                      </Text>
                    </View>
                    <View style={styles.assistantContent}>
                      <Text style={[styles.assistantName, styles.disabledText]}>
                        {assistant.name}
                      </Text>
                      <Text style={[styles.assistantDescription, styles.disabledText]} numberOfLines={2}>
                        {assistant.description}
                      </Text>
                    </View>
                    <View style={styles.checkIcon}>
                      <Text style={{ color: '#10B981', fontSize: 20 }}>✓</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 无结果 */}
            {filteredAssistants.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>未找到匹配的助手</Text>
              </View>
            )}
          </ScrollView>
        </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    paddingTop: 24,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 0,
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    elevation: 0,
  },
  tagsContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  tagsScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  chipText: {
    color: '#6B7280',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#6366F1',
    fontWeight: '500',
  },
  listContainer: {
    maxHeight: 400,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assistantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  assistantIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  assistantContent: {
    flex: 1,
  },
  assistantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  assistantDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  disabledItem: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  checkIcon: {
    marginLeft: 8,
  },
  enabledSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
