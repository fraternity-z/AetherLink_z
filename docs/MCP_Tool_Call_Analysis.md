# Cherry Studio MCP 工具调用实现分析

## 项目概览

Cherry Studio 是一个现代化的 AI 聊天应用，采用**流式消息处理架构**实现 MCP 工具调用。整个系统围绕**块状管理（Block Manager）** 和 **流处理回调** 来组织。

---

## 核心架构流程

```
用户消息 → sendMessage()
    ↓
保存消息到 DB
    ↓
fetchAndProcessAssistantResponseImpl() → 创建 BlockManager + Callbacks
    ↓
createCallbacks() → 创建各类回调（工具、文本、思考等）
    ↓
createStreamProcessor() → 将回调包装为流处理器
    ↓
transformMessagesAndFetch() → 调用 AI 服务
    ↓
AI 返回流 → 逐块处理
    ↓
工具调用流程：
  1. onToolCallPending → 创建 TOOL 块，状态 = PENDING
  2. onToolCallInProgress → 更新块状态 = 执行中
  3. onToolCallComplete → 更新块状态 = SUCCESS/ERROR，保存结果
    ↓
继续 AI 对话（使用工具结果作为上下文）
```

---

## 1. 工具调用回调处理

### 文件位置
`E:\code\cherry-studio-app-main\src\services\messageStreaming\callbacks\toolCallbacks.ts`

### onToolCallPending - 工具调用待执行

```typescript
onToolCallPending: (toolResponse: MCPToolResponse) => {
  if (blockManager.hasInitialPlaceholder) {
    // 复用初始占位符块
    const changes = {
      type: MessageBlockType.TOOL,
      status: MessageBlockStatus.PENDING,
      toolName: toolResponse.tool.name,
      metadata: { rawMcpToolResponse: toolResponse }
    }
    toolBlockId = blockManager.initialPlaceholderBlockId!
    blockManager.smartBlockUpdate(toolBlockId, changes, MessageBlockType.TOOL)
    toolCallIdToBlockIdMap.set(toolResponse.id, toolBlockId)
  } else {
    // 创建新的 TOOL 块
    const toolBlock = createToolBlock(assistantMsgId, toolResponse.id, {
      toolName: toolResponse.tool.name,
      status: MessageBlockStatus.PENDING,
      metadata: { rawMcpToolResponse: toolResponse }
    })
    toolBlockId = toolBlock.id
    blockManager.handleBlockTransition(toolBlock, MessageBlockType.TOOL)
    toolCallIdToBlockIdMap.set(toolResponse.id, toolBlock.id)
  }
}
```

**作用：**
- 创建 TOOL 消息块，标记为 PENDING 状态
- 建立 toolId → blockId 的映射，用于后续更新
- 存储原始 MCP 工具响应供日后引用

### onToolCallComplete - 工具执行完成

```typescript
onToolCallComplete: (toolResponse: MCPToolResponse) => {
  const existingBlockId = toolCallIdToBlockIdMap.get(toolResponse.id)
  toolCallIdToBlockIdMap.delete(toolResponse.id)

  if (toolResponse.status === 'done' || toolResponse.status === 'error') {
    // 确定最终状态
    const finalStatus =
      toolResponse.status === 'done' || toolResponse.status === 'cancelled'
        ? MessageBlockStatus.SUCCESS
        : MessageBlockStatus.ERROR

    const changes: Partial<ToolMessageBlock> = {
      content: toolResponse.response,
      status: finalStatus,
      metadata: { rawMcpToolResponse: toolResponse }
    }

    if (finalStatus === MessageBlockStatus.ERROR) {
      changes.error = {
        message: `Tool execution failed/error`,
        details: toolResponse.response,
        name: null,
        stack: null
      }
    }

    blockManager.smartBlockUpdate(existingBlockId, changes, MessageBlockType.TOOL, true)

    // 如果是网络搜索工具，创建引用块
    if (toolResponse.tool.name === 'builtin_web_search' && toolResponse.response) {
      const citationBlock = createCitationBlock(...)
      blockManager.handleBlockTransition(citationBlock, MessageBlockType.CITATION)
    }
  }
}
```

**作用：**
- 更新工具块的最终状态（SUCCESS/ERROR）
- 存储工具执行结果到块的 `content` 字段
- 处理特殊工具（如网络搜索）的引用块创建

---

## 2. 工具调用状态管理

