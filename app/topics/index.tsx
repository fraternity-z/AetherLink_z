import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, List, Surface, Text, useTheme, IconButton } from 'react-native-paper';
import { useConversations } from '@/hooks/use-conversations';
import { ChatRepository } from '@/storage/repositories/chat';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

export default function TopicsScreen() {
  const theme = useTheme();
  const { confirmAction } = useConfirmDialog();
  const { items, reload } = useConversations({ limit: 100 });

  const createTopic = async () => {
    const conv = await ChatRepository.createConversation('新话题');
    router.replace({ pathname: '/', params: { cid: conv.id } });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '话题列表' }} />
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {items.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ opacity: 0.6 }}>暂无话题，点击右上角新建。</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <List.Item
                title={item.title || '未命名话题'}
                description={new Date(item.updatedAt).toLocaleString()}
                left={(p) => <List.Icon {...p} icon="chat-processing-outline" />}
                right={(p) => (
                  <IconButton
                    {...p}
                    icon="delete-outline"
                    onPress={() =>
                      confirmAction(
                        '删除话题',
                        '删除后不可恢复，确认删除？',
                        async () => {
                          await ChatRepository.deleteConversation(item.id);
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
                )}
                onPress={() => router.replace({ pathname: '/', params: { cid: item.id } })}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outlineVariant }} />}
          />
        )}
      </Surface>

      <View style={styles.fabRow}>
        <Button mode="contained" icon="plus" onPress={createTopic}>
          新建话题
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fabRow: { position: 'absolute', right: 16, bottom: 16 },
});

