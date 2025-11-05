[根目录](../../CLAUDE.md) > **constants**

# 常量配置模块

## 模块职责

常量配置模块 (`constants/`) 定义应用的全局常量、主题配置、默认值等，提供统一的配置管理和主题系统支持。

## 核心功能

- 🎨 **主题配置**: React Native Paper 主题定义和颜色方案
- 🌈 **多彩主题**: React Native Elements 主题扩展和自定义样式
- 📱 **响应式设计**: 屏幕尺寸、字体大小等响应式常量
- 🔧 **应用配置**: 功能开关、默认值、URL 等应用级配置
- 🎯 **设计系统**: 统一的设计规范和样式常量

## 入口与启动

### 主要配置文件
- `theme.ts` - React Native Paper 主题配置
- `rne-theme.ts` - React Native Elements 主题配置和 Hook

### 使用示例
```typescript
// 使用 React Native Paper 主题
import { useTheme } from 'react-native-paper';
import { LIGHT_THEME, DARK_THEME } from '@/constants/theme';

const theme = useTheme();
const backgroundColor = theme.colors.background;

// 使用 React Native Elements 主题
import { useRNETheme } from '@/constants/rne-theme';

const rneTheme = useRNETheme();
const primaryColor = rneTheme.colors.primary;

// 主题切换
import { useThemeColor } from '@/hooks/use-theme-color';

const primaryColor = useThemeColor('primary');
```

## 对外接口

### theme.ts (React Native Paper)
```typescript
export const LIGHT_THEME = {
  dark: false,
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    background: '#ffffff',
    surface: '#ffffff',
    // ...更多颜色定义
  },
  // ...其他主题配置
};

export const DARK_THEME = {
  dark: true,
  colors: {
    primary: '#90caf9',
    secondary: '#f48fb1',
    background: '#121212',
    surface: '#1e1e1e',
    // ...更多颜色定义
  },
  // ...其他主题配置
};
```

### rne-theme.ts (React Native Elements)
```typescript
export function useRNETheme(): Theme {
  // 根据当前 Paper 主题生成 RNE 兼容主题
  // 保持两个主题系统的一致性
}

export interface ThemePreview {
  header: string;
  track: string;
  body: string;
  accents: string[];
  icon?: string;
}
```

## 主题系统架构

### 双主题系统
应用使用两套主题系统以确保组件库的完全兼容：

1. **React Native Paper 主题** (`theme.ts`)
   - 主要 UI 组件库的主题
   - 提供完整的 Material Design 3 支持
   - 包含颜色、字体、形状等完整规范

2. **React Native Elements 主题** (`rne-theme.ts`)
   - 补充 UI 组件的主题
   - 通过 `useRNETheme` Hook 动态生成
   - 与 Paper 主题保持同步

### 主题同步机制
```typescript
// rne-theme.ts 中的同步逻辑
export function useRNETheme(): RNETheme {
  const paperTheme = useTheme();

  return {
    colors: {
      primary: paperTheme.colors.primary,
      secondary: paperTheme.colors.secondary,
      background: paperTheme.colors.background,
      // 将 Paper 主题映射到 RNE 主题
    },
    components: {
      Button: {
        // 组件级别的主题定制
      },
      // ...其他组件配置
    }
  };
}
```

## 颜色系统

### 主色调
- **Primary**: 应用主要品牌色
- **Secondary**: 次要强调色
- **Background**: 背景色
- **Surface**: 卡片、对话框等表面色

### 语义色
- **Error**: 错误状态色
- **Warning**: 警告状态色
- **Success**: 成功状态色
- **Info**: 信息提示色

### 中性色
- **OnPrimary**: 主色调上的文字色
- **OnSecondary**: 次要色上的文字色
- **OnBackground**: 背景上的文字色
- **OnSurface**: 表面上的文字色

### 灰度色系
```typescript
// RNE 主题中的灰度色定义
grey0: paperTheme.dark ? '#1a1a1a' : '#ffffff',
grey1: paperTheme.dark ? '#2a2a2a' : '#f8f9fa',
grey2: paperTheme.dark ? '#3a3a3a' : '#e9ecef',
// ...更多灰度级别
```

## 组件主题定制

### React Native Elements 组件配置
```typescript
components: {
  Button: {
    titleStyle: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonStyle: {
      borderRadius: 12,
      paddingVertical: 12,
    },
    raised: true,
  },
  Card: {
    containerStyle: {
      borderRadius: 16,
      // 阴影效果根据明暗模式调整
    },
  },
  Input: {
    containerStyle: {
      borderRadius: 12,
      backgroundColor: paperTheme.colors.surfaceVariant,
    },
    // ...更多输入框样式
  },
  // ...更多组件配置
}
```

### 自定义主题属性
- **Border Radius**: 统一的圆角规范 (12px, 16px, 20px)
- **Spacing**: 标准间距系统
- **Typography**: 字体大小和权重规范
- **Shadows**: 根据主题调整的阴影效果

## 响应式设计

