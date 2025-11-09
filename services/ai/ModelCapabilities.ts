// 统一的模型能力判断（精简版）
// 目标：集中维护“是否支持视觉”的判断，避免在各处散落字符串匹配
// 说明：仅收敛我们当前确实用到的能力（vision）。后续需要可扩展其它能力。

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'gemini' | 'deepseek' | 'volc' | 'zhipu'

function norm(id: string): string {
  return (id || '').toLowerCase().trim()
}

// 参考 cherry-studio 的模型匹配思路，做了“兼容厂商 + OpenAI 兼容网关”适配：
// - OpenAI: 支持 4o/4.1/4.5/5、o1/o3/o4、chatgpt-4o*、omni 家族（排除 o1-mini/o3-mini 等）
// - Anthropic: Claude 3/4 系列
// - Gemini: gemini 家族
// - DeepSeek: deepseek-vl/vision
// - Zhipu: glm-4v 家族
// - Volc（豆包）: doubao-*（含 vl/vision/omni/seed-1.6），step-1v/step-1o-vision
// - 其它常见多模态: llava/minicpm/internvl2/qwen-vl|omni/qvq/pixtral/grok-vision/grok-4*/llama-vision/gemma-3/kimi-vl
// 如果 provider=openai 但 baseURL 指向兼容网关，通常模型名会体现厂商特征，上述联合匹配可覆盖。

const OPENAI_VISION_REGEX = /\b(gpt-4o(?:-[\w-]+)?|chatgpt-4o(?:-[\w-]+)?|gpt-4\.1(?:-[\w-]+)?|gpt-4\.5(?:-[\w-]+)?|gpt-5(?:-[\w-]+)?|o1(?:-[\w-]+)?|o3(?:-[\w-]+)?|o4(?:-[\w-]+)?|omni)\b/i
const OPENAI_EXCLUDE_REGEX = /\b(o1-mini|o3-mini|o1-preview)\b/i

const ANTHROPIC_VISION_REGEX = /\bclaude-(3|4|haiku-4|sonnet-4|opus-4)/i
const GEMINI_VISION_REGEX = /\bgemini\b/i
const DEEPSEEK_VISION_REGEX = /\bdeepseek[\w-]*(vl|vision)\b/i
const ZHIPU_VISION_REGEX = /\bglm-4(?:\.\d+)?v(?:-[\w-]+)?\b/i
const VOLC_VISION_REGEX = /\b(doubao[\w-]*(vl|vision|omni|seed-1[.-]6)|step-1v(?:-[\w-]+)?|step-1o[\w-]*vision)\b/i
const MISC_VISION_REGEX = /(llava|minicpm|internvl2|qwen(?:\d*(?:\.\d+)?)?-?vl|qwen(?:\d*(?:\.\d+)?)?-?omni|qvq|pixtral|grok-(?:vision|4(?:-[\w-]+)?)|llama-(?:3\.2-vision|4(?:-[\w-]+)?)|gemma-3(?:-[\w-]+)?|kimi-(?:vl|.*vla?3b-thinking)|qwen3-omni)/i

export function supportsVision(provider: ProviderId, model: string): boolean {
  const m = norm(model)
  switch (provider) {
    case 'openai':
      return !OPENAI_EXCLUDE_REGEX.test(m) && (OPENAI_VISION_REGEX.test(m) ||
        // 兼容：OpenAI 兼容网关但模型来自其他厂商
        DEEPSEEK_VISION_REGEX.test(m) || ZHIPU_VISION_REGEX.test(m) || VOLC_VISION_REGEX.test(m) ||
        MISC_VISION_REGEX.test(m))
    case 'anthropic':
      return ANTHROPIC_VISION_REGEX.test(m)
    case 'google':
    case 'gemini':
      return GEMINI_VISION_REGEX.test(m)
    case 'deepseek':
      return DEEPSEEK_VISION_REGEX.test(m)
    case 'zhipu':
      return ZHIPU_VISION_REGEX.test(m)
    case 'volc':
      return VOLC_VISION_REGEX.test(m)
    default:
      // 未知提供商，兜底用通用多模态特征
      return (
        OPENAI_VISION_REGEX.test(m) ||
        ANTHROPIC_VISION_REGEX.test(m) ||
        GEMINI_VISION_REGEX.test(m) ||
        DEEPSEEK_VISION_REGEX.test(m) ||
        ZHIPU_VISION_REGEX.test(m) ||
        VOLC_VISION_REGEX.test(m) ||
        MISC_VISION_REGEX.test(m)
      )
  }
}
