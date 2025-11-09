import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Text, useTheme, Chip, SegmentedButtons } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { useAppSettings } from '@/components/providers/SettingsProvider';



export default function AppearanceSettings() {
  const theme = useTheme();

  // 状态：主题模式与字体大小
  const { fontScale, setFontScale, themeMode, setThemeMode } = useAppSettings();

  const saveFontScale = async (v: number) => {
    const rounded = Math.round(v);
    await setFontScale(rounded);
  };

  const fontScaleLabel = useMemo(() => {
    if (fontScale === 16) return `${fontScale}px（标准）`;
    return `${fontScale}px`;
  }, [fontScale]);

  return (
    <SettingScreen title="外观设置" description="自定义应用的外观主题和全局字体大小设置">
      {/* 主题风格 */}
      <List.Section style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>主题模式</Text>
        <SegmentedButtons
          value={themeMode}
          onValueChange={(v) => setThemeMode(v as any)}
          buttons={[
            { value: 'system', label: '跟随系统' },
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
          ]}
          style={{ marginHorizontal: 4, marginTop: 4 }}
        />
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
});