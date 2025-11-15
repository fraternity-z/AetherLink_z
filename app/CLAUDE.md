[根目录](../CLAUDE.md) > **app**

# 应用路由模块

## 模块职责

应用路由模块 (`app/`) 使用 Expo Router 文件路由系统，管理应用的所有页面和导航结构，提供声明式的路由配置和自动生成的导航 API。

## 核心功能

- 🧭 **文件路由**: 基于文件系统的自动路由生成
- 📱 **页面管理**: 聊天主页、设置页面、话题列表等
- 🔀 **导航控制**: Stack 导航、嵌套路由、动态路由
- ⚙️ **路由参数**: URL 参数传递和页面间通信
- 🎨 **页面配置**: 标题、头部样式、返回按钮等

## 入口与启动

### 根布局 (`_layout.tsx`)
应用的根布局文件，包含所有全局 Provider 和导航配置。

**核心结构：**
```typescript
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <SettingsProvider>           {/* 设置状态管理 */}
          <AppThemeProvider>         {/* 主题系统 */}
            <AppDataProvider>        {/* 数据初始化 */}
              <ConfirmDialogProvider> {/* 弹窗系统 */}
                <HiddenWebViewHost /> {/* WebView 服务 */}
                <RootLayoutInner />   {/* Stack 导航 */}
              </ConfirmDialogProvider>
            </AppDataProvider>
          </AppThemeProvider>
        </SettingsProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

**导航配置：**
- `index` - 聊天主页（无头部）
- `settings/index` - 设置首页
- `settings/appearance` - 外观设置
- `settings/behavior` - 行为设置
- `topics/index` - 话题列表

### 聊天主页 (`index.tsx`)
应用的根页面，提供完整的聊天界面。

**核心组件：**
- `ChatHeader` - 顶部导航栏
- `MessageList` - 消息列表（支持双击打开快捷短语）
- `ChatInput` - 底部输入框
- `ChatSidebar` - 左侧设置侧边栏
- `TopicsSidebar` - 右侧话题侧边栏
- `ModelPickerDialog` - 模型选择弹窗

**状态管理：**
- `conversationId` - 当前对话 ID
- `drawerOpen` - 设置栏开关
- `topicsOpen` - 话题栏开关
- `modelPickerOpen` - 模型选择器开关
- `quickPhrasesEnabled` - 快捷短语功能开关

**手势支持：**
- 双击屏幕：打开快捷短语选择器
- 滑动：侧边栏交互

## 路由结构

### 设置页面组 (`settings/`)
```
settings/
├── index.tsx              # 设置首页（列表导航）
├── appearance.tsx         # 外观设置（主题、字体等）
├── behavior.tsx           # 行为设置（自动保存、快捷短语等）
├── default-model.tsx      # 默认模型设置
├── web-search.tsx         # 网络搜索配置
├── voice-settings.tsx     # 语音输入设置
├── topic-naming.tsx       # 话题命名设置
├── prompt-collections.tsx # 提示词集合管理
├── quick-phrases.tsx      # 快捷短语管理
├── mcp-server.tsx         # MCP 服务器配置
├── data-settings.tsx      # 数据管理（备份、清理等）
├── workspace.tsx          # 工作区设置
├── about.tsx              # 关于页面
├── providers/
│   └── [vendor].tsx       # 动态路由：提供商配置（OpenAI、Anthropic 等）
└── custom-providers/
    └── [id].tsx           # 动态路由：自定义提供商编辑
```

### 话题管理 (`topics/`)
```
topics/
└── index.tsx              # 话题列表页
```

## 对外接口

### 路由导航
使用 Expo Router 的导航 API：

```typescript
import { router, useLocalSearchParams } from 'expo-router';

// 导航到设置页
router.push('/settings');

// 导航到特定提供商配置
router.push('/settings/providers/openai');

// 带参数导航
router.push({ pathname: '/index', params: { cid: 'conv-123' } });

// 获取路由参数
const params = useLocalSearchParams<{ cid?: string }>();
```

### 页面配置
在 `_layout.tsx` 中使用 Stack.Screen 配置页面：

```typescript
<Stack.Screen
  name="settings/appearance"
  options={{
    title: '外观设置',
    headerShown: true
  }}
/>
```

## 关键依赖与配置

### 导航库
- `expo-router` - 文件路由系统
- `@react-navigation/native` - 底层导航引擎
- `react-native-screens` - 原生屏幕管理
- `react-native-safe-area-context` - 安全区域处理

### Provider 系统
- `SafeAreaProvider` - 安全区域上下文
- `GestureHandlerRootView` - 手势处理根容器
- `SettingsProvider` - 应用设置状态
- `AppThemeProvider` - 主题系统
- `AppDataProvider` - 数据初始化
- `ConfirmDialogProvider` - 弹窗管理
- `NavThemeProvider` - 导航主题

### 平台适配
- `KeyboardAvoidingView` - iOS 键盘适配
- `Platform.select()` - 平台特定配置
- `StatusBar` - 状态栏样式

## 页面详细分析

### 聊天主页 (`index.tsx`)
**功能特性：**
- 双击手势打开快捷短语选择器
- URL 参数支持（通过 `?cid=xxx` 打开指定对话）
- 侧边栏状态管理（设置栏 + 话题栏）
- 模型选择弹窗
- 快捷短语功能开关（通过事件总线同步）

**性能优化：**
- 使用 `useMemo` 缓存 Repository 实例
- 使用 `useCallback` 优化事件处理器
- 手势使用 `runOnJS` 确保主线程性能

**事件监听：**
```typescript
appEvents.on(AppEvents.QUICK_PHRASES_SETTING_CHANGED, handleSettingChange);
```

### 设置首页 (`settings/index.tsx`)
导航到各个设置子页面的入口页面。

### 提供商配置页 (`settings/providers/[vendor].tsx`)
**动态路由：**
- 路由参数：`vendor` (openai, anthropic, google 等)
- 配置项：API Key、Base URL、模型列表等
- 模型发现：自动获取可用模型列表

### 自定义提供商编辑页 (`settings/custom-providers/[id].tsx`)
**动态路由：**
- 路由参数：`id` (自定义提供商 ID)
- 支持创建和编辑自定义 OpenAI 兼容提供商

## 路由最佳实践

### 导航模式
```typescript
// ✅ 推荐：使用 router.push()
router.push('/settings/appearance');

