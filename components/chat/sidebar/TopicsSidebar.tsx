import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Surface, Text, List, TouchableRipple, useTheme, Button, IconButton, Searchbar, Checkbox, Menu, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useConversations } from '@/hooks/use-conversations';
import { ChatRepository } from '@/storage/repositories/chat';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useTopicExport } from '@/hooks/use-topic-export';
import { TopicExportDialog } from '@/components/chat/dialogs/TopicExportDialog';
import { Conversation } from '@/storage/core';
import type { ExportOptions } from '@/services/export';

interface TopicsSidebarProps {
  visible: boolean;
  onClose: () => void;
  onSelectTopic?: (id: string) => void;
  currentTopicId?: string;
}

/**
 * 🎯 TopicItem 组件属性接口
 */
interface TopicItemProps {
  conversation: Conversation;
  isCurrentTopic: boolean;
  batchMode: boolean;
  selectedIds: Set<string>;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onExport: (conversation: Conversation) => void;
  onToggleSelection: (id: string) => void;
  menuVisible: boolean;
  onMenuOpen: (id: string) => void;
  onMenuClose: () => void;
  themeColors: {
    primary: string;
    primaryContainer: string;
    error: string;
  };
}

type TopicListEntry =
  | { key: string; type: 'header'; title: string }
  | { key: string; type: 'item'; conversation: Conversation };

/** 
 * 🚀 TopicItem 独立组件 - 使用 React.memo 优化渲染性能
 *
 * 性能优化说明：
 * - 提取为独立组件，避免父组件重渲染时重新创建
 * - 使用 React.memo 进行浅比较
 * - 自定义比较函数，仅在关键 props 变化时重渲染
 *
 * @param props TopicItemProps
 */
const TopicItem = React.memo<TopicItemProps>(({
  conversation,
  isCurrentTopic,
  batchMode,
  selectedIds,
  onPress,
  onLongPress,
  onRename,
  onDelete,
  onExport,
  onToggleSelection,
  menuVisible,
  onMenuOpen,
  onMenuClose,
  themeColors,
}) => {
  const isSelected = selectedIds.has(conversation.id);

  return (
    <TouchableRipple
      onPress={() => onPress(conversation.id)}
      onLongPress={() => onLongPress(conversation.id)}
      rippleColor={themeColors.primary + '20'}
    >
      <List.Item
        title={conversation.title || '默认话题'}
        description={new Date(conversation.updatedAt).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
        style={isCurrentTopic ? {
          backgroundColor: themeColors.primaryContainer,
        } : undefined}
        titleStyle={isCurrentTopic ? {
          color: themeColors.primary,
          fontWeight: '600',
        } : undefined}
        left={(p) =>
          batchMode ? (
            <Checkbox
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={() => onToggleSelection(conversation.id)}
            />
          ) : (
            <List.Icon
              {...p}
              icon="chat-outline"
              color={isCurrentTopic ? themeColors.primary : p.color}
            />
          )
        }
        right={(p) =>
          !batchMode ? (
            <Menu
              visible={menuVisible}
              onDismiss={onMenuClose}
              anchor={
                <IconButton
                  {...p}
                  icon="dots-vertical"
                  size={20}
                  onPress={() => onMenuOpen(conversation.id)}
                />
              }
            >
              <Menu.Item
                leadingIcon="pencil-outline"
                onPress={() => {
                  onMenuClose();
                  onRename(conversation);
                }}
                title="重命名"
              />
              <Menu.Item
                leadingIcon="export-variant"
                onPress={() => {
                  onMenuClose();
                  onExport(conversation);
                }}
                title="导出话题"
              />
              <Menu.Item
                leadingIcon="delete-outline"
                onPress={() => {
                  onMenuClose();
                  onDelete(conversation.id);
                }}
                title="删除"
                titleStyle={{ color: themeColors.error }}
              />
            </Menu>
          ) : undefined
        }
      />
    </TouchableRipple>
  );
}, (prevProps, nextProps) => {
  // 🎯 自定义比较函数 - 仅在以下 props 变化时重渲染
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.title === nextProps.conversation.title &&
    prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
    prevProps.isCurrentTopic === nextProps.isCurrentTopic &&
    prevProps.batchMode === nextProps.batchMode &&
    prevProps.selectedIds.has(prevProps.conversation.id) === nextProps.selectedIds.has(nextProps.conversation.id) &&
    prevProps.menuVisible === nextProps.menuVisible &&
    prevProps.themeColors.primary === nextProps.themeColors.primary &&
    prevProps.themeColors.primaryContainer === nextProps.themeColors.primaryContainer &&
    prevProps.themeColors.error === nextProps.themeColors.error
  );
});

