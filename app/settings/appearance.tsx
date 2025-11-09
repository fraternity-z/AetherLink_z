
import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';
import { List, Text, useTheme, Chip, Divider, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { useAppSettings } from '@/components/providers/SettingsProvider';



export default function AppearanceSettings() {
  const theme = useTheme();

  // 状态：主题模式与字体大小
  const { fontScale, setFontScale, themeMode, setThemeMode } = useAppSettings();

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

  return (
    <SettingScreen title="外观设置" description="自定义应用的外观主题和全局字体大小设置">
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
