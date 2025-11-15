/**
 * 模型能力和标签管理系统
 *
 * 本模块提供统一的模型能力识别、标签管理功能,支持:
 * - 自动识别模型的各项能力(推理、视觉、工具调用等)
 * - 基于正则表达式的灵活匹配规则
 * - 用户手动覆盖自动识别结果
 *
 * @module ModelCapabilities
 * @author 幽浮喵 (浮浮酱)
 * @created 2025-11-15
 */

import { logger } from '@/utils/logger';

// ============================================
// 类型定义
// ============================================

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu';

/**
 * 模型能力类型
 * - reasoning: 推理能力(如 DeepSeek R1, OpenAI o1)
 * - vision: 视觉能力(如 GPT-4V, Claude 3)
 * - function_calling: 工具调用/函数调用能力
 * - web_search: 网络搜索能力
 * - embedding: 文本嵌入能力
 * - rerank: 重排序能力
 * - image_generation: 图像生成能力
 */
export type ModelCapabilityType =
  | 'reasoning'
  | 'vision'
  | 'function_calling'
  | 'web_search'
  | 'embedding'
  | 'rerank'
  | 'image_generation';

/**
 * 模型标签(扩展能力类型,增加免费标签)
 */
export type ModelTag = ModelCapabilityType | 'free';

/**
 * 模型能力对象
 */
/**
 * 扩展的模型信息(包含能力标签)
 */
export interface ModelWithCapabilities {
  id: string;
  provider: string;
  name?: string;
}

/**
 * provider 级别的额外配置（主要用于 reasoning 模型的 providerOptions）
 */
export interface ProviderOptions {
  providerOptions?: {
    openai?: {
      reasoningSummary?: 'auto' | 'detailed' | 'brief';
    };
    anthropic?: {
      thinking?: {
        type: 'enabled';
        budgetTokens: number;
      };
    };
  };
}

export interface ModelCapabilityDescriptor {
  modelId: string;
  provider: ProviderId;
  tags: ModelTag[];
  reasoning: boolean;
  vision: boolean;
  functionCalling: boolean;
  webSearch: boolean;
  embedding: boolean;
  rerank: boolean;
  imageGeneration: boolean;
  providerOptions: ProviderOptions;
}

// ============================================
// 工具函数
// ============================================

function norm(id: string): string {
  return (id || '').toLowerCase().trim();
}

const KNOWN_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'google', 'gemini', 'deepseek', 'volc', 'zhipu'];
const KNOWN_PROVIDER_SET = new Set(KNOWN_PROVIDERS);

function asProviderId(provider?: string): ProviderId {
  if (provider && KNOWN_PROVIDER_SET.has(provider as ProviderId)) {
    return provider as ProviderId;
  }
  return 'openai';
}

// ============================================
// 视觉能力识别
// ============================================

// 参考 cherry-studio 的模型匹配思路，做了"兼容厂商 + OpenAI 兼容网关"适配：
// - OpenAI: 支持 4o/4.1/4.5/5、o1/o3/o4、chatgpt-4o*、omni 家族（排除 o1-mini/o3-mini 等）
// - Anthropic: Claude 3/4 系列
// - Gemini: gemini 家族
// - DeepSeek: deepseek-vl/vision
// - Zhipu: glm-4v 家族
// - Volc（豆包）: doubao-*（含 vl/vision/omni/seed-1.6），step-1v/step-1o-vision
// - 其它常见多模态: llava/minicpm/internvl2/qwen-vl|omni/qvq/pixtral/grok-vision/grok-4*/llama-vision/gemma-3/kimi-vl
// 如果 provider=openai 但 baseURL 指向兼容网关，通常模型名会体现厂商特征，上述联合匹配可覆盖。

const OPENAI_VISION_REGEX = /\b(gpt-4o(?:-[\w-]+)?|chatgpt-4o(?:-[\w-]+)?|gpt-4\.1(?:-[\w-]+)?|gpt-4\.5(?:-[\w-]+)?|gpt-5(?:-[\w-]+)?|o1(?:-[\w-]+)?|o3(?:-[\w-]+)?|o4(?:-[\w-]+)?|omni)\b/i
const OPENAI_EXCLUDE_REGEX = /\b(o1-mini|o3-mini|o1-preview)\b/i

