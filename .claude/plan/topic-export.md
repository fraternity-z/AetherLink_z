# 项目任务分解规划

## 话题导出功能 - Topic Export Feature

## 已明确的决策

- **数据来源**: 使用现有的 Repository 模式从 SQLite 获取数据
- **支持格式**: Markdown (.md) 和 Word 文档 (.docx)
- **导出方式**: 使用 `expo-sharing` API 分享文件
- **文件系统**: 使用 `expo-file-system` 管理临时文件
- **数据结构**: 消息可能包含:
  - 基础文本 (Message.text)
  - 思考链 (ThinkingChain)
  - 消息块 (MessageBlock) - 包括 MCP 工具调用
  - 附件 (Attachment) - 图片、文件等
- **参考模式**: 现有的 `DataBackupService` 提供了文件导出和分享的参考实现

---

## 整体规划概述

### 项目目标

为 AetherLink_z 应用添加话题导出功能，允许用户将整个对话导出为 Markdown 或 Word 文档格式，便于分享、存档和二次编辑。导出的文档应保留对话的完整结构、格式和元数据。

### 技术栈

- **核心框架**: React Native 0.81.5 + Expo 54
- **文件系统**: expo-file-system
- **文件分享**: expo-sharing
- **DOCX 生成**: docx (npm 包，纯 JavaScript 实现，兼容 React Native)
- **类型定义**: TypeScript 5.9.2

### 主要阶段

1. **阶段 1: 数据收集服务** - 实现话题数据的完整收集和结构化
2. **阶段 2: Markdown 导出器** - 实现 Markdown 格式转换
3. **阶段 3: Word 文档导出器** - 实现 DOCX 格式转换
4. **阶段 4: UI 集成与用户交互** - 集成到现有界面，提供导出入口

---

### 详细任务分解

#### 阶段 1：数据收集服务

**目标**: 创建统一的话题数据收集服务，从数据库收集对话的完整内容

- **任务 1.1**：定义导出数据类型
  - 目标：创建类型安全的导出数据结构
  - 输入：现有的 Message, ThinkingChain, MessageBlock, Attachment 类型
  - 输出：新的 TopicExportData 类型定义
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\TopicExport.types.ts` (新建)
  - 预估工作量：0.5 小时

- **任务 1.2**：实现话题数据收集器
  - 目标：收集指定话题的完整数据（消息、思考链、消息块、附件）
  - 输入：conversationId
  - 输出：结构化的 TopicExportData 对象
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\TopicExportCollector.ts` (新建)
  - 预估工作量：2 小时

- **任务 1.3**：添加性能优化
  - 目标：处理大量消息时的性能优化（分批查询、流式处理）
  - 输入：大型对话数据
  - 输出：优化后的数据收集器，支持进度回调
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\TopicExportCollector.ts`
  - 预估工作量：1 小时

---

#### 阶段 2：Markdown 导出器

**目标**: 将话题数据转换为格式良好的 Markdown 文档

- **任务 2.1**：实现基础 Markdown 生成器
  - 目标：生成包含消息内容的基础 Markdown
  - 输入：TopicExportData
  - 输出：Markdown 字符串
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\MarkdownExporter.ts` (新建)
  - 预估工作量：1.5 小时

- **任务 2.2**：处理特殊内容块
  - 目标：正确渲染思考链、工具调用、代码块等
  - 输入：MessageBlock、ThinkingChain 数据
  - 输出：格式化的 Markdown 内容
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\MarkdownExporter.ts`
  - 预估工作量：2 小时

- **任务 2.3**：处理附件引用
  - 目标：在 Markdown 中正确引用图片和文件附件
  - 输入：Attachment 数据
  - 输出：带有附件引用的 Markdown
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\MarkdownExporter.ts`
  - 预估工作量：1 小时

- **任务 2.4**：添加文档元数据
  - 目标：添加话题标题、创建时间、消息统计等元信息
  - 输入：Conversation 元数据
  - 输出：完整的 Markdown 文档
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\MarkdownExporter.ts`
  - 预估工作量：0.5 小时

---

#### 阶段 3：Word 文档导出器

**目标**: 将话题数据转换为格式化的 Word 文档

- **任务 3.1**：集成 docx 库
  - 目标：安装并配置 docx npm 包
  - 输入：package.json
  - 输出：可用的 docx 库
  - 涉及文件：
    - `e:\code\AetherLink_z\package.json`
  - 预估工作量：0.5 小时

- **任务 3.2**：实现基础 DOCX 生成器
  - 目标：生成包含消息内容的基础 Word 文档
  - 输入：TopicExportData
  - 输出：DOCX Blob/Buffer
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\DocxExporter.ts` (新建)
  - 预估工作量：2 小时

