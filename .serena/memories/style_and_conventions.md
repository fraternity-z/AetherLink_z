# 代码风格与约定

- 语言与框架：TypeScript + React Native（Expo Router）、react-native-paper UI
- 组件：函数式组件，组件命名使用 PascalCase；变量/函数使用 lowerCamelCase
- 路由：`expo-router`
- 存储：`storage/` 使用 SQLite + AsyncStorage 封装的仓储模式（Repository）
- 别名：使用 `@` 作为路径别名（见 tsconfig.json）
- UI：react-native-paper 的主题/颜色由 `useTheme()` 提供，保持一致的样式与交互
- 提交：统一 UTF-8 编码，无 BOM
- Lint：使用 ESLint（`npm run lint`）

# 结构概览
- `app/`：路由与页面入口
- `components/`：UI 组件（如 ChatSidebar/ChatSettings/ChatInput 等）
- `services/`：AI 客户端与网络调用
- `storage/`：SQLite、AsyncStorage 及 Repository
- `assets/`：静态资源
- `constants/`、`hooks/`、`scripts/`：常量、自定义 Hooks、脚本