const ANTHROPIC_VISION_REGEX = /\bclaude-(3|4|haiku-4|sonnet-4|opus-4)/i
const GEMINI_VISION_REGEX = /\bgemini\b/i
const DEEPSEEK_VISION_REGEX = /\bdeepseek[\w-]*(vl|vision)\b/i
const ZHIPU_VISION_REGEX = /\bglm-4(?:\.\d+)?v(?:-[\w-]+)?\b/i
const VOLC_VISION_REGEX = /\b(doubao[\w-]*(vl|vision|omni|seed-1[.-]6)|step-1v(?:-[\w-]+)?|step-1o[\w-]*vision)\b/i
const MISC_VISION_REGEX = /(llava|minicpm|internvl2|qwen(?:\d*(?:\.\d+)?)?-?vl|qwen(?:\d*(?:\.\d+)?)?-?omni|qvq|pixtral|grok-(?:vision|4(?:-[\w-]+)?)|llama-(?:3\.2-vision|4(?:-[\w-]+)?)|gemma-3(?:-[\w-]+)?|kimi-(?:vl|.*vla?3b-thinking)|qwen3-omni)/i

/**
 * 判断模型是否具备视觉能力
 *
 * @param provider - 提供商 ID
 * @param model - 模型 ID
 * @param modelWithCaps - 可选的包含能力配置的模型对象
 * @returns true 表示该模型具备视觉能力
 *
 * @example
 * ```typescript
 * supportsVision('openai', 'gpt-4-vision-preview') // => true
 * supportsVision('anthropic', 'claude-3-opus') // => true
 * supportsVision('openai', 'gpt-3.5-turbo') // => false
 * ```
 */
export function supportsVision(
  provider: ProviderId,
  model: string,
  modelWithCaps?: ModelWithCapabilities
): boolean {
  const m = norm(model);
  switch (provider) {
    case 'openai':
      return (
        !OPENAI_EXCLUDE_REGEX.test(m) &&
        (OPENAI_VISION_REGEX.test(m) ||
          // 兼容：OpenAI 兼容网关但模型来自其他厂商
          DEEPSEEK_VISION_REGEX.test(m) ||
          ZHIPU_VISION_REGEX.test(m) ||
          VOLC_VISION_REGEX.test(m) ||
          MISC_VISION_REGEX.test(m))
      );
    case 'anthropic':
      return ANTHROPIC_VISION_REGEX.test(m);
    case 'google':
    case 'gemini':
      return GEMINI_VISION_REGEX.test(m);
    case 'deepseek':
      return DEEPSEEK_VISION_REGEX.test(m);
    case 'zhipu':
      return ZHIPU_VISION_REGEX.test(m);
    case 'volc':
      return VOLC_VISION_REGEX.test(m);
    default:
      // 未知提供商，兜底用通用多模态特征
      return (
        OPENAI_VISION_REGEX.test(m) ||
        ANTHROPIC_VISION_REGEX.test(m) ||
        GEMINI_VISION_REGEX.test(m) ||
        DEEPSEEK_VISION_REGEX.test(m) ||
        ZHIPU_VISION_REGEX.test(m) ||
        VOLC_VISION_REGEX.test(m) ||
        MISC_VISION_REGEX.test(m)
      );
  }
}

// ============================================
// 推理能力识别
// ============================================

/**
 * 推理模型正则匹配规则
 *
 * 匹配规则:
 * - OpenAI: o1, o3, o4 系列
 * - DeepSeek: R1, V3.1+ 系列
 * - Anthropic: Claude 3.7+, Claude 4 系列
 * - Google: Gemini Thinking 系列
 * - 其他: 包含 "reasoning", "thinking", "qwq" 等关键词
 */
const REASONING_REGEX =
  /^(?!.*-non-reasoning\b)(o\d+(?:-[\w-]+)?|.*\b(?:reasoning|reasoner|thinking)\b.*|.*-[rR]\d+.*|.*\bqwq(?:-[\w-]+)?\b.*|.*\bhunyuan-t1(?:-[\w-]+)?\b.*|.*\bglm-zero-preview\b.*|.*\bgrok-(?:3-mini|4|4-fast)(?:-[\w-]+)?\b.*)$/i;

const DEEPSEEK_HYBRID_REGEX = /deepseek-v3(?:\.\d|-\d)(?:(\.|-)\w+)?$|deepseek-chat-v3\.1/i;
const GEMINI_THINKING_REGEX =
  /gemini-(?:2\.5.*(?:-latest)?|flash-latest|pro-latest|flash-lite-latest)(?:-[\w-]+)*$/i;
const QWEN_REASONING_REGEX = /qwen3.*thinking|qwq|qvq|qwen-plus|qwen-turbo|qwen-flash/i;
const CLAUDE_REASONING_REGEX = /claude-3-7-sonnet|claude-3\.7-sonnet|claude-(sonnet|opus|haiku)-4/i;
const DOUBAO_REASONING_REGEX =
  /doubao-(?:1[.-]5-thinking-vision-pro|1[.-]5-thinking-pro-m|seed-1[.-]6(?:-flash)?(?!-(?:thinking)(?:-|$)))(?:-[\w-]+)*/i;

