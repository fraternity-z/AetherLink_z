/**
 * SecurityUtils - 安全工具类
 *
 * 负责敏感信息脱敏，防止敏感数据（如API Key、Token等）泄漏到日志中
 * 参考Kelivo的 _maskIfSensitive 实现（第1148-1160行）
 *
 * 创建日期: 2025-11-17
 */

import { logger } from '@/utils/logger';

const log = logger.createNamespace('SecurityUtils');

/**
 * SecurityUtils 类
 *
 * 使用示例：
 * ```typescript
 * const headers = {
 *   'Authorization': 'Bearer sk-1234567890abcdef',
 *   'Content-Type': 'application/json'
 * };
 *
 * const masked = SecurityUtils.maskHeaders(headers);
 * // { 'Authorization': 'Bear...ef', 'Content-Type': 'application/json' }
 * ```
 */
export class SecurityUtils {
  /**
   * 敏感字段的正则模式列表
   */
  private static readonly SENSITIVE_PATTERNS: RegExp[] = [
    /authorization/i,
    /token/i,
    /api[-_]?key/i,
    /secret/i,
    /password/i,
    /passwd/i,
    /cookie/i,
    /session/i,
    /credentials?/i,
    /private[-_]?key/i,
    /access[-_]?token/i,
    /refresh[-_]?token/i,
    /bearer/i,
  ];

  /**
   * 判断字段名是否为敏感字段
   *
   * @param key 字段名
   * @returns 是否为敏感字段
   */
  static isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase().trim();

    // 检查是否匹配敏感模式
    const isSensitive = this.SENSITIVE_PATTERNS.some((pattern) =>
      pattern.test(lowerKey)
    );

    // 特殊处理：以 'key' 结尾的字段（但排除常见的非敏感字段）
    const nonSensitiveEndings = ['primary_key', 'foreign_key', 'unique_key', 'keyboard'];
    const endsWithKey = lowerKey.endsWith('key') &&
      !nonSensitiveEndings.some((ending) => lowerKey.endsWith(ending));

    return isSensitive || endsWithKey;
  }

  /**
   * 脱敏单个值
   *
   * 脱敏策略（参考Kelivo）：
   * - 空值或短值（≤ 8个字符）: 返回 '***'
   * - 长值（> 8个字符）: 返回 '前4个字符...后2个字符'
   *
   * @param key 字段名
   * @param value 字段值
   * @returns 脱敏后的值
   */
  static maskSensitiveValue(key: string, value: string): string {
    // 如果不是敏感字段，直接返回原值
    if (!this.isSensitiveKey(key)) {
      return value;
    }

    // 去除首尾空格
    const trimmed = value.trim();

    // 空值或过短的值
    if (trimmed.length === 0) {
      return value; // 保留原样（可能是空字符串）
    }

    if (trimmed.length <= 8) {
      return '***';
    }

    // 长值脱敏：保留前4个和后2个字符
    const masked = trimmed.substring(0, 4) + '...' + trimmed.slice(-2);

    log.debug('字段已脱敏', { key, originalLength: trimmed.length, masked });

    return masked;
  }

  /**
   * 脱敏整个Headers对象
   *
   * @param headers 请求头对象
   * @returns 脱敏后的请求头对象
   */
  static maskHeaders(headers: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      masked[key] = this.maskSensitiveValue(key, value);
    }

    return masked;
  }

  /**
   * 脱敏任意对象中的敏感字段（递归处理）
   *
   * @param obj 待脱敏的对象
   * @param maxDepth 最大递归深度（防止循环引用）
   * @returns 脱敏后的对象
   */
  static maskObject(obj: any, maxDepth: number = 5): any {
    if (maxDepth <= 0) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item, maxDepth - 1));
    }

    // 处理普通对象
    if (typeof obj === 'object' && obj.constructor === Object) {
      const masked: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && this.isSensitiveKey(key)) {
          // 脱敏字符串值
          masked[key] = this.maskSensitiveValue(key, value);
        } else if (typeof value === 'object') {
          // 递归处理嵌套对象
          masked[key] = this.maskObject(value, maxDepth - 1);
        } else {
          // 其他类型保持原样
          masked[key] = value;
        }
      }

      return masked;
    }

    // 其他类型（字符串、数字、布尔值等）保持原样
    return obj;
  }

  /**
   * 用于日志输出的安全字符串化
   *
   * 自动脱敏对象中的敏感字段，然后转为JSON字符串
   *
   * @param obj 待字符串化的对象
   * @param space 缩进空格数（默认0）
   * @returns JSON字符串
   */
  static safeStringify(obj: any, space: number = 0): string {
    try {
      const masked = this.maskObject(obj);
      return JSON.stringify(masked, null, space);
    } catch (error) {
      log.error('安全字符串化失败', { error });
      return '[SecurityUtils.safeStringify 失败]';
    }
  }

  /**
   * 添加自定义敏感模式
   *
   * @param pattern 正则表达式模式
   */
  static addSensitivePattern(pattern: RegExp): void {
    if (!this.SENSITIVE_PATTERNS.includes(pattern)) {
      this.SENSITIVE_PATTERNS.push(pattern);
      log.info('添加自定义敏感模式', { pattern: pattern.source });
    }
  }

  /**
   * 获取当前敏感模式列表
   *
   * @returns 敏感模式列表（只读）
   */
  static getSensitivePatterns(): readonly RegExp[] {
    return Object.freeze([...this.SENSITIVE_PATTERNS]);
  }
}
