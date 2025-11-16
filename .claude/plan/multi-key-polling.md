# 项目任务分解规划 - 提供商多Key轮询功能

## 已明确的决策

### 技术决策
- ✅ 使用 SQLite 本地数据库存储多 Key 配置（已有基础设施）
- ✅ **Key 存储不加密**：和当前单Key存储一致，直接存储在SQLite（用户确认）
- ✅ 采用 Repository 模式封装数据访问层（符合项目架构）
- ✅ **只实现"轮询"(round_robin)策略**：其他策略暂不实现（用户确认）
- ✅ Key 连续失败 3 次自动标记为 `error` 状态
- ✅ `error` 状态 Key 进入 5 分钟冷却期后自动恢复
- ✅ 使用 React Native Paper UI 组件库（但需自定义以实现1:1还原）
- ✅ 参考 `E:\code\AetherLink\src\shared\services\ApiKeyManager.ts` 核心逻辑

### 架构决策
- ✅ **单Key和多Key可切换**：用户可以在单Key模式和多Key模式之间切换（重要特性）
- ✅ 保留向后兼容：单 Key 模式继续工作
- ✅ 数据迁移策略：通过数据库迁移脚本自动从单 Key 迁移到多 Key
- ✅ 失败重试策略：最多重试 3 次，自动切换可用 Key
- ✅ **UI严格1:1还原截图**：严格按照用户提供的截图进行设计（用户确认）
- ✅ 图片生成暂不支持多Key（降低测试复杂度）

---

## 整体规划概述

### 项目目标

为 AetherLink_z 应用添加**提供商多 Key 轮询功能**，实现以下核心能力：

1. **多 Key 管理**：每个 AI 提供商支持配置多个 API Key
2. **负载均衡**：自动按策略（轮询/优先级/最少使用/随机）选择可用 Key
3. **故障转移**：API 调用失败时自动切换到下一个可用 Key
4. **健康监控**：实时跟踪 Key 使用统计、成功率、错误状态
5. **自动恢复**：错误 Key 冷却期后自动重新激活

### 技术栈

- **前端框架**: React Native 0.81.5 + Expo 54
- **UI 组件库**: React Native Paper 5.14.5
- **数据库**: Expo SQLite（已有基础设施）
- **状态管理**: React Hooks + Context
- **路由**: Expo Router（文件路由）
- **开发语言**: TypeScript 5.9.2

### 主要阶段

本项目分为 **3 个主要阶段**，共 **4-5 天**工作量：

1. **数据层重构** (1.5 天) - 数据库表设计、迁移脚本、Repository 实现
2. **服务层开发** (1.5 天) - ApiKeyManager 服务、AiClient 集成、重试逻辑
3. **UI 层开发** (1.5-2 天) - 多 Key 管理页面、统计卡片、列表交互

---

## 详细任务分解

### 阶段 1：数据层重构（1.5 天）

#### 任务 1.1：设计多 Key 数据模型

**目标**：
- 定义 `ApiKeyConfig` 数据结构
- 设计数据库表 schema
- 规划单 Key → 多 Key 的数据迁移策略

**输入**：
- 参考实现 `ApiKeyConfig` 接口（`E:\code\AetherLink\src\shared\config\defaultModels.ts`）
- 现有提供商配置存储逻辑（`storage/repositories/providers.ts`）

**输出**：
- TypeScript 类型定义文件 `storage/types/api-key-config.ts`
- 数据库迁移脚本（SQL）`storage/sqlite/migrations/0002_multi_key.ts`
- 数据迁移逻辑文档

**涉及文件**：
- 新增 `storage/types/api-key-config.ts`
- 新增 `storage/sqlite/migrations/0002_multi_key.ts`
- 更新 `storage/sqlite/db.ts`（注册新迁移）

**验收标准**：
- ✅ `ApiKeyConfig` 接口完整定义（包含 id, key, name, isEnabled, priority, usage, status 等字段）
- ✅ 数据库表 `provider_api_keys` 创建成功，包含所有必需字段和索引
- ✅ 支持从现有 `al:provider:*:api_key` 迁移到新表

**预估工作量**: 4 小时

**数据模型设计**：

```typescript
// storage/types/api-key-config.ts
export type KeyStatus = 'active' | 'disabled' | 'error';
export type LoadBalanceStrategy = 'round_robin' | 'priority' | 'least_used' | 'random';

export interface ApiKeyConfig {
  id: string;                      // 唯一标识符（UUID）
  providerId: string;              // 提供商 ID（openai, anthropic 等）
  key: string;                     // API Key 值（加密存储）
  name?: string;                   // 可选的 Key 名称/备注
  isEnabled: boolean;              // 是否启用
  isPrimary: boolean;              // 是否为主要密钥（UI 显示用）
  priority: number;                // 优先级 (1-10, 数字越小优先级越高)

  // 使用统计
  usage: {
    totalRequests: number;         // 总请求数
    successfulRequests: number;    // 成功请求数
    failedRequests: number;        // 失败请求数
    lastUsed?: number;             // 最后使用时间戳
    consecutiveFailures: number;   // 连续失败次数
  };

  // 状态信息
  status: KeyStatus;               // Key 状态
  lastError?: string;              // 最后的错误信息

  // 时间戳
  createdAt: number;
  updatedAt: number;
}

export interface ProviderKeyManagement {
  providerId: string;
  strategy: LoadBalanceStrategy;   // 负载均衡策略
  enableMultiKey: boolean;         // 是否启用多 Key 模式
  maxFailuresBeforeDisable: number; // 连续失败多少次后禁用（默认 3）
  failureRecoveryTimeMinutes: number; // 冷却期（默认 5 分钟）
}
```

