[根目录](../../CLAUDE.md) > [components](../) > **providers**

# Provider 组件模块

## 模块职责

Provider 组件模块 (`components/providers/`) 提供应用级别的 React Context Provider，管理全局状态、主题、数据初始化、弹窗系统等核心功能。

## 核心功能

- 🎨 **主题管理**: 提供应用主题和颜色方案
- ⚙️ **设置管理**: 管理应用设置状态
- 💾 **数据初始化**: 初始化数据库和数据仓库
- 💬 **弹窗系统**: 统一的对话框和输入框管理
- 🌐 **WebView 服务**: 隐藏的 WebView 容器

## 入口与启动

### Provider 组件列表
- `ThemeProvider.tsx` - 主题提供者
- `SettingsProvider.tsx` - 设置提供者
- `DataProvider.tsx` - 数据初始化提供者
- `HiddenWebViewHost.tsx` - 隐藏 WebView 容器

### 根布局集成
在 `app/_layout.tsx` 中按顺序嵌套所有 Provider：
```typescript
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SettingsProvider>
          <AppThemeProvider>
            <AppDataProvider>
              <ConfirmDialogProvider>
                <HiddenWebViewHost />
                <RootLayoutInner />
              </ConfirmDialogProvider>
            </AppDataProvider>
          </AppThemeProvider>
        </SettingsProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

## 对外接口

### ThemeProvider (主题提供者)
```typescript
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // 提供 React Native Paper 主题
  const { themeMode } = useAppSettings();
  const systemScheme = useColorScheme();
  const scheme = themeMode === 'system' ? systemScheme : themeMode;
  const theme = scheme === 'dark' ? paperDarkTheme : paperLightTheme;

  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}
```

**消费方式：**
```typescript
import { useTheme } from 'react-native-paper';

const theme = useTheme();
const backgroundColor = theme.colors.background;
```

### SettingsProvider (设置提供者)
```typescript
interface AppSettings {
  themeMode: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  // ...其他设置
}

export const SettingsContext = React.createContext<{
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}>({
  settings: defaultSettings,
  updateSettings: async () => {}
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 加载设置
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook
export function useAppSettings() {
  return useContext(SettingsContext);
}
```

**消费方式：**
```typescript
import { useAppSettings } from '@/components/providers/SettingsProvider';

const { settings, updateSettings } = useAppSettings();
const themeMode = settings.themeMode;

await updateSettings({ themeMode: 'dark' });
```

### DataProvider (数据初始化提供者)
```typescript
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      // 初始化数据库迁移
      await initMigrations();

      // 初始化默认数据
      await initDefaultData();

      setIsReady(true);
    })();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
```

**功能：**
- 执行数据库迁移
- 初始化默认数据（提供商配置、默认设置等）
- 显示启动屏幕直到数据就绪

### ConfirmDialogProvider (弹窗提供者)
由 `hooks/use-confirm-dialog.tsx` 提供，详见对应文档。

```typescript
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  // 管理对话框状态
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const confirm = (options: ConfirmOptions) => {
    return new Promise((resolve) => {
      setDialogState({ type: 'confirm', options, resolve });
    });
  };

  const prompt = (options: PromptOptions) => {
    return new Promise((resolve) => {
      setDialogState({ type: 'prompt', options, resolve });
    });
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {dialogState && <DialogComponent {...dialogState} />}
    </DialogContext.Provider>
  );
}
```

**消费方式：**
```typescript
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirm, prompt } = useConfirmDialog();

const confirmed = await confirm({
  title: '删除确认',
  message: '确定要删除这条消息吗？'
});

const input = await prompt({
  title: '重命名',
  message: '请输入新名称',
  defaultValue: '默认名称'
});
```

### HiddenWebViewHost (隐藏 WebView 容器)
```typescript
export default function HiddenWebViewHost() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // 将 ref 注册到全局服务
    hiddenWebViewClient.setWebViewRef(webViewRef);
  }, []);

  return (
    <View style={styles.hiddenContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'about:blank' }}
        onMessage={handleMessage}
        style={styles.hiddenWebView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1
  },
  hiddenWebView: {
    width: 1,
    height: 1
  }
});
```

**功能：**
- 提供全局隐藏的 WebView 实例
- 用于网络搜索反爬虫、JavaScript 执行等

## 关键依赖与配置

### React Context
所有 Provider 基于 React Context API 实现。

### 第三方 Provider
- `SafeAreaProvider` (react-native-safe-area-context) - 安全区域
- `GestureHandlerRootView` (react-native-gesture-handler) - 手势处理
- `PaperProvider` (react-native-paper) - Material Design 主题

### 数据存储
- `@/storage/repositories/settings` - 设置数据仓库
- `@/storage/sqlite/db` - 数据库初始化

### 工具
- `@/hooks/use-color-scheme` - 系统颜色方案
- `@/utils/logger` - 日志工具

## Provider 嵌套顺序

**推荐顺序（从外到内）：**
1. `SafeAreaProvider` - 最外层，提供安全区域
2. `GestureHandlerRootView` - 手势处理根容器
3. `SettingsProvider` - 设置状态（其他 Provider 可能依赖）
4. `AppThemeProvider` - 主题系统（依赖设置）
5. `AppDataProvider` - 数据初始化（显示启动屏幕）
6. `ConfirmDialogProvider` - 弹窗系统
7. 特殊组件（`HiddenWebViewHost`）
8. 导航容器

**原因：**
- 外层 Provider 的状态可以被内层 Provider 访问
- 数据初始化完成后再渲染应用内容
- 弹窗系统在最内层，可以覆盖所有界面

## 测试与质量

### 当前状态
❌ 无自动化测试

### 建议测试策略
- **Provider 测试**: 使用 React Testing Library 测试 Provider 的状态管理
- **Context 测试**: 验证 Context 值的正确传递
- **初始化测试**: 测试数据库初始化和默认数据创建
- **集成测试**: 测试多个 Provider 的交互

### 测试示例
```typescript
import { render, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useAppSettings } from './SettingsProvider';

