/**
 * AI Services Module
 * AI 服务模块统一导出
 *
 * 目录结构:
 * - AiClient.ts         核心 AI 客户端（文本流式补全 + 图片生成）
 * - capabilities/       模型能力识别和标签管理
 * - integration/        MCP 工具集成和第三方集成
 * - discovery/          模型发现和自定义模型发现
 * - validation/         模型验证和自定义模型验证
 * - utils/              错误处理、话题命名等工具函数
 */

// ============================================
// Core AI Client - 核心 AI 客户端
// ============================================
export {
  streamCompletion,
  generateImageWithAI,
  type Provider,
  type StreamOptions,
  type GenerateImageOptions,
  type ImageGenerationResult,
  type ToolCallArgs,
  type ToolCallResult,
} from './AiClient';

// ============================================
// API Key Manager - 多 Key 轮询管理
// ============================================
export { ApiKeyManager } from './ApiKeyManager';

// ============================================
// Model Capabilities - 模型能力
// ============================================
export {
  describeModelCapabilities,
  getModelTags,
  supportsVision,
  supportsReasoning,
  supportsFunctionCalling,
  supportsWebSearch,
  supportsEmbedding,
  supportsRerank,
  supportsImageGeneration,
  isFreeModel,
  isReasoningModel,
  getProviderOptionsForModel,
  type ProviderId,
  type ModelCapabilityType,
  type ModelTag,
  type ModelWithCapabilities,
  type ModelCapabilityDescriptor,
  type ProviderOptions,
} from './capabilities';

// ============================================
// MCP Integration - MCP 工具集成
// ============================================
export {
  getAllActiveTools,
} from './integration';

// ============================================
// Model Discovery - 模型发现
// ============================================
export {
  fetchProviderModels,
  type DiscoveredModel,
} from './discovery/ModelDiscovery';

export {
  fetchCustomProviderModels,
} from './discovery/CustomModelDiscovery';

// ============================================
// Model Validation - 模型验证
// ============================================
export {
  validateProviderModel,
} from './validation/ModelValidation';

export {
  validateCustomProviderModel,
} from './validation/CustomModelValidation';

export {
  validateModelWithTarget,
  type ValidateResult,
  type ValidationTargetType,
  type ValidationTarget,
} from './validation/modelValidationHelper';

// ============================================
// AI Utilities - 工具函数
// ============================================
export {
  ImageGenerationError,
  ImageModelResolutionError,
} from '@/utils/errors';

export {
  autoNameConversation,
} from './utils/TopicNaming';
