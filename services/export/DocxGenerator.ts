import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { logger } from '@/utils/logger';
import { TopicExportData, MessageExportData } from '@/storage/repositories/export';
import { ExportOptions } from './types';
import { MarkdownConverter } from './converters/MarkdownConverter';
import { ThinkingChainConverter } from './converters/ThinkingChainConverter';
import { McpToolConverter } from './converters/McpToolConverter';
import { AttachmentConverter } from './converters/AttachmentConverter';
import { DocumentStyles } from './styles/DocumentStyles';

/**
 * DOCX 文档生成器
 *
 * 整合所有转换器，生成完整的 DOCX 文档
 */
export class DocxGenerator {
  private exportData: TopicExportData;
  private options: ExportOptions;

  // 转换器实例
  private markdownConverter: MarkdownConverter;
  private thinkingChainConverter: ThinkingChainConverter;
  private mcpToolConverter: McpToolConverter;
  private attachmentConverter: AttachmentConverter;

  constructor(exportData: TopicExportData, options: ExportOptions) {
    this.exportData = exportData;
    this.options = options;

    // 初始化转换器
    this.markdownConverter = new MarkdownConverter();
    this.thinkingChainConverter = new ThinkingChainConverter();
    this.mcpToolConverter = new McpToolConverter({
      sanitizeSensitiveData: options.sanitizeSensitiveData,
    });
    this.attachmentConverter = new AttachmentConverter();
  }

  /**
   * 生成 DOCX 文档并保存到文件
   *
   * @returns 文件路径
   */
  async generate(): Promise<string> {
    try {
      logger.info('DocxGenerator: Starting document generation', {
        messageCount: this.exportData.messages.length,
        options: this.options,
      });

      // 1. 创建文档对象
      const doc = this.createDocument();

      // 2. 生成 Base64 字符串（React Native 兼容）
      // 使用 toBase64String 替代 toBlob，因为 React Native 不支持 Blob API
      const base64 = await Packer.toBase64String(doc);

      // 3. 保存到文件
      const filePath = await this.saveToFile(base64);

      logger.info('DocxGenerator: Document generated successfully', {
        filePath,
        base64Length: base64.length,
      });

      return filePath;
    } catch (error) {
      logger.error('DocxGenerator: Failed to generate document', error);
      throw error;
    }
  }

  /**
   * 创建 DOCX 文档对象
   * @private
   */
  private createDocument(): Document {
    const exportDate = new Date();
    const topicTitle = this.exportData.conversation.title || '未命名话题';

    // 构建文档内容
    const sections = [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: DocumentStyles.createHeader(topicTitle, exportDate),
        },
        footers: {
          default: DocumentStyles.createFooter(),
        },
        children: this.buildDocumentContent(),
      },
    ];

    return new Document({
      sections,
      numbering: DocumentStyles.getNumberingConfig(),
    });
  }

  /**
   * 构建文档内容（所有段落和表格）
   * @private
   */
  private buildDocumentContent(): Array<Paragraph | any> {
    const content: Array<Paragraph | any> = [];

    // 添加文档标题
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: this.exportData.conversation.title || '未命名话题',
            size: 32,
            bold: true,
          }),
        ],
        spacing: {
          after: 240,
        },
      })
    );

    // 添加统计信息
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `📊 总计 ${this.exportData.messageCount} 条消息`,
            size: 20,
            color: '666666',
          }),
        ],
        spacing: {
          after: 480,
        },
      })
    );

    // 遍历所有消息
    for (let i = 0; i < this.exportData.messages.length; i++) {
      const messageData = this.exportData.messages[i];

      // 添加消息分隔符（第一条消息除外）
      if (i > 0) {
        content.push(DocumentStyles.createMessageSeparator());
      }

      // 添加单条消息的内容
      content.push(...this.buildMessageContent(messageData));
    }

    return content;
  }

  /**
   * 构建单条消息的内容
   * @private
   */
  private buildMessageContent(messageData: MessageExportData): Array<Paragraph | any> {
    const content: Array<Paragraph | any> = [];
    const { message, thinkingChain, blocks, attachments } = messageData;

    // 1. 消息元信息（发送者 + 时间）
    content.push(DocumentStyles.createMessageMetadata(message.role, message.createdAt));

    // 2. 思考链（如果有且启用）
    if (this.options.includeThinking !== 'none' && thinkingChain) {
      const thinkingParagraphs = this.thinkingChainConverter.convertToParagraphs(
        thinkingChain,
        this.options.includeThinking
      );
      content.push(...thinkingParagraphs);
    }

    // 3. 消息正文内容
    if (message.text) {
      const textParagraphs = this.markdownConverter.convertToParagraphs(message.text);
      content.push(...textParagraphs);
    }

    // 4. MCP 工具调用（如果有且启用）
    if (this.options.includeMcpTools && blocks.length > 0) {
      const toolElements = this.mcpToolConverter.convertToParagraphs(blocks);
      content.push(...toolElements);
    }

    // 5. 附件信息（如果有且启用）
    if (this.options.includeAttachments && attachments.length > 0) {
      const attachmentParagraphs = this.attachmentConverter.convertToParagraphs(attachments);
      content.push(...attachmentParagraphs);
    }

    return content;
  }

  /**
   * 保存文件到文件系统
   * @private
   */
  private async saveToFile(base64: string): Promise<string> {
    const tempDir = FileSystemLegacy.cacheDirectory;
    if (!tempDir) {
      throw new Error('无法访问临时目录');
    }

    // 生成文件名（使用话题标题 + 时间戳）
    const sanitizedTitle = (this.exportData.conversation.title || '未命名话题')
      .replace(/[<>:"/\\|?*]/g, '_') // 移除非法字符
      .substring(0, 50); // 限制长度
    const timestamp = new Date().getTime();
    const fileName = `${sanitizedTitle}_${timestamp}.docx`;
    const filePath = `${tempDir}${fileName}`;

    // 确保目录存在
    const dirInfo = await FileSystemLegacy.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystemLegacy.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    // 写入文件
    await FileSystemLegacy.writeAsStringAsync(filePath, base64, {
      encoding: 'base64',
    });

    return filePath;
  }
}
