# 网络搜索功能实施规划

## 已明确的决策

基于 AetherLink_z 项目现有架构和用户需求,已确定以下技术决策:

- **搜索引擎支持**: Bing、Google、Tavily 三个主流搜索引擎
- **架构模式**: 遵循现有的 Repository 模式和 Service 层设计
- **存储方案**: 使用现有的 AsyncStorage 存储搜索配置,使用 SQLite 存储搜索历史(可选)
- **UI 框架**: 使用 React Native Paper 保持界面风格一致
- **AI 集成**: 搜索结果将通过现有的 `streamCompletion` 接口发送给 AI 进行汇总
- **跨平台兼容**: 确保 iOS、Android、Web 三端可用

## 整体规划概述

### 项目目标

为 AetherLink_z AI 聊天助手应用添加完整的网络搜索功能,使 AI 能够获取实时信息并进行智能汇总,提升对话质量和信息准确性。

### 技术栈

- **前端**: React Native 0.81.5 + Expo 54 + TypeScript
- **UI 组件**: React Native Paper
- **HTTP 客户端**: `fetch` API(原生支持)
- **状态管理**: React Hooks + Context
- **数据存储**: AsyncStorage(配置) + SQLite(历史记录)
- **搜索 API**:
  - Bing Search API v7
  - Google Custom Search API
  - Tavily Search API

### 主要阶段

1. **阶段 1: 基础架构搭建** - 搭建搜索服务层和数据存储
2. **阶段 2: 搜索引擎集成** - 实现三个搜索引擎的 API 调用
3. **阶段 3: UI 集成与配置** - 完成设置页面和聊天界面集成
4. **阶段 4: AI 汇总与优化** - 实现搜索结果的 AI 智能汇总

## 详细任务分解

### 阶段 1: 基础架构搭建

#### 任务 1.1: 创建搜索服务核心模块

- **目标**: 建立搜索功能的服务层架构
- **输入**: 项目现有架构规范、搜索引擎 API 文档
- **输出**:
  - `services/search/SearchClient.ts` - 搜索客户端核心接口
  - `services/search/types.ts` - 搜索相关类型定义
- **涉及文件**:
  - 新建 `services/search/SearchClient.ts`
  - 新建 `services/search/types.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  ```typescript
  // types.ts
  export type SearchEngine = 'bing' | 'google' | 'tavily';
  export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source?: string;
  }
  export interface SearchOptions {
    engine: SearchEngine;
    query: string;
    maxResults?: number;
    apiKey: string;
  }

  // SearchClient.ts - 统一搜索接口
  export async function performSearch(options: SearchOptions): Promise<SearchResult[]>
  ```

#### 任务 1.2: 扩展设置存储 Repository

- **目标**: 在现有设置系统中添加搜索相关配置项
- **输入**: 现有 `SettingsRepository` 和 `SettingKey` 枚举
- **输出**: 扩展后的设置键值定义
- **涉及文件**:
  - 修改 `storage/repositories/settings.ts`
- **预估工作量**: 1 小时
- **实现要点**:
  ```typescript
  // 在 SettingKey 枚举中添加
  export enum SettingKey {
    // ... 现有设置
    // 网络搜索设置
    WebSearchEnabled = 'al:settings:web_search_enabled',
    WebSearchEngine = 'al:settings:web_search_engine', // 'bing' | 'google' | 'tavily'
    WebSearchMaxResults = 'al:settings:web_search_max_results',
    BingSearchApiKey = 'al:settings:bing_search_api_key',
    GoogleSearchApiKey = 'al:settings:google_search_api_key',
    GoogleSearchEngineId = 'al:settings:google_search_engine_id',
    TavilySearchApiKey = 'al:settings:tavily_search_api_key',
  }
  ```

#### 任务 1.3: 创建搜索历史数据表(可选)

- **目标**: 添加搜索历史记录功能,便于用户回溯和分析
- **输入**: 现有数据库迁移机制
- **输出**: 新的数据库迁移文件和 Repository
- **涉及文件**:
  - 新建 `storage/sqlite/migrations/0003_search_history.ts`
  - 新建 `storage/repositories/search-history.ts`
  - 修改 `storage/sqlite/db.ts`(注册迁移)
- **预估工作量**: 2 小时
- **实现要点**:
  ```sql
  CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    query TEXT NOT NULL,
    engine TEXT NOT NULL,
    results_count INTEGER,
    created_at INTEGER NOT NULL,
    extra TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_search_history_conv ON search_history(conversation_id, created_at);
  ```

---

### 阶段 2: 搜索引擎集成

#### 任务 2.1: 实现 Bing Search API 适配器

- **目标**: 集成 Bing Search API v7
- **输入**: Bing Search API 文档、用户配置的 API Key
- **输出**: 可调用的 Bing 搜索函数
- **涉及文件**:
  - 新建 `services/search/engines/BingSearch.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  - API 端点: `https://api.bing.microsoft.com/v7.0/search`
  - 请求头: `Ocp-Apim-Subscription-Key: {apiKey}`
  - 错误处理: 网络超时、API 限流、无效密钥
  - 结果解析: 提取 `webPages.value` 数组

