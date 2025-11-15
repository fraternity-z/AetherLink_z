# Cherry Studio MCP 工具执行分析报告

## 概述

Cherry Studio 的 MCP 工具注册和执行采用了**双轨道架构**：
1. **Native Tool Call** - 支持函数调用的模型（OpenAI, Anthropic, Google 等）
2. **Prompt-based Tool Use** - 不支持函数调用的模型（通过 XML 格式的 Prompt 模式）

---

## 一、工具的 Execute 函数实现

### 1.1 AI SDK 中的执行方式（Native Function Calling）

**位置**: `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/ToolExecutor.ts`

```typescript
export class ToolExecutor {
  /**
   * 执行多个工具调用
   * 关键点：execute 是异步函数，需要通过 tool.execute() 调用
   */
  async executeTools(
    toolUses: ToolUseResult[],
    tools: ToolSet,
    controller: StreamController
  ): Promise<ExecutedResult[]> {
    const executedResults: ExecutedResult[] = []
    for (const toolUse of toolUses) {
      try {
        const tool = tools[toolUse.toolName]
        if (!tool || typeof tool.execute !== 'function') {
          throw new Error(`Tool "${toolUse.toolName}" has no execute method`)
        }

        // 发送工具调用事件
        controller.enqueue({
          type: 'tool-call',
          toolCallId: toolUse.id,
          toolName: toolUse.toolName,
          input: toolUse.arguments
        })

        // 异步执行工具 - execute 函数签名来自 AI SDK
        const result = await tool.execute(toolUse.arguments, {
          toolCallId: toolUse.id,
          messages: [],
          abortSignal: new AbortController().signal
        })

        // 发送工具结果事件
        controller.enqueue({
          type: 'tool-result',
          toolCallId: toolUse.id,
          toolName: toolUse.toolName,
          input: toolUse.arguments,
          output: result
        })

        executedResults.push({
          toolCallId: toolUse.id,
          toolName: toolUse.toolName,
          result,
          isError: false
        })
      } catch (error) {
        // 错误处理...
        const errorResult = this.handleToolError(toolUse, error, controller)
        executedResults.push(errorResult)
      }
    }
    return executedResults
  }
}
```

**关键特征**：
- ✅ **异步执行** (`async/await`)
- ✅ **必须提供 execute 函数** - 每个工具必须有 `execute` 方法
- ✅ **事件驱动** - 通过 StreamController 发送 tool-call、tool-result、tool-error 事件
- ✅ **支持 AbortSignal** - 支持取消工具调用
- ✅ **标准化输入** - `execute(args, { toolCallId, messages, abortSignal })`

---

## 二、MCP 工具执行路径

### 2.1 高级流程

```
MCP Tool Call Request
    ↓
window.api.mcp.callTool() (IPC)
    ↓
MCPService.callTool() (主进程)
    ↓
client.callTool() (MCP Client SDK)
    ↓
MCP Server callTool() 请求
    ↓
Tool Execution Result
```

### 2.2 IPC 层注册

**位置**: `src/main/ipc.ts` (第 722 行)

```typescript
ipcMain.handle(IpcChannel.Mcp_CallTool, mcpService.callTool)
```

渲染进程调用：
```typescript
// src/renderer/src/utils/mcp-tools.ts (第 145 行)
const resp = await window.api.mcp.callTool(
  {
    server,
    name: toolResponse.tool.name,
    args: toolResponse.arguments,
    callId: toolResponse.id
  },
  topicId ? currentSpan(topicId, modelName)?.spanContext() : undefined
)
```

### 2.3 MCPService.callTool() 完整实现

**位置**: `src/main/services/MCPService.ts` (第 658-714 行)

