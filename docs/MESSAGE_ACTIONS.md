# 消息操作功能文档

## 概述

本文档记录 AetherLink_z 消息块的长按交互功能设计和实现思路，包括已实现的功能和未来规划的功能扩展。

## 当前实现状态

### ✅ 已实现功能

#### 1. 长按复制消息内容

**功能描述**：
- 用户长按消息气泡（500ms 触发）
- 弹出上下文菜单，显示"复制"选项
- 点击"复制"后，消息内容复制到系统剪贴板
- 显示 Alert 提示"已复制"

**技术实现**：
- 组件：`components/chat/MessageBubble.tsx`
- 手势检测：使用 React Native `Pressable` 的 `onLongPress` 事件
- 菜单组件：React Native Paper 的 `Menu` 和 `Menu.Item`
- 复制功能：`expo-clipboard` 的 `setStringAsync` API
- 触觉反馈：`expo-haptics` 的 `impactAsync` API

**用户体验优化**：
- 长按延迟：500ms（平衡误触和响应速度）
- 视觉反馈：按下时气泡透明度降低至 0.8，缩放至 0.98
- 触觉反馈：长按触发时产生 Medium 强度震动
- 边界处理：空消息或 pending 状态消息禁用复制功能

**代码示例**：
```typescript
// 长按触发菜单
<Pressable
  onLongPress={content && content.trim().length > 0 && status !== 'pending' ? openMenu : undefined}
  delayLongPress={500}
  style={({ pressed }) => ({
    opacity: pressed ? 0.8 : 1,
    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
  })}
>
  {/* 消息内容 */}
</Pressable>

// 复制功能实现
const handleCopyMessage = async () => {
  try {
    await Clipboard.setStringAsync(content);
    closeMenu();
    Alert.alert('已复制', '消息内容已复制到剪贴板');
  } catch (error) {
    logger.error('[MessageBubble] 复制失败:', error);
    Alert.alert('错误', '复制失败，请重试');
  }
};
```

---

## 未来功能规划

### 🚧 待实现功能

#### 2. 重新发送消息（用户消息）

**功能描述**：
- 仅在用户消息上显示"重新发送"选项
- 点击后将该消息内容重新发送给 AI
- 适用场景：消息发送失败或需要重新提问

**技术实现思路**：

1. **接口扩展**：
   - `MessageBubble` 组件已预留 `onResend?: () => void` 回调
   - `MessageList` 组件需要实现 `handleResendMessage(messageId: string)` 方法

2. **实现步骤**：
   ```typescript
   // 在 MessageList.tsx 中
   const handleResendMessage = useCallback(async (messageId: string) => {
     try {
       // 1. 从数据库读取原消息内容和附件
       const message = await MessageRepository.getById(messageId);
       if (!message) return;

       // 2. 调用 ChatInput 的发送逻辑（需要暴露发送方法）
       //    或直接在这里复制发送逻辑

       // 3. 可选：删除原消息或标记为"已重新发送"
     } catch (error) {
       logger.error('[MessageList] 重新发送失败:', error);
       Alert.alert('错误', '重新发送失败，请重试');
     }
   }, []);

   // 传递给 MessageBubble
   <MessageBubble
     onResend={item.role === 'user' ? () => handleResendMessage(item.id) : undefined}
   />
   ```

3. **菜单显示条件**：
   ```typescript
   {isUser && onResend && (
     <Menu.Item
       onPress={handleResend}
       title="重新发送"
       leadingIcon="send"
       titleStyle={{ fontSize: 15 }}
     />
   )}
   ```

4. **注意事项**：
   - 需要考虑是否保留原消息（建议保留，标记为"已重新发送"）
   - 如果原消息有附件，需要一并重新发送
   - 考虑用户确认机制（避免误操作）

---

#### 3. 重新生成消息（助手消息）

**功能描述**：
- 仅在助手消息上显示"重新生成"选项
- 点击后删除当前助手响应，重新调用 AI 生成新响应
- 适用场景：AI 响应不满意或需要重新生成

**技术实现思路**：

1. **接口扩展**：
   - `MessageBubble` 组件已预留 `onRegenerate?: () => void` 回调
   - `MessageList` 组件需要实现 `handleRegenerateMessage(messageId: string)` 方法

