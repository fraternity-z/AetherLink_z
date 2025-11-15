[根目录](../../CLAUDE.md) > [services](../) > **data**

# 数据服务模块

## 模块职责

数据服务模块 (`services/data/`) 提供应用数据的备份、清理、统计等高级功能，确保数据的安全性、完整性和性能优化。

## 核心功能

- 💾 **数据备份**: 导出所有对话、消息、附件、设置到 JSON 文件
- 🗑️ **数据清理**: 清理过期数据、孤立记录、缓存文件
- 📊 **数据统计**: 统计消息数量、附件大小、存储占用等
- 📤 **数据导出**: 支持分享备份文件到其他应用
- 🔄 **数据恢复**: 从备份文件恢复数据（待实现）

## 入口与启动

### 主要服务文件
- `DataBackup.ts` - 数据备份服务
- `DataCleanup.ts` - 数据清理服务
- `DataStats.ts` - 数据统计服务

### 使用示例
```typescript
import { DataBackupService } from '@/services/data/DataBackup';
import { DataCleanupService } from '@/services/data/DataCleanup';
import { DataStatsService } from '@/services/data/DataStats';

// 导出数据备份
await DataBackupService.exportAndShare();

// 清理过期数据（保留最近 30 天）
const result = await DataCleanupService.cleanOldData({ daysToKeep: 30 });

// 获取数据统计
const stats = await DataStatsService.getStorageStats();
```

## 对外接口

### DataBackupService (数据备份)
```typescript
export const DataBackupService = {
  /**
   * 导出所有数据到 JSON
   */
  async exportToJSON(): Promise<BackupData>;

  /**
   * 导出并分享备份文件
   */
  async exportAndShare(): Promise<void>;

  /**
   * 从备份文件恢复数据（待实现）
   */
  async restoreFromJSON(backup: BackupData): Promise<void>;
}

export interface BackupData {
  version: string;            // 备份格式版本
  timestamp: number;          // 备份时间戳
  conversations: any[];       // 对话列表
  messages: any[];            // 消息列表
  attachments: any[];         // 附件元数据（不含文件）
  settings: Record<string, any>; // 应用设置
}
```

### DataCleanupService (数据清理)
```typescript
export const DataCleanupService = {
  /**
   * 清理旧数据
   */
  async cleanOldData(options: {
    daysToKeep: number;       // 保留天数
    dryRun?: boolean;         // 仅预览，不实际删除
  }): Promise<CleanupResult>;

  /**
   * 清理孤立附件（无关联消息的附件）
   */
  async cleanOrphanedAttachments(dryRun?: boolean): Promise<number>;

  /**
   * 清理缓存文件
   */
  async cleanCacheFiles(): Promise<number>;

  /**
   * 清理所有数据（慎用！）
   */
  async cleanAllData(): Promise<void>;
}

export interface CleanupResult {
  conversationsDeleted: number;
  messagesDeleted: number;
  attachmentsDeleted: number;
  spaceSaved: number;          // 字节数
}
```

### DataStatsService (数据统计)
```typescript
export const DataStatsService = {
  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<StorageStats>;

  /**
   * 获取对话统计信息
   */
  async getConversationStats(): Promise<ConversationStats>;

  /**
   * 获取消息统计信息
   */
  async getMessageStats(): Promise<MessageStats>;
}

export interface StorageStats {
  databaseSize: number;        // 数据库大小（字节）
  attachmentsSize: number;     // 附件总大小（字节）
  cacheSize: number;           // 缓存大小（字节）
  totalSize: number;           // 总存储占用（字节）
}

export interface ConversationStats {
  total: number;               // 总对话数
  archived: number;            // 已归档对话数
  active: number;              // 活跃对话数
}

export interface MessageStats {
  total: number;               // 总消息数
  userMessages: number;        // 用户消息数
  assistantMessages: number;   // 助手消息数
  withAttachments: number;     // 带附件的消息数
}
```

## 关键依赖与配置

### 存储依赖
- `@/storage/repositories/chat` - 对话数据访问
- `@/storage/repositories/messages` - 消息数据访问
- `@/storage/repositories/attachments` - 附件数据访问
- `@react-native-async-storage/async-storage` - 设置存储

### 文件系统
- `expo-file-system` - 文件操作（Directory, File, Paths）
- `expo-sharing` - 文件分享功能

### 日志工具
- `@/utils/logger` - 结构化日志记录

## 数据模型

### 备份数据结构
```typescript
{
  "version": "1.0.0",
  "timestamp": 1700000000000,
  "conversations": [
    {
      "id": "conv-1",
      "title": "对话标题",
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000,
      "archived": false
    }
  ],
  "messages": [
    {
      "id": "msg-1",
      "conversationId": "conv-1",
      "role": "user",
      "text": "消息内容",
      "createdAt": 1700000000000,
      "status": "sent"
    }
  ],
  "attachments": [
    {
      "id": "att-1",
      "kind": "image",
      "name": "image.png",
      "size": 102400,
      // uri 字段已移除（仅保留元数据）
    }
  ],
  "settings": {
    "al:theme:mode": "dark",
    "al:model:default": "gpt-4"
  }
}
```

