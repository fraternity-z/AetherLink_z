# 项目任务分解规划：思考链(Chain of Thought)显示功能

## 已明确的决策

基于对现有项目代码的分析，已确定以下技术选型和架构决策：

- **技术栈**：React Native + Expo + TypeScript
- **UI 框架**：React Native Paper (主题系统) + NativeWind (样式工具)
- **AI SDK**：Vercel AI SDK v5.0.86 (支持流式响应)
- **数据库**：Expo SQLite (本地存储)
- **数据访问层**：Repository 模式 (已建立)
- **消息渲染**：MixedRenderer 组件 (支持 Markdown)
- **组件架构**：
  - MessageList → MessageBubble → 思考链组件 (新增)
  - 独立的可折叠思考块组件

## 整体规划概述

### 项目目标

为 AetherLink_z 应用添加思考链(Chain of Thought)显示功能，实现：
1. 将 AI 的思考过程与最终回答分离显示
2. 提供可展开/折叠的思考块 UI 组件
3. 显示思考过程的耗时统计
4. 支持流式显示思考过程（实时更新）
5. 在数据库中持久化思考链数据
6. 保持与现有聊天界面的一致性和流畅性

### 技术栈

- **前端**：React Native 0.81.5, React Native Paper, NativeWind
- **AI 集成**：Vercel AI SDK (`ai` package)
- **数据存储**：Expo SQLite + Repository 模式
- **渲染引擎**：MixedRenderer (Markdown 支持)
- **动画库**：React Native Reanimated (已集成)

### 主要阶段

1. **技术调研阶段** - 了解思考链 API 和数据结构
2. **数据层改造阶段** - 扩展数据库和仓库接口
3. **AI 服务集成阶段** - 修改 AiClient 支持思考链
4. **UI 组件开发阶段** - 创建思考链展示组件
5. **集成与测试阶段** - 整合功能并进行测试
6. **优化与文档阶段** - 性能优化和文档编写

---

## 详细任务分解

### 阶段 1：技术调研阶段

#### 任务 1.1：调研 Vercel AI SDK 思考链支持

