# AetherLink_z

<div align="center">

![AetherLink_z Banner](assets/images/icon.png)

**智能、优雅、跨平台的 AI 聊天助手**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 简介

**AetherLink_z** 是一个基于 React Native (Expo) 构建的现代化跨平台 AI 聊天助手应用。它支持多个主流 AI 提供商，提供流畅的聊天体验、强大的本地数据存储和丰富的定制化功能。

### ✨ 核心特性

- 🤖 **多 AI 提供商支持**
  - OpenAI (GPT-4, GPT-3.5, o1/o3 推理模型)
  - Anthropic Claude (Claude 3.5, 3.7+)
  - Google Gemini (Gemini Pro, Thinking 模式)
  - DeepSeek (R1 推理模型)
  - 火山方舟、智谱 AI 等国内厂商
  - 支持自定义 OpenAI 兼容 API

- 💡 **思考链(Chain of Thought)显示**
  - 支持推理模型的思考过程可视化
  - 实时流式输出思考内容
  - 可折叠/展开的交互式 UI
  - 显示思考耗时统计
  - 数据库持久化存储思考链数据

- 💾 **本地数据存储**
  - 基于 SQLite 的完整数据持久化
  - 对话历史、消息、附件完整保存
  - 支持数据导出和备份
  - 数据清理和统计功能

- 🎨 **精美主题系统**
  - 明暗模式自动适配
  - 多种预设主题色彩
  - 完全自定义的样式选项
  - 实时主题预览
  - Material Design 3 设计语言

- 🔍 **网络搜索集成**
  - 支持 Bing、Google、Tavily 搜索引擎
  - AI 回答结合实时网络信息
  - 智能搜索结果整合
  - 隐藏 WebView 反爬虫机制

- 🛠️ **MCP 工具支持**
  - Model Context Protocol (MCP) 集成
  - 自定义工具开发和调用
  - 工具调用结果可视化
  - 扩展 AI 能力边界

- 🎤 **语音输入功能**
  - 设备端语音识别（原生支持）
  - Whisper API 云端识别
  - 实时语音转文字
  - 支持多语言识别

- 🖼️ **AI 图片生成**
  - DALL-E 集成
  - 文字转图片生成
  - 图片历史记录
  - 便捷保存和分享

- ⚡ **快捷短语功能**
  - 双击屏幕快速插入常用短语
  - 自定义短语管理
  - 快速访问提示词模板
  - 提升输入效率

- 📱 **跨平台兼容**
  - iOS、Android 原生体验
  - Web 端完整支持
  - 响应式设计
  - 平台特定优化

- 🔧 **丰富配置选项**
  - 温度、最大令牌数调节
  - 自定义系统提示词
  - 对话上下文管理
  - 模型参数微调
  - 助手预设管理

- 💬 **现代化 UI/UX**
  - 流畅的动画效果（Reanimated 4）
  - 统一美化的弹窗系统
  - 话题分组和管理
  - 附件支持（图片、文件）
  - 消息流式渲染
  - 统一的日志管理系统

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Expo CLI (可选，内置于项目)

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 启动开发服务器

```bash
# 启动 Expo 开发服务器
npm start

# 或
npx expo start
```

在输出中，你可以选择以下方式打开应用：

- 按 `a` - 在 Android 模拟器中打开
- 按 `i` - 在 iOS 模拟器中打开
- 按 `w` - 在 Web 浏览器中打开
- 扫描二维码 - 在物理设备上使用 Expo Go 打开

### 平台特定启动

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

---

## 🏗️ 项目架构

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.81.5 | 跨平台移动应用框架 |
| Expo | 54 | React Native 开发工具链 |
| TypeScript | 5.9.2 | 类型安全的开发语言 |
| Expo Router | 6.0 | 文件路由系统 |
| React Native Paper | 5.14.5 | Material Design UI 组件库 |
| Vercel AI SDK | 5.0.86 | AI 提供商统一接口 |
| Expo SQLite | 16.0 | 本地数据库存储 |
| React Native Reanimated | 4.1.1 | 高性能动画库 |
| MCP SDK | 1.21.1 | Model Context Protocol 集成 |
| @react-native-voice/voice | 3.2.4 | 原生语音识别 |

