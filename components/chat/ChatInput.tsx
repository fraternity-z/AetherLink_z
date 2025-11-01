/**
 * ⌨️ 聊天输入框组件
 *
 * 功能：
 * - 多行文本输入
 * - 附件上传按钮
 * - 发送消息按钮
 * - Material Design 风格
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, useTheme } from 'react-native-paper';

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
    // TODO: 实现附件上传逻辑
    console.log('打开附件选择器');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <IconButton
          icon="attachment"
          size={24}
          onPress={handleAttachment}
        />

        <TextInput
          mode="outlined"
          placeholder="输入消息..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          style={styles.input}
          right={
            <TextInput.Affix
              text={`${message.length}/2000`}
              textStyle={{ fontSize: 10 }}
            />
          }
        />

        <IconButton
          icon="send"
          size={24}
          iconColor={message.trim() ? theme.colors.primary : theme.colors.onSurfaceDisabled}
          onPress={handleSend}
          disabled={!message.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    marginHorizontal: 4,
  },
});
