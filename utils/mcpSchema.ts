/**
 * MCP Schema 处理工具
 *
 * 专门处理 OpenAI o3 strict mode 的 schema 验证
 * 从 Cherry Studio 移植
 *
 * @module utils/mcpSchema
 */

/**
 * 递归过滤和验证 OpenAI o3 strict schema 的属性
 *
 * OpenAI o3 strict mode 要求：
 * 1. 所有对象 schema（包括嵌套的）必须包含完整的 required 数组，包含所有属性键
 * 2. 对象 schema 如果有 additionalProperties: false，必须有 properties 字段（即使是空对象）
 *
 * 此函数递归处理整个 schema 树以确保合规
 */
export function filterProperties(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // 处理数组，递归处理 items
  if (Array.isArray(schema)) {
    return schema.map(filterProperties);
  }

  const filtered = { ...schema };

  // 首先递归处理所有 properties
  if (filtered.properties && typeof filtered.properties === 'object') {
    const newProperties: any = {};

    for (const [key, value] of Object.entries(filtered.properties)) {
      newProperties[key] = filterProperties(value);
    }

    filtered.properties = newProperties;
  }

  // 处理其他可能包含嵌套 schema 的字段
  if (filtered.items) {
    filtered.items = filterProperties(filtered.items);
  }

  if (filtered.additionalProperties && typeof filtered.additionalProperties === 'object') {
    filtered.additionalProperties = filterProperties(filtered.additionalProperties);
  }

  if (filtered.patternProperties) {
    const newPatternProperties: any = {};

    for (const [pattern, value] of Object.entries(filtered.patternProperties)) {
      newPatternProperties[pattern] = filterProperties(value);
    }

    filtered.patternProperties = newPatternProperties;
  }

  // 处理 schema 组合关键字（数组形式）
  const arrayCompositionKeywords = ['allOf', 'anyOf', 'oneOf'];

  for (const keyword of arrayCompositionKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filtered[keyword].map(filterProperties);
    }
  }

  // 处理单个 schema 关键字
  const singleSchemaKeywords = ['not', 'if', 'then', 'else'];

  for (const keyword of singleSchemaKeywords) {
    if (filtered[keyword]) {
      filtered[keyword] = filterProperties(filtered[keyword]);
    }
  }

  // 对于所有对象 schema，确保符合 o3 strict mode 要求
  if (filtered.type === 'object') {
    // o3 要求：对象 schema 必须有 properties 字段（即使是空对象）
    if (!filtered.properties) {
      filtered.properties = {};
    }

    // o3 strict 要求 1：所有属性必须在 required 数组中
    const propertyKeys = Object.keys(filtered.properties);
    filtered.required = propertyKeys;

    // o3 strict 要求 2：additionalProperties 必须始终为 false（用于严格验证）
    // 无论原始值是什么（true, undefined 等），都设置为 false
    filtered.additionalProperties = false;
  }

  return filtered;
}

/**
 * 修复对象属性以适配 o3 strict mode
 * 确保对象有 properties 字段（即使是空对象）
 */
export function fixObjectPropertiesForO3(properties: Record<string, any>): Record<string, any> {
  const fixedProperties = { ...properties };

  for (const [propKey, propValue] of Object.entries(fixedProperties || {})) {
    if (propValue && typeof propValue === 'object') {
      const prop = propValue as any;

      if (prop.type === 'object') {
        // 对于对象类型，确保它们有 properties 字段（即使是空对象），用于 o3 strict mode
        if (!prop.properties && prop.additionalProperties === false) {
          fixedProperties[propKey] = {
            ...prop,
            properties: {}, // 添加空 properties 对象用于严格验证
          };
        }
      }
    }
  }

  return fixedProperties;
}

/**
 * 处理 MCP 工具 schema 以符合 OpenAI o3 strict 验证要求
 */
export function processSchemaForO3(inputSchema: any): {
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
} {
  const filteredSchema = filterProperties(inputSchema);

  // 对于 strict mode（如 o3），确保所有属性都在 required 数组中
  // 这必须在 filterProperties 之后完成，因为它设置了自己的 required 数组
  const allPropertyKeys = Object.keys(filteredSchema.properties || {});

  // 修复对象属性以适配 o3 strict mode - 确保对象有 properties 字段
  const fixedProperties = fixObjectPropertiesForO3(filteredSchema.properties);

  // 创建干净的 schema 对象以避免突变
  return {
    properties: fixedProperties || {},
    required: allPropertyKeys, // o3 要求所有属性都必须在 required 中
    additionalProperties: false,
  };
}
