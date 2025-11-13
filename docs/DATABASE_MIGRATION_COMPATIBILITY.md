# AetherLink → AetherLink_z 数据库兼容性导入方案

## 概述

本文档分析 AetherLink (旧版) 和 AetherLink_z (新版) 之间的数据库差异，并提供兼容性导入方案。

## 数据库架构对比

### 技术栈差异

| 项目 | 数据库引擎 | 存储位置 | 版本 | 迁移管理 |
|------|-----------|---------|------|---------|
| **AetherLink (旧版)** | IndexedDB (idb) | 浏览器/桌面端 | v7 | DatabaseMigrationManager |
| **AetherLink_z (新版)** | SQLite (expo-sqlite) | 移动端/Web | v4 | Migration Scripts |

### 数据模型映射关系

| 旧版 (AetherLink) | 新版 (AetherLink_z) | 映射关系 | 备注 |
|------------------|-------------------|---------|------|
| `topics` | `conversations` | 直接映射 | 核心对话数据 |
| `messages` | `messages` | 直接映射 | 消息数据 |
| `assistants` | 设置项 (AsyncStorage) | 配置映射 | 助手配置转为设置 |
| `message_blocks` | `messages.text` | 合并 | 消息块合并为单一文本 |
| `images` / `imageMetadata` | `attachments` | 类型映射 | 图片转为附件 |
| `files` | `attachments` | 类型映射 | 文件转为附件 |
| `knowledge_bases` | ❌ 不支持 | - | 新版暂无知识库功能 |
| `knowledge_documents` | ❌ 不支持 | - | 新版暂无知识库功能 |
| `quick_phrases` | ❌ 不支持 | - | 新版暂无快捷短语功能 |
| `memories` | ❌ 不支持 | - | 新版暂无知识图谱功能 |
| ❌ 不支持 | `thinking_chains` | 新增 | 思考链功能 (新版独有) |
| ❌ 不支持 | `provider_models` | 新增 | 提供商模型配置 (新版独有) |
| ❌ 不支持 | `mcp_servers` | 新增 | MCP 服务器配置 (新版独有) |

## 核心表结构对比

### 对话表 (topics → conversations)

#### 旧版 `topics` 表结构
```typescript
interface ChatTopic {
  id: string;
  title: string;
  assistantId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  messages: Message[];  // 消息数组（版本5+）
  messageIds?: string[]; // 消息ID数组（版本4）
  _lastMessageTimeNum: number;
  createdAt: string;
  updatedAt?: string;
  // ... 其他字段
}
```

#### 新版 `conversations` 表结构
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  extra TEXT  -- JSON 存储额外字段
);
```

**字段映射：**
- `id` → `id`
- `title` → `title`
- `createdAt` → `created_at` (转换为时间戳)
- `updatedAt` → `updated_at` (转换为时间戳)
- `assistantId`, `model`, `temperature`, `maxTokens`, `systemPrompt` → `extra` (JSON)

### 消息表 (messages → messages)

#### 旧版 `messages` 表结构
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
  topicId: string;
  assistantId?: string;
  createdAt: string;
  updatedAt?: string;
  // ... 其他字段
}
```

#### 新版 `messages` 表结构
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'sent',
  parent_id TEXT,
  extra TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

**字段映射：**
- `id` → `id`
- `role` → `role`
- `content` → `text` (如果是数组则合并)
- `topicId` → `conversation_id`
- `createdAt` → `created_at` (转换为时间戳)
- `assistantId` → `extra` (JSON)

### 附件表 (images/files → attachments)

#### 旧版 `imageMetadata` / `files` 结构
```typescript
interface ImageMetadata {
  id: string;
  topicId: string;
  created: number;
  size?: number;
  type?: string;
  name?: string;
}
```

#### 新版 `attachments` 表结构
```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,           -- 'image' | 'file' | 'audio' | 'video'
  mime TEXT,
  name TEXT,
  uri TEXT NOT NULL,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  sha256 TEXT,
  created_at INTEGER NOT NULL,
  extra TEXT
);
```

**字段映射：**
- `id` → `id`
- 根据 `type` 判断 → `kind`
- `type` → `mime`
- `name` → `name`
- `size` → `size`
- `created` → `created_at`

## 导入策略

### 方案一：完整导入 (推荐)

**适用场景：** 用户希望将旧版所有数据迁移到新版

**实现步骤：**

1. **导出旧版数据**
   ```typescript
   // 从 IndexedDB 导出数据
   async function exportOldDatabase() {
     const db = await openDB('aetherlink-db-new', 7);

     return {
       topics: await db.getAll('topics'),
       messages: await db.getAll('messages'),
       assistants: await db.getAll('assistants'),
       imageMetadata: await db.getAll('imageMetadata'),
       images: await db.getAll('images'),
       settings: await db.getAll('settings'),
     };
   }
   ```

