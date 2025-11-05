import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Text, useTheme, Chip } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { ThemeStyleCard, ThemePreview } from '@/components/settings/ThemeStyleCard';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

// 主题风格枚举
export type ThemeStyle =
  | 'default'
  | 'claude'
  | 'business'
  | 'lively'
  | 'nature'
  | 'ocean'
  | 'sunset'
  | 'mono'
  | 'cyberpunk';

const STYLE_PRESETS: { id: ThemeStyle; title: string; preview: ThemePreview }[] = [
  { id: 'default', title: '默认主题', preview: { header: '#6750A4', track: '#A78BFA', body: '#DDE1F0', accents: ['#6750A4', '#4F46E5', '#06B6D4'], icon: 'palette' } },
  { id: 'claude', title: 'Claude 风格', preview: { header: '#FFB020', track: '#FFEDD5', body: '#E5E7EB', accents: ['#FFB020', '#10B981', '#EF4444'], icon: 'robot' } },
  { id: 'business', title: '炫酷风格', preview: { header: '#1F2937', track: '#9CA3AF', body: '#E5E7EB', accents: ['#111827', '#6B7280', '#9CA3AF'], icon: 'briefcase-outline' } },
  { id: 'lively', title: '活力风格', preview: { header: '#60A5FA', track: '#93C5FD', body: '#E0F2FE', accents: ['#F97316', '#60A5FA', '#22D3EE'], icon: 'fire' } },
  { id: 'nature', title: '自然风格', preview: { header: '#4D7C0F', track: '#86EFAC', body: '#DCFCE7', accents: ['#84CC16', '#16A34A', '#10B981'], icon: 'leaf' } },
  { id: 'ocean', title: '海洋风格', preview: { header: '#2563EB', track: '#93C5FD', body: '#DBEAFE', accents: ['#2563EB', '#38BDF8', '#60A5FA'], icon: 'waves' } },
  { id: 'sunset', title: '日落风格', preview: { header: '#FB923C', track: '#FED7AA', body: '#FFF7ED', accents: ['#EA580C', '#F59E0B', '#F97316'], icon: 'white-balance-sunny' } },
  { id: 'mono', title: '单色风格', preview: { header: '#111827', track: '#6B7280', body: '#E5E7EB', accents: ['#111827', '#4B5563', '#9CA3AF'], icon: 'square-outline' } },
  { id: 'cyberpunk', title: '赛博朋克', preview: { header: '#06B6D4', track: '#D946EF', body: '#F5F3FF', accents: ['#22D3EE', '#D946EF', '#8B5CF6'], icon: 'flash-outline' } },
];

export default function AppearanceSettings() {
  const theme = useTheme();
  const sr = SettingsRepository();

  // 状态：主题风格、字体大小
  const [styleId, setStyleId] = useState<ThemeStyle>('default');
  const [fontScale, setFontScale] = useState<number>(16);

  // 加载持久化设置（仅保留风格与字体大小）
  useEffect(() => {
    (async () => {
      const s = await sr.get<ThemeStyle>(SettingKey.ThemeStyle);
      const fs = await sr.get<number>(SettingKey.FontScale);
      if (s) setStyleId(s);
      if (fs) setFontScale(fs);
    })();
  }, []);

  const saveStyle = async (id: ThemeStyle) => {
    setStyleId(id);
    await sr.set(SettingKey.ThemeStyle, id);
  };

  const saveFontScale = async (v: number) => {
    const rounded = Math.round(v);
    setFontScale(rounded);
    await sr.set(SettingKey.FontScale, rounded);
  };

  const fontScaleLabel = useMemo(() => {
    if (fontScale === 16) return `${fontScale}px（标准）`;
    return `${fontScale}px`;
  }, [fontScale]);

  return (
    <SettingScreen title="外观设置" description="自定义应用的外观主题和全局字体大小设置">
      {/* 主题风格 */}
      <List.Section style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>主题风格</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 4 }}>
          {STYLE_PRESETS.map(item => (
            <ThemeStyleCard
              key={item.id}
              title={item.title}
              preview={item.preview}
              selected={styleId === item.id}
              onPress={() => saveStyle(item.id)}
            />
          ))}
        </ScrollView>
        <View style={[styles.tip, { backgroundColor: theme.colors.surfaceVariant }]}> 
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            提示：主题风格会影响整个应用的配色搭配。切换后可立即生效。
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