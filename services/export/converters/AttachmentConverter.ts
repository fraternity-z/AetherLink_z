import { Paragraph, TextRun } from 'docx';
import { Attachment, AttachmentKind } from '@/storage/core';

/**
 * 附件转换器 - 将附件信息转换为 DOCX 段落
 *
 * 仅展示附件的元信息（文件名、类型、大小），不嵌入文件内容
 */
export class AttachmentConverter {
  /**
   * 将附件列表转换为 DOCX 段落
   *
   * @param attachments 附件列表
   * @returns DOCX Paragraph 对象数组
   */
  convertToParagraphs(attachments: Attachment[]): Paragraph[] {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const paragraphs: Paragraph[] = [];

    // 添加标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '📎 ',
            size: 20,
          }),
          new TextRun({
            text: '附件',
            size: 20,
            bold: true,
            color: '8E44AD',
          }),
        ],
        spacing: {
          before: 120,
          after: 60,
        },
      })
    );

    // 为每个附件添加一行
    for (const attachment of attachments) {
      paragraphs.push(this.createAttachmentItem(attachment));
    }

    return paragraphs;
  }

  /**
   * 创建单个附件的段落
   * @private
   */
  private createAttachmentItem(attachment: Attachment): Paragraph {
    const icon = this.getIconForKind(attachment.kind);
    const fileName = attachment.name || '未命名文件';
    const fileSize = this.formatFileSize(attachment.size);
    const kindText = this.getKindText(attachment.kind);

    return new Paragraph({
      children: [
        new TextRun({
          text: `${icon} `,
          size: 18,
        }),
        new TextRun({
          text: fileName,
          size: 18,
          bold: true,
        }),
        new TextRun({
          text: ` (${kindText}${fileSize ? ', ' + fileSize : ''})`,
          size: 18,
          color: '666666',
        }),
      ],
      bullet: {
        level: 0,
      },
      spacing: {
        line: 260,
      },
    });
  }

  /**
   * 根据附件类型获取 emoji 图标
   * @private
   */
  private getIconForKind(kind: AttachmentKind): string {
    switch (kind) {
      case 'image':
        return '📷';
      case 'file':
        return '📄';
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      default:
        return '📦';
    }
  }

  /**
   * 获取附件类型的文本描述
   * @private
   */
  private getKindText(kind: AttachmentKind): string {
    switch (kind) {
      case 'image':
        return '图片';
      case 'file':
        return '文档';
      case 'audio':
        return '音频';
      case 'video':
        return '视频';
      default:
        return '文件';
    }
  }

  /**
   * 格式化文件大小
   * @private
   */
  private formatFileSize(size?: number | null): string {
    if (!size || size <= 0) {
      return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }

    return `${fileSize.toFixed(fileSize < 10 ? 1 : 0)} ${units[unitIndex]}`;
  }
}
