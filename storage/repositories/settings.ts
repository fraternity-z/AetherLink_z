import { IKeyValueStore, prefixer } from '@/storage/core';
import { AsyncKVStore } from '@/storage/adapters/async-storage';

export enum SettingKey {
  Theme = 'al:settings:theme',
  ThemeStyle = 'al:settings:theme_style',
  FontScale = 'al:settings:font_scale',
  FontFamily = 'al:settings:font_family',
  DefaultModel = 'al:settings:default_model',
  DefaultProvider = 'al:settings:default_provider',
  HapticsOn = 'al:settings:haptics_on',
  AnalyticsEnabled = 'al:settings:analytics_enabled',
  LocalCacheEnabled = 'al:settings:local_cache_enabled',
  // 对话参数设置
  ChatTemperature = 'al:settings:chat_temperature',
  ChatMaxTokens = 'al:settings:chat_max_tokens',
  ChatMaxTokensEnabled = 'al:settings:chat_max_tokens_enabled',
  ChatContextCount = 'al:settings:chat_context_count',
  ChatSystemPrompt = 'al:settings:chat_system_prompt',
  ChatStreamOutput = 'al:settings:chat_stream_output',
  // 话题自动命名
  TopicAutoNameEnabled = 'al:settings:topic_auto_name_enabled',
  TopicAutoNamePrompt = 'al:settings:topic_auto_name_prompt',
  TopicNamingProvider = 'al:settings:topic_naming_provider',
  TopicNamingModel = 'al:settings:topic_naming_model',
  // 网络搜索设置
  WebSearchEnabled = 'al:settings:web_search_enabled',
  WebSearchEngine = 'al:settings:web_search_engine',
  WebSearchMaxResults = 'al:settings:web_search_max_results',
  TavilySearchApiKey = 'al:settings:tavily_search_api_key',
  // 行为设置
  EnterToSend = 'al:settings:enter_to_send',
  EnableNotifications = 'al:settings:enable_notifications',
  MobileInputMode = 'al:settings:mobile_input_mode',
  // 智能体助手设置
  CurrentAssistantId = 'al:settings:current_assistant_id',
}


const p = prefixer('settings'); // For clearNamespace use if needed

export const SettingsRepository = (store: IKeyValueStore = AsyncKVStore) => ({
  async get<T = any>(key: SettingKey): Promise<T | null> {
    return store.get<T>(key);
  },
  async set<T = any>(key: SettingKey, value: T): Promise<void> {
    await store.set<T>(key, value);
  },
  async clearAll(): Promise<void> {
    await store.clearNamespace('al:settings:');
  },
});
