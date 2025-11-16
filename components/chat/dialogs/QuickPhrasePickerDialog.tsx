/**
 * 快捷短语选择弹窗
 *
 * 在聊天界面显示快捷短语列表，用户可快速选择并插入到输入框
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  IconButton,
  Card,
  ActivityIndicator,
  Button,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuickPhrases } from '@/hooks/use-quick-phrases';
import type { QuickPhrase } from '@/storage/core';

interface QuickPhrasePickerDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (phrase: QuickPhrase) => void;
}

export function QuickPhrasePickerDialog({
  visible,
  onDismiss,
  onSelect,
}: QuickPhrasePickerDialogProps) {
  if (!visible) {
    return null;
  }

  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phrases, loading } = useQuickPhrases();

  /**
   * 处理选择短语
   */
  const handleSelect = useCallback((phrase: QuickPhrase) => {
    onSelect(phrase);
    onDismiss();
  }, [onSelect, onDismiss]);

  /**
   * 跳转到设置页面
   */
  const handleGoToSettings = useCallback(() => {
    onDismiss();
    router.push('/settings/quick-phrases');
  }, [onDismiss, router]);

  /**
   * 渲染短语卡片
   */
  const renderPhraseCard = useCallback(({ item: phrase }: { item: QuickPhrase }) => {
    return (
      <Pressable onPress={() => handleSelect(phrase)}>
        <Card
          style={[
            styles.phraseCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Card.Content style={styles.phraseCardContent}>
            {phrase.icon && (
              <Text style={styles.phraseIcon}>{phrase.icon}</Text>
            )}
            <View style={styles.phraseTextContainer}>
              <Text
                style={[
                  styles.phraseTitle,
                  { color: theme.colors.onSurface },
                ]}
                numberOfLines={1}
              >
                {phrase.title}
              </Text>
              <Text
                style={[
                  styles.phrasePreview,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {phrase.content}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    );
  }, [theme, handleSelect]);

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
          前往设置添加常用的快捷回复
        </Text>
        <Button
          mode="contained"
          onPress={handleGoToSettings}
          style={styles.emptyButton}
        >
          前往设置
        </Button>
      </View>
    );
  }, [loading, theme, handleGoToSettings]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.surface,
            marginTop: Platform.select({ ios: insets.top + 50, android: 0 }),
          },
        ]}
      >
        {/* 顶部栏 */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.outlineVariant,
              paddingTop: Platform.OS === 'android' ? insets.top : 0,
            },
          ]}
        >
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.onSurface },
            ]}
          >
            选择快捷短语
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="cog"
              size={24}
              onPress={handleGoToSettings}
              iconColor={theme.colors.onSurfaceVariant}
            />
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              iconColor={theme.colors.onSurfaceVariant}
            />
          </View>
        </View>

        {/* 短语列表 */}
        <FlatList
          data={phrases}
          renderItem={renderPhraseCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={[
            styles.listContent,
            phrases.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />

        {/* 底部安全区域 */}
        <View style={{ height: insets.bottom }} />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  phraseCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  phraseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  phraseIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  phraseTextContainer: {
    flex: 1,
  },
  phraseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  phrasePreview: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
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
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 120,
  },
});
