/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 两层结构设计：上层输入框 + 下层工具按钮
 * - 圆角方框容器
 * - 完全按照设计图样式实现
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

export function ChatInput() {
  const theme = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;

    // TODO: 实现消息发送逻辑
    console.log('发送消息:', message);

    // 清空输入框
    setMessage('');
  };

  const handleAttachment = () => {
    // TODO: 实现附件/功能菜单逻辑
    console.log('打开功能菜单');
  };

  const handleVoice = () => {
    // TODO: 实现语音输入逻辑
    console.log('打开语音输入');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.outerContainer}>
        {/* 圆角悬浮方框容器 */}
        <View style={[styles.inputContainer, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          shadowColor: '#000',
        }]}>
          {/* 上层：输入框 */}
          <RNTextInput
            placeholder="和助手说点什么… (Ctrl+Enter 展开)"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            style={[styles.textInput, { color: theme.colors.onSurface }]}
          />

          {/* 下层：工具按钮行 */}
          <View style={styles.toolbarRow}>
            {/* 左侧工具按钮组 */}
            <View style={styles.leftTools}>
              <IconButton
                icon="paperclip"
                size={20}
                onPress={handleAttachment}
                style={styles.toolButton}
              />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => console.log('更多功能')}
                style={styles.toolButton}
              />
            </View>

            {/* 右侧发送按钮组 */}
            <View style={styles.rightTools}>
              <IconButton
                icon="microphone"
                size={20}
                onPress={handleVoice}
                style={styles.toolButton}
              />
              <IconButton
                icon="send"
                size={20}
                iconColor={message.trim() ? theme.colors.primary : theme.colors.onSurfaceDisabled}
                onPress={handleSend}
                disabled={!message.trim()}
                style={styles.toolButton}
              />
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    // 悬浮阴影效果
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textInput: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 15,
    lineHeight: 20,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    minHeight: 40,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButton: {
    margin: 0,
    width: 36,
    height: 36,
  },
});
