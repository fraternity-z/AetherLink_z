/**
 * 预设智能体助手数据
 *
 * 包含基础助手和扩展专业助手
 */

import type { Assistant } from '@/types/assistant';
import * as Prompts from './prompts';

/**
 * 基础预设助手列表
 */
export const BASE_ASSISTANTS: Assistant[] = [
  {
    id: 'default',
    name: '默认助手',
    description: '通用型AI助手，可以回答各种问题',
    emoji: '😀',
    isSystem: true,
    systemPrompt: Prompts.DEFAULT_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['通用', '基础'],
  },
  {
    id: 'web-analysis',
    name: '网页分析助手',
    description: '帮助分析各种网页内容',
    emoji: '🌐',
    isSystem: true,
    systemPrompt: Prompts.WEB_ANALYSIS_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['网页', '分析'],
  },
  {
    id: 'code-assistant',
    name: '编程助手',
    description: '专业的编程助手，能够解答各种编程问题并提供代码示例',
    emoji: '💻',
    isSystem: true,
    systemPrompt: Prompts.PROGRAMMING_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['编程', '代码'],
  },
  {
    id: 'translate-assistant',
    name: '翻译助手',
    description: '专业的翻译助手，可以在不同语言之间进行准确的翻译',
    emoji: '🌍',
    isSystem: true,
    systemPrompt: Prompts.TRANSLATION_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['翻译', '语言'],
  },
  {
    id: 'writing-assistant',
    name: '写作助手',
    description: '专业的写作助手，可以帮助改进文章、报告和其他文本内容',
    emoji: '✍️',
    isSystem: true,
    systemPrompt: Prompts.WRITING_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['写作', '文本'],
  },
];

/**
 * 扩展专业助手列表
 */
export const EXTENDED_ASSISTANTS: Assistant[] = [
  {
    id: 'math-assistant',
    name: '数学助手',
    description: '专业的数学助手，能够解答各种数学问题，从基础算术到高等数学',
    emoji: '🔢',
    isSystem: true,
    systemPrompt: Prompts.MATH_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['数学', '理科'],
  },
  {
    id: 'history-assistant',
    name: '历史顾问',
    description: '专业的历史顾问，对世界各地的历史事件、人物和文化有深入的了解',
    emoji: '📜',
    isSystem: true,
    systemPrompt: Prompts.HISTORY_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['历史', '文科'],
  },
  {
    id: 'travel-assistant',
    name: '旅行规划助手',
    description: '专业的旅行规划助手，帮助规划旅行路线、推荐景点和活动',
    emoji: '✈️',
    isSystem: true,
    systemPrompt: Prompts.TRAVEL_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['旅行', '规划'],
  },
  {
    id: 'health-assistant',
    name: '健康顾问',
    description: '健康生活顾问，提供健康饮食、锻炼计划等方面的一般性建议',
    emoji: '🩺',
    isSystem: true,
    systemPrompt: Prompts.HEALTH_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['健康', '生活'],
  },
  {
    id: 'movie-assistant',
    name: '电影专家',
    description: '电影专家，可推荐电影、分析电影主题和讨论电影的文化影响',
    emoji: '🎬',
    isSystem: true,
    systemPrompt: Prompts.MOVIE_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['电影', '娱乐'],
  },
  {
    id: 'cooking-assistant',
    name: '美食顾问',
    description: '美食顾问，提供烹饪建议、食谱推荐和食物搭配指南',
    emoji: '🍳',
    isSystem: true,
    systemPrompt: Prompts.COOKING_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['美食', '烹饪'],
  },
  {
    id: 'emotional-assistant',
    name: '情感支持助手',
    description: '提供情感支持和倾听服务的对话伙伴',
    emoji: '💗',
    isSystem: true,
    systemPrompt: Prompts.EMOTIONAL_SUPPORT_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['情感', '心理'],
  },
  {
    id: 'education-assistant',
    name: '学习教育助手',
    description: '帮助理解各种学科概念和主题的教育助手',
    emoji: '🎓',
    isSystem: true,
    systemPrompt: Prompts.EDUCATION_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['教育', '学习'],
  },
  {
    id: 'business-assistant',
    name: '商业咨询助手',
    description: '提供创业、营销、管理和商业策略方面建议的商业助手',
    emoji: '💼',
    isSystem: true,
    systemPrompt: Prompts.BUSINESS_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['商业', '管理'],
  },
  {
    id: 'tech-assistant',
    name: '科技解说助手',
    description: '以通俗易懂的方式解释各种科技概念、产品和趋势',
    emoji: '📱',
    isSystem: true,
    systemPrompt: Prompts.TECH_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['科技', '数码'],
  },
  {
    id: 'creative-writing-assistant',
    name: '创意写作助手',
    description: '帮助故事创作、诗歌写作和剧本开发的创意写作助手',
    emoji: '📝',
    isSystem: true,
    systemPrompt: Prompts.CREATIVE_WRITING_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['创意', '写作'],
  },
  {
    id: 'legal-assistant',
    name: '法律咨询助手',
    description: '提供基本法律概念解释和一般性法律信息的助手',
    emoji: '⚖️',
    isSystem: true,
    systemPrompt: Prompts.LEGAL_ASSISTANT_PROMPT,
    type: 'assistant',
    tags: ['法律', '咨询'],
  },
];

/**
 * 所有系统预设助手
 */
export const SYSTEM_ASSISTANTS: Assistant[] = [
  ...BASE_ASSISTANTS,
  ...EXTENDED_ASSISTANTS,
];

/**
 * 根据 ID 获取助手
 */
export function getAssistantById(id: string): Assistant | undefined {
  return SYSTEM_ASSISTANTS.find((a) => a.id === id);
}

/**
 * 根据标签筛选助手
 */
export function getAssistantsByTag(tag: string): Assistant[] {
  return SYSTEM_ASSISTANTS.filter((a) => a.tags?.includes(tag));
}