### 文件位置
`E:\code\cherry-studio-app-main\src\services\messageStreaming\BlockManager.ts`

### 智能块更新策略

```typescript
async smartBlockUpdate(
  blockId: string,
  changes: Partial<MessageBlock>,
  blockType: MessageBlockType,
  isComplete: boolean = false
) {
  const isBlockTypeChanged = this._lastBlockType !== null && this._lastBlockType !== blockType

  if (isBlockTypeChanged || isComplete) {
    // 块类型改变或块完成 → 立即写入 DB
    if (isBlockTypeChanged && this._activeBlockInfo) {
      await this.deps.cancelThrottledBlockUpdate(this._activeBlockInfo.id)
    }
    if (isComplete) {
      await this.deps.cancelThrottledBlockUpdate(blockId)
      this._activeBlockInfo = null
    }
    
    await messageBlockDatabase.updateOneBlock({ id: blockId, changes })
    this._lastBlockType = blockType
  } else {
    // 同类型块 → 使用节流批量更新
    this._activeBlockInfo = { id: blockId, type: blockType }
    await this.deps.throttledBlockUpdate(blockId, changes)
  }
}
```

**特点：**
- **块类型改变时立即写入DB** - 确保工具结果立即持久化
- **同类型块使用节流** - 提升性能，防止过度写入
- **批量缓存策略** - 180ms 内合并相同块的更新

---

## 3. 消息流处理管道

### 文件位置
`E:\code\cherry-studio-app-main\src\services\StreamProcessingService.ts`

### 流处理回调接口

```typescript
export interface StreamProcessorCallbacks {
  // 工具调用回调
  onToolCallPending?: (toolResponse: MCPToolResponse) => void
  onToolCallInProgress?: (toolResponse: MCPToolResponse) => void
  onToolCallComplete?: (toolResponse: MCPToolResponse) => void
  
  // 文本内容回调
  onTextStart?: () => void
  onTextChunk?: (text: string) => void
  onTextComplete?: (text: string) => void
  
  // 思考过程回调
  onThinkingStart?: () => void
  onThinkingChunk?: (text: string, thinking_millsec?: number) => void
  
  // 其他回调
  onError?: (error: any) => void
  onComplete?: (status: AssistantMessageStatus, response?: Response) => void
}
```

### 流块处理器

```typescript
export function createStreamProcessor(callbacks: StreamProcessorCallbacks = {}) {
  return (chunk: Chunk) => {
    switch (data.type) {
      case ChunkType.MCP_TOOL_PENDING: {
        if (callbacks.onToolCallPending)
          data.responses.forEach(toolResp => callbacks.onToolCallPending!(toolResp))
        break
      }

      case ChunkType.MCP_TOOL_COMPLETE: {
        if (callbacks.onToolCallComplete && data.responses.length > 0) {
          data.responses.forEach(toolResp => callbacks.onToolCallComplete!(toolResp))
        }
        break
      }

      case ChunkType.TEXT_DELTA: {
        if (callbacks.onTextChunk) callbacks.onTextChunk(data.text)
        break
      }
    }
  }
}
```

---

## 4. 工具调用后继续对话

### 文件位置
`E:\code\cherry-studio-app-main\src\services\MessagesService.ts`

### fetchAndProcessAssistantResponseImpl 函数

```typescript
export async function fetchAndProcessAssistantResponseImpl(
  topicId: string,
  assistant: Assistant,
  assistantMessage: Message
) {
  const assistantMsgId = assistantMessage.id

  try {
    await topicService.updateTopic(topicId, { isLoading: true })

    // 1. 创建块管理器
    const blockManager = new BlockManager({
      saveUpdatedBlockToDB,
      saveUpdatesToDB,
      assistantMsgId,
      topicId,
      throttledBlockUpdate,
      cancelThrottledBlockUpdate
    })

    // 2. 获取上下文消息（包含工具结果）
    const allMessagesForTopic = await messageDatabase.getMessagesByTopicId(topicId)
    const userMessageId = assistantMessage.askId
    const userMessageIndex = allMessagesForTopic.findIndex(m => m?.id === userMessageId)
    const messagesForContext = allMessagesForTopic
      .slice(0, userMessageIndex + 1)
      .filter(m => m && !m.status?.includes('ing'))

    // 3. 创建回调组
    const callbacks = await createCallbacks({
      blockManager,
      topicId,
      assistantMsgId,
      saveUpdatesToDB,
      assistant
    })

    // 4. 创建流处理器
    const streamProcessorCallbacks = createStreamProcessor(callbacks)

    // 5. 发送请求并处理流
    await transformMessagesAndFetch(
      {
        messages: messagesForContext,  // ← 包含之前的工具结果
        assistant,
        topicId,
        options: { signal: abortController.signal, timeout: 30000 }
      },
      streamProcessorCallbacks
    )
  } catch (error) {
    logger.error('Error in fetchAndProcessAssistantResponseImpl:', error)
    await callbacks.onError?.(error)
  } finally {
    await topicService.updateTopic(topicId, { isLoading: false })
    await fetchTopicNaming(topicId)
  }
}
```

