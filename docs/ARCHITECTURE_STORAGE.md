# AetherLink_z 本地存储架构设计（聊天与附件）

> 目标：在 iOS/Android/Web 三端，可靠持久化会话、消息与附件（图片/文档/音视频），并为设置与密钥提供统一的键值存储。遵循 KISS、YAGNI、SOLID、DRY 原则，先落地最小可用，再按需演进。

- 现状：项目为 Expo 54 + React Native + TypeScript，无存储层实现；聊天 UI 存在基础组件但未接入持久化。
- 本文档范围：本地持久化架构与接口，不涵盖云端同步与端到端加密实现（可扩展方向见“演进”）。

## 设计原则

- KISS：最小依赖与直观模型；用 SQLite 保存结构化数据，用 FileSystem 保存二进制，键值用于设置/密钥。
- YAGNI：不引入 ORM、复杂同步、全文索引与加密，直到确有需求。
- SOLID：
  - SRP：适配器只做存取；Repository 只做领域读写；Provider 只管 DB 生命周期与迁移。
  - OCP：新增字段/表通过迁移扩展，尽量不改上层接口。
  - LSP：不同存储后端可替换实现，不影响上层行为。
  - ISP：Settings/Secrets 与 Chat/Attachment 分离，避免胖接口。
  - DIP：UI 依赖抽象与仓储接口，不依赖具体存储实现。
- DRY：统一 key 前缀、统一时间戳与分页约定、统一 JSON 序列化工具与错误处理。

## 分层架构概览

- 键值层（设置/密钥）
  - 统一使用：`@react-native-async-storage/async-storage`（跨平台兼容）
- 结构化层（会话/消息/关系）
  - `expo-sqlite`（移动端使用原生 SQLite，Web 由 WASM/sql.js 提供后端，需通过 Provider 包裹）
- 文件层（附件二进制）
  - `expo-file-system` 将文件复制到应用私有目录；数据库仅存储 `uri` 与元信息

```
UI Components
   │
   ▼
Hooks (useConversations/useMessages/useSetting)
   │
   ▼
Repositories (Chat/Message/Attachment/Settings/Providers)
   │                     │                 │
   ├── KeyValue Store ───┴─────────────────┘
   │   (AsyncStorage/Web)
   ├── SQLite (expo-sqlite + migrations)
   └── FileSystem (attachments/*)
```

## 目录结构建议

- `storage/core.ts`：接口与公共工具（前缀、JSON、平台判断）
- `storage/adapters/async-storage.ts`：AsyncStorage 适配（统一的键值存储）
- `storage/adapters/web-local.ts`：Web fallback（localStorage/内存）
- `storage/sqlite/db.ts`：SQLiteProvider、打开数据库、事务与通用执行器
- `storage/sqlite/migrations/0001_init.ts`：首个迁移（建表与索引）
- `storage/repositories/chat.ts`：会话读写
- `storage/repositories/messages.ts`：消息读写与分页
- `storage/repositories/attachments.ts`：附件保存/引用计数/GC
- `storage/repositories/settings.ts`：设置读写（键枚举）
- `storage/repositories/providers.ts`：提供商配置与 API Key 管理
- `hooks/use-conversations.ts`、`hooks/use-messages.ts`、`hooks/use-setting.ts`

## 数据模型（SQLite）

- conversations
  - `id TEXT PRIMARY KEY`（UUID）
  - `title TEXT`
  - `created_at INTEGER NOT NULL`（ms since epoch）
  - `updated_at INTEGER NOT NULL`
  - `archived INTEGER DEFAULT 0`
  - `extra TEXT`（JSON 扩展）
- messages
  - `id TEXT PRIMARY KEY`
  - `conversation_id TEXT NOT NULL`（FK）
  - `role TEXT NOT NULL`（'user'|'assistant'|'system'）
  - `text TEXT`
  - `created_at INTEGER NOT NULL`
  - `status TEXT DEFAULT 'sent'`（'pending'|'sent'|'failed'）
  - `parent_id TEXT`（可选，引入线程/树）
  - `extra TEXT`
