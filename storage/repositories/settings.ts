import { IKeyValueStore, prefixer, BackgroundSettings } from '@/storage/core';
import { AsyncKVStore } from '@/storage/adapters/async-storage';
import { withRepositoryContext } from './error-handler';

export enum SettingKey {
  Theme = 'al:settings:theme',
  ThemeStyle = 'al:settings:theme_style',
  FontScale = 'al:settings:font_scale',
  FontFamily = 'al:settings:font_family',
  DefaultModel = 'al:settings:default_model',
  DefaultProvider = 'al:settings:default_provider',
  HapticsOn = 'al:settings:haptics_on',
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
  // 翻译模型设置
  TranslationProvider = 'al:settings:translation_provider',
  TranslationModel = 'al:settings:translation_model',
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
  // 语音功能设置
  VoiceProvider = 'al:settings:voice_provider',
  VoiceLanguage = 'al:settings:voice_language',
  VoiceMaxDuration = 'al:settings:voice_max_duration',
  VoiceAutoSend = 'al:settings:voice_auto_send',
  VoiceShowPartial = 'al:settings:voice_show_partial',
  // 用户头像设置
  UserAvatarUri = 'al:settings:user_avatar_uri',
  // 快捷短语
  QuickPhrasesEnabled = 'al:settings:quick_phrases_enabled',
  // 自定义背景设置
  BackgroundImagePath = 'al:settings:background_image_path',
  BackgroundOpacity = 'al:settings:background_opacity',
  BackgroundEnabled = 'al:settings:background_enabled',
}


const p = prefixer('settings'); // For clearNamespace use if needed

export const SettingsRepository = (store: IKeyValueStore = AsyncKVStore) => ({
  async get<T = any>(key: SettingKey): Promise<T | null> {
    return withRepositoryContext('SettingsRepository', 'get', { key, storage: 'AsyncStorage' }, async () => {
      return store.get<T>(key);
    });
  },
  async set<T = any>(key: SettingKey, value: T): Promise<void> {
    return withRepositoryContext('SettingsRepository', 'set', { key, storage: 'AsyncStorage' }, async () => {
      await store.set<T>(key, value);
    });
  },
  async clearAll(): Promise<void> {
    return withRepositoryContext('SettingsRepository', 'clearAll', { storage: 'AsyncStorage' }, async () => {
      await store.clearNamespace('al:settings:');
    });
  },

  /**
   * 获取背景设置
   * @returns BackgroundSettings 对象，如果未设置则返回默认值
   */
  async getBackgroundSettings(): Promise<BackgroundSettings> {
    return withRepositoryContext('SettingsRepository', 'getBackgroundSettings', { storage: 'AsyncStorage' }, async () => {
      const [imagePath, opacity, enabled] = await Promise.all([
        store.get<string>(SettingKey.BackgroundImagePath),
        store.get<number>(SettingKey.BackgroundOpacity),
        store.get<boolean>(SettingKey.BackgroundEnabled),
      ]);

      return {
        imagePath: imagePath ?? null,
        opacity: opacity ?? 0.3,
        enabled: enabled ?? false,
      };
    });
  },

  /**
   * 更新背景设置
   * @param settings 部分或完整的 BackgroundSettings 对象
   */
  async updateBackgroundSettings(settings: Partial<BackgroundSettings>): Promise<void> {
    return withRepositoryContext('SettingsRepository', 'updateBackgroundSettings', { storage: 'AsyncStorage' }, async () => {
      const promises: Promise<void>[] = [];

      if (settings.imagePath !== undefined) {
        promises.push(store.set(SettingKey.BackgroundImagePath, settings.imagePath));
      }
      if (settings.opacity !== undefined) {
        promises.push(store.set(SettingKey.BackgroundOpacity, settings.opacity));
      }
      if (settings.enabled !== undefined) {
        promises.push(store.set(SettingKey.BackgroundEnabled, settings.enabled));
      }

      await Promise.all(promises);
    });
  },
});
