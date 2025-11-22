/**
 * 导出格式
 */
export type ExportFormat = 'docx' | 'md';

/**
 * 思考链导出模式
 * - full: 完整导出思考过程和耗时
 * - summary: 仅导出摘要（提取关键结论）
 * - none: 不导出思考链
 */
export type ThinkingChainMode = 'full' | 'summary' | 'none';

/**
 * 导出选项配置
 */
export interface ExportOptions {
  /**
   * 思考链导出模式
   * @default 'full'
   */
  includeThinking: ThinkingChainMode;

  /**
   * 是否包含 MCP 工具调用详情
   * @default true
   */
  includeMcpTools: boolean;

  /**
   * 是否包含附件信息（文件名和类型）
   * @default true
   */
  includeAttachments: boolean;

  /**
   * 是否脱敏敏感数据（API Key、Token 等）
   * @default true
   */
  sanitizeSensitiveData: boolean;
}

/**
 * 导出进度回调函数
 */
export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * 导出进度信息
 */
export interface ExportProgress {
  /**
   * 当前阶段
   */
  stage: 'loading' | 'converting' | 'generating' | 'saving' | 'complete';

  /**
   * 进度百分比 (0-100)
   */
  percentage: number;

  /**
   * 当前处理的消息索引（可选）
   */
  currentMessage?: number;

  /**
   * 总消息数（可选）
   */
  totalMessages?: number;

  /**
   * 阶段描述文字
   */
  message: string;
}

/**
 * 导出结果
 */
export interface ExportResult {
  /**
   * 导出文件的本地路径
   */
  filePath: string;

  /**
   * 文件大小（字节）
   */
  fileSize: number;

  /**
   * 导出的消息数量
   */
  messageCount: number;

  /**
   * 导出耗时（毫秒）
   */
  durationMs: number;
}

/**
 * 默认导出选项
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeThinking: 'full',
  includeMcpTools: true,
  includeAttachments: true,
  sanitizeSensitiveData: true,
};
