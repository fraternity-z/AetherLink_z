# Utils 模块 - 通用工具函数

## 模块概述

utils 模块提供了一系列通用的工具函数和类，用于简化开发和提升应用性能。包括日志管理、缓存机制、事件通信、样式工具等核心功能。

## 核心特性

- 📝 **日志管理** (logger.ts): 统一的日志系统，支持分级输出和生产环境优化
- 🗃️ **渲染缓存** (render-cache.ts): 混合缓存策略，LRU 淘汰机制，提升渲染性能
- 🎯 **事件总线** (events.ts): 跨组件通信，支持节流发送，适用于高频更新场景
- 🖼️ **模型 Logo** (model-logo.ts): 自动匹配 AI 模型官方 Logo，支持深色/浅色主题
- 🎨 **样式工具** (classnames.ts): 简洁的类名拼接工具，便于条件性样式控制

## 模块文件结构

```
utils/
├── logger.ts           # 日志管理工具 ⭐新增⭐
├── render-cache.ts     # 渲染缓存工具
├── events.ts           # 事件总线
├── model-logo.ts       # 模型 Logo 工具
├── classnames.ts       # 类名拼接工具
└── CLAUDE.md          # 模块文档（本文件）
```

---

## 详细文档

### 1. logger.ts - 日志管理工具 ⭐

**职责**：提供统一的日志管理接口，替代直接使用 console.*

**核心功能**：
- 支持 debug、info、warn、error 四个日志级别
- 生产环境自动移除非关键日志（通过 Babel 插件）
- 预留扩展接口，方便接入第三方日志服务（Sentry、LogRocket 等）
- 支持命名空间，便于识别日志来源
- 日志处理器机制，支持自定义日志输出目标

**API 接口**：

```typescript
// 基础用法
logger.debug(message: string, data?: any): void
logger.info(message: string, data?: any): void
logger.warn(message: string, data?: any): void
logger.error(message: string, error?: Error | unknown, context?: any): void

// 高级功能
logger.addHandler(handler: LogHandler): void  // 添加日志处理器
logger.removeHandler(handler: LogHandler): void  // 移除日志处理器
logger.setDebugEnabled(enabled: boolean): void  // 设置是否启用调试日志
logger.createNamespace(namespace: string): NamespacedLogger  // 创建命名空间日志器
```

**使用示例**：

```typescript
import { logger } from '@/utils/logger';

// 基础日志
logger.debug('组件渲染', { component: 'ChatInput' });
logger.info('消息发送成功', { messageId: '123' });
logger.warn('API 响应缓慢', { duration: 3000 });
logger.error('网络请求失败', error, { context: { url: '/api/chat' } });

// 命名空间日志
const log = logger.createNamespace('AiClient');
log.info('发送消息');  // 输出: ℹ️ [时间戳] [INFO] [AiClient] 发送消息
```

**依赖关系**：
- 无外部依赖（纯工具函数）
- 被 Babel 插件配置使用（babel.config.js）

**相关文档**：
- [日志系统使用指南](../docs/LOGGER_USAGE.md) - 完整的使用文档和最佳实践

**性能优化**：
- 生产环境通过 Babel 插件自动移除 debug/info/warn 日志
- 运行时零性能开销（代码已完全移除）
- 日志处理器支持异步操作，不阻塞主线程

---

### 2. render-cache.ts - 渲染缓存工具

**职责**：缓存 Markdown 和数学公式的渲染结果，避免重复计算

**核心功能**：
- 内存缓存 + 本地存储混合策略
- LRU (Least Recently Used) 缓存淘汰机制
- 自动清理过期缓存（7天过期）
- 内存缓存限制 50 个条目，本地存储限制 1MB
- 支持 Markdown 和 MathJax 渲染结果缓存

**API 接口**：

```typescript
class RenderCache<T> {
  async get(key: string): Promise<T | null>
  async set(key: string, data: T): Promise<void>
  async delete(key: string): Promise<void>
  async clear(): Promise<void>
  getStats(): { memory: MemoryCacheStats }
  static generateKey(content: string, type: string): string
}

// 全局实例
export const markdownCache: RenderCache<string>
export const mathJaxCache: RenderCache<any>

// 工具函数
export const cacheUtils = {
  clearAll(): Promise<void>
  getStats(): CacheStats
  cleanup(): Promise<void>
}
```

**使用示例**：

