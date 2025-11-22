import { UserAvatar } from '@/components/common/UserAvatar';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Menu, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SidebarUserProfileProps {
  onClose: () => void;
}

export function SidebarUserProfile({ onClose }: SidebarUserProfileProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirmDialog();
  
  const { avatarUri, pickImage, removeAvatar } = useUserProfile();
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  // 半透明背景：浅色提高不透明度以便在白底可见，深色保持低透明
  const translucentBg = theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)';

  const handleSettingsPress = () => {
    onClose();
    // 稍微延迟跳转，让侧边栏先关闭
    setTimeout(() => {
      router.push('/settings');
    }, 50);
  };

  return (
    <Surface
      elevation={0}
      style={[
        styles.bottomCard,
        {
          backgroundColor: translucentBg,
          bottom: Math.max(insets.bottom, 8) + 12,
        },
      ]}
      pointerEvents="auto"
    >
      <View
        style={styles.bottomRow}
        pointerEvents="auto"
        onStartShouldSetResponder={() => true}
      >
        {/* 左侧资料区：用户头像和资料 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* 头像菜单 */}
          <Menu
            visible={avatarMenuVisible}
            onDismiss={() => setAvatarMenuVisible(false)}
            anchor={
              <Pressable
                onPress={() => setAvatarMenuVisible(true)}
                style={{ paddingVertical: 4 }}
                android_ripple={{ borderless: true, radius: 24 }}
              >
                <UserAvatar size={40} uri={avatarUri} />
              </Pressable>
            }
          >
            <Menu.Item
              leadingIcon="image"
              onPress={async () => {
                setAvatarMenuVisible(false);
                await pickImage();
              }}
              title="更换头像"
            />
            {avatarUri && (
              <Menu.Item
                leadingIcon="refresh"
                onPress={() => {
                  setAvatarMenuVisible(false);
                  confirm({
                    title: '移除头像',
                    message: '确定要移除自定义头像吗？将恢复为默认头像。',
                    buttons: [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '移除',
                        style: 'destructive',
                        onPress: async () => {
                          await removeAvatar();
                        },
                      },
                    ],
                  });
                }}
                title="移除头像"
              />
            )}
          </Menu>

          {/* 用户信息 */}
          <Pressable
            onPress={() => {}}
            style={{ marginLeft: 10, flex: 1 }}
            android_ripple={undefined}
          >
            <Text variant="labelLarge">访客</Text>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>guest@example.com</Text>
          </Pressable>
        </View>

        <View pointerEvents="auto">
          <IconButton
            icon="cog"
            size={22}
            onPress={handleSettingsPress}
            style={{ margin: 0 }}
          />
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  bottomCard: {
    position: 'absolute',
    left: 12,
    right: 12,
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