2. **数据转换**
   ```typescript
   // 转换 topics → conversations
   function convertTopicToConversation(topic: ChatTopic): Conversation {
     return {
       id: topic.id,
       title: topic.title || '未命名对话',
       createdAt: new Date(topic.createdAt).getTime(),
       updatedAt: topic.updatedAt
         ? new Date(topic.updatedAt).getTime()
         : new Date(topic.createdAt).getTime(),
       archived: false,
       extra: JSON.stringify({
         assistantId: topic.assistantId,
         model: topic.model,
         temperature: topic.temperature,
         maxTokens: topic.maxTokens,
         systemPrompt: topic.systemPrompt,
       }),
     };
   }

   // 转换 messages
   function convertMessage(message: OldMessage, conversationId: string): Message {
     let text = '';
     if (typeof message.content === 'string') {
       text = message.content;
     } else if (Array.isArray(message.content)) {
       // 合并 MessageContent[] 为纯文本
       text = message.content
         .map(block => block.type === 'text' ? block.text : '')
         .join('\n');
     }

     return {
       id: message.id,
       conversationId,
       role: message.role,
       text,
       createdAt: new Date(message.createdAt).getTime(),
       status: 'sent',
       parentId: null,
       extra: JSON.stringify({
         assistantId: message.assistantId,
         originalContent: message.content, // 保留原始数据
       }),
     };
   }

   // 转换 images → attachments
   function convertImageToAttachment(
     metadata: ImageMetadata,
     imageBlob: Blob
   ): Attachment {
     return {
       id: metadata.id,
       kind: 'image',
       mime: metadata.type || 'image/png',
       name: metadata.name || `image-${metadata.id}`,
       uri: URL.createObjectURL(imageBlob), // 需要处理存储
       size: metadata.size,
       createdAt: metadata.created,
       extra: JSON.stringify({
         topicId: metadata.topicId,
       }),
     };
   }
   ```

3. **导入到新版数据库**
   ```typescript
   async function importToNewDatabase(exportedData: any) {
     const db = await getDatabase(); // 获取 SQLite 数据库实例

     // 开启事务
     await db.transaction(async tx => {
       // 导入 conversations
       for (const topic of exportedData.topics) {
         const conversation = convertTopicToConversation(topic);
         await tx.executeSql(
           `INSERT OR REPLACE INTO conversations
            (id, title, created_at, updated_at, archived, extra)
            VALUES (?, ?, ?, ?, ?, ?)`,
           [
             conversation.id,
             conversation.title,
             conversation.createdAt,
             conversation.updatedAt,
             conversation.archived ? 1 : 0,
             conversation.extra,
           ]
         );

         // 导入该对话的消息
         const topicMessages = topic.messages || [];
         for (const message of topicMessages) {
           const convertedMsg = convertMessage(message, topic.id);
           await tx.executeSql(
             `INSERT OR REPLACE INTO messages
              (id, conversation_id, role, text, created_at, status, parent_id, extra)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
             [
               convertedMsg.id,
               convertedMsg.conversationId,
               convertedMsg.role,
               convertedMsg.text,
               convertedMsg.createdAt,
               convertedMsg.status,
               convertedMsg.parentId,
               convertedMsg.extra,
             ]
           );
         }
       }

       // 导入附件 (images)
       for (const metadata of exportedData.imageMetadata) {
         const imageBlob = exportedData.images.find(img => img.id === metadata.id);
         if (imageBlob) {
           const attachment = convertImageToAttachment(metadata, imageBlob);
           // 需要实现文件存储和 URI 生成逻辑
           // ...
         }
       }
     });
   }
   ```

### 方案二：选择性导入

**适用场景：** 用户仅希望导入部分数据（如最近30天的对话）

**实现步骤：**
- 在导出阶段添加过滤条件
- 只导出符合条件的 topics 和 messages
- 其他步骤与方案一相同

### 方案三：双向同步 (高级)

**适用场景：** 用户希望在新旧版本间切换，保持数据同步

**实现步骤：**
- 实现数据导出 API (旧版)
- 实现数据导入 API (新版)
- 定期执行双向同步脚本
- 处理冲突解决策略

## 注意事项与风险

### 数据丢失风险

❌ **以下功能在新版中不支持，导入时会丢失：**
- 知识库 (knowledge_bases, knowledge_documents)
- 快捷短语 (quick_phrases)
- 知识图谱 (memories)

⚠️ **建议：**
- 导入前备份旧版数据
- 明确告知用户哪些功能不可用
- 在 `extra` 字段中保留原始数据，便于后续恢复

### 数据转换风险

⚠️ **需要特别处理的情况：**

1. **消息块 (message_blocks) 合并：**
   - 旧版支持富文本消息块
   - 新版目前仅支持纯文本
   - 需要将多个块合并为单一文本

2. **图片和文件存储：**
   - 旧版存储在 IndexedDB (Blob)
   - 新版需要文件系统路径 (URI)
   - 需要实现 Blob → 文件转换逻辑

3. **时间格式转换：**
   - 旧版使用 ISO 字符串 (string)
   - 新版使用 Unix 时间戳 (number)
   - 需要严格转换避免时区问题

4. **外键约束：**
   - 新版使用 SQLite 外键约束
   - 导入前需确保引用完整性
   - 先导入 conversations，再导入 messages

### 性能优化建议

✅ **批量操作：**
- 使用事务批量插入数据
- 避免单条插入导致的性能问题

✅ **进度提示：**
- 大数据量导入可能耗时较长
- 提供进度条和取消功能

✅ **错误恢复：**
- 导入失败时回滚事务
- 记录失败的数据项便于人工处理

## 实现清单

### 前置工作
- [ ] 分析旧版数据库版本 (确认是 v4/v5/v6/v7)
- [ ] 确定需要导入的数据范围 (全部 / 最近 / 筛选)
- [ ] 备份旧版数据库

### 核心功能
- [ ] 实现旧版数据导出工具 (IndexedDB → JSON)
- [ ] 实现数据转换器 (topics → conversations, messages → messages)
- [ ] 实现新版数据导入器 (JSON → SQLite)
- [ ] 实现图片/文件存储转换 (Blob → File System)

### 用户界面
- [ ] 设计导入向导页面
- [ ] 添加文件选择器 (选择导出的 JSON 文件)
- [ ] 显示导入预览 (显示即将导入的数据量)
- [ ] 添加进度条和状态提示
- [ ] 处理导入成功/失败反馈

### 测试与验证
- [ ] 单元测试 (数据转换逻辑)
- [ ] 集成测试 (完整导入流程)
- [ ] 边界测试 (空数据、大数据量、异常数据)
- [ ] 用户验收测试 (真实数据迁移)

## 示例：完整导入脚本

```typescript
// services/data/DataImport.ts

