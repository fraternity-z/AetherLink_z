# 模型标签系统使用文档

## 概述 (*^▽^*)

模型标签系统提供了一套统一的模型能力识别和管理机制,可以自动为 AI 模型打上能力标签,方便筛选和调用特定功能的模型喵~

## 支持的标签类型 ฅ'ω'ฅ

### 能力标签 (ModelCapabilityType)

1. **`reasoning`** - 推理能力
   - 适用模型: OpenAI o1/o3, DeepSeek R1, Claude 3.7+/4, Gemini Thinking
   - 用途: 需要复杂推理和思考链的任务
   - 示例: `deepseek-r1`, `o1-mini`, `claude-sonnet-4`

2. **`vision`** - 视觉能力
   - 适用模型: GPT-4V, Claude 3/4, Gemini, Qwen-VL
   - 用途: 图像理解、分析、描述等视觉任务
   - 示例: `gpt-4-vision`, `claude-3-opus`, `gemini-2.0-flash`

3. **`function_calling`** - 工具调用能力
   - 适用模型: GPT-4o, Claude 3+, Qwen, Gemini, DeepSeek
   - 用途: MCP 工具调用、函数执行等
   - 示例: `gpt-4o`, `claude-3-opus`, `qwen-plus`

4. **`web_search`** - 网络搜索能力
   - 适用模型: Perplexity 系列
   - 用途: 需要实时网络信息的查询
   - 示例: `sonar-pro`, `perplexity-search`

5. **`embedding`** - 文本嵌入能力
   - 适用模型: text-embedding-ada-002, Jina Embeddings
   - 用途: 向量化文本、语义搜索
   - 示例: `text-embedding-ada-002`, `jina-embeddings-v2`

6. **`rerank`** - 重排序能力
   - 适用模型: Jina Reranker
   - 用途: 搜索结果重排序
   - 示例: `jina-reranker-v1`

7. **`image_generation`** - 图像生成能力
   - 适用模型: DALL-E, Gemini 2.5 Flash Image, Flux
   - 用途: 文生图、图像创作
   - 示例: `dall-e-3`, `gemini-2.5-flash-image`, `stable-diffusion`

### 特殊标签

8. **`free`** - 免费模型标签
   - 用途: 标识免费可用的模型
   - 示例: 模型 ID 包含 `free` 关键词的模型

## 核心 API 使用 φ(≧ω≦*)♪

### 1. 获取模型标签

```typescript
import { getModelTags } from '@/services/ai/ModelCapabilities';

// 示例: 获取 GPT-4V 的标签
const tags = getModelTags({
  id: 'gpt-4-vision-preview',
  provider: 'openai',
  name: 'GPT-4 Vision Preview'
});
// 返回: ['vision', 'function_calling']

// 示例: 获取 DeepSeek R1 的标签
const tags = getModelTags({
  id: 'deepseek-r1',
  provider: 'deepseek'
});
// 返回: ['reasoning', 'function_calling']
```

### 2. 检查模型能力

```typescript
import {
  supportsVision,
  supportsReasoning,
  supportsFunctionCalling,
  supportsImageGeneration
} from '@/services/ai/ModelCapabilities';

// 检查视觉能力
if (supportsVision('openai', 'gpt-4-vision-preview')) {
  // 允许发送图片附件
}

// 检查推理能力
if (supportsReasoning({ id: 'deepseek-r1', provider: 'deepseek' })) {
  // 显示思考链 UI
}

// 检查工具调用能力
if (supportsFunctionCalling({ id: 'gpt-4o', provider: 'openai' })) {
  // 启用 MCP 工具
}

// 检查图像生成能力
if (supportsImageGeneration({ id: 'dall-e-3', provider: 'openai' })) {
  // 显示图片生成选项
}
```

### 3. 用户手动覆盖标签 (重要功能!) ⚠️

系统支持用户手动覆盖自动识别的能力,这在以下场景很有用:
- 自定义模型没有被自动识别
- 需要禁用某些自动识别的能力
- 测试新模型的功能

```typescript
import { setModelCapability, setModelCapabilities } from '@/services/ai/ModelCapabilities';

// 单个能力设置
let model = { id: 'custom-model', provider: 'custom' };

// 启用视觉能力
model = setModelCapability(model, 'vision', true);

// 禁用工具调用能力
model = setModelCapability(model, 'function_calling', false);

// 恢复自动识别 (移除手动配置)
model = setModelCapability(model, 'vision', undefined);

// 批量设置多个能力
model = setModelCapabilities(model, [
  { type: 'vision', isUserSelected: true },
  { type: 'function_calling', isUserSelected: false },
  { type: 'reasoning', isUserSelected: true }
]);
```

### 4. 模型发现时自动添加标签

当使用 `ModelDiscovery` 获取模型列表时,标签会自动添加:

```typescript
import { fetchProviderModels } from '@/services/ai/ModelDiscovery';

// 获取 OpenAI 模型列表 (自动包含标签)
const models = await fetchProviderModels('openai');

// 返回的模型格式:
// [
//   {
//     id: 'gpt-4-vision-preview',
//     label: 'GPT-4 Vision Preview',
//     tags: ['vision', 'function_calling']  // ← 自动识别的标签
//   },
//   {
//     id: 'dall-e-3',
//     label: 'DALL-E 3',
//     tags: ['image_generation']
//   }
// ]
```

