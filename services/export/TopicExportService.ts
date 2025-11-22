import * as FileSystemLegacy from 'expo-file-system/legacy';
import { logger } from '@/utils/logger';
import { ExportRepository } from '@/storage/repositories/export';
import {
  ExportOptions,
  ExportResult,
  ProgressCallback,
  DEFAULT_EXPORT_OPTIONS,
} from './types';
import { DocxGenerator } from './DocxGenerator';

/**
 * TopicExportService - 话题导出服务
 *
 * 提供话题导出功能，支持导出为 DOCX 格式
 * 包含完整的消息、思考链、MCP 工具调用和附件信息
 */
export class TopicExportService {
  private conversationId: string;
  private options: ExportOptions;
  private progressCallback?: ProgressCallback;

  constructor(conversationId: string, options?: Partial<ExportOptions>) {
    this.conversationId = conversationId;
    this.options = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  }

  /**
   * 设置进度回调函数
   */
  onProgress(callback: ProgressCallback): this {
    this.progressCallback = callback;
    return this;
  }

  /**
   * 导出为 DOCX 格式
   *
   * @returns 导出结果（包含文件路径）
   */
  async exportToDocx(): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      logger.info('TopicExportService: Starting DOCX export', {
        conversationId: this.conversationId,
        options: this.options,
      });

      // 1. 加载数据
      this.reportProgress('loading', 10, '正在加载话题数据...');
      const exportData = await ExportRepository.getTopicExportData(this.conversationId);

      if (!exportData) {
        throw new Error('话题未找到');
      }

      logger.debug('TopicExportService: Loaded export data', {
        messageCount: exportData.messageCount,
        conversationTitle: exportData.conversation.title,
      });

      // 2. 生成文档
      this.reportProgress('generating', 40, '正在生成 DOCX 文档...');
      const generator = new DocxGenerator(exportData, this.options);
      const filePath = await generator.generate();

      // 3. 获取文件信息
      this.reportProgress('saving', 90, '正在完成...');
      const fileInfo = await FileSystemLegacy.getInfoAsync(filePath);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // 4. 完成
      const durationMs = Date.now() - startTime;
      this.reportProgress('complete', 100, '导出完成！');

      const result: ExportResult = {
        filePath,
        fileSize,
        messageCount: exportData.messageCount,
        durationMs,
      };

      logger.info('TopicExportService: Export completed successfully', result);

      return result;
    } catch (error) {
      logger.error('TopicExportService: Export failed', error, {
        conversationId: this.conversationId,
      });
      throw error;
    }
  }

  /**
   * 报告导出进度
   * @private
   */
  private reportProgress(
    stage: 'loading' | 'converting' | 'generating' | 'saving' | 'complete',
    percentage: number,
    message: string
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        percentage,
        message,
      });
    }
  }

  /**
   * 保存临时文件到文件系统
   * @private
   */
  private async saveTemporaryFile(filename: string, content: string): Promise<string> {
    const tempDir = FileSystemLegacy.cacheDirectory;
    if (!tempDir) {
      throw new Error('无法访问临时目录');
    }

    const filePath = `${tempDir}${filename}`;

    // 确保目录存在
    const dirInfo = await FileSystemLegacy.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystemLegacy.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    // 写入文件
    await FileSystemLegacy.writeAsStringAsync(filePath, content, {
      encoding: 'utf8',
    });

    return filePath;
  }
}

/**
 * 创建导出服务实例的工厂方法
 */
export function createExportService(
  conversationId: string,
  options?: Partial<ExportOptions>
): TopicExportService {
  return new TopicExportService(conversationId, options);
}
