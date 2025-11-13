import { Platform } from 'react-native';

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

export const isWeb = Platform.OS === 'web';
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

export function uuid(): string {
  // RFC4122 v4-like uuid (non-crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