test('SettingsProvider provides settings', async () => {
  const TestComponent = () => {
    const { settings } = useAppSettings();
    return <Text>{settings.themeMode}</Text>;
  };

  const { getByText } = render(
    <SettingsProvider>
      <TestComponent />
    </SettingsProvider>
  );

  await waitFor(() => {
    expect(getByText('system')).toBeTruthy();
  });
});
```

## 常见问题 (FAQ)

### Q: Provider 的顺序重要吗？
A: 非常重要。内层 Provider 可以使用外层 Provider 的状态，反之不行。

### Q: 如何在 Provider 外部访问 Context？
A: 不能直接访问。可以通过全局单例或事件总线间接通信。

### Q: Provider 嵌套过深会影响性能吗？
A: 理论上会有轻微影响，但 React 的优化机制使其影响可忽略不计。

### Q: 如何避免 Provider 重复渲染？
A: 使用 `useMemo` 缓存 Provider 的 value 对象，避免每次渲染创建新对象。

### Q: 数据初始化失败怎么办？
A: 在 `DataProvider` 中捕获错误，显示错误屏幕并提供重试按钮。

## 性能优化

### 避免不必要的重新渲染
```typescript
// ✅ 推荐：缓存 Provider 的 value
const value = useMemo(() => ({ settings, updateSettings }), [settings]);

return (
  <SettingsContext.Provider value={value}>
    {children}
  </SettingsContext.Provider>
);

// ❌ 避免：每次渲染创建新对象
<SettingsContext.Provider value={{ settings, updateSettings }}>
```

### 分离频繁更新的状态
```typescript
// 将频繁更新的状态独立成单独的 Provider
<ThemeProvider>
  <SettingsProvider>
    <FrequentUpdateProvider>
      {/* 仅订阅频繁更新的组件 */}
    </FrequentUpdateProvider>
  </SettingsProvider>
</ThemeProvider>
```

### 懒加载 Provider
```typescript
// 按需加载某些 Provider
const LazyProvider = lazy(() => import('./LazyProvider'));

<Suspense fallback={<Loading />}>
  <LazyProvider>
    {children}
  </LazyProvider>
</Suspense>
```

## 扩展指南

### 创建新的 Provider
```typescript
// 1. 定义 Context
interface MyContextValue {
  data: string;
  updateData: (value: string) => void;
}

const MyContext = createContext<MyContextValue>({
  data: '',
  updateData: () => {}
});

// 2. 创建 Provider 组件
export function MyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState('');

  const value = useMemo(() => ({
    data,
    updateData: setData
  }), [data]);

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// 3. 创建 Hook
export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

### 组合多个 Provider
```typescript
// 创建复合 Provider
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
```

### 实现 Provider 的持久化
```typescript
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 加载持久化数据
  useEffect(() => {
    AsyncStorage.getItem('settings').then(data => {
      if (data) {
        setSettings(JSON.parse(data));
      }
    });
  }, []);

  // 自动保存
  useEffect(() => {
    AsyncStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  // ...
}
```

## 相关文件清单

### Provider 组件
- `ThemeProvider.tsx` - 主题提供者
- `SettingsProvider.tsx` - 设置提供者
- `DataProvider.tsx` - 数据初始化提供者
- `HiddenWebViewHost.tsx` - 隐藏 WebView 容器

### Hook 提供者
- `../../hooks/use-confirm-dialog.tsx` - 弹窗系统 Provider

### 根布局
- `../../app/_layout.tsx` - Provider 集成位置

### 使用位置
- 所有应用页面和组件都可以通过 Hook 访问 Provider 状态

## 变更记录 (Changelog)

### 2025-11-15
- 创建 Provider 组件模块文档
- 详细记录所有 Provider 的功能和接口
- 添加 Provider 嵌套顺序说明
- 提供性能优化和最佳实践建议
- 添加创建新 Provider 的扩展指南