**数据库表设计**：

```sql
-- storage/sqlite/migrations/0002_multi_key.ts
CREATE TABLE IF NOT EXISTS provider_api_keys (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT,
  is_enabled INTEGER DEFAULT 1,
  is_primary INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 5,

  -- 使用统计
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_used INTEGER,
  consecutive_failures INTEGER DEFAULT 0,

  -- 状态信息
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled', 'error')),
  last_error TEXT,

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- 约束
  UNIQUE(provider_id, key)
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider ON provider_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_keys_status ON provider_api_keys(provider_id, status, is_enabled);
CREATE INDEX IF NOT EXISTS idx_provider_keys_priority ON provider_api_keys(provider_id, priority);

-- Key 管理配置表
CREATE TABLE IF NOT EXISTS provider_key_management (
  provider_id TEXT PRIMARY KEY,
  strategy TEXT DEFAULT 'round_robin' CHECK(strategy IN ('round_robin', 'priority', 'least_used', 'random')),
  enable_multi_key INTEGER DEFAULT 0,
  max_failures_before_disable INTEGER DEFAULT 3,
  failure_recovery_time_minutes INTEGER DEFAULT 5,
  updated_at INTEGER NOT NULL
);
```

---

#### 任务 1.2：实现 ProviderKeysRepository 数据仓库

**目标**：
- 实现多 Key 的 CRUD 操作
- 提供 Key 选择、状态更新、统计查询等方法

**输入**：
- 任务 1.1 的数据模型定义

**输出**：
- `storage/repositories/provider-keys.ts` 完整实现

**涉及文件**：
- 新增 `storage/repositories/provider-keys.ts`
- 新增 `storage/repositories/provider-key-management.ts`

**验收标准**：
- ✅ 提供 `create`, `update`, `delete`, `list`, `getById` 等基础方法
- ✅ 提供 `listActiveKeys` 方法（过滤 enabled + non-cooldown）
- ✅ 提供 `updateUsageStats` 方法（原子更新统计数据）
- ✅ 提供 `getKeyStats` 方法（返回总数、正常数、错误数、成功率）
- ✅ 所有数据库操作使用事务确保原子性

**预估工作量**: 6 小时

**核心接口**：

```typescript
// storage/repositories/provider-keys.ts
export const ProviderKeysRepository = {
  // 基础 CRUD
  async create(config: Omit<ApiKeyConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiKeyConfig>
  async update(id: string, updates: Partial<ApiKeyConfig>): Promise<void>
  async delete(id: string): Promise<void>
  async getById(id: string): Promise<ApiKeyConfig | null>
  async listByProvider(providerId: string): Promise<ApiKeyConfig[]>

  // 高级查询
  async listActiveKeys(providerId: string): Promise<ApiKeyConfig[]> // 过滤 enabled + 非冷却期
  async getPrimaryKey(providerId: string): Promise<ApiKeyConfig | null>

  // 使用统计
  async updateUsageStats(id: string, success: boolean, error?: string): Promise<void>
  async resetConsecutiveFailures(id: string): Promise<void>

  // 状态管理
  async setStatus(id: string, status: KeyStatus): Promise<void>
  async setPrimary(providerId: string, keyId: string): Promise<void>

  // 统计数据
  async getKeyStats(providerId: string): Promise<{
    total: number;
    active: number;
    error: number;
    disabled: number;
    successRate: number;
  }>

  // 冷却期检测
  async isInCooldown(keyId: string): Promise<boolean>
}

// storage/repositories/provider-key-management.ts
export const ProviderKeyManagementRepository = {
  async get(providerId: string): Promise<ProviderKeyManagement | null>
  async upsert(config: ProviderKeyManagement): Promise<void>
  async getStrategy(providerId: string): Promise<LoadBalanceStrategy>
  async setStrategy(providerId: string, strategy: LoadBalanceStrategy): Promise<void>
}
```

---

#### 任务 1.3：编写数据迁移脚本和向后兼容逻辑

**目标**：
- 将现有单 Key 数据自动迁移到新表
- 确保未升级用户的单 Key 模式继续工作

**输入**：
- 现有 `ProvidersRepository.getApiKey()` 逻辑
- 新的 `ProviderKeysRepository`

**输出**：
- 数据迁移逻辑（在 `0002_multi_key.ts` 中）
- 向后兼容适配器 `storage/adapters/legacy-key-adapter.ts`

