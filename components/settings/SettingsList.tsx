/**
 * ⚙️ 设置列表组件
 *
 * 功能：
 * - 显示分组的设置选项列表
 * - 参考 AetherLink 的设置菜单结构
 * - Material Design 卡片式列表
 */

import React from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text, Avatar, TouchableRipple, useTheme } from 'react-native-paper';
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
        id: 'prompt-collections',
        title: '智能体提示词集合',
        description: '浏览和使用常用提示词模板',
        icon: 'lightbulb',
        color: '#60a5fa',
      },
      {
        id: 'web-search',
        title: '网络搜索',
        description: '配置网络搜索和相关服务',
        icon: 'web',
        color: '#3b82f6',
      },
      {
        id: 'model-combine',
        title: '模型组合',
        description: '创建和管理多模型组合',
        icon: 'merge',
        color: '#f472b6',
      },
      {
        id: 'mcp-server',
        title: 'MCP 服务端',
        description: '高级服务器配置管理',
        icon: 'server',
        color: '#22c55e',
      },
    ],
  },
  {
    title: '快捷方式',
    items: [
      {
        id: 'quick-helper',
        title: '快捷助手',
        description: '自定义快捷动作快捷键',
        icon: 'flash',
        color: '#f59e0b',
      },
      {
        id: 'quick-phrases',
        title: '快捷短语',
        description: '创建常用提示模板',
        icon: 'message-text',
        color: '#f97316',
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
      },
      {
        id: 'knowledge',
        title: '知识库设置',
        description: '管理知识库配置和嵌入模型',
        icon: 'database-search',
        color: '#34d399',
      },
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
        id: 'modules',
        title: '功能模块',
        description: '启用或禁用应用功能',
        icon: 'puzzle',
        color: '#a78bfa',
      },
      {
        id: 'notion',
        title: 'Notion 集成',
        description: '配置 Notion 数据库导出设置',
        icon: 'notebook-outline',
        color: '#60a5fa',
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

// 将十六进制颜色转为带透明度的 rgba
function withOpacity(hex: string, opacity = 0.12) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function SettingsList() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // 响应式列数：手机1列、平板2列、桌面3列
  const columns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);

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
      style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}
      contentContainerStyle={[styles.contentContainer, { paddingHorizontal: horizontalPadding }]}
    >
      {SETTINGS_GROUPS.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          <Text
            variant="labelLarge"
            style={{
              marginBottom: 10,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {group.title}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {group.items.map((item, idx) => {
              const isLastInRow = (idx + 1) % columns === 0;
              return (
                <View
                  key={item.id}
                  style={{
                    width: cardWidth,
                    marginRight: isLastInRow ? 0 : gap,
                    marginBottom: gap,
                  }}
                >
                  <TouchableRipple
                    borderless={false}
                    style={{ borderRadius: 14 }}
                    onPress={() => handleItemPress(item)}
                  >
                    <View
                      style={{
                        borderRadius: 14,
                        backgroundColor: theme.colors.surface,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.dark ? '#2A2A2A' : '#E5E7EB',
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ marginRight: 12 }}>
                        <Avatar.Icon
                          size={36}
                          icon={item.icon as any}
                          color={item.color}
                          style={{ backgroundColor: withOpacity(item.color, 0.15) }}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                          {item.title}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                      </View>

                      <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>{'>'}</Text>
                      </View>
                    </View>
                  </TouchableRipple>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* TODO 提示 */}
      <View style={styles.todoHint}>
        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
          💡 TODO: 实现各项设置功能
        </Text>
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
    marginBottom: 16,
  },
  todoHint: {
    marginTop: 16,
    opacity: 0.6,
  },
});