```typescript
import { markdownCache, RenderCache } from '@/utils/render-cache';

// 缓存 Markdown 渲染结果
const cacheKey = RenderCache.generateKey(markdownContent, 'markdown');
const cached = await markdownCache.get(cacheKey);

if (cached) {
  return cached; // 使用缓存
} else {
  const rendered = await renderMarkdown(markdownContent);
  await markdownCache.set(cacheKey, rendered);
  return rendered;
}

// 获取缓存统计
const stats = markdownCache.getStats();
console.log(`缓存命中率: ${stats.memory.count} / ${stats.memory.maxSize}`);
```

**依赖关系**：
- `@react-native-async-storage/async-storage` - 本地存储
- 被 Markdown 和 MathJax 渲染组件使用

**性能影响**：
- 内存缓存命中：~1ms（极快）
- 本地存储命中：~10-20ms（较快）
- 缓存未命中：取决于渲染时间（可能 100-500ms）

---

### 3. events.ts - 事件总线

**职责**：提供跨组件通信的简单事件总线，避免复杂的 props 传递

**核心功能**：
- 发布-订阅模式（Pub-Sub）
- 支持节流发送（emitThrottled），适用于高频更新场景
- 预定义常用事件类型（消息变更、对话变更等）
- 自动内存管理（off 方法取消订阅）

**API 接口**：

```typescript
class EventEmitter {
  on(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void
  emit(event: string, ...args: any[]): void
  emitThrottled(event: string, delay: number, ...args: any[]): void
}

export const appEvents: EventEmitter

// 预定义事件
export const AppEvents = {
  MESSAGES_CLEARED: 'messages:cleared',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_CHANGED: 'message:changed',
  CONVERSATION_CHANGED: 'conversation:changed',
  ASSISTANT_CHANGED: 'assistant:changed',
} as const
```

**使用示例**：

```typescript
import { appEvents, AppEvents } from '@/utils/events';

// 订阅事件
const handleMessageSent = (message: Message) => {
  console.log('消息已发送:', message);
};

appEvents.on(AppEvents.MESSAGE_SENT, handleMessageSent);

// 发送事件
appEvents.emit(AppEvents.MESSAGE_SENT, newMessage);

// 节流发送（AI 流式响应场景）
appEvents.emitThrottled(AppEvents.MESSAGE_CHANGED, 200, updatedMessage);

// 取消订阅（组件卸载时）
appEvents.off(AppEvents.MESSAGE_SENT, handleMessageSent);
```

**依赖关系**：
- 无外部依赖
- 被各种 Hook 和组件使用（如 use-messages.ts、MessageList.tsx）

**使用场景**：
- AI 流式响应实时更新
- 消息列表刷新通知
- 对话切换通知
- 助手切换通知

**注意事项**：
- 必须在组件卸载时调用 `off` 取消订阅，避免内存泄漏
- 高频更新场景使用 `emitThrottled` 而非 `emit`
- 避免在事件回调中执行重计算或副作用操作

---

### 4. model-logo.ts - 模型 Logo 工具

**职责**：根据模型 ID 或名称自动匹配对应的官方 Logo

**核心功能**：
- 支持 30+ 主流 AI 模型 Logo（OpenAI、Anthropic、Google、DeepSeek 等）
- 自动适配深色/浅色主题
- 全局缓存机制，避免重复计算
- 预编译正则表达式，提升匹配性能
- 提供 React Hook 用于组件内使用

**API 接口**：

```typescript
// 函数接口
getModelLogo(modelId: string | undefined, isDark?: boolean): any
useModelLogo(modelId: string | undefined): any  // React Hook
hasModelLogo(modelId: string | undefined): boolean
```

**支持的模型**：

| 提供商 | 关键词 | 示例模型 ID |
|--------|-------|-------------|
| OpenAI | gpt, o1, o3, 4o | gpt-4, gpt-4o, o1-mini |
| Anthropic | claude | claude-3.5-sonnet |
| Google | gemini | gemini-pro, gemini-1.5 |
| DeepSeek | deepseek | deepseek-chat, deepseek-r1 |
| 阿里 Qwen | qwen, qwq | qwen-max, qwq-32b |
| Moonshot | moonshot, kimi | moonshot-v1 |
| 其他 | 30+ 模型 | ... |

**使用示例**：

