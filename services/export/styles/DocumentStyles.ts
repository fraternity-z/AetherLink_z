import {
  AlignmentType,
  convertInchesToTwip,
  Header,
  Footer,
  Paragraph,
  TextRun,
  PageNumber,
  NumberFormat,
} from 'docx';

/**
 * 文档样式配置
 *
 * 定义导出文档的统一样式：页眉、页脚、字体、颜色等
 */
export class DocumentStyles {
  /**
   * 创建页眉
   *
   * @param topicTitle 话题标题
   * @param exportDate 导出日期
   */
  static createHeader(topicTitle: string, exportDate: Date): Header {
    const dateString = exportDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: topicTitle || '未命名话题',
              bold: true,
              size: 20,
              color: '333333',
            }),
            new TextRun({
              text: ` | 导出时间: ${dateString}`,
              size: 18,
              color: '999999',
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: {
            after: 120,
          },
          border: {
            bottom: {
              color: 'CCCCCC',
              space: 1,
              style: 'single',
              size: 6,
            },
          },
        }),
      ],
    });
  }

  /**
   * 创建页脚（显示页码）
   */
  static createFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: '第 ',
              size: 18,
              color: '999999',
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              size: 18,
              color: '999999',
            }),
            new TextRun({
              text: ' 页 / 共 ',
              size: 18,
              color: '999999',
            }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              size: 18,
              color: '999999',
            }),
            new TextRun({
              text: ' 页',
              size: 18,
              color: '999999',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 120,
          },
          border: {
            top: {
              color: 'CCCCCC',
              space: 1,
              style: 'single',
              size: 6,
            },
          },
        }),
      ],
    });
  }

  /**
   * 创建消息分隔符（用于分隔不同的消息）
   */
  static createMessageSeparator(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: '─'.repeat(60),
          color: 'E0E0E0',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 200,
        after: 200,
      },
    });
  }

  /**
   * 创建消息元信息段落（发送者 + 时间）
   *
   * @param role 消息角色 ('user' | 'assistant' | 'system')
   * @param timestamp 时间戳
   */
  static createMessageMetadata(
    role: 'user' | 'assistant' | 'system',
    timestamp: number
  ): Paragraph {
    const roleText = this.getRoleText(role);
    const timeString = new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return new Paragraph({
      children: [
        new TextRun({
          text: `【${roleText}】`,
          bold: true,
          size: 20,
          color: this.getRoleColor(role),
        }),
        new TextRun({
          text: ` ${timeString}`,
          size: 18,
          color: '999999',
        }),
      ],
      spacing: {
        before: 240,
        after: 120,
      },
    });
  }

  /**
   * 获取角色文本
   * @private
   */
  private static getRoleText(role: 'user' | 'assistant' | 'system'): string {
    switch (role) {
      case 'user':
        return '👤 用户';
      case 'assistant':
        return '🤖 助手';
      case 'system':
        return '⚙️ 系统';
      default:
        return role;
    }
  }

  /**
   * 获取角色对应的颜色
   * @private
   */
  private static getRoleColor(role: 'user' | 'assistant' | 'system'): string {
    switch (role) {
      case 'user':
        return '4A90E2'; // 蓝色
      case 'assistant':
        return '27AE60'; // 绿色
      case 'system':
        return 'E67E22'; // 橙色
      default:
        return '333333';
    }
  }

  /**
   * 文档默认编号配置
   */
  static getNumberingConfig() {
    return {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
    };
  }
}
