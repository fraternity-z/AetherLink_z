/**
 * 📝 文本格式化工具函数
 *
 * 功能：
 * - 清理 SVG 内容中的空行
 * - 统一数学公式格式（LaTeX → $ 符号格式）
 * - 移除/转换不支持的 HTML 标签
 */

/**
 * 清理 SVG 标签内的空行
 * @param text - 输入文本
 * @returns 清理后的文本
 */
export function removeSvgEmptyLines(text: string): string {
  // 匹配 <svg> 标签内的内容
  const svgPattern = /(<svg[\s\S]*?<\/svg>)/g;

  return text.replace(svgPattern, svgMatch => {
    // 将 SVG 内容按行分割，过滤掉空行，然后重新组合
    return svgMatch
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');
  });
}

/**
 * 转义 LaTeX 数学公式括号，统一为 $ 符号格式
 *
 * 功能：
 * - 保护代码块中的内容不被转换
 * - 将 \[ ... \] 转换为 $$ ... $$ (块公式)
 * - 将 \( ... \) 转换为 $ ... $ (行内公式)
 *
 * @param text - 输入文本
 * @returns 转换后的文本
 *
 * @example
 * escapeBrackets('这是 \\(x=0\\) 的公式')  // => '这是 $x=0$ 的公式'
 * escapeBrackets('块公式 \\[x^2\\]')       // => '块公式 $$x^2$$'
 */
export function escapeBrackets(text: string): string {
  // 匹配：
  // 1. 代码块: ```...``` 或 `...`
  // 2. 块公式: \[ ... \]
  // 3. 行内公式: \( ... \)
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.+?)\\\)/g;

  return text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    // 保护代码块，不做转换
    if (codeBlock) {
      return codeBlock;
    }
    // 块公式: \[ ... \] => $$ ... $$
    else if (squareBracket) {
      return `$$${squareBracket}$$`;
    }
    // 行内公式: \( ... \) => $ ... $
    else if (roundBracket) {
      return `$${roundBracket}$`;
    }

    return match;
  });
}

/**
 * 移除不支持的 HTML 标签，保留 SVG（数学公式需要）
 *
 * 功能：
 * - 保护 <svg> 标签（数学公式渲染）
 * - 保护代码块内的 HTML
 * - 将常见 HTML 标签转换为 Markdown 等价物
 * - 移除其他未知的 HTML 标签
 *
 * @param text - 输入文本
 * @returns 清理后的文本
 *
 * @example
 * removeUnsupportedHtml('Hello<br>World')  // => 'Hello\n\nWorld'
 * removeUnsupportedHtml('<strong>Bold</strong>')  // => '**Bold**'
 * removeUnsupportedHtml('<svg>...</svg>')  // => '<svg>...</svg>' (保留)
 */
export function removeUnsupportedHtml(text: string): string {
  // 第一步：保护 SVG 标签和代码块
  const protectedItems: string[] = [];
  let protectedText = text;

  // 保护 SVG 标签
  protectedText = protectedText.replace(/(<svg[\s\S]*?<\/svg>)/gi, (match) => {
    const index = protectedItems.length;
    protectedItems.push(match);
    return `__PROTECTED_${index}__`;
  });

  // 保护代码块
  protectedText = protectedText.replace(/(```[\s\S]*?```|`[^`]+`)/g, (match) => {
    const index = protectedItems.length;
    protectedItems.push(match);
    return `__PROTECTED_${index}__`;
  });

  // 第二步：转换常见 HTML 标签为 Markdown
  const htmlToMarkdown: Record<string, (content: string) => string> = {
    // 换行标签
    'br': () => '\n\n',
    'hr': () => '\n\n---\n\n',

    // 文本样式
    'strong': (content) => `**${content}**`,
    'b': (content) => `**${content}**`,
    'em': (content) => `*${content}*`,
    'i': (content) => `*${content}*`,
    'u': (content) => `__${content}__`,
    's': (content) => `~~${content}~~`,
    'del': (content) => `~~${content}~~`,
    'code': (content) => `\`${content}\``,

    // 标题
    'h1': (content) => `\n# ${content}\n`,
    'h2': (content) => `\n## ${content}\n`,
    'h3': (content) => `\n### ${content}\n`,
    'h4': (content) => `\n#### ${content}\n`,
    'h5': (content) => `\n##### ${content}\n`,
    'h6': (content) => `\n###### ${content}\n`,

    // 段落和块级元素
    'p': (content) => `\n${content}\n`,
    'div': (content) => `\n${content}\n`,
    'blockquote': (content) => `\n> ${content}\n`,

    // 列表
    'li': (content) => `- ${content}\n`,

    // 链接（需要特殊处理，暂时保留内容）
    'a': (content) => content,
  };

  // 应用转换规则
  Object.entries(htmlToMarkdown).forEach(([tag, converter]) => {
    // 自闭合标签 (如 <br />)
    const selfClosingPattern = new RegExp(`<${tag}\\s*\\/?>`, 'gi');
    protectedText = protectedText.replace(selfClosingPattern, () => converter(''));

    // 配对标签 (如 <strong>text</strong>)
    const pairedPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    protectedText = protectedText.replace(pairedPattern, (_, content) => converter(content));
  });

  // 第三步：移除剩余的 HTML 标签（未知标签）
  protectedText = protectedText.replace(/<[^>]+>/g, '');

  // 第四步：还原被保护的内容
  protectedItems.forEach((item, index) => {
    protectedText = protectedText.replace(`__PROTECTED_${index}__`, item);
  });

  return protectedText;
}
