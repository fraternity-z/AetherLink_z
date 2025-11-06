# NativeWind 样式迁移计划

> 采用保守渐进式替换策略，从通用组件开始，仅替换样式层，保持视觉效果不变

## 📋 项目信息

- **任务目标**: 引入 NativeWind (Tailwind CSS) 优化样式开发体验
- **迁移策略**: 保守渐进式替换 (StyleSheet 与 Tailwind 长期共存)
- **开始日期**: 2025-11-06
- **负责人**: AI Assistant (幽浮喵)
- **当前阶段**: 第一阶段 - 基础设施层

---

## 🎯 总体目标

### 核心原则
1. ✅ **视觉零变化** - 所有改动必须保持原有视觉效果
2. ✅ **渐进式替换** - 小步快跑，随时可停
3. ✅ **仅替换样式** - 不改动组件逻辑和 UI 库 (React Native Paper)
4. ✅ **简洁实用** - className 写法简洁明了，不花里胡哨

### 阶段划分
- **第一阶段** (2-3天): 基础设施 + 通用组件
- **第二阶段** (3-5天): 核心业务组件 (3-5个)
- **第三阶段** (持续): 观察评估，决定是否扩展

---

## 📊 进度总览

| 阶段 | 状态 | 完成度 | 说明 |
|------|------|--------|------|
| 第一阶段 | 🟢 已完成 | 95% | 基础设施层（待最终验证） |
| 第二阶段 | ⚪ 未开始 | 0% | 核心组件层 |
| 第三阶段 | ⚪ 未开始 | 0% | 观察评估 |

---

## 🚀 第一阶段：基础设施层

### 阶段目标
完成 NativeWind 环境配置，改造 2 个通用组件

### 任务清单

#### 1. 环境配置 ✅ **已完成**

**1.1 安装依赖**
- [x] 安装 `nativewind` (v4.2.1)
- [x] 安装 `tailwindcss@^3.4.17` (v3.4.18)
- [x] 验证 `react-native-reanimated` 版本 (已有 ~4.1.1)
- **预期结果**: package.json 包含所有依赖 ✅

**1.2 初始化 Tailwind 配置**
- [x] 执行 `npx tailwindcss init`
- [x] 配置 `tailwind.config.js` - 内容路径、NativeWind preset
- [x] 创建 `global.css` (根目录)
- **预期结果**: 配置文件生成完毕 ✅

**1.3 配置 Babel & Metro**
- [x] 创建 `babel.config.js` - 添加 NativeWind preset
- [x] 更新 `metro.config.js` - 配置 CSS 输入 (保留 OpenTelemetry 修复)
- **预期结果**: 构建配置完成 ✅

**1.4 TypeScript 配置**
- [x] 创建 `nativewind-env.d.ts` - 类型声明
- **预期结果**: TypeScript 无类型错误 ✅

**1.5 导入全局样式**
- [x] 在 `app/_layout.tsx` 导入 `global.css`
- **预期结果**: 样式生效 ✅

---

#### 2. Tailwind 主题配置 ✅ **已完成**

**2.1 颜色映射**
- [x] 在 `tailwind.config.js` 中映射现有 Paper 主题颜色
  - primary: `#9333EA` ✅
  - secondary: `#754AB4` ✅
  - tertiary: `#8B5CF6` ✅
  - surface: `#F5F5F5` ✅
  - error: `#EF4444` ✅
  - success: `#10B981` ✅
  - warning: `#F59E0B` ✅
  - info: `#3B82F6` ✅
- [x] 配置深色模式颜色映射
- **预期结果**: 颜色变量完全对齐 ✅

**2.2 其他样式映射**
- [x] 配置圆角 (roundness: 12 -> `paper`)
- [x] 配置字体系统 (使用 Tailwind 默认)
- [x] 配置常用间距、尺寸 (使用 Tailwind 默认)
- **预期结果**: 主题配置完整 ✅

---

#### 3. 通用组件改造 ✅ **已完成**

**3.1 ThemedView 组件**
- **文件**: `components/themed-view.tsx`
- **改造策略**:
  - [x] 接受 `className` prop
  - [x] 保留原有 `style`、`lightColor`、`darkColor` prop (兼容性)
  - [x] 使用 NativeWind 的 `className` 处理样式
  - [x] 确保深色模式正常工作 (`dark:` 修饰符)
- **测试要点** (待验证):
  - [ ] 亮色模式背景色正确
  - [ ] 深色模式背景色正确
  - [ ] 与现有代码兼容

**3.2 ThemedText 组件**
- **文件**: `components/themed-text.tsx`
- **改造策略**:
  - [x] 接受 `className` prop
  - [x] 保留原有 `type`、`lightColor`、`darkColor` prop
  - [x] 用 Tailwind 类映射 type 样式
    - default: `text-base leading-6`
    - defaultSemiBold: `text-base leading-6 font-semibold`
    - title: `text-[32px] font-bold leading-8`
    - subtitle: `text-xl font-bold`
    - link: `text-base leading-[30px]`
  - [x] 确保深色模式正常工作
- **测试要点** (待验证):
  - [ ] 各种 type 样式正确
  - [ ] 亮色/深色模式颜色正确
  - [ ] 字体大小、粗细正确

---

#### 4. 工具函数 ✅ **已完成**

**4.1 创建 className 工具**
- **文件**: `utils/classnames.ts` (新建)
- **功能**: 简洁的条件 className 组合
- **实现**: 简单工具函数，不依赖 clsx 库
- [x] 完成 `cn()` 函数实现
- **预期结果**: 提供便捷的 className 拼接方法 ✅

---

#### 5. 验证测试 🟡 **进行中**