### 清理策略
- **时间基准清理**: 根据 `daysToKeep` 参数删除过期数据
- **孤立数据清理**: 删除无关联的附件和消息
- **缓存清理**: 清理临时文件和搜索缓存
- **级联删除**: 删除对话时自动删除相关消息和附件

## 实现细节

### 数据备份流程
1. 从数据库读取所有对话、消息、附件
2. 从 AsyncStorage 读取所有设置（`al:` 前缀）
3. 序列化为 JSON 格式
4. 写入文件系统（`document/backups/` 目录）
5. 调用分享 API 导出文件

### 数据清理流程
1. 计算截止时间戳（`now - daysToKeep * 86400000`）
2. 查询需要删除的数据记录
3. 如果是 `dryRun` 模式，仅返回统计信息
4. 执行级联删除（对话 → 消息 → 附件 → 文件）
5. 返回清理结果统计

### 数据统计流程
1. 查询数据库表的行数和大小
2. 统计附件文件的总大小
3. 统计缓存文件的大小
4. 汇总并返回统计信息

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试策略
- **备份测试**: 验证备份数据的完整性和格式正确性
- **清理测试**: 测试数据清理的准确性和安全性
- **恢复测试**: 验证从备份恢复数据的正确性
- **统计测试**: 测试统计数据的准确性

### 测试要点
- 备份文件的 JSON 格式验证
- 清理操作的事务性和回滚
- 大数据量的性能测试
- 边界情况处理（空数据、损坏数据等）

## 常见问题 (FAQ)

### Q: 备份文件存储在哪里？
A: 备份文件存储在 `document/backups/` 目录，使用时间戳作为文件名。

### Q: 备份是否包含附件文件本身？
A: 当前版本仅备份附件元数据，不包含文件本身。未来可能支持完整备份。

### Q: 数据清理是否可以撤销？
A: 当前版本不支持撤销，建议使用 `dryRun` 模式预览后再执行。

### Q: 如何从备份恢复数据？
A: 数据恢复功能待实现，建议保留重要的备份文件。

### Q: 清理数据会影响性能吗？
A: 大量数据清理可能阻塞主线程，建议在后台或空闲时执行。

## 性能优化

### 备份优化
- 分批读取数据，避免一次性加载所有数据到内存
- 使用流式写入，减少内存占用
- 压缩备份文件（未来优化）

### 清理优化
- 使用数据库事务批量删除
- 先删除数据库记录，再删除文件（避免文件锁）
- 异步清理，不阻塞主线程

### 统计优化
- 缓存统计结果，避免重复计算
- 使用数据库聚合查询，减少数据传输
- 增量更新统计数据

## 安全性考虑

### 备份安全
- 备份文件包含敏感数据（API Key、对话内容），需妥善保管
- 建议用户加密备份文件（未来功能）
- 分享前提示用户确认

### 清理安全
- 提供 `dryRun` 模式预览清理结果
- 清理前弹窗确认
- 记录清理日志，便于追溯

### 数据完整性
- 使用数据库事务确保原子性
- 级联删除确保数据一致性
- 备份前验证数据完整性

## 扩展指南

### 添加新的清理策略
```typescript
// 在 DataCleanupService 中添加新方法
async cleanByCustomRule(rule: CleanupRule): Promise<CleanupResult> {
  // 实现自定义清理逻辑
}
```

### 实现增量备份
```typescript
// 只备份自上次备份后的新数据
async exportIncremental(lastBackupTimestamp: number): Promise<BackupData> {
  // 查询 createdAt > lastBackupTimestamp 的数据
}
```

### 支持备份加密
```typescript
import * as Crypto from 'expo-crypto';

async exportEncrypted(password: string): Promise<void> {
  const data = await this.exportToJSON();
  const encrypted = await Crypto.encrypt(JSON.stringify(data), password);
  // 写入加密文件
}
```

## 相关文件清单

### 核心服务
- `DataBackup.ts` - 数据备份服务
- `DataCleanup.ts` - 数据清理服务
- `DataStats.ts` - 数据统计服务

### 依赖模块
- `../../storage/repositories/chat.ts` - 对话数据
- `../../storage/repositories/messages.ts` - 消息数据
- `../../storage/repositories/attachments.ts` - 附件数据
- `../../utils/logger.ts` - 日志工具

### 使用位置
- `app/settings/data-settings.tsx` - 数据管理设置页面
- 其他可能触发数据清理的场景

## 变更记录 (Changelog)

### 2025-11-15
- 创建数据服务模块文档
- 详细记录备份、清理、统计功能
- 添加安全性和性能优化建议
- 提供扩展开发指南和最佳实践
