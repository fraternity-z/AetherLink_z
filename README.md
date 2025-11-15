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
  - 支持自定义 OpenAI 兼容 API

- 💡 **思考链(Chain of Thought)显示**
  - 支持推理模型的思考过程可视化
  - 实时流式输出思考内容
  - 可折叠/展开的交互式 UI
  - 显示思考耗时统计

- 💾 **本地数据存储**
  - 基于 SQLite 的完整数据持久化
  - 对话历史、消息、附件完整保存
  - 支持数据导出和备份

- 🎨 **精美主题系统**
  - 明暗模式自动适配
  - 多种预设主题色彩
  - 完全自定义的样式选项
  - 实时主题预览

- 🔍 **网络搜索集成**
  - 支持 Bing、Google、Tavily 搜索引擎
  - AI 回答结合实时网络信息
  - 智能搜索结果整合

- 📱 **跨平台兼容**
  - iOS、Android 原生体验
  - Web 端完整支持
  - 响应式设计

- 🔧 **丰富配置选项**
  - 温度、最大令牌数调节
  - 自定义系统提示词
  - 对话上下文管理
  - 模型参数微调

- 💬 **现代化 UI/UX**
  - 流畅的动画效果
  - 统一美化的弹窗系统
  - 话题分组和管理
  - 附件支持(图片、文件)

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

### 目录结构

```
AetherLink_z/
├── app/                      # 应用页面和路由
│   ├── index.tsx            # 聊天主页
│   ├── _layout.tsx          # 根布局
│   ├── settings/            # 设置页面组
│   └── topics/              # 话题管理页面
├── components/              # React 组件
│   ├── chat/               # 聊天相关组件
│   │   ├── ChatInput.tsx   # 聊天输入框
│   │   ├── MessageList.tsx # 消息列表
│   │   ├── MessageBubble.tsx # 消息气泡
│   │   └── ThinkingBlock.tsx # 思考链组件
│   ├── common/             # 通用组件
│   │   ├── ConfirmDialog.tsx # 确认对话框
│   │   └── InputDialog.tsx   # 输入对话框
│   ├── settings/           # 设置组件
│   └── providers/          # Context 提供者
├── services/               # 业务服务层
│   ├── ai/                 # AI 服务
│   │   ├── AiClient.ts     # AI 客户端
│   │   └── ModelDiscovery.ts # 模型发现
│   ├── data/               # 数据服务
│   └── search/             # 搜索服务
├── storage/                # 数据持久化层
│   ├── repositories/       # 数据仓库
│   ├── sqlite/             # SQLite 数据库
│   └── adapters/           # 存储适配器
├── hooks/                  # 自定义 React Hooks
├── constants/              # 常量和配置
├── utils/                  # 工具函数
├── assets/                 # 静态资源
└── docs/                   # 项目文档
```

### 核心模块

| 模块 | 职责 |
|------|------|
| `services/ai/` | AI 提供商集成、流式响应处理 |
| `storage/repositories/` | 数据访问层，封装 SQLite 操作 |
| `components/chat/` | 聊天界面组件 |
| `hooks/` | 业务逻辑封装 (状态管理、数据获取) |
| `services/search/` | 网络搜索引擎集成 |

---

## 📚 使用指南

### 配置 AI 提供商

1. 打开应用设置页面
2. 选择"AI 提供商设置"
3. 选择你想使用的提供商 (OpenAI、Anthropic 等)
4. 输入对应的 API 密钥
5. 选择模型并配置参数

### 创建对话

1. 点击"新建对话"按钮
2. 输入对话标题 (可选)
3. 开始发送消息

### 使用思考链功能

1. 选择支持推理的模型 (如 o1、o3、DeepSeek R1)
2. 发送消息后，AI 的思考过程会实时显示
3. 点击思考块可折叠/展开
4. 查看思考耗时统计

### 自定义主题

1. 进入设置 > 主题设置
2. 选择明暗模式
3. 选择主题色彩
4. 实时预览效果

### 数据备份

1. 进入设置 > 数据管理
2. 点击"导出数据"
3. 选择保存位置
4. 备份完成

---

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用 PascalCase 命名
- 函数和变量使用 camelCase 命名
- 常量使用 UPPER_CASE 命名

### 添加新 AI 提供商

1. 在 `services/ai/providers/` 创建新提供商文件
2. 实现 AI SDK 的提供商接口
3. 在 `AiClient.ts` 注册提供商
4. 更新 UI 选择列表

### 数据库结构

- 当前处于开发阶段，所有表结构集中在 `storage/sqlite/migrations/0001_init.ts`
- 修改 schema 时直接更新该文件，并清理本地 SQLite 数据以生效
- 准备发布时可再拆分增量迁移脚本

### 运行代码检查

```bash
npm run lint
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

- [ ] 添加语音输入支持
- [ ] 实现图片生成功能 (DALL-E, Midjourney)
- [ ] 支持多模态输入 (图片理解)
- [ ] 添加插件系统
- [ ] 实现云端同步
- [ ] 支持更多 AI 提供商
- [ ] 完善自动化测试
- [ ] 性能监控和分析

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

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送 Pull Request

---

## 🙏 致谢

- [Expo](https://expo.dev/) - 强大的 React Native 开发框架
- [Vercel AI SDK](https://sdk.vercel.ai/) - 统一的 AI 接口
- [React Native Paper](https://reactnativepaper.com/) - Material Design 组件
- 所有开源贡献者

---

<div align="center">

**用 ❤️ 构建**

</div>