```typescript
import { getModelLogo, useModelLogo } from '@/utils/model-logo';

// 在组件中使用（自动适配主题）
function ModelBadge({ modelId }: { modelId: string }) {
  const logo = useModelLogo(modelId);

  return logo ? <Image source={logo} style={styles.logo} /> : null;
}

// 在非组件中使用
const logo = getModelLogo('gpt-4o', true); // 深色模式

// 检查是否有 Logo
if (hasModelLogo('custom-model')) {
  // 显示 Logo
} else {
  // 显示占位符
}
```

**依赖关系**：
- `@/hooks/use-color-scheme` - 主题检测 Hook
- 被 `MessageBubble`、`ModelSelector` 等组件使用

**性能优化**：
- 全局缓存 Map，避免重复计算
- 预编译正则表达式，提升匹配速度
- 缓存命中率接近 100%（生产环境）

**扩展方法**：
在 `MODEL_LOGOS` 常量中添加新的模型映射：

```typescript
const MODEL_LOGOS = {
  'new-model': {
    light: require('../assets/images/models/new_model.png'),
    dark: require('../assets/images/models/new_model_dark.png')
  },
} as const;
```

---

### 5. classnames.ts - 类名拼接工具

**职责**：简洁的 className 组合工具，用于条件性拼接 Tailwind CSS 类名

**核心功能**：
- 支持字符串、undefined、false、null 类型
- 自动过滤假值（falsy values）
- 简洁的 API，替代复杂的字符串拼接

**API 接口**：

```typescript
cn(...classes: (string | undefined | false | null)[]): string
```

**使用示例**：

```typescript
import { cn } from '@/utils/classnames';

// 基础用法
cn('flex', 'items-center', 'p-4');
// => 'flex items-center p-4'

// 条件性类名
const isActive = true;
cn('button', isActive && 'bg-primary', 'text-white');
// => 'button bg-primary text-white'

// 与 undefined 和 null 兼容
cn('flex', undefined, null, false, 'p-4');
// => 'flex p-4'

// 在组件中使用
function Button({ variant, className }: ButtonProps) {
  return (
    <View className={cn(
      'px-4 py-2 rounded',
      variant === 'primary' && 'bg-blue-500',
      variant === 'secondary' && 'bg-gray-500',
      className
    )}>
      ...
    </View>
  );
}
```

**依赖关系**：
- 无外部依赖
- 被各种组件使用（配合 NativeWind）

**替代方案**：
- 如果需要更复杂的类名处理，可使用 `clsx` 或 `classnames` 库
- 当前实现足够满足大多数场景，保持简洁

---

## 模块依赖关系

```mermaid
graph TD
    A[logger.ts] -.->|配置| B[babel.config.js]
    C[render-cache.ts] -->|依赖| D[@react-native-async-storage]
    E[model-logo.ts] -->|依赖| F[use-color-scheme Hook]
    G[events.ts] -.->|被使用| H[Hooks 和组件]
    I[classnames.ts] -.->|被使用| J[UI 组件]

    A -->|日志输出| K[Sentry/LogRocket 可选]
    C -->|缓存| L[Markdown/MathJax 渲染]
    E -->|Logo 资源| M[assets/images/models]

    style A fill:#e1f5ff
    style C fill:#fff3cd
    style E fill:#d4edda
    style G fill:#f8d7da
    style I fill:#e2e3e5
```

## 使用建议

### 1. 日志系统

**✅ 推荐**：
- 使用 `logger` 而非直接 `console.*`
- 提供结构化数据，便于后续分析
- 在关键流程添加日志（登录、支付、API 调用等）

**❌ 避免**：
- 直接使用 `console.log` 绕过日志系统
- 在循环中输出大量日志
- 日志中包含敏感信息（密码、令牌等）

**示例**：
```typescript
// ❌ 不推荐
console.log('用户登录', user);

// ✅ 推荐
logger.info('用户登录', { userId: user.id, email: maskEmail(user.email) });
```

---

### 2. 渲染缓存

**✅ 推荐**：
- 在 Markdown 和 MathJax 渲染时使用缓存
- 使用 `RenderCache.generateKey` 生成一致的缓存键
- 定期检查缓存统计，调整配置参数

**❌ 避免**：
- 缓存过大的数据（超过 50KB）
- 频繁清空缓存（影响性能）
- 忘记更新缓存键（导致使用过期数据）

**示例**：
```typescript
// ✅ 推荐
const cacheKey = RenderCache.generateKey(content, 'markdown');
const cached = await markdownCache.get(cacheKey);
if (cached) return cached;

const rendered = await renderMarkdown(content);
await markdownCache.set(cacheKey, rendered);
return rendered;
```

---

### 3. 事件总线

