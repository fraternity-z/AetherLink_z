/**
 * 智能体（助手）类型定义
 *
 * 此文件定义了智能体相关的核心数据结构
 */

/**
 * 智能体助手
 */
export interface Assistant {
  /** 唯一标识 */
  id: string;

  /** 助手名称 */
  name: string;

  /** 描述信息 */
  description?: string;

  /** Emoji 表情图标 */
  emoji?: string;

  /** 系统提示词（核心） */
  systemPrompt?: string;

  /** 是否为系统预设助手（不可删除） */
  isSystem?: boolean;

  /** 助手类型 */
  type?: string;

  /** 标签 */
  tags?: string[];

  /** 创建时间 */
  createdAt?: string;

  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 提示词分类
 */
export type PromptCategory =
  | 'basic'           // 基础助手
  | 'professional'    // 专业职能
  | 'creative'        // 创意思维
  | 'advanced'        // 高级思维
  | 'experimental';   // 实验性（越狱提示词等）

/**
 * 提示词模板
 */
export interface PromptTemplate {
  /** 唯一标识 */
  id: string;

  /** 提示词名称 */
  name: string;

  /** 描述 */
  description?: string;

  /** 提示词内容 */
  content: string;

  /** 分类 */
  category: PromptCategory;

  /** 标签 */
  tags?: string[];

  /** Emoji 图标 */
  emoji?: string;
}
