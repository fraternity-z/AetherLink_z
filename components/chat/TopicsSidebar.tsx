import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Surface, Text, List, TouchableRipple, useTheme, Button, IconButton, Portal, Dialog, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversations } from '@/hooks/use-conversations';
import { ChatRepository } from '@/storage/repositories/chat';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

interface TopicsSidebarProps {
  visible: boolean;
  onClose: () => void;
  onSelectTopic?: (id: string) => void;
}

export function TopicsSidebar({ visible, onClose, onSelectTopic }: TopicsSidebarProps) {
  const theme = useTheme();
  const { confirmAction } = useConfirmDialog();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.max(280, Math.floor(width * 0.85)));
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(drawerWidth)).current; // from right
  const { items: convs, reload } = useConversations({ limit: 100 });
  const [renameDlg, setRenameDlg] = useState<{ visible: boolean; id: string | null; title: string }>(() => ({ visible: false, id: null, title: '' }));

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, drawerWidth, translateX]);

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
          <View style={{ paddingHorizontal: 8, paddingBottom: insets.bottom + 88, flex: 1 }}>
            <Text variant="titleSmall" style={{ margin: 12 }}>
              话题列表
            </Text>
            {convs.map((c) => (
              <TouchableRipple
                key={c.id}
                onPress={() => {
                  onSelectTopic?.(c.id);
                  onClose();
                }}
              >
                <List.Item
                  title={c.title || '未命名话题'}
                  description={new Date(c.updatedAt).toLocaleString()}
                  left={(p) => <List.Icon {...p} icon="chat-processing-outline" />}
                  right={(p) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton
                        {...p}
                        icon="pencil-outline"
                        onPress={() => setRenameDlg({ visible: true, id: c.id, title: c.title || '' })}
                      />
                      <IconButton
                        {...p}
                        icon="delete-outline"
                        onPress={() =>
                          confirmAction(
                            '删除话题',
                            '删除后不可恢复，确认删除？',
                            async () => {
                              await ChatRepository.deleteConversation(c.id);
                              await reload();
                            },
                            {
                              confirmText: '删除',
                              cancelText: '取消',
                              destructive: true,
                            }
                          )
                        }
                      />
                    </View>
                  )}
                />
              </TouchableRipple>
            ))}
            <View style={{ padding: 8 }}>
              <Button
                icon="plus"
                mode="outlined"
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

      <Portal>
        <Dialog visible={renameDlg.visible} onDismiss={() => setRenameDlg({ visible: false, id: null, title: '' })}>
          <Dialog.Title>重命名话题</Dialog.Title>
          <Dialog.Content>
            <TextInput
              autoFocus
              label="新标题"
              value={renameDlg.title}
              onChangeText={(t) => setRenameDlg((s) => ({ ...s, title: t }))}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRenameDlg({ visible: false, id: null, title: '' })}>取消</Button>
            <Button
              onPress={async () => {
                if (!renameDlg.id) return;
                await ChatRepository.renameConversation(renameDlg.id, renameDlg.title.trim() || '未命名话题');
                setRenameDlg({ visible: false, id: null, title: '' });
                await reload();
              }}
            >
              保存
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
