/**
 * 📝 文本格式化工具函数
 *
 * 功能：
 * - 清理 SVG 内容中的空行
 * - 统一数学公式格式（LaTeX → $ 符号格式）
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
