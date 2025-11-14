# 项目任务分解规划 - 消息块长按拓展功能

## 已明确的决策

### 技术选型
- **长按手势**: 使用 React Native Paper 的 `Menu` + `Pressable` 的 `onLongPress` 事件
- **菜单组件**: React Native Paper 的 `Menu` 和 `Menu.Item` (已在项目中可用)
- **复制功能**: 使用 `expo-clipboard` (需新增依赖,官方推荐,Expo 生态集成度高)
- **手势方案**: 不使用 `react-native-gesture-handler`,因为 Pressable 的 onLongPress 已足够

### 架构决策
- 菜单逻辑封装在 `MessageBubble` 组件内部,保持组件自包含
- 为未来功能(重新发送/重新生成)预留接口,通过 props 传入回调函数
- 使用 React Native Paper 主题系统,确保菜单样式与应用一致

## 整体规划概述

### 项目目标
为 AetherLink_z 的消息块添加长按拓展功能,首期实现**复制消息内容**,并为后续的**重新发送**(用户消息)和**重新生成**(助手消息)功能预留接口。

### 技术栈
- **UI 组件**: React Native Paper 5.14.5 (Menu, Menu.Item)
- **复制功能**: expo-clipboard
- **手势交互**: React Native Pressable (onLongPress)
- **主题系统**: React Native Paper useTheme
- **TypeScript**: 严格模式,类型安全

### 主要阶段

#### 阶段 1: 环境准备与依赖安装
安装必要的依赖库并验证可用性。

#### 阶段 2: 复制功能实现
实现消息内容复制核心逻辑,包括菜单显示和复制操作。

#### 阶段 3: 用户体验优化
优化交互反馈、样式适配和错误处理。

#### 阶段 4: 功能扩展接口
为未来的重新发送/重新生成功能预留接口。

---

## 详细任务分解

### 阶段 1: 环境准备与依赖安装

#### 任务 1.1: 安装 expo-clipboard 依赖
- **目标**: 添加剪贴板功能依赖
- **输入**: package.json
- **输出**: 安装成功的 expo-clipboard 包
- **涉及文件**:
  - `package.json` (添加依赖)
- **执行命令**:
  ```bash
  npx expo install expo-clipboard
  ```
- **预估工作量**: 5 分钟

#### 任务 1.2: 验证 React Native Paper Menu 组件可用性
- **目标**: 确认 Menu 组件可正常使用
- **输入**: react-native-paper 库
- **输出**: Menu 组件可用性验证
- **涉及文件**:
  - `components/chat/MessageBubble.tsx` (测试导入)
- **验证方式**:
  ```typescript
  import { Menu } from 'react-native-paper';
  ```
- **预估工作量**: 5 分钟

---

### 阶段 2: 复制功能实现

#### 任务 2.1: 在 MessageBubble 中添加菜单状态管理
- **目标**: 添加菜单显示/隐藏状态和锚点位置
- **输入**: MessageBubble 组件当前实现
- **输出**: 菜单状态管理逻辑
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**:
  ```typescript
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState({ x: 0, y: 0 });

  const openMenu = (event: any) => {
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setMenuVisible(true);
  };

  const closeMenu = () => setMenuVisible(false);
  ```
- **预估工作量**: 15 分钟

#### 任务 2.2: 修改消息气泡容器,添加长按手势
- **目标**: 将消息气泡容器从 View 改为 Pressable,支持长按
- **输入**: MessageBubble 的气泡容器 View (第 189-325 行)
- **输出**: 支持长按的 Pressable 容器
- **涉及文件**:
  - `components/chat/MessageBubble.tsx` (修改第 189 行的 View)
- **实现要点**:
  ```typescript
  <Pressable
    onLongPress={openMenu}
    delayLongPress={500} // 长按 500ms 触发
    style={({ pressed }) => [
      {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: isUser
          ? theme.dark ? '#BA68C8' : '#E1BEE7'
          : theme.dark
            ? theme.colors.surfaceVariant
            : '#F0F0F0',
        opacity: pressed ? 0.8 : 1, // 按下时稍微变暗
      }
    ]}
  >
    {/* 原有的消息内容 */}
  </Pressable>
  ```
- **预估工作量**: 20 分钟