- attachments
  - `id TEXT PRIMARY KEY`
  - `kind TEXT NOT NULL`（'image'|'file'|'audio'|'video'）
  - `mime TEXT`，`name TEXT`，`size INTEGER`
  - `uri TEXT NOT NULL`
  - `width INTEGER`，`height INTEGER`，`duration_ms INTEGER`
  - `sha256 TEXT`（可选去重）
  - `created_at INTEGER NOT NULL`
  - `extra TEXT`
- message_attachments
  - `message_id TEXT NOT NULL`，`attachment_id TEXT NOT NULL`
  - `PRIMARY KEY (message_id, attachment_id)`
  - 外键皆 `ON DELETE CASCADE`

- 索引
  - `CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at);`
  - `CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);`

迁移示例（0001_init；摘要）：
```
CREATE TABLE IF NOT EXISTS conversations (...);
CREATE TABLE IF NOT EXISTS messages (...);
CREATE TABLE IF NOT EXISTS attachments (...);
CREATE TABLE IF NOT EXISTS message_attachments (...);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
```

## 文件存储策略（expo-file-system）

- 入口：用户选择/分享的文件，复制至 `FileSystem.documentDirectory + 'attachments/<id>.<ext>'`
- 数据库仅保存 `uri` 与元数据；展示时直接使用 `uri`
- Web 端：必要时转换为 Blob URL；注意生命周期与回收
- 清理：
  - 删除消息 → 删除 `message_attachments` 行
  - 若附件失去所有引用 → 删除物理文件 + 删除 `attachments` 行

## 接口与契约（Repositories）

类型：
- `type Role = 'user'|'assistant'|'system'`
- `interface Conversation { id:string; title:string; createdAt:number; updatedAt:number; archived:boolean; extra?:any }`
- `interface Message { id:string; conversationId:string; role:Role; text?:string; createdAt:number; status:'pending'|'sent'|'failed'; parentId?:string; extra?:any }`
- `interface Attachment { id:string; kind:'image'|'file'|'audio'|'video'; uri:string; name?:string; mime?:string; size?:number; width?:number; height?:number; durationMs?:number; sha256?:string; createdAt:number; extra?:any }`

IChatRepository：
- `createConversation(title?: string): Promise<Conversation>`
- `listConversations(opts?: { archived?: boolean; limit?: number; offset?: number }): Promise<Conversation[]>`
- `renameConversation(id: string, title: string): Promise<void>`
- `archiveConversation(id: string, archived?: boolean): Promise<void>`
- `deleteConversation(id: string): Promise<void>`（级联删除）

IMessageRepository：
- `addMessage({ conversationId, role, text, attachmentIds?, status? }): Promise<Message>`
- `listMessages(conversationId: string, opts?: { limit?: number; before?: number }): Promise<Message[]>`
- `updateMessageStatus(id: string, status: 'pending'|'sent'|'failed'): Promise<void>`
- `deleteMessage(id: string): Promise<void>`

IAttachmentRepository：
- `saveAttachmentFromUri(localUri: string, meta?: Partial<Attachment>): Promise<Attachment>`
- `linkToMessage(messageId: string, attachmentId: string): Promise<void>`
- `removeAttachmentIfOrphan(attachmentId: string): Promise<void>`

设置与密钥：
- `enum SettingKey { Theme='al:settings:theme', DefaultModel='al:settings:default_model', ... }`
- `SettingsRepository.get<T>(key: SettingKey): Promise<T|null>`
- `SettingsRepository.set<T>(key: SettingKey, value: T): Promise<void>`
- `ProvidersRepository.getApiKey(id: ProviderId): Promise<string|null>`（统一使用 AsyncStorage）
- `ProvidersRepository.setApiKey(id: ProviderId, value: string): Promise<void>`

键值适配器（IKeyValueStore）：
- `get<T>(key: string): Promise<T|null>`
- `set<T>(key: string, value: T): Promise<void>`
- `remove(key: string): Promise<void>`
- `multiGet(keys: string[]): Promise<Record<string, any>>`
- `multiSet(entries: Record<string, any>): Promise<void>`
- `clearNamespace(prefix: string): Promise<void>`

## 关键业务流程

1) 新建会话
- 生成 `id`、`createdAt/updatedAt`，插入 `conversations`

2) 发送消息（可带附件）
- 若有附件：
  - 遍历选取文件 → 复制到应用目录 → 记录元信息 → 写入 `attachments`
  - 创建消息 → 写入 `messages`
  - 为每个附件写入 `message_attachments`