// ✅ 推荐：使用类型安全的参数
router.push({ pathname: '/index', params: { cid } });

// ❌ 避免：手动拼接 URL
router.push(`/index?cid=${cid}`);
```

### 参数传递
```typescript
// ✅ 推荐：使用 useLocalSearchParams 获取参数
const params = useLocalSearchParams<{ cid?: string }>();

// ✅ 推荐：验证参数类型
if (params?.cid && typeof params.cid === 'string') {
  setConversationId(params.cid);
}
```

### 页面配置
```typescript
// ✅ 推荐：在 Stack.Screen 中配置页面
<Stack.Screen
  name="settings/appearance"
  options={{
    title: '外观设置',
    headerBackTitle: '返回'
  }}
/>

// ❌ 避免：在页面组件中设置导航选项
```

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试策略
- **路由测试**: 验证路由跳转和参数传递
- **页面渲染测试**: 测试各页面的正确渲染
- **导航流程测试**: 测试完整的用户导航路径
- **深链接测试**: 验证 URL 参数和深链接

### 质量保证
- ✅ TypeScript 类型检查
- ✅ Expo Router 路由类型生成
- ✅ 安全区域处理
- ✅ 跨平台兼容性

## 常见问题 (FAQ)

### Q: 如何添加新页面？
A: 在 `app/` 目录下创建新的 `.tsx` 文件，Expo Router 会自动生成路由。

### Q: 如何配置页面标题和头部样式？
A: 在 `_layout.tsx` 的 `Stack.Screen` 中使用 `options` 属性配置。

### Q: 动态路由如何使用？
A: 使用 `[param].tsx` 文件名创建动态路由，通过 `useLocalSearchParams()` 获取参数。

### Q: 如何在页面间传递复杂数据？
A: 推荐使用全局状态管理（Context/Provider）或数据库，避免通过 URL 参数传递。

### Q: 如何禁用页面的返回按钮？
A: 在 `Stack.Screen` 的 `options` 中设置 `headerLeft: () => null`。

## 性能优化

### 路由懒加载
Expo Router 默认支持页面懒加载，无需额外配置。

### 避免重复渲染
```typescript
// 使用 useMemo 缓存计算结果
const settingsRepo = useMemo(() => SettingsRepository(), []);

// 使用 useCallback 缓存事件处理器
const handleMenuPress = useCallback(() => {
  setDrawerOpen((v) => !v);
}, []);
```

### 手势性能
```typescript
// 使用 runOnJS 确保手势回调在 JS 线程执行
const doubleTapGesture = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd((_event, success) => {
    if (success) {
      runOnJS(openQuickPhrasePicker)();
    }
  });
```

## 扩展指南

### 添加新的设置页面
1. 在 `app/settings/` 下创建新文件（如 `new-feature.tsx`）
2. 在 `_layout.tsx` 中添加 `Stack.Screen` 配置
3. 在设置首页添加导航入口

### 创建嵌套路由
```typescript
// app/feature/_layout.tsx
export default function FeatureLayout() {
  return <Stack />;
}

// app/feature/index.tsx
export default function FeatureHome() {
  return <View>...</View>;
}

// app/feature/detail.tsx
export default function FeatureDetail() {
  return <View>...</View>;
}
```

### 实现 Tab 导航
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
```

## 相关文件清单

### 核心路由文件
- `_layout.tsx` - 根布局和导航配置
- `index.tsx` - 聊天主页

### 设置页面
- `settings/index.tsx` - 设置首页
- `settings/appearance.tsx` - 外观设置
- `settings/behavior.tsx` - 行为设置
- `settings/default-model.tsx` - 默认模型
- `settings/web-search.tsx` - 网络搜索配置
- `settings/voice-settings.tsx` - 语音设置
- `settings/topic-naming.tsx` - 话题命名
- `settings/prompt-collections.tsx` - 提示词集合
- `settings/quick-phrases.tsx` - 快捷短语
- `settings/mcp-server.tsx` - MCP 服务器
- `settings/data-settings.tsx` - 数据管理
- `settings/workspace.tsx` - 工作区
- `settings/about.tsx` - 关于页面
- `settings/providers/[vendor].tsx` - 提供商配置
- `settings/custom-providers/[id].tsx` - 自定义提供商

### 话题管理
- `topics/index.tsx` - 话题列表

## 变更记录 (Changelog)

### 2025-11-15
- 创建应用路由模块文档
- 详细记录所有页面和路由结构
- 添加导航最佳实践和性能优化建议
- 提供扩展开发指南和常见问题解答
