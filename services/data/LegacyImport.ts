import { ProvidersRepository } from '@/storage/repositories/providers';
import { CustomProvidersRepository, type CustomProviderType } from '@/storage/repositories/custom-providers';
import { ProviderModelsRepository } from '@/storage/repositories/provider-models';
import { logger } from '@/utils/logger';

/**
 * 旧版 AetherLink 备份数据格式
 */
interface LegacyBackup {
  topics: LegacyTopic[];
  assistants: any[];
  timestamp: number;
  appInfo: {
    version: string;
    name: string;
    backupVersion: number;
  };
}

interface LegacyTopic {
  id: string;
  name: string;
  messages?: LegacyMessage[];
  // ... 其他字段
}

interface LegacyMessage {
  id: string;
  role: string;
  model?: LegacyModel;
  // ... 其他字段
}

interface LegacyModel {
  id: string;
  name: string;
  provider: string;
  providerType: string;
  enabled: boolean;
  isDefault: boolean;
  apiKey?: string;
  baseUrl?: string;
  description?: string;
}

/**
 * 提取的提供商配置
 */
interface ExtractedProvider {
  provider: string;
  baseUrl?: string;
  apiKey?: string;
  models: Set<{ id: string; label: string }>;
}

/**
 * 官方支持的提供商列表
 */
const OFFICIAL_PROVIDERS = ['openai', 'anthropic', 'gemini', 'google', 'deepseek', 'volc', 'zhipu'];

/**
 * 提供商类型默认的 baseURL
 */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

/**
 * 推断自定义提供商的类型
 */
function inferCustomProviderType(provider: string, baseUrl?: string): CustomProviderType {
  // 如果 provider 是 openai，大概率是 OpenAI 兼容
  if (provider === 'openai') return 'openai-compatible';
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'google' || provider === 'gemini') return 'google';

  // 默认使用 OpenAI 兼容格式
  return 'openai-compatible';
}

/**
 * 检查 baseURL 是否为官方默认地址
 */
function isDefaultBaseUrl(provider: string, baseUrl?: string): boolean {
  if (!baseUrl) return true;
  const defaultUrl = DEFAULT_BASE_URLS[provider];
  if (!defaultUrl) return false;

  // 规范化 URL 进行比较（去除尾部斜杠）
  const normalize = (url: string) => url.replace(/\/+$/, '').toLowerCase();
  return normalize(baseUrl) === normalize(defaultUrl);
}

