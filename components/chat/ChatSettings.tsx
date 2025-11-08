/**
 * 💬 聊天参数设置组件
 *
 * 功能：
 * - 模型温度（Temperature）调节
 * - 最大令牌数（Max tokens）设置
 * - 上下文数目（Context count）设置
 * - 系统提示词（System prompt）编辑
 * - 流式输出（Stream output）开关
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Switch, Button, Portal, TextInput, useTheme } from 'react-native-paper';
import { UnifiedDialog } from '@/components/common/UnifiedDialog';
import Slider from '@react-native-community/slider';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';

export function ChatSettings() {
  const theme = useTheme();
  const sr = SettingsRepository();

  // 状态管理
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [maxTokensEnabled, setMaxTokensEnabled] = useState(false);
  const [contextCount, setContextCount] = useState(10);
  const [streamOutput, setStreamOutput] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [tempPrompt, setTempPrompt] = useState('');

  // 加载设置
  useEffect(() => {
    (async () => {
      const temp = await sr.get<number>(SettingKey.ChatTemperature);
      const tokens = await sr.get<number>(SettingKey.ChatMaxTokens);
      const tokensEnabled = await sr.get<boolean>(SettingKey.ChatMaxTokensEnabled);
      const context = await sr.get<number>(SettingKey.ChatContextCount);
      const stream = await sr.get<boolean>(SettingKey.ChatStreamOutput);
      const prompt = await sr.get<string>(SettingKey.ChatSystemPrompt);

      if (temp !== null) setTemperature(temp);
      if (tokens !== null) setMaxTokens(tokens);
      if (tokensEnabled !== null) setMaxTokensEnabled(tokensEnabled);
      if (context !== null) setContextCount(context);
      if (stream !== null) setStreamOutput(stream);
      if (prompt !== null) setSystemPrompt(prompt);
    })();
  }, []);

  // 保存设置
  const saveTemperature = async (value: number) => {
    // 修正浮点数精度问题，保留1位小数
    const roundedValue = parseFloat(value.toFixed(1));
    setTemperature(roundedValue);
    await sr.set(SettingKey.ChatTemperature, roundedValue);
  };

  const saveMaxTokens = async (value: number) => {
    setMaxTokens(value);
    await sr.set(SettingKey.ChatMaxTokens, value);
  };

  const saveMaxTokensEnabled = async (value: boolean) => {
    setMaxTokensEnabled(value);
    await sr.set(SettingKey.ChatMaxTokensEnabled, value);
  };

  const saveContextCount = async (value: number) => {
    setContextCount(value);
    await sr.set(SettingKey.ChatContextCount, value);
  };

  const saveStreamOutput = async (value: boolean) => {
    setStreamOutput(value);
    await sr.set(SettingKey.ChatStreamOutput, value);
  };

  const saveSystemPrompt = async () => {
    setSystemPrompt(tempPrompt);
    await sr.set(SettingKey.ChatSystemPrompt, tempPrompt);
    setShowPromptDialog(false);
  };

  const openPromptDialog = () => {
    setTempPrompt(systemPrompt);
    setShowPromptDialog(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleSmall" style={{ marginBottom: 8, paddingHorizontal: 16, marginTop: 8 }}>
        对话参数设置
      </Text>

      {/* Temperature 设置 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text variant="bodyMedium">Temperature</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{temperature.toFixed(1)}</Text>
        </View>
        <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          控制回复的随机性和创造性。较低值（0.2-0.5）更保守，较高值（0.7-1.0）更有创意
        </Text>
        <Slider
          value={temperature}
          onValueChange={saveTemperature}
          minimumValue={0}
          maximumValue={2}
          step={0.1}
          style={styles.slider}
          minimumTrackTintColor={theme.colors.primary}
        />
      </View>

      {/* Max tokens 设置 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Max tokens</Text>
            <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
              限制单次回复的最大长度。关闭则由模型自动决定
            </Text>
          </View>
          <Switch value={maxTokensEnabled} onValueChange={saveMaxTokensEnabled} />
        </View>
        {maxTokensEnabled && (
          <>
            <View style={styles.settingHeader}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                最大令牌数
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{maxTokens}</Text>
            </View>
            <Slider
              value={maxTokens}
              onValueChange={saveMaxTokens}
              minimumValue={256}
              maximumValue={8192}
              step={256}
              style={styles.slider}
              minimumTrackTintColor={theme.colors.primary}
            />
          </>
        )}
      </View>

      {/* Context count 设置 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text variant="bodyMedium">上下文数目</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{contextCount}</Text>
        </View>
        <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          保留多少轮历史对话。设为 0 则不包含历史上下文
        </Text>
        <Slider
          value={contextCount}
          onValueChange={saveContextCount}
          minimumValue={0}
          maximumValue={20}
          step={1}
          style={styles.slider}
          minimumTrackTintColor={theme.colors.primary}
        />
      </View>

      {/* System prompt 设置 */}
      <List.Item
        title="系统提示词"
        description={systemPrompt.length > 50 ? systemPrompt.substring(0, 50) + '...' : systemPrompt}
        right={() => <Button mode="text">编辑</Button>}
        onPress={openPromptDialog}
        style={styles.listItem}
      />

      {/* Stream output 开关 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">流式输出</Text>
            <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              实时显示 AI 回复内容（推荐开启）
            </Text>
          </View>
          <Switch value={streamOutput} onValueChange={saveStreamOutput} />
        </View>
      </View>

      {/* System Prompt 编辑对话框（统一弹出框） */}
      <UnifiedDialog
        visible={showPromptDialog}
        onClose={() => setShowPromptDialog(false)}
        title="编辑系统提示词"
        icon="note-text"
        actions={[
          { text: '取消', type: 'cancel', onPress: () => setShowPromptDialog(false) },
          { text: '保存', type: 'primary', onPress: saveSystemPrompt },
        ]}
      >
        <TextInput
          value={tempPrompt}
          onChangeText={setTempPrompt}
          multiline
          numberOfLines={6}
          mode="outlined"
          placeholder="输入系统提示词..."
          style={{ maxHeight: 200 }}
        />
      </UnifiedDialog>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    marginBottom: 8,
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  listItem: {
    paddingHorizontal: 16,
  },
});