/**
 * 判断模型是否具备推理能力
 *
 * @param modelWithCaps - 模型信息
 * @returns true 表示该模型具备推理能力
 *
 * @example
 * ```typescript
 * supportsReasoning({ id: 'deepseek-r1', provider: 'deepseek' }) // => true
 * supportsReasoning({ id: 'gpt-4o', provider: 'openai' }) // => false
 * supportsReasoning({ id: 'o1-mini', provider: 'openai' }) // => true
 * ```
 */
export function supportsReasoning(modelWithCaps: ModelWithCapabilities): boolean {
  const modelId = norm(modelWithCaps.id);
  const modelName = norm(modelWithCaps.name || '');

  // 特殊提供商处理
  if (modelWithCaps.provider === 'volc' || modelId.includes('doubao')) {
    return (
      REASONING_REGEX.test(modelId) ||
      REASONING_REGEX.test(modelName) ||
      DOUBAO_REASONING_REGEX.test(modelId) ||
      DOUBAO_REASONING_REGEX.test(modelName)
    );
  }

  // 通用匹配
  return (
    REASONING_REGEX.test(modelId) ||
    DEEPSEEK_HYBRID_REGEX.test(modelId) ||
    GEMINI_THINKING_REGEX.test(modelId) ||
    QWEN_REASONING_REGEX.test(modelId) ||
    CLAUDE_REASONING_REGEX.test(modelId)
  );
}

/**
 * 以 provider + model 字符串快速判断是否为推理模型
 */
export function isReasoningModel(provider: ProviderId, model: string, name?: string): boolean {
  return supportsReasoning({
    id: model,
    provider,
    name,
  });
}

/**
 * 针对推理模型返回 providerOptions（供 AiClient 直接使用）
 */
export function getProviderOptionsForModel(
  provider: ProviderId,
  model: string
): ProviderOptions {
  // OpenAI o1/o3 系列 - 需要 reasoningSummary 配置
  if (provider === 'openai' && /^o[134]/i.test(model)) {
    return {
      providerOptions: {
        openai: {
          reasoningSummary: 'detailed',
        },
      },
    };
  }

  // Anthropic Claude 3.7+ - 需要启用 thinking
  if (provider === 'anthropic' && /claude-3\.[789]|claude-[4-9]/i.test(model)) {
    return {
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 12000,
          },
        },
      },
    };
  }

  // 其它推理/兼容端点暂不需要额外配置
  return {};
}

// ============================================
// 工具调用能力识别
// ============================================

const FUNCTION_CALLING_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4.5',
  'gpt-5(?:-[0-9-]+)?',
  'o(1|3|4)(?:-[\\w-]+)?',
  'claude',
  'qwen',
  'qwen3',
  'hunyuan',
  'deepseek',
  'glm-4(?:-[\\w-]+)?',
  'gemini(?:-[\\w-]+)?',
  'grok-3(?:-[\\w-]+)?',
  'doubao-seed-1[.-]6(?:-[\\w-]+)?',
];

const FUNCTION_CALLING_EXCLUDED_MODELS = [
  'o1-mini',
  'o1-preview',
  'gemini-1(?:\\.[\\w-]+)?',
  'qwen-mt(?:-[\\w-]+)?',
];

const FUNCTION_CALLING_REGEX = new RegExp(
  `\\b(?!(?:${FUNCTION_CALLING_EXCLUDED_MODELS.join('|')})\\b)(?:${FUNCTION_CALLING_MODELS.join('|')})\\b`,
  'i'
);

/**
 * 判断模型是否具备工具调用能力
 *
 * @param modelWithCaps - 模型信息
 * @returns true 表示该模型具备工具调用能力
 *
 * @example
 * ```typescript
 * supportsFunctionCalling({ id: 'gpt-4o', provider: 'openai' }) // => true
 * supportsFunctionCalling({ id: 'claude-3-opus', provider: 'anthropic' }) // => true
 * supportsFunctionCalling({ id: 'gpt-3.5-turbo', provider: 'openai' }) // => false
 * ```
 */
export function supportsFunctionCalling(modelWithCaps: ModelWithCapabilities): boolean {
  const modelId = norm(modelWithCaps.id);

  // 特定提供商默认支持
  if (['deepseek', 'anthropic', 'kimi', 'moonshot'].includes(modelWithCaps.provider)) {
    return true;
  }

  // Doubao 特殊处理
  if (modelWithCaps.provider === 'volc' || modelId.includes('doubao')) {
    return FUNCTION_CALLING_REGEX.test(modelId) || FUNCTION_CALLING_REGEX.test(norm(modelWithCaps.name || ''));
  }

  return FUNCTION_CALLING_REGEX.test(modelId);
}

// ============================================
// 其他能力识别
// ============================================

