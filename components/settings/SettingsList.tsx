/**
 * ⚙️ 设置列表组件
 *
 * 功能：
 * - 显示分组的设置选项列表
 * - 参考 AetherLink 的设置菜单结构
 * - Material Design 卡片式列表
 */

import { ScrollView, View } from 'react-native';
import { Text, useTheme, List } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
        route: '/settings/behavior',
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
        route: '/settings/default-model',
      },
      {
        id: 'default-model-settings',
        title: '默认模型设置',
        description: '配置对话、话题命名、翻译等默认模型',
        icon: 'tune',
        color: '#4f46e5',
        route: '/settings/topic-naming',
      },
      {
        id: 'prompt-collections',
        title: '智能体提示词集合',
        description: '浏览和使用常用提示词模板',
        icon: 'lightbulb',
        color: '#60a5fa',
        route: '/settings/prompt-collections',
      },
      {
        id: 'web-search',
        title: '网络搜索',
        description: '配置网络搜索和相关服务',
        icon: 'web',
        color: '#3b82f6',
        route: '/settings/web-search',
      },
      {
        id: 'mcp-server',
        title: 'MCP 服务端',
        description: '高级服务器配置管理',
        icon: 'server',
        color: '#22c55e',
        route: '/settings/mcp-server',
      },
    ],
  },
  {
    title: '快捷方式',
    items: [
      {
        id: 'quick-phrases',
        title: '快捷短语',
        description: '创建常用提示模板',
        icon: 'message-text',
        color: '#f97316',
        route: '/settings/quick-phrases',
      },
    ],
  },
  {
    title: '其他设置',
    items: [
      {
        id: 'workspace',
        title: '工作区管理',
        description: '创建管理帐户文件工作区',
        icon: 'folder-cog',
        color: '#fbbf24',
        route: '/settings/workspace',
      },
      {
        id: 'data-settings',
        title: '数据设置',
        description: '管理数据存储和隐私选项',
        icon: 'database',
        color: '#0ea5e9',
        route: '/settings/data-settings',
      },
      {
        id: 'voice-settings',
        title: '语音功能',
        description: '语音识别和文本转语音设置',
        icon: 'microphone',
        color: '#8b5cf6',
        route: '/settings/voice-settings',
      },
            
      {
        id: 'about',
        title: '关于我们',
        description: '应用信息和技术支持',
        icon: 'information',
        color: '#64748b',
        route: '/settings/about',
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
    }
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingVertical: 12 }}
    >
      {SETTINGS_GROUPS.map((group, groupIndex) => (
        <View key={groupIndex} className="mb-6 px-4">
          {/* 分组标题 */}
          <Text
            variant="labelSmall"
            className="px-2 mb-2 font-medium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {group.title}
          </Text>

          {/* 列表项容器 - 圆角方框包裹 */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            {group.items.map((item, idx) => (
              <List.Item
                key={item.id}
                onPress={() => handleItemPress(item)}
                title={item.title}
                titleStyle={{ fontSize: 16, fontWeight: '500' }}
                description={item.description}
                descriptionStyle={{ fontSize: 13, marginTop: 2 }}
                className="px-4 py-3"
                style={{
                  backgroundColor: 'transparent',
                  borderBottomWidth: idx < group.items.length - 1 ? 0.5 : 0,
                  borderBottomColor: theme.colors.outlineVariant,
                }}
                left={() => (
                  <View className="justify-center mr-3">
                    <Icon
                      name={item.icon as any}
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                )}
                right={() => (
                  <View className="justify-center">
                    <Icon
                      name="chevron-right"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                )}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