**涉及文件**：
- 更新 `storage/sqlite/migrations/0002_multi_key.ts`
- 新增 `storage/adapters/legacy-key-adapter.ts`
- 更新 `storage/repositories/providers.ts`（添加兼容逻辑）

**验收标准**：
- ✅ 首次运行迁移脚本时，自动检测 AsyncStorage 中的 `al:provider:*:api_key`
- ✅ 将所有单 Key 迁移到 `provider_api_keys` 表（标记为 `isPrimary=true`）
- ✅ 保留原有 AsyncStorage 数据（避免意外数据丢失）
- ✅ 提供回退机制：如果多 Key 表为空，自动 fallback 到 AsyncStorage

**预估工作量**: 4 小时

**迁移脚本示例**：

```sql
-- 在 0002_multi_key.ts 中添加
-- 数据迁移逻辑在 TypeScript 中实现，SQL 只创建表结构
```

```typescript
// storage/adapters/legacy-key-adapter.ts
export const LegacyKeyAdapter = {
  /**
   * 自动迁移单 Key 到多 Key 表
   */
  async migrateFromAsyncStorage(): Promise<void> {
    const providers: ProviderId[] = ['openai', 'anthropic', 'google', 'deepseek', 'volc', 'zhipu'];

    for (const providerId of providers) {
      const legacyKey = await ProvidersRepository.getApiKey(providerId);
      if (!legacyKey) continue;

      const existingKeys = await ProviderKeysRepository.listByProvider(providerId);
      if (existingKeys.length > 0) continue; // 已迁移，跳过

      await ProviderKeysRepository.create({
        providerId,
        key: legacyKey,
        name: '默认密钥（迁移）',
        isEnabled: true,
        isPrimary: true,
        priority: 1,
        usage: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          consecutiveFailures: 0,
        },
        status: 'active',
      });

      logger.info('[LegacyKeyAdapter] 自动迁移单 Key', { providerId });
    }
  },

  /**
   * 向后兼容：如果多 Key 表为空，fallback 到 AsyncStorage
   */
  async getCompatibleKey(providerId: ProviderId): Promise<string | null> {
    const keys = await ProviderKeysRepository.listByProvider(providerId);
    if (keys.length > 0) {
      const primary = keys.find(k => k.isPrimary) || keys[0];
      return primary.key;
    }

    // Fallback 到 AsyncStorage
    return await ProvidersRepository.getApiKey(providerId);
  },
};
```

---

### 阶段 2：服务层开发（1.5 天）

#### 任务 2.1：实现 ApiKeyManager 服务

**目标**：
- 实现多 Key 负载均衡服务
- 支持轮询、优先级、最少使用、随机四种策略
- 实现 Key 状态管理和冷却期逻辑

**输入**：
- 参考实现 `E:\code\AetherLink\src\shared\services\ApiKeyManager.ts`
- `ProviderKeysRepository` 数据访问接口

**输出**：
- `services/ai/ApiKeyManager.ts` 完整实现

**涉及文件**：
- 新增 `services/ai/ApiKeyManager.ts`
- 更新 `services/ai/index.ts`（导出新服务）

**验收标准**：
- ✅ 实现 `selectApiKey(providerId, strategy)` 方法
- ✅ 实现轮询策略（真正的循环，类似 Python itertools.cycle）
- ✅ 实现优先级、最少使用、随机策略
- ✅ 自动过滤 disabled 和冷却期中的 Key
- ✅ 提供 `updateKeyStatus(keyId, success, error)` 方法
- ✅ 连续失败 3 次自动标记为 `error` 状态
- ✅ 提供 `isInCooldown(keyId)` 检测方法（5 分钟冷却期）
- ✅ 提供 `getKeyStats(providerId)` 统计方法

**预估工作量**: 8 小时

**核心接口**：

```typescript
// services/ai/ApiKeyManager.ts
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private roundRobinIndexMap = new Map<string, number>();

  static getInstance(): ApiKeyManager;

  /**
   * 选择可用的 API Key
   * @returns { key: ApiKeyConfig | null, reason: string }
   */
  async selectApiKey(
    providerId: string,
    strategy?: LoadBalanceStrategy
  ): Promise<{ key: ApiKeyConfig | null; reason: string }>;

  /**
   * 更新 Key 使用状态（成功/失败）
   */
  async updateKeyStatus(
    keyId: string,
    success: boolean,
    error?: string
  ): Promise<void>;

  /**
   * 检查 Key 是否在冷却期
   */
  async isInCooldown(keyId: string): Promise<boolean>;

  /**
   * 获取统计数据
   */
  async getKeyStats(providerId: string): Promise<{
    total: number;
    active: number;
    error: number;
    disabled: number;
    successRate: number;
  }>;

  /**
   * 重置轮询状态（当 Key 配置变化时调用）
   */
  resetRoundRobinState(providerId?: string): void;

  /**
   * 验证 API Key 格式
   */
  validateKeyFormat(key: string, providerId: string): boolean;
}
```

