/**
 * 快捷短语编辑/创建对话框
 *
 * 支持创建新短语和编辑现有短语，提供完整的表单验证和 Emoji 选择功能
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useTheme,
  Text,
  TextInput,
  Portal,
  Modal,
  IconButton,
  Button,
  HelperText,
} from 'react-native-paper';
import type { QuickPhrase } from '@/storage/core';
import { logger } from '@/utils/logger';

// 常用 Emoji 列表
const COMMON_EMOJIS = [
  '😀', '😂', '❤️', '👍', '🎉', '💡', '📅', '✨',
  '🚀', '💪', '🔥', '⚡', '✅', '📝', '💬', '🎯',
  '🌟', '🎊', '🙌', '👏', '💯', '🎁', '🌈', '☀️',
];

interface QuickPhraseEditDialogProps {
  visible: boolean;
  phrase?: QuickPhrase | null;  // 编辑模式传入现有短语，创建模式传 null
  onDismiss: () => void;
  onSave: (data: {
    title: string;
    content: string;
    icon?: string | null;
  }) => Promise<void>;
}

export function QuickPhraseEditDialog({
  visible,
  phrase,
  onDismiss,
  onSave,
}: QuickPhraseEditDialogProps) {
  const theme = useTheme();
  const titleInputRef = useRef<RNTextInput>(null);

  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // UI 状态
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!phrase;
  const maxContentLength = 500;
  const contentLength = content.length;
  const isContentTooLong = contentLength > maxContentLength;

  // 初始化表单
  useEffect(() => {
    if (visible) {
      if (phrase) {
        // 编辑模式：填充现有数据
        setTitle(phrase.title);
        setContent(phrase.content);
        setSelectedIcon(phrase.icon || null);
      } else {
        // 创建模式：清空表单
        setTitle('');
        setContent('');
        setSelectedIcon(null);
      }
      setTitleError('');
      setContentError('');
      setIsSubmitting(false);

      // 延迟聚焦
      setTimeout(() => titleInputRef.current?.focus(), 250);
    }
  }, [visible, phrase]);

  /**
   * 表单验证
   */
  const validate = (): boolean => {
    let isValid = true;

    // 验证标题
    if (!title.trim()) {
      setTitleError('标题不能为空');
      isValid = false;
    } else {
      setTitleError('');
    }

    // 验证内容
    if (!content.trim()) {
      setContentError('内容不能为空');
      isValid = false;
    } else if (isContentTooLong) {
      setContentError(`内容超出限制 (${contentLength}/${maxContentLength})`);
      isValid = false;
    } else {
      setContentError('');
    }

    return isValid;
  };

  /**
   * 处理保存
   */
  const handleSave = async () => {
    if (isSubmitting) return;

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        content: content.trim(),
        icon: selectedIcon,
      });
      onDismiss();
    } catch (error) {
      // 错误由父组件处理
      logger.error('[QuickPhraseEditDialog] 保存失败', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 渲染 Emoji 选择器
   */
  const renderEmojiPicker = () => (
    <View style={styles.emojiContainer}>
      <Text
        style={[
          styles.sectionLabel,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        🎨 图标（可选）
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emojiScroll}
      >
        {COMMON_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            style={[
              styles.emojiButton,
              {
                borderColor:
                  selectedIcon === emoji
                    ? theme.colors.primary
                    : 'transparent',
                backgroundColor:
                  selectedIcon === emoji
                    ? `${theme.colors.primary}15`
                    : theme.colors.surfaceVariant,
              },
            ]}
            onPress={() =>
              setSelectedIcon(selectedIcon === emoji ? null : emoji)
            }
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 头部 */}
            <View style={styles.header}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                {isEditMode ? '✏️ 编辑快捷短语' : '✨ 添加快捷短语'}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
                iconColor={theme.colors.onSurfaceVariant}
              />
            </View>

            {/* 标题输入框 */}
            <View style={styles.formSection}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                📝 标题（必填）
              </Text>
              <TextInput
                ref={titleInputRef}
                mode="outlined"
                placeholder="输入短语标题..."
                value={title}
                onChangeText={setTitle}
                error={!!titleError}
                style={styles.input}
                outlineStyle={{ borderRadius: 12 }}
                activeOutlineColor={theme.colors.primary}
              />
              {!!titleError && (
                <HelperText type="error" visible={!!titleError}>
                  {titleError}
                </HelperText>
              )}
            </View>

            {/* 内容输入框 */}
            <View style={styles.formSection}>
              <View style={styles.contentHeader}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  💬 内容（必填）
                </Text>
                <Text
                  style={[
                    styles.charCount,
                    {
                      color: isContentTooLong
                        ? theme.colors.error
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {contentLength}/{maxContentLength}
                </Text>
              </View>
              <TextInput
                mode="outlined"
                placeholder="输入短语内容..."
                value={content}
                onChangeText={setContent}
                error={!!contentError}
                multiline
                numberOfLines={6}
                style={[styles.input, styles.inputMultiline]}
                outlineStyle={{ borderRadius: 12 }}
                activeOutlineColor={theme.colors.primary}
              />
              {!!contentError && (
                <HelperText type="error" visible={!!contentError}>
                  {contentError}
                </HelperText>
              )}
            </View>

            {/* Emoji 选择器 */}
            {renderEmojiPicker()}
          </ScrollView>

          {/* 底部按钮 */}
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.colors.outlineVariant },
            ]}
          >
            <Button
              mode="outlined"
              onPress={onDismiss}
              disabled={isSubmitting}
              style={styles.button}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.button}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    marginHorizontal: 20,
    marginVertical: 60,
    borderRadius: 24,
    minHeight: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  keyboardView: {
    minHeight: 400,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  inputMultiline: {
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
  },
  emojiContainer: {
    marginBottom: 20,
  },
  emojiScroll: {
    paddingVertical: 8,
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  button: {
    minWidth: 100,
  },
});
