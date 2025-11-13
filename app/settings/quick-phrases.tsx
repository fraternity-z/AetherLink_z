import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Card, Text, IconButton, FAB, ActivityIndicator, useTheme } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { QuickPhraseEditDialog } from '@/components/settings/QuickPhraseEditDialog';
import { useQuickPhrases } from '@/hooks/use-quick-phrases';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { QuickPhrase } from '@/storage/core';

/**
 * 快捷短语管理页面
 *
 * 展示和管理用户的快捷短语，支持添加、编辑、删除操作
 */
export default function QuickPhrasesSettings() {
  const theme = useTheme();
  const { phrases, loading, create, update, delete: deletePhrase } = useQuickPhrases();
  const { confirmAction, alert } = useConfirmDialog();
  const [editingPhrase, setEditingPhrase] = useState<QuickPhrase | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  /**
   * 处理删除操作
   */
  const handleDelete = useCallback(async (phrase: QuickPhrase) => {
    await confirmAction(
      '确认删除',
      `确定要删除快捷短语"${phrase.title}"吗？`,
      async () => {
        try {
          await deletePhrase(phrase.id);
        } catch (error) {
          alert('删除失败', '删除快捷短语失败，请重试');
        }
      }
    );
  }, [confirmAction, alert, deletePhrase]);

  /**
   * 处理编辑操作
   */
  const handleEdit = useCallback((phrase: QuickPhrase) => {
    setEditingPhrase(phrase);
    setShowEditDialog(true);
  }, []);

  /**
   * 处理添加操作
   */
  const handleAdd = useCallback(() => {
    setEditingPhrase(null);
    setShowEditDialog(true);
  }, []);

  /**
   * 处理保存操作（创建或更新）
   */
  const handleSave = useCallback(async (data: {
    title: string;
    content: string;
    icon?: string | null;
  }) => {
    try {
      if (editingPhrase) {
        // 更新现有短语
        await update(editingPhrase.id, data);
      } else {
        // 创建新短语
        await create(data);
      }
    } catch (error) {
      // 错误处理
      alert('保存失败', '保存快捷短语失败，请重试');
      throw error; // 重新抛出错误，让对话框保持打开状态
    }
  }, [editingPhrase, create, update, alert]);

  /**
   * 渲染快捷短语卡片
   */
  const renderPhraseCard = useCallback(({ item: phrase }: { item: QuickPhrase }) => {
    return (
      <Card
        style={[
          styles.phraseCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Card.Content>
          {/* 头部：图标 + 标题 + 操作按钮 */}
          <View style={styles.phraseHeader}>
            {phrase.icon && (
              <Text style={styles.phraseIcon}>{phrase.icon}</Text>
            )}
            <Text
              style={[
                styles.phraseTitle,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {phrase.title}
            </Text>
            <View style={styles.actionButtons}>
              <IconButton
                icon="pencil"
                size={20}
                iconColor={theme.colors.primary}
                onPress={() => handleEdit(phrase)}
                style={{ margin: 0 }}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => handleDelete(phrase)}
                style={{ margin: 0 }}
              />
            </View>
          </View>

          {/* 内容预览 */}
          <Text
            style={[
              styles.phraseContent,
              { color: theme.colors.onSurfaceVariant },
            ]}
            numberOfLines={2}
          >
            {phrase.content}
          </Text>
        </Card.Content>
      </Card>
    );
  }, [theme, handleEdit, handleDelete]);

  /**
   * 渲染空状态
   */
  const renderEmptyComponent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text
          style={[
            styles.emptyTitle,
            { color: theme.colors.onSurface },
          ]}
        >
          暂无快捷短语
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          点击右下角按钮添加第一个短语
        </Text>
      </View>
    );
  }, [loading, theme]);

  return (
    <SettingScreen
      title="快捷短语"
      description="添加常用的快捷回复短语，提升聊天效率"
      disableScroll
    >
      <View style={styles.container}>
        <FlashList
          data={phrases}
          renderItem={renderPhraseCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
          // @ts-expect-error - FlashList 类型定义问题：estimatedItemSize 属性不存在
          estimatedItemSize={90}
          drawDistance={400}
        />

        {/* 添加按钮 */}
        <FAB
          icon="plus"
          label="添加短语"
          onPress={handleAdd}
          style={[
            styles.fab,
            { backgroundColor: theme.colors.primary },
          ]}
        />
      </View>

      {/* 编辑/创建对话框 */}
      <QuickPhraseEditDialog
        visible={showEditDialog}
        phrase={editingPhrase}
        onDismiss={() => setShowEditDialog(false)}
        onSave={handleSave}
      />
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // 为 FAB 留出空间
  },
  phraseCard: {
    marginBottom: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  phraseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phraseIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  phraseTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  phraseContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