### 目录结构

```
AetherLink_z/
├── app/                      # 应用页面和路由 (Expo Router)
│   ├── index.tsx            # 聊天主页
│   ├── _layout.tsx          # 根布局
│   ├── settings/            # 设置页面组
│   └── topics/              # 话题管理页面
├── components/              # React 组件
│   ├── chat/               # 聊天相关组件
│   │   ├── ChatInput.tsx   # 聊天输入框（支持语音、附件）
│   │   ├── MessageList.tsx # 消息列表（虚拟化滚动）
│   │   ├── MessageBubble.tsx # 消息气泡
│   │   └── ThinkingBlock.tsx # 思考链组件
│   ├── common/             # 通用组件
│   │   ├── ConfirmDialog.tsx # 确认对话框
│   │   └── InputDialog.tsx   # 输入对话框
│   ├── settings/           # 设置组件
│   │   ├── ModelDiscoveryDialog.tsx # 模型发现对话框
│   │   └── ThemeStyleCard.tsx # 主题样式预览卡片
│   └── providers/          # Context 提供者
│       ├── ThemeProvider.tsx # 主题提供者
│       ├── DataProvider.tsx  # 数据提供者
│       └── SettingsProvider.tsx # 设置提供者
├── services/               # 业务服务层
│   ├── ai/                 # AI 服务
│   │   ├── AiClient.ts     # AI 客户端（流式响应）
│   │   ├── ModelDiscovery.ts # 模型发现
│   │   └── providers/      # AI 提供商实现
│   ├── data/               # 数据服务
│   │   ├── DataBackup.ts   # 数据备份
│   │   ├── DataCleanup.ts  # 数据清理
│   │   └── DataStats.ts    # 数据统计
│   ├── search/             # 搜索服务
│   │   ├── SearchClient.ts # 搜索客户端
│   │   └── engines/        # 搜索引擎实现
│   ├── mcp/                # MCP 工具服务
│   │   ├── McpClient.ts    # MCP 客户端
│   │   └── ToolConverter.ts # 工具转换器
│   ├── voice/              # 语音识别服务
│   │   ├── VoiceRecognition.ts # 语音识别主服务
│   │   ├── NativeRecognition.ts # 原生识别
│   │   └── WhisperRecognition.ts # Whisper API
│   ├── webview/            # WebView 服务
│   │   └── HiddenWebViewClient.ts # 隐藏 WebView（反爬虫）
│   └── messageStreaming/   # 消息流管理
│       └── BlockManager.ts # 消息块管理器
├── storage/                # 数据持久化层
│   ├── repositories/       # 数据仓库
│   │   ├── chat.ts         # 对话仓库
│   │   ├── messages.ts     # 消息仓库
│   │   ├── mcp.ts          # MCP 工具仓库
│   │   └── thinking-chains.ts # 思考链仓库
│   ├── sqlite/             # SQLite 数据库
│   │   ├── db.ts           # 数据库连接
│   │   └── migrations/     # 数据库迁移
│   ├── adapters/           # 存储适配器
│   └── core.ts             # 核心类型定义
├── hooks/                  # 自定义 React Hooks
│   ├── use-conversations.ts # 对话管理 Hook
│   ├── use-messages.ts     # 消息管理 Hook
│   ├── use-setting.ts      # 设置管理 Hook
│   ├── use-confirm-dialog.tsx # 确认对话框 Hook
│   ├── use-image-generation.ts # 图片生成 Hook
│   ├── use-voice-recognition.ts # 语音识别 Hook
│   └── use-quick-phrases.ts # 快捷短语 Hook
├── constants/              # 常量和配置
│   ├── theme.ts            # 主题配置
│   ├── prompts.ts          # 提示词模板
│   └── assistants.ts       # 助手预设
├── utils/                  # 工具函数
│   ├── logger.ts           # 日志系统
│   ├── render-cache.ts     # 渲染缓存
│   ├── events.ts           # 事件总线
│   ├── model-logo.ts       # 模型 Logo 获取
│   └── http.ts             # HTTP 工具
├── assets/                 # 静态资源
├── docs/                   # 项目文档
│   ├── CLAUDE.md           # 架构文档（总览）
│   ├── LOGGER_USAGE.md     # 日志系统使用指南
│   ├── DIALOG_USAGE.md     # 弹窗系统使用指南
│   └── THINKING_CHAIN.md   # 思考链功能文档
└── scripts/                # 自动化脚本
```

