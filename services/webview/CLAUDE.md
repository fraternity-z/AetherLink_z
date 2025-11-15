[根目录](../../CLAUDE.md) > [services](../) > **webview**

# WebView 服务模块

## 模块职责

WebView 服务模块 (`services/webview/`) 提供隐藏的 WebView 容器，用于执行需要浏览器环境的任务，如网络搜索的反爬虫绕过、JavaScript 执行等。

## 核心功能

- 🌐 **隐藏 WebView**: 提供不可见的 WebView 容器
- 🔧 **JS 执行**: 在 WebView 中执行 JavaScript 代码
- 🔄 **双向通信**: React Native 与 WebView 的消息传递
- 🕷️ **反爬虫绕过**: 模拟真实浏览器环境，绕过简单的反爬虫机制
- 🔐 **Cookie 管理**: 管理 WebView 的 Cookie 和会话状态

## 入口与启动

### 主要服务文件
- `HiddenWebViewClient.ts` - WebView 客户端服务

### 全局 Provider
在 `app/_layout.tsx` 中初始化：
```typescript
import HiddenWebViewHost from '@/components/providers/HiddenWebViewHost';

<HiddenWebViewHost />
```

### 使用示例
```typescript
import { hiddenWebViewClient } from '@/services/webview/HiddenWebViewClient';

// 加载 URL 并执行 JS
const result = await hiddenWebViewClient.loadAndExecute({
  url: 'https://example.com',
  javascript: `
    document.title
  `,
  timeout: 10000
});

// 执行 JS 并返回结果
const html = await hiddenWebViewClient.executeScript(`
  document.documentElement.outerHTML
`);

// 清除 Cookie
await hiddenWebViewClient.clearCookies();
```

## 对外接口

### HiddenWebViewClient (WebView 客户端)
```typescript
export class HiddenWebViewClient {
  /**
   * 加载 URL 并执行 JavaScript
   */
  async loadAndExecute(options: {
    url: string;              // 要加载的 URL
    javascript: string;       // 要执行的 JS 代码
    timeout?: number;         // 超时时间（毫秒）
    userAgent?: string;       // 自定义 User-Agent
    headers?: Record<string, string>; // 自定义请求头
  }): Promise<string>;

  /**
   * 执行 JavaScript 代码
   */
  async executeScript(javascript: string): Promise<string>;

  /**
   * 清除 Cookies
   */
  async clearCookies(): Promise<void>;

  /**
   * 清除缓存
   */
  async clearCache(includeDiskFiles: boolean): Promise<void>;

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string | null;

  /**
   * 重新加载当前页面
   */
  reload(): void;

  /**
   * 停止加载
   */
  stopLoading(): void;
}

// 全局单例
export const hiddenWebViewClient = new HiddenWebViewClient();
```

## 关键依赖与配置

### WebView 库
- `react-native-webview` - WebView 组件库

### Provider 系统
- `@/components/providers/HiddenWebViewHost` - 隐藏的 WebView 容器组件

### 工具
- `@/utils/logger` - 日志工具

### 配置
```typescript
// 默认超时时间
const DEFAULT_TIMEOUT = 10000; // 10 秒

// 默认 User-Agent
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
```

## 实现细节

### 隐藏 WebView 容器
在 `HiddenWebViewHost` 组件中创建不可见的 WebView：
```typescript
<View style={{ position: 'absolute', left: -9999, top: -9999, width: 1, height: 1 }}>
  <WebView
    ref={webViewRef}
    source={{ uri: 'about:blank' }}
    onMessage={handleMessage}
    onLoadEnd={handleLoadEnd}
    onError={handleError}
    style={{ width: 1, height: 1 }}
  />
</View>
```

### 双向通信机制
**React Native → WebView (执行 JS):**
```typescript
webViewRef.current?.injectJavaScript(`
  (function() {
    const result = ${javascript};
    window.ReactNativeWebView.postMessage(JSON.stringify(result));
  })();
`);
```

**WebView → React Native (返回结果):**
```typescript
const handleMessage = (event: WebViewMessageEvent) => {
  const data = event.nativeEvent.data;
  // 处理返回的数据
};
```

### 超时处理
```typescript
const loadWithTimeout = (url: string, timeout: number): Promise<void> => {
  return Promise.race([
    loadUrl(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('WebView load timeout')), timeout)
    )
  ]);
};
```

### Cookie 管理
```typescript
import CookieManager from '@react-native-cookies/cookies';

// 清除所有 Cookies
async clearCookies() {
  await CookieManager.clearAll();
}

// 获取指定域的 Cookies
async getCookies(url: string) {
  return await CookieManager.get(url);
}
```

## 使用场景

### 网络搜索反爬虫
某些搜索引擎（如 Google、Bing）有反爬虫机制，使用 WebView 模拟真实浏览器：
```typescript
// 在 SearchClient 中使用
const searchResult = await hiddenWebViewClient.loadAndExecute({
  url: 'https://www.google.com/search?q=React+Native',
  javascript: `
    Array.from(document.querySelectorAll('.g')).map(el => ({
      title: el.querySelector('h3')?.innerText,
      snippet: el.querySelector('.VwiC3b')?.innerText,
      url: el.querySelector('a')?.href
    }))
  `,
  timeout: 15000
});
```

