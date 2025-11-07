import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View, ScrollView } from 'react-native';
import { Surface, Text, SegmentedButtons, List, TouchableRipple, useTheme, Avatar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChatSettings } from './ChatSettings';
import { AssistantsRepository } from '@/storage/repositories/assistants';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import type { Assistant } from '@/types/assistant';
import { appEvents, AppEvents } from '@/utils/events';
import { AssistantPickerDialog } from './AssistantPickerDialog';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

type TabKey = 'assistants' | 'settings';

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatSidebar({ visible, onClose }: ChatSidebarProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.max(280, Math.floor(width * 0.85)));
  const insets = useSafeAreaInsets();
  // 半透明背景：浅色提高不透明度以便在白底可见，深色保持低透明
  const translucentBg = theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)';
  const hairline = StyleSheet.hairlineWidth;
  const subtleBorder = theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const [tab, setTab] = useState<TabKey>('assistants');
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('default');
  const [pickerVisible, setPickerVisible] = useState(false);
  const { confirm } = useConfirmDialog();

  // 加载助手列表和当前选中的助手
  useEffect(() => {
    const loadAssistants = async () => {
      const repo = AssistantsRepository();
      const allAssistants = await repo.getAll();
      setAssistants(allAssistants);

      const settings = SettingsRepository();
      const currentId = await settings.get<string>(SettingKey.CurrentAssistantId);
      setCurrentAssistantId(currentId || 'default');
    };

    loadAssistants();
  }, [visible]); // 每次打开侧边栏时重新加载

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, drawerWidth, translateX]);

  // 切换助手
  const handleSelectAssistant = async (assistantId: string) => {
    const settings = SettingsRepository();
    await settings.set(SettingKey.CurrentAssistantId, assistantId);
    setCurrentAssistantId(assistantId);

    // 发送助手切换事件
    appEvents.emit(AppEvents.ASSISTANT_CHANGED, assistantId);

    console.log('[ChatSidebar] 切换助手:', assistantId);
  };

  // 添加助手
  const handleAddAssistant = async (assistant: Assistant) => {
    const repo = AssistantsRepository();
    await repo.enableAssistant(assistant.id);
    // 重新加载助手列表
    const allAssistants = await repo.getAll();
    setAssistants(allAssistants);
    console.log('[ChatSidebar] 添加助手:', assistant.name);
  };

  // 移除助手
  const handleRemoveAssistant = async (assistant: Assistant) => {
    if (assistant.id === 'default') {
      return; // 不能删除默认助手
    }

    confirm({
      title: '移除助手',
      message: `确定要从列表中移除「${assistant.name}」吗？\n\n这不会删除助手，你可以随时重新添加。`,
      buttons: [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            const repo = AssistantsRepository();
            await repo.disableAssistant(assistant.id);

            // 如果移除的是当前助手，切换到默认助手
            if (assistant.id === currentAssistantId) {
              await handleSelectAssistant('default');
            }

            // 重新加载助手列表
            const allAssistants = await repo.getAll();
            setAssistants(allAssistants);
            console.log('[ChatSidebar] 移除助手:', assistant.name);
          },
        },
      ],
    });
  };
  

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
    >
      {/* 背景遮罩 */}
      <Pressable
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: visible ? 'rgba(0,0,0,0.25)' : 'transparent' }]}
      />

      {/* 侧边栏容器 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: drawerWidth,
          transform: [{ translateX }],
          zIndex: 1001,
        }}
        // 侧边栏整体拦截触摸，避免空白区域透传
        pointerEvents="auto"
      >
        <Surface
          style={[
            styles.drawer,
            {
              backgroundColor: theme.colors.surface,
              paddingTop: Math.max(insets.top, 8),
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
          elevation={5}
          pointerEvents="auto"
        >
          {/* 顶部 Tabs */}
          <View style={styles.header}>
            <SegmentedButtons
              value={tab}
              onValueChange={(v) => setTab(v as TabKey)}
              buttons={[
                { value: 'assistants', label: '助手', icon: 'robot' },
                // 只保留两项：助手与设置
                { value: 'settings', label: '设置', icon: 'cog' },
              ]}
            />
          </View>

          {/* 内容 */}
          <View style={[styles.content, { paddingBottom: insets.bottom + 96 }]}>
            {tab === 'assistants' ? (
              <View style={{ flex: 1 }}>
                {/* 助手列表 */}
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 80 }}
                >
                  {assistants.map((assistant) => {
                    const isSelected = assistant.id === currentAssistantId;
                    const canRemove = assistant.id !== 'default';

                    return (
                      <TouchableRipple
                        key={assistant.id}
                        onPress={() => handleSelectAssistant(assistant.id)}
                        onLongPress={() => canRemove && handleRemoveAssistant(assistant)}
                      >
                        <List.Item
                          title={assistant.name}
                          description={assistant.description}
                          left={(props) => (
                            <View style={{ paddingLeft: 8, paddingTop: 6 }}>
                              <Text style={{ fontSize: 24 }}>
                                {assistant.emoji || '🤖'}
                              </Text>
                            </View>
                          )}
                          right={(props) =>
                            isSelected ? (
                              <List.Icon {...props} icon="check" color={theme.colors.primary} />
                            ) : canRemove ? (
                              <IconButton
                                icon="close"
                                size={16}
                                onPress={() => handleRemoveAssistant(assistant)}
                              />
                            ) : null
                          }
                          style={
                            isSelected
                              ? { backgroundColor: theme.colors.primaryContainer }
                              : undefined
                          }
                        />
                      </TouchableRipple>
                    );
                  })}
                </ScrollView>

                {/* 底部添加助手按钮 */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 12,
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.outlineVariant,
                  }}
                >
                  <TouchableRipple
                    onPress={() => setPickerVisible(true)}
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                      borderStyle: 'dashed',
                    }}
                  >
                    <List.Item
                      title="添加助手"
                      titleStyle={{ color: theme.colors.primary }}
                      left={(props) => (
                        <List.Icon {...props} icon="plus" color={theme.colors.primary} />
                      )}
                    />
                  </TouchableRipple>
                </View>
              </View>
            ) : (
              <ChatSettings />
            )}
          </View>

          {/* 底部浮动卡片：头像 + 设置 */}
          <Surface
            elevation={0}
            style={[
              styles.bottomCard,
              {
                backgroundColor: translucentBg,
                left: 12,
                right: 12,
                bottom: Math.max(insets.bottom, 8) + 12,
              },
            ]}
            // 底部卡片区域应拦截触摸
            pointerEvents="auto"
          >
            <View
              style={styles.bottomRow}
              pointerEvents="auto"
              onStartShouldSetResponder={() => true}
            >
              {/* 左侧资料区：用 Pressable 吞掉触摸，防止下穿到输入框 */}
              <Pressable
                onPress={() => {}}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 4 }}
                android_ripple={undefined}
              >
                <Avatar.Icon size={40} icon="account" />
                <View style={{ marginLeft: 10 }}>
                  <Text variant="labelLarge">访客</Text>
                  <Text variant="bodySmall" style={{ opacity: 0.7 }}>guest@example.com</Text>
                </View>
              </Pressable>

              <View pointerEvents="auto">
                <IconButton
                  icon="cog"
                  size={22}
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      router.push('/settings');
                    }, 50);
                  }}
                  style={{ margin: 0 }}
                />
              </View>
            </View>
          </Surface>
        </Surface>
      </Animated.View>

      {/* 助手选择对话框 */}
      <AssistantPickerDialog
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onSelect={handleAddAssistant}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E7EB',
  },
  header: {
    padding: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  bottomCard: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0000',
    overflow: 'hidden',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
