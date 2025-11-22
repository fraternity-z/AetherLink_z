import {
  Paragraph,
  TextRun,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import { ThinkingChain } from '@/storage/core';
import { ThinkingChainMode } from '../types';

/**
 * 思考链转换器 - 将思考链数据转换为 DOCX 段落
 *
 * 支持三种导出模式：
 * - full: 完整导出思考过程和耗时
 * - summary: 仅导出摘要（截断前 500 字符）
 * - none: 不导出
 */
export class ThinkingChainConverter {
  /**
   * 将思考链转换为 DOCX 段落
   *
   * @param thinkingChain 思考链数据
   * @param mode 导出模式
   * @returns DOCX Paragraph 对象数组，如果模式为 'none' 则返回空数组
   */
  convertToParagraphs(
    thinkingChain: ThinkingChain | null,
    mode: ThinkingChainMode
  ): Paragraph[] {
    if (!thinkingChain || mode === 'none') {
      return [];
    }

    const paragraphs: Paragraph[] = [];

    // 1. 添加标题
    paragraphs.push(this.createTitle(thinkingChain.durationMs));

    // 2. 根据模式添加内容
    if (mode === 'full') {
      paragraphs.push(...this.createFullContent(thinkingChain));
    } else if (mode === 'summary') {
      paragraphs.push(...this.createSummary(thinkingChain));
    }

    return paragraphs;
  }

  /**
   * 创建思考链标题
   * @private
   */
  private createTitle(durationMs: number): Paragraph {
    const durationSeconds = (durationMs / 1000).toFixed(1);

    return new Paragraph({
      children: [
        new TextRun({
          text: '💡 ',
          size: 20,
        }),
        new TextRun({
          text: `思考过程（耗时 ${durationSeconds}s）`,
          size: 20,
          bold: true,
          color: '4A90E2',
        }),
      ],
      spacing: {
        before: 120,
        after: 60,
      },
    });
  }

  /**
   * 创建完整的思考链内容
   * @private
   */
  private createFullContent(thinkingChain: ThinkingChain): Paragraph[] {
    const content = thinkingChain.content || '';
    const lines = content.split('\n');

    return lines.map(line =>
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ', // 空行保留为空格，避免段落消失
            size: 18, // 9pt
            italics: true,
            color: '666666',
          }),
        ],
        shading: {
          type: 'solid',
          color: 'E8F4F8', // 浅蓝色背景
        },
        spacing: {
          line: 260,
        },
        indent: {
          left: convertInchesToTwip(0.3),
          right: convertInchesToTwip(0.3),
        },
        border: {
          left: {
            color: '4A90E2',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );
  }

  /**
   * 创建思考链摘要
   * @private
   */
  private createSummary(thinkingChain: ThinkingChain): Paragraph[] {
    const content = thinkingChain.content || '';
    const maxLength = 500;

    // 截断内容
    let summary = content;
    if (content.length > maxLength) {
      summary = content.substring(0, maxLength) + '...';
    }

    // 提取第一段或前几句
    const firstParagraph = summary.split('\n\n')[0] || summary;

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: firstParagraph,
            size: 18,
            italics: true,
            color: '666666',
          }),
        ],
        shading: {
          type: 'solid',
          color: 'E8F4F8',
        },
        spacing: {
          line: 260,
        },
        indent: {
          left: convertInchesToTwip(0.3),
          right: convertInchesToTwip(0.3),
        },
        border: {
          left: {
            color: '4A90E2',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '[仅显示摘要，完整内容已省略]',
            size: 16,
            italics: true,
            color: '999999',
          }),
        ],
        shading: {
          type: 'solid',
          color: 'E8F4F8',
        },
        spacing: {
          line: 260,
        },
        indent: {
          left: convertInchesToTwip(0.3),
          right: convertInchesToTwip(0.3),
        },
      }),
    ];
  }
}