### 核心模块

| 模块 | 职责 | 代码行数 |
|------|------|---------|
| `services/ai/` | AI 提供商集成、流式响应处理、模型发现 | ~5,671 行 |
| `storage/repositories/` | 数据访问层，封装 SQLite 操作 | ~2,178 行 |
| `components/chat/` | 聊天界面组件、消息列表、思考链显示 | ~9,260 行 |
| `hooks/` | 业务逻辑封装（状态管理、数据获取） | ~2,455 行 |
| `services/search/` | 网络搜索引擎集成（Bing、Google、Tavily） | 包含在 services 中 |
| `services/mcp/` | Model Context Protocol 工具集成 | 包含在 services 中 |
| `services/voice/` | 语音识别服务（设备端 + Whisper API） | 包含在 services 中 |
| `utils/` | 日志系统、渲染缓存、事件总线等工具函数 | ~1,748 行 |

**总代码规模**: 约 **25,596 行** TypeScript/TSX 代码（不含注释和空行）

---

## 📚 使用指南

### 配置 AI 提供商

1. 打开应用设置页面
2. 选择"AI 提供商设置"
3. 选择你想使用的提供商 (OpenAI、Anthropic 等)
4. 输入对应的 API 密钥
5. 选择模型并配置参数（温度、最大令牌数等）
6. 可使用"模型发现"功能自动获取可用模型列表

### 创建对话

1. 点击"新建对话"按钮
2. 输入对话标题（可选）
3. 选择助手预设（可选）
4. 开始发送消息

### 使用思考链功能

1. 选择支持推理的模型（如 OpenAI o1/o3、DeepSeek R1、Claude 3.7+）
2. 发送消息后，AI 的思考过程会实时流式显示
3. 点击思考块可折叠/展开完整思考内容
4. 查看思考耗时统计和字数统计
5. 思考链数据自动保存到数据库

### 使用语音输入

1. 在聊天输入框中点击麦克风图标
2. 允许应用访问麦克风权限
3. 开始说话，实时转换为文字
4. 支持设备端识别（快速）和 Whisper API（高精度）
5. 在设置中可切换识别引擎

### 使用 AI 图片生成

1. 在聊天输入框点击图片生成图标
2. 输入图片描述（提示词）
3. 选择图片尺寸和数量
4. 等待生成完成
5. 长按图片可保存到相册

### 使用快捷短语

1. 在聊天界面双击屏幕
2. 在弹出的快捷短语列表中选择
3. 短语内容自动插入到输入框
4. 在设置中可管理和编辑快捷短语

### 使用网络搜索

1. 在设置中启用网络搜索功能
2. 选择搜索引擎（Bing、Google、Tavily）
3. 发送消息时，AI 会自动调用搜索获取实时信息
4. 搜索结果会整合到 AI 回复中

### 使用 MCP 工具

1. 在设置中配置 MCP 工具服务器
2. 查看可用工具列表
3. AI 会根据对话内容自动调用合适的工具
4. 工具调用过程和结果会显示在消息中

### 自定义主题

1. 进入设置 > 主题设置
2. 选择明暗模式（或跟随系统）
3. 选择主题色彩（多种预设可选）
4. 实时预览效果
5. 自定义主题样式（圆角、字体等）