#### 任务 2.3: 实现复制消息内容功能
- **目标**: 创建复制消息内容的核心函数
- **输入**: 消息文本内容 (content prop)
- **输出**: 将文本复制到系统剪贴板,并显示成功提示
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**:
  ```typescript
  import * as Clipboard from 'expo-clipboard';
  import { Alert } from 'react-native';

  const handleCopyMessage = async () => {
    try {
      await Clipboard.setStringAsync(content);
      closeMenu();
      // 使用统一的确认对话框 Hook (已在项目中可用)
      // 或使用 Alert (更轻量,适合复制这类简单操作)
      Alert.alert('已复制', '消息内容已复制到剪贴板');
    } catch (error: any) {
      logger.error('[MessageBubble] 复制失败:', error);
      Alert.alert('错误', '复制失败,请重试');
    }
  };
  ```
- **预估工作量**: 15 分钟

#### 任务 2.4: 添加 Menu 组件渲染
- **目标**: 在 MessageBubble 中添加 Menu 组件,显示复制选项
- **输入**: 菜单状态、复制函数
- **输出**: 可交互的上下文菜单
- **涉及文件**:
  - `components/chat/MessageBubble.tsx` (在组件末尾,图片查看器之前)
- **实现要点**:
  ```typescript
  <Menu
    visible={menuVisible}
    onDismiss={closeMenu}
    anchor={menuAnchor}
    anchorPosition="top" // 菜单在锚点上方显示
    contentStyle={{
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      minWidth: 160,
    }}
  >
    <Menu.Item
      onPress={handleCopyMessage}
      title="复制"
      leadingIcon="content-copy"
      titleStyle={{ fontSize: 15 }}
    />

    {/* TODO: 未来功能 - 重新发送(仅用户消息) */}
    {/* {isUser && (
      <Menu.Item
        onPress={handleResend}
        title="重新发送"
        leadingIcon="send"
        titleStyle={{ fontSize: 15 }}
      />
    )} */}

    {/* TODO: 未来功能 - 重新生成(仅助手消息) */}
    {/* {!isUser && (
      <Menu.Item
        onPress={handleRegenerate}
        title="重新生成"
        leadingIcon="refresh"
        titleStyle={{ fontSize: 15 }}
      />
    )} */}
  </Menu>
  ```
- **预估工作量**: 20 分钟

---

### 阶段 3: 用户体验优化

#### 任务 3.1: 优化长按视觉反馈
- **目标**: 长按时提供视觉反馈,提升用户体验
- **输入**: Pressable 组件的 pressed 状态
- **输出**: 按下时气泡稍微变暗或缩放
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**:
  ```typescript
  // 在 Pressable 的 style 函数中
  style={({ pressed }) => [
    {
      opacity: pressed ? 0.8 : 1,
      transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
    }
  ]}
  ```
- **预估工作量**: 10 分钟

#### 任务 3.2: 处理空内容和特殊消息类型
- **目标**: 对空消息或特殊消息禁用复制功能
- **输入**: content prop, status prop
- **输出**: 条件性显示/禁用菜单项
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**:
  ```typescript
  // 在 Pressable 的 onLongPress 中
  onLongPress={content && content.trim().length > 0 ? openMenu : undefined}

  // 或在 Menu.Item 中禁用
  <Menu.Item
    onPress={handleCopyMessage}
    title="复制"
    leadingIcon="content-copy"
    disabled={!content || content.trim().length === 0 || status === 'pending'}
  />
  ```
- **预估工作量**: 15 分钟

#### 任务 3.3: 添加触觉反馈(Haptic Feedback)
- **目标**: 长按时提供触觉反馈(可选,增强体验)
- **输入**: expo-haptics (Expo 已内置)
- **输出**: 长按时震动反馈
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**:
  ```typescript
  import * as Haptics from 'expo-haptics';

  const openMenu = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setMenuVisible(true);
  };
  ```
- **预估工作量**: 10 分钟

#### 任务 3.4: 测试跨平台兼容性
- **目标**: 在 iOS、Android、Web 上测试功能
- **输入**: 已实现的长按复制功能
- **输出**: 验证各平台表现一致
- **涉及文件**: 无(测试活动)
- **测试要点**:
  - iOS: 长按触发、菜单位置、复制功能
  - Android: 长按触发、菜单位置、复制功能、原生菜单不冲突
  - Web: 长按触发、菜单位置、复制功能
- **预估工作量**: 30 分钟

---

### 阶段 4: 功能扩展接口

#### 任务 4.1: 为 MessageBubble 添加可选回调 props
- **目标**: 添加 props 接口,为未来功能预留扩展点
- **输入**: MessageBubbleProps 接口定义
- **输出**: 扩展后的 props 接口
- **涉及文件**:
  - `components/chat/MessageBubble.tsx` (第 27-37 行)
