# 网络搜索功能实施规划 v1.1

> **版本历史**
> - v1.0 (2025-11-04): 初始版本，采用官方 API 方案
> - v1.1 (2025-11-04): 根据用户反馈调整，Bing/Google 采用网页爬取方案

---

## 已明确的决策

基于 AetherLink_z 项目现有架构和用户需求确认，已确定以下技术决策：

### 核心设计方案（用户已确认）

✅ **搜索结果显示方式**: **方案 A - 仅 AI 汇总**
- 搜索结果不直接显示，只发送给 AI 进行汇总
- 用户看到的是 AI 整理后的回答
- 界面简洁，用户体验流畅

✅ **搜索触发方式**: **方案 A - 手动开关**
- 用户在输入框工具栏中手动启用/禁用搜索
- 用户完全控制，不会产生意外费用
- 每次对话独立控制

✅ **搜索历史记录**: **方案 A - 完整历史**
- 记录所有搜索查询和结果
- 可在设置中查看和管理
- 便于回溯和分析

### 技术实现方案（用户已明确）

- **Bing 搜索**: 不使用官方 API，采用**直接搜索 + 轻量 HTML 网页爬取**
- **Google 搜索**: 不使用官方 API，采用**直接搜索 + 轻量 HTML 网页爬取**
- **Tavily 搜索**: 使用**官方 API**，需要 API Key
- **架构模式**: 遵循现有的 Repository 模式和 Service 层设计
- **存储方案**: 使用 AsyncStorage 存储搜索配置，使用 SQLite 存储搜索历史
- **UI 框架**: 使用 React Native Paper 保持界面风格一致
- **AI 集成**: 搜索结果通过现有的 `streamCompletion` 接口发送给 AI 进行汇总
- **跨平台兼容**: 确保 iOS、Android 两端可用（项目不支持 Web）

---

## 整体规划概述

### 项目目标

为 AetherLink_z AI 聊天助手应用添加完整的网络搜索功能，使 AI 能够获取实时信息并进行智能汇总，提升对话质量和信息准确性。

### 技术栈

- **前端**: React Native 0.81.5 + Expo 54 + TypeScript
- **UI 组件**: React Native Paper
- **HTTP 客户端**: `fetch` API（原生支持）
- **HTML 解析**: `cheerio` 或 `react-native-html-parser`（轻量级）
- **状态管理**: React Hooks + Context
- **数据存储**: AsyncStorage（配置） + SQLite（历史记录）
- **搜索实现**:
  - Bing Search: 网页爬取（`https://www.bing.com/search?q=...`）
  - Google Search: 网页爬取（`https://www.google.com/search?q=...`）
  - Tavily Search: 官方 API（`https://api.tavily.com/search`）

### 技术栈变更说明（v1.1）

相比 v1.0，主要变更：
- ✅ 新增 HTML 解析库（cheerio 或轻量级替代）
- ✅ 新增 User-Agent 配置和请求头管理
- ✅ 移除 Bing Search API v7 依赖
- ✅ 移除 Google Custom Search API 依赖
- ⚠️ 需要考虑反爬虫策略（User-Agent 轮换、请求频率控制）

### 主要阶段

1. **阶段 1: 基础架构搭建** - 搭建搜索服务层和数据存储
2. **阶段 2: 搜索引擎集成** - 实现三个搜索引擎（网页爬取 + API）
3. **阶段 3: UI 集成与配置** - 完成设置页面和聊天界面集成
4. **阶段 4: AI 汇总与优化** - 实现搜索结果的 AI 智能汇总

---

## 详细任务分解

### 阶段 1: 基础架构搭建

#### 任务 1.1: 创建搜索服务核心模块

