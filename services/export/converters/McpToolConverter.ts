import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
} from 'docx';
import { MessageBlock } from '@/storage/core';

/**
 * MCP 工具调用转换器 - 将 MCP 工具调用转换为 DOCX 表格
 *
 * 完整导出模式：包含工具名、参数（JSON）、执行结果
 * 支持敏感信息脱敏
 */
export class McpToolConverter {
  private sanitizeSensitiveData: boolean;

  constructor(options?: { sanitizeSensitiveData?: boolean }) {
    this.sanitizeSensitiveData = options?.sanitizeSensitiveData ?? true;
  }

  /**
   * 将 MCP 工具调用块转换为 DOCX 段落和表格
   *
   * @param blocks 消息块列表（仅处理 type === 'TOOL' 的块）
   * @returns DOCX 段落和表格对象数组
   */
  convertToParagraphs(blocks: MessageBlock[]): Array<Paragraph | Table> {
    const toolBlocks = blocks.filter(block => block.type === 'TOOL');

    if (toolBlocks.length === 0) {
      return [];
    }

    const elements: Array<Paragraph | Table> = [];

    // 添加标题
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '🛠️ ',
            size: 20,
          }),
          new TextRun({
            text: 'MCP 工具调用',
            size: 20,
            bold: true,
            color: 'E67E22',
          }),
        ],
        spacing: {
          before: 120,
          after: 60,
        },
      })
    );

    // 为每个工具调用创建表格
    for (const block of toolBlocks) {
      elements.push(this.createToolTable(block));
      // 添加间距
      elements.push(new Paragraph({ text: '' }));
    }

    return elements;
  }

  /**
   * 创建单个工具调用的表格
   * @private
   */
  private createToolTable(block: MessageBlock): Table {
    const rows: TableRow[] = [];

    // 行 1: 工具名称
    if (block.toolName) {
      rows.push(this.createTableRow('工具名称', block.toolName));
    }

    // 行 2: 调用时间
    const callTime = new Date(block.createdAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    rows.push(this.createTableRow('调用时间', callTime));

    // 行 3: 参数（JSON 格式）
    if (block.toolArgs) {
      const sanitizedArgs = this.sanitizeSensitiveData
        ? this.sanitizeJson(block.toolArgs)
        : block.toolArgs;
      const formattedArgs = this.formatJson(sanitizedArgs);
      rows.push(this.createTableRow('参数', formattedArgs));
    }

    // 行 4: 执行状态
    const statusText = this.getStatusText(block.status);
    rows.push(this.createTableRow('执行状态', statusText));

    // 行 5: 结果
    if (block.content) {
      const sanitizedContent = this.sanitizeSensitiveData
        ? this.sanitizeText(block.content)
        : block.content;
      rows.push(this.createTableRow('结果', sanitizedContent));
    }

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      },
    });
  }

  /**
   * 创建表格行
   * @private
   */
  private createTableRow(label: string, value: string): TableRow {
    return new TableRow({
      children: [
        // 左列：标签
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  size: 18,
                }),
              ],
            }),
          ],
          width: {
            size: 20,
            type: WidthType.PERCENTAGE,
          },
          shading: {
            type: 'solid',
            color: 'FFF9E6', // 浅黄色背景
          },
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: convertInchesToTwip(0.05),
            bottom: convertInchesToTwip(0.05),
            left: convertInchesToTwip(0.1),
            right: convertInchesToTwip(0.1),
          },
        }),
        // 右列：值
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: value,
                  size: 18,
                  font: value.includes('{') || value.includes('[') ? 'Consolas' : undefined,
                }),
              ],
            }),
          ],
          width: {
            size: 80,
            type: WidthType.PERCENTAGE,
          },
          verticalAlign: VerticalAlign.TOP,
          margins: {
            top: convertInchesToTwip(0.05),
            bottom: convertInchesToTwip(0.05),
            left: convertInchesToTwip(0.1),
            right: convertInchesToTwip(0.1),
          },
        }),
      ],
    });
  }

  /**
   * 获取状态文本
   * @private
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return '✅ 成功';
      case 'ERROR':
        return '❌ 失败';
      case 'PENDING':
        return '⏳ 执行中';
      default:
        return status;
    }
  }

  /**
   * 格式化 JSON 字符串（添加缩进）
   * @private
   */
  private formatJson(jsonString: string): string {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  }

  /**
   * 脱敏 JSON 字符串中的敏感信息
   * @private
   */
  private sanitizeJson(jsonString: string): string {
    try {
      const obj = JSON.parse(jsonString);
      const sanitized = this.sanitizeObject(obj);
      return JSON.stringify(sanitized);
    } catch {
      return this.sanitizeText(jsonString);
    }
  }

  /**
   * 脱敏对象中的敏感字段
   * @private
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sensitiveKeys = [
      'apiKey',
      'api_key',
      'apikey',
      'token',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'secret',
      'password',
      'pwd',
      'pass',
      'key',
      'authorization',
      'auth',
      'credential',
      'credentials',
    ];

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive && typeof value === 'string') {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  /**
   * 脱敏普通文本中的敏感信息
   * @private
   */
  private sanitizeText(text: string): string {
    // 脱敏看起来像 token 的字符串（长度 > 20 的字母数字混合字符串）
    return text.replace(/\b([a-zA-Z0-9_-]{20,})\b/g, match => {
      // 保留前 4 个和后 4 个字符
      if (match.length > 8) {
        return match.substring(0, 4) + '***' + match.substring(match.length - 4);
      }
      return match;
    });
  }
}