**关键实现逻辑**：

```typescript
// 轮询策略实现（真正的循环）
private async selectByRoundRobin(
  providerId: string,
  availableKeys: ApiKeyConfig[]
): Promise<ApiKeyConfig> {
  // 按 ID 排序确保一致性
  const sortedKeys = availableKeys.sort((a, b) => a.id.localeCompare(b.id));

  // 获取当前索引
  let currentIndex = this.roundRobinIndexMap.get(providerId) || 0;

  // 选择当前索引对应的 Key
  const selectedKey = sortedKeys[currentIndex];

  // 更新索引到下一个位置（循环）
  const nextIndex = (currentIndex + 1) % sortedKeys.length;
  this.roundRobinIndexMap.set(providerId, nextIndex);

  logger.info('[ApiKeyManager] 轮询选择', {
    providerId,
    keyName: selectedKey.name || selectedKey.id.substring(0, 8),
    currentIndex,
    totalKeys: sortedKeys.length,
  });

  return selectedKey;
}

// Key 状态更新（连续失败检测）
async updateKeyStatus(
  keyId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const key = await ProviderKeysRepository.getById(keyId);
  if (!key) return;

  const now = Date.now();

  if (success) {
    // 成功：重置连续失败计数
    await ProviderKeysRepository.updateUsageStats(keyId, true);
    await ProviderKeysRepository.resetConsecutiveFailures(keyId);
    if (key.status === 'error') {
      await ProviderKeysRepository.setStatus(keyId, 'active');
    }
  } else {
    // 失败：增加失败计数
    await ProviderKeysRepository.updateUsageStats(keyId, false, error);

    // 检查连续失败次数
    const updatedKey = await ProviderKeysRepository.getById(keyId);
    if (updatedKey && updatedKey.usage.consecutiveFailures >= 3) {
      await ProviderKeysRepository.setStatus(keyId, 'error');
      logger.warn('[ApiKeyManager] Key 连续失败 3 次，自动禁用', {
        keyId,
        error,
      });
    }
  }
}
```

---

#### 任务 2.2：集成 ApiKeyManager 到 AiClient

**目标**：
- 在 `AiClient.streamCompletion` 中集成多 Key 选择逻辑
- 实现失败自动重试和 Key 切换

**输入**：
- 现有 `services/ai/AiClient.ts`
- `ApiKeyManager` 服务

**输出**：
- 更新后的 `AiClient.ts`

**涉及文件**：
- 更新 `services/ai/AiClient.ts`

**验收标准**：
- ✅ `getApiKey(provider)` 改为 `selectApiKeyWithRetry(provider)`
- ✅ API 调用失败时自动切换到下一个可用 Key
- ✅ 最多重试 3 次（可配置）
- ✅ 每次重试记录 Key 使用状态（成功/失败）
- ✅ 所有重试失败后抛出错误给上层

**预估工作量**: 4 小时

**实现逻辑**：

```typescript
// services/ai/AiClient.ts
async function selectApiKeyWithRetry(
  provider: Provider,
  maxRetries: number = 3
): Promise<{ key: string; keyId: string }> {
  const manager = ApiKeyManager.getInstance();
  const normalizedProvider = provider === 'gemini' ? 'google' : provider;

  // 获取负载均衡策略
  const strategy = await ProviderKeyManagementRepository.getStrategy(normalizedProvider);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await manager.selectApiKey(normalizedProvider, strategy);

    if (result.key) {
      logger.info('[AiClient] 选择 API Key', {
        provider: normalizedProvider,
        keyName: result.key.name || result.key.id.substring(0, 8),
        strategy,
        attempt,
      });
      return { key: result.key.key, keyId: result.key.id };
    }

    // 如果第一次就没有可用 Key，不需要重试
    if (attempt === 0) {
      throw new Error(`没有可用的 API Key: ${result.reason}`);
    }

    // 等待一小段时间再重试
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }

  throw new Error(`所有 API Key 重试失败（最多 ${maxRetries} 次）`);
}

export async function streamCompletion(opts: StreamOptions) {
  const provider = opts.provider;
  const model = opts.model;

  // 选择 API Key（带重试）
  const { key: apiKey, keyId } = await selectApiKeyWithRetry(provider);

  try {
    // ... 原有流式调用逻辑

    // 成功：更新 Key 状态
    await ApiKeyManager.getInstance().updateKeyStatus(keyId, true);

    opts.onDone?.();
  } catch (error) {
    // 失败：更新 Key 状态并重试
    const errorMessage = getErrorMessage(error);
    await ApiKeyManager.getInstance().updateKeyStatus(keyId, false, errorMessage);

    // 尝试切换到下一个 Key 重试
    // （此处省略重试逻辑，实际需要递归或循环）

    opts.onError?.(error);
    throw error;
  }
}
```

---

#### 任务 2.3：添加配置管理和重试策略

**目标**：
- 提供全局配置接口（最大重试次数、冷却时间等）
- 支持用户自定义重试策略

