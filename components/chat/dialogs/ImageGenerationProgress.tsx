import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

interface ImageGenerationProgressProps {
  isGenerating: boolean;
  progress: number;
}

export function ImageGenerationProgress({
  isGenerating,
  progress,
}: ImageGenerationProgressProps) {
  const theme = useTheme();

  if (!isGenerating) return null;

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressHeader}>
        <Icon name="creation" size={20} color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginLeft: 8 }}>
          生成中... {progress}%
        </Text>
      </View>
      <ProgressBar
        progress={progress / 100}
        color={theme.colors.primary}
        style={styles.progressBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});