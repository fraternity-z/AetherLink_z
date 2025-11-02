import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Surface, Text, SegmentedButtons, List, TouchableRipple, useTheme, Avatar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, drawerWidth, translateX]);

  const assistants = useMemo(
    () => [
      { id: 'default', title: '默认助手', description: '通用对话与任务处理', icon: 'robot-outline' },
      { id: 'writer', title: '写作助手', description: '创作/润色/改写内容', icon: 'pencil-outline' },
      { id: 'translator', title: '翻译助手', description: '多语言互译与本地化', icon: 'translate' },
    ],
    []
  );
  

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
              <View>
                {assistants.map((a, idx) => (
                  <TouchableRipple key={a.id} onPress={() => console.log('选择助手:', a.id)}>
                    <List.Item
                      title={a.title}
                      description={a.description}
                      left={(props) => <List.Icon {...props} icon={a.icon as any} />}
                    />
                  </TouchableRipple>
                ))}
              </View>
            ) : (
              <View>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                  对话参数设置（占位）
                </Text>
                <List.Item title="Temperature" description="占位" right={() => <Text>0.7</Text>} />
                <List.Item title="Max tokens" description="占位" right={() => <Text>2048</Text>} />
                <List.Item title="System prompt" description="占位" right={() => <Text>编辑</Text>} />
              </View>
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