- **任务 3.3**：设计文档样式
  - 目标：定义用户/助手消息、代码块、引用等的样式
  - 输入：UI/UX 设计规范
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\DocxExporter.ts`
    - `e:\code\AetherLink_z\services\data\exporters\docx-styles.ts` (新建)
  - 预估工作量：2 小时

- **任务 3.4**：处理特殊内容块
  - 目标：正确渲染思考链（折叠块）、工具调用、代码块等
  - 输入：MessageBlock、ThinkingChain 数据
  - 输出：格式化的 DOCX 内容
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\DocxExporter.ts`
  - 预估工作量：2.5 小时

- **任务 3.5**：嵌入图片附件
  - 目标：将图片附件嵌入 Word 文档
  - 输入：Attachment 数据和图片文件
  - 输出：包含嵌入图片的 DOCX
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\exporters\DocxExporter.ts`
  - 预估工作量：1.5 小时

---

#### 阶段 4：UI 集成与用户交互

**目标**: 提供用户友好的导出入口和交互体验

- **任务 4.1**：实现导出服务统一入口
  - 目标：创建 TopicExportService 统一管理导出流程
  - 输入：conversationId, exportFormat
  - 输出：导出并分享文件
  - 涉及文件：
    - `e:\code\AetherLink_z\services\data\TopicExportService.ts` (新建)
    - `e:\code\AetherLink_z\services\data\index.ts`
  - 预估工作量：1.5 小时

- **任务 4.2**：创建导出对话框组件
  - 目标：提供格式选择、导出选项的 UI 对话框
  - 输入：用户交互
  - 输出：导出配置和确认
  - 涉及文件：
    - `e:\code\AetherLink_z\components\chat\dialogs\TopicExportDialog.tsx` (新建)
  - 预估工作量：2 小时

- **任务 4.3**：集成到话题侧边栏
  - 目标：在 TopicsSidebar 中添加导出入口
  - 输入：TopicsSidebar 组件
  - 输出：带有导出按钮的侧边栏
  - 涉及文件：
    - `e:\code\AetherLink_z\components\chat\sidebar\TopicsSidebar.tsx`
  - 预估工作量：1 小时

- **任务 4.4**：集成到更多操作菜单
  - 目标：在 MoreActionsMenu 中添加导出选项
  - 输入：MoreActionsMenu 组件
  - 输出：带有导出选项的菜单
  - 涉及文件：
    - `e:\code\AetherLink_z\components\chat\menus\MoreActionsMenu.tsx`
  - 预估工作量：0.5 小时

- **任务 4.5**：添加导出进度指示
  - 目标：显示导出进度（大型对话时）
  - 输入：导出进度回调
  - 输出：进度对话框/指示器
  - 涉及文件：
    - `e:\code\AetherLink_z\components\chat\dialogs\TopicExportDialog.tsx`
  - 预估工作量：1 小时

- **任务 4.6**：创建导出相关 Hook
  - 目标：封装导出逻辑的 React Hook
  - 输入：导出服务
  - 输出：use-topic-export.ts hook
  - 涉及文件：
    - `e:\code\AetherLink_z\hooks\use-topic-export.ts` (新建)
  - 预估工作量：1 小时

---

## 需要进一步明确的问题

### 问题 1：DOCX 生成库的选择

**背景**: React Native 环境下 DOCX 生成有多种方案

**推荐方案**：

- **方案 A**: `docx` (npm 包)
  - 优点：纯 JavaScript 实现，无原生依赖，跨平台兼容好
  - 优点：支持丰富的 Word 功能（样式、表格、图片等）
  - 优点：活跃维护，文档完善
  - 缺点：包体积较大（约 500KB gzipped）

- **方案 B**: `officegen`
  - 优点：支持多种 Office 格式
  - 缺点：维护较少，React Native 兼容性未知

**推荐**: 方案 A (`docx`)，因为它是目前最成熟且兼容性最好的纯 JavaScript DOCX 生成库

**等待用户选择**：

```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A: docx (推荐)
[ ] 方案 B: officegen
[ ] 其他方案：______________________
```

---

### 问题 2：附件处理策略

**背景**: 导出时需要决定如何处理消息中的附件（图片、文件等）

**推荐方案**：

- **方案 A**: 嵌入附件
  - Markdown：图片转 Base64 data URL 或使用本地路径
  - DOCX：图片嵌入文档内
  - 优点：导出文件自包含，便于分享
  - 缺点：文件体积大，可能超出分享限制

- **方案 B**: 引用附件
  - Markdown：仅添加文件名和描述
  - DOCX：添加占位符和文件信息
  - 优点：文件体积小
  - 缺点：附件信息不完整

- **方案 C**: 可选配置
  - 提供选项让用户选择是否嵌入附件
  - 优点：灵活性最高
  - 缺点：实现复杂度高

**等待用户选择**：

```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A: 嵌入附件（图片嵌入到文档中）
[ ] 方案 B: 仅引用附件（只显示文件名）
[ ] 方案 C: 用户可选（推荐）
[ ] 其他方案：______________________
```

---

### 问题 3：思考链内容的导出方式

**背景**: 思考链(ThinkingChain)是 AI 推理过程的详细记录，可能很长

**推荐方案**：

- **方案 A**: 完整导出
  - 将思考链作为引用块或折叠内容完整导出
  - 优点：信息完整
  - 缺点：可能大幅增加文档长度

- **方案 B**: 摘要导出
  - 仅导出思考链的摘要（如"思考时长: 5s, Token 数: 500"）
  - 优点：简洁
  - 缺点：信息丢失

- **方案 C**: 可选配置
  - 提供选项让用户选择导出方式
  - 优点：灵活
  - 缺点：增加实现复杂度

**等待用户选择**：

```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A: 完整导出思考链
[ ] 方案 B: 仅导出摘要
[ ] 方案 C: 用户可选（推荐）
[ ] 其他方案：______________________
```

---

### 问题 4：MCP 工具调用的导出方式

**背景**: MessageBlock 中可能包含 MCP 工具调用的详细信息（参数、结果等）

**推荐方案**：

- **方案 A**: 完整导出
  - 导出工具名、参数（JSON）、执行结果
  - 优点：信息完整，可复现
  - 缺点：可能包含敏感信息（API key 等）

- **方案 B**: 简化导出
  - 仅导出工具名和执行状态
  - 优点：简洁安全
  - 缺点：缺少详细信息

**等待用户选择**：

```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A: 完整导出工具调用详情
[ ] 方案 B: 简化导出（仅工具名和状态）
[ ] 其他方案：______________________
```

---

### 问题 5：Web 平台的兼容性处理

**背景**: `expo-sharing` 在 Web 平台可能不完全支持

**推荐方案**：

- **方案 A**: Web 使用下载链接
  - 检测平台，Web 端使用浏览器下载 API
  - 优点：跨平台一致体验
  - 缺点：需要额外的平台检测逻辑

- **方案 B**: 仅支持移动端
  - Web 端禁用导出功能
  - 优点：实现简单
  - 缺点：功能不完整

**等待用户选择**：

```
请选择您偏好的方案，或提供其他建议：
[ ] 方案 A: 完整支持所有平台（推荐）
[ ] 方案 B: 仅支持移动端
[ ] 其他方案：______________________
```

---

## 风险评估

### 风险 1：DOCX 库兼容性
- **风险描述**: `docx` 库可能在某些 React Native 版本或平台上有兼容性问题
- **影响程度**: 中
- **缓解措施**:
  - 在开发早期进行兼容性测试
  - 准备备选的纯 Markdown 导出方案

### 风险 2：大型对话性能问题
- **风险描述**: 包含数百条消息的对话可能导致内存溢出或界面卡顿
- **影响程度**: 高
- **缓解措施**:
  - 实现分批处理和流式写入
  - 添加进度指示和取消功能
  - 设置最大导出限制（可配置）

### 风险 3：图片嵌入失败
- **风险描述**: 附件文件可能已被删除或路径无效
- **影响程度**: 低
- **缓解措施**:
  - 检查文件存在性
  - 提供占位符图片或警告信息

### 风险 4：敏感信息泄露
- **风险描述**: 导出可能包含 API Key、个人信息等敏感内容
- **影响程度**: 中
- **缓解措施**:
  - 导出前显示警告
  - 考虑添加敏感内容过滤选项

---

## 验收标准

### 功能验收

1. **基础功能**
   - [ ] 可以从侧边栏或菜单发起导出
   - [ ] 可以选择 Markdown 或 DOCX 格式
   - [ ] 导出文件可以正确打开和阅读

2. **内容完整性**
   - [ ] 导出包含所有消息（用户和助手）
   - [ ] 消息按时间顺序排列
   - [ ] 包含话题标题和元数据
   - [ ] 正确处理 Markdown 格式（代码块、列表等）

3. **特殊内容处理**
   - [ ] 思考链正确显示（或按配置隐藏）
   - [ ] MCP 工具调用正确显示
   - [ ] 图片附件正确嵌入或引用

4. **跨平台兼容**
   - [ ] iOS 平台正常导出和分享
   - [ ] Android 平台正常导出和分享
   - [ ] Web 平台可以下载文件

5. **用户体验**
   - [ ] 导出过程有进度指示
   - [ ] 错误情况有友好提示
   - [ ] 可以取消进行中的导出

### 性能验收

- [ ] 100 条消息的对话导出时间 < 3 秒
- [ ] 500 条消息的对话导出时间 < 10 秒
- [ ] 导出过程不阻塞 UI 交互

### 代码质量

- [ ] 遵循项目的 TypeScript 规范
- [ ] 使用 logger 而非 console
- [ ] 关键函数添加 JSDoc 注释
- [ ] 错误处理完善

---

## 预估总工作量

| 阶段 | 预估时间 |
|------|----------|
| 阶段 1: 数据收集服务 | 3.5 小时 |
| 阶段 2: Markdown 导出器 | 5 小时 |
| 阶段 3: Word 文档导出器 | 8.5 小时 |
| 阶段 4: UI 集成 | 7 小时 |
| 测试和调试 | 4 小时 |
| **总计** | **约 28 小时** |

---

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议：

```
用户补充内容：

---

---

---

```
