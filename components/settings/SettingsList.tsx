/**
 * ⚙️ 设置列表组件
 *
 * 功能：
 * - 显示分组的设置选项列表
 * - 参考 AetherLink 的设置菜单结构
 * - Material Design 卡片式列表
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { List, Divider, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

// 设置项数据结构
interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route?: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

// 设置菜单数据（参考 AetherLink）
const SETTINGS_GROUPS: SettingGroup[] = [
  {
    title: '基本设置',
    items: [
      {
        id: 'appearance',
        title: '外观',
        description: '主题、字体大小和语言设置',
        icon: 'palette',
        color: '#6366f1',
        route: '/settings/appearance',
      },
      {
        id: 'behavior',
        title: '行为',
        description: '消息发送和通知设置',
        icon: 'cog',
        color: '#8b5cf6',
      },
    ],
  },
  {
    title: '模型服务',
    items: [
      {
        id: 'default-model',
        title: '配置模型',
        description: '管理AI模型和API密钥',
        icon: 'robot',
        color: '#ec4899',
      },
      {
        id: 'topic-naming',
        title: '话题命名设置',
        description: '配置话题自动命名功能',
        icon: 'tune',
        color: '#4f46e5',
      },
      {
        id: 'web-search',
        title: '网络搜索',
        description: '配置网络搜索和相关服务',
        icon: 'web',
        color: '#3b82f6',
      },
    ],
  },
  {
    title: '其他设置',
    items: [
      {
        id: 'data-settings',
        title: '数据设置',
        description: '管理数据存储和隐私选项',
        icon: 'database',
        color: '#0ea5e9',
      },
      {
        id: 'voice-settings',
        title: '语音功能',
        description: '语音识别和文本转语音设置',
        icon: 'microphone',
        color: '#8b5cf6',
      },
      {
        id: 'about',
        title: '关于我们',
        description: '应用信息和技术支持',
        icon: 'information',
        color: '#64748b',
      },
    ],
  },
];

export function SettingsList() {
  const theme = useTheme();

  const handleItemPress = (item: SettingItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else {
      // TODO: 实现各项设置跳转逻辑
      console.log('打开设置:', item.id);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {SETTINGS_GROUPS.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          <List.Subheader>{group.title}</List.Subheader>
          <List.Section>
            {group.items.map((item, itemIndex) => (
              <React.Fragment key={item.id}>
                <List.Item
                  title={item.title}
                  description={item.description}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={item.icon}
                      color={item.color}
                    />
                  )}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => handleItemPress(item)}
                />
                {itemIndex < group.items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List.Section>
        </View>
      ))}

      {/* TODO 提示 */}
      <View style={styles.todoHint}>
        <List.Item
          title="💡 TODO: 实现各项设置功能"
          titleStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  group: {
    marginBottom: 8,
  },
  todoHint: {
    marginTop: 16,
    opacity: 0.6,
  },
});