### 断点系统
```typescript
// 建议的响应式断点
export const BREAKPOINTS = {
  small: 320,   // 小屏幕手机
  medium: 768,  // 平板
  large: 1024,  // 大屏设备
  xlarge: 1440, // 超大屏
} as const;
```

### 字体缩放
```typescript
// 根据屏幕尺寸调整字体大小
export const FONT_SCALES = {
  small: 0.9,
  medium: 1.0,
  large: 1.1,
} as const;
```

## 应用配置

### 功能开关
```typescript
export const FEATURES = {
  webSearch: true,        // 网络搜索功能
  attachments: true,      // 附件支持
  voiceInput: false,      // 语音输入 (开发中)
  themes: true,           // 主题切换
  export: true,           // 数据导出
} as const;
```

### 默认设置
```typescript
export const DEFAULT_SETTINGS = {
  theme: 'system',        // 默认主题
  fontSize: 'medium',     // 默认字体大小
  autoSave: true,         // 自动保存
  maxTokens: 2048,        // 最大 token 数
  temperature: 0.7,       // AI 温度参数
} as const;
```

### API 配置
```typescript
export const API_CONFIG = {
  timeout: 30000,         // 请求超时时间
  retryAttempts: 3,       // 重试次数
  cacheExpiry: 300000,    // 缓存过期时间 (5分钟)
} as const;
```

## 使用最佳实践

### 主题消费
```typescript
// ✅ 推荐：使用 Hook 获取主题颜色
const primaryColor = useThemeColor('primary');

// ❌ 避免：硬编码颜色值
const primaryColor = '#1976d2';

// ✅ 推荐：使用主题对象
const { colors } = useTheme();
const bgColor = colors.background;
```

### 组件开发
```typescript
// 在组件中使用主题
function CustomButton({ title, onPress }: Props) {
  const theme = useTheme();
  const rneTheme = useRNETheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme.colors.primary }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: theme.colors.onPrimary }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
```

### 主题扩展
```typescript
// 扩展现有主题
export const CUSTOM_THEME = {
  ...LIGHT_THEME,
  colors: {
    ...LIGHT_THEME.colors,
    brand: '#ff6b35',  // 自定义品牌色
  },
  customProperties: {
    borderRadiusLarge: 24,
    spacingXL: 32,
  },
};
```

## 测试与质量

### 主题测试
- **视觉回归测试**: 确保主题变更不影响界面布局
- **对比度测试**: 验证文字与背景的对比度符合标准
- **响应式测试**: 测试不同屏幕尺寸下的主题表现

### 配置验证
- **类型检查**: TypeScript 确保配置的类型安全
- **值验证**: 运行时验证配置值的合法性
- **默认值回退**: 确保缺失配置时有合理的默认值

## 常见问题 (FAQ)

### Q: 如何添加新的主题颜色？
A: 在 `theme.ts` 中的颜色配置中添加新颜色，并在 `rne-theme.ts` 中同步映射。

### Q: 自定义组件如何使用主题？
A: 使用 `useTheme()` 和 `useRNETheme()` Hooks，或通过 `useThemeColor()` 获取特定颜色。

### Q: 主题切换时界面闪烁？
A: 确保主题变更在渲染前完成，使用 `ThemeProvider` 包装根组件。

### Q: 如何处理深色模式的图片资源？
A: 根据主题状态动态选择不同的图片资源，或使用支持主题的图标库。

## 扩展指南

### 添加新主题
1. 在 `theme.ts` 中定义新主题对象
2. 在 `rne-theme.ts` 中添加对应的主题映射
3. 更新主题选择器组件
4. 添加主题预览配置

### 自定义组件主题
```typescript
// 为自定义组件添加主题支持
const CustomComponent = ({ style, ...props }) => {
  const theme = useTheme();

  return (
    <View style={[{ backgroundColor: theme.colors.surface }, style]}>
      {/* 组件内容 */}
    </View>
  );
};
```

### 动态主题生成
```typescript
// 根据用户偏好动态生成主题
function generateDynamicTheme(baseColor: string) {
  return {
    ...LIGHT_THEME,
    colors: {
      ...LIGHT_THEME.colors,
      primary: baseColor,
      // 根据主色调生成其他颜色
    },
  };
}
```

## 相关文件清单

### 主题配置
- `theme.ts` - React Native Paper 主题
- `rne-theme.ts` - React Native Elements 主题

### 使用位置
- `components/providers/ThemeProvider.tsx` - 主题提供者
- `hooks/use-theme-color.ts` - 主题颜色 Hook
- `hooks/use-color-scheme.ts` - 颜色方案 Hook
- 各个 UI 组件中的主题使用

### 资源文件
- 主题相关的图片资源
- 图标文件（支持主题色）
- 字体文件（如果需要自定义字体）

## 变更记录 (Changelog)

### 2025-11-05 13:45:09
- 初始化常量配置模块文档
- 详细记录双主题系统架构和设计
- 添加颜色系统和组件主题配置
- 建立使用最佳实践和扩展指南
- 提供主题测试和质量保证标准