**关键点：**
- **工具执行完成后自动继续**：工具块的内容保存到数据库后，消息被添加到上下文
- **下一次 AI 请求包含工具结果**：messagesForContext 包含所有之前的消息和块（包括工具块）
- **AI 模型看到完整上下文**：模型可以基于工具结果生成后续回复

---

## 5. 消息和块的数据库操作

### 文件位置
`E:\code\cherry-studio-app-main\src\services\MessagesService.ts` (L256-405)

### 块批量更新策略

```typescript
const BLOCK_UPDATE_BATCH_INTERVAL = 180  // 180ms 批处理间隔

const pendingBlockUpdates = new Map<string, BlockUpdatePayload>()

// 节流块更新
export const throttledBlockUpdate = async (id: string, blockUpdate: BlockUpdatePayload) => {
  const merged = mergeBlockUpdates(pendingBlockUpdates.get(id), blockUpdate)
  pendingBlockUpdates.set(id, merged)
  scheduleBlockFlush()
}

// 取消节流并等待写入完成
export const cancelThrottledBlockUpdate = async (id: string) => {
  pendingBlockUpdates.delete(id)
  await waitForCurrentBlockFlush()
}
```

**设计优势：**
- **性能优化**：合并快速连续的更新
- **数据一致性**：块完成时强制刷新到 DB
- **内存效率**：避免单个块频繁写入 DB

---

## 6. 工具执行结果展示

### 文件位置
`E:\code\cherry-studio-app-main\src\utils\messageUtils\create.ts` (L214-244)

### 工具块创建

```typescript
export function createToolBlock(
  messageId: string,
  toolId: string,
  overrides: Partial<Omit<ToolMessageBlock, 'id' | 'messageId' | 'type' | 'toolId'>> = {}
): ToolMessageBlock {
  let initialStatus = MessageBlockStatus.PROCESSING

  if (overrides.content !== undefined || overrides.error !== undefined) {
    initialStatus = overrides.error ? MessageBlockStatus.ERROR : MessageBlockStatus.SUCCESS
  }

  const { toolName, arguments: args, content, error, metadata, ...baseOnlyOverrides } = overrides
  const baseBlock = createBaseMessageBlock(messageId, MessageBlockType.TOOL, {
    status: initialStatus,
    error: error,
    metadata: metadata,
    ...baseOnlyOverrides
  })

  return {
    ...baseBlock,
    toolId,
    toolName,
    arguments: args,
    content  // ← 工具执行结果
  }
}
```

### 工具块结构

```typescript
export interface ToolMessageBlock extends BaseMessageBlock {
  type: MessageBlockType.TOOL
  toolId: string                      // 工具ID
  toolName?: string                   // 工具名称
  arguments?: Record<string, unknown> // 调用参数
  content?: string                    // 执行结果
  status: MessageBlockStatus          // PENDING → SUCCESS/ERROR
  error?: SerializedError             // 错误信息（如果失败）
  metadata?: {
    rawMcpToolResponse: MCPToolResponse
  }
}
```

---

## 7. 完整的工具调用流程

### 步骤 1: 用户发送消息
```typescript
const { message: userMessage, blocks: userMessageBlocks } = getUserMessage({
  assistant,
  topic,
  content: "查询最新新闻"
})
await sendMessage(userMessage, userMessageBlocks, assistant, topicId)
```

### 步骤 2: AI 返回工具调用
AI 模型输出工具调用指令

### 步骤 3: 工具调用待执行
```typescript
onToolCallPending({
  id: "call_123",
  tool: { name: "web_search" },
  status: "pending"
})
// 创建 TOOL 块，status = PENDING
```