#### 任务 2.2: 实现 Google Custom Search API 适配器

- **目标**: 集成 Google Custom Search JSON API
- **输入**: Google API 文档、API Key 和 Search Engine ID
- **输出**: 可调用的 Google 搜索函数
- **涉及文件**:
  - 新建 `services/search/engines/GoogleSearch.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  - API 端点: `https://www.googleapis.com/customsearch/v1`
  - 查询参数: `key`, `cx` (engine ID), `q` (query)
  - 结果解析: 提取 `items` 数组
  - 配额管理: Google 免费配额限制(100 次/天)

#### 任务 2.3: 实现 Tavily Search API 适配器

- **目标**: 集成 Tavily Search API
- **输入**: Tavily API 文档、API Key
- **输出**: 可调用的 Tavily 搜索函数
- **涉及文件**:
  - 新建 `services/search/engines/TavilySearch.ts`
- **预估工作量**: 2 小时
- **实现要点**:
  - API 端点: `https://api.tavily.com/search`
  - 请求体: `{ api_key, query, max_results }`
  - 结果解析: 提取 `results` 数组
  - 特殊处理: Tavily 可能返回更结构化的内容

#### 任务 2.4: 统一搜索调度逻辑

- **目标**: 在 `SearchClient.ts` 中实现统一调度
- **输入**: 三个搜索引擎适配器
- **输出**: 根据用户配置自动选择搜索引擎的逻辑
- **涉及文件**:
  - 修改 `services/search/SearchClient.ts`
- **预估工作量**: 1-2 小时
- **实现要点**:
  - 根据 `WebSearchEngine` 设置选择引擎
  - 从 `SettingsRepository` 读取对应的 API Key
  - 统一错误处理和重试机制

---

### 阶段 3: UI 集成与配置

#### 任务 3.1: 完善网络搜索设置页面

- **目标**: 替换现有的占位设置页面,实现完整配置界面
- **输入**: 现有 `app/settings/web-search.tsx` 占位文件
- **输出**: 功能完整的搜索配置页面
- **涉及文件**:
  - 修改 `app/settings/web-search.tsx`
- **预估工作量**: 3-4 小时
- **UI 要求**:
  - 搜索引擎选择(单选列表:Bing / Google / Tavily)
  - 对应 API Key 输入框(安全输入,支持显示/隐藏)
  - Google Search Engine ID 输入框(仅 Google 时显示)
  - 最大搜索结果数量设置(滑块,范围 3-10)
  - 测试搜索按钮(验证 API Key 有效性)
- **实现要点**:
  - 使用 `useSetting` hook 管理状态
  - 参考现有的 `app/settings/providers/[vendor].tsx` 实现风格
  - 添加输入验证和友好的错误提示

#### 任务 3.2: 在聊天输入框添加搜索开关

- **目标**: 在 `ChatInput` 组件中添加搜索功能的开关控制
- **输入**: 现有 `ChatInput.tsx` 组件
- **输出**: 带搜索开关的输入框 UI
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
- **预估工作量**: 2-3 小时
- **UI 要求**:
  - 在工具栏左侧添加搜索图标按钮(`web` 或 `magnify`)
  - 点击切换搜索启用状态(图标高亮表示启用)
  - 仅在全局搜索功能已启用时显示
- **实现要点**:
  - 添加 `searchEnabled` 状态(局部状态,每次对话独立)
  - 使用 `IconButton` 组件,根据状态改变颜色
  - 在 `handleSend` 中检测 `searchEnabled` 标志

#### 任务 3.3: 实现搜索加载动画组件

- **目标**: 创建独立的搜索状态指示器,显示搜索进度
- **输入**: React Native Paper 动画组件
- **输出**: 可复用的搜索加载组件
- **涉及文件**:
  - 新建 `components/chat/SearchLoadingIndicator.tsx`
- **预估工作量**: 2 小时
- **UI 要求**:
  - 显示搜索引擎图标和名称
  - 动画加载指示器(使用 `ActivityIndicator`)
  - 搜索查询文本提示
  - 可选的取消按钮
- **实现要点**:
  ```typescript
  interface SearchLoadingProps {
    engine: SearchEngine;
    query: string;
    onCancel?: () => void;
  }
  export function SearchLoadingIndicator(props: SearchLoadingProps)
  ```

---

### 阶段 4: AI 汇总与优化

#### 任务 4.1: 在 ChatInput 中集成搜索流程