```typescript
public async callTool(
  _: Electron.IpcMainInvokeEvent,
  { server, name, args, callId }: CallToolArgs
): Promise<MCPCallToolResponse> {
  const toolCallId = callId || uuidv4()
  const abortController = new AbortController()
  
  // 保存 AbortController 用于后续取消
  this.activeToolCalls.set(toolCallId, abortController)

  const callToolFunc = async ({ server, name, args }: CallToolArgs) => {
    try {
      getServerLogger(server, { tool: name, callId: toolCallId }).debug(`Calling tool`, {
        args: redactSensitive(args)
      })
      
      // 解析字符串类型的参数
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args)
        } catch (e) {
          getServerLogger(server, { tool: name, callId: toolCallId }).error('args parse error', e as Error)
        }
        if (args === '') {
          args = {}
        }
      }
      
      // 初始化 MCP 客户端（支持缓存和复用）
      const client = await this.initClient(server)
      
      // 调用 MCP SDK 的 callTool 方法 - 这是关键的执行点
      const result = await client.callTool(
        { name, arguments: args },
        undefined,
        {
          // 进度回调
          onprogress: (process) => {
            getServerLogger(server, { tool: name, callId: toolCallId }).debug(`Progress`, {
              ratio: process.progress / (process.total || 1)
            })
            const mainWindow = windowService.getMainWindow()
            if (mainWindow) {
              mainWindow.webContents.send(IpcChannel.Mcp_Progress, {
                callId: toolCallId,
                progress: process.progress / (process.total || 1)
              } as MCPProgressEvent)
            }
          },
          // 超时配置
          timeout: server.timeout ? server.timeout * 1000 : 60000,
          resetTimeoutOnProgress: server.longRunning,
          maxTotalTimeout: server.longRunning ? 10 * 60 * 1000 : undefined,
          // AbortSignal 支持
          signal: this.activeToolCalls.get(toolCallId)?.signal
        }
      )
      return result as MCPCallToolResponse
    } catch (error) {
      getServerLogger(server, { tool: name, callId: toolCallId }).error(`Error calling tool`, error as Error)
      throw error
    } finally {
      this.activeToolCalls.delete(toolCallId)
    }
  }

  // 包装 withSpanFunc 用于追踪
  return await withSpanFunc(`${server.name}.${name}`, `MCP`, callToolFunc, [{ server, name, args }])
}
```

**关键特征**：
- ✅ **异步执行** (`async/await`)
- ✅ **执行在主进程** - 通过 MCP SDK 客户端
- ✅ **支持进度报告** - `onprogress` 回调
- ✅ **支持取消** - `AbortSignal`
- ✅ **支持长时间运行** - `maxTotalTimeout`
- ✅ **客户端缓存** - 同一服务器配置复用连接

---

## 三、工具转换为 AI SDK 格式

### 3.1 MCPTool → OpenAI Format

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 54-71 行)

```typescript
export function mcpToolsToOpenAIChatTools(mcpTools: MCPTool[]): Array<ChatCompletionTool> {
  return mcpTools.map((tool) => {
    const parameters = processSchemaForO3(tool.inputSchema)

    return {
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          ...parameters
        },
        strict: true  // 启用严格模式
      }
    } as ChatCompletionTool
  })
}
```

### 3.2 MCPTool → Anthropic Format

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 188-198 行)

```typescript
export function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): Array<ToolUnion> {
  return mcpTools.map((tool) => {
    const t: ToolUnion = {
      name: tool.id,
      description: tool.description,
      input_schema: tool.inputSchema  // 直接使用 JSON Schema
    }
    return t
  })
}
```

### 3.3 MCPTool → Gemini Format

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 219-236 行)

```typescript
export function mcpToolsToGeminiTools(mcpTools: MCPTool[]): Tool[] {
  return [
    {
      functionDeclarations: mcpTools?.map((tool) => {
        const filteredSchema = filterProperties(tool.inputSchema)
        return {
          name: tool.id,
          description: tool.description,
          parameters: {
            type: GeminiSchemaType.OBJECT,
            properties: filteredSchema.properties,
            required: tool.inputSchema.required
          }
        }
      })
    }
  ]
}
```

