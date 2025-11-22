import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Avatar, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatSettings } from '../dialogs/ChatSettings';
import { AssistantsTab } from './AssistantsTab';
import { SidebarUserProfile } from './SidebarUserProfile';

type TabKey = 'assistants' | 'settings';

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatSidebar({ visible, onClose }: ChatSidebarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.max(280, Math.floor(width * 0.85)));
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const [tab, setTab] = useState<TabKey>('assistants');

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, drawerWidth, translateX]);

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
          <View style={[styles.header, { flexDirection: 'row' }]}> 
            <TouchableRipple onPress={() => setTab('assistants')} borderless style={styles.topTabItem}>
              <View style={styles.topTabInner}>
                <Avatar.Icon size={28} icon="robot" style={{ backgroundColor: 'transparent' }} color={tab === 'assistants' ? theme.colors.primary : theme.colors.onSurface} />
                <Text style={[styles.topTabLabel, { color: tab === 'assistants' ? theme.colors.primary : theme.colors.onSurface }]}>助手</Text>
              </View>
            </TouchableRipple>
            <TouchableRipple onPress={() => setTab('settings')} borderless style={styles.topTabItem}>
              <View style={styles.topTabInner}>
                <Avatar.Icon size={28} icon="cog" style={{ backgroundColor: 'transparent' }} color={tab === 'settings' ? theme.colors.primary : theme.colors.onSurface} />
                <Text style={[styles.topTabLabel, { color: tab === 'settings' ? theme.colors.primary : theme.colors.onSurface }]}>设置</Text>
              </View>
            </TouchableRipple>
          </View>

          {/* 内容 */}
          <View style={[styles.content, { paddingBottom: insets.bottom + 96 }]}>
            {tab === 'assistants' ? (
              <AssistantsTab />
            ) : (
              <ChatSettings />
            )}
          </View>

          {/* 底部浮动卡片：头像 + 设置 */}
          <SidebarUserProfile onClose={onClose} />
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  topTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  topTabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabLabel: {
    fontSize: 16,
    marginTop: 6,
  },
});
