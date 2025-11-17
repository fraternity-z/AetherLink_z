/**
 * 模型 Logo 工具
 * 根据模型 ID 或名称自动匹配对应的官方 Logo
 *
 * 注意：这是一个纯工具模块，不依赖任何业务层代码
 * React Hook 版本请使用 hooks/use-model-logo.ts
 */

// Logo 文件映射表
const MODEL_LOGOS = {
  // OpenAI 系列
  'gpt-o1': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'o1': { light: require('../assets/images/models/gpt_o1.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'o3': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'gpt-4': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'gpt-4o': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  '4o': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'gpt-5': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },
  'gpt-3': { light: require('../assets/images/models/gpt_4.png'), dark: require('../assets/images/models/gpt_dark.png') },

  // Anthropic Claude
  'claude': { light: require('../assets/images/models/claude.png'), dark: require('../assets/images/models/claude_dark.png') },
  'claude-3-5': { light: require('../assets/images/models/claude.png'), dark: require('../assets/images/models/claude_dark.png') },

  // Google Gemini
  'gemini': { light: require('../assets/images/models/gemini.png'), dark: require('../assets/images/models/gemini_dark.png') },

  // DeepSeek
  'deepseek': { light: require('../assets/images/models/deepseek.png'), dark: require('../assets/images/models/deepseek_dark.png') },
  'deepseek-r1': { light: require('../assets/images/models/deepseek.png'), dark: require('../assets/images/models/deepseek_dark.png') },

  // 阿里 Qwen
  'qwen': { light: require('../assets/images/models/qwen.png'), dark: require('../assets/images/models/qwen_dark.png') },
  'qwq': { light: require('../assets/images/models/qwen.png'), dark: require('../assets/images/models/qwen_dark.png') },

  // 月之暗面 Moonshot
  'moonshot': { light: require('../assets/images/models/moonshot.png'), dark: require('../assets/images/models/moonshot_dark.png') },
  'kimi': { light: require('../assets/images/models/moonshot.png'), dark: require('../assets/images/models/moonshot_dark.png') },

  // 字节跳动 Doubao
  'doubao': { light: require('../assets/images/models/doubao.png'), dark: require('../assets/images/models/doubao_dark.png') },

  // 智谱 ChatGLM
  'glm': { light: require('../assets/images/models/chatglm.png'), dark: require('../assets/images/models/chatglm_dark.png') },
  'chatglm': { light: require('../assets/images/models/chatglm.png'), dark: require('../assets/images/models/chatglm_dark.png') },
  'zhipu': { light: require('../assets/images/models/zhipu.png'), dark: require('../assets/images/models/zhipu_dark.png') },

  // Meta Llama
  'llama': { light: require('../assets/images/models/llama.png'), dark: require('../assets/images/models/llama_dark.png') },

  // 零一万物 Yi
  'yi': { light: require('../assets/images/models/yi.png'), dark: require('../assets/images/models/yi_dark.png') },

  // Mistral AI
  'mistral': { light: require('../assets/images/models/mixtral.png'), dark: require('../assets/images/models/mixtral_dark.png') },
  'mixtral': { light: require('../assets/images/models/mixtral.png'), dark: require('../assets/images/models/mixtral_dark.png') },

  // Cohere
  'cohere': { light: require('../assets/images/models/cohere.png'), dark: require('../assets/images/models/cohere_dark.png') },
  'command': { light: require('../assets/images/models/cohere.png'), dark: require('../assets/images/models/cohere_dark.png') },

  // MiniMax
  'minimax': { light: require('../assets/images/models/minimax.png'), dark: require('../assets/images/models/minimax_dark.png') },
  'abab': { light: require('../assets/images/models/minimax.png'), dark: require('../assets/images/models/minimax_dark.png') },

  // 百度文心
  'wenxin': { light: require('../assets/images/models/wenxin.png'), dark: require('../assets/images/models/wenxin_dark.png') },
  'ernie': { light: require('../assets/images/models/wenxin.png'), dark: require('../assets/images/models/wenxin_dark.png') },

  // 讯飞星火
  'sparkdesk': { light: require('../assets/images/models/sparkdesk.png'), dark: require('../assets/images/models/sparkdesk_dark.png') },
  'spark': { light: require('../assets/images/models/sparkdesk.png'), dark: require('../assets/images/models/sparkdesk_dark.png') },

  // 阶跃星辰 Step
  'step': { light: require('../assets/images/models/step.png'), dark: require('../assets/images/models/step_dark.png') },

  // 腾讯混元
  'hunyuan': { light: require('../assets/images/models/hunyuan.png'), dark: require('../assets/images/models/hunyuan_dark.png') },

  // 书生浦语
  'internlm': { light: require('../assets/images/models/internlm.png'), dark: require('../assets/images/models/internlm_dark.png') },

  // MiniCPM
  'minicpm': { light: require('../assets/images/models/minicpm.webp'), dark: require('../assets/images/models/minicpm.webp') },

  // 百川智能
  'baichuan': { light: require('../assets/images/models/baichuan.png'), dark: require('../assets/images/models/baichuan_dark.png') },

  // xAI Grok
  'grok': { light: require('../assets/images/models/grok.png'), dark: require('../assets/images/models/grok_dark.png') },
} as const;

/**
 * 根据模型 ID 获取对应的 Logo
 * @param modelId 模型 ID 或名称
 * @param isDark 是否为深色模式（可选，会自动检测）
 * @returns Logo 图片资源，如果未找到则返回 undefined
 */
export function getModelLogo(modelId: string | undefined, isDark?: boolean): any {
  if (!modelId) {
    return undefined;
  }

  // 全局缓存：key = `${lowerId}|${isDark?1:0}`，值为 require 结果或 null（未命中）
  const cacheKey = `${String(modelId).toLowerCase()}|${isDark ? 1 : 0}`;
  const cached = MODEL_LOGO_CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached === null ? undefined : cached;
  }

  // 转为小写进行匹配
  const id = modelId.toLowerCase();

  // 遍历映射表，使用正则匹配
  for (const [key, logos] of MODEL_LOGO_ENTRIES) {
    if (key.test(id)) {
      const useDark = isDark ?? false;
      const res = useDark ? logos.dark : logos.light;
      MODEL_LOGO_CACHE.set(cacheKey, res);
      return res;
    }
  }

  // 未命中缓存 null，避免重复计算
  MODEL_LOGO_CACHE.set(cacheKey, null);
  return undefined;
}

/**
 * React Hook: 获取模型 Logo，自动适配当前主题
 *
 * ⚠️ 已移至 hooks/use-model-logo.ts，请从那里导入
 * @deprecated 使用 import { useModelLogo } from '@/hooks/use-model-logo'
 */

/**
 * 检查模型是否有对应的 Logo
 * @param modelId 模型 ID 或名称
 * @returns 是否有对应的 Logo
 */
export function hasModelLogo(modelId: string | undefined): boolean {
  return getModelLogo(modelId) !== undefined;
}

// ==============================
// Cache & precompiled patterns
// ==============================
// 预编译正则，避免每次 new RegExp
const MODEL_LOGO_ENTRIES: Array<[RegExp, { light: any; dark: any }]> = Object.entries(MODEL_LOGOS)
  .map(([k, v]) => [new RegExp(k, 'i'), v]);

// 全局缓存 Map（进程级别）。值为 require 结果或 null（表示未命中）。
const MODEL_LOGO_CACHE: Map<string, any | null> = new Map();