2. **实现步骤**：
   ```typescript
   // 在 MessageList.tsx 或 ChatInput.tsx 中
   const handleRegenerateMessage = useCallback(async (messageId: string) => {
     try {
       // 1. 获取当前助手消息
       const assistantMessage = await MessageRepository.getById(messageId);
       if (!assistantMessage || assistantMessage.role !== 'assistant') return;

       // 2. 获取上一条用户消息（作为上下文）
       const userMessage = await MessageRepository.getPreviousUserMessage(messageId);
       if (!userMessage) return;

       // 3. 删除当前助手消息（包括附件、思考链等）
       await MessageRepository.delete(messageId);
       await AttachmentRepository.deleteByMessageId(messageId);
       await ThinkingChainRepository.deleteByMessageId(messageId);

       // 4. 重新调用 AI 生成（复用 ChatInput 的发送逻辑）
       //    传入用户消息 ID 和对话历史

       // 5. 触发 UI 刷新
       appEvents.emit(AppEvents.MESSAGE_CHANGED);
     } catch (error) {
       logger.error('[MessageList] 重新生成失败:', error);
       Alert.alert('错误', '重新生成失败，请重试');
     }
   }, []);

   // 传递给 MessageBubble
   <MessageBubble
     onRegenerate={item.role === 'assistant' ? () => handleRegenerateMessage(item.id) : undefined}
   />
   ```

3. **菜单显示条件**：
   ```typescript
   {!isUser && onRegenerate && (
     <Menu.Item
       onPress={handleRegenerate}
       title="重新生成"
       leadingIcon="refresh"
       titleStyle={{ fontSize: 15 }}
     />
   )}
   ```

4. **注意事项**：
   - 删除助手消息前应该提示用户确认（避免误操作）
   - 需要确保删除消息的同时删除关联数据（附件、思考链、消息块）
   - 重新生成时应使用相同的 AI 模型和参数
   - 考虑保留历史版本（可选功能）

---

## 其他潜在功能

### 💡 高级功能规划

#### 4. 消息编辑（用户消息）

**功能描述**：
- 用户可以编辑已发送的消息
- 编辑后可选择是否重新生成 AI 响应

**实现思路**：
- 使用 `InputDialog` 组件作为编辑界面
- 更新消息内容到数据库
- 提供"仅保存"和"保存并重新生成"两个选项

---

#### 5. 消息引用回复

**功能描述**：
- 长按消息后选择"引用回复"
- 在输入框中显示被引用的消息
- 发送时附带引用信息

**实现思路**：
- 在 ChatInput 组件中添加引用状态
- 使用 `extra` 字段存储引用关系
- 在 MessageBubble 中显示引用标记

---

#### 6. 消息分享

**功能描述**：
- 将消息内容分享到其他应用
- 支持文本、图片、文件等格式

**实现思路**：
- 使用 `expo-sharing` 的 `shareAsync` API
- 对于 AI 消息，可选择分享 Markdown 或纯文本
- 对于包含附件的消息，打包分享

---

#### 7. 消息翻译

**功能描述**：
- 长按消息选择"翻译"
- 调用翻译 API（如 OpenAI Translation）
- 在消息下方显示翻译结果

**实现思路**：
- 集成翻译 API
- 在 MessageBubble 中添加翻译结果显示区域
- 支持多语言翻译

---

## 接口设计说明

### MessageBubbleProps 接口

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

  // 功能扩展回调
  onResend?: () => void;      // 重新发送（用户消息）
  onRegenerate?: () => void;  // 重新生成（助手消息）

  // 未来可能扩展的回调
  // onEdit?: () => void;        // 编辑消息
  // onQuote?: () => void;       // 引用回复
  // onShare?: () => void;       // 分享消息
  // onTranslate?: () => void;   // 翻译消息
}
```

### 使用示例

```typescript
// 在 MessageList.tsx 中
<MessageBubble
  content={content}
  isUser={item.role === 'user'}
  // ... 其他 props
  onResend={item.role === 'user' ? () => handleResendMessage(item.id) : undefined}
  onRegenerate={item.role === 'assistant' ? () => handleRegenerateMessage(item.id) : undefined}
/>
```

---

## 测试计划

### 单元测试

- [ ] 长按手势触发测试
- [ ] 菜单显示/隐藏逻辑测试
- [ ] 复制功能测试（模拟 Clipboard API）
- [ ] 边界条件测试（空消息、pending 状态）

### 集成测试

- [ ] 用户消息长按显示复制选项
- [ ] 助手消息长按显示复制选项
- [ ] pending 状态消息禁用长按
- [ ] 空消息禁用长按

### 跨平台测试

- [ ] iOS 平台：长按触发、菜单位置、复制功能、触觉反馈
- [ ] Android 平台：长按触发、菜单位置、复制功能、触觉反馈
- [ ] Web 平台：长按触发、菜单位置、复制功能（无触觉反馈）

---

## 相关文件

### 已修改文件
- `components/chat/MessageBubble.tsx` - 核心实现文件
- `components/chat/MessageList.tsx` - 传递回调函数
- `package.json` - 添加 expo-clipboard 依赖

### 参考文档
- [React Native Paper - Menu](https://callstack.github.io/react-native-paper/docs/components/Menu)
- [Expo Clipboard](https://docs.expo.dev/versions/latest/sdk/clipboard/)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [React Native Pressable](https://reactnative.dev/docs/pressable)

---

## 变更记录

### 2025-11-14
- 创建消息操作功能文档
- 记录复制功能实现细节
- 规划重新发送/重新生成功能
- 提出高级功能设计思路
