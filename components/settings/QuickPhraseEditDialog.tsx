/**
 * 快捷短语编辑/创建对话框
 *
 * 支持创建新短语和编辑现有短语，提供完整的表单验证和 Emoji 选择功能
 * 样式统一：使用 UnifiedDialog
 */

import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import type { QuickPhrase } from '@/storage/core';
import { logger } from '@/utils/logger';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

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
    <UnifiedDialog
      visible={visible}
      onClose={onDismiss}
      title={isEditMode ? '编辑快捷短语' : '添加快捷短语'}
      icon={isEditMode ? 'pencil' : 'plus'}
      actions={[
        { text: '取消', type: 'cancel', onPress: onDismiss },
        { text: isSubmitting ? '保存中...' : '保存', type: 'primary', onPress: handleSave, disabled: isSubmitting },
      ]}
    >
      <View style={styles.formContainer}>
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
      </View>
    </UnifiedDialog>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    paddingTop: 8,
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
    marginRight: 8,
  },
  emojiText: {
    fontSize: 24,
  },
});
