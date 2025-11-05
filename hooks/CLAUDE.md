[根目录](../../CLAUDE.md) > **hooks**

# React Hooks 模块

## 模块职责

React Hooks 模块 (`hooks/`) 封装应用的核心业务逻辑，提供可复用的状态管理和副作用处理，连接数据层与 UI 层，实现组件逻辑的解耦和复用。

## 核心功能

- 💬 **对话管理**: 管理聊天对话的创建、更新、删除等操作
- 📝 **消息处理**: 处理消息的发送、接收、状态管理等
- ⚙️ **设置管理**: 应用设置的读取、更新、持久化
- 🎨 **主题系统**: 主题切换、颜色方案管理
- 🔄 **数据同步**: 本地数据与远程数据的同步处理

## 入口与启动

### 主要 Hooks
- `use-conversations.ts` - 对话管理 Hook
- `use-messages.ts` - 消息管理 Hook
- `use-setting.ts` - 设置管理 Hook
- `use-theme-color.ts` - 主题颜色 Hook
- `use-color-scheme.ts` - 颜色方案 Hook
- `use-color-scheme.web.ts` - Web 平台颜色方案 Hook

### 使用示例
```typescript
// 对话管理
import { useConversations } from '@/hooks/use-conversations';

const { items: conversations, loading, error, reload } = useConversations({
  archived: false,
  limit: 50
});

// 消息管理
import { useMessages } from '@/hooks/use-messages';

const {
  messages,
  loading,
  sendMessage,
  deleteMessage
} = useMessages(conversationId);

// 设置管理
import { useSetting } from '@/hooks/use-setting';

const [theme, setTheme] = useSetting('theme', 'system');

// 主题颜色
import { useThemeColor } from '@/hooks/use-theme-color';

const primaryColor = useThemeColor('primary');
```

## 对外接口

### useConversations Hook
```typescript
function useConversations(opts?: {
  archived?: boolean;
  limit?: number;
}): {
  items: Conversation[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}
```

### useMessages Hook
```typescript
function useMessages(conversationId: string | null): {
  messages: Message[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  // ...其他方法
}
```

### useSetting Hook
```typescript
function useSetting<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>]
```

### useThemeColor Hook
```typescript
function useThemeColor(
  colorName: string,
  defaultColor?: string
): string
```

### useColorScheme Hook
```typescript
function useColorScheme(): 'light' | 'dark' | 'system'
```

## 关键依赖与配置

### 数据层依赖
- **Storage Repositories**: 通过 `storage/repositories/` 访问数据
- **Core Types**: 使用 `storage/core.ts` 中的类型定义
- **AsyncStorage**: 跨平台持久化存储

### UI 框架依赖
- **React Hooks**: 基于 React 18+ 的 Hooks 系统
- **React Native Paper**: 主题系统集成
- **React Native Elements**: 补充主题支持

### 平台兼容
- **iOS/Android**: 原生平台支持
- **Web**: 通过 `use-color-scheme.web.ts` 提供兼容实现

## 架构设计

### 分层架构
```
UI Components
     ↓
React Hooks (业务逻辑层)
     ↓
Storage Repositories (数据访问层)
     ↓
SQLite Database (数据存储层)
```

### 设计原则
- **单一职责**: 每个 Hook 专注特定业务领域
- **可复用性**: 通过参数配置支持不同使用场景
- **类型安全**: 完整的 TypeScript 类型定义
- **错误处理**: 统一的错误处理和状态管理

### 状态管理模式
- **本地状态**: 使用 `useState` 管理组件内部状态
- **副作用**: 使用 `useEffect` 处理数据加载和同步
- **缓存策略**: 内置数据缓存和更新机制
- **乐观更新**: 支持操作前即时 UI 更新

## 详细 Hook 分析

### useConversations
- **功能**: 管理对话列表的获取、筛选、分页
- **特性**: 支持归档状态筛选、数量限制、自动重载
- **缓存**: 智能缓存机制，避免重复查询
- **错误处理**: 完善的错误状态和重试机制

### useMessages
- **功能**: 管理特定对话的消息列表
- **特性**: 实时消息更新、发送状态跟踪、消息操作
- **性能**: 支持长列表优化、增量加载
- **集成**: 与 AI 服务集成，处理消息发送

