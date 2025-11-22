import {
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';

/**
 * Markdown 转换器 - 将 Markdown 文本转换为 DOCX 段落
 *
 * 支持的 Markdown 语法：
 * - 标题 (#, ##, ###)
 * - 粗体 (**text**)
 * - 斜体 (*text*)
 * - 行内代码 (`code`)
 * - 代码块 (```language```)
 * - 列表 (-, 1.)
 * - 引用 (>)
 * - 链接 ([text](url))
 */
export class MarkdownConverter {
  /**
   * 将 Markdown 文本转换为 DOCX 段落数组
   *
   * @param markdown Markdown 格式的文本
   * @returns DOCX Paragraph 对象数组
   */
  convertToParagraphs(markdown: string): Paragraph[] {
    if (!markdown || markdown.trim() === '') {
      return [];
    }

    const paragraphs: Paragraph[] = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 处理代码块
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // 开始代码块
          inCodeBlock = true;
          codeBlockLanguage = line.trim().substring(3);
          codeBlockLines = [];
        } else {
          // 结束代码块
          inCodeBlock = false;
          paragraphs.push(this.createCodeBlock(codeBlockLines, codeBlockLanguage));
          codeBlockLines = [];
          codeBlockLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // 处理普通行
      if (line.trim() === '') {
        // 空行
        paragraphs.push(new Paragraph({ text: '' }));
      } else if (line.startsWith('#')) {
        // 标题
        paragraphs.push(this.createHeading(line));
      } else if (line.trimStart().startsWith('-') || line.trimStart().startsWith('*')) {
        // 无序列表
        paragraphs.push(this.createBulletPoint(line));
      } else if (/^\s*\d+\./.test(line)) {
        // 有序列表
        paragraphs.push(this.createNumberedPoint(line));
      } else if (line.trimStart().startsWith('>')) {
        // 引用
        paragraphs.push(this.createQuote(line));
      } else {
        // 普通段落
        paragraphs.push(this.createParagraph(line));
      }
    }

    // 处理未闭合的代码块
    if (inCodeBlock && codeBlockLines.length > 0) {
      paragraphs.push(this.createCodeBlock(codeBlockLines, codeBlockLanguage));
    }

    return paragraphs;
  }

  /**
   * 创建标题段落
   * @private
   */
  private createHeading(line: string): Paragraph {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) {
      return this.createParagraph(line);
    }

    const level = match[1].length;
    const text = match[2];

    const headingLevels = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
      HeadingLevel.HEADING_5,
      HeadingLevel.HEADING_6,
    ];

    return new Paragraph({
      text,
      heading: headingLevels[level - 1],
      spacing: {
        before: 240,
        after: 120,
      },
    });
  }

  /**
   * 创建普通段落（支持行内格式）
   * @private
   */
  private createParagraph(line: string): Paragraph {
    const textRuns = this.parseInlineFormats(line);

    return new Paragraph({
      children: textRuns,
      spacing: {
        line: 276, // 1.15 倍行高
      },
    });
  }

  /**
   * 创建代码块
   * @private
   */
  private createCodeBlock(lines: string[], language?: string): Paragraph {
    const codeText = lines.join('\n');

    return new Paragraph({
      children: [
        new TextRun({
          text: codeText,
          font: 'Consolas',
          size: 18, // 9pt
        }),
      ],
      shading: {
        type: 'solid',
        color: 'F5F5F5',
      },
      spacing: {
        before: 120,
        after: 120,
        line: 276,
      },
      indent: {
        left: convertInchesToTwip(0.5),
      },
    });
  }

  /**
   * 创建无序列表项
   * @private
   */
  private createBulletPoint(line: string): Paragraph {
    const text = line.replace(/^\s*[-*]\s+/, '');
    const textRuns = this.parseInlineFormats(text);

    return new Paragraph({
      children: textRuns,
      bullet: {
        level: 0,
      },
      spacing: {
        line: 276,
      },
    });
  }

  /**
   * 创建有序列表项
   * @private
   */
  private createNumberedPoint(line: string): Paragraph {
    const text = line.replace(/^\s*\d+\.\s+/, '');
    const textRuns = this.parseInlineFormats(text);

    return new Paragraph({
      children: textRuns,
      numbering: {
        reference: 'default-numbering',
        level: 0,
      },
      spacing: {
        line: 276,
      },
    });
  }

  /**
   * 创建引用段落
   * @private
   */
  private createQuote(line: string): Paragraph {
    const text = line.replace(/^\s*>\s+/, '');
    const textRuns = this.parseInlineFormats(text);

    return new Paragraph({
      children: textRuns,
      shading: {
        type: 'solid',
        color: 'F0F0F0',
      },
      indent: {
        left: convertInchesToTwip(0.5),
      },
      border: {
        left: {
          color: '4A90E2',
          space: 1,
          style: 'single',
          size: 6,
        },
      },
      spacing: {
        line: 276,
      },
    });
  }

  /**
   * 解析行内格式（粗体、斜体、行内代码、链接）
   * @private
   */
  private parseInlineFormats(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let currentIndex = 0;

    // 正则表达式匹配行内格式
    // 优先级：代码 > 粗体 > 斜体 > 链接
    const patterns = [
      { regex: /`([^`]+)`/g, type: 'code' },
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /\*([^*]+)\*/g, type: 'italic' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
    ];

    // 找到所有匹配项并按位置排序
    const matches: Array<{
      start: number;
      end: number;
      type: string;
      text: string;
      url?: string;
    }> = [];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = regex.lastIndex;
        const content = match[1];
        const url = match[2];

        // 检查是否与现有匹配项重叠
        const overlaps = matches.some(
          m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end)
        );

        if (!overlaps) {
          matches.push({
            start,
            end,
            type,
            text: content,
            url,
          });
        }
      }
    }

    // 按起始位置排序
    matches.sort((a, b) => a.start - b.start);

    // 构建 TextRun 数组
    for (const match of matches) {
      // 添加匹配前的普通文本
      if (match.start > currentIndex) {
        const plainText = text.substring(currentIndex, match.start);
        if (plainText) {
          runs.push(new TextRun({ text: plainText }));
        }
      }

      // 添加格式化文本
      switch (match.type) {
        case 'code':
          runs.push(
            new TextRun({
              text: match.text,
              font: 'Consolas',
              size: 18,
              shading: {
                type: 'solid',
                color: 'F5F5F5',
              },
            })
          );
          break;
        case 'bold':
          runs.push(new TextRun({ text: match.text, bold: true }));
          break;
        case 'italic':
          runs.push(new TextRun({ text: match.text, italics: true }));
          break;
        case 'link':
          runs.push(
            new TextRun({
              text: match.text,
              color: '0563C1',
              underline: {},
            })
          );
          break;
      }

      currentIndex = match.end;
    }

    // 添加剩余的普通文本
    if (currentIndex < text.length) {
      const plainText = text.substring(currentIndex);
      if (plainText) {
        runs.push(new TextRun({ text: plainText }));
      }
    }

    // 如果没有任何匹配，返回纯文本
    if (runs.length === 0) {
      runs.push(new TextRun({ text }));
    }

    return runs;
  }
}