const WEB_SEARCH_REGEX = /perplexity|sonar|search-online/i;
const EMBEDDING_REGEX = /embedding|embed|vector/i;
const RERANK_REGEX = /rerank|reranker/i;
const IMAGE_GENERATION_REGEX = /flux|diffusion|stabilityai|sd-|dall|cogview|image|gpt-image/i;

/**
 * 判断模型是否具备网络搜索能力
 */
export function supportsWebSearch(modelWithCaps: ModelWithCapabilities): boolean {
  if (modelWithCaps.provider === 'perplexity') return true;
  return WEB_SEARCH_REGEX.test(norm(modelWithCaps.id));
}

/**
 * 判断模型是否为嵌入模型
 */
export function supportsEmbedding(modelWithCaps: ModelWithCapabilities): boolean {
  return EMBEDDING_REGEX.test(norm(modelWithCaps.id));
}

/**
 * 判断模型是否为重排序模型
 */
export function supportsRerank(modelWithCaps: ModelWithCapabilities): boolean {
  return RERANK_REGEX.test(norm(modelWithCaps.id));
}

/**
 * 判断模型是否支持图像生成
 */
export function supportsImageGeneration(modelWithCaps: ModelWithCapabilities): boolean {
  const modelId = norm(modelWithCaps.id);

  // 专用图像生成模型
  if (['dall-e-3', 'dall-e-2', 'gpt-image-1', 'grok-2-image'].some((m) => modelId.includes(m))) {
    return true;
  }

  // Gemini 对话式图像生成
  if (
    (modelWithCaps.provider === 'google' || modelWithCaps.provider === 'gemini') &&
    ['gemini-2.0-flash-exp', 'gemini-2.5-flash-image'].some((m) => modelId.includes(m))
  ) {
    return true;
  }

  return IMAGE_GENERATION_REGEX.test(modelId);
}

/**
 * 判断模型是否为免费模型
 */
export function isFreeModel(modelWithCaps: ModelWithCapabilities): boolean {
  const modelId = norm(modelWithCaps.id);
  const modelName = norm(modelWithCaps.name || '');
  return modelId.includes('free') || modelName.includes('free') || modelWithCaps.provider === 'cherryai';
}

// ============================================
// 标签管理
// ============================================

/**
 * 获取模型的所有能力标签
 *
 * @param modelWithCaps - 模型信息
 * @returns 模型具备的所有标签数组
 *
 * @example
 * ```typescript
 * getModelTags({ id: 'gpt-4-vision', provider: 'openai' })
 * // => ['vision', 'function_calling']
 *
 * getModelTags({ id: 'deepseek-r1', provider: 'deepseek' })
 * // => ['reasoning', 'function_calling']
 * ```
 */
export function getModelTags(modelWithCaps: ModelWithCapabilities): ModelTag[] {
  const tags: ModelTag[] = [];

  if (supportsReasoning(modelWithCaps)) tags.push('reasoning');
  if (supportsVision(modelWithCaps.provider as ProviderId, modelWithCaps.id, modelWithCaps)) tags.push('vision');
  if (supportsFunctionCalling(modelWithCaps)) tags.push('function_calling');
  if (supportsWebSearch(modelWithCaps)) tags.push('web_search');
  if (supportsEmbedding(modelWithCaps)) tags.push('embedding');
  if (supportsRerank(modelWithCaps)) tags.push('rerank');
  if (supportsImageGeneration(modelWithCaps)) tags.push('image_generation');
  if (isFreeModel(modelWithCaps)) tags.push('free');

  return tags;
}

/**
 * 汇总模型的能力描述，用于 UI/服务统一读取
 */
export function describeModelCapabilities(modelWithCaps: ModelWithCapabilities): ModelCapabilityDescriptor {
  const provider = asProviderId(modelWithCaps.provider);
  const normalizedModel: ModelWithCapabilities = {
    ...modelWithCaps,
    provider,
  };

  const reasoning = supportsReasoning(normalizedModel);

  return {
    modelId: normalizedModel.id,
    provider,
    tags: getModelTags(normalizedModel),
    reasoning,
    vision: supportsVision(provider, normalizedModel.id, normalizedModel),
    functionCalling: supportsFunctionCalling(normalizedModel),
    webSearch: supportsWebSearch(normalizedModel),
    embedding: supportsEmbedding(normalizedModel),
    rerank: supportsRerank(normalizedModel),
    imageGeneration: supportsImageGeneration(normalizedModel),
    providerOptions: reasoning ? getProviderOptionsForModel(provider, normalizedModel.id) : {},
  };
}

// 日志记录
logger.info('[ModelCapabilities] 模型能力管理系统已加载', {
  supportedCapabilities: [
    'reasoning',
    'vision',
    'function_calling',
    'web_search',
    'embedding',
    'rerank',
    'image_generation',
  ],
});
