/**
 * 简洁的 className 组合工具函数
 * 用于条件性拼接 Tailwind CSS 类名
 *
 * @example
 * cn('flex', isActive && 'bg-primary', 'p-4')
 * // => 'flex bg-primary p-4'
 *
 * @param classes - 类名数组，支持字符串、undefined、false
 * @returns 拼接后的类名字符串
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