import { getDatabase } from '@/storage/sqlite/db';
import type { Conversation, Message, Attachment } from '@/storage/core';

interface OldDatabaseExport {
  topics: any[];
  messages: any[];
  assistants: any[];
  imageMetadata: any[];
  images: Blob[];
  settings: any[];
}

export class DataImporter {
  /**
   * 从旧版数据库导入数据
   */
  static async importFromOldDatabase(
    exportedData: OldDatabaseExport,
    onProgress?: (progress: number, status: string) => void
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let totalItems = 0;
    let processedItems = 0;

    try {
      // 计算总数
      totalItems = exportedData.topics.length +
                   exportedData.topics.reduce((sum, t) => sum + (t.messages?.length || 0), 0);

      onProgress?.(0, '开始导入数据...');

      const db = await getDatabase();

      await db.transaction(async tx => {
        // 1. 导入对话
        for (const topic of exportedData.topics) {
          try {
            const conversation = this.convertTopicToConversation(topic);
            await this.insertConversation(tx, conversation);
            processedItems++;
            onProgress?.(
              (processedItems / totalItems) * 100,
              `正在导入对话: ${conversation.title}`
            );

            // 2. 导入该对话的消息
            const messages = topic.messages || [];
            for (const message of messages) {
              try {
                const convertedMsg = this.convertMessage(message, topic.id);
                await this.insertMessage(tx, convertedMsg);
                processedItems++;
                onProgress?.(
                  (processedItems / totalItems) * 100,
                  `正在导入消息...`
                );
              } catch (error) {
                errors.push(`消息 ${message.id} 导入失败: ${error}`);
              }
            }
          } catch (error) {
            errors.push(`对话 ${topic.id} 导入失败: ${error}`);
          }
        }
      });

      onProgress?.(100, '导入完成!');

      return {
        success: errors.length === 0,
        errors,
      };

    } catch (error) {
      errors.push(`导入过程中发生错误: ${error}`);
      return {
        success: false,
        errors,
      };
    }
  }

  private static convertTopicToConversation(topic: any): Conversation {
    // ... (见上文)
  }

  private static convertMessage(message: any, conversationId: string): Message {
    // ... (见上文)
  }

  private static async insertConversation(tx: any, conversation: Conversation): Promise<void> {
    // ... (见上文)
  }

  private static async insertMessage(tx: any, message: Message): Promise<void> {
    // ... (见上文)
  }
}
```

## 总结

通过以上方案，可以实现从旧版 AetherLink (IndexedDB) 到新版 AetherLink_z (SQLite) 的数据迁移。核心思路是：

1. **导出旧版数据** (IndexedDB → JSON)
2. **转换数据格式** (topics → conversations, messages → messages)
3. **导入新版数据** (JSON → SQLite)
4. **处理特殊情况** (图片存储、消息块合并、时间转换)

建议从最简单的场景开始实现（对话和消息），逐步添加附件、设置等功能的支持。

---

**文档版本:** v1.0
**创建日期:** 2025-11-13
**维护者:** 浮浮酱 ฅ'ω'ฅ
