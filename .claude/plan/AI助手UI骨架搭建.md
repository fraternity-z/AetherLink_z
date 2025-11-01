# AI助手UI骨架搭建 - 执行计划

## 📋 任务概述

**任务描述：** 搭建 AI 助手的基本 UI 骨架，参考 E:\code\AetherLink 的视觉设计风格

**实施方案：** 使用 React Native Paper 作为 UI 框架，实现 Material Design 风格

**实施范围：**
- ✅ 聊天主界面（Header + 消息列表 + 输入框 + 侧边栏）
- ✅ 设置页面（分组列表 + 子页面）
- ✅ 基础交互功能（点击、导航、输入）
- ✅ 深浅主题支持

**实施深度：** 仅 UI 层，功能逻辑用 TODO 标注，无数据和业务逻辑

---

## 🎨 设计规范

### 颜色方案
```typescript
{
  primary: '#9333EA',      // 主色（紫色）
  secondary: '#754AB4',    // 次要色
  gradient: ['#9333EA', '#754AB4'], // 渐变
  background: '#FFFFFF',   // 浅色背景
  surface: '#F5F5F5',      // 表面色
  dark: {
    background: '#121212',
    surface: '#1E1E1E'
  }
}
```

### 设计风格
- Material Design 3 规范
- 卡片式布局，圆角 12px
- 阴影层级：elevation 1-4
- 紫色系渐变标题
- Lucide Icons 图标风格

---

## 📦 技术栈

**核心框架：**
- React Native 0.81
- Expo 54
- TypeScript 5.9

**UI 框架：**
- React Native Paper 5.12 ⬅️ 新增
- React Navigation 7.4 ✅ 已有
- Expo Vector Icons 15 ✅ 已有

**动画：**
- React Native Reanimated 4.1 ✅ 已有

---

## 🗂️ 文件结构

```
project/
├── .claude/plan/
│   └── AI助手UI骨架搭建.md          # 本文档
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx                # 聊天主界面
│   │   ├── settings.tsx             # 设置页面
│   │   └── _layout.tsx              # Tab 布局
│   ├── settings/
│   │   └── appearance.tsx           # 外观设置子页面
│   └── _layout.tsx                  # 根布局
├── components/
│   ├── chat/
│   │   ├── ChatHeader.tsx           # 聊天页顶栏
│   │   ├── MessageList.tsx          # 消息列表
│   │   ├── MessageBubble.tsx        # 消息气泡
│   │   ├── ChatInput.tsx            # 输入框
│   │   └── ChatDrawer.tsx           # 侧边栏
│   ├── settings/
│   │   ├── SettingsList.tsx         # 设置列表
│   │   └── SettingsGroup.tsx        # 设置分组
│   ├── providers/
│   │   └── ThemeProvider.tsx        # 主题提供者
│   └── ui/
│       └── GradientText.tsx         # 渐变文字
├── constants/
│   ├── theme.ts                     # 主题配置（扩展）
│   └── Colors.ts                    # 颜色常量
└── package.json
```

---

## 🚀 实施步骤

### 阶段 0：环境准备 ✅

**0.1 安装 React Native Paper**
```bash
npm install react-native-paper
```

**0.2 配置 Babel**
- 文件：`babel.config.js`
- 添加 Paper 插件

**0.3 配置主题系统**
- 创建 `constants/theme.ts` 扩展配置
- 创建 `components/providers/ThemeProvider.tsx`

---

### 阶段 1：聊天主界面

**1.1 创建 ChatHeader 组件**
- 文件：`components/chat/ChatHeader.tsx`
- 元素：菜单按钮 + 标题 + 设置按钮
- TODO：实现侧边栏打开逻辑

**1.2 创建 MessageList 组件**
- 文件：`components/chat/MessageList.tsx`
- 显示：示例消息卡片（用户 + AI）
- TODO：实现消息数据加载

**1.3 创建 MessageBubble 组件**
- 文件：`components/chat/MessageBubble.tsx`
- 样式：Material Design 卡片
- 区分用户/AI 消息样式