**输入**：
- `SettingsRepository`
- `ProviderKeyManagementRepository`

**输出**：
- 配置管理逻辑

**涉及文件**：
- 更新 `services/ai/ApiKeyManager.ts`
- 更新 `storage/repositories/provider-key-management.ts`

**验收标准**：
- ✅ 支持配置最大重试次数（默认 3）
- ✅ 支持配置冷却时间（默认 5 分钟）
- ✅ 支持配置连续失败阈值（默认 3 次）
- ✅ 配置变更立即生效

**预估工作量**: 2 小时

---

### 阶段 3：UI 层开发（1.5-2 天）

#### 任务 3.1：创建多 Key 管理页面

**目标**：
- 实现多 Key 管理界面（参考用户提供的截图）
- 支持添加、编辑、删除、启用/禁用 Key

**输入**：
- 用户提供的 UI 截图
- `ProviderKeysRepository`
- `ApiKeyManager`

**输出**：
- 新页面 `app/settings/providers/[vendor]/keys.tsx`

**涉及文件**：
- 新增 `app/settings/providers/[vendor]/keys.tsx`
- 新增 `components/settings/ApiKeyList.tsx`
- 新增 `components/settings/ApiKeyStatCard.tsx`
- 新增 `components/settings/AddApiKeyDialog.tsx`

**验收标准**：
- ✅ 顶部显示统计卡片（总数、正常数、错误数、成功率）
- ✅ 负载均衡策略选择器（下拉框）
- ✅ API Keys 列表：
  - 主要密钥标签（绿色徽章）
  - 优先级显示
  - 部分隐藏的 Key（sk-b•••••O5c1）
  - 使用统计（请求/成功/失败次数）
  - 启用/禁用开关
  - 编辑、删除按钮
- ✅ 添加 Key 按钮（底部浮动按钮）
- ✅ 长按显示完整 Key（带复制功能）

**预估工作量**: 10 小时

**UI 组件结构**：

```typescript
// app/settings/providers/[vendor]/keys.tsx
export default function ProviderKeysManagement() {
  const { vendor } = useLocalSearchParams<{ vendor: string }>();
  const providerId = vendor as ProviderId;

  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [strategy, setStrategy] = useState<LoadBalanceStrategy>('round_robin');
  const [addDialogVisible, setAddDialogVisible] = useState(false);

  useEffect(() => {
    loadKeys();
    loadStats();
    loadStrategy();
  }, [providerId]);

  return (
    <View>
      <Stack.Screen options={{ title: 'API Key 管理' }} />

      {/* 统计卡片 */}
      <ApiKeyStatCard stats={stats} />

      {/* 策略选择器 */}
      <Surface>
        <List.Subheader>负载均衡策略</List.Subheader>
        <SegmentedButtons
          value={strategy}
          onValueChange={handleStrategyChange}
          buttons={[
            { value: 'round_robin', label: '轮询' },
            { value: 'priority', label: '优先级' },
            { value: 'least_used', label: '最少使用' },
            { value: 'random', label: '随机' },
          ]}
        />
      </Surface>

      {/* API Keys 列表 */}
      <ApiKeyList
        keys={keys}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onSetPrimary={handleSetPrimary}
      />

      {/* 添加按钮 */}
      <FAB
        icon="plus"
        label="添加 API Key"
        onPress={() => setAddDialogVisible(true)}
      />

      {/* 添加对话框 */}
      <AddApiKeyDialog
        visible={addDialogVisible}
        providerId={providerId}
        onDismiss={() => setAddDialogVisible(false)}
        onConfirm={handleAdd}
      />
    </View>
  );
}
```

---

#### 任务 3.2：优化提供商配置页面

**目标**：
- 在现有提供商配置页面添加"多 Key 管理"入口
- 更新"多Key模式"开关逻辑

**输入**：
- 现有 `app/settings/providers/[vendor].tsx`

**输出**：
- 更新后的配置页面

**涉及文件**：
- 更新 `app/settings/providers/[vendor].tsx`

**验收标准**：
- ✅ "多Key模式"开关实际生效（调用 `ProviderKeyManagementRepository.upsert`）
- ✅ 开关打开时显示"多 Key 管理"按钮
- ✅ 点击按钮跳转到 `/settings/providers/[vendor]/keys`
- ✅ 单 Key 输入框在多 Key 模式下隐藏

**预估工作量**: 3 小时

---

#### 任务 3.3：实现 Key 编辑对话框

**目标**：
- 支持编辑 Key 名称、优先级
- 支持设置主要密钥

**输入**：
- `ApiKeyConfig` 数据模型

**输出**：
- 对话框组件 `components/settings/EditApiKeyDialog.tsx`

**涉及文件**：
- 新增 `components/settings/EditApiKeyDialog.tsx`

**验收标准**：
- ✅ 支持编辑 Key 名称
- ✅ 支持修改优先级（1-10 滑块）
- ✅ 支持设置为主要密钥（开关）
- ✅ 显示 Key 使用统计（只读）
- ✅ 实时验证输入

