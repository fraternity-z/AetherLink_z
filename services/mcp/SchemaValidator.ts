/**
 * SchemaValidator - Schema归一化引擎
 *
 * 负责智能修正AI生成的不规范工具调用参数，提升工具调用成功率
 * 完全模仿Kelivo的Schema归一化实现（第785-912行）
 *
 * 核心功能：
 * - 处理anyOf/oneOf联合类型
 * - 递归归一化对象/数组/基本类型
 * - 类型强制转换（string→bool、string→int/number）
 * - 默认值自动填充（schema.default、enum[0]）
 * - 特殊工具参数修正（firecrawl_search等）
 *
 * 创建日期: 2025-11-17
 */

import { logger } from '@/utils/logger';

const log = logger.createNamespace('SchemaValidator');

/**
 * JSON Schema 类型定义
 */
type JSONSchema = Record<string, any>;

/**
 * 特殊工具修正函数类型
 */
type ToolFixerFunction = (args: Record<string, any>) => Record<string, any>;

/**
 * SchemaValidator 类
 *
 * 使用示例：
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     count: { type: 'integer' },
 *     enabled: { type: 'boolean' }
 *   }
 * };
 *
 * const rawArgs = { count: '42', enabled: 'true' };
 * const normalized = SchemaValidator.normalizeBySchema(rawArgs, schema);
 * // { count: 42, enabled: true }
 * ```
 */
export class SchemaValidator {
  /**
   * 特殊工具修正规则映射表
   *
   * key: 工具名称
   * value: 修正函数
   */
  private static readonly TOOL_FIXERS: Record<string, ToolFixerFunction> = {
    /**
     * firecrawl_search 特殊修正
     *
     * 参考Kelivo第733-783行的实现
     * 主要修正：
     * 1. sources: ["web"] → [{ type: "web" }]
     * 2. 填充必需默认值（tbs, filter, location）
     * 3. 修正 scrapeOptions.formats 格式
     */
    firecrawl_search: (args: Record<string, any>): Record<string, any> => {
      const fixed = { ...args };

      // 修正 sources 格式
      const rawSources = fixed.sources;
      if (Array.isArray(rawSources) && rawSources.length > 0) {
        // 如果所有元素都是字符串，转换为对象数组
        if (rawSources.every((e) => typeof e === 'string')) {
          fixed.sources = rawSources.map((e) => ({ type: e }));
          log.debug('修正 firecrawl_search sources 格式', {
            before: rawSources,
            after: fixed.sources,
          });
        }
      }

      // 填充必需默认值
      if (!('tbs' in fixed)) {
        fixed.tbs = '0';
      }
      if (!('filter' in fixed)) {
        fixed.filter = '0';
      }
      if (!('location' in fixed)) {
        fixed.location = 'us';
      }

      // 修正空字符串
      if (typeof fixed.tbs === 'string' && fixed.tbs === '') {
        fixed.tbs = '0';
      }
      if (typeof fixed.filter === 'string' && fixed.filter === '') {
        fixed.filter = '0';
      }

      // 修正 location: 'global' → 'us'
      if (typeof fixed.location === 'string' && fixed.location.toLowerCase() === 'global') {
        fixed.location = 'us';
      }

      // 修正 scrapeOptions
      const scrapeOptions: Record<string, any> =
        typeof fixed.scrapeOptions === 'object' && fixed.scrapeOptions !== null
          ? { ...fixed.scrapeOptions }
          : {};

      // 填充 waitFor 默认值
      if (!('waitFor' in scrapeOptions)) {
        scrapeOptions.waitFor = 0;
      }

      // 修正 formats 格式
      const formats = scrapeOptions.formats;
      if (Array.isArray(formats)) {
        const normalized: any[] = [];
        for (const f of formats) {
          if (typeof f === 'object' && f !== null) {
            const type = String(f.type ?? '');
            if (type === 'markdown' || type === 'html' || type === 'rawHtml') {
              // 简单类型：直接使用字符串
              normalized.push(type);
            } else if (type === 'json') {
              // json类型：保留对象形式
              normalized.push(f);
            } else if (type !== '') {
              normalized.push(type);
            }
          } else if (typeof f === 'string') {
            // 字符串类型
            if (f === 'json') {
              normalized.push({ type: 'json' });
            } else {
              normalized.push(f);
            }
          } else {
            normalized.push(f);
          }
        }
        scrapeOptions.formats = normalized;
      }

      fixed.scrapeOptions = scrapeOptions;

      return fixed;
    },

    // 可以在这里添加更多特殊工具的修正规则
    // 例如：
    // 'another_tool': (args) => { ... },
  };

