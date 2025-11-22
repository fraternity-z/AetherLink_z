
import { useAppSettings } from '@/components/providers/SettingsProvider';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { useBackgroundSettings } from '@/hooks/use-background-settings';
import { selectBackgroundImage } from '@/services/media/ImagePicker';
import {
  checkStorageSpace,
  deleteBackgroundImage,
  saveBackgroundImage,
} from '@/services/media/ImageStorage';
import { logger } from '@/utils/logger';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Divider, List, Surface, Switch, Text, useTheme } from 'react-native-paper';



export default function AppearanceSettings() {
  const theme = useTheme();

  // 状态：主题模式与字体大小
  const { fontScale, setFontScale, themeMode, setThemeMode, themeStyle, setThemeStyle } = useAppSettings();

  // 状态：背景设置
  const {
    settings: backgroundSettings,
    updateImagePath,
    updateOpacity,
    toggleEnabled,
    reset: resetBackground,
    isLoading: isBackgroundLoading,
  } = useBackgroundSettings();
  const [isSavingBackground, setIsSavingBackground] = useState(false);

  // 下拉菜单：显示状态与定位
  const [menuVisible, setMenuVisible] = useState(false);
  const anchorRef = useRef<View | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const openMenu = () => {
    // 动态测量锚点位置，确保下拉紧贴输入框
    anchorRef.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
      setMenuPos({ top: y + height + 6, left: x, width });
      setMenuVisible(true);
    });
    // 若测量失败，仍然打开，使用默认样式回退
    if (!anchorRef.current) setMenuVisible(true);
  };

  const saveFontScale = async (v: number) => {
    const rounded = Math.round(v);
    await setFontScale(rounded);
  };

  const fontScaleLabel = useMemo(() => {
    if (fontScale === 16) return `${fontScale}px（标准）`;
    return `${fontScale}px`;
  }, [fontScale]);

  // 主题模式标签映射
  const themeModeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      system: '跟随系统',
      light: '浅色',
      dark: '深色',
    };
    return labels[themeMode] || '跟随系统';
  }, [themeMode]);

  /**
   * 处理图片选择
   */
  const handleSelectImage = async () => {
    try {
      // 1. 检查存储空间
      const hasSpace = await checkStorageSpace(10);
      if (!hasSpace) {
        Alert.alert('存储空间不足', '请清理设备存储后重试（建议保留至少 50MB 空间）');
        return;
      }

      // 2. 打开图片选择器
      const uri = await selectBackgroundImage();
      if (!uri) {
        return;
      }

      // 3. 保存图片
      setIsSavingBackground(true);
      const newPath = await saveBackgroundImage(uri);
      await updateImagePath(newPath);

      // 4. 自动启用背景
      if (!backgroundSettings.enabled) {
        await toggleEnabled(true);
      }

      Alert.alert('成功', '背景图片已更新');

    } catch (error) {
      logger.error('Failed to save background image', { error });
      Alert.alert('保存失败', '无法保存背景图片，请稍后重试');
    } finally {
      setIsSavingBackground(false);
    }
  };

  /**
   * 处理不透明度变化
   */
  const handleOpacityChange = async (value: number) => {
    try {
      await updateOpacity(value);
    } catch (error) {
      logger.error('Failed to update opacity', { error });
    }
  };

  /**
   * 处理重置背景
   */
  const handleResetBackground = async () => {
    Alert.alert(
      '重置背景',
      '确定要恢复默认背景吗？此操作将删除当前背景图片。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: async () => {
            try {
              // 删除图片文件
              if (backgroundSettings.imagePath) {
                await deleteBackgroundImage(backgroundSettings.imagePath);
              }

              // 重置设置
              await resetBackground();

              Alert.alert('成功', '已恢复默认背景');
            } catch (error) {
              logger.error('Failed to reset background', { error });
              Alert.alert('重置失败', '无法重置背景，请稍后重试');
            }
          },
        },
      ]
    );
  };

  return (
    <SettingScreen title="外观设置" description="自定义应用的外观主题和全局字体大小设置">
      {/* 主题风格 */}
      <List.Section style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>主题风格</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          选择您喜欢的界面设计风格，每种风格都有独特的色彩搭配和视觉效果
        </Text>
        <ThemeSelector
          currentTheme={themeStyle}
          onThemeChange={setThemeStyle}
        />
        <View style={[styles.tip, { backgroundColor: theme.colors.surfaceVariant, marginTop: 12 }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            💡 提示：主题风格会影响整个应用的色彩搭配、按钮样式和视觉效果。您可以随时在设置中更改主题风格，更改会立即生效。
          </Text>
        </View>
      </List.Section>

      {/* 主题模式 */}
      <List.Section style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>主题模式</Text>

        {menuVisible && (
          <Modal
            transparent
            visible={menuVisible}
            onRequestClose={() => setMenuVisible(false)}
            animationType="none"
          >
            <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
              <View style={styles.modalOverlay}>
                <View
                  style={[
                    styles.menuContainer,
                    menuPos.top
                      ? { position: 'absolute', top: menuPos.top, left: menuPos.left, width: menuPos.width, paddingHorizontal: 0 }
                      : null,
                  ]}
                >
                  <Surface
                    elevation={5}
                    style={[
                      styles.dropdownMenu,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setThemeMode('system');
                        setMenuVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        themeMode === 'system' && styles.menuItemSelected,
                        { backgroundColor: pressed ? theme.colors.surfaceVariant : undefined },
                      ]}
                    >
                      <View style={styles.menuItemContent}>
                        {themeMode === 'system' ? (
                          <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
                        ) : (
                          <View style={{ width: 18 }} />
                        )}
                        <Text variant="bodyLarge" style={[styles.menuItemText, { marginLeft: 12 }]}>跟随系统</Text>
                      </View>
                    </Pressable>
                    <Divider />
                    <Pressable
                      onPress={() => {
                        setThemeMode('light');
                        setMenuVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        themeMode === 'light' && styles.menuItemSelected,
                        { backgroundColor: pressed ? theme.colors.surfaceVariant : undefined },
                      ]}
                    >
                      <View style={styles.menuItemContent}>
                        {themeMode === 'light' ? (
                          <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
                        ) : (
                          <View style={{ width: 18 }} />
                        )}
                        <Text variant="bodyLarge" style={[styles.menuItemText, { marginLeft: 12 }]}>浅色</Text>
                      </View>
                    </Pressable>
                    <Divider />
                    <Pressable
                      onPress={() => {
                        setThemeMode('dark');
                        setMenuVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        themeMode === 'dark' && styles.menuItemSelected,
                        { backgroundColor: pressed ? theme.colors.surfaceVariant : undefined },
                      ]}
                    >
                      <View style={styles.menuItemContent}>
                        {themeMode === 'dark' ? (
                          <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
                        ) : (
                          <View style={{ width: 18 }} />
                        )}
                        <Text variant="bodyLarge" style={[styles.menuItemText, { marginLeft: 12 }]}>深色</Text>
                      </View>
                    </Pressable>
                  </Surface>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        <View ref={anchorRef} collapsable={false}>
          <Pressable
            onPress={openMenu}
            style={[
              styles.dropdownButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: menuVisible ? theme.colors.primary : theme.colors.outline,
              },
            ]}
          >
            <View style={styles.dropdownContent}>
              <Text variant="bodyLarge">{themeModeLabel}</Text>
              <MaterialCommunityIcons
                name={menuVisible ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </Pressable>
        </View>

        <View style={[styles.tip, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            提示：选择浅色/深色或跟随系统，切换后立即生效。
          </Text>
        </View>
      </List.Section>

      {/* 全局字体大小 */}
      <List.Section style={styles.section}>
        <View style={[styles.rowBetween, { paddingHorizontal: 4, marginBottom: 6 }]}>
          <Text variant="titleSmall" style={styles.sectionTitle}>全局字体大小</Text>
          <Chip compact selected>{fontScaleLabel}</Chip>
        </View>
        <Slider
          value={fontScale}
          onValueChange={saveFontScale}
          minimumValue={12}
          maximumValue={20}
          step={1}
          style={{ width: '100%', height: 40 }}
          minimumTrackTintColor={theme.colors.primary}
        />
        <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>极小</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>小</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>标准</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>大</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>极大</Text>
        </View>
      </List.Section>

      {/* 聊天背景 */}
      <List.Section style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>聊天背景</Text>

        {isBackgroundLoading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* 启用开关 */}
            <View style={[styles.rowBetween, { marginBottom: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">自定义背景</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  为聊天页面设置个性化背景图片
                </Text>
              </View>
              <Switch
                value={backgroundSettings.enabled}
                onValueChange={toggleEnabled}
                disabled={!backgroundSettings.imagePath}
              />
            </View>

            {/* 图片选择按钮 */}
            <Button
              mode="outlined"
              icon="image-plus"
              onPress={handleSelectImage}
              loading={isSavingBackground}
              disabled={isSavingBackground}
              style={{ marginBottom: 12 }}
            >
              {backgroundSettings.imagePath ? '更换背景图片' : '选择背景图片'}
            </Button>


            {/* 不透明度滑块 */}
            {backgroundSettings.imagePath && (
              <>
                <View style={[styles.rowBetween, { paddingHorizontal: 4, marginTop: 12, marginBottom: 6 }]}>
                  <Text variant="titleSmall">不透明度</Text>
                  <Chip compact selected>
                    {Math.round(backgroundSettings.opacity * 100)}%
                  </Chip>
                </View>
                <Slider
                  value={backgroundSettings.opacity}
                  onValueChange={handleOpacityChange}
                  minimumValue={0.1}
                  maximumValue={1.0}
                  step={0.05}
                  style={{ width: '100%', height: 40 }}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                  thumbTintColor={theme.colors.primary}
                />
                <View style={[styles.rowBetween, { paddingHorizontal: 4, marginBottom: 12 }]}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>透明</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>不透明</Text>
                </View>

                {/* 重置按钮 */}
                <Button
                  mode="text"
                  icon="restore"
                  onPress={handleResetBackground}
                >
                  恢复默认背景
                </Button>
              </>
            )}

            {/* 使用提示 */}
            <View style={[styles.tip, { backgroundColor: theme.colors.surfaceVariant, marginTop: 12 }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                💡 建议选择色彩柔和的图片，避免影响聊天内容的可读性
              </Text>
            </View>
          </>
        )}
      </List.Section>
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  sectionTitle: { marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  dropdownButton: {
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 4,
    marginTop: 4,
    justifyContent: 'center',
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  menuContainer: {
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    width: '100%',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    minHeight: 56, // 更宽松行高
    justifyContent: 'center',
  },
  menuItemSelected: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    lineHeight: 36,
  },
});
