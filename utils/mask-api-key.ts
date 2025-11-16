/**
 * API Key 隐藏工具函数
 */

/**
 * 隐藏 API Key 的中间部分
 * @param key API Key 原文
 * @param prefixLen 保留的前缀长度（默认 4）
 * @param suffixLen 保留的后缀长度（默认 4）
 * @returns 隐藏后的 Key，格式：sk-b•••••O5c1
 */
export function maskApiKey(
  key: string,
  prefixLen: number = 4,
  suffixLen: number = 4
): string {
  if (!key || key.length <= prefixLen + suffixLen) {
    // Key 太短，全部隐藏
    return '•'.repeat(Math.max(key?.length || 8, 8));
  }

  const prefix = key.substring(0, prefixLen);
  const suffix = key.substring(key.length - suffixLen);
  const maskedPart = '•'.repeat(5); // 固定 5 个点

  return `${prefix}${maskedPart}${suffix}`;
}

/**
 * 检测 Key 是否已被隐藏
 */
export function isMaskedKey(key: string): boolean {
  return key.includes('•');
}
