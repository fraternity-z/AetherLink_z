import { ThemeColorSpec, ThemePresets, ThemeStyle } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MD3Theme, Surface, Text, useTheme } from 'react-native-paper';

interface ThemeSelectorProps {
  currentTheme: ThemeStyle;
  onThemeChange: (theme: ThemeStyle) => void;
}

const ThemeItem = memo(({
  presetKey,
  preset,
  isSelected,
  theme,
  onPress
}: {
  presetKey: ThemeStyle;
  preset: ThemeColorSpec;
  isSelected: boolean;
  theme: MD3Theme;
  onPress: (key: ThemeStyle) => void;
}) => {
  return (
    <Pressable
      onPress={() => onPress(presetKey)}
      style={styles.itemContainer}
    >
      <Surface
        elevation={isSelected ? 2 : 0}
        style={[
          styles.card,
          {
            borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
            borderWidth: isSelected ? 2 : 1,
            backgroundColor: theme.colors.surface,
          }
        ]}
      >
        {/* 预览区域 */}
        <View style={[styles.previewArea, { backgroundColor: theme.colors.surfaceVariant }]}>
          {/* 模拟卡片/按钮 */}
          <View style={[styles.previewCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.previewHeader, { backgroundColor: preset.primary }]} />
            <View style={styles.previewBody}>
              <View style={[styles.previewLine, { width: '70%', backgroundColor: preset.secondary }]} />
              <View style={[styles.previewLine, { width: '40%', backgroundColor: preset.tertiary }]} />
            </View>
          </View>
          
          {/* 选中的对勾标记 */}
          {isSelected && (
            <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="check" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* 文字区域 */}
        <View style={styles.textArea}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
               <MaterialCommunityIcons
                name={getIconForTheme(presetKey)}
                size={16}
                color={preset.primary}
              />
            </View>
            <Text variant="titleSmall" numberOfLines={1} style={styles.titleText}>
              {preset.label}
            </Text>
          </View>
          <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {preset.description}
          </Text>
        </View>

        {/* 色点预览 */}
        <View style={styles.colorDots}>
          <View style={[styles.dot, { backgroundColor: preset.primary }]} />
          <View style={[styles.dot, { backgroundColor: preset.secondary }]} />
          <View style={[styles.dot, { backgroundColor: preset.tertiary }]} />
        </View>
      </Surface>
    </Pressable>
  );
});

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const theme = useTheme();

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {(Object.keys(ThemePresets) as ThemeStyle[]).map((key) => (
          <ThemeItem
            key={key}
            presetKey={key}
            preset={ThemePresets[key]}
            isSelected={currentTheme === key}
            theme={theme}
            onPress={onThemeChange}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function getIconForTheme(key: ThemeStyle): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (key) {
    case 'default': return 'palette';
    case 'claude': return 'robot-outline'; // Claude 风格
    case 'nature': return 'leaf';
    case 'tech': return 'lightning-bolt';
    case 'soft': return 'heart-outline';
    case 'ocean': return 'waves';
    case 'sunset': return 'weather-sunset';
    case 'slate': return 'coffee';
    case 'horizon': return 'terrain'; // Mountain
    case 'cherry': return 'fruit-cherries';
    default: return 'palette';
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  itemContainer: {
    marginRight: 12,
    width: 160,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 180, // 固定高度，确保对齐
  },
  previewArea: {
    height: 80,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewCard: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  previewHeader: {
    height: 24,
    width: '100%',
  },
  previewBody: {
    padding: 8,
    gap: 6,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textArea: {
    padding: 10,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    marginRight: 6,
  },
  titleText: {
    flex: 1,
    fontWeight: '600',
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
  },
  colorDots: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});