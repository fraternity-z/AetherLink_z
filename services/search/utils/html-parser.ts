/**
 * HTML 解析工具（Bing/Google）
 * - 尽量容错：单/双引号、大小写、移动端/桌面端结构差异
 * - 仅依赖正则，保持轻量
 */

import { logger } from '@/utils/logger';
export interface ParsedSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// 解码 Bing 跳转链接（https://www.bing.com/ck/a?...&u=a1BASE64...）
export function decodeBingRedirectUrl(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname.includes('bing.com') && u.pathname.startsWith('/ck/')) {
      const uParam = u.searchParams.get('u');
      if (uParam && uParam.length > 2) {
        const b64 = uParam.slice(2);
        try {
          const atobFn = (globalThis as any).atob as ((s: string) => string) | undefined;
          if (atobFn) {
            const decoded = atobFn(b64);
            if (decoded && decoded.startsWith('http')) return decoded;
          }
        } catch (e) {
          logger.debug('[html-parser] Failed to decode Bing redirect base64', e);
        }
      }
    }
  } catch (e) {
    logger.debug('[html-parser] Failed to parse Bing redirect URL', e);
  }
  return href;
}

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

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqByUrl(items: ParsedSearchResult[]): ParsedSearchResult[] {
  const seen = new Set<string>();
  const out: ParsedSearchResult[] = [];
  for (const it of items) {
    if (!seen.has(it.url)) {
      seen.add(it.url);
      out.push(it);
    }
  }
  return out;
}

/**
 * 解析 Bing 搜索结果
 * - 兼容桌面/移动端：优先在 #b_results 内解析；退化到 li.b_algo 或 h2>a 通用匹配
 * - snippet 允许为空（不能因此丢弃结果）
 */
export function parseBingSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];
  if (!html) return results;

  // 缩小解析范围到 b_results（如果存在）
  let scope = html;
  const bResultsMatch = /<ol[^>]*id=["']b_results["'][^>]*>([\s\S]*?)<\/ol>/i.exec(html);
  if (bResultsMatch) scope = bResultsMatch[1];

  try {
    // 策略 A：li.b_algo 块（经典结构）
    const algoRegex = /<li[^>]*class=["'][^"']*b_algo[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = algoRegex.exec(scope)) !== null) {
      const block = m[1];

      // 标题/URL：h2 区域内的第一个 a
      const aInH2 = /<h2[^>]*>[\s\S]*?<a[^>]*href=(['"])([^'"#]+)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i.exec(block)
        || /<a[^>]*href=(['"])([^'"#]+)\1[^>]*>([\s\S]*?)<\/a>/i.exec(block);
      if (!aInH2) continue;
      let url = aInH2[2];
      const title = decodeHtmlEntities(stripHtmlTags(aInH2[3]));
      url = decodeBingRedirectUrl(url);

      // 摘要：b_caption > p 或 block 中第一个 p
      let snippet = '';
      const cap = /<div[^>]*class=["'][^"']*b_caption[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block);
      if (cap) {
        const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(cap[1]);
        if (p) snippet = decodeHtmlEntities(stripHtmlTags(p[1]));
      }
      if (!snippet) {
        const p2 = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
        if (p2) snippet = decodeHtmlEntities(stripHtmlTags(p2[1]));
      }

      if (title && url && (url.startsWith('http://') || url.startsWith('https://'))) {
        results.push({ title: title.substring(0, 200), url, snippet: (snippet || '').substring(0, 300) });
      }
    }

    // 策略 B：通用 #b_results 内 h2 > a（适配部分移动端页面没有 b_algo）
    if (results.length === 0) {
      const generic = /<h2[^>]*>[\s\S]*?<a[^>]*href=(['"])([^'"#]+)\1[^>]*>([\s\S]*?)<\/a>/gi;
      let g: RegExpExecArray | null;
      while ((g = generic.exec(scope)) !== null) {
        let url = g[2];
        const title = decodeHtmlEntities(stripHtmlTags(g[3]));
        url = decodeBingRedirectUrl(url);
        if (title && url && (url.startsWith('http://') || url.startsWith('https://'))) {
          results.push({ title: title.substring(0, 200), url, snippet: '' });
        }
      }
    }
  } catch (err) {
    logger.error('Bing 搜索结果解析失败:', err);
  }

  return uniqByUrl(results);
}

/**
 * 解析 Google 搜索结果（保留原实现）
 */
export function parseGoogleSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];
  if (!html) return results;

  try {
    const gBlockRegex = /<div\s+class=\"g\"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    let gMatch: RegExpExecArray | null;

    while ((gMatch = gBlockRegex.exec(html)) !== null && results.length < 15) {
      const block = gMatch[1];
      const urlMatch = /<a\s+href=\"([^\"]+)\"[^>]*>/i.exec(block);
      if (!urlMatch) continue;
      const url = urlMatch[1];
      if (url.startsWith('/') || url.includes('google.com')) continue;

      const h3Match = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
      if (!h3Match) continue;
      const title = decodeHtmlEntities(stripHtmlTags(h3Match[1]));

      let snippet = '';
      const snippetMatch = /<div[^>]*data-[^>]*>([\s\S]*?)<\/div>/i.exec(block);
      if (snippetMatch) snippet = decodeHtmlEntities(stripHtmlTags(snippetMatch[1]));
      if (!snippet) {
        const textMatch = /<(?:span|div)[^>]*>([^<]{20,})<\/(?:span|div)>/i.exec(block);
        if (textMatch) snippet = decodeHtmlEntities(textMatch[1].trim());
      }

      if (title && url && (url.startsWith('http://') || url.startsWith('https://'))) {
        results.push({ title: title.substring(0, 200), url, snippet: (snippet || '').substring(0, 300) });
      }
    }

    if (results.length === 0) {
      const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);
      if (h3Matches) {
        for (const h3Html of h3Matches) {
          if (results.length >= 10) break;
          const h3Index = html.indexOf(h3Html);
          const context = html.substring(Math.max(0, h3Index - 200), h3Index + 500);
          const urlMatch = /<a\s+href=\"([^\"]+)\"/.exec(context);
          if (urlMatch) {
            const url = urlMatch[1];
            if (url.startsWith('http') && !url.includes('google.com')) {
              const title = decodeHtmlEntities(stripHtmlTags(h3Html));
              results.push({ title: title.substring(0, 200), url, snippet: '（无摘要）' });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Google 搜索结果解析失败:', error);
  }

  return uniqByUrl(results);
}

export function validateSearchResults(results: ParsedSearchResult[]): ParsedSearchResult[] {
  return results.filter((r) => r.title && r.url && (r.url.startsWith('http://') || r.url.startsWith('https://')));
}
