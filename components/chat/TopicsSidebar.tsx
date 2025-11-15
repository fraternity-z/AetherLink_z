import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View, ScrollView } from 'react-native';
import { Surface, Text, List, TouchableRipple, useTheme, Button, IconButton, Searchbar, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversations } from '@/hooks/use-conversations';
import { ChatRepository } from '@/storage/repositories/chat';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { Conversation } from '@/storage/core';

interface TopicsSidebarProps {
  visible: boolean;
  onClose: () => void;
  onSelectTopic?: (id: string) => void;
  currentTopicId?: string;
}

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

  const renderTopicItem = (c: Conversation) => {
    const isCurrentTopic = c.id === currentTopicId;

    return (
      <TouchableRipple
        key={c.id}
        onPress={() => handleTopicPress(c.id)}
        onLongPress={() => handleTopicLongPress(c.id)}
        rippleColor={theme.colors.primary + '20'}
      >
        <List.Item
          title={c.title || '默认话题'}
          description={new Date(c.updatedAt).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
          style={isCurrentTopic ? {
            backgroundColor: theme.colors.primaryContainer,
          } : undefined}
          titleStyle={isCurrentTopic ? {
            color: theme.colors.primary,
            fontWeight: '600',
          } : undefined}
          left={(p) =>
            batchMode ? (
              <Checkbox
                status={selectedIds.has(c.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleSelection(c.id)}
              />
            ) : (
              <List.Icon
                {...p}
                icon="chat-outline"
                color={isCurrentTopic ? theme.colors.primary : p.color}
              />
            )
          }
          right={(p) =>
            !batchMode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton
                  {...p}
                  icon="pencil-outline"
                  size={20}
                  onPress={() => handleRenameTopicPress(c)}
                />
                <IconButton
                  {...p}
                  icon="delete-outline"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => handleDeleteTopicPress(c.id)}
                />
              </View>
            ) : undefined
          }
        />
      </TouchableRipple>
    );
  };

  const renderSection = (title: string, data: Conversation[]) => {
    if (data.length === 0) return null;
    return (
      <View key={title}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            {title}
          </Text>
        </View>
        {data.map((item) => renderTopicItem(item))}
      </View>
    );
  };

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
            <ScrollView style={{ flex: 1 }}>
              {filteredItems.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ opacity: 0.6, textAlign: 'center' }}>
                    {searchQuery ? '未找到匹配的话题' : '暂无话题'}
                  </Text>
                </View>
              ) : (
                <>
                  {renderSection('今日', categorized.today)}
                  {renderSection('七天内', categorized.sevenDays)}
                  {renderSection('更早', categorized.earlier)}
                </>
              )}
            </ScrollView>

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
