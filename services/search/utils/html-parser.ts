/**
 * HTML 解析工具
 *
 * 轻量级 HTML 解析器，用于提取 Bing 和 Google 搜索结果
 * 使用正则表达式实现，无需额外依赖
 */

/**
 * 解析后的搜索结果
 */
export interface ParsedSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * HTML 实体解码
 *
 * 将 HTML 实体（如 &amp;、&lt; 等）转换为对应的字符
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * 移除 HTML 标签
 *
 * 去除所有 HTML 标签，保留纯文本内容
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除 script 标签
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // 移除 style 标签
    .replace(/<[^>]+>/g, '')                                            // 移除其他标签
    .replace(/\s+/g, ' ')                                               // 合并多余空格
    .trim();
}

/**
 * 解析 Bing 搜索结果页面
 *
 * Bing 搜索结果的 HTML 结构：
 * - 搜索结果在 <li class="b_algo"> 标签中
 * - 标题在 <h2><a href="...">Title</a></h2>
 * - 摘要在 <p> 或 <div class="b_caption"> 中
 *
 * @param html Bing 搜索结果页面的 HTML
 * @returns 解析后的搜索结果数组
 */
export function parseBingSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];

  if (!html) return results;

  try {
    // 方案 1: 提取 b_algo 结构（Bing 搜索结果的主要结构）
    // 匹配 <li class="b_algo">...</li> 块
    const algoRegex = /<li\s+class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
    let algoMatch;

    while ((algoMatch = algoRegex.exec(html)) !== null && results.length < 15) {
      const block = algoMatch[1];

      // 提取标题和 URL
      const titleRegex = /<h2[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i;
      const titleMatch = titleRegex.exec(block);

      if (!titleMatch) continue;

      const url = titleMatch[1];
      const titleHtml = titleMatch[2];
      const title = decodeHtmlEntities(stripHtmlTags(titleHtml));

      // 提取摘要（尝试多种可能的结构）
      let snippet = '';

      // 尝试提取 b_caption 中的内容
      const captionRegex = /<div\s+class="b_caption"[^>]*>([\s\S]*?)<\/div>/i;
      const captionMatch = captionRegex.exec(block);

      if (captionMatch) {
        // 在 caption 中查找 <p> 标签
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/i;
        const pMatch = pRegex.exec(captionMatch[1]);
        if (pMatch) {
          snippet = decodeHtmlEntities(stripHtmlTags(pMatch[1]));
        }
      }

      // 如果没有找到，尝试直接查找 <p> 标签
      if (!snippet) {
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/i;
        const pMatch = pRegex.exec(block);
        if (pMatch) {
          snippet = decodeHtmlEntities(stripHtmlTags(pMatch[1]));
        }
      }

      // 验证结果有效性
      if (title && url && snippet && url.startsWith('http')) {
        results.push({
          title: title.substring(0, 200), // 限制标题长度
          url,
          snippet: snippet.substring(0, 300), // 限制摘要长度
        });
      }
    }
  } catch (error) {
    console.error('Bing 搜索结果解析失败:', error);
  }

  return results;
}

/**
 * 解析 Google 搜索结果页面
 *
 * Google 搜索结果的 HTML 结构（可能频繁变化）：
 * - 搜索结果在 <div class="g"> 或 data-sokoban-container 中
 * - 标题在 <h3> 标签中
 * - URL 在 <a> 标签的 href 属性中
 * - 摘要在 <div> 或 <span> 中（结构复杂）
 *
 * @param html Google 搜索结果页面的 HTML
 * @returns 解析后的搜索结果数组
 */
export function parseGoogleSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];

  if (!html) return results;

  try {
    // Google 的搜索结果结构更复杂，尝试多种解析策略

    // 策略 1: 提取 <div class="g"> 块（经典结构）
    const gBlockRegex = /<div\s+class="g"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    let gMatch;

    while ((gMatch = gBlockRegex.exec(html)) !== null && results.length < 15) {
      const block = gMatch[1];

      // 提取 URL（查找 <a> 标签）
      const urlRegex = /<a\s+href="([^"]+)"[^>]*>/i;
      const urlMatch = urlRegex.exec(block);
      if (!urlMatch) continue;

      const url = urlMatch[1];

      // 跳过 Google 内部链接
      if (url.startsWith('/') || url.includes('google.com')) continue;

      // 提取标题（查找 <h3> 标签）
      const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
      const h3Match = h3Regex.exec(block);
      if (!h3Match) continue;

      const titleHtml = h3Match[1];
      const title = decodeHtmlEntities(stripHtmlTags(titleHtml));

      // 提取摘要（查找标题后的文本内容）
      let snippet = '';

      // 尝试提取 data-sncf 或 data-content-feature 属性的内容
      const snippetRegex = /<div[^>]*data-[^>]*>([\s\S]*?)<\/div>/i;
      const snippetMatch = snippetRegex.exec(block);

      if (snippetMatch) {
        snippet = decodeHtmlEntities(stripHtmlTags(snippetMatch[1]));
      }

      // 如果没有找到，尝试提取任意 <span> 或 <div> 中的长文本
      if (!snippet) {
        const textRegex = /<(?:span|div)[^>]*>([^<]{20,})<\/(?:span|div)>/i;
        const textMatch = textRegex.exec(block);
        if (textMatch) {
          snippet = decodeHtmlEntities(textMatch[1].trim());
        }
      }

      // 验证结果有效性
      if (title && url && snippet && url.startsWith('http')) {
        results.push({
          title: title.substring(0, 200),
          url,
          snippet: snippet.substring(0, 300),
        });
      }
    }

    // 策略 2: 如果策略 1 失败，尝试更宽松的匹配
    if (results.length === 0) {
      // 查找所有 <h3> 标签（通常是标题）
      const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
      const h3Matches = html.match(h3Regex);

      if (h3Matches) {
        for (const h3Html of h3Matches) {
          if (results.length >= 10) break;

          // 在 h3 前后查找 URL
          const h3Index = html.indexOf(h3Html);
          const context = html.substring(Math.max(0, h3Index - 200), h3Index + 500);

          const urlRegex = /<a\s+href="([^"]+)"/;
          const urlMatch = urlRegex.exec(context);

          if (urlMatch) {
            const url = urlMatch[1];
            if (url.startsWith('http') && !url.includes('google.com')) {
              const title = decodeHtmlEntities(stripHtmlTags(h3Html));
              const snippet = ''; // 这种方式可能无法提取摘要

              if (title && url) {
                results.push({
                  title: title.substring(0, 200),
                  url,
                  snippet: snippet || '（无摘要）',
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Google 搜索结果解析失败:', error);
  }

  return results;
}

/**
 * 验证解析结果的有效性
 *
 * @param results 解析后的搜索结果
 * @returns 有效的搜索结果数组
 */
export function validateSearchResults(
  results: ParsedSearchResult[]
): ParsedSearchResult[] {
  return results.filter(result => {
    // 必填字段检查
    if (!result.title || !result.url) {
      return false;
    }

    // URL 格式检查
    if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
      return false;
    }

    // 标题长度检查
    if (result.title.length < 3 || result.title.length > 500) {
      return false;
    }

    return true;
  });
}
