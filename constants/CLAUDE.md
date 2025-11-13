[根目录](../../CLAUDE.md) > **constants**

# 常量配置模块

## 模块职责

常量配置模块 (`constants/`) 定义应用的全局常量、主题配置、默认值等，提供统一的配置管理和主题系统支持。

## 核心功能

- 🎨 **主题配置**: React Native Paper 主题定义和颜色方案
- 📱 **响应式设计**: 屏幕尺寸、字体大小等响应式常量
- 🔧 **应用配置**: 功能开关、默认值、URL 等应用级配置
- 🎯 **设计系统**: 统一的设计规范和样式常量
- 🤖 **AI 预设**: 助手预设和提示词模板

## 入口与启动

### 主要配置文件
- `theme.ts` - React Native Paper 主题配置
- `prompts.ts` - AI 提示词模板
- `assistants.ts` - AI 助手预设配置

### 使用示例
```typescript
// 使用 React Native Paper 主题
import { useTheme } from 'react-native-paper';
import { paperLightTheme, paperDarkTheme } from '@/constants/theme';

const theme = useTheme();
const backgroundColor = theme.colors.background;

// 主题切换
import { useThemeColor } from '@/hooks/use-theme-color';

const primaryColor = useThemeColor('primary');

// 使用提示词模板
import { SYSTEM_PROMPTS } from '@/constants/prompts';

const systemPrompt = SYSTEM_PROMPTS.default;

// 使用助手预设
import { AI_ASSISTANTS } from '@/constants/assistants';

const assistant = AI_ASSISTANTS.find(a => a.id === 'general');
```

## 对外接口

### theme.ts (React Native Paper)
```typescript
// Material Design 3 主题配置
export const AppColors = {
  primary: '#9333EA',        // 主色（紫色）
  secondary: '#754AB4',      // 次要色
  tertiary: '#8B5CF6',       // 第三色
  gradient: ['#9333EA', '#754AB4'], // 渐变色
  surface: '#F5F5F5',        // 表面色
  error: '#EF4444',          // 错误色
  success: '#10B981',        // 成功色
  warning: '#F59E0B',        // 警告色
  info: '#3B82F6',          // 信息色
};

// 📱 浅色主题
export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    // ...更多颜色定义
  },
  roundness: 12, // 圆角大小
};

// 🌙 深色主题
export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    // ...更多颜色定义
  },
  roundness: 12,
};

// 字体配置
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  // ...其他平台配置
});
```

### prompts.ts (AI 提示词)
```typescript
// 系统提示词模板
export const SYSTEM_PROMPTS = {
  default: '你是一个有帮助的AI助手...',
  coding: '你是一个专业的编程助手...',
  creative: '你是一个富有创意的写作助手...',
  // ...更多提示词
};

// 提示词模板函数
export function buildSystemPrompt(role: string, context?: string): string {
  // 构建完整的系统提示词
}
```

### assistants.ts (助手预设)
```typescript
export interface Assistant {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
}

export const AI_ASSISTANTS: Assistant[] = [
  {
    id: 'general',
    name: '通用助手',
    description: '帮助你解决各种问题',
    systemPrompt: SYSTEM_PROMPTS.default,
  },
  // ...更多助手预设
];
```

## 主题系统架构

### Material Design 3 主题
应用使用 React Native Paper 提供的 Material Design 3 主题系统：

- **完整的 MD3 支持**: 包含颜色、字体、形状等完整规范
- **自适应主题**: 自动适配明暗模式
- **动态颜色**: 支持主题色自定义
- **跨平台一致性**: iOS、Android、Web 统一体验

### 主题配置
```typescript
// 主题提供者自动根据系统主题切换
import { AppThemeProvider } from '@/components/providers/ThemeProvider';

<AppThemeProvider>
  {/* 应用内容 */}
</AppThemeProvider>
```

## 颜色系统

### 主色调
- **Primary**: 应用主要品牌色 (#9333EA - 紫色)
- **Secondary**: 次要强调色 (#754AB4)
- **Tertiary**: 第三色 (#8B5CF6)
- **Background**: 背景色
- **Surface**: 卡片、对话框等表面色

### 语义色
- **Error**: 错误状态色 (#EF4444)
- **Success**: 成功状态色 (#10B981)
- **Warning**: 警告状态色 (#F59E0B)
- **Info**: 信息提示色 (#3B82F6)

### 中性色
- **OnPrimary**: 主色调上的文字色
- **OnSecondary**: 次要色上的文字色
- **OnBackground**: 背景上的文字色
- **OnSurface**: 表面上的文字色

## 组件主题定制

### React Native Paper 组件样式
```typescript
// Paper 组件自动应用主题
import { Button, Card, TextInput } from 'react-native-paper';

<Button mode="contained">
  按钮会自动使用主题色
</Button>

<Card>
  <Card.Content>
    卡片会自动应用主题圆角和阴影
  </Card.Content>
</Card>
```

### 自定义主题属性
- **Border Radius**: 统一的圆角规范 (12px)
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
  voiceInput: true,       // 语音输入
  themes: true,           // 主题切换
  export: true,           // 数据导出
  mcpTools: true,         // MCP 工具支持
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
  ...paperLightTheme,
  colors: {
    ...paperLightTheme.colors,
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
A: 在 `theme.ts` 中的 `AppColors` 或主题配置中添加新颜色。

### Q: 自定义组件如何使用主题？
A: 使用 `useTheme()` Hook 或 `useThemeColor()` 获取特定颜色。

### Q: 主题切换时界面闪烁？
A: 确保主题变更在渲染前完成，使用 `ThemeProvider` 包装根组件。

### Q: 如何处理深色模式的图片资源？
A: 根据主题状态动态选择不同的图片资源，或使用支持主题的图标库。

### Q: 如何自定义字体？
A: 在主题配置中修改 `fonts` 属性，或使用 `configureFonts` 函数。

## 扩展指南

### 添加新主题
1. 在 `theme.ts` 中定义新主题对象
2. 基于 `paperLightTheme` 或 `paperDarkTheme` 扩展
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
    ...paperLightTheme,
    colors: {
      ...paperLightTheme.colors,
      primary: baseColor,
      // 根据主色调生成其他颜色
    },
  };
}
```

## 相关文件清单

### 主题配置
- `theme.ts` - React Native Paper 主题
- `prompts.ts` - AI 提示词模板
- `assistants.ts` - AI 助手预设

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

### 2025-11-13
- 📝 清理文档，移除 RNE 相关内容
- ✨ 统一使用 React Native Paper Material Design 3 主题
- 🎨 更新主题系统架构说明
- 📚 完善使用示例和最佳实践

### 2025-11-05 13:45:09
- 初始化常量配置模块文档
- 详细记录主题系统架构和设计
- 添加颜色系统和组件主题配置
- 建立使用最佳实践和扩展指南
- 提供主题测试和质量保证标准
