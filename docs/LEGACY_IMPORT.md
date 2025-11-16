# 旧版 AetherLink 备份导入指南

## 功能概述

本功能允许从旧版 AetherLink 应用的备份文件中导入提供商配置、API 密钥和模型列表，实现无缝迁移。

**支持导入的数据：**
- ✅ AI 提供商配置（OpenAI, Anthropic, Google 等）
- ✅ 自定义 Base URL
- ✅ API 密钥
- ✅ 模型列表

**不支持导入的数据：**
- ❌ 会话历史（topics）
- ❌ 消息内容（messages）
- ❌ 助手配置（assistants）

> **说明：** 会话和消息数据可以通过"导入数据"功能完整恢复，但会清空当前数据。如果只需要迁移提供商配置，使用"导入旧版配置"更安全。

---

## 使用步骤

### 1. 准备旧版备份文件

从旧版 AetherLink 应用导出备份文件（通常为 `.json` 格式），例如：
```
aetherlink_backup_2025-11-16.json
```

### 2. 打开导入功能

1. 在应用中打开 **设置** 页面
2. 进入 **数据设置**
3. 在 **备份与恢复** 部分找到 **"导入旧版配置"**

### 3. 选择备份文件

点击 **"导入旧版配置"** 按钮，系统会弹出确认对话框：

```
导入旧版配置

此功能将从旧版 AetherLink 备份文件中导入提供商配置、
API 密钥和模型列表。不会导入会话和消息数据。

[取消] [确定]
```

确认后，选择旧版备份文件。

### 4. 等待导入完成

系统会显示 **"处理中..."** 加载提示，导入完成后会弹出结果摘要：

```
导入完成

✓ 已导入 2 个官方提供商
✓ 已创建 1 个自定义提供商
✓ 已导入 15 个模型

⚠️ 0 个错误（已记录）
```

### 5. 验证导入结果

前往 **设置 > 默认模型** 页面，检查：
- ✅ 提供商配置是否正确
- ✅ API 密钥是否导入（在对应提供商设置页面查看）
- ✅ 模型列表是否完整
- ✅ 自定义提供商是否创建成功

---

## 导入逻辑说明

### 提供商分类策略

导入服务会根据以下规则自动分类提供商：

| 提供商类型 | baseURL 状态 | 导入方式 |
|-----------|-------------|---------|
| 官方提供商 (openai, anthropic 等) | 默认 URL | 更新官方提供商配置 |
| 官方提供商 | 自定义 URL | 创建自定义提供商 |
| 未知提供商 | 任意 | 创建自定义提供商 |

**示例：**

```typescript
// 旧版备份中的模型配置
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",  // 默认 URL
  "apiKey": "sk-xxx",
  "id": "gpt-4o"
}
// → 导入为官方 OpenAI 提供商

{
  "provider": "openai",
  "baseUrl": "https://api.custom-proxy.com/v1",  // 自定义 URL
  "apiKey": "sk-yyy",
  "id": "gpt-4o"
}
// → 创建自定义提供商 "openai (api.custom-proxy.com)"
```

### 模型去重逻辑

- 同一提供商 + 同一 baseURL 的模型会自动去重
- 不同 baseURL 的相同模型会分别导入到对应的提供商

### API 密钥处理

- **默认行为：** 导入所有 API 密钥
- **安全存储：** 密钥使用 AsyncStorage 加密存储
- **覆盖策略：** 默认不覆盖现有配置，可通过选项调整

---

## 高级选项

### 编程式导入

如果需要更细粒度的控制，可以直接调用服务：

```typescript
import { LegacyImportService } from '@/services/data/LegacyImport';

const result = await LegacyImportService.importProvidersAndModels(
  backupData,
  {
    overwriteExisting: false,  // 是否覆盖现有配置
    importApiKeys: true,        // 是否导入 API 密钥
  }
);

console.log(result);
// {
//   providersImported: 2,
//   customProvidersCreated: 1,
//   modelsImported: 15,
//   errors: []
// }
```

### 错误处理

导入失败的项目会记录在 `errors` 数组中，并输出到日志：

```typescript
if (result.errors.length > 0) {
  logger.error('[Import] Failed items:', result.errors);
}
```

---

## 故障排查

### 问题：提示"不是有效的旧版备份文件"

**原因：** 备份文件格式不匹配

**解决方案：**
1. 确认文件是从旧版 AetherLink 导出的
2. 检查 JSON 格式是否完整（使用 JSON 验证工具）
3. 确认文件包含必需字段：`topics`, `timestamp`, `appInfo`

### 问题：部分提供商或模型未导入

**原因：** 消息中未包含对应的模型信息

**解决方案：**
1. 检查旧版备份中是否有使用该提供商的消息
2. 查看日志中的错误详情
3. 手动在"默认模型"或"自定义提供商"页面添加

### 问题：API 密钥未导入

**原因：** 旧版备份中未保存 API 密钥

**解决方案：**
1. 手动在对应提供商设置页面输入 API 密钥
2. 确认旧版备份时是否勾选了"导出敏感数据"

---

## 数据安全

### API 密钥存储

- ✅ 使用 AsyncStorage 本地加密存储
- ✅ 不会上传到云端
- ✅ 仅设备本地可访问

### 导入权限

- 🔒 导入操作需要用户明确确认
- 🔒 不支持静默导入
- 🔒 所有操作记录在日志中

### 数据覆盖策略

- 📌 默认不覆盖现有配置（`overwriteExisting: false`）
- 📌 相同提供商会自动合并模型列表
- 📌 导入前会验证备份格式

---

## 开发者说明

### 相关文件

| 文件路径 | 说明 |
|---------|------|
| `services/data/LegacyImport.ts` | 导入服务核心逻辑 |
| `app/settings/data-settings.tsx` | 数据设置 UI 页面 |
| `storage/repositories/providers.ts` | 官方提供商存储 |
| `storage/repositories/custom-providers.ts` | 自定义提供商存储 |
| `storage/repositories/provider-models.ts` | 模型列表存储 |

### 扩展导入功能

如需支持更多旧版数据格式，可以扩展 `LegacyImportService`：

```typescript
export const LegacyImportService = {
  // ... 现有方法

  /**
   * 导入会话数据（示例）
   */
  async importConversations(backup: LegacyBackup): Promise<number> {
    // TODO: 实现会话导入逻辑
    return 0;
  },
};
```

---

## 变更记录

### 2025-11-16
- ✨ 初始版本发布
- ✅ 支持提供商、API 密钥、模型列表导入
- ✅ 自动分类官方和自定义提供商
- ✅ 完整的错误处理和日志记录

---

## 反馈与支持

如遇问题或有建议，请通过以下方式反馈：
- 📧 提交 Issue
- 💬 查看日志：设置 > 开发者选项 > 日志
- 📝 查看导入结果详情：确认对话框中的摘要信息
