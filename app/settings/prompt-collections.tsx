import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, Searchbar, Chip, Card, useTheme, Divider, IconButton } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SYSTEM_ASSISTANTS } from '@/constants/assistants';
import type { Assistant } from '@/types/assistant';

/**
 * 智能体提示词集合页面
 *
 * 展示所有预设智能体助手和提示词模板
 */
export default function PromptCollections() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedAssistant, setExpandedAssistant] = useState<string | null>(null);

  // 分类标签
  const categories = [
    { key: 'all', label: '全部', color: theme.colors.primary },
    { key: 'basic', label: '基础', color: '#FFD700' },
    { key: 'professional', label: '专业职能', color: '#4CAF50' },
    { key: 'creative', label: '创意生活', color: '#FF5722' },
    { key: 'thinking', label: '高级思维', color: '#9C27B0' },
  ];

  // 助手分类映射
  const getAssistantCategory = (assistant: Assistant): string => {
    const basicIds = ['default', 'web-analysis', 'code-assistant', 'translate-assistant', 'writing-assistant'];
    const thinkingKeywords = ['破限', '深度', '创意', '哲学', '元认知', '系统'];

    if (basicIds.includes(assistant.id)) return 'basic';
    if (assistant.name && thinkingKeywords.some(keyword => assistant.name?.includes(keyword))) {
      return 'thinking';
    }
    if (assistant.tags?.some(tag => ['美食', '健身', '故事', '游戏', '小红书'].includes(tag))) {
      return 'creative';
    }
    return 'professional';
  };

  // 筛选助手
  const filteredAssistants = useMemo(() => {
    let result = SYSTEM_ASSISTANTS;

    // 按分类筛选
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(assistant => getAssistantCategory(assistant) === selectedCategory);
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(assistant =>
        assistant.name.toLowerCase().includes(query) ||
        assistant.description?.toLowerCase().includes(query) ||
        assistant.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  // 渲染列表头部（搜索栏 + 分类筛选 + 统计）
  const renderListHeader = () => (
    <View>
      {/* 搜索栏 */}
      <Searchbar
        placeholder="搜索助手名称、描述或标签..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
      />

      {/* 分类筛选 - 使用水平 FlatList 避免嵌套问题 */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.key}
        renderItem={({ item: category }) => {
          const isSelected = selectedCategory === category.key || (category.key === 'all' && !selectedCategory);
          return (
            <Chip
              mode={isSelected ? 'flat' : 'outlined'}
              selected={isSelected}
              onPress={() => setSelectedCategory(category.key === 'all' ? null : category.key)}
              style={[
                styles.categoryChip,
                isSelected && { backgroundColor: category.color },
              ]}
              textStyle={[
                styles.categoryChipText,
                isSelected && { color: '#FFFFFF' },
              ]}
            >
              {category.label}
            </Chip>
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
        style={styles.categoriesContainer}
      />

      {/* 结果统计 */}
      <Text style={styles.resultCount}>
        共找到 {filteredAssistants.length} 个助手
      </Text>
    </View>
  );

  // 渲染助手卡片
  const renderAssistantCard = ({ item: assistant }: { item: Assistant }) => {
    const isExpanded = expandedAssistant === assistant.id;

    return (
      <Card
        style={[styles.assistantCard, { backgroundColor: '#FFFFFF' }]}
        onPress={() => setExpandedAssistant(isExpanded ? null : assistant.id)}
      >
        <Card.Content>
          {/* 助手头部：图标 + 名称 */}
          <View style={styles.assistantHeader}>
            <View style={styles.assistantTitle}>
              <Text style={styles.emoji}>{assistant.emoji || '🤖'}</Text>
              <Text style={styles.assistantName}>{assistant.name}</Text>
            </View>
            <IconButton
              icon={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              onPress={() => setExpandedAssistant(isExpanded ? null : assistant.id)}
            />
          </View>

          {/* 助手描述 */}
          {assistant.description && (
            <Text style={styles.assistantDescription}>{assistant.description}</Text>
          )}

          {/* 展开的提示词内容 */}
          {isExpanded && assistant.systemPrompt && (
            <View style={styles.promptContainer}>
              <Divider style={styles.divider} />
              <Text style={styles.promptLabel}>系统提示词：</Text>
              <Card style={[styles.promptCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Card.Content>
                  <Text style={styles.promptText}>{assistant.systemPrompt}</Text>
                </Card.Content>
              </Card>

              {/* 操作按钮 */}
              <View style={styles.actionsContainer}>
                <Button
                  mode="contained"
                  icon="content-copy"
                  onPress={() => {
                    // TODO: 复制提示词到剪贴板
                  }}
                  style={styles.actionButton}
                >
                  复制提示词
                </Button>
                <Button
                  mode="outlined"
                  icon="eye"
                  onPress={() => {
                    // TODO: 在聊天中预览
                  }}
                  style={styles.actionButton}
                >
                  预览对话
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  // 渲染空状态
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>没有找到匹配的助手喵～</Text>
      <Text style={styles.emptySubText}>试试调整搜索关键词或分类筛选</Text>
    </View>
  );

  return (
    <SettingScreen
      title="智能体提示词集合"
      description={`浏览和管理 ${SYSTEM_ASSISTANTS.length} 个预设智能体助手`}
      disableScroll // 禁用外层 ScrollView，使用 FlatList 自带的滚动
    >
      <FlatList
        data={filteredAssistants}
        renderItem={renderAssistantCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  assistantCard: {
    marginBottom: 12,
  },
  assistantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistantTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  assistantName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  assistantDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  promptContainer: {
    marginTop: 12,
  },
  divider: {
    marginVertical: 12,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  promptCard: {
    marginBottom: 12,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