- **目标**: 建立搜索功能的服务层架构，支持多种搜索实现方式
- **输入**: 项目现有架构规范、搜索引擎技术文档
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

  // 搜索方式类型
  export type SearchMethod = 'web-scraping' | 'api';

  // 搜索结果
  export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source?: string; // 搜索引擎名称
  }

  // 搜索选项
  export interface SearchOptions {
    engine: SearchEngine;
    query: string;
    maxResults?: number; // 默认 5
    apiKey?: string; // 仅 Tavily 需要
    timeout?: number; // 请求超时时间（ms）
  }

  // SearchClient.ts - 统一搜索接口
  export async function performSearch(options: SearchOptions): Promise<SearchResult[]>
  ```

#### 任务 1.2: 扩展设置存储 Repository（更新）

- **目标**: 在现有设置系统中添加搜索相关配置项（仅 Tavily API Key）
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
    WebSearchEnabled = 'al:settings:web_search_enabled', // 全局开关
    WebSearchEngine = 'al:settings:web_search_engine', // 'bing' | 'google' | 'tavily'
    WebSearchMaxResults = 'al:settings:web_search_max_results', // 默认 5

    // API Key（仅 Tavily）
    TavilySearchApiKey = 'al:settings:tavily_search_api_key',

    // 移除以下设置（v1.0 中有，v1.1 删除）
    // ❌ BingSearchApiKey
    // ❌ GoogleSearchApiKey
    // ❌ GoogleSearchEngineId
  }
  ```

#### 任务 1.3: 创建搜索历史数据表

- **目标**: 添加搜索历史记录功能，便于用户回溯和分析
- **输入**: 现有数据库迁移机制
- **输出**: 新的数据库迁移文件和 Repository
- **涉及文件**:
  - 新建 `storage/sqlite/migrations/0003_search_history.ts`
  - 新建 `storage/repositories/search-history.ts`
  - 修改 `storage/sqlite/db.ts`（注册迁移）
- **预估工作量**: 2 小时
- **实现要点**:
  ```sql
  CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    query TEXT NOT NULL,
    engine TEXT NOT NULL, -- 'bing' | 'google' | 'tavily'
    method TEXT NOT NULL, -- 'web-scraping' | 'api'
    results_count INTEGER,
    success BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    extra TEXT, -- JSON 格式，存储额外信息
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_search_history_conv ON search_history(conversation_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_search_history_engine ON search_history(engine, created_at);
  ```

#### 任务 1.4: 创建 HTML 解析工具模块（新增）

- **目标**: 实现轻量级 HTML 解析工具，用于提取搜索结果
- **输入**: HTML 字符串
- **输出**: 结构化的搜索结果数据
- **涉及文件**:
  - 新建 `services/search/utils/html-parser.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  ```typescript
  // 使用正则表达式或轻量级解析器提取关键信息
  export interface ParsedSearchResult {
    title: string;
    url: string;
    snippet: string;
  }

  // 解析 Bing 搜索结果页面
  export function parseBingSearchResults(html: string): ParsedSearchResult[]

  // 解析 Google 搜索结果页面
  export function parseGoogleSearchResults(html: string): ParsedSearchResult[]

  // 通用 HTML 实体解码
  export function decodeHtmlEntities(text: string): string
  ```
- **技术选型**:
  - **方案 A**: 使用正则表达式（最轻量，但维护性差）
  - **方案 B**: 使用 `cheerio`（Node.js 环境，需要 polyfill）
  - **方案 C**: 使用 `react-native-html-parser` 或 `htmlparser2-lite`（轻量级）
  - **推荐**: 方案 C，平衡了功能和体积

---

### 阶段 2: 搜索引擎集成（重大更新）

#### 任务 2.1: 实现 Bing 网页搜索爬取器（更新）

- **目标**: 通过网页爬取方式实现 Bing 搜索功能
- **输入**: 搜索查询、最大结果数
- **输出**: 解析后的搜索结果数组
- **涉及文件**:
  - 新建 `services/search/engines/BingSearch.ts`
- **预估工作量**: 3-4 小时（比 API 方式复杂）
- **实现要点**:
  ```typescript
  import { performHttpRequest } from '../utils/http-client';
  import { parseBingSearchResults } from '../utils/html-parser';

  export async function searchBing(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    // 1. 构建搜索 URL
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults}`;

    // 2. 发送 HTTP 请求（带 User-Agent）
    const html = await performHttpRequest(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    // 3. 解析 HTML 提取搜索结果
    const results = parseBingSearchResults(html);

    // 4. 返回结果（限制数量）
    return results.slice(0, maxResults);
  }
  ```
- **关键挑战**:
  - Bing 搜索结果页面的 HTML 结构识别（需要查找 `.b_algo` 等 CSS 选择器）
  - 处理反爬虫措施（User-Agent、请求频率限制）
  - 错误处理（网络超时、HTML 解析失败）
  - 跨平台兼容性（iOS/Android/Web 的 fetch 行为）