**预估工作量**: 3 小时

---

#### 任务 3.4：添加 Key 部分隐藏和复制功能

**目标**：
- 安全显示 API Key（中间部分隐藏）
- 支持长按复制完整 Key

**输入**：
- `ApiKeyConfig.key` 字段

**输出**：
- 工具函数 `utils/mask-api-key.ts`
- 更新 `components/settings/ApiKeyList.tsx`

**涉及文件**：
- 新增 `utils/mask-api-key.ts`
- 更新 `components/settings/ApiKeyList.tsx`

**验收标准**：
- ✅ 默认显示格式：`sk-b•••••O5c1`（前 4 字符 + 5 个点 + 后 4 字符）
- ✅ 长按 1 秒显示完整 Key（3 秒后自动隐藏）
- ✅ 点击复制按钮复制到剪贴板

**预估工作量**: 2 小时

**工具函数**：

```typescript
// utils/mask-api-key.ts
export function maskApiKey(key: string, prefixLen = 4, suffixLen = 4): string {
  if (key.length <= prefixLen + suffixLen) return key;

  const prefix = key.substring(0, prefixLen);
  const suffix = key.substring(key.length - suffixLen);
  const maskedPart = '•'.repeat(5);

  return `${prefix}${maskedPart}${suffix}`;
}
```

---

## 需要进一步明确的问题

### 问题 1：Key 加密存储策略

**推荐方案**：

- **方案 A**：使用 `expo-secure-store` 加密存储 API Key
  - ✅ 优点：利用设备的硬件安全模块（Keychain/KeyStore）
  - ✅ 优点：符合安全最佳实践
  - ❌ 缺点：Web 端不支持（需要 fallback）
  - ❌ 缺点：增加依赖和复杂度

- **方案 B**：使用简单的 Base64 编码（伪加密）
  - ✅ 优点：实现简单，跨平台一致
  - ✅ 优点：SQLite 本身已存储在设备本地
  - ❌ 缺点：不是真正的加密，安全性较低

**✅ 用户已选择**：

```
[✓] 方案 C（不加密，和当前单Key存储一致）
说明：直接存储在SQLite，不需要额外加密，与现有单Key模式保持一致
```

---

### 问题 2：UI 设计风格是否严格参考截图

**推荐方案**：

- **方案 A**：严格参考截图设计（1:1 还原）
  - ✅ 优点：与用户期望完全一致
  - ❌ 缺点：可能需要自定义组件，工作量增加 20%

- **方案 B**：在 React Native Paper 组件基础上微调
  - ✅ 优点：与现有 UI 保持一致，维护成本低
  - ✅ 优点：复用现有组件，开发速度快
  - ❌ 缺点：可能与截图有细微差异

**✅ 用户已选择**：

```
[✓] 方案 A（严格参考截图设计，1:1 还原）
说明：严格按照用户提供的截图进行UI设计，确保视觉效果完全一致
```

---

### 问题 3：负载均衡策略的优先级实现

**推荐方案**：

- **方案 A**：第一阶段只实现"轮询"策略，其他策略留空（显示"即将推出"）
  - ✅ 优点：降低初始开发复杂度
  - ✅ 优点：核心功能先上线，快速验证
  - ❌ 缺点：用户可能期望所有策略立即可用

- **方案 B**：同时实现 4 种策略（轮询、优先级、最少使用、随机）
  - ✅ 优点：功能完整，用户体验更好
  - ❌ 缺点：开发时间增加约 4 小时

**✅ 用户已选择**：

```
[✓] 方案 A（只实现"轮询"策略）
说明：第一阶段只实现round_robin策略，其他策略暂不实现
```

---

### 问题 4：图片生成功能是否同步支持多 Key

**推荐方案**：

- **方案 A**：第一阶段不支持，图片生成继续使用单 Key
  - ✅ 优点：降低测试复杂度
  - ❌ 缺点：功能不完整

- **方案 B**：同步支持多 Key 图片生成
  - ✅ 优点：功能完整统一
  - ❌ 缺点：需要修改 `generateImageWithAI`，增加 4 小时工作量

**✅ 用户已选择**：

```
[✓] 方案 A（图片生成暂不支持多 Key）
说明：图片生成功能继续使用单Key模式，降低测试复杂度
```

---

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议：

```
用户补充内容：
1. ✅ Key 存储不加密，和当前单Key存储一致（直接存储在SQLite）
2. ✅ 只实现"轮询"策略，其他策略暂不实现
3. ✅ UI 设计风格：严格参考截图设计（1:1 还原）
4. ✅ 单Key和多Key是可以切换的（重要特性）
5. ✅ 图片生成暂不支持多Key





```

---

## 技术风险与缓解措施

### 风险 1：数据迁移失败导致用户丢失 API Key

**缓解措施**：
- ✅ 迁移前备份 AsyncStorage 数据
- ✅ 迁移脚本增加详细日志
- ✅ 提供手动回滚机制（保留 AsyncStorage 原始数据）
- ✅ 第一版保留向后兼容逻辑（Fallback 到 AsyncStorage）