export const LegacyImportService = {
  /**
   * 从旧版备份文件导入提供商和模型配置
   * @param backup 旧版备份数据
   * @param options 导入选项
   */
  async importProvidersAndModels(
    backup: LegacyBackup,
    options: {
      overwriteExisting?: boolean; // 是否覆盖现有配置
      importApiKeys?: boolean; // 是否导入 API 密钥
    } = {}
  ): Promise<{
    providersImported: number;
    modelsImported: number;
    customProvidersCreated: number;
    errors: string[];
  }> {
    const { overwriteExisting = false, importApiKeys = true } = options;
    const errors: string[] = [];
    let providersImported = 0;
    let modelsImported = 0;
    let customProvidersCreated = 0;

    try {
      // 1. 提取所有唯一的提供商和模型配置
      const providersMap = new Map<string, ExtractedProvider>();

      for (const topic of backup.topics) {
        if (!topic.messages) continue;

        for (const msg of topic.messages) {
          if (!msg.model || !msg.model.provider) continue;

          const { provider, baseUrl, apiKey, id: modelId, name: modelName } = msg.model;
          const key = `${provider}::${baseUrl || 'default'}`;

          if (!providersMap.has(key)) {
            providersMap.set(key, {
              provider,
              baseUrl,
              apiKey,
              models: new Set(),
            });
          }

          const providerData = providersMap.get(key)!;
          providerData.models.add({
            id: modelId,
            label: modelName || modelId,
          });

          // 如果发现不同的 apiKey，使用最新的（可选择策略）
          if (apiKey && !providerData.apiKey) {
            providerData.apiKey = apiKey;
          }
        }
      }

      logger.info('[LegacyImport] Extracted providers:', {
        total: providersMap.size,
        providers: Array.from(providersMap.keys()),
      });

      // 2. 处理每个提供商配置
      for (const [, data] of Array.from(providersMap.entries())) {
        try {
          const isOfficial = OFFICIAL_PROVIDERS.includes(data.provider);
          const hasCustomBaseUrl = !isDefaultBaseUrl(data.provider, data.baseUrl);

          // 决定是作为官方提供商还是自定义提供商导入
          if (isOfficial && !hasCustomBaseUrl) {
            // 导入为官方提供商
            await this.importOfficialProvider(data, importApiKeys, overwriteExisting);
            providersImported++;
          } else {
            // 导入为自定义提供商
            await this.importCustomProvider(data, importApiKeys);
            customProvidersCreated++;
          }

          // 导入模型列表
          const modelCount = await this.importModels(data);
          modelsImported += modelCount;

        } catch (error) {
          const errMsg = `Failed to import provider ${data.provider}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error('[LegacyImport]', errMsg);
          errors.push(errMsg);
        }
      }

      logger.info('[LegacyImport] Import completed', {
        providersImported,
        customProvidersCreated,
        modelsImported,
        errors: errors.length,
      });

      return {
        providersImported,
        modelsImported,
        customProvidersCreated,
        errors,
      };

    } catch (error) {
      logger.error('[LegacyImport] Import failed:', error);
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  /**
   * 导入官方提供商配置
   */
  async importOfficialProvider(
    data: ExtractedProvider,
    importApiKeys: boolean,
    overwriteExisting: boolean
  ): Promise<void> {
    const providerId = data.provider as any;

    // 检查是否已存在
    const existingConfig = await ProvidersRepository.getConfig(providerId);

    if (existingConfig.enabled && !overwriteExisting) {
      logger.info('[LegacyImport] Skipping existing official provider:', providerId);
      return;
    }

    // 更新配置
    await ProvidersRepository.setEnabled(providerId, true);

    if (data.baseUrl) {
      await ProvidersRepository.setBaseURL(providerId, data.baseUrl);
    }

    if (importApiKeys && data.apiKey) {
      await ProvidersRepository.setApiKey(providerId, data.apiKey);
    }

    logger.info('[LegacyImport] Imported official provider:', {
      provider: providerId,
      hasApiKey: !!data.apiKey,
      hasBaseUrl: !!data.baseUrl,
    });
  },

  /**
   * 导入自定义提供商配置
   */
  async importCustomProvider(
    data: ExtractedProvider,
    importApiKeys: boolean
  ): Promise<void> {
    const type = inferCustomProviderType(data.provider, data.baseUrl);
    const name = data.baseUrl
      ? `${data.provider} (${new URL(data.baseUrl).hostname})`
      : data.provider;

    // 检查是否已存在相同的自定义提供商
    const existingProviders = await CustomProvidersRepository.list();
    const existing = existingProviders.find(
      p => p.name === name || (p.baseURL === data.baseUrl && p.type === type)
    );

    if (existing) {
      logger.info('[LegacyImport] Custom provider already exists:', name);
      // 更新现有配置
      await CustomProvidersRepository.update(existing.id, {
        enabled: true,
        baseURL: data.baseUrl,
        apiKey: importApiKeys ? data.apiKey : existing.apiKey,
      });
      return;
    }

    // 创建新的自定义提供商
    const newProvider = await CustomProvidersRepository.add({
      name,
      type,
      baseURL: data.baseUrl,
      apiKey: importApiKeys ? data.apiKey : undefined,
      enabled: true,
    });

    logger.info('[LegacyImport] Created custom provider:', {
      id: newProvider.id,
      name: newProvider.name,
      type: newProvider.type,
    });
  },

  /**
   * 导入模型列表
   */
  async importModels(data: ExtractedProvider): Promise<number> {
    let count = 0;

    // 确定提供商 ID
    let providerId = data.provider;

    // 如果是自定义提供商，需要找到对应的 ID
    if (!OFFICIAL_PROVIDERS.includes(data.provider) || !isDefaultBaseUrl(data.provider, data.baseUrl)) {
      const customProviders = await CustomProvidersRepository.list();
      const custom = customProviders.find(
        p => p.baseURL === data.baseUrl || p.name.includes(data.provider)
      );
      if (custom) {
        providerId = custom.id;
      }
    }

    // 批量导入模型
    for (const model of Array.from(data.models)) {
      try {
        await ProviderModelsRepository.upsert(providerId, model.id, model.label, true);
        count++;
      } catch (error) {
        logger.error('[LegacyImport] Failed to import model:', {
          provider: providerId,
          model: model.id,
          error,
        });
      }
    }

    logger.info('[LegacyImport] Imported models for provider:', {
      provider: providerId,
      count,
    });

    return count;
  },

  /**
   * 验证备份文件格式
   */
  validateBackup(data: any): data is LegacyBackup {
    return (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray(data.topics) &&
      typeof data.timestamp === 'number' &&
      typeof data.appInfo === 'object'
    );
  },
};
