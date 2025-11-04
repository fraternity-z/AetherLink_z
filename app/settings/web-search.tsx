import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  List,
  Switch,
  TextInput,
  RadioButton,
  Text,
  HelperText,
  Button,
  Snackbar,
  Portal,
  useTheme,
  Divider,
  Chip,
} from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';
import { SettingKey } from '@/storage/repositories/settings';
import { useSetting } from '@/hooks/use-setting';
import { performSearch } from '@/services/search/SearchClient';
import type { SearchEngine } from '@/services/search/types';

export default function WebSearchSettings() {
  const theme = useTheme();

  // 设置状态
  const [enabled, setEnabled] = useSetting(SettingKey.WebSearchEnabled, false);
  const [engine, setEngine] = useSetting<SearchEngine>(SettingKey.WebSearchEngine, 'bing');
  const [maxResults, setMaxResults] = useSetting(SettingKey.WebSearchMaxResults, 5);
  const [tavilyApiKey, setTavilyApiKey] = useSetting(SettingKey.TavilySearchApiKey, '');

  // UI 状态
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'info' | 'success' | 'error' });

  // 测试搜索功能
  const handleTestSearch = async () => {
    setTesting(true);
    try {
      const results = await performSearch({
        engine,
        query: 'Hello World',
        maxResults: 3,
        apiKey: engine === 'tavily' ? tavilyApiKey : undefined,
      });

      if (results.length > 0) {
        setSnackbar({
          visible: true,
          message: `✓ 搜索成功！找到 ${results.length} 条结果`,
          type: 'success',
        });
      } else {
        setSnackbar({
          visible: true,
          message: '⚠️ 搜索返回空结果',
          type: 'info',
        });
      }
    } catch (error: any) {
      setSnackbar({
        visible: true,
        message: `✗ 搜索失败: ${error.message || '未知错误'}`,
        type: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingScreen
      title="网络搜索"
      description="配置网络搜索引擎，让 AI 获取实时信息"
    >
      <ScrollView style={styles.container}>
        {/* 全局开关 */}
        <List.Section>
          <List.Subheader>基本设置</List.Subheader>
          <List.Item
            title="启用网络搜索"
            description="允许 AI 在对话中使用网络搜索获取实时信息"
            right={() => (
              <Switch
                value={enabled}
                onValueChange={setEnabled}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* 搜索引擎选择 */}
        <List.Section>
          <List.Subheader>搜索引擎</List.Subheader>

          <RadioButton.Group onValueChange={(value) => setEngine(value as SearchEngine)} value={engine}>
            <List.Item
              title="Bing"
              description="使用网页爬取方式，无需 API Key"
              disabled={!enabled}
              left={() => <RadioButton value="bing" disabled={!enabled} />}
              right={() => <Chip mode="flat" compact>免费</Chip>}
            />

            <List.Item
              title="Google"
              description="使用网页爬取方式，无需 API Key"
              disabled={!enabled}
              left={() => <RadioButton value="google" disabled={!enabled} />}
              right={() => <Chip mode="flat" compact>免费</Chip>}
            />

            <List.Item
              title="Tavily"
              description="使用官方 API，需要 API Key"
              disabled={!enabled}
              left={() => <RadioButton value="tavily" disabled={!enabled} />}
              right={() => <Chip mode="flat" compact>需付费</Chip>}
            />
          </RadioButton.Group>

          <HelperText type="info" visible={true} style={styles.helperText}>
            💡 Bing 和 Google 使用网页爬取方式，可能受到反爬虫限制
          </HelperText>
        </List.Section>

        <Divider />

        {/* Tavily API Key */}
        {engine === 'tavily' && (
          <List.Section>
            <List.Subheader>Tavily API 配置</List.Subheader>
            <View style={styles.inputContainer}>
              <TextInput
                label="Tavily API Key"
                value={tavilyApiKey}
                onChangeText={setTavilyApiKey}
                secureTextEntry={!showApiKey}
                disabled={!enabled}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon={showApiKey ? 'eye-off' : 'eye'}
                    onPress={() => setShowApiKey(!showApiKey)}
                  />
                }
                style={styles.input}
              />
              <HelperText type="info" visible={true}>
                获取 API Key: https://tavily.com
              </HelperText>
            </View>
          </List.Section>
        )}

        {engine !== 'tavily' && <Divider />}

        {/* 搜索参数 */}
        <List.Section>
          <List.Subheader>搜索参数</List.Subheader>
          <View style={styles.inputContainer}>
            <TextInput
              label="最大搜索结果数量"
              value={String(maxResults)}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (!isNaN(num) && num >= 3 && num <= 10) {
                  setMaxResults(num);
                }
              }}
              keyboardType="number-pad"
              disabled={!enabled}
              mode="outlined"
              style={styles.input}
            />
            <HelperText type="info" visible={true}>
              范围: 3-10，默认: 5
            </HelperText>
          </View>
        </List.Section>

        <Divider />

        {/* 测试搜索 */}
        <List.Section>
          <List.Subheader>测试搜索</List.Subheader>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleTestSearch}
              loading={testing}
              disabled={!enabled || testing || (engine === 'tavily' && !tavilyApiKey)}
              style={styles.button}
            >
              {testing ? '测试中...' : '测试搜索'}
            </Button>
          </View>
          <HelperText type="info" visible={true} style={styles.helperText}>
            执行一次测试搜索以验证配置是否正确
          </HelperText>
        </List.Section>

        {/* 使用说明 */}
        <List.Section>
          <List.Subheader>使用说明</List.Subheader>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 网页爬取方式可能受到搜索引擎的反爬虫限制{'\n'}
              • 建议使用 Tavily API 以获得更稳定的搜索体验{'\n'}
              • 搜索结果将发送给 AI 进行智能汇总{'\n'}
              • 在聊天输入框中可以手动启用/禁用搜索
            </Text>
          </View>
        </List.Section>
      </ScrollView>

      {/* Snackbar 提示 */}
      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={3000}
          style={{
            backgroundColor:
              snackbar.type === 'success'
                ? theme.colors.primary
                : snackbar.type === 'error'
                ? theme.colors.error
                : theme.colors.surfaceVariant,
          }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </SettingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    marginBottom: 4,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    marginBottom: 4,
  },
  helperText: {
    paddingHorizontal: 16,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoText: {
    lineHeight: 20,
  },
});