#### 任务 2.2: 实现 Google 网页搜索爬取器（更新）

- **目标**: 通过网页爬取方式实现 Google 搜索功能
- **输入**: 搜索查询、最大结果数
- **输出**: 解析后的搜索结果数组
- **涉及文件**:
  - 新建 `services/search/engines/GoogleSearch.ts`
- **预估工作量**: 3-4 小时
- **实现要点**:
  ```typescript
  import { performHttpRequest } from '../utils/http-client';
  import { parseGoogleSearchResults } from '../utils/html-parser';

  export async function searchGoogle(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    // 1. 构建搜索 URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}`;

    // 2. 发送 HTTP 请求（带 User-Agent）
    const html = await performHttpRequest(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    // 3. 解析 HTML 提取搜索结果
    const results = parseGoogleSearchResults(html);

    // 4. 返回结果（限制数量）
    return results.slice(0, maxResults);
  }
  ```
- **关键挑战**:
  - Google 搜索结果页面的 HTML 结构更复杂（`.g` 容器、`h3` 标题等）
  - Google 的反爬虫措施更严格（可能需要 Cookie、Referer）
  - 可能遇到 CAPTCHA 验证（需要降级处理）
  - 移动端 User-Agent 更容易通过（建议使用 iPhone User-Agent）

#### 任务 2.3: 实现 Tavily Search API 适配器（保持不变）

- **目标**: 集成 Tavily Search API
- **输入**: Tavily API 文档、API Key
- **输出**: 可调用的 Tavily 搜索函数
- **涉及文件**:
  - 新建 `services/search/engines/TavilySearch.ts`
- **预估工作量**: 2 小时
- **实现要点**:
  ```typescript
  export async function searchTavily(
    query: string,
    apiKey: string,
    maxResults: number = 5
  ): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      source: 'tavily',
    }));
  }
  ```

#### 任务 2.4: 创建 HTTP 请求工具（新增）

- **目标**: 封装 HTTP 请求逻辑，统一处理超时、错误、User-Agent
- **输入**: URL、请求选项
- **输出**: HTML 字符串或错误
- **涉及文件**:
  - 新建 `services/search/utils/http-client.ts`
- **预估工作量**: 2 小时
- **实现要点**:
  ```typescript
  export interface HttpRequestOptions {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    timeout?: number; // 默认 10000ms
    body?: string;
  }

  export async function performHttpRequest(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }
  ```

#### 任务 2.5: 统一搜索调度逻辑（更新）

- **目标**: 在 `SearchClient.ts` 中实现统一调度，根据引擎类型选择实现方式
- **输入**: 三个搜索引擎适配器（网页爬取 + API）
- **输出**: 根据用户配置自动选择搜索引擎的逻辑
- **涉及文件**:
  - 修改 `services/search/SearchClient.ts`
- **预估工作量**: 2 小时
- **实现要点**:
  ```typescript
  import { searchBing } from './engines/BingSearch';
  import { searchGoogle } from './engines/GoogleSearch';
  import { searchTavily } from './engines/TavilySearch';
  import { SearchOptions, SearchResult, SearchEngine } from './types';

  export async function performSearch(options: SearchOptions): Promise<SearchResult[]> {
    const { engine, query, maxResults = 5, apiKey } = options;

    try {
      switch (engine) {
        case 'bing':
          // 网页爬取方式
          return await searchBing(query, maxResults);

        case 'google':
          // 网页爬取方式
          return await searchGoogle(query, maxResults);

        case 'tavily':
          // API 方式
          if (!apiKey) {
            throw new Error('Tavily API Key is required');
          }
          return await searchTavily(query, apiKey, maxResults);

        default:
          throw new Error(`Unsupported search engine: ${engine}`);
      }
    } catch (error) {
      console.error(`Search failed for engine ${engine}:`, error);
      throw error;
    }
  }
  ```

---

### 阶段 3: UI 集成与配置

#### 任务 3.1: 完善网络搜索设置页面（更新）

- **目标**: 替换现有的占位设置页面，实现简化的配置界面
- **输入**: 现有 `app/settings/web-search.tsx` 占位文件
- **输出**: 功能完整的搜索配置页面
- **涉及文件**:
  - 修改 `app/settings/web-search.tsx`
- **预估工作量**: 2-3 小时（简化了 API Key 管理）
- **UI 要求**（更新）:
  - ✅ 全局搜索功能开关（启用/禁用）
  - ✅ 搜索引擎选择（单选列表: Bing / Google / Tavily）
  - ✅ 最大搜索结果数量设置（滑块，范围 3-10，默认 5）
  - ✅ **Tavily API Key 输入框**（仅选择 Tavily 时显示，安全输入）
  - ✅ 测试搜索按钮（验证搜索功能是否正常）
  - ❌ 移除 Bing API Key 输入框
  - ❌ 移除 Google API Key 和 Search Engine ID 输入框
- **实现要点**:
  ```typescript
  // 设置项示例
  const [engine, setEngine] = useSetting(SettingKey.WebSearchEngine, 'bing');
  const [maxResults, setMaxResults] = useSetting(SettingKey.WebSearchMaxResults, 5);
  const [tavilyApiKey, setTavilyApiKey] = useSetting(SettingKey.TavilySearchApiKey, '');

  // 仅当选择 Tavily 时显示 API Key 输入框
  {engine === 'tavily' && (
    <TextInput
      label="Tavily API Key"
      value={tavilyApiKey}
      onChangeText={setTavilyApiKey}
      secureTextEntry
      right={<TextInput.Icon icon="eye" />}
    />
  )}
  ```
- **注意事项**:
  - Bing 和 Google 选项需要添加说明文字："使用网页爬取方式，无需 API Key"
  - 添加隐私提示："网页爬取方式不会泄露您的 API Key，但可能受到搜索引擎的反爬虫限制"

#### 任务 3.2: 在聊天输入框添加搜索开关（保持不变）

- **目标**: 在 `ChatInput` 组件中添加搜索功能的开关控制
- **输入**: 现有 `ChatInput.tsx` 组件
- **输出**: 带搜索开关的输入框 UI
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
- **预估工作量**: 2-3 小时
- **UI 要求**:
  - 在工具栏左侧添加搜索图标按钮（`web` 或 `magnify`）
  - 点击切换搜索启用状态（图标高亮表示启用）
  - 仅在全局搜索功能已启用时显示
- **实现要点**:
  ```typescript
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [globalSearchEnabled] = useSetting(SettingKey.WebSearchEnabled, false);

  // 工具栏中添加搜索按钮
  {globalSearchEnabled && (
    <IconButton
      icon="web"
      size={24}
      iconColor={searchEnabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
      onPress={() => setSearchEnabled(!searchEnabled)}
    />
  )}
  ```

#### 任务 3.3: 实现搜索加载动画组件（保持不变）

- **目标**: 创建独立的搜索状态指示器，显示搜索进度
- **输入**: React Native Paper 动画组件
- **输出**: 可复用的搜索加载组件
- **涉及文件**:
  - 新建 `components/chat/SearchLoadingIndicator.tsx`
- **预估工作量**: 2 小时
- **UI 要求**:
  - 显示搜索引擎图标和名称
  - 动画加载指示器（`ActivityIndicator`）
  - 搜索查询文本提示
  - 可选的取消按钮
- **实现要点**:
  ```typescript
  interface SearchLoadingProps {
    engine: SearchEngine;
    query: string;
    onCancel?: () => void;
  }

  export function SearchLoadingIndicator({ engine, query, onCancel }: SearchLoadingProps) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <ActivityIndicator size="small" />
            <Text style={styles.text}>
              正在通过 {engine} 搜索: {query}
            </Text>
            {onCancel && (
              <IconButton icon="close" size={20} onPress={onCancel} />
            )}
          </View>
        </Card.Content>
      </Card>
    );
  }
  ```

---

### 阶段 4: AI 汇总与优化

#### 任务 4.1: 在 ChatInput 中集成搜索流程（保持不变）

- **目标**: 在发送消息前执行搜索，并将结果附加到消息上下文
- **输入**: `ChatInput` 组件、`SearchClient`、`SettingsRepository`
- **输出**: 完整的搜索 + AI 汇总流程
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
- **预估工作量**: 3-4 小时
- **实现要点**:
  ```typescript
  const handleSend = async () => {
    let searchResults: SearchResult[] | null = null;

    // 如果启用搜索，先执行搜索
    if (searchEnabled) {
      try {
        setIsSearching(true);
        const engine = await getSetting(SettingKey.WebSearchEngine);
        const maxResults = await getSetting(SettingKey.WebSearchMaxResults);
        const apiKey = engine === 'tavily'
          ? await getSetting(SettingKey.TavilySearchApiKey)
          : undefined;

        searchResults = await performSearch({
          engine,
          query: inputText,
          maxResults,
          apiKey,
        });

        // 记录搜索历史
        await saveSearchHistory({
          conversationId,
          query: inputText,
          engine,
          method: engine === 'tavily' ? 'api' : 'web-scraping',
          resultsCount: searchResults.length,
          success: true,
        });
      } catch (error) {
        console.error('Search failed:', error);
        // 显示错误提示，但不阻断对话
        showSnackbar(`搜索失败: ${error.message}`);
      } finally {
        setIsSearching(false);
      }
    }

    // 构建消息上下文
    const messageContent = searchResults
      ? `${inputText}\n\n[网络搜索结果]\n${formatSearchResults(searchResults)}`
      : inputText;

    // 发送消息给 AI
    await sendMessage(messageContent);
  };
  ```

#### 任务 4.2: 优化搜索结果格式化（保持不变）

- **目标**: 将搜索结果格式化为 AI 友好的上下文
- **输入**: 搜索结果数组
- **输出**: 结构化的文本格式
- **涉及文件**:
  - 新建 `services/search/formatters.ts`
- **预估工作量**: 1-2 小时
- **实现要点**:
  ```typescript
  export function formatSearchResults(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return '未找到相关搜索结果';
    }

    const timestamp = new Date().toISOString();
    const header = `搜索时间: ${timestamp}\n搜索来源: ${results[0]?.source || 'unknown'}\n\n`;

    const formatted = results.map((r, i) => {
      // 限制每个摘要的长度（避免超出 token 限制）
      const snippet = r.snippet.length > 200
        ? r.snippet.substring(0, 200) + '...'
        : r.snippet;

      return `[${i + 1}] ${r.title}\n来源: ${r.url}\n摘要: ${snippet}\n`;
    }).join('\n');

    return header + formatted;
  }
  ```

#### 任务 4.3: 添加搜索错误处理和用户反馈（更新）

- **目标**: 处理搜索失败场景，提供友好提示
- **输入**: 搜索错误类型（网络错误、解析失败、API 错误）
- **输出**: 用户友好的错误提示和降级策略
- **涉及文件**:
  - 修改 `components/chat/ChatInput.tsx`
  - 修改 `services/search/SearchClient.ts`
- **预估工作量**: 2-3 小时
- **错误类型与处理**（更新）:
  ```typescript
  // 网页爬取特定错误
  export class SearchError extends Error {
    constructor(
      message: string,
      public code: 'NETWORK_ERROR' | 'PARSE_ERROR' | 'CAPTCHA' | 'API_ERROR' | 'TIMEOUT'
    ) {
      super(message);
    }
  }

  // 错误处理示例
  try {
    searchResults = await performSearch(options);
  } catch (error) {
    if (error.code === 'PARSE_ERROR') {
      showSnackbar('搜索结果解析失败，可能是页面结构变更，请尝试切换搜索引擎');
    } else if (error.code === 'CAPTCHA') {
      showSnackbar('搜索引擎要求验证，请稍后重试或切换搜索引擎');
    } else if (error.code === 'NETWORK_ERROR') {
      showSnackbar('网络连接失败，请检查网络设置');
    } else if (error.code === 'API_ERROR') {
      showSnackbar('Tavily API 调用失败，请检查 API Key 是否正确');
    }

    // 记录失败的搜索历史
    await saveSearchHistory({
      conversationId,
      query: inputText,
      engine,
      method: engine === 'tavily' ? 'api' : 'web-scraping',
      resultsCount: 0,
      success: false,
      errorMessage: error.message,
    });
  }
  ```

#### 任务 4.4: 性能优化与缓存机制（保持不变）

- **目标**: 避免重复搜索，提升响应速度
- **输入**: 搜索查询历史
- **输出**: 带缓存的搜索服务
- **涉及文件**:
  - 修改 `services/search/SearchClient.ts`
  - 新建 `services/search/cache.ts`
- **预估工作量**: 2-3 小时
- **实现要点**:
  ```typescript
  // 简单的内存缓存（LRU）
  class SearchCache {
    private cache = new Map<string, { results: SearchResult[]; timestamp: number }>();
    private maxSize = 50; // 最多缓存 50 条
    private ttl = 5 * 60 * 1000; // 5 分钟过期

    get(key: string): SearchResult[] | null {
      const cached = this.cache.get(key);
      if (!cached) return null;

      if (Date.now() - cached.timestamp > this.ttl) {
        this.cache.delete(key);
        return null;
      }

      return cached.results;
    }

    set(key: string, results: SearchResult[]) {
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, { results, timestamp: Date.now() });
    }
  }

  const searchCache = new SearchCache();

  // 在 performSearch 中使用缓存
  export async function performSearch(options: SearchOptions): Promise<SearchResult[]> {
    const cacheKey = `${options.engine}:${options.query}`;

    // 检查缓存
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log('Search cache hit:', cacheKey);
      return cached;
    }

    // 执行搜索
    const results = await _performSearchInternal(options);

    // 存入缓存
    searchCache.set(cacheKey, results);

    return results;
  }
  ```

---

## 验收标准

### 功能完整性
- [ ] 支持 Bing、Google（网页爬取）和 Tavily（API）三个搜索引擎
- [ ] 设置页面可配置搜索引擎和 Tavily API Key
- [ ] 聊天输入框中可启用/禁用搜索功能
- [ ] 搜索结果能正确发送给 AI 进行汇总
- [ ] 显示独立的搜索加载动画
- [ ] 搜索历史完整记录（包括失败记录）

### 用户体验
- [ ] 搜索加载状态清晰可见
- [ ] 搜索失败时有友好的错误提示（区分不同错误类型）
- [ ] Tavily API Key 无效时引导用户前往设置
- [ ] 网页爬取失败时建议切换搜索引擎
- [ ] 搜索过程可以中断（取消功能）
- [ ] UI 风格与现有界面保持一致

### 技术质量
- [ ] 代码遵循项目现有规范（TypeScript 严格模式）
- [ ] 错误处理完善（网络超时、HTML 解析失败、CAPTCHA）
- [ ] 跨平台兼容（iOS、Android 均可用）
- [ ] 无内存泄漏和性能问题
- [ ] API Key 安全存储（使用 AsyncStorage 或 expo-secure-store）
- [ ] User-Agent 配置合理，降低反爬虫风险

### 性能指标
- [ ] 搜索响应时间 < 5 秒（正常网络环境，网页爬取稍慢）
- [ ] 缓存命中率 > 30%（相同查询短时间内复用）
- [ ] 不阻塞 UI 主线程
- [ ] HTML 解析性能良好（< 100ms）

---

## 风险评估与解决方案

### 风险 1: 网页爬取反爬虫限制（新增，高优先级）

**描述**:
- Bing 和 Google 可能检测到自动化请求并返回 CAPTCHA
- 频繁请求可能导致 IP 被临时封禁
- 搜索结果页面的 HTML 结构可能随时变更

**影响**:
- 搜索功能间歇性失效
- 用户体验下降

**解决方案**:
- ✅ **User-Agent 轮换**: 使用真实浏览器的 User-Agent，模拟移动端请求
- ✅ **请求频率控制**: 在客户端添加请求间隔（至少 2 秒），避免频繁请求
- ✅ **错误处理降级**: 遇到 CAPTCHA 或封禁时，提示用户切换搜索引擎或稍后重试
- ✅ **定期更新解析逻辑**: 监控搜索结果页面结构变化，及时更新 HTML 解析代码
- ✅ **添加 Referer 和 Accept-Language**: 模拟真实浏览器请求头
- ⚠️ **可选**: 添加代理支持（需要用户自行配置）

**优先级**: **高**

---

### 风险 2: HTML 解析失败（新增，中优先级）

**描述**:
- 搜索引擎的 HTML 结构复杂且经常变化
- 不同地区/语言的搜索结果页面可能不同
- 广告、推荐内容可能干扰解析

**影响**:
- 无法提取有效的搜索结果
- 返回空结果或格式错误的数据

**解决方案**:
- ✅ **鲁棒的解析逻辑**: 使用多种选择器作为备选（fallback）
- ✅ **数据验证**: 解析后验证结果的必填字段（title、url、snippet）
- ✅ **降级处理**: 解析失败时返回友好错误而非崩溃
- ✅ **日志记录**: 记录解析失败的 HTML 片段，便于调试
- ✅ **单元测试**: 对解析函数编写测试用例，覆盖多种 HTML 结构

**优先级**: **中**

---

### 风险 3: 跨平台网络请求差异（低优先级，已简化）

**描述**:
- iOS、Android 的 `fetch` 实现可能存在细微差异
- ~~CORS 限制在 Web 端可能导致直接请求失败~~（项目不支持 Web 端，已排除）

**影响**:
- 移动端（iOS/Android）网络请求行为需保持一致

**解决方案**:
- ✅ **统一使用 fetch API**: iOS 和 Android 原生支持
- ✅ **平台特定错误处理**: 检测 `Platform.OS` 并提供针对性提示（如需要）
- ✅ **在两个平台上进行充分测试**: iOS 和 Android

**优先级**: **低**（风险大幅降低）

**注意**: 项目仅支持 iOS 和 Android，无需考虑 Web 端 CORS 问题

---

### 风险 4: 搜索结果过长导致 AI 上下文溢出（中优先级）

**描述**:
- 搜索结果加上用户消息可能超过 AI 模型的上下文窗口
- 网页爬取可能返回更多冗余内容

**影响**:
- AI 请求失败或结果截断

**解决方案**:
- ✅ **限制搜索结果数量**: 默认 5 条，最多 10 条
- ✅ **智能截断摘要**: 每条结果的 snippet 限制在 200 字符
- ✅ **动态调整**: 根据 AI 模型的 `maxTokens` 设置动态调整搜索结果长度
- ✅ **优先级排序**: 仅保留最相关的搜索结果
- ✅ **系统提示优化**: 在系统提示中指示 AI 优先利用搜索结果摘要

**优先级**: **中**

---

### 风险 5: Tavily API 配额限制（低优先级）

**描述**:
- Tavily API 可能有每日/每月调用限制
- 免费计划配额有限

**影响**:
- 用户可能频繁触发配额限制

**解决方案**:
- ✅ **在设置页面明确提示配额限制**
- ✅ **实现缓存机制减少重复请求**
- ✅ **支持切换到 Bing/Google（网页爬取）**
- ✅ **显示搜索次数统计（可选）**

**优先级**: **低**

---

### 风险 6: HTML 解析库体积和兼容性（低优先级）

**描述**:
- `cheerio` 等库可能不支持 React Native
- 轻量级解析库可能功能有限

**影响**:
- 打包体积增大或功能受限

**解决方案**:
- ✅ **使用正则表达式作为备选方案**（最轻量）
- ✅ **优先选择 React Native 兼容的轻量级库**（如 `htmlparser2-lite`）
- ✅ **按需加载**: 仅在启用搜索功能时加载解析库
- ✅ **性能测试**: 确保解析性能在移动设备上可接受（< 100ms）

**优先级**: **低**

---

## 技术实现细节补充

### HTML 解析示例（Bing）

```typescript
// services/search/utils/html-parser.ts
export function parseBingSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];

  // 使用正则表达式提取搜索结果（轻量级方案）
  // Bing 搜索结果通常在 <li class="b_algo"> 标签中
  const resultRegex = /<li class="b_algo">[\s\S]*?<h2>[\s\S]*?<a href="([^"]+)"[\s\S]*?>(.*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<p>(.*?)<\/p>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
    const [, url, title, snippet] = match;

    // 清理 HTML 标签和实体
    const cleanTitle = decodeHtmlEntities(title.replace(/<[^>]+>/g, ''));
    const cleanSnippet = decodeHtmlEntities(snippet.replace(/<[^>]+>/g, ''));

    if (cleanTitle && url && cleanSnippet) {
      results.push({
        title: cleanTitle,
        url: url.startsWith('http') ? url : `https://www.bing.com${url}`,
        snippet: cleanSnippet,
      });
    }
  }

  // 如果正则解析失败，尝试使用备用选择器（使用轻量级 HTML 解析器）
  if (results.length === 0) {
    // 备用方案...
  }

  return results;
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
```

### User-Agent 管理

```typescript
// services/search/utils/user-agents.ts
export const USER_AGENTS = {
  desktop: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  mobile: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ],
};

