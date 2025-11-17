/**
 * 模型 Logo Hook
 *
 * 提供 React Hook 版本的模型 Logo 获取功能，自动适配当前主题
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getModelLogo } from '@/utils/model-logo';

/**
 * React Hook: 获取模型 Logo，自动适配当前主题
 *
 * @param modelId 模型 ID 或名称
 * @returns Logo 图片资源
 *
 * @example
 * ```tsx
 * const logo = useModelLogo('gpt-4o');
 * return <Image source={logo} />;
 * ```
 */
export function useModelLogo(modelId: string | undefined): any {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return getModelLogo(modelId, isDark);
}
