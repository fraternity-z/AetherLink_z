import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
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
import { UnifiedDialog, type UnifiedDialogAction } from '@/components/common/UnifiedDialog';
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
    marginBottom: 12,
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
 * 使用 UnifiedDialog 统一弹窗样式
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

  // 构建操作按钮
  const actions: UnifiedDialogAction[] = isExporting
    ? [] // 导出中不显示按钮
    : [
        {
          text: '取消',
          type: 'cancel',
          onPress: onDismiss,
        },
        {
          text: '开始导出',
          type: 'primary',
          onPress: handleConfirm,
        },
      ];

  return (
    <UnifiedDialog
      visible={visible}
      onClose={isExporting ? () => {} : onDismiss}
      title="导出话题"
      icon="file-export"
      iconColor={theme.colors.primary}
      actions={actions}
      maxHeight="85%"
    >
      {isExporting && progress ? (
        // 导出中：显示进度
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
            {progress.message}
          </Text>
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
        <View style={styles.optionsContainer}>
          {/* 思考链导出模式 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              思考链导出模式
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setIncludeThinking(value as ThinkingChainMode)}
              value={includeThinking}
            >
              <View style={styles.radioItem}>
                <RadioButton.Item
                  label="完整导出思考过程"
                  value="full"
                  labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
                />
              </View>
              <View style={styles.radioItem}>
                <RadioButton.Item
                  label="仅导出摘要"
                  value="summary"
                  labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
                />
              </View>
              <View style={styles.radioItem}>
                <RadioButton.Item
                  label="不导出思考链"
                  value="none"
                  labelStyle={[styles.radioLabel, { color: theme.colors.onSurface }]}
                />
              </View>
            </RadioButton.Group>
          </View>

          {/* MCP 工具调用 */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>
                  包含 MCP 工具调用
                </Text>
                <Text style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}>
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
                <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>
                  包含附件信息
                </Text>
                <Text style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}>
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
                <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>
                  脱敏敏感数据
                </Text>
                <Text style={[styles.switchDescription, { color: theme.colors.onSurfaceVariant }]}>
                  自动屏蔽 API Key、Token 等敏感信息
                </Text>
              </View>
              <Switch
                value={sanitizeSensitiveData}
                onValueChange={setSanitizeSensitiveData}
              />
            </View>
          </View>
        </View>
      )}
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    paddingTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  radioItem: {
    marginLeft: -16,
  },
  radioLabel: {
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
  },
  progressContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
