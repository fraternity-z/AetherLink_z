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

import React, { useState, useEffect } from 'react';
import {
    View,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useTheme, Text, TextInput, Button, ProgressBar, Portal, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useImageGeneration } from '@/hooks/use-image-generation';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Provider } from '@/services/ai/AiClient';

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
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');

  const { generateImage, isGenerating, progress, error } = useImageGeneration({
    conversationId: conversationId || undefined,
    provider,
    model,
  });

  // 打开/关闭动画
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [opacityAnim, scaleAnim, visible]);

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

                    {/* 生成进度 */}
                    {isGenerating && (
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
                    )}

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