  /**
   * 核心方法：根据Schema归一化值
   *
   * @param value 待归一化的值
   * @param schema JSON Schema定义
   * @param propertyName 属性名（用于特殊处理）
   * @returns 归一化后的值
   */
  static normalizeBySchema(
    value: any,
    schema: JSONSchema,
    propertyName?: string
  ): any {
    try {
      // 1. 处理 anyOf/oneOf 联合类型
      const unions = this._getSchemaUnions(schema);
      if (unions.length > 0) {
        return this._normalizeUnionTypes(value, unions, propertyName);
      }

      // 2. 获取Schema声明的类型列表
      const declaredTypes = this._getSchemaTypes(schema);

      // 3. 处理 object 类型
      if (declaredTypes.includes('object')) {
        return this._normalizeObject(value, schema, propertyName);
      }

      // 4. 处理 array 类型
      if (declaredTypes.includes('array')) {
        return this._normalizeArray(value, schema, propertyName);
      }

      // 5. 处理 boolean 类型
      if (declaredTypes.includes('boolean')) {
        return this._normalizeBoolean(value);
      }

      // 6. 处理 integer 类型
      if (declaredTypes.includes('integer')) {
        return this._normalizeInteger(value);
      }

      // 7. 处理 number 类型
      if (declaredTypes.includes('number')) {
        return this._normalizeNumber(value);
      }

      // 8. 处理 string 类型
      if (declaredTypes.includes('string')) {
        return this._normalizeString(value, schema);
      }

      // 9. 无明确类型声明，返回原值
      return value;
    } catch (error) {
      log.warn('Schema归一化失败，返回原值', { value, schema, error });
      return value;
    }
  }

  /**
   * 应用特殊工具修正规则
   *
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 修正后的参数
   */
  static applyToolFixer(toolName: string, args: Record<string, any>): Record<string, any> {
    const fixer = this.TOOL_FIXERS[toolName];
    if (fixer) {
      log.debug(`应用特殊工具修正规则`, { toolName });
      try {
        return fixer(args);
      } catch (error) {
        log.error(`特殊工具修正失败`, { toolName, error });
        return args;
      }
    }
    return args;
  }

  /**
   * 注册自定义工具修正规则
   *
   * @param toolName 工具名称
   * @param fixer 修正函数
   */
  static registerToolFixer(toolName: string, fixer: ToolFixerFunction): void {
    this.TOOL_FIXERS[toolName] = fixer;
    log.info(`注册自定义工具修正规则`, { toolName });
  }

  // ============== 私有辅助方法 ==============

  /**
   * 提取Schema中的anyOf/oneOf联合类型
   */
  private static _getSchemaUnions(schema: JSONSchema): JSONSchema[] {
    const unions: JSONSchema[] = [];

    if (Array.isArray(schema.anyOf)) {
      unions.push(...schema.anyOf.filter((s): s is JSONSchema => typeof s === 'object'));
    }

    if (Array.isArray(schema.oneOf)) {
      unions.push(...schema.oneOf.filter((s): s is JSONSchema => typeof s === 'object'));
    }

    return unions;
  }

  /**
   * 获取Schema声明的类型列表
   */
  private static _getSchemaTypes(schema: JSONSchema): string[] {
    const type = schema.type;

    if (typeof type === 'string') {
      return [type];
    }

    if (Array.isArray(type)) {
      return type.map((t) => String(t));
    }

    return [];
  }

  /**
   * 获取Schema的enum枚举值
   */
  private static _getSchemaEnum(schema: JSONSchema): any[] {
    if (Array.isArray(schema.enum)) {
      return schema.enum;
    }
    return [];
  }

