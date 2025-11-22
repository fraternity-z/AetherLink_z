import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

interface ImageGenerationParamsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  size: '1024x1024' | '1792x1024' | '1024x1792';
  setSize: (size: '1024x1024' | '1792x1024' | '1024x1792') => void;
  quality: 'standard' | 'hd';
  setQuality: (quality: 'standard' | 'hd') => void;
  style: 'vivid' | 'natural';
  setStyle: (style: 'vivid' | 'natural') => void;
  isGenerating: boolean;
  isDallE3: boolean;
}

export function ImageGenerationParams({
  prompt,
  setPrompt,
  size,
  setSize,
  quality,
  setQuality,
  style,
  setStyle,
  isGenerating,
  isDallE3,
}: ImageGenerationParamsProps) {
  const theme = useTheme();

  return (
    <View>
      {/* 提示词输入 */}
      <View style={styles.inputSection}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          描述你想要的图片 *
        </Text>
        <TextInput
          label="提示词"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={5}
          placeholder="例如：一只可爱的橘猫坐在月球上，背景是璀璨的星空，赛博朋克风格..."
          disabled={isGenerating}
          mode="outlined"
          style={styles.textInput}
          maxLength={4000}
          right={
            <TextInput.Affix
              text={`${prompt.length}/4000`}
              textStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            />
          }
        />
      </View>

      {/* DALL-E 3 高级选项 */}
      {isDallE3 && (
        <View style={styles.advancedSection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            高级选项 (DALL-E 3)
          </Text>

          {/* 尺寸选择 */}
          <View style={styles.optionGroup}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              图片尺寸
            </Text>
            <View style={styles.optionButtons}>
              {(['1024x1024', '1792x1024', '1024x1792'] as const).map((s) => (
                <Button
                  key={s}
                  mode={size === s ? 'contained' : 'outlined'}
                  onPress={() => setSize(s)}
                  disabled={isGenerating}
                  compact
                  style={styles.optionButton}
                >
                  {s}
                </Button>
              ))}
            </View>
          </View>

          {/* 质量选择 */}
          <View style={styles.optionGroup}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              图片质量
            </Text>
            <View style={styles.optionButtons}>
              <Button
                mode={quality === 'standard' ? 'contained' : 'outlined'}
                onPress={() => setQuality('standard')}
                disabled={isGenerating}
                compact
                style={styles.optionButton}
              >
                标准
              </Button>
              <Button
                mode={quality === 'hd' ? 'contained' : 'outlined'}
                onPress={() => setQuality('hd')}
                disabled={isGenerating}
                compact
                style={styles.optionButton}
              >
                高清 (HD)
              </Button>
            </View>
          </View>

          {/* 风格选择 */}
          <View style={styles.optionGroup}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              图片风格
            </Text>
            <View style={styles.optionButtons}>
              <Button
                mode={style === 'vivid' ? 'contained' : 'outlined'}
                onPress={() => setStyle('vivid')}
                disabled={isGenerating}
                compact
                style={styles.optionButton}
              >
                鲜艳 (Vivid)
              </Button>
              <Button
                mode={style === 'natural' ? 'contained' : 'outlined'}
                onPress={() => setStyle('natural')}
                disabled={isGenerating}
                compact
                style={styles.optionButton}
              >
                自然 (Natural)
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    minHeight: 120,
  },
  advancedSection: {
    marginBottom: 20,
  },
  optionGroup: {
    marginTop: 16,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: 100,
  },
});