### 步骤 4: 工具执行完成
```typescript
onToolCallComplete({
  id: "call_123",
  tool: { name: "web_search" },
  response: "[{\"title\": \"...\", \"url\": \"...\"}]",
  status: "done"
})
// 更新 TOOL 块状态为 SUCCESS
// 保存结果到 content 字段
// 创建 CITATION 块展示搜索结果
```

### 步骤 5: 继续 AI 对话
```typescript
// 新的 AI 请求包含完整上下文：
[
  { role: "user", content: "查询最新新闻" },
  { role: "assistant", content: "我会帮你搜索...", tool_calls: [...] },
  { role: "user", content: "[搜索结果]", tool_call_id: "call_123" }  // ← 工具结果
]

// AI 生成最终回复
onTextComplete("根据最新搜索结果，以下是最新新闻...")
// 创建 MAIN_TEXT 块
```

---

## 8. 关键文件索引

| 文件路径 | 职责 | 关键函数 |
|---------|------|----------|
| `callbacks/toolCallbacks.ts` | 工具调用回调处理 | `onToolCallPending`, `onToolCallComplete` |
| `BlockManager.ts` | 块状态管理 | `smartBlockUpdate`, `handleBlockTransition` |
| `StreamProcessingService.ts` | 流处理管道 | `createStreamProcessor` |
| `MessagesService.ts` | 消息发送和处理 | `sendMessage`, `fetchAndProcessAssistantResponseImpl` |
| `types/message.ts` | 消息类型定义 | `ToolMessageBlock`, `MessageBlockStatus` |
| `types/mcp.ts` | MCP 类型定义 | `MCPToolResponse` |
| `utils/messageUtils/create.ts` | 块创建工厂 | `createToolBlock` |
| `callbacks/index.ts` | 回调组合 | `createCallbacks` |
| `callbacks/textCallbacks.ts` | 文本块回调 | `onTextStart`, `onTextChunk` |
| `callbacks/baseCallbacks.ts` | 基础回调处理 | `onError`, `onComplete` |

---

## 9. 消息状态流转

```
用户消息创建
    ↓
onLLMResponseCreated → 创建占位符块 (UNKNOWN, PROCESSING)
    ↓
    ├─ 工具调用分支:
    │  ├─ onToolCallPending → TOOL块 (PENDING)
    │  └─ onToolCallComplete → TOOL块 (SUCCESS/ERROR)
    │
    ├─ 文本内容分支:
    │  ├─ onTextStart → MAIN_TEXT块 (STREAMING)
    │  ├─ onTextChunk → 更新内容
    │  └─ onTextComplete → MAIN_TEXT块 (SUCCESS)
    │
    └─ 完成处理:
       ├─ onError → ERROR块 (ERROR)
       └─ onComplete → 消息状态更新
```

---

## 10. 性能优化特点

### 块批处理
- 180ms 缓冲间隔：文本流块快速更新时使用缓存
- 智能块类型检测：类型改变时立即刷新

### 数据库写入优化
```
同类型块: 节流缓存 → 批量写入
不同类型块: 立即写入 → 块类型转换
```

### 内存管理
- 及时清理完成的块的待写入队列
- 避免内存泄漏

---

## 11. 工具调用与继续对话的实现细节

### 消息上下文构建

```typescript
const messagesForContext = allMessagesForTopic
  .slice(0, userMessageIndex + 1)  // ← 包含用户消息及其前所有消息
  .filter(m => m && !m.status?.includes('ing'))

// messagesForContext 包含:
// 1. 用户消息 (USER)
// 2. 助手初始回复 (ASSISTANT, 包含工具调用)
// 3. 工具调用块 (TOOL, 包含结果) ← 关键！
// 4. 后续用户消息 (USER)

await transformMessagesAndFetch(
  {
    messages: messagesForContext,  // ← 传给 AI
    assistant,
    topicId,
    options: { signal, timeout }
  },
  streamProcessorCallbacks
)
```

---

## 12. 总结

Cherry Studio 的 MCP 工具调用实现具有以下特点：

✅ **流式架构**：实时处理每个工具调用阶段
✅ **块状管理**：清晰的消息块生命周期管理
✅ **智能缓存**：批量更新与立即写入的平衡
✅ **完整上下文**：工具结果自动包含在后续 AI 请求中
✅ **错误恢复**：完善的错误处理和状态管理
✅ **扩展性**：灵活的回调系统支持多种内容类型处理