- **实现要点**:
  ```typescript
  interface MessageBubbleProps {
    content: string;
    isUser: boolean;
    timestamp?: string;
    status?: 'pending' | 'sent' | 'failed';
    attachments?: Attachment[];
    thinkingChain?: ThinkingChain | null;
    modelId?: string;
    extra?: Message['extra'];
    userAvatarUri?: string | null;

    // 新增: 功能扩展回调
    onResend?: () => void;      // TODO: 重新发送(用户消息)
    onRegenerate?: () => void;  // TODO: 重新生成(助手消息)
  }
  ```
- **预估工作量**: 5 分钟

#### 任务 4.2: 在菜单中添加注释掉的重新发送/重新生成选项
- **目标**: 在代码中预留菜单项,方便未来实现
- **输入**: Menu 组件实现
- **输出**: 带有 TODO 注释的菜单项代码
- **涉及文件**:
  - `components/chat/MessageBubble.tsx`
- **实现要点**: (已在任务 2.4 中实现)
- **预估工作量**: 已包含在任务 2.4

#### 任务 4.3: 更新 MessageList 组件,传递消息操作回调
- **目标**: 在 MessageList 中为 MessageBubble 传递回调函数(暂时为空)
- **输入**: MessageList 组件当前实现
- **输出**: 带有空回调的 MessageBubble 调用
- **涉及文件**:
  - `components/chat/MessageList.tsx`
- **实现要点**:
  ```typescript
  <MessageBubble
    content={msg.content}
    isUser={msg.role === 'user'}
    // ... 其他 props
    // TODO: 未来实现
    // onResend={() => handleResendMessage(msg.id)}
    // onRegenerate={() => handleRegenerateMessage(msg.id)}
  />
  ```
- **预估工作量**: 5 分钟

#### 任务 4.4: 创建功能扩展文档
- **目标**: 记录未来功能的实现思路
- **输入**: 当前实现和设计思路
- **输出**: 文档文件
- **涉及文件**:
  - `docs/MESSAGE_ACTIONS.md` (新建)
- **文档内容**:
  - 当前已实现功能(复制)
  - 未来功能设计(重新发送、重新生成)
  - 技术实现思路
  - 接口设计说明
- **预估工作量**: 20 分钟

---

## 需要进一步明确的问题

### 问题 1: 复制成功提示方式

复制成功后,应该如何提示用户?

**推荐方案**:

- **方案 A: Alert 对话框** (当前规划采用)
  - 优点: 实现简单,跨平台一致性好,不需要额外组件
  - 缺点: 需要用户点击确认,稍显打断

- **方案 B: Toast 提示** (需要新增 Toast 组件或库)
  - 优点: 非侵入式,用户体验更流畅
  - 缺点: 需要引入 Toast 组件(如 react-native-toast-message)或自己实现

- **方案 C: Snackbar** (React Native Paper 自带)
  - 优点: Material Design 规范,Paper 已有 Snackbar 组件
  - 缺点: 需要在父组件中管理 Snackbar 状态(Portal)

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - Alert 对话框 (推荐,简单快速)
[ ] 方案 B - Toast 提示 (需要新增依赖)
[ ] 方案 C - Snackbar (Paper 自带,需要重构)
[ ] 其他方案: ___________
```

### 问题 2: 菜单项图标风格

菜单项应该使用什么样的图标和样式?

**推荐方案**:

- **方案 A: 仅图标 + 文字** (当前规划采用)
  - leadingIcon 属性显示图标
  - 简洁清晰,符合 Material Design

- **方案 B: 彩色图标 + 文字**
  - 不同操作使用不同颜色的图标(如删除用红色)
  - 更直观,但可能过于花哨

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - 仅图标 + 文字 (推荐)
[ ] 方案 B - 彩色图标 + 文字
[ ] 其他方案: ___________
```

### 问题 3: 长按延迟时间

长按多久后触发菜单?

**推荐方案**:

- **方案 A: 500ms** (当前规划采用)
  - 中等延迟,平衡误触和响应速度

- **方案 B: 300ms**
  - 更快响应,但可能增加误触

- **方案 C: 700ms**
  - 减少误触,但响应较慢

**等待用户选择**:
```
请选择您偏好的方案,或提供其他建议:
[ ] 方案 A - 500ms (推荐)
[ ] 方案 B - 300ms (快速响应)
[ ] 方案 C - 700ms (防止误触)
[ ] 其他时长: _____ ms
```

---

## 用户反馈区域

请在此区域补充您对整体规划的意见和建议:

