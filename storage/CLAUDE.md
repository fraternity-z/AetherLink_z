[根目录](../../CLAUDE.md) > **storage**

# 存储模块

## 模块职责

负责应用的数据持久化，包括 SQLite 数据库管理、跨平台存储适配、以及各种数据实体的仓库模式实现。

## 入口与启动

### 初始化流程
1. 应用启动时调用 `storage/sqlite/db.ts` 中的 `initMigrations()`
2. 执行数据库迁移脚本，创建表结构
3. 初始化各个数据仓库，准备数据访问

### 核心入口文件
- `core.ts` - 核心类型定义和工具函数
- `sqlite/db.ts` - 数据库连接和基础操作

## 对外接口

### 数据仓库接口
每个数据仓库提供标准的 CRUD 操作：
- `create*()` - 创建记录
- `get*()` - 获取单条记录
- `list*()` - 获取记录列表
- `update*()` - 更新记录
- `delete*()` - 删除记录

### 存储适配器接口
```typescript
interface IKeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  multiGet(keys: string[]): Promise<Record<string, any>>;
  multiSet(entries: Record<string, any>): Promise<void>;
  clearNamespace(prefix: string): Promise<void>;
}
```

## 关键依赖与配置

### 外部依赖
- `expo-sqlite` - SQLite 数据库
- `@react-native-async-storage/async-storage` - 原生键值存储

### 数据库配置
- 数据库名称: `aetherlink.db`
- 外键约束: 启用 (`PRAGMA foreign_keys = ON`)
- 事务支持: 所有写操作使用事务

### 存储适配器
- `AsyncKVStore` - 移动端使用 AsyncStorage
- `WebLocalKVStore` - Web 端使用 localStorage

## 数据模型

### 核心实体 (core.ts)
```typescript
interface Conversation {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  extra?: any;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  text?: string | null;
  createdAt: number;
  status: 'pending' | 'sent' | 'failed';
  parentId?: string | null;
  extra?: any;
}

interface Attachment {
  id: string;
  kind: 'image' | 'file' | 'audio' | 'video';
  mime?: string | null;
  name?: string | null;
  uri: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sha256?: string | null;
  createdAt: number;
  extra?: any;
}
```

### 数据库表结构
- `conversations` - 对话表
- `messages` - 消息表
- `attachments` - 附件表
- `message_attachments` - 消息附件关联表

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试覆盖
- **数据库操作**: CRUD 操作、事务处理、约束验证
- **存储适配器**: 跨平台兼容性、数据序列化
- **数据仓库**: 业务逻辑验证、错误处理
- **迁移脚本**: 表结构变更、数据迁移

### 测试要点
- 使用内存数据库进行单元测试
- 测试并发数据访问
- 验证数据完整性约束
- 测试存储空间不足等边界情况

## 常见问题 (FAQ)

### Q: 如何添加新的数据实体？
A: 1) 在 `core.ts` 中定义接口 2) 更新 `migrations/0001_init.ts` 的建表脚本 3) 清理本地数据库 4) 实现对应的 Repository

### Q: 如何处理数据库升级？
A: 当前处于开发阶段，所有表结构集中在 `migrations/0001_init.ts`。如需调整 schema，可直接更新该文件并清理本地数据库；当进入发布阶段再恢复分步骤迁移。

### Q: Web 端数据库如何处理？
A: Web 端使用 `expo-sqlite` 的 Web 实现，数据存储在浏览器中。

### Q: 大量数据如何优化性能？
A: 使用索引、分页查询、事务批量操作，考虑数据归档策略。

## 相关文件清单

### 核心模块
- `core.ts` - 类型定义和工具函数
- `sqlite/db.ts` - 数据库连接管理

### 数据仓库
- `repositories/chat.ts` - 对话数据仓库
- `repositories/messages.ts` - 消息数据仓库
- `repositories/attachments.ts` - 附件数据仓库
- `repositories/settings.ts` - 设置数据仓库
- `repositories/providers.ts` - 提供商配置仓库
- `repositories/provider-models.ts` - 模型数据仓库

### 数据库迁移
- `sqlite/migrations/0001_init.ts` - 全量表结构脚本

### 存储适配器
- `adapters/async-storage.ts` - 移动端存储适配器
- `adapters/web-local.ts` - Web 端存储适配器

## 变更记录 (Changelog)

### 2025-11-03 18:47:44
- 创建存储模块文档
- 分析数据模型和仓库结构
- 识别数据库迁移和适配器模式
