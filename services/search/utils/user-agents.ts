/**
 * User-Agent 管理工具
 *
 * 提供真实的浏览器 User-Agent 字符串，用于降低反爬虫检测风险
 * 支持桌面端和移动端 User-Agent
 */

/**
 * 桌面端 User-Agent 列表
 */
const DESKTOP_USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

/**
 * 移动端 User-Agent 列表
 *
 * 注意：移动端 User-Agent 通常更容易绕过反爬虫检测
 */
const MOBILE_USER_AGENTS = [
  // iPhone Safari
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  // iPhone Chrome
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
  // Android Chrome
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  // Samsung Internet
  'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
];

/**
 * User-Agent 类型
 */
export type UserAgentType = 'desktop' | 'mobile';

/**
 * 获取随机 User-Agent
 *
 * @param type User-Agent 类型（桌面端或移动端）
 * @returns 随机选择的 User-Agent 字符串
 *
 * @example
 * ```typescript
 * const ua = getRandomUserAgent('mobile');
 * logger.info(ua); // "Mozilla/5.0 (iPhone; ..."
 * ```
 */
export function getRandomUserAgent(type: UserAgentType = 'mobile'): string {
  const agents = type === 'desktop' ? DESKTOP_USER_AGENTS : MOBILE_USER_AGENTS;
  const randomIndex = Math.floor(Math.random() * agents.length);
  return agents[randomIndex];
}

/**
 * 获取默认 User-Agent
 *
 * 返回一个固定的移动端 User-Agent，适用于不需要轮换的场景
 */
export function getDefaultUserAgent(): string {
  return MOBILE_USER_AGENTS[0];
}

/**
 * 获取推荐的请求头
 *
 * 返回一组常见的 HTTP 请求头，用于模拟真实浏览器请求
 *
 * @param useRandomUA 是否使用随机 User-Agent
 * @returns 推荐的请求头对象
 */
export function getRecommendedHeaders(useRandomUA: boolean = true): Record<string, string> {
  return {
    'User-Agent': useRandomUA ? getRandomUserAgent('mobile') : getDefaultUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1', // Do Not Track
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
}