- **目标**：确定 Vercel AI SDK 是否原生支持思考链，以及如何获取思考过程数据
- **输入**：
  - Vercel AI SDK 官方文档 (https://sdk.vercel.ai/)
  - OpenAI API 文档 (关于 reasoning/o1 模型)
  - Anthropic Claude API 文档
- **输出**：
  - 技术调研报告文档 (`.claude/research/thinking-chain-api.md`)
  - 支持思考链的模型列表
  - 数据结构示例 (JSON Schema)
- **涉及文件**：
  - 无 (纯研究任务)
- **预估工作量**：2-3 小时
- **关键问题**：
  - Vercel AI SDK 的 `streamText` 函数是否支持返回思考链数据？
  - 思考链数据在响应流中的格式是什么？(独立字段 vs 内嵌在 content 中)
  - 不同 AI 提供商的思考链格式是否一致？

#### 任务 1.2：分析现有消息流式处理逻辑

- **目标**：理解当前的流式响应处理流程，确定集成点
- **输入**：
  - `services/ai/AiClient.ts` (当前流式处理逻辑)
  - `components/chat/ChatInput.tsx` (消息发送和接收逻辑)
  - `hooks/use-messages.ts` (消息状态管理)
- **输出**：
  - 流程图 (流式响应的数据流动路径)
  - 集成点标识 (在哪里拦截和处理思考链数据)
- **涉及文件**：
  - `services/ai/AiClient.ts` (分析)
  - `components/chat/ChatInput.tsx` (分析)
- **预估工作量**：1-2 小时

#### 任务 1.3：设计思考链数据结构

- **目标**：定义思考链在本地存储和 UI 中的数据模型
- **输入**：
  - 任务 1.1 的调研结果
  - `storage/core.ts` 中的现有数据模型
- **输出**：
  - TypeScript 接口定义
  - 数据库表结构设计
  - 示例数据
- **涉及文件**：
  - `storage/core.ts` (需要扩展)
- **预估工作量**：1 小时
- **设计草案**：
  ```typescript
  export interface ThinkingChain {
    id: string;
    messageId: string; // 关联的消息 ID
    content: string;   // 思考过程文本
    startTime: number; // 开始时间戳
    endTime: number;   // 结束时间戳
    durationMs: number; // 耗时(毫秒)
    extra?: any;       // 扩展字段
  }
  ```

---

### 阶段 2：数据层改造阶段

#### 任务 2.1：创建数据库迁移脚本

- **目标**：添加 `thinking_chains` 表以存储思考链数据
- **输入**：
  - 任务 1.3 的数据结构设计
  - `storage/sqlite/migrations/0001_init.ts` (参考现有迁移格式)
- **输出**：
  - `storage/sqlite/migrations/0003_thinking_chains.ts`
- **涉及文件**：
  - `storage/sqlite/migrations/0003_thinking_chains.ts` (新建)
  - `storage/sqlite/db.ts` (注册新迁移)
- **预估工作量**：1 小时
- **SQL 设计草案**：
  ```sql
  CREATE TABLE IF NOT EXISTS thinking_chains (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    content TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    extra TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_thinking_chains_message ON thinking_chains(message_id);
  ```

#### 任务 2.2：扩展 Message 接口

- **目标**：在 `storage/core.ts` 中添加思考链相关接口
- **输入**：
  - 任务 1.3 的设计
- **输出**：
  - 更新后的 `core.ts` 文件
  - ThinkingChain 接口定义
- **涉及文件**：
  - `storage/core.ts` (修改)
- **预估工作量**：0.5 小时

#### 任务 2.3：创建 ThinkingChainRepository

- **目标**：实现思考链数据的 CRUD 操作
- **输入**：
  - `storage/repositories/messages.ts` (参考 Repository 模式)
- **输出**：
  - `storage/repositories/thinking-chains.ts`
- **涉及文件**：
  - `storage/repositories/thinking-chains.ts` (新建)
- **预估工作量**：2 小时
- **接口设计**：
  ```typescript
  export const ThinkingChainRepository = {
    async addThinkingChain(input: { ... }): Promise<ThinkingChain>
    async getThinkingChainByMessageId(messageId: string): Promise<ThinkingChain | null>
    async updateThinkingChainContent(id: string, content: string): Promise<void>
    async deleteThinkingChain(id: string): Promise<void>
  }
  ```

#### 任务 2.4：扩展 MessageRepository

- **目标**：在消息查询中支持关联加载思考链数据
- **输入**：
  - `storage/repositories/messages.ts`
- **输出**：
  - 新增 `getMessageWithThinkingChain` 方法
- **涉及文件**：
  - `storage/repositories/messages.ts` (修改)
- **预估工作量**：1 小时

---

### 阶段 3：AI 服务集成阶段

#### 任务 3.1：修改 AiClient 支持思考链提取

- **目标**：在流式响应中识别和提取思考链数据
- **输入**：
  - 任务 1.1 的调研结果 (API 格式)
  - `services/ai/AiClient.ts`
- **输出**：
  - 扩展后的 `StreamOptions` 接口
  - 新增 `onThinkingToken` 回调
  - 思考链解析逻辑
- **涉及文件**：
  - `services/ai/AiClient.ts` (修改)
- **预估工作量**：3-4 小时
- **接口扩展草案**：
  ```typescript
  export interface StreamOptions {
    // ... 现有字段
    onThinkingToken?: (delta: string) => void;
    onThinkingStart?: () => void;
    onThinkingEnd?: () => void;
  }
  ```

#### 任务 3.2：更新 ChatInput 处理思考链回调

- **目标**：在聊天输入组件中处理思考链数据的实时更新
- **输入**：
  - `components/chat/ChatInput.tsx`
  - 任务 3.1 的新回调接口
- **输出**：
  - 思考链数据的临时存储逻辑
  - 思考链完成后保存到数据库的逻辑
- **涉及文件**：
  - `components/chat/ChatInput.tsx` (修改)
- **预估工作量**：2-3 小时

#### 任务 3.3：添加思考链耗时统计

- **目标**：记录思考链的开始、结束时间和总耗时
- **输入**：
  - 任务 3.2 的回调处理逻辑
- **输出**：
  - 时间戳记录逻辑
  - 耗时计算 (endTime - startTime)
- **涉及文件**：
  - `components/chat/ChatInput.tsx` (修改)
- **预估工作量**：1 小时

---

### 阶段 4：UI 组件开发阶段

#### 任务 4.1：创建 ThinkingBlock 基础组件

- **目标**：创建独立的思考链展示组件，支持展开/折叠
- **输入**：
  - 用户提供的参考截图 (UI 设计)
  - React Native Paper 主题系统
  - `components/chat/MessageBubble.tsx` (参考样式)
- **输出**：
  - `components/chat/ThinkingBlock.tsx`
- **涉及文件**：
  - `components/chat/ThinkingBlock.tsx` (新建)
- **预估工作量**：3-4 小时
- **组件接口草案**：
  ```typescript
  interface ThinkingBlockProps {
    content: string;
    durationMs: number;
    isExpanded: boolean;
    onToggle: () => void;
  }
  ```

#### 任务 4.2：设计展开/折叠动画

- **目标**：使用 React Native Reanimated 实现流畅的展开动画
- **输入**：
  - React Native Reanimated 文档
  - `react-native-reanimated` (已安装)
- **输出**：
  - 高度动画逻辑
  - 箭头旋转动画
- **涉及文件**：
  - `components/chat/ThinkingBlock.tsx` (修改)
- **预估工作量**：2 小时

#### 任务 4.3：实现耗时徽章组件

- **目标**：显示思考耗时的视觉标识 (如 "思考了 2.5 秒")
- **输入**：
  - 思考链的 `durationMs` 字段
- **输出**：
  - 耗时格式化工具函数
  - 徽章样式设计
- **涉及文件**：
  - `components/chat/ThinkingBlock.tsx` (修改)
  - `utils/format-time.ts` (新建，可选)
- **预估工作量**：1 小时

#### 任务 4.4：适配深色/浅色主题

- **目标**：确保思考块在两种主题下都有良好的视觉效果
- **输入**：
  - `react-native-paper` 的 `useTheme` Hook
  - 现有主题配置 (`constants/theme.ts`)
- **输出**：
  - 主题自适应的颜色变量
  - 深色模式的边框和背景调整
- **涉及文件**：
  - `components/chat/ThinkingBlock.tsx` (修改)
- **预估工作量**：1-2 小时

#### 任务 4.5：集成到 MessageBubble 组件

- **目标**：在消息气泡中渲染思考块 (位于正文上方)
- **输入**：
  - `components/chat/MessageBubble.tsx`
  - 任务 4.1-4.4 的 ThinkingBlock 组件
- **输出**：
  - 条件渲染逻辑 (仅 AI 消息显示思考块)
  - 思考块与正文的间距调整
- **涉及文件**：
  - `components/chat/MessageBubble.tsx` (修改)
- **预估工作量**：1-2 小时

---

### 阶段 5：集成与测试阶段

#### 任务 5.1：端到端功能测试

- **目标**：验证从 AI 响应到 UI 显示的完整流程
- **输入**：
  - 支持思考链的 AI 模型 (如 OpenAI o1 系列)
  - 测试对话场景
- **输出**：
  - 功能测试报告
  - Bug 列表和修复
- **涉及文件**：
  - 所有修改过的文件
- **预估工作量**：3-4 小时
- **测试用例**：
  1. 发送消息后思考链是否正确显示
  2. 思考链展开/折叠是否流畅
  3. 耗时统计是否准确
  4. 数据是否正确保存到数据库
  5. 历史消息加载时思考链是否正确显示

#### 任务 5.2：跨平台兼容性测试

- **目标**：确保 iOS、Android、Web 平台上的一致性
- **输入**：
  - iOS 模拟器/真机
  - Android 模拟器/真机
  - Web 浏览器
- **输出**：
  - 平台兼容性报告
  - 平台特定问题修复
- **涉及文件**：
  - UI 组件文件
- **预估工作量**：2-3 小时

#### 任务 5.3：错误处理和边界情况测试

- **目标**：处理异常情况 (如网络中断、思考链缺失等)
- **输入**：
  - 错误场景模拟
- **输出**：
  - 错误处理逻辑优化
  - 降级策略 (无思考链时正常显示)
- **涉及文件**：
  - `services/ai/AiClient.ts` (错误处理)
  - `components/chat/MessageBubble.tsx` (降级显示)
- **预估工作量**：2 小时

---

### 阶段 6：优化与文档阶段

#### 任务 6.1：性能优化 - 长思考链渲染

- **目标**：优化超长思考链的渲染性能 (如 >1000 字)
- **输入**：
  - 性能分析工具 (React DevTools)
- **输出**：
  - 虚拟化渲染 (可选)
  - 懒加载策略
  - memo 优化
- **涉及文件**：
  - `components/chat/ThinkingBlock.tsx` (优化)
- **预估工作量**：2-3 小时

#### 任务 6.2：添加用户设置选项

- **目标**：允许用户控制是否显示思考链 (可选功能)
- **输入**：
  - `storage/repositories/settings.ts`
  - `app/settings/` 页面
- **输出**：
  - 设置项 `showThinkingChain` (boolean)
  - 设置页面 UI 切换开关
  - MessageBubble 中的条件渲染
- **涉及文件**：
  - `storage/repositories/settings.ts` (新增设置)
  - `app/settings/index.tsx` (新增开关)
  - `components/chat/MessageBubble.tsx` (条件显示)
- **预估工作量**：2 小时

#### 任务 6.3：编写功能文档

- **目标**：为开发者和用户提供思考链功能的说明文档
- **输入**：
  - 功能实现细节
  - 用户使用指南
- **输出**：
  - `docs/THINKING_CHAIN.md` (开发者文档)
  - `docs/USER_GUIDE_THINKING_CHAIN.md` (用户指南)
- **涉及文件**：
  - 文档文件 (新建)
- **预估工作量**：1-2 小时

#### 任务 6.4：更新项目 CLAUDE.md

- **目标**：在项目架构文档中记录思考链功能
- **输入**：
  - 现有 `CLAUDE.md`
  - 新增模块信息
- **输出**：
  - 更新后的 `CLAUDE.md`
  - 模块索引更新
- **涉及文件**：
  - `CLAUDE.md` (修改)
  - `components/chat/CLAUDE.md` (修改)
  - `storage/CLAUDE.md` (修改)
- **预估工作量**：1 小时

---

## 需要进一步明确的问题

### 问题 1：参考 UI 设计缺失 ✅ 已确认

**用户决策**：已提供参考截图（对话中的图片）

**确认方案**：**方案 A** - 按照用户提供的截图精确复刻

**设计要点**（基于截图分析）：
- 思考链框是独立的可折叠组件
- 位于消息正文上方
- 显示思考时长统计（如"已深度思考（用时 2.9 秒）"）
- 折叠状态显示简要标题和时长
- 展开状态显示完整思考过程内容
- 支持深色/浅色主题适配

---

### 问题 2：思考链流式显示策略 ✅ 已确认

**用户决策**：思考过程要流式输出

**确认方案**：**方案 A** - 实时流式显示思考过程

**实现要点**：
- 使用流式 API 实时接收思考链 token
- 采用防抖策略优化渲染性能（每 100ms 更新一次）
- 思考块可在流式输出时保持折叠状态
- 用户可随时展开查看当前思考进度
- 使用 `useRef` 缓存内容，减少状态更新频率

---

### 问题 3：支持的 AI 提供商范围 ✅ 已确认

**用户决策**：仅支持原生思考链模型

**确认方案**：**方案 A** - 仅支持明确提供思考链的模型

**支持的模型列表**（初步）：
- OpenAI o1 系列（o1, o1-mini, o1-preview）
- DeepSeek R1 系列
- 其他明确支持 reasoning 输出的模型

**实现策略**：
- 检查模型是否支持思考链 API
- 仅在支持的模型上启用思考链功能
- 不支持的模型正常显示回答，无思考链部分
- 避免通过提示词模拟，保证数据质量

---

### 问题 4：思考链默认展开状态 ✅ 已确认

**用户决策**：思考块默认折叠

**确认方案**：**方案 A** - 默认折叠状态

**实现要点**：
- 新消息的思考块初始状态为折叠
- 折叠状态显示：思考标题 + 耗时统计
- 用户点击可展开查看完整思考过程
- 展开/折叠状态不持久化（刷新后恢复默认折叠）
- 保持界面简洁，不干扰主要内容阅读

---

### 问题 5：历史消息的思考链数据 ✅ 已确认

**用户决策**：历史消息不处理思考链

**确认方案**：**方案 A** - 向后兼容，历史消息不显示思考链

**实现要点**：
- 不是所有模型都有思考链功能
- 仅在新消息中支持思考链（功能上线后）
- 历史消息（功能上线前）不显示思考链组件
- 数据库字段允许为空（nullable）
- MessageBubble 组件做空值检查，兼容旧数据
- 无需数据回填或重新生成功能

---

## 用户反馈区域 ✅ 已收集

用户补充内容：

1. **关于参考 UI 设计**：
   - 已提供截图作为参考
   - 思考链框是独立的可折叠组件
   - 需要显示思考时长

2. **关于实现优先级**：
   - 优先支持原生思考链模型（OpenAI o1, DeepSeek R1）
   - 思考过程必须支持流式输出
   - 默认折叠状态

3. **关于技术选型的其他建议**：
   - 参考官方 Vercel SDK 关于思考链和正文分离的解析方式
   - 需要查阅官方文档了解具体实现

4. **其他需求或调整**：
   - 历史消息不需要处理思考链
   - 只有支持思考链的模型才显示该功能

---

## 技术难点与解决方案

### 难点 1：Vercel AI SDK 对思考链的支持

**问题描述**：Vercel AI SDK 的 `streamText` 函数可能不直接暴露思考链数据。

**解决方案**：
1. 查阅 Vercel AI SDK 最新文档，确认是否有 `reasoning` 或类似字段
2. 如果不支持，考虑直接调用提供商的原生 SDK (如 `@ai-sdk/openai`)
3. 备选方案：解析返回的 `text` 内容，使用特定标记分隔思考链和正文 (如 `<thinking>...</thinking>`)

**参考资料**：
- Vercel AI SDK Docs: https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
- OpenAI Reasoning Models: https://platform.openai.com/docs/guides/reasoning

---

### 难点 2：流式思考链的状态管理

**问题描述**：思考链在流式生成时需要实时更新，但 React 状态更新频率过高可能导致性能问题。

**解决方案**：
1. 使用 `useRef` 缓存思考链内容，减少状态更新频率
2. 采用防抖 (debounce) 策略，每 100ms 更新一次 UI
3. 思考链完成后，一次性提交到数据库

**示例代码**：
```typescript
const thinkingContentRef = useRef('');
const [thinkingContent, setThinkingContent] = useState('');

const updateThinkingDebounced = useMemo(
  () => debounce((content: string) => setThinkingContent(content), 100),
  []
);

const onThinkingToken = (delta: string) => {
  thinkingContentRef.current += delta;
  updateThinkingDebounced(thinkingContentRef.current);
};
```

---

### 难点 3：思考链的 Markdown 渲染性能

**问题描述**：长思考链包含复杂 Markdown 时，渲染性能可能下降。

**解决方案**：
1. 复用现有的 `MixedRenderer` 组件 (已优化)
2. 折叠状态时仅渲染前 3 行预览
3. 使用 `React.memo` 避免不必要的重渲染
4. 对于超长内容 (>2000 字)，显示"内容过长，点击查看"的提示

---

### 难点 4：数据库迁移的向后兼容性

**问题描述**：新增 `thinking_chains` 表后，旧版本数据库如何平滑升级？

**解决方案**：
1. 使用数据库版本号管理 (Expo SQLite 支持)
2. 迁移脚本中使用 `IF NOT EXISTS` 避免重复创建
3. 为现有消息添加默认值 (思考链为 null)
4. 在 Repository 层做空值检查，兼容旧数据

---

## 验收标准

### 功能验收

- [ ] 支持的 AI 模型能正确显示思考链
- [ ] 思考块可正常展开/折叠，动画流畅
- [ ] 耗时统计准确 (误差 < 100ms)
- [ ] 思考链内容正确保存到数据库
- [ ] 历史消息加载时思考链正确显示
- [ ] 深色/浅色主题下视觉效果一致
- [ ] iOS、Android、Web 平台兼容性良好

### 性能验收

- [ ] 长思考链 (>1000 字) 渲染流畅 (FPS > 50)
- [ ] 数据库查询响应时间 < 100ms
- [ ] 流式更新不阻塞 UI 主线程

### 代码质量验收

- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 代码注释完整 (JSDoc 格式)
- [ ] 遵循项目现有代码风格

### 文档验收

- [ ] 功能文档完整 (开发者 + 用户)
- [ ] 项目架构文档已更新
- [ ] 代码中有必要的注释说明

---

## 总体预估工作量

| 阶段 | 预估时间 | 风险等级 |
|------|---------|---------|
| 阶段 1：技术调研 | 4-6 小时 | 🟡 中 |
| 阶段 2：数据层改造 | 4-5 小时 | 🟢 低 |
| 阶段 3：AI 服务集成 | 6-8 小时 | 🔴 高 |
| 阶段 4：UI 组件开发 | 8-11 小时 | 🟡 中 |
| 阶段 5：集成与测试 | 7-9 小时 | 🟡 中 |
| 阶段 6：优化与文档 | 6-8 小时 | 🟢 低 |
| **总计** | **35-47 小时** | - |

**风险说明**：
- 🔴 **高风险**：阶段 3 依赖 AI SDK 的 API 支持，可能需要调整实现方案
- 🟡 **中风险**：阶段 1、4、5 涉及较多技术调研和 UI 调试
- 🟢 **低风险**：阶段 2、6 是常规开发任务

---

## 里程碑与交付物

### 里程碑 1：技术方案确认 (预计 1 天)
- ✅ 调研报告完成
- ✅ 数据结构设计确认
- ✅ 用户确认 UI 设计方向

### 里程碑 2：数据层完成 (预计 1 天)
- ✅ 数据库迁移脚本
- ✅ Repository 接口实现

### 里程碑 3：AI 集成完成 (预计 2 天)
- ✅ AiClient 支持思考链提取
- ✅ ChatInput 处理思考链回调

### 里程碑 4：UI 组件完成 (预计 2 天)
- ✅ ThinkingBlock 组件开发
- ✅ 集成到 MessageBubble

### 里程碑 5：功能上线 (预计 3 天)
- ✅ 所有测试通过
- ✅ 文档完成
- ✅ 代码审查通过

---

## 后续优化方向 (可选)

1. **思考链分享功能**：允许用户分享 AI 的思考过程
2. **思考链分析**：统计平均思考时间、思考质量等
3. **自定义思考样式**：用户可选择不同的展示风格
4. **思考链搜索**：在历史记录中搜索思考内容
5. **思考链高亮**：标注关键思考步骤

---

## 相关参考资料

### 官方文档
- Vercel AI SDK: https://sdk.vercel.ai/
- OpenAI Reasoning: https://platform.openai.com/docs/guides/reasoning
- React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/

### 设计参考
- ChatGPT 思考链 UI (o1 模型)
- Claude Thinking UI (Claude 3.5 Sonnet)

### 技术博客
- [Building a Chain of Thought UI in React](https://example.com)
- [Streaming AI Responses with Vercel AI SDK](https://example.com)

---

**文档版本**: v1.1
**创建日期**: 2025-11-08
**最后更新**: 2025-11-08
**作者**: AI Planning Agent
**状态**: ✅ 用户已确认，准备开始实施

---

## 用户确认的最终方案总结

| 决策项 | 确认方案 | 关键要点 |
|--------|---------|---------|
| UI 设计 | 按截图复刻 | 可折叠组件，显示时长，位于正文上方 |
| 流式显示 | 实时流式输出 | 支持实时更新，防抖优化性能 |
| 模型支持 | 仅原生思考链模型 | OpenAI o1, DeepSeek R1 等 |
| 默认状态 | 默认折叠 | 保持界面简洁，用户可展开查看 |
| 历史消息 | 不处理 | 向后兼容，仅新消息启用功能 |
| 技术参考 | Vercel SDK 官方文档 | 学习思考链与正文分离的解析方式 |
