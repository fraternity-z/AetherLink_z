import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { cn } from '@/utils/classnames';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  className?: string;
};

// type 到 Tailwind 类名的映射
const typeClassNames: Record<string, string> = {
  default: 'text-base leading-6',
  defaultSemiBold: 'text-base leading-6 font-semibold',
  title: 'text-[32px] font-bold leading-8',
  subtitle: 'text-xl font-bold',
  link: 'text-base leading-[30px]',
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  className,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // 组合类名：type 默认样式 + 用户自定义 className
  const combinedClassName = cn(typeClassNames[type], className);

  return (
    <Text
      className={combinedClassName}
      style={[
        { color },
        // link 类型特殊颜色处理（保持向后兼容）
        type === 'link' && !lightColor && !darkColor ? { color: '#0a7ea4' } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}