- **目标**: 在发送消息前执行搜索,并将结果附加到消息上下文
- **输入**: `ChatInput` 组件、`SearchClient`、`SettingsRepository`
- **输出**: 完整的搜索 + AI 汇总流程
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
- **预估工作量**: 3-4 小时
- **实现要点**:
  - 在 `handleSend` 函数中,检测 `searchEnabled` 标志
  - 如果启用,先调用 `performSearch` 获取搜索结果
  - 显示 `SearchLoadingIndicator` 组件
  - 将搜索结果格式化为文本,附加到用户消息中:
    ```typescript
    const searchContext = formatSearchResults(results);
    const enhancedMessage = `${userMessage}\n\n[网络搜索结果]\n${searchContext}`;
    ```
  - 在 AI 请求的系统提示中说明如何利用搜索结果

#### 任务 4.2: 优化搜索结果格式化

- **目标**: 将搜索结果格式化为 AI 友好的上下文
- **输入**: 搜索结果数组
- **输出**: 结构化的文本格式
- **涉及文件**:
  - 新建 `services/search/formatters.ts`
- **预估工作量**: 1-2 小时
- **实现要点**:
  ```typescript
  export function formatSearchResults(results: SearchResult[]): string {
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\n来源: ${r.url}\n摘要: ${r.snippet}\n`
    ).join('\n');
  }
  ```
  - 控制总字符长度,避免超出 AI 上下文限制
  - 添加搜索时间戳和搜索引擎来源标识

#### 任务 4.3: 添加搜索错误处理和用户反馈

- **目标**: 处理搜索失败场景,提供友好提示
- **输入**: 搜索错误类型(API 错误、网络错误、配额超限)
- **输出**: 用户友好的错误提示和降级策略
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
  - 修改 `services/search/SearchClient.ts`
- **预估工作量**: 2 小时
- **实现要点**:
  - 搜索失败时不阻断对话,显示警告提示
  - API Key 无效时引导用户前往设置
  - 网络错误时提示检查连接
  - 配额超限时建议切换搜索引擎

#### 任务 4.4: 性能优化与缓存机制

- **目标**: 避免重复搜索,提升响应速度
- **输入**: 搜索查询历史
- **输出**: 带缓存的搜索服务
- **涉及文件**:
  - 修改 `services/search/SearchClient.ts`
  - 可选:新建 `services/search/cache.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  - 使用内存缓存(Map 或 LRU Cache)
  - 缓存 Key: `${engine}:${query}`
  - 缓存过期时间: 5-10 分钟
  - 跨平台兼容性考虑(Web 端使用 sessionStorage)

---

## 需要进一步明确的问题

### 问题 1: 搜索结果显示方式

**推荐方案**:

- **方案 A - 仅 AI 汇总**:搜索结果不直接显示,只发送给 AI 进行汇总,用户看到的是 AI 整理后的回答
  - 优点:界面简洁,用户体验流畅
  - 缺点:用户无法直接查看原始搜索结果

- **方案 B - 显示搜索卡片**:在消息列表中插入搜索结果卡片,展示原始链接,同时 AI 给出汇总
  - 优点:信息透明,用户可点击查看原始网页
  - 缺点:需要额外的 UI 组件,界面较复杂

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - 仅 AI 汇总(推荐,实现简单)
[ ] 方案 B - 显示搜索卡片(更透明,实现复杂)
[ ] 其他方案:_________________
```

### 问题 2: 搜索触发方式

**推荐方案**:

- **方案 A - 手动开关**:用户在输入框工具栏中手动启用/禁用搜索(当前规划采用)
  - 优点:用户完全控制,不会产生意外费用
  - 缺点:需要手动操作,可能遗忘

- **方案 B - 智能检测**:AI 自动识别需要搜索的问题(如"今天天气"、"最新新闻")
  - 优点:用户体验更智能,无需手动操作
  - 缺点:需要额外的意图识别逻辑,可能误判

- **方案 C - 默认启用**:每次对话都自动启用搜索(可在设置中关闭)
  - 优点:始终获取最新信息
  - 缺点:API 调用频繁,费用较高

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - 手动开关(推荐,已规划)
[ ] 方案 B - 智能检测(更智能,需 AI 判断)
[ ] 方案 C - 默认启用(最简单,费用高)
[ ] 其他方案:_________________
```

### 问题 3: 搜索历史记录功能

**推荐方案**:

- **方案 A - 完整历史**:记录所有搜索查询和结果,可在设置中查看和管理(任务 1.3 已规划)
  - 优点:便于回溯和分析,提升数据可追溯性
  - 缺点:增加存储空间,实现复杂度提升

- **方案 B - 仅统计信息**:只记录搜索次数和搜索引擎使用情况,不保存具体内容
  - 优点:实现简单,存储占用少
  - 缺点:功能有限