### 3.4 MCPTool → AWS Bedrock Format

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 676-704 行)

```typescript
export function mcpToolsToAwsBedrockTools(mcpTools: MCPTool[]): Array<AwsBedrockSdkTool> {
  return mcpTools.map((tool) => ({
    toolSpec: {
      name: tool.id,
      description: tool.description,
      inputSchema: {
        json: {
          type: 'object',
          properties: tool.inputSchema?.properties
            ? Object.fromEntries(
                Object.entries(tool.inputSchema.properties).map(([key, value]) => [
                  key,
                  {
                    type: typeof value === 'object' && value !== null && 'type' in value 
                      ? (value as any).type 
                      : 'string',
                    description: typeof value === 'object' && value !== null && 'description' in value
                      ? (value as any).description
                      : undefined
                  }
                ])
              )
            : {},
          required: tool.inputSchema?.required || []
        }
      }
    }
  }))
}
```

---

## 四、Prompt 模式工具使用（非函数调用模型）

### 4.1 工具转换为 Prompt 格式

**位置**: `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/promptToolUsePlugin.ts` (第 159-179 行)

```typescript
function buildAvailableTools(tools: ToolSet): string | null {
  const availableTools = Object.keys(tools)
  if (availableTools.length === 0) return null
  
  const result = availableTools
    .map((toolName: string) => {
      const tool = tools[toolName]
      return `
<tool>
  <name>${toolName}</name>
  <description>${tool.description || ''}</description>
  <arguments>
    ${tool.inputSchema ? JSON.stringify(tool.inputSchema) : ''}
  </arguments>
</tool>
`
    })
    .join('\n')
  
  return `<tools>
${result}
</tools>`
}
```

### 4.2 XML 格式工具调用解析

**位置**: `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/promptToolUsePlugin.ts` (第 199-252 行)

```typescript
function defaultParseToolUse(content: string, tools: ToolSet): { results: ToolUseResult[]; content: string } {
  if (!content || !tools || Object.keys(tools).length === 0) {
    return { results: [], content: content }
  }

  let contentToProcess = content
  
  // 如果内容不包含 <tool_use> 标签，说明是从 TagExtractor 提取的，需要包装
  if (!content.includes('<tool_use>')) {
    contentToProcess = `<tool_use>\n${content}\n</tool_use>`
  }

  // XML 模式匹配
  const toolUsePattern =
    /<tool_use>([\s\S]*?)<name>([\s\S]*?)<\/name>([\s\S]*?)<arguments>([\s\S]*?)<\/arguments>([\s\S]*?)<\/tool_use>/g
  const results: ToolUseResult[] = []
  let match
  let idx = 0

  while ((match = toolUsePattern.exec(contentToProcess)) !== null) {
    const fullMatch = match[0]
    const toolName = match[2].trim()
    const toolArgs = match[4].trim()

    // 解析 JSON 参数
    let parsedArgs
    try {
      parsedArgs = JSON.parse(toolArgs)
    } catch (error) {
      parsedArgs = toolArgs
    }

    // 查找对应的工具
    const tool = tools[toolName]
    if (!tool) {
      console.warn(`Tool "${toolName}" not found`)
      continue
    }

    results.push({
      id: `${toolName}-${idx++}`,
      toolName: toolName,
      arguments: parsedArgs,
      status: 'pending'
    })
    contentToProcess = contentToProcess.replace(fullMatch, '')
  }
  
  return { results, content: contentToProcess }
}
```

### 4.3 Prompt 模式的工具执行流程

**位置**: `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/promptToolUsePlugin.ts` (第 301-420 行)