// 随机选择 User-Agent（降低检测风险）
export function getRandomUserAgent(type: 'desktop' | 'mobile' = 'mobile'): string {
  const agents = USER_AGENTS[type];
  return agents[Math.floor(Math.random() * agents.length)];
}
```

---

## 附录: 开发注意事项

### 代码规范
- 所有新文件使用 TypeScript 严格模式
- 遵循现有的命名约定（PascalCase for components, camelCase for functions）
- 添加 JSDoc 注释说明函数用途
- 使用 `try-catch` 进行错误处理
- **网页爬取代码需要详细的注释说明 HTML 结构**

### 测试建议
- ✅ **手动测试三个搜索引擎**（Bing/Google/Tavily）
- ✅ **测试网络异常情况**（离线、超时、CAPTCHA）
- ✅ **测试 HTML 解析的鲁棒性**（模拟不同结构的 HTML）
- ✅ **测试 User-Agent 轮换**
- ✅ **在 iOS、Android 两端验证功能**

### 性能优化
- 避免频繁调用 AsyncStorage（使用内存缓存）
- 搜索请求添加超时控制（默认 10 秒，网页爬取可能需要更长）
- 使用 `AbortController` 支持请求取消
- HTML 解析性能优化（避免多次遍历，使用流式解析）

### 安全考虑
- API Key 不应在日志中输出
- 搜索查询应进行 URL 编码
- 避免 XSS 攻击（搜索结果渲染时转义 HTML）
- 限制搜索查询长度（防止滥用，建议最大 200 字符）
- **不要在代码中硬编码 API Key**

### 法律与道德考虑 ⚠️
- 网页爬取应遵守搜索引擎的 `robots.txt` 规则
- 不要进行恶意爬取或 DDoS 攻击
- 添加合理的请求间隔（建议 2-3 秒）
- 在应用说明中告知用户使用了网页爬取技术
- **用户需自行承担使用风险**

---

## 用户反馈区域

> **此区域已完成用户反馈收集**
>
> 用户确认内容：
> - ✅ 搜索结果显示方式: 方案 A（仅 AI 汇总）
> - ✅ 搜索触发方式: 方案 A（手动开关）
> - ✅ 搜索历史记录: 方案 A（完整历史）
> - ✅ Bing/Google 采用网页爬取方式
> - ✅ Tavily 采用官方 API
> - ✅ 移除不必要的 API Key 配置项

---

**文档版本**: v1.1
**创建时间**: 2025-11-04
**最后更新**: 2025-11-04
**预计总工作量**: 35-45 小时（比 v1.0 增加 5 小时，因网页爬取更复杂）
**建议实施周期**: 1.5-2 周

---

## 版本变更摘要（v1.0 → v1.1）

### 新增内容
- ✅ 任务 1.4: 创建 HTML 解析工具模块
- ✅ 任务 2.4: 创建 HTTP 请求工具
- ✅ User-Agent 管理和轮换机制
- ✅ 风险 1: 网页爬取反爬虫限制（高优先级）
- ✅ 风险 2: HTML 解析失败（中优先级）

### 修改内容
- 🔄 任务 1.2: 移除 Bing/Google API Key 配置
- 🔄 任务 2.1: Bing 改为网页爬取实现
- 🔄 任务 2.2: Google 改为网页爬取实现
- 🔄 任务 2.5: 统一调度逻辑更新
- 🔄 任务 3.1: 设置页面简化（仅保留 Tavily API Key）
- 🔄 任务 4.3: 错误处理增加网页爬取特定错误

### 移除内容
- ❌ Bing Search API v7 集成
- ❌ Google Custom Search API 集成
- ❌ API 配额限制风险（针对 Bing/Google）

### 工作量变化
- v1.0: 30-40 小时
- v1.1: 35-45 小时（+5 小时）
- **主要增加**: HTML 解析开发和调试、反爬虫测试

---

## 快速启动检查清单

开始开发前，请确认：

- [ ] 已阅读完整规划文档
- [ ] 已理解网页爬取的技术风险和法律风险
- [ ] 已选择 HTML 解析库（推荐 `htmlparser2-lite` 或正则表达式）
- [ ] 已准备 Tavily API Key（用于测试 API 方式）
- [ ] 已在三个平台（iOS/Android/Web）上测试网络请求
- [ ] 已阅读 Bing 和 Google 的 `robots.txt`
- [ ] 已准备好错误处理和降级策略

---

**准备就绪？开始阶段 1: 基础架构搭建！** 🚀
