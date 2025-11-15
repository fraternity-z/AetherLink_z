export interface IKeyValueStore {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  multiGet(keys: string[]): Promise<Record<string, any>>;
  multiSet(entries: Record<string, any>): Promise<void>;
  clearNamespace(prefix: string): Promise<void>;
}

export const prefixer = (ns: string) => (k: string) => `al:${ns}:${k}`;

export const safeJSON = {
  parse<T = any>(input: string | null): T | null {
    if (!input) return null;
    try {
      return JSON.parse(input) as T;
    } catch {
      return null;
    }
  },
  stringify(input: any): string {
    try {
      return JSON.stringify(input);
    } catch {
      return 'null';
    }
  },
};

export const now = () => Date.now();

export type Role = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  extra?: any;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  text?: string | null;
  createdAt: number;
  status: 'pending' | 'sent' | 'failed';
  parentId?: string | null;
  extra?: any;
}

export type AttachmentKind = 'image' | 'file' | 'audio' | 'video';

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  mime?: string | null;
  name?: string | null;
  uri: string | null; // local/private uri; null for restored attachments without files
  size?: number | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sha256?: string | null;
  createdAt: number;
  extra?: any;
}

/**
 * 思考链(Chain of Thought/Reasoning)数据结构
 * 用于存储 AI 模型的思考过程(仅支持 OpenAI o1/o3、DeepSeek R1 等推理模型)
 */
export interface ThinkingChain {
  id: string;              // 主键
  messageId: string;       // 关联的消息 ID
  content: string;         // 完整的思考过程内容
  startTime: number;       // 开始时间戳 (毫秒)
  endTime: number;         // 结束时间戳 (毫秒)
  durationMs: number;      // 耗时 (毫秒)
  tokenCount?: number | null; // 思考链使用的 token 数量 (可选)
  extra?: any;             // 扩展字段
}

/**
 * 快捷短语(Quick Phrase)数据结构
 * 用于存储用户的常用短语，方便在聊天中快速插入
 */
export interface QuickPhrase {
  id: string;              // 主键
  title: string;           // 短语标题(供列表显示)
  content: string;         // 短语内容(插入到输入框)
  icon?: string | null;    // 图标(支持 Emoji 或图标名称)
  color?: string | null;   // 颜色(用于视觉区分)
  sortOrder: number;       // 排序顺序
  createdAt: number;       // 创建时间戳 (毫秒)
  updatedAt: number;       // 更新时间戳 (毫秒)
}

/**
 * 消息块类型
 * - TEXT: 普通文本块
 * - TOOL: MCP 工具调用块
 *
 * 思考链内容已迁移至独立的 ThinkingChain 表，不再使用消息块承载。
 */
export type MessageBlockType = 'TEXT' | 'TOOL';

/**
 * 消息块状态
 * - PENDING: 执行中
 * - SUCCESS: 执行成功
 * - ERROR: 执行失败
 */
export type MessageBlockStatus = 'PENDING' | 'SUCCESS' | 'ERROR';

/**
 * 消息块(Message Block)数据结构
 * 用于存储消息的结构化内容块（文本、工具调用等）
 *
 * 设计理念参考 Cherry Studio:
 * - 每个消息可以包含多个块
 * - 块可以是文本、工具调用、思考链等
 * - 工具块用于展示 MCP 工具的执行过程和结果
 */
export interface MessageBlock {
  id: string;              // 主键
  messageId: string;       // 关联的消息 ID
  type: MessageBlockType;  // 块类型
  status: MessageBlockStatus; // 块状态
  content: string;         // 块内容（文本、工具结果等）
  sortOrder: number;       // 排序顺序（块在消息中的位置）

  // 工具调用专用字段（仅当 type === 'TOOL' 时有效）
  toolCallId?: string | null;   // AI SDK 生成的工具调用 ID
  toolName?: string | null;     // 工具名称
  toolArgs?: string | null;     // 工具参数（JSON 字符串）

  createdAt: number;       // 创建时间戳 (毫秒)
  updatedAt: number;       // 更新时间戳 (毫秒)
  extra?: any;             // 扩展字段
}

export function uuid(): string {
  // RFC4122 v4-like uuid (non-crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