---

### 风险 2：并发调用时 Key 选择冲突

**缓解措施**：
- ✅ 使用 SQLite 事务确保原子性
- ✅ 轮询索引使用内存 Map，线程安全
- ✅ 添加乐观锁（updatedAt 字段）防止并发更新
- ✅ 关键操作添加日志，便于问题排查

---

### 风险 3：Key 状态更新不及时导致重复选择失败 Key

**缓解措施**：
- ✅ 每次调用失败立即更新状态（不等待异步完成）
- ✅ 使用 `consecutiveFailures` 字段原子递增
- ✅ 轮询策略自动跳过 error 状态的 Key
- ✅ 冷却期检测基于 `updatedAt` 时间戳，实时计算

---

### 风险 4：UI 页面性能问题（Key 列表过长）

**缓解措施**：
- ✅ 使用 `FlatList` 虚拟化列表渲染
- ✅ Key 列表限制最大数量（建议不超过 10 个）
- ✅ 统计数据使用 `useMemo` 缓存
- ✅ 避免在列表项中使用复杂动画

---

## 测试策略

### 单元测试（建议覆盖率 70%+）

**测试范围**：
- `ApiKeyManager.selectApiKey()` - 各种策略的正确性
- `ApiKeyManager.updateKeyStatus()` - 状态更新逻辑
- `ProviderKeysRepository.*` - 数据库 CRUD 操作
- `maskApiKey()` - Key 隐藏格式
- `validateKeyFormat()` - Key 格式验证

**测试工具**：
- Jest + @testing-library/react-native
- 使用内存 SQLite 数据库

**测试用例示例**：

```typescript
// __tests__/services/ai/ApiKeyManager.test.ts
describe('ApiKeyManager', () => {
  test('轮询策略应循环选择所有可用 Key', async () => {
    // 准备 3 个 Key
    const keys = [
      createMockKey('key1', 1),
      createMockKey('key2', 2),
      createMockKey('key3', 3),
    ];

    const manager = ApiKeyManager.getInstance();

    // 第一轮
    const round1 = await manager.selectApiKey('openai', 'round_robin');
    expect(round1.key.id).toBe('key1');

    // 第二轮
    const round2 = await manager.selectApiKey('openai', 'round_robin');
    expect(round2.key.id).toBe('key2');

    // 第三轮
    const round3 = await manager.selectApiKey('openai', 'round_robin');
    expect(round3.key.id).toBe('key3');

    // 第四轮（循环）
    const round4 = await manager.selectApiKey('openai', 'round_robin');
    expect(round4.key.id).toBe('key1');
  });

  test('连续失败 3 次应自动标记为 error', async () => {
    const keyId = 'test-key-id';
    const manager = ApiKeyManager.getInstance();

    // 模拟 3 次失败
    await manager.updateKeyStatus(keyId, false, 'Error 1');
    await manager.updateKeyStatus(keyId, false, 'Error 2');
    await manager.updateKeyStatus(keyId, false, 'Error 3');

    // 检查状态
    const key = await ProviderKeysRepository.getById(keyId);
    expect(key?.status).toBe('error');
    expect(key?.usage.consecutiveFailures).toBe(3);
  });
});
```

---

### 集成测试

**测试场景**：
- 单 Key → 多 Key 数据迁移流程
- AiClient 调用失败后自动切换 Key
- Key 状态自动恢复（冷却期结束）
- 多 Key 管理页面的增删改查操作

---

### 手动测试 Checklist

**数据层**：
- [ ] 首次启动自动迁移单 Key 到多 Key 表
- [ ] 添加新 Key 后立即生效
- [ ] 删除 Key 后不再被选择
- [ ] 禁用 Key 后不再被选择
- [ ] Key 统计数据正确累加

**服务层**：
- [ ] 轮询策略按顺序循环选择
- [ ] 优先级策略选择最高优先级 Key
- [ ] 最少使用策略选择使用次数最少的 Key
- [ ] 随机策略选择随机 Key
- [ ] API 调用失败后自动切换到下一个 Key
- [ ] 连续失败 3 次后 Key 自动禁用
- [ ] 冷却期结束后 Key 自动恢复

**UI 层**：
- [ ] 统计卡片数据正确显示
- [ ] 策略选择器切换立即生效
- [ ] Key 列表正确显示所有 Key
- [ ] 主要密钥标签正确显示
- [ ] 部分隐藏的 Key 格式正确
- [ ] 长按显示完整 Key
- [ ] 复制功能正常工作
- [ ] 启用/禁用开关立即生效
- [ ] 编辑对话框保存成功
- [ ] 删除确认对话框正常工作

---

## 文档更新

### 需要更新的 CLAUDE.md 文档

1. **`storage/CLAUDE.md`**：
   - 新增 `provider_api_keys` 表说明
   - 新增 `provider_key_management` 表说明
   - 更新数据模型章节