### 数据备份与恢复

1. 进入设置 > 数据管理
2. 点击"导出数据"
3. 选择保存位置（支持导出 SQLite 文件或 JSON）
4. 备份完成后可随时导入恢复
5. 支持数据清理和统计查看

---

## 🔧 开发指南

### 代码规范

- **TypeScript**: 使用严格模式，避免 `any` 类型
- **ESLint**: 遵循项目 ESLint 规则
- **命名规范**:
  - 组件使用 PascalCase (如 `ChatInput.tsx`)
  - 函数和变量使用 camelCase (如 `sendMessage`)
  - 常量使用 UPPER_CASE (如 `MAX_TOKENS`)
  - Hooks 使用 `use` 前缀 (如 `useMessages`)
- **注释**: 使用 JSDoc 格式注释函数和组件

### 日志系统

**重要**: 禁止直接使用 `console.*`，统一使用 `logger` 工具

```typescript
import { logger } from '@/utils/logger';

// 调试信息
logger.debug('用户输入', { text: userInput });

// 常规信息
logger.info('消息发送成功', { messageId });

// 警告信息
logger.warn('API 限流警告', { retryAfter: 60 });

// 错误信息
logger.error('网络请求失败', error);
```

**优势**:
- 统一的日志格式和输出
- 生产环境自动移除 debug/info/warn 日志
- 支持命名空间和日志处理器
- 预留第三方日志服务集成接口

详见: [日志系统使用指南](docs/LOGGER_USAGE.md)

### 弹窗系统

使用统一的弹窗组件提供一致的用户体验:

```typescript
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirm, prompt } = useConfirmDialog();

// 确认对话框
const result = await confirm({
  title: '删除确认',
  message: '确定要删除这条消息吗？',
  confirmText: '删除',
  confirmColor: 'error',
});

// 输入对话框
const text = await prompt({
  title: '重命名',
  message: '请输入新的对话名称',
  placeholder: '对话名称',
  defaultValue: currentName,
});
```

详见: [弹窗系统使用指南](docs/DIALOG_USAGE.md)

### 添加新 AI 提供商

1. 在 `services/ai/providers/` 创建新提供商文件
2. 实现 Vercel AI SDK 的提供商接口
3. 在 `AiClient.ts` 注册提供商
4. 更新 UI 选择列表
5. 添加模型 Logo 映射（可选）

### 数据库操作

- 当前处于开发阶段，所有表结构集中在 `storage/sqlite/migrations/0001_init.ts`
- 修改 schema 时直接更新该文件，并清理本地 SQLite 数据以生效
- 准备发布时可再拆分增量迁移脚本
- 使用 Repository 模式进行数据访问
- 所有数据库操作需要 try-catch 错误处理

### 添加新功能模块

1. 创建对应的服务文件（`services/`）
2. 创建数据仓库（`storage/repositories/`）
3. 创建自定义 Hook（`hooks/`）
4. 创建 UI 组件（`components/`）
5. 更新路由和页面（`app/`）
6. 添加模块文档（`CLAUDE.md`）

### 运行代码检查

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit

# 运行测试（待添加）
npm test
```

---

## 🧰 CI/CD（自动构建与发布）

项目已内置 GitHub Actions 工作流用于构建 Android APK，并在构建完成后自动创建 GitHub Release 并附带 APK 文件。

- 工作流文件：`.github/workflows/build-android-apk-local.yml`
- 触发方式：在 GitHub 的 Actions 页面手动触发（`workflow_dispatch`），可选输入：
  - `versionName`（示例：`1.2.3`）
  - `versionCode`（整数）
- 自动发布策略：
  - 若提供 `versionName`，发布将使用标签 `v<versionName>`，发布名为 `AetherLink_z v<versionName> (code <versionCode>)`（若提供 code）。
  - 若未提供 `versionName`，将使用 `apk-<短提交SHA>` 作为标签，发布名为 `AetherLink_z APK <短提交SHA>`。

### 必要仓库密钥（Secrets）

为完成签名并成功构建发布版 APK，需要在仓库设置中配置以下 Secrets：

- `ANDROID_KEYSTORE_BASE64`：签名 keystore 的 Base64 字符串
- `ANDROID_KEYSTORE_PASSWORD`：keystore 密码
- `ANDROID_KEY_ALIAS`：密钥别名
- `ANDROID_KEY_PASSWORD`：密钥密码

完成上述配置后，触发工作流即可在构建完成时自动创建 GitHub Release，并附加 `app-release.apk`。

---

## 📊 性能优化

- 使用 `React.memo` 减少不必要的组件重渲染
- 使用 `useMemo` 和 `useCallback` 优化性能
- 实现消息列表虚拟化 (大量消息场景)
- SQLite 查询使用索引优化
- AI 响应流式渲染，提升用户体验

---

## 🧪 测试

当前项目暂无自动化测试。建议添加：

- **单元测试**: 核心业务逻辑 (hooks, repositories, services)
- **组件测试**: React Native 组件
- **集成测试**: 数据库操作、AI 服务调用
- **E2E 测试**: 关键用户流程

---

## 🗺️ 路线图

### 已完成 ✅

- [x] 添加语音输入支持（设备端 + Whisper API）
- [x] 实现图片生成功能（DALL-E 集成）
- [x] 添加插件系统（MCP 工具支持）
- [x] 支持多个主流 AI 提供商
- [x] 思考链功能（推理模型可视化）
- [x] 网络搜索集成（Bing、Google、Tavily）
- [x] 统一日志管理系统
- [x] 统一弹窗系统
- [x] 快捷短语功能
- [x] 数据备份和导出

### 进行中 🚧

- [ ] 完善自动化测试（单元测试、集成测试）
- [ ] 性能优化（消息列表虚拟化、渲染优化）
- [ ] 完善文档（API 文档、用户手册）

### 计划中 📋

- [ ] 支持多模态输入（图片理解、文件分析）
- [ ] 实现云端同步（跨设备数据同步）
- [ ] 支持更多 AI 提供商（Cohere、Together AI 等）
- [ ] 插件市场（MCP 工具共享平台）
- [ ] 对话分享功能（导出为 Markdown、PDF）
- [ ] 性能监控和分析（崩溃报告、使用统计）
- [ ] 多语言支持（i18n 国际化）
- [ ] 桌面端支持（Electron 或 Tauri）
- [ ] 语音合成（TTS 文字转语音）
- [ ] 智能建议（上下文感知的提示词建议）

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📖 相关文档

- [项目架构文档](CLAUDE.md) - 完整的项目架构和模块说明
- [日志系统使用指南](docs/LOGGER_USAGE.md) - 统一日志管理系统
- [弹窗系统使用指南](docs/DIALOG_USAGE.md) - 确认对话框和输入对话框
- [思考链功能文档](docs/THINKING_CHAIN.md) - 推理模型思考过程可视化
- [模块文档索引](./.claude/index.json) - 所有模块的详细文档

## 📞 联系方式


- 提交 Issue: 报告 Bug 或提出功能建议
- 发送 Pull Request: 贡献代码或修复问题
- 参与讨论: GitHub Discussions

---

## 🙏 致谢

感谢以下开源项目和技术栈为本项目提供支持：

- [Expo](https://expo.dev/) - 强大的 React Native 开发工具链
- [Vercel AI SDK](https://sdk.vercel.ai/) - 统一的 AI 提供商接口
- [React Native Paper](https://reactnativepaper.com/) - Material Design 3 组件库
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) - 高性能动画引擎
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) - 本地数据库解决方案
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI 工具协议标准
- [@react-native-voice/voice](https://github.com/react-native-voice/voice) - 原生语音识别
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript 超集
- 所有开源贡献者和社区成员 ❤️


---

<div align="center">

**用 ❤️ 构建**

</div>
