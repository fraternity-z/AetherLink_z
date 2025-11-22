import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Dialog,
  Portal,
  Button,
  RadioButton,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ExportOptions, ThinkingChainMode, ExportProgress } from '@/services/export';
import { DEFAULT_EXPORT_OPTIONS } from '@/services/export';

/**
 * 动画进度条组件
 *
 * 提供平滑的进度过渡和闪光效果
 */
function AnimatedProgressBar({
  progress,
  color
}: {
  progress: number;
  color: string;
}) {
  // 进度动画值
  const progressValue = useSharedValue(0);
  // 闪光动画值
  const shimmerValue = useSharedValue(0);

  // 当进度变化时，平滑过渡
  useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [progress]);

  // 启动闪光动画
  useEffect(() => {
    shimmerValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1, // 无限循环
      false
    );
  }, []);

  // 进度条填充动画样式
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  // 闪光效果动画样式
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-100, 300]
    );
    return {
      transform: [{ translateX }],
      opacity: interpolate(shimmerValue.value, [0, 0.5, 1], [0, 0.6, 0]),
    };
  });

  return (
    <View style={animatedProgressStyles.container}>
      {/* 背景轨道 */}
      <View style={[animatedProgressStyles.track, { backgroundColor: `${color}20` }]}>
        {/* 进度填充 */}
        <Animated.View
          style={[
            animatedProgressStyles.fill,
            { backgroundColor: color },
            progressStyle
          ]}
        >
          {/* 闪光效果 */}
          <Animated.View
            style={[
              animatedProgressStyles.shimmer,
              shimmerStyle
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const animatedProgressStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 10,
    marginBottom: 8,
  },
  track: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },
});

interface TopicExportDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (options: ExportOptions) => void;
  progress?: ExportProgress | null;
  isExporting?: boolean;
}

/**
 * 话题导出配置对话框
 *
 * 允许用户配置导出选项并触发导出
 */
export function TopicExportDialog({
  visible,
  onDismiss,
  onConfirm,
  progress,
  isExporting = false,
}: TopicExportDialogProps) {
  const theme = useTheme();

  // 导出选项状态
  const [includeThinking, setIncludeThinking] = useState<ThinkingChainMode>(
    DEFAULT_EXPORT_OPTIONS.includeThinking
  );
  const [includeMcpTools, setIncludeMcpTools] = useState(
    DEFAULT_EXPORT_OPTIONS.includeMcpTools
  );
  const [includeAttachments, setIncludeAttachments] = useState(
    DEFAULT_EXPORT_OPTIONS.includeAttachments
  );
  const [sanitizeSensitiveData, setSanitizeSensitiveData] = useState(
    DEFAULT_EXPORT_OPTIONS.sanitizeSensitiveData
  );

  const handleConfirm = () => {
    const options: ExportOptions = {
      includeThinking,
      includeMcpTools,
      includeAttachments,
      sanitizeSensitiveData,
    };
    onConfirm(options);
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={isExporting ? undefined : onDismiss}
        dismissable={!isExporting}
        style={styles.dialog}
      >
        <Dialog.Title>导出话题</Dialog.Title>

        <Dialog.Content>
          {isExporting && progress ? (
            // 导出中：显示进度
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{progress.message}</Text>
              <AnimatedProgressBar
                progress={progress.percentage / 100}
                color={theme.colors.primary}
              />
              <Text style={[styles.progressPercentage, { color: theme.colors.primary }]}>
                {progress.percentage}%
              </Text>
            </View>
          ) : (
            // 配置界面
            <ScrollView style={styles.optionsContainer}>
              {/* 思考链导出模式 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>思考链导出模式</Text>
                <RadioButton.Group
                  onValueChange={(value) => setIncludeThinking(value as ThinkingChainMode)}
                  value={includeThinking}
                >
                  <View style={styles.radioItem}>
                    <RadioButton.Item
                      label="完整导出思考过程"
                      value="full"
                      labelStyle={styles.radioLabel}
                    />
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton.Item
                      label="仅导出摘要"
                      value="summary"
                      labelStyle={styles.radioLabel}
                    />
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton.Item
                      label="不导出思考链"
                      value="none"
                      labelStyle={styles.radioLabel}
                    />
                  </View>
                </RadioButton.Group>
              </View>

              {/* MCP 工具调用 */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>包含 MCP 工具调用</Text>
                    <Text style={styles.switchDescription}>
                      导出工具调用的参数和结果
                    </Text>
                  </View>
                  <Switch
                    value={includeMcpTools}
                    onValueChange={setIncludeMcpTools}
                  />
                </View>
              </View>

              {/* 附件信息 */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>包含附件信息</Text>
                    <Text style={styles.switchDescription}>
                      显示附件文件名和类型（不嵌入内容）
                    </Text>
                  </View>
                  <Switch
                    value={includeAttachments}
                    onValueChange={setIncludeAttachments}
                  />
                </View>
              </View>

              {/* 敏感信息脱敏 */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>脱敏敏感数据</Text>
                    <Text style={styles.switchDescription}>
                      自动屏蔽 API Key、Token 等敏感信息
                    </Text>
                  </View>
                  <Switch
                    value={sanitizeSensitiveData}
                    onValueChange={setSanitizeSensitiveData}
                  />
                </View>
              </View>
            </ScrollView>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          {!isExporting && <Button onPress={onDismiss}>取消</Button>}
          {!isExporting && (
            <Button onPress={handleConfirm} mode="contained">
              开始导出
            </Button>
          )}
          {isExporting && (
            <Button onPress={onDismiss} disabled>
              导出中...
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  optionsContainer: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  radioItem: {
    marginLeft: -8,
  },
  radioLabel: {
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    paddingVertical: 16,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