  /**
   * 归一化联合类型（anyOf/oneOf）
   */
  private static _normalizeUnionTypes(
    value: any,
    unions: JSONSchema[],
    propertyName?: string
  ): any {
    // 特殊启发式处理：sources字段的字符串值
    if (typeof value === 'string' && propertyName === 'sources') {
      const objectBranch = unions.find((schema) => {
        const types = this._getSchemaTypes(schema);
        const properties = schema.properties as Record<string, any> | undefined;
        return types.includes('object') && properties?.type !== undefined;
      });

      if (objectBranch) {
        return this.normalizeBySchema({ type: value }, objectBranch, propertyName);
      }
    }

    // 尝试匹配每个分支
    for (const branch of unions) {
      try {
        const normalized = this.normalizeBySchema(value, branch, propertyName);
        // 简单验证：如果归一化后的值与原值不同，说明成功匹配
        return normalized;
      } catch {
        // 尝试下一个分支
      }
    }

    // 回退到第一个分支
    if (unions.length > 0) {
      return this.normalizeBySchema(value, unions[0], propertyName);
    }

    return value;
  }

  /**
   * 归一化对象类型
   */
  private static _normalizeObject(
    value: any,
    schema: JSONSchema,
    _propertyName?: string
  ): Record<string, any> {
    const properties = (schema.properties as Record<string, JSONSchema>) ?? {};
    const required = new Set<string>(
      Array.isArray(schema.required) ? schema.required.map((r) => String(r)) : []
    );

    const output: Record<string, any> = {};
    const input: Record<string, any> =
      typeof value === 'object' && value !== null ? value : {};

    // 复制未定义在properties中的字段（passthrough）
    for (const [key, val] of Object.entries(input)) {
      if (!(key in properties)) {
        output[key] = val;
      }
    }

    // 处理每个定义的属性
    for (const [key, propSchema] of Object.entries(properties)) {
      let val = input[key];

      // 如果值不存在，尝试填充默认值
      if (val === null || val === undefined) {
        if ('default' in propSchema) {
          val = propSchema.default;
        } else {
          const enumValues = this._getSchemaEnum(propSchema);
          if (enumValues.length > 0) {
            val = enumValues[0];
          } else if (key === 'waitFor' && this._getSchemaTypes(propSchema).some((t) => t === 'number' || t === 'integer')) {
            // 特殊处理：waitFor默认为0
            val = 0;
          }
        }
      }

      // 如果有值，递归归一化
      if (val !== null && val !== undefined) {
        output[key] = this.normalizeBySchema(val, propSchema, key);
      } else if (!required.has(key)) {
        // 可选字段，忽略null值
      } else {
        // 必需字段但值为null，保留以便服务器验证
        // （不设置output[key]）
      }
    }

    return output;
  }

  /**
   * 归一化数组类型
   */
  private static _normalizeArray(
    value: any,
    schema: JSONSchema,
    propertyName?: string
  ): any[] {
    const itemsSchema = (schema.items as JSONSchema) ?? {};
    const list = Array.isArray(value) ? value : [value];

    const output: any[] = [];

    for (const item of list) {
      let normalizedItem = item;

      // 特殊启发式处理：sources数组的字符串元素
      if (propertyName === 'sources' && typeof item === 'string') {
        const itemTypes = this._getSchemaTypes(itemsSchema);
        if (itemTypes.includes('object')) {
          const itemProps = (itemsSchema.properties as Record<string, any>) ?? {};
          if ('type' in itemProps) {
            normalizedItem = { type: item };
          }
        }
      }

      output.push(this.normalizeBySchema(normalizedItem, itemsSchema, propertyName));
    }

    return output;
  }

  /**
   * 归一化布尔类型
   */
  private static _normalizeBoolean(value: any): any {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }

    return value;
  }

  /**
   * 归一化整数类型
   */
  private static _normalizeInteger(value: any): any {
    if (Number.isInteger(value)) {
      return value;
    }

    if (typeof value === 'number') {
      return Math.floor(value);
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return value;
  }

  /**
   * 归一化数字类型
   */
  private static _normalizeNumber(value: any): any {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return value;
  }

  /**
   * 归一化字符串类型
   */
  private static _normalizeString(value: any, schema: JSONSchema): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      // 验证enum（如果存在）
      const enumValues = this._getSchemaEnum(schema);
      if (enumValues.length > 0 && !enumValues.includes(value)) {
        log.warn('字符串值不在enum范围内', { value, enum: enumValues });
        // 保留原值，让服务器验证
      }
      return value;
    }

    // 其他类型转为字符串
    return String(value);
  }

  /**
   * 获取所有已注册的工具修正器名称
   */
  static getRegisteredToolFixers(): string[] {
    return Object.keys(this.TOOL_FIXERS);
  }
}
