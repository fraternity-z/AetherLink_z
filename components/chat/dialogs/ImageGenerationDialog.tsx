import { logger } from '@/utils/logger';
/**
 * ⚡ AI 图片生成输入对话框组件
 *
 * 功能：
 * - 用户输入图片描述提示词
 * - 显示生成进度和加载状态
 * - 处理错误提示
 * - 支持自定义图片参数（尺寸、质量、风格）
 */

import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useDialogAnimation } from '@/hooks/use-dialog-animation';
import { useImageGeneration } from '@/hooks/use-image-generation';
import type { Provider } from '@/services/ai/AiClient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Button, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { ImageGenerationParams } from './ImageGenerationParams';
import { ImageGenerationProgress } from './ImageGenerationProgress';

interface ImageGenerationDialogProps {
  visible: boolean;
  onDismiss: () => void;
  conversationId: string | null;
  provider: Provider;
  model: string;
}

export function ImageGenerationDialog({
  visible,
  onDismiss,
  conversationId,
  provider,
  model,
}: ImageGenerationDialogProps) {
  const theme = useTheme();
  const { alert } = useConfirmDialog();
  const { scaleAnim, opacityAnim } = useDialogAnimation(visible);

  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');

  const { generateImage, isGenerating, progress, error } = useImageGeneration({
    conversationId: conversationId || undefined,
    provider,
    model,
  });

  // 重置状态
  const handleDismiss = () => {
    if (isGenerating) {
      alert('提示', '图片正在生成中，请稍候...');
      return;
    }
    setPrompt('');
    setSize('1024x1024');
    setQuality('standard');
    setStyle('vivid');
    onDismiss();
  };

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('提示', '请输入图片描述提示词');
      return;
    }

    if (!conversationId) {
      alert('提示', '请先创建或选择对话');
      return;
    }

    try {
      await generateImage({
        prompt,
        size,
        quality,
        style,
        n: 1,
      });

      // 成功后清空输入并关闭对话框
      setPrompt('');
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch (err: any) {
      // 错误已在 Hook 中处理并设置到 error 状态
      logger.error('[ImageGenerationDialog] 生成失败', err);
    }
  };

  // DALL-E 3 特殊提示
  const isDallE3 = model.toLowerCase().includes('dall-e-3');

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleDismiss}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={handleDismiss}>
            <Animated.View
              style={[
                styles.overlay,
                {
                  opacity: opacityAnim,
                },
              ]}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.dialogContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  {/* 头部 */}
                  <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                      <Icon name="image-plus" size={28} color={theme.colors.primary} />
                      <Text
                        variant="headlineSmall"
                        style={[styles.headerTitle, { color: theme.colors.onSurface }]}
                      >
                        AI 图片生成
                      </Text>
                    </View>
                    <IconButton
                      icon="close"
                      size={24}
                      onPress={handleDismiss}
                      disabled={isGenerating}
                    />
                  </View>

                  <ScrollView
                    style={styles.contentScrollView}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* 模型信息 */}
                    <View style={[styles.modelInfo, { backgroundColor: `${theme.colors.primary}15` }]}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        当前模型：<Text style={{ fontWeight: '600', color: theme.colors.primary }}>{model}</Text>
                      </Text>
                    </View>

                    {/* 参数设置组件 */}
                    <ImageGenerationParams
                      prompt={prompt}
                      setPrompt={setPrompt}
                      size={size}
                      setSize={setSize}
                      quality={quality}
                      setQuality={setQuality}
                      style={style}
                      setStyle={setStyle}
                      isGenerating={isGenerating}
                      isDallE3={isDallE3}
                    />

                    {/* 生成进度组件 */}
                    <ImageGenerationProgress
                      isGenerating={isGenerating}
                      progress={progress}
                    />

                    {/* 错误提示 */}
                    {error && !isGenerating && (
                      <View style={[styles.errorSection, { backgroundColor: `${theme.colors.error}15` }]}>
                        <Icon name="alert-circle" size={20} color={theme.colors.error} />
                        <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                          {error.getUserMessage()}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* 底部按钮 */}
                  <View style={styles.footer}>
                    <Button
                      mode="outlined"
                      onPress={handleDismiss}
                      disabled={isGenerating}
                      style={styles.footerButton}
                    >
                      取消
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      loading={isGenerating}
                      icon="image-plus"
                      style={styles.footerButton}
                    >
                      生成图片
                    </Button>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontWeight: '700',
  },
  contentScrollView: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modelInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  footerButton: {
    flex: 1,
  },
});