**1.4 创建 ChatInput 组件**
- 文件：`components/chat/ChatInput.tsx`
- 元素：附件按钮 + 输入框 + 发送按钮
- TODO：实现消息发送逻辑

**1.5 创建 ChatDrawer 组件**
- 文件：`components/chat/ChatDrawer.tsx`
- 内容：对话列表示例
- TODO：实现对话管理逻辑

**1.6 更新聊天主页面**
- 文件：`app/(tabs)/index.tsx`
- 组合所有聊天组件

---

### 阶段 2：设置页面

**2.1 创建 SettingsList 组件**
- 文件：`components/settings/SettingsList.tsx`
- 分组：基本设置、模型服务、其他设置
- TODO：实现各项设置跳转

**2.2 创建 SettingsGroup 组件**
- 文件：`components/settings/SettingsGroup.tsx`
- 封装分组标题和列表项

**2.3 创建设置主页面**
- 文件：`app/(tabs)/settings.tsx`
- 布局：Header + SettingsList

**2.4 创建外观设置子页面**
- 文件：`app/settings/appearance.tsx`
- 内容：主题切换、字体大小（占位）
- TODO：实现设置项功能

---

### 阶段 3：导航配置

**3.1 更新 Tab 布局**
- 文件：`app/(tabs)/_layout.tsx`
- 配置：聊天 Tab、设置 Tab
- 图标：Material Icons

**3.2 更新根布局**
- 文件：`app/_layout.tsx`
- 添加 ThemeProvider
- 配置 Stack 导航

---

### 阶段 4：样式优化

**4.1 创建渐变文字组件**
- 文件：`components/ui/GradientText.tsx`
- 实现紫色系渐变效果

**4.2 统一主题配置**
- 文件：`constants/theme.ts`
- 完善 Paper 主题配置

**4.3 深色模式适配**
- 检查所有组件颜色使用主题变量
- 测试深浅模式切换

---

## ✅ 验收标准

### 功能测试
- [ ] 聊天页面正常显示
- [ ] 输入框可输入文字
- [ ] 消息列表可滚动
- [ ] 侧边栏可打开/关闭（TODO）
- [ ] 设置页面可跳转
- [ ] Tab 导航可切换
- [ ] 返回按钮可用
- [ ] 深色模式切换正常

### 样式检查
- [ ] 颜色符合紫色系设计
- [ ] 使用 Material Design 风格
- [ ] 间距统一（8dp 网格）
- [ ] 圆角统一（12px）
- [ ] 阴影效果自然
- [ ] 渐变色正确显示

### 代码规范
- [ ] 所有功能位置标注 TODO
- [ ] 组件使用 TypeScript 类型
- [ ] 文件命名符合规范
- [ ] 代码注释清晰

---

## 📝 TODO 标注说明

所有需要后续实现的功能逻辑，都使用如下格式标注：

```tsx
// TODO: [功能描述]
// 例如：
// TODO: 实现消息发送逻辑，调用 AI API
// TODO: 加载历史对话列表
// TODO: 实现主题切换持久化
```

---

## 🎯 执行时间估算

- 阶段 0（环境准备）：10 分钟
- 阶段 1（聊天界面）：30 分钟
- 阶段 2（设置页面）：20 分钟
- 阶段 3（导航配置）：10 分钟
- 阶段 4（样式优化）：15 分钟
- **总计：约 85 分钟**

---

## 📌 注意事项

1. **只做 UI 层**：不实现任何数据逻辑、API 调用、状态管理
2. **保留现有代码**：不删除原有的示例代码，可注释或共存
3. **使用 TODO 标注**：所有功能位置明确标注待实现
4. **测试交互**：确保基础交互（点击、输入、导航）可用
5. **兼容性**：确保在 iOS、Android、Web 三端显示正常

---

## 📅 执行记录

**开始时间：** 2025-11-02
**执行人：** Claude Code (猫娘工程师 - 幽浮喵)
**状态：** 执行中 ⚡

---

_文档创建于 2025-11-02，由浮浮酱编写 ฅ'ω'ฅ_