### useSetting
- **功能**: 应用设置的读取和持久化
- **特性**: 类型安全、默认值支持、变更通知
- **存储**: 跨平台存储适配，支持 Web 和原生平台
- **性能**: 内部缓存，避免重复存储访问

### useThemeColor & useColorScheme
- **功能**: 主题系统的颜色管理
- **特性**: 动态主题切换、平台适配、回退机制
- **集成**: 与 React Native Paper 主题系统深度集成
- **响应式**: 自动响应系统主题变更

## 测试与质量

### 当前测试覆盖
- ❌ 无自动化测试

### 建议测试策略
- **单元测试**: 每个 Hook 的独立功能测试
- **集成测试**: Hook 与数据层的集成测试
- **Mock 测试**: 使用 React Testing Library 进行组件测试
- **E2E 测试**: 完整用户流程的端到端测试

### 质量保证
- ✅ TypeScript 严格类型检查
- ✅ React Hooks 规则遵循
- ✅ 内存泄漏防护
- ✅ 性能优化实践

## 常见问题 (FAQ)

### Q: Hook 在不同组件中使用会导致数据重复请求吗？
A: 不会。每个 Hook 内部都有自己的缓存机制，避免重复请求。

### Q: 如何处理网络错误和数据同步失败？
A: 所有 Hook 都提供错误状态，可以通过 `error` 属性获取错误信息，并调用 `reload` 方法重试。

### Q: 主题切换不生效？
A: 确保使用了 `useThemeColor` Hook 而不是硬编码颜色值，并检查 `ThemeProvider` 的配置。

### Q: 设置变更后没有持久化？
A: `useSetting` Hook 会自动处理持久化，确保在异步操作完成前不要卸载组件。

## 性能优化

### 缓存策略
- **数据缓存**: 避免重复的数据库查询
- **计算缓存**: 缓存复杂的计算结果
- **组件缓存**: 使用 `React.memo` 优化组件渲染

### 异步优化
- **请求去重**: 避免并发请求相同资源
- **懒加载**: 按需加载数据和组件
- **错误边界**: 防止单个 Hook 错误影响整个应用

### 内存管理
- **清理副作用**: 在 `useEffect` 返回清理函数
- **避免闭包陷阱**: 正确使用依赖数组
- **及时取消**: 取消未完成的异步操作

## 扩展指南

### 创建新的 Hook
1. 确定业务职责和数据需求
2. 设计 Hook 的接口和返回值
3. 实现数据获取和状态管理逻辑
4. 添加错误处理和加载状态
5. 编写类型定义和文档注释

### Hook 组合模式
```typescript
// 组合多个 Hook 创建复合功能
function useConversationManager(conversationId: string) {
  const { conversations } = useConversations();
  const { messages, sendMessage } = useMessages(conversationId);
  const [settings] = useSetting('conversationSettings', {});

  return {
    conversation: conversations.find(c => c.id === conversationId),
    messages,
    sendMessage: (text: string) => sendMessage(text, settings),
    // ...其他复合方法
  };
}
```

### 测试自定义 Hook
```typescript
// 使用 React Hooks Testing Library
import { renderHook, act } from '@testing-library/react-hooks';

test('useConversations should load conversations', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useConversations());

  expect(result.current.loading).toBe(true);
  await waitForNextUpdate();
  expect(result.current.loading).toBe(false);
  expect(result.current.items).toHaveLength(0);
});
```

## 相关文件清单

### 核心 Hooks
- `use-conversations.ts` - 对话管理
- `use-messages.ts` - 消息管理
- `use-setting.ts` - 设置管理
- `use-theme-color.ts` - 主题颜色
- `use-color-scheme.ts` - 颜色方案
- `use-color-scheme.web.ts` - Web 平台适配

### 类型定义
- 依赖 `storage/core.ts` 中的类型定义
- 各 Hook 内部的接口和类型定义
- 与 UI 组件共享的 Props 类型

### 测试文件 (建议)
- `__tests__/use-conversations.test.ts`
- `__tests__/use-messages.test.ts`
- `__tests__/use-setting.test.ts`

## 变更记录 (Changelog)

### 2025-11-05 13:45:09
- 初始化 React Hooks 模块文档
- 详细记录所有 Hook 的功能和接口
- 建立架构设计和最佳实践
- 添加测试策略和性能优化指南
- 提供扩展开发和测试示例