### 动态内容抓取
抓取 JavaScript 渲染的页面内容：
```typescript
const html = await hiddenWebViewClient.loadAndExecute({
  url: 'https://example.com',
  javascript: `document.documentElement.outerHTML`,
  timeout: 10000
});
```

### 执行第三方 JS SDK
在 WebView 中执行第三方 JavaScript SDK：
```typescript
await hiddenWebViewClient.loadAndExecute({
  url: 'about:blank',
  javascript: `
    // 加载并执行第三方 SDK
    const script = document.createElement('script');
    script.src = 'https://example.com/sdk.js';
    document.body.appendChild(script);
  `
});
```

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试策略
- **通信测试**: 验证 React Native 与 WebView 的双向通信
- **超时测试**: 测试超时机制和错误处理
- **Cookie 测试**: 验证 Cookie 管理功能
- **JS 执行测试**: 测试 JavaScript 执行的正确性

### 测试要点
- Mock WebView 行为
- 测试网络错误和超时
- 验证返回数据的解析
- 测试 Cookie 持久化

## 常见问题 (FAQ)

### Q: 为什么需要隐藏的 WebView？
A: 某些任务需要真实的浏览器环境（如反爬虫绕过），但不需要显示给用户。

### Q: WebView 会影响性能吗？
A: 会占用一定内存，但通过单例模式复用可以减少开销。

### Q: 如何调试 WebView 中的 JavaScript？
A: 使用 React Native Debugger 或 Chrome DevTools 的远程调试功能。

### Q: WebView 支持哪些平台？
A: iOS、Android、Web（需要特殊处理）。

### Q: 如何处理 WebView 的安全性问题？
A: 仅加载可信的 URL，避免执行不受信任的 JavaScript 代码。

## 性能优化

### 单例模式
全局使用单个 WebView 实例，避免重复创建：
```typescript
export const hiddenWebViewClient = new HiddenWebViewClient();
```

### 请求复用
避免频繁创建和销毁 WebView，复用现有实例。

### 内存管理
定期清理 Cookie 和缓存，避免内存泄漏：
```typescript
// 定期清理
setInterval(() => {
  hiddenWebViewClient.clearCache(true);
}, 3600000); // 每小时清理一次
```

## 安全性考虑

### URL 白名单
仅允许加载可信的 URL：
```typescript
const ALLOWED_DOMAINS = ['google.com', 'bing.com', 'tavily.com'];

function isAllowedUrl(url: string): boolean {
  const hostname = new URL(url).hostname;
  return ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));
}
```

### JavaScript 注入防护
避免执行用户提供的 JavaScript 代码：
```typescript
// ❌ 危险：直接执行用户输入
await executeScript(userInput);

// ✅ 安全：使用白名单或模板
const SAFE_SCRIPTS = {
  getTitle: 'document.title',
  getHtml: 'document.documentElement.outerHTML'
};

await executeScript(SAFE_SCRIPTS[scriptName]);
```

### Cookie 隔离
不同用途的 WebView 使用独立的 Cookie 存储（未来优化）。

## 扩展指南

### 添加 WebView 预加载
```typescript
// 在应用启动时预加载常用页面
class PreloadedWebViewClient extends HiddenWebViewClient {
  async preload(urls: string[]) {
    for (const url of urls) {
      await this.loadAndExecute({ url, javascript: '""' });
    }
  }
}

// 使用
await webViewClient.preload([
  'https://www.google.com',
  'https://www.bing.com'
]);
```

### 实现 WebView 池
```typescript
// 管理多个 WebView 实例
class WebViewPool {
  private pool: HiddenWebViewClient[] = [];
  private maxSize = 3;

  async acquire(): Promise<HiddenWebViewClient> {
    if (this.pool.length < this.maxSize) {
      const client = new HiddenWebViewClient();
      this.pool.push(client);
      return client;
    }
    return this.pool[0]; // 复用现有实例
  }

  release(client: HiddenWebViewClient) {
    // 清理状态，放回池中
    client.clearCookies();
  }
}
```

### 支持多标签页
```typescript
// 创建多个 WebView 实例，模拟多标签页
class MultiTabWebViewClient {
  private tabs: Map<string, HiddenWebViewClient> = new Map();

  createTab(tabId: string) {
    const client = new HiddenWebViewClient();
    this.tabs.set(tabId, client);
    return client;
  }

  getTab(tabId: string) {
    return this.tabs.get(tabId);
  }

  closeTab(tabId: string) {
    const client = this.tabs.get(tabId);
    client?.clearCookies();
    this.tabs.delete(tabId);
  }
}
```

## 相关文件清单

### 核心服务
- `HiddenWebViewClient.ts` - WebView 客户端服务

### Provider 组件
- `../../components/providers/HiddenWebViewHost.tsx` - 隐藏的 WebView 容器

### 使用位置
- `../search/engines/GoogleSearch.ts` - Google 搜索引擎
- `../search/engines/BingSearch.ts` - Bing 搜索引擎
- 其他需要 WebView 的场景

## 变更记录 (Changelog)

### 2025-11-15
- 创建 WebView 服务模块文档
- 详细记录隐藏 WebView 实现和双向通信机制
- 添加安全性和性能优化建议
- 提供扩展开发指南和常见问题解答