// 设置显示名称，便于 React DevTools 调试
TopicItem.displayName = 'TopicItem';

// 时间分类辅助函数
function categorizeByTime(conversations: Conversation[]) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const today: Conversation[] = [];
  const sevenDays: Conversation[] = [];
  const earlier: Conversation[] = [];

  conversations.forEach((conv) => {
    const diff = now - conv.updatedAt;
    if (diff < oneDayMs) {
      today.push(conv);
    } else if (diff < sevenDaysMs) {
      sevenDays.push(conv);
    } else {
      earlier.push(conv);
    }
  });

  return { today, sevenDays, earlier };
}

export function TopicsSidebar({ visible, onClose, onSelectTopic, currentTopicId }: TopicsSidebarProps) {
  const theme = useTheme();
  const { confirmAction, prompt } = useConfirmDialog();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.max(280, Math.floor(width * 0.85)));
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(drawerWidth)).current; // from right
  const { items: convs, reload } = useConversations({ limit: 100 });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 导出功能状态
  const { exportAndShare, isExporting, progress, error, reset } = useTopicExport();
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportingConversation, setExportingConversation] = useState<Conversation | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 搜索过滤
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return convs;
    const query = searchQuery.toLowerCase();
    return convs.filter(item =>
      (item.title?.toLowerCase() || '').includes(query)
    );
  }, [convs, searchQuery]);

  // 时间分类
  const categorized = useMemo(() => categorizeByTime(filteredItems), [filteredItems]);

  const topicListData = useMemo(() => {
    const sections: TopicListEntry[] = [];
    const pushSection = (title: string, data: Conversation[]) => {
      if (data.length === 0) return;
      sections.push({ key: `header-${title}`, type: 'header', title });
      data.forEach((conversation) => {
        sections.push({ key: conversation.id, type: 'item', conversation });
      });
    };

    pushSection('今日', categorized.today);
    pushSection('七天内', categorized.sevenDays);
    pushSection('更早', categorized.earlier);

    return sections;
  }, [categorized]);

  // 🚀 性能优化：缓存主题颜色对象，避免每次渲染都创建新对象
  const themeColors = useMemo(() => ({
    primary: theme.colors.primary,
    primaryContainer: theme.colors.primaryContainer,
    error: theme.colors.error,
  }), [theme.colors.primary, theme.colors.primaryContainer, theme.colors.error]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, drawerWidth, translateX]);

  // 🚀 性能优化：使用 useCallback 缓存切换选择函数
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 🚀 性能优化：缓存话题点击处理函数
  const handleTopicPress = useCallback((id: string) => {
    if (batchMode) {
      toggleSelection(id);
    } else {
      onSelectTopic?.(id);
      onClose();
    }
  }, [batchMode, toggleSelection, onSelectTopic, onClose]);

  // 🚀 性能优化：缓存话题长按处理函数
  const handleTopicLongPress = useCallback((id: string) => {
    if (!batchMode) {
      setBatchMode(true);
      toggleSelection(id);
    }
  }, [batchMode, toggleSelection]);

  // 🚀 性能优化：缓存话题重命名处理函数
  const handleRenameTopicPress = useCallback((conversation: Conversation) => {
    prompt({
      title: '重命名话题',
      placeholder: '请输入新标题',
      defaultValue: conversation.title || '',
      maxLength: 50,
      icon: {
        name: 'pencil',
        type: 'material-community',
        color: theme.colors.primary,
      },
      validation: (value) => ({
        valid: value.trim().length > 0,
        error: '标题不能为空',
      }),
      onConfirm: async (value) => {
        await ChatRepository.renameConversation(conversation.id, value.trim());
        await reload();
      },
    });
  }, [prompt, theme.colors.primary, reload]);

  // 🚀 性能优化：缓存话题删除处理函数
  const handleDeleteTopicPress = useCallback((id: string) => {
    confirmAction(
      '删除话题',
      '删除后不可恢复，确认删除？',
      async () => {
        await ChatRepository.deleteConversation(id);
        await reload();
      },
      {
        confirmText: '删除',
        cancelText: '取消',
        destructive: true,
      }
    );
  }, [confirmAction, reload]);

  // 🚀 性能优化：缓存话题导出处理函数
  const handleExportTopicPress = useCallback((conversation: Conversation) => {
    setExportingConversation(conversation);
    setExportDialogVisible(true);
  }, []);

  // 处理导出确认
  const handleExportConfirm = useCallback(async (options: ExportOptions) => {
    if (!exportingConversation) return;

    try {
      await exportAndShare(exportingConversation.id, options);
      setSnackbarMessage('导出成功！');
      setSnackbarVisible(true);
      setExportDialogVisible(false);
    } catch (err: any) {
      setSnackbarMessage(err?.message || '导出失败');
      setSnackbarVisible(true);
    }
  }, [exportingConversation, exportAndShare]);

  // 处理导出对话框关闭
  const handleExportDialogDismiss = useCallback(() => {
    if (!isExporting) {
      setExportDialogVisible(false);
      setExportingConversation(null);
      reset();
    }
  }, [isExporting, reset]);

  // 菜单打开/关闭处理
  const handleMenuOpen = useCallback((id: string) => {
    setOpenMenuId(id);
  }, []);

  const handleMenuClose = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    await confirmAction(
      '批量删除',
      `确认删除选中的 ${selectedIds.size} 个话题？删除后不可恢复。`,
      async () => {
        for (const id of selectedIds) {
          await ChatRepository.deleteConversation(id);
        }
        setSelectedIds(new Set());
        setBatchMode(false);
        await reload();
      },
      {
        confirmText: '删除',
        cancelText: '取消',
        destructive: true,
      }
    );
  };

  const renderTopicListItem = useCallback<ListRenderItem<TopicListEntry>>(({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            {item.title}
          </Text>
        </View>
      );
    }

    const conversation = item.conversation;
    return (
      <TopicItem
        conversation={conversation}
        isCurrentTopic={conversation.id === currentTopicId}
        batchMode={batchMode}
        selectedIds={selectedIds}
        onPress={handleTopicPress}
        onLongPress={handleTopicLongPress}
        onRename={handleRenameTopicPress}
        onDelete={handleDeleteTopicPress}
        onExport={handleExportTopicPress}
        onToggleSelection={toggleSelection}
        menuVisible={openMenuId === conversation.id}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        themeColors={themeColors}
      />
    );
  }, [
    batchMode,
    currentTopicId,
    handleDeleteTopicPress,
    handleRenameTopicPress,
    handleExportTopicPress,
    handleTopicLongPress,
    handleTopicPress,
    handleMenuOpen,
    handleMenuClose,
    openMenuId,
    selectedIds,
    theme.colors.onSurfaceVariant,
    themeColors,
    toggleSelection,
  ]);

  const topicKeyExtractor = useCallback((item: TopicListEntry) => item.key, []);
  const topicListContentStyle = useMemo(() => ({ paddingBottom: 16 }), []);
  const topicListExtraData = useMemo(() => ({
    batchMode,
    selectedIds,
    currentTopicId,
    openMenuId,
    themeColors,
  }), [batchMode, selectedIds, currentTopicId, openMenuId, themeColors]);

  const renderEmptyTopics = useCallback(() => (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ opacity: 0.6, textAlign: 'center' }}>
        {searchQuery ? '未找到匹配的话题' : '暂无话题'}
      </Text>
    </View>
  ), [searchQuery]);

  /**
   * 🚀 渲染分类区块 - 使用优化后的 TopicItem 组件
   */
  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { zIndex: 1100, elevation: 1100 }]}
    >
      {/* 背景遮罩 */}
      <Pressable
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: visible ? 'rgba(0,0,0,0.25)' : 'transparent' }]}
      />

      {/* 右侧抽屉 */}
      <Animated.View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: drawerWidth,
          transform: [{ translateX }],
          zIndex: 1101,
        }}
        pointerEvents="auto"
      >
        <Surface
          style={{
            flex: 1,
            backgroundColor: theme.colors.surface,
            paddingTop: Math.max(insets.top, 8),
            paddingBottom: Math.max(insets.bottom, 8),
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderLeftColor: '#E5E7EB',
          }}
          elevation={5}
        >
          <View style={{ flex: 1 }}>
            {/* 头部标题栏 */}
            <View style={styles.header}>
              {searchVisible ? (
                <Searchbar
                  placeholder="搜索话题..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={[styles.searchBarInHeader, { backgroundColor: '#F5F5F5' }]}
                  inputStyle={{ color: theme.colors.onSurface }}
                  elevation={0}
                  autoFocus
                  icon="arrow-left"
                  onIconPress={() => {
                    setSearchVisible(false);
                    setSearchQuery('');
                  }}
                />
              ) : (
                <>
                  <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                    {batchMode ? `已选择 ${selectedIds.size} 项` : '话题'}
                  </Text>
                  <View style={{ flexDirection: 'row' }}>
                    {batchMode ? (
                      <>
                        <IconButton
                          icon="delete"
                          iconColor={theme.colors.error}
                          disabled={selectedIds.size === 0}
                          onPress={deleteSelected}
                        />
                        <IconButton
                          icon="close"
                          onPress={() => {
                            setBatchMode(false);
                            setSelectedIds(new Set());
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <IconButton
                          icon="magnify"
                          onPress={() => setSearchVisible(true)}
                        />
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => setBatchMode(true)}
                        />
                      </>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* 话题列表 */}
            <FlashList
              data={topicListData}
              renderItem={renderTopicListItem}
              keyExtractor={topicKeyExtractor}
              // @ts-expect-error FlashList 类型定义未包含 estimatedItemSize，但运行时需要配置
              estimatedItemSize={84}
              contentContainerStyle={topicListContentStyle}
              style={{ flex: 1 }}
              ListEmptyComponent={renderEmptyTopics}
              showsVerticalScrollIndicator={false}
              extraData={topicListExtraData}
            />

            {/* 底部新建按钮 */}
            <View style={styles.footer}>
              <Button
                icon="plus"
                mode="contained"
                onPress={async () => {
                  const conv = await ChatRepository.createConversation('新话题');
                  await reload();
                  onSelectTopic?.(conv.id);
                  onClose();
                }}
              >
                新建话题
              </Button>
            </View>
          </View>
        </Surface>
      </Animated.View>

      {/* 导出对话框 */}
      <TopicExportDialog
        visible={exportDialogVisible}
        onDismiss={handleExportDialogDismiss}
        onConfirm={handleExportConfirm}
        progress={progress}
        isExporting={isExporting}
      />

      {/* 消息提示 */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ marginBottom: insets.bottom + 16 }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchBarInHeader: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
});