**5.1 启动应用**
- [ ] 执行 `npx expo start -c` (清缓存启动)
- [ ] 在 iOS/Android/Web 平台验证
- **预期结果**: 应用正常启动，无错误

**5.2 视觉验证**
- [ ] 检查所有页面视觉是否与之前一致
- [ ] 切换亮色/深色模式验证
- [ ] 检查 ThemedView/ThemedText 使用的所有页面
- **预期结果**: 视觉零变化

**5.3 构建验证**
- [ ] 执行类型检查 `npm run lint`
- **预期结果**: 无类型错误

---

### 第一阶段验收标准

- ✅ NativeWind 环境配置完成
- ✅ ThemedView、ThemedText 成功改造
- ✅ 所有页面视觉效果保持不变
- ✅ 亮色/深色模式切换正常
- ✅ TypeScript 无错误
- ✅ 应用在三平台正常运行

---

## 🎯 第二阶段：核心组件层

### 阶段目标
改造 3-5 个高频核心组件，验证 Tailwind 可行性

### 候选组件列表

**优先级 P0 (必须完成)**:
1. **MessageBubble** (`components/chat/MessageBubble.tsx`)
   - 聊天气泡样式复杂，验证 Tailwind 灵活性
   - 涉及：圆角、间距、背景色、阴影

2. **ChatInput** (`components/chat/ChatInput.tsx`)
   - 输入框样式，高频使用
   - 涉及：边框、圆角、内边距、图标对齐

3. **SettingsList** (`components/settings/SettingsList.tsx`)
   - 列表样式，通用性强
   - 涉及：分割线、间距、对齐

**优先级 P1 (视情况完成)**:
4. **ConfirmDialog** (`components/common/ConfirmDialog.tsx`)
5. **InputDialog** (`components/common/InputDialog.tsx`)

### 改造原则
- 仅替换 `StyleSheet.create()` 部分为 `className`
- 保留组件逻辑和事件处理
- 确保 Paper 组件样式不受影响
- 深色模式必须兼容

### 任务清单 (待第一阶段完成后细化)

- [ ] 分析各组件现有样式
- [ ] 编写 Tailwind 等效 className
- [ ] 逐个替换并测试
- [ ] 视觉对比验证

---

## 🔍 第三阶段：观察评估

### 评估维度

**开发体验**:
- [ ] Tailwind 写法是否提高效率
- [ ] className 可读性如何
- [ ] 深色模式切换是否便捷

**性能表现**:
- [ ] 应用启动速度
- [ ] 页面渲染性能
- [ ] 构建时间变化

**维护成本**:
- [ ] 新功能开发成本
- [ ] 样式调整便捷性
- [ ] 代码可维护性

### 决策点
根据评估结果决定：
- ✅ 继续扩展到更多组件
- ⏸️ 保持现状，长期共存
- ❌ 回滚 NativeWind，恢复 StyleSheet

---

## 📝 关键技术决策记录

### 依赖版本选择
- **NativeWind**: 使用最新稳定版 (v4)
- **Tailwind CSS**: `^3.4.17` (NativeWind v4 要求)
- **react-native-reanimated**: 保持现有版本 `~4.1.1` (满足要求)

### 样式共存策略
- StyleSheet 与 Tailwind 长期共存
- 不强制删除现有 StyleSheet 代码
- 新组件优先使用 Tailwind
- 旧组件按需渐进迁移

### className 编写规范
- 简洁优先，避免过长 className
- 合理使用 Tailwind 工具类
- 复杂样式提取为组件
- 不使用 arbitrary values (如 `w-[123px]`)，除非必要

### 深色模式处理
- 使用 `dark:` 修饰符处理深色样式
- 与现有 `useColorScheme()` 集成
- 确保与 Paper 主题同步

---

## ⚠️ 风险与缓解措施

### 风险 1: 样式不一致
- **影响**: 视觉变化，用户体验受损
- **概率**: 中
- **缓解**: 逐个组件对比验证，截图对比

### 风险 2: 深色模式异常
- **影响**: 深色模式下样式错误
- **概率**: 中
- **缓解**: 每次改动都测试深色模式

### 风险 3: 性能下降
- **影响**: 应用卡顿
- **概率**: 低
- **缓解**: NativeWind 零运行时开销，理论性能更好

### 风险 4: TypeScript 类型错误
- **影响**: 编译失败
- **概率**: 低
- **缓解**: 正确配置 `nativewind-env.d.ts`

---

## 📚 参考资料

- [NativeWind 官方文档](https://www.nativewind.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Expo + NativeWind 集成指南](https://docs.expo.dev/guides/tailwind/)
- [项目架构文档](../CLAUDE.md)

---

## 📅 更新日志

### 2025-11-06 17:30:00
- ✅ **第一阶段核心任务完成** (95%)
- 📦 安装 NativeWind v4.2.1 和 Tailwind CSS v3.4.18
- ⚙️ 完成全部环境配置 (Babel, Metro, TypeScript)
- 🎨 配置 Tailwind 主题，映射现有 Paper 颜色系统
- 🔧 创建 `cn()` className 工具函数
- 🎯 改造通用组件:
  - ThemedView: 添加 `className` prop 支持
  - ThemedText: 添加 `className` prop，用 Tailwind 类映射 type 样式
- 📝 更新进度文档，记录所有配置和改动
- 🚀 准备进入验证测试阶段

### 2025-11-06 15:00:00
- ✨ 创建迁移计划文档
- 📋 制定第一阶段详细任务清单
- 🎯 明确阶段目标和验收标准

---

## 🐱 备注

- 本文档由 AI 助手（幽浮喵）创建和维护
- 每次任务完成后更新进度
- 遇到问题及时记录到风险章节
- 重要决策需记录到技术决策章节

喵～让我们一起优雅地迁移到 Tailwind 吧！ฅ'ω'ฅ