## 实际应用场景 (๑•̀ㅂ•́)✧

### 场景 1: 过滤推理模型

```typescript
import { fetchProviderModels } from '@/services/ai/ModelDiscovery';

const allModels = await fetchProviderModels('openai');

// 只显示推理模型
const reasoningModels = allModels.filter(m =>
  m.tags?.includes('reasoning')
);
```

### 场景 2: 根据能力启用 UI 功能

```typescript
import { supportsVision, supportsFunctionCalling } from '@/services/ai/ModelCapabilities';

function ChatInput({ currentModel }) {
  // 是否显示图片上传按钮
  const canUploadImages = supportsVision(
    currentModel.provider,
    currentModel.id
  );

  // 是否启用 MCP 工具
  const canUseTools = supportsFunctionCalling({
    id: currentModel.id,
    provider: currentModel.provider
  });

  return (
    <View>
      {canUploadImages && <ImageUploadButton />}
      {canUseTools && <McpToolsPanel />}
      <TextInput />
    </View>
  );
}
```

### 场景 3: 智能模型推荐

```typescript
import { getModelTags } from '@/services/ai/ModelCapabilities';

function recommendModelForTask(task: string, availableModels: any[]) {
  if (task.includes('图片') || task.includes('image')) {
    // 推荐视觉模型
    return availableModels.find(m =>
      getModelTags(m).includes('vision')
    );
  }

  if (task.includes('复杂') || task.includes('推理')) {
    // 推荐推理模型
    return availableModels.find(m =>
      getModelTags(m).includes('reasoning')
    );
  }

  // 默认推荐工具调用能力的模型
  return availableModels.find(m =>
    getModelTags(m).includes('function_calling')
  );
}
```

## 扩展和定制 =￣ω￣=

### 添加新的能力类型

如果需要添加新的能力类型,请修改 `services/ai/ModelCapabilities.ts`:

1. 在 `ModelCapabilityType` 中添加新类型
2. 创建相应的正则匹配规则
3. 实现 `supportsXxx()` 函数
4. 在 `getModelTags()` 中添加调用

### 自定义匹配规则

如果自动识别不准确,可以:

1. **调整正则表达式**: 修改 `ModelCapabilities.ts` 中的 REGEX 常量
2. **使用用户手动覆盖**: 调用 `setModelCapability()` API
3. **特殊提供商处理**: 在能力检测函数中添加 provider 特判

## 注意事项 ⚠️

1. **能力自动识别基于模型 ID 和名称**: 如果模型命名不规范,可能无法正确识别
2. **用户手动配置优先级最高**: 手动设置的能力会覆盖自动识别
3. **标签信息不持久化到数据库**: 当前标签在运行时动态生成 (后续可以考虑持久化)
4. **定期更新匹配规则**: 随着新模型发布,需要更新正则表达式

## 常见问题 FAQ (@_@;)

### Q: 为什么某个模型没有被识别为推理模型?

A: 请检查模型 ID 是否包含 `reasoning`、`thinking`、`o1`、`r1` 等关键词。如果没有,可以使用 `setModelCapability()` 手动标记。

### Q: 如何为自定义模型添加能力?

A: 使用 `setModelCapabilities()` API 批量设置:

```typescript
const customModel = {
  id: 'my-custom-model',
  provider: 'custom',
  capabilities: [
    { type: 'vision', isUserSelected: true },
    { type: 'function_calling', isUserSelected: true }
  ]
};
```

### Q: 标签信息会保存到数据库吗?

A: 当前版本标签是实时计算的,不会持久化。如果需要持久化,可以扩展 `provider_models` 表添加 `tags` 字段。

### Q: 如何禁用某个能力的自动识别?

A: 使用 `setModelCapability(model, 'vision', false)` 手动禁用。

## 技术实现细节 (๑ˉ∀ˉ๑)

### 架构设计

```
services/ai/
├── ModelCapabilities.ts    # 核心能力识别逻辑
├── ModelDiscovery.ts       # 模型发现 + 标签集成
└── AiClient.ts            # AI 客户端 (未来可集成标签过滤)
```

### 关键类型定义

```typescript
// 能力类型
type ModelCapabilityType =
  | 'reasoning'
  | 'vision'
  | 'function_calling'
  | 'web_search'
  | 'embedding'
  | 'rerank'
  | 'image_generation';

// 标签类型 (包含 free)
type ModelTag = ModelCapabilityType | 'free';

// 能力对象
interface ModelCapability {
  type: ModelCapabilityType;
  isUserSelected?: boolean;  // 用户手动设置
}

// 包含能力的模型
interface ModelWithCapabilities {
  id: string;
  provider: string;
  name?: string;
  capabilities?: ModelCapability[];
}
```

### 识别流程

1. 用户调用 `fetchProviderModels(provider)`
2. 从 API 获取原始模型列表
3. 对每个模型调用 `getModelTags()` 自动识别能力
4. 返回包含 `tags` 字段的模型列表
5. UI 层根据 tags 过滤或显示功能

---

**文档版本**: v1.0  
**最后更新**: 2025-11-15  
**作者**: 幽浮喵 (浮浮酱) ฅ'ω'ฅ  
**相关文件**:
- `services/ai/ModelCapabilities.ts` - 核心实现
- `services/ai/ModelDiscovery.ts` - 集成入口
- `services/ai/CLAUDE.md` - AI 服务模块文档