```typescript
transformStream: (_: any, context: AiRequestContext) => () => {
  let textBuffer = ''
  
  // 创建工具执行器
  const toolExecutor = new ToolExecutor()
  const streamEventManager = new StreamEventManager()
  const tagExtractor = new TagExtractor(TOOL_USE_TAG_CONFIG)

  return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
    async transform(chunk, controller) {
      // 在 finish-step 时检查并执行工具
      if (chunk.type === 'finish-step') {
        const tools = context.mcpTools
        if (tools && Object.keys(tools).length > 0 && !context.hasExecutedToolsInCurrentStep) {
          // 解析工具调用
          const { results: parsedTools } = parseToolUse(textBuffer, tools)
          const validToolUses = parsedTools.filter((t) => t.status === 'pending')

          if (validToolUses.length > 0) {
            context.hasExecutedToolsInCurrentStep = true

            // 执行工具调用
            const executedResults = await toolExecutor.executeTools(validToolUses, tools, controller)

            // 发送步骤完成事件
            streamEventManager.sendStepFinishEvent(controller, chunk, context, 'tool-calls')

            // 格式化工具结果
            const toolResultsText = toolExecutor.formatToolResults(executedResults)

            // 构建递归调用参数（继续对话）
            const recursiveParams = streamEventManager.buildRecursiveParams(
              context,
              textBuffer,
              toolResultsText,
              tools
            )

            // 递归调用 AI 以继续处理
            await streamEventManager.handleRecursiveCall(controller, recursiveParams, context)
            return
          }
        }
        controller.enqueue(chunk)
      }
    }
  })
}
```

---

## 五、工具执行的完整数据流

### 5.1 MCP 工具调用响应处理

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 132-186 行)