2. **`services/ai/CLAUDE.md`**：
   - 新增 `ApiKeyManager` 服务说明
   - 更新 `AiClient.streamCompletion` 接口说明
   - 新增负载均衡策略文档

3. **`app/CLAUDE.md`**：
   - 新增多 Key 管理页面路由
   - 更新提供商配置页面说明

4. **根目录 `CLAUDE.md`**：
   - 更新核心特性列表（添加多 Key 轮询）
   - 更新模块结构图

---

### API 使用示例

**选择 API Key**：

```typescript
import { ApiKeyManager } from '@/services/ai/ApiKeyManager';

const manager = ApiKeyManager.getInstance();

// 自动选择可用 Key（使用配置的策略）
const result = await manager.selectApiKey('openai');
if (result.key) {
  console.log('选择的 Key:', result.key.name);
  // 使用 result.key.key 调用 API
} else {
  console.error('没有可用的 Key:', result.reason);
}
```

**更新 Key 状态**：

```typescript
import { ApiKeyManager } from '@/services/ai/ApiKeyManager';

const manager = ApiKeyManager.getInstance();

try {
  // 调用 API 成功
  await manager.updateKeyStatus(keyId, true);
} catch (error) {
  // 调用 API 失败
  await manager.updateKeyStatus(keyId, false, error.message);
}
```

**添加新 Key**：

```typescript
import { ProviderKeysRepository } from '@/storage/repositories/provider-keys';

await ProviderKeysRepository.create({
  providerId: 'openai',
  key: 'sk-...',
  name: '生产环境 Key',
  isEnabled: true,
  isPrimary: false,
  priority: 5,
  usage: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    consecutiveFailures: 0,
  },
  status: 'active',
});
```

---

## 总体工作量估算

| 阶段 | 任务 | 预估时间 | 累计时间 |
|------|------|---------|---------|
| **阶段 1** | 任务 1.1 - 数据模型设计 | 4h | 4h |
| **阶段 1** | 任务 1.2 - Repository 实现 | 6h | 10h |
| **阶段 1** | 任务 1.3 - 数据迁移和兼容性 | 4h | 14h |
| **阶段 2** | 任务 2.1 - ApiKeyManager 服务 | 8h | 22h |
| **阶段 2** | 任务 2.2 - AiClient 集成 | 4h | 26h |
| **阶段 2** | 任务 2.3 - 配置管理 | 2h | 28h |
| **阶段 3** | 任务 3.1 - 多 Key 管理页面 | 10h | 38h |
| **阶段 3** | 任务 3.2 - 优化配置页面 | 3h | 41h |
| **阶段 3** | 任务 3.3 - 编辑对话框 | 3h | 44h |
| **阶段 3** | 任务 3.4 - Key 隐藏和复制 | 2h | 46h |
| **测试** | 单元测试 + 集成测试 | 6h | 52h |
| **文档** | 更新 CLAUDE.md 文档 | 2h | 54h |
| **总计** | **所有任务** | **54h** | **~7 天** |

---

## 交付标准

### 功能完整性
- ✅ 用户可以为每个提供商添加多个 API Key
- ✅ 支持至少 1 种负载均衡策略（轮询）
- ✅ API 调用失败时自动切换 Key
- ✅ Key 连续失败 3 次自动禁用
- ✅ 错误 Key 冷却 5 分钟后自动恢复
- ✅ 提供完整的 UI 界面管理 Key

### 代码质量
- ✅ TypeScript 类型定义完整，无 `any` 类型
- ✅ 所有数据库操作使用事务
- ✅ 关键流程添加日志（使用 `logger`）
- ✅ 遵循项目现有编码规范

### 用户体验
- ✅ UI 与现有设置页面风格一致
- ✅ 操作响应流畅（< 300ms）
- ✅ 错误提示友好明确
- ✅ 支持向后兼容（单 Key 用户无感知）

### 文档完善
- ✅ 更新所有相关 CLAUDE.md 文档
- ✅ 提供 API 使用示例
- ✅ 添加常见问题解答

---

## 下一步行动

请用户确认以下事项后即可开始开发：

1. **确认技术方案**：
   - [ ] Key 加密存储方案（方案 A / 方案 B）
   - [ ] UI 设计风格（严格参考截图 / Paper 组件微调）
   - [ ] 负载均衡策略优先级（只实现轮询 / 实现全部 4 种）
   - [ ] 图片生成支持范围（暂不支持 / 同步支持）

2. **确认时间安排**：
   - [ ] 是否接受 54 小时（约 7 天）的工作量估算
   - [ ] 是否有特定的上线时间要求

3. **确认优先级**：
   - [ ] 是否需要调整任务优先级
   - [ ] 是否有必须优先完成的功能

---

**文档版本**: v1.1（已确认用户决策）
**创建时间**: 2025-11-16
**更新时间**: 2025-11-16
**作者**: AI Planning Assistant (幽浮喵)
**项目**: AetherLink_z - 提供商多 Key 轮询功能
**状态**: ✅ 规划已确认，准备执行