```
用户补充内容:


---


---


---

```

---

## 验收标准

### 功能验收
- [ ] 长按消息块 500ms 后弹出菜单
- [ ] 菜单显示"复制"选项
- [ ] 点击"复制"后消息内容成功复制到剪贴板
- [ ] 复制成功后显示提示信息
- [ ] 空消息或 pending 状态消息不显示/禁用复制功能
- [ ] 菜单外点击或操作后自动关闭

### 用户体验验收
- [ ] 长按时有视觉反馈(透明度变化或缩放)
- [ ] 触觉反馈流畅自然(如实现)
- [ ] 菜单位置合理,不遮挡消息内容
- [ ] 主题适配正确(深色/浅色模式)

### 跨平台验证
- [ ] iOS 平台功能正常
- [ ] Android 平台功能正常
- [ ] Web 平台功能正常(如适用)

### 代码质量验收
- [ ] TypeScript 类型定义完整,无 any 类型
- [ ] 代码符合项目编码规范
- [ ] 使用统一的 logger 工具,无 console.* 调用
- [ ] 关键逻辑添加注释
- [ ] 为未来功能预留清晰的 TODO 标记

---

## 风险识别与应对

### 风险 1: Menu 组件锚点位置不准确
**风险描述**: React Native Paper 的 Menu 组件可能在某些平台上锚点位置计算不准确,导致菜单位置偏移。

**应对措施**:
- 在多个平台上充分测试
- 如果 Menu 组件不理想,可考虑使用底部弹出菜单(参考 AttachmentMenu)
- 备选方案: 使用 react-native-popup-menu 或自定义菜单组件

### 风险 2: 长按与滚动手势冲突
**风险描述**: 用户在滚动消息列表时可能误触长按,或长按时列表滚动。

**应对措施**:
- 调整 delayLongPress 时长(建议 500ms)
- 测试滚动场景,必要时禁用滚动中的长按
- 使用 react-native-gesture-handler 的手势优先级机制(如需要)

### 风险 3: 复制内容格式问题
**风险描述**: AI 消息包含 Markdown 或数学公式,直接复制可能不符合用户预期。

**应对措施**:
- 用户消息: 直接复制纯文本
- AI 消息: 默认复制原始 Markdown 文本(保留格式)
- 可在未来添加"复制为纯文本"和"复制为 Markdown"两个选项

---

## 实施步骤建议

### 第一步: 快速原型验证 (30 分钟)
1. 安装 expo-clipboard
2. 在 MessageBubble 中实现最小化的长按复制功能
3. 验证 Menu 组件在目标平台上的表现

### 第二步: 完整功能实现 (1-1.5 小时)
1. 按阶段 2 的任务顺序实现复制功能
2. 添加菜单状态管理
3. 集成 Menu 组件

### 第三步: 用户体验优化 (30-45 分钟)
1. 实现视觉反馈和触觉反馈
2. 处理边界情况和错误
3. 跨平台测试

### 第四步: 接口预留与文档 (30 分钟)
1. 添加扩展接口
2. 编写功能文档
3. 代码审查和优化

### 总预估工作量: 2.5 - 3 小时

---

## 相关文件清单

### 需要修改的文件
- `components/chat/MessageBubble.tsx` - 核心实现文件
- `components/chat/MessageList.tsx` - 传递回调函数
- `package.json` - 添加 expo-clipboard 依赖

### 需要新建的文件
- `docs/MESSAGE_ACTIONS.md` - 消息操作功能文档

### 相关参考文件
- `components/chat/MoreActionsMenu.tsx` - 底部菜单参考实现
- `components/common/CLAUDE.md` - 通用组件文档
- `docs/DIALOG_USAGE.md` - 弹窗使用指南

---

## 后续迭代计划

### 第二期: 重新发送功能 (用户消息)
- 实现消息重新发送逻辑
- 在 ChatInput 中添加发送消息的辅助方法
- 更新 MessageList 传递 onResend 回调

### 第三期: 重新生成功能 (助手消息)
- 实现 AI 响应重新生成逻辑
- 删除旧响应,触发新的 AI 调用
- 更新 MessageList 传递 onRegenerate 回调

### 第四期: 高级功能
- 消息编辑功能
- 消息引用回复
- 消息分享到其他应用
- 消息翻译功能

---

## 变更记录

### 2025-11-14
- 创建消息块长按拓展功能规划文档
- 定义四个实施阶段和详细任务分解
- 识别技术方案和潜在风险
- 预留未来功能扩展接口