**✅ 推荐**：
- 使用预定义的 `AppEvents` 常量
- 在组件卸载时取消订阅（`useEffect` cleanup）
- 高频更新场景使用 `emitThrottled`

**❌ 避免**：
- 忘记取消订阅（内存泄漏）
- 在事件回调中执行重计算
- 过度使用事件通信（优先使用 props 和 Context）

**示例**：
```typescript
// ✅ 推荐
useEffect(() => {
  const handler = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  appEvents.on(AppEvents.MESSAGE_SENT, handler);

  return () => {
    appEvents.off(AppEvents.MESSAGE_SENT, handler);
  };
}, []);
```

---

### 4. 模型 Logo

**✅ 推荐**：
- 在组件中使用 `useModelLogo` Hook
- 检查 `hasModelLogo` 后再显示 Logo
- 为不支持的模型提供占位符

**❌ 避免**：
- 直接 require Logo 文件（失去缓存和主题适配）
- 忘记处理未找到 Logo 的情况

**示例**：
```typescript
// ✅ 推荐
const logo = useModelLogo(modelId);
if (!logo) return <DefaultAvatar />;
return <Image source={logo} style={styles.logo} />;
```

---

### 5. 类名工具

**✅ 推荐**：
- 配合 NativeWind 使用
- 条件性添加类名时使用
- 组件支持自定义 `className` prop

**❌ 避免**：
- 复杂的类名逻辑（考虑使用 `clsx` 库）
- 过度使用（简单场景直接字符串拼接即可）

**示例**：
```typescript
// ✅ 推荐
<View className={cn('flex', isActive && 'bg-primary', className)} />

// ❌ 过度使用
<View className={cn('flex')} />  // 直接用 'flex' 即可
```

---

## 性能监控

### 缓存统计

```typescript
import { markdownCache, mathJaxCache } from '@/utils/render-cache';

// 获取缓存统计信息
const markdownStats = markdownCache.getStats();
const mathJaxStats = mathJaxCache.getStats();

console.log('Markdown 缓存:', markdownStats);
// => { memory: { count: 15, totalSize: 34560, maxSize: 50 } }

console.log('MathJax 缓存:', mathJaxStats);
// => { memory: { count: 8, totalSize: 12400, maxSize: 50 } }
```

### 事件监控

```typescript
import { appEvents } from '@/utils/events';

// 监听所有事件（仅开发环境）
if (__DEV__) {
  const originalEmit = appEvents.emit;
  appEvents.emit = (event, ...args) => {
    console.log(`[Event] ${event}`, args);
    originalEmit.call(appEvents, event, ...args);
  };
}
```

---

## 测试策略

### 单元测试建议

**logger.ts**:
- 测试各日志级别的输出
- 测试命名空间功能
- 测试日志处理器添加/移除

**render-cache.ts**:
- 测试缓存存取
- 测试 LRU 淘汰机制
- 测试过期清理

**events.ts**:
- 测试订阅/取消订阅
- 测试节流发送
- 测试多次订阅同一事件

**model-logo.ts**:
- 测试各模型 ID 匹配
- 测试主题切换
- 测试缓存机制

**classnames.ts**:
- 测试条件性类名
- 测试假值过滤
- 测试空输入

---

## 未来改进方向

### 1. 日志系统
- [ ] 接入 Sentry 进行错误追踪
- [ ] 添加日志持久化到本地文件
- [ ] 支持日志上传到服务器

### 2. 渲染缓存
- [ ] 支持 IndexedDB（Web 平台）
- [ ] 添加缓存预热机制
- [ ] 优化缓存清理策略

### 3. 事件总线
- [ ] 添加事件优先级
- [ ] 支持一次性订阅（once）
- [ ] 添加通配符订阅

### 4. 模型 Logo
- [ ] 支持动态加载 Logo
- [ ] 添加 Logo 动画效果
- [ ] 支持用户自定义 Logo

### 5. 类名工具
- [ ] 支持对象语法（如 clsx）
- [ ] 添加 Tailwind 类名冲突检测

---

## 相关文档

- [日志系统使用指南](../docs/LOGGER_USAGE.md) - 完整的日志系统文档
- [项目架构文档](../CLAUDE.md) - 整体架构说明
- [编码规范](../CLAUDE.md#编码规范) - 代码规范指南

---

**最后更新**: 2025-11-09
**维护者**: AetherLink_z 开发团队
**版本**: 1.0.0
**模块成熟度**: 稳定（logger.ts 新增）
