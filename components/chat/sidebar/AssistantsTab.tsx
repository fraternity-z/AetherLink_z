import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Assistant } from '@/types/assistant';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, List, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { AssistantPickerDialog } from '../dialogs/AssistantPickerDialog';
import { useAssistants } from './hooks/useAssistants';

export function AssistantsTab() {
  const theme = useTheme();
  const { confirm } = useConfirmDialog();
  const { 
    assistants, 
    currentAssistantId, 
    selectAssistant, 
    addAssistant, 
    removeAssistant 
  } = useAssistants();
  
  const [pickerVisible, setPickerVisible] = useState(false);

  // 移除助手确认逻辑
  const handleRemoveAssistant = useCallback((assistant: Assistant) => {
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
            await removeAssistant(assistant.id);
          },
        },
      ],
    });
  }, [confirm, removeAssistant]);

  const assistantListContentStyle = useMemo(() => ({ paddingBottom: 80 }), []);
  const assistantKeyExtractor = useCallback((item: Assistant) => item.id, []);

  const renderAssistantItem: ListRenderItem<Assistant> = useCallback(
    ({ item: assistant }) => {
      const isSelected = assistant.id === currentAssistantId;
      const canRemove = assistant.id !== 'default';

      return (
        <TouchableRipple
          onPress={() => selectAssistant(assistant.id)}
          onLongPress={() => canRemove && handleRemoveAssistant(assistant)}
        >
          <List.Item
            title={assistant.name}
            description={assistant.description}
            left={() => (
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
            style={[
              styles.assistantItem,
              isSelected && [
                styles.assistantItemSelected,
                { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
              ],
            ]}
          />
        </TouchableRipple>
      );
    },
    [currentAssistantId, handleRemoveAssistant, selectAssistant, theme.colors.primary, theme.colors.primaryContainer],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 助手列表 */}
      <FlashList
        data={assistants}
        renderItem={renderAssistantItem}
        keyExtractor={assistantKeyExtractor}
        contentContainerStyle={assistantListContentStyle}
        showsVerticalScrollIndicator
        // @ts-expect-error FlashList 类型定义未包含 estimatedItemSize，但运行时需要配置
        estimatedItemSize={72}
      />

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

      {/* 助手选择对话框 */}
      <AssistantPickerDialog
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onSelect={async (assistant) => {
          await addAssistant(assistant);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  assistantItem: {
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  assistantItemSelected: {
    borderWidth: 2,
    // borderColor 在组件中动态设置为 theme.colors.primary
  },
});