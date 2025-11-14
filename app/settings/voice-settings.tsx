import React, { useState, useEffect } from 'react';
import { ScrollView, Linking } from 'react-native';
import { List, Switch, Dialog, Portal, Button, RadioButton, Divider } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { logger } from '@/utils/logger';

type VoiceProvider = 'native' | 'whisper';
type VoiceLanguage = 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';

const LANGUAGE_OPTIONS: { value: VoiceLanguage; label: string }[] = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'en-US', label: '英语（美国）' },
  { value: 'ja-JP', label: '日语' },
  { value: 'ko-KR', label: '韩语' },
];

const DURATION_OPTIONS = [60, 120, 180, 300];

export default function VoiceSettings() {
  const [provider, setProvider] = useState<VoiceProvider>('native');
  const [language, setLanguage] = useState<VoiceLanguage>('auto');
  const [maxDuration, setMaxDuration] = useState<number>(120);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [showPartial, setShowPartial] = useState<boolean>(true);

  // Dialog states
  const [providerDialogVisible, setProviderDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [durationDialogVisible, setDurationDialogVisible] = useState(false);

  // 加载设置
  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const sr = SettingsRepository();
      const savedProvider = (await sr.get<VoiceProvider>(SettingKey.VoiceProvider)) || 'native';
      const savedLanguage = (await sr.get<VoiceLanguage>(SettingKey.VoiceLanguage)) || 'auto';
      const savedMaxDuration = (await sr.get<number>(SettingKey.VoiceMaxDuration)) || 120;
      const savedAutoSend = (await sr.get<boolean>(SettingKey.VoiceAutoSend)) || false;
      const savedShowPartial = (await sr.get<boolean>(SettingKey.VoiceShowPartial)) ?? true;

      setProvider(savedProvider);
      setLanguage(savedLanguage);
      setMaxDuration(savedMaxDuration);
      setAutoSend(savedAutoSend);
      setShowPartial(savedShowPartial);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to load settings:', error);
    }
  };

  const saveProvider = async (value: VoiceProvider) => {
    try {
      const sr = SettingsRepository();
      await sr.set(SettingKey.VoiceProvider, value);
      setProvider(value);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to save provider:', error);
    }
  };

  const saveLanguage = async (value: VoiceLanguage) => {
    try {
      const sr = SettingsRepository();
      await sr.set(SettingKey.VoiceLanguage, value);
      setLanguage(value);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to save language:', error);
    }
  };

  const saveMaxDuration = async (value: number) => {
    try {
      const sr = SettingsRepository();
      await sr.set(SettingKey.VoiceMaxDuration, value);
      setMaxDuration(value);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to save max duration:', error);
    }
  };

  const saveAutoSend = async (value: boolean) => {
    try {
      const sr = SettingsRepository();
      await sr.set(SettingKey.VoiceAutoSend, value);
      setAutoSend(value);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to save auto send:', error);
    }
  };

  const saveShowPartial = async (value: boolean) => {
    try {
      const sr = SettingsRepository();
      await sr.set(SettingKey.VoiceShowPartial, value);
      setShowPartial(value);
    } catch (error) {
      logger.error('[VoiceSettings] Failed to save show partial:', error);
    }
  };

  const getProviderLabel = () => {
    return provider === 'native' ? '设备端识别（免费）' : 'OpenAI Whisper（高准确率）';
  };

  const getLanguageLabel = () => {
    const option = LANGUAGE_OPTIONS.find((opt) => opt.value === language);
    return option?.label || '自动检测';
  };

  const openWhisperApiKeySettings = () => {
    // 跳转到 AI 提供商设置页面（复用现有 OpenAI API Key）
    // TODO: 根据实际路由调整
    Linking.openURL('aetherlinkz://settings/providers');
  };

  return (
    <SettingScreen title="语音功能" description="语音识别和语音输入配置">
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>语音识别</List.Subheader>

          {/* 识别提供商 */}
          <List.Item
            title="识别提供商"
            description={getProviderLabel()}
            left={(props) => <List.Icon {...props} icon="microphone" />}
            onPress={() => setProviderDialogVisible(true)}
          />

          {/* 识别语言 */}
          <List.Item
            title="识别语言"
            description={getLanguageLabel()}
            left={(props) => <List.Icon {...props} icon="translate" />}
            onPress={() => setLanguageDialogVisible(true)}
          />

          {/* 录音最大时长 */}
          <List.Item
            title="录音最大时长"
            description={`${maxDuration} 秒`}
            left={(props) => <List.Icon {...props} icon="timer" />}
            onPress={() => setDurationDialogVisible(true)}
          />

          {/* Whisper API 配置（条件显示） */}
          {provider === 'whisper' && (
            <>
              <Divider style={{ marginVertical: 8 }} />
              <List.Item
                title="API 密钥配置"
                description="复用 OpenAI API Key"
                left={(props) => <List.Icon {...props} icon="key" />}
                onPress={openWhisperApiKeySettings}
              />
              <List.Item
                title="费用说明"
                description="约 $0.006/分钟"
                left={(props) => <List.Icon {...props} icon="cash" />}
              />
            </>
          )}

          <Divider style={{ marginVertical: 8 }} />

          {/* 自动发送 */}
          <List.Item
            title="自动发送"
            description="识别完成后自动发送消息"
            left={(props) => <List.Icon {...props} icon="send-check" />}
            right={() => <Switch value={autoSend} onValueChange={saveAutoSend} />}
          />

          {/* 显示实时识别（仅设备端可用） */}
          <List.Item
            title="显示实时识别"
            description="录音时显示部分识别结果（仅设备端）"
            left={(props) => <List.Icon {...props} icon="eye" />}
            right={() => <Switch value={showPartial} onValueChange={saveShowPartial} disabled={provider === 'whisper'} />}
          />
        </List.Section>
      </ScrollView>

      {/* 识别提供商选择对话框 */}
      <Portal>
        <Dialog visible={providerDialogVisible} onDismiss={() => setProviderDialogVisible(false)}>
          <Dialog.Title>选择识别提供商</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveProvider(value as VoiceProvider);
                setProviderDialogVisible(false);
              }}
              value={provider}
            >
              <RadioButton.Item label="设备端识别（免费、快速、隐私）" value="native" />
              <RadioButton.Item label="OpenAI Whisper（高准确率、多语言）" value="whisper" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setProviderDialogVisible(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 识别语言选择对话框 */}
      <Portal>
        <Dialog visible={languageDialogVisible} onDismiss={() => setLanguageDialogVisible(false)}>
          <Dialog.Title>选择识别语言</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveLanguage(value as VoiceLanguage);
                setLanguageDialogVisible(false);
              }}
              value={language}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <RadioButton.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 录音最大时长选择对话框 */}
      <Portal>
        <Dialog visible={durationDialogVisible} onDismiss={() => setDurationDialogVisible(false)}>
          <Dialog.Title>选择录音最大时长</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveMaxDuration(Number(value));
                setDurationDialogVisible(false);
              }}
              value={String(maxDuration)}
            >
              {DURATION_OPTIONS.map((duration) => (
                <RadioButton.Item key={duration} label={`${duration} 秒${duration === 120 ? '（推荐）' : ''}`} value={String(duration)} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDurationDialogVisible(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SettingScreen>
  );
}