- 无附件：直接写入 `messages`
- 更新 `conversations.updated_at`
- UI：刷新 `useMessages`、滚动至底部

3) 删除消息
- 删除 `messages` 行（级联删除 `message_attachments`）
- 检查被影响的附件是否仍被引用，不再引用则删除物理文件与 `attachments` 行

4) 列表与分页
- `listConversations`：按 `updated_at DESC` 排序，分页
- `listMessages`：按 `created_at ASC`，支持 `before` 游标与 `limit`

5) 备份/导出（后续）
- `conversations` + `messages` JSON + 附件文件目录打包 zip；导入时重建关系

## 事务、错误与回滚

- 写入链路（消息+附件）使用事务：
  - 开始事务 → 复制文件 → 插入 `attachments` → 插入 `messages` → 关联表 → 提交
  - 任一步失败：回滚 DB 并清理已复制的文件（补偿）
- 文件复制失败：抛错并提示；保留消息草稿（status='failed'）可选

## 跨平台与兼容

- 移动端：原生 SQLite + FileSystem 私有目录
- Web：通过 `SQLiteProvider` 提供 sql.js 后端；附件以 Blob URL 或 Cache API 存储（可在初期简化为内存+下载 URL）
- 安全存储：Web 端不落盘密钥，或使用用户确认后受限的持久化策略（可配置）

## 性能与体验

- 索引：会话更新时间索引、消息会话+时间索引
- 分页：消息按页加载，虚拟列表渲染
- 预取：加载列表同时预取下一页（可选）
- 去重：基于 `sha256` 的附件去重（可按需启用）

## 安全与隐私

- 密钥：统一存储于 `AsyncStorage`；考虑到跨平台兼容性（特别是 Web 端），暂不使用加密存储
- 附件与消息：默认不加密（YAGNI）；可演进为 AES-GCM 本地加密
- 清理：删除会话/消息时清理孤儿附件；提供"一键清空"入口（谨慎暴露）

**注意**：生产环境建议评估敏感数据的安全需求，必要时可引入加密存储方案。

## 实施步骤（最小落地）

1. 安装依赖：
   - `expo-sqlite`、`expo-file-system`、`@react-native-async-storage/async-storage`
2. 新建 `storage/` 与 `hooks/` 目录，编写 `core.ts` 与 KV 适配器
3. `storage/sqlite/db.ts`：集成 `SQLiteProvider`、通用执行器与事务封装
4. `migrations/0001_init.ts`：创建 4 张表与索引
5. 编写 `repositories`：`chat.ts`、`messages.ts`、`attachments.ts`、`settings.ts`、`providers.ts`
6. Hooks：`use-conversations.ts` 与 `use-messages.ts`（分页+刷新），`use-setting.ts`
7. 打通 UI：在聊天输入与消息列表接入仓储（先支持“新建会话+发带图消息”）
8. 基础清理逻辑：删除消息/会话联动清理附件与文件

## 演进路线（按需启用）

- 全文检索：FTS（SQLite）或上层倒排索引
- 本地加密：消息/附件 AES-GCM；加密密钥轮换
- 备份/恢复：Zip 导出/导入；跨设备迁移
- 同步：与后端或云盘集成（离线优先），冲突解决策略
- 指标与诊断：简单日志 + 关键操作埋点（不包含内容）

## 取舍与理由

- SQLite + FileSystem 能覆盖 90% IM/笔记需求，简单且稳定（KISS）
- 不提前引入 ORM/同步/加密（YAGNI）；以迁移机制保证扩展（OCP）
- Repository 与适配器分离（SRP/DIP/ISP），便于替换实现（LSP）
- 统一约定与工具（DRY），减少散落逻辑与错误面

## 开放问题

- Web 端密钥是否允许持久化？默认建议仅内存
- 附件是否需要去重（sha256）？默认关闭，后续打开
- 首批支持的附件类型范围：建议先图片 + 任意文件

---

附：示例 SQL（0001_init 摘要）
```
-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  extra TEXT
);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- messages
CREATE TABLE IF NOT EXISTS messages (
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
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at);

-- attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
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

-- message_attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  message_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  PRIMARY KEY (message_id, attachment_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
);
```