```typescript
export async function callMCPTool(
  toolResponse: MCPToolResponse,
  topicId?: string,
  modelName?: string
): Promise<MCPCallToolResponse> {
  logger.info(`Calling Tool: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, toolResponse.tool)
  try {
    const server = getMcpServerByTool(toolResponse.tool)

    if (!server) {
      throw new Error(`Server not found: ${toolResponse.tool.serverName}`)
    }

    // IPC 调用主进程
    const resp = await window.api.mcp.callTool(
      {
        server,
        name: toolResponse.tool.name,
        args: toolResponse.arguments,
        callId: toolResponse.id
      },
      topicId ? currentSpan(topicId, modelName)?.spanContext() : undefined
    )

    logger.info(`Tool called: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, resp)
    return resp
  } catch (e) {
    logger.error(`Error calling Tool: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, e as Error)
    return Promise.resolve({
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error calling tool ${toolResponse.tool.name}: ${e instanceof Error ? e.message : JSON.stringify(e)}`
        }
      ]
    })
  }
}
```

### 5.2 工具响应转换为消息格式

**位置**: `src/renderer/src/utils/mcp-tools.ts` (第 396-489 行)

以 OpenAI 为例：

```typescript
export function mcpToolCallResponseToOpenAICompatibleMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false,
  noSupportArrayContent: boolean = false
): ChatCompletionMessageParam {
  const message = {
    role: 'user'
  } as ChatCompletionMessageParam
  
  if (resp.isError) {
    message.content = JSON.stringify(resp.content)
  } else if (noSupportArrayContent) {
    let content: string = `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:\n`

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content += (item.text || 'no content') + '\n'
            break
          case 'image':
            content += `Here is a image result: data:${item.mimeType};base64,${item.data}\n`
            break
          // ...其他类型处理
        }
      }
    } else {
      content += JSON.stringify(resp.content) + '\n'
    }

    message.content = content
  } else {
    // 数组内容格式（支持混合类型）
    const content: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`
      }
    ]

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content.push({
              type: 'text',
              text: item.text || 'no content'
            })
            break
          case 'image':
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${item.mimeType};base64,${item.data}`,
                detail: 'auto'
              }
            })
            break
          // ...其他类型处理
        }
      }
    } else {
      content.push({
        type: 'text',
        text: JSON.stringify(resp.content)
      })
    }

    message.content = content
  }

  return message
}
```

---

## 六、关键设计模式

### 6.1 双轨道架构

```
Native Function Calling                    Prompt-based Tool Use
├── OpenAI Chat Completion                 ├── 使用 AI SDK 工具
├── Anthropic Messages                     ├── 通过 Prompt 注入工具定义
├── Google Gemini Function Calls           ├── XML 格式解析工具调用
└── AWS Bedrock Tool Use                   └── 递归调用处理工具执行
```

### 6.2 工具执行流程

```
┌─────────────────────┐
│  AI 返回工具调用     │
└──────────┬──────────┘
           │
      ┌────▼─────┐
      │ 解析工具   │
      │ 调用      │
      └────┬─────┘
           │
      ┌────▼──────────┐
      │ 通过 IPC      │
      │ 调用主进程    │
      └────┬──────────┘
           │
      ┌────▼──────────┐
      │ MCPService    │
      │ callTool()    │
      └────┬──────────┘
           │
      ┌────▼──────────┐
      │ MCP SDK       │
      │ 调用工具      │
      └────┬──────────┘
           │
      ┌────▼──────────┐
      │ MCP Server    │
      │ 执行工具      │
      └────┬──────────┘
           │
      ┌────▼──────────┐
      │ 返回结果      │
      │ 转换为消息    │
      └────┬──────────┘
           │
      ┌────▼──────────┐
      │ 递归调用 AI   │
      │ 继续对话      │
      └────────────────┘
```

### 6.3 工具注册机制

```
MCPTool[] 
  ↓
按 AI 提供商转换
  ├─→ OpenAI:   mcpToolsToOpenAIChatTools()
  ├─→ Anthropic: mcpToolsToAnthropicTools()
  ├─→ Gemini:    mcpToolsToGeminiTools()
  ├─→ Bedrock:   mcpToolsToAwsBedrockTools()
  └─→ 其他:      通过 BaseApiClient.convertMcpToolsToSdkTools()
```

---

## 七、核心技术要点

### 7.1 execute 函数

- **位置**: AI SDK 工具定义中
- **签名**: `execute(args: Record<string, any>, context: ToolExecutionContext): Promise<any>`
- **必须性**: 必须提供（否则 ToolExecutor 会抛出错误）
- **执行方式**: 异步（返回 Promise）
- **上下文**: 包含 `toolCallId`, `messages`, `abortSignal`

### 7.2 工具执行不在工具定义中

**重要发现**：MCP 工具的 execute 函数 **不在工具注册时定义**，而是在以下情况下：

1. **Native Function Calling**: AI SDK 的流处理中统一调用
2. **Prompt Mode**: ToolExecutor.executeTools() 中统一调用
3. **MCP Tools**: 通过 IPC 调用主进程 MCPService，由 MCP SDK 客户端执行

### 7.3 工具结果转换

不同 AI 提供商的结果格式转换：
- `mcpToolCallResponseToOpenAIMessage()` → OpenAI 兼容格式
- `mcpToolCallResponseToAnthropicMessage()` → Anthropic 格式
- `mcpToolCallResponseToGeminiMessage()` → Gemini 格式
- `mcpToolCallResponseToAwsBedrockMessage()` → AWS Bedrock 格式

---

## 八、工具缓存和性能优化

### 8.1 MCPService 客户端缓存

**位置**: `src/main/services/MCPService.ts` (第 169-458 行)

```typescript
class McpService {
  private clients: Map<string, Client> = new Map()
  private pendingClients: Map<string, Promise<Client>> = new Map()

  async initClient(server: MCPServer): Promise<Client> {
    const serverKey = this.getServerKey(server)

    // 检查是否有待处理的初始化
    const pendingClient = this.pendingClients.get(serverKey)
    if (pendingClient) {
      return pendingClient
    }

    // 检查是否有缓存的客户端
    const existingClient = this.clients.get(serverKey)
    if (existingClient) {
      try {
        // 通过 ping 检查连接状态
        const pingResult = await existingClient.ping({ timeout: 1000 })
        if (pingResult) {
          return existingClient  // 复用连接
        }
      } catch (error) {
        this.clients.delete(serverKey)
      }
    }

    // 创建新连接
    const initPromise = (async () => {
      try {
        const client = new Client(...)
        // ... 初始化逻辑
        this.clients.set(serverKey, client)
        this.setupNotificationHandlers(client, server)
        return client
      } finally {
        this.pendingClients.delete(serverKey)
      }
    })()

    this.pendingClients.set(serverKey, initPromise)
    return initPromise
  }
}
```

### 8.2 工具列表缓存

```typescript
private listToolsImpl(server: MCPServer): Promise<MCPTool[]> {
  const cachedListTools = withCache<[MCPServer], MCPTool[]>(
    this.listToolsImpl.bind(this),
    (server) => {
      const serverKey = this.getServerKey(server)
      return `mcp:list_tool:${serverKey}`
    },
    5 * 60 * 1000,  // 5 分钟 TTL
    `[MCP] Tools from ${server.name}`
  )
  return cachedListTools(server)
}
```

---

## 九、错误处理机制

### 9.1 工具执行错误

**位置**: `ToolExecutor.ts` (第 120-150 行)

```typescript
private handleToolError<T extends ToolSet>(
  toolUse: ToolUseResult,
  error: unknown,
  controller: StreamController
): ExecutedResult {
  const toolError: TypedToolError<T> = {
    type: 'tool-error',
    toolCallId: toolUse.id,
    toolName: toolUse.toolName,
    input: toolUse.arguments,
    error
  }

  controller.enqueue(toolError)

  return {
    toolCallId: toolUse.id,
    toolName: toolUse.toolName,
    result: error,
    isError: true
  }
}
```

### 9.2 工具调用错误处理

**位置**: `mcp-tools.ts` (第 174-185 行)

```typescript
catch (e) {
  logger.error(`Error calling Tool...`, e as Error)
  return Promise.resolve({
    isError: true,
    content: [
      {
        type: 'text',
        text: `Error calling tool ${toolResponse.tool.name}: ${
          e instanceof Error ? e.stack || e.message : JSON.stringify(e)
        }`
      }
    ]
  })
}
```

---

## 十、总结：核心执行链路

```
┌──────────────────────────────────────────────┐
│         AI 模型返回工具调用响应              │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ 工具解析           │
        │ - 原生: 直接解析   │
        │ - Prompt: XML 解析 │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ 执行工具                   │
        ├────────────────────────────┤
        │ 原生 Function Call:        │
        │  AI SDK → tool.execute()   │
        │                            │
        │ Prompt Mode:               │
        │  ToolExecutor →            │
        │  IPC → MCPService →        │
        │  MCP SDK Client            │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ 工具返回结果           │
        │ - 格式化为消息         │
        │ - 转换为 AI SDK 格式   │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ 递归调用 AI (Prompt)   │
        │ 或更新消息历史 (Native)│
        └────────────────────────┘
```

---

## 附录：关键文件清单

| 文件路径 | 功能 |
|---------|------|
| `src/main/services/MCPService.ts` | MCP 工具执行主服务 |
| `src/renderer/src/utils/mcp-tools.ts` | 工具转换和执行中间件 |
| `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/ToolExecutor.ts` | 工具执行器 |
| `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/promptToolUsePlugin.ts` | Prompt 模式工具使用 |
| `packages/aiCore/src/core/plugins/built-in/toolUsePlugin/StreamEventManager.ts` | 流事件管理 |
| `src/main/apiServer/utils/mcp.ts` | API 服务器 MCP 工具处理 |
| `src/renderer/src/types/tool.ts` | 工具类型定义 |
| `src/renderer/src/types/mcp.ts` | MCP 相关类型定义 |