- **方案 C - 不记录历史**:只提供实时搜索功能,不保存任何历史
  - 优点:最简单,隐私友好
  - 缺点:无法回溯

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - 完整历史(推荐,已规划)
[ ] 方案 B - 仅统计信息(轻量级)
[ ] 方案 C - 不记录历史(最简单)
[ ] 其他方案:_________________
```

---

## 验收标准

### 功能完整性
- [ ] 支持 Bing、Google、Tavily 三个搜索引擎切换
- [ ] 设置页面可配置搜索引擎和 API Key
- [ ] 聊天输入框中可启用/禁用搜索功能
- [ ] 搜索结果能正确发送给 AI 进行汇总
- [ ] 显示独立的搜索加载动画

### 用户体验
- [ ] 搜索加载状态清晰可见
- [ ] 搜索失败时有友好的错误提示
- [ ] API Key 无效时引导用户前往设置
- [ ] 搜索过程可以中断(取消功能)
- [ ] UI 风格与现有界面保持一致

### 技术质量
- [ ] 代码遵循项目现有规范(TypeScript 严格模式)
- [ ] 错误处理完善(网络超时、API 错误、配额限制)
- [ ] 跨平台兼容(iOS、Android、Web 均可用)
- [ ] 无内存泄漏和性能问题
- [ ] API Key 安全存储(使用 AsyncStorage)

### 性能指标
- [ ] 搜索响应时间 < 3 秒(正常网络环境)
- [ ] 缓存命中率 > 30%(可选,如实现缓存)
- [ ] 不阻塞 UI 主线程

---

## 风险评估与解决方案

### 风险 1: API 配额限制

**描述**: 免费 API(如 Google Custom Search)每日配额有限(100 次/天)

**影响**: 用户可能频繁触发配额限制

**解决方案**:
- 在设置页面明确提示配额限制
- 实现缓存机制减少重复请求
- 支持多搜索引擎切换,配额用尽时提示切换
- 可选:实现本地搜索次数统计和警告

**优先级**: 高

---

### 风险 2: 跨平台网络请求差异

**描述**: iOS、Android、Web 的网络请求实现可能存在差异

**影响**: 部分平台搜索功能失效

**解决方案**:
- 使用 `fetch` API(所有平台均支持)
- 在三个平台上进行充分测试
- 添加平台特定的错误处理逻辑
- 使用 `expo-network` 检测网络状态

**优先级**: 中

---

### 风险 3: 搜索结果过长导致 AI 上下文溢出

**描述**: 搜索结果加上用户消息可能超过 AI 模型的上下文窗口

**影响**: AI 请求失败或结果截断

**解决方案**:
- 限制搜索结果数量(默认 3-5 条)
- 对搜索结果进行智能截断(保留摘要前 200 字符)
- 计算总 token 数,动态调整搜索结果长度
- 在系统提示中指示 AI 优先利用搜索结果

**优先级**: 高

---

### 风险 4: API Key 泄露风险

**描述**: API Key 存储在本地,可能被恶意应用读取

**影响**: 用户 API 配额被盗用

**解决方案**:
- 使用 `expo-secure-store`(而非 AsyncStorage)存储敏感信息
- 在设置页面添加 API Key 安全提示
- 建议用户设置 API Key 使用限额
- Web 端提示用户不要在公共设备上保存 API Key

**优先级**: 中

---

### 风险 5: 搜索引擎 API 变更

**描述**: 第三方搜索 API 可能变更接口或下线

**影响**: 搜索功能失效

**解决方案**:
- 实现统一的搜索接口抽象层
- 为每个搜索引擎编写独立适配器
- 添加版本检测和兼容性处理
- 在文档中说明 API 版本依赖

**优先级**: 低

---

## 附录:开发注意事项

### 代码规范
- 所有新文件使用 TypeScript 严格模式
- 遵循现有的命名约定(PascalCase for components, camelCase for functions)
- 添加 JSDoc 注释说明函数用途
- 使用 `try-catch` 进行错误处理

### 测试建议
- 手动测试三个搜索引擎的 API 调用
- 测试网络异常情况(离线、超时)
- 测试 API Key 无效场景
- 在 iOS、Android、Web 三端验证功能

### 性能优化
- 避免频繁调用 AsyncStorage(使用内存缓存)
- 搜索请求添加超时控制(默认 10 秒)
- 使用 `AbortController` 支持请求取消
- 搜索结果分页加载(如需显示大量结果)

### 安全考虑
- API Key 不应在日志中输出
- 搜索查询应进行 URL 编码
- 避免 XSS 攻击(搜索结果渲染时转义 HTML)
- 限制搜索查询长度(防止滥用)

---

**文档版本**: v1.0
**创建时间**: 2025-11-04
**预计总工作量**: 30-40 小时
**建议实施周期**: 1-2 周
