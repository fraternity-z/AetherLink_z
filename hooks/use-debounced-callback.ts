/**
 * 防抖回调 Hook
 *
 * 职责：
 * - 提供通用的防抖功能
 * - 自动处理清理和取消
 * - 支持立即执行选项
 * - 类型安全的泛型实现
 */

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * 防抖选项
 */
export interface DebounceOptions {
  /** 延迟时间（毫秒），默认 300ms */
  delay?: number;
  /** 是否在首次调用时立即执行，默认 false */
  leading?: boolean;
  /** 是否在延迟结束后执行，默认 true */
  trailing?: boolean;
  /** 最大等待时间（毫秒），防止无限延迟 */
  maxWait?: number;
}

/**
 * 防抖回调 Hook
 *
 * @param callback 需要防抖的回调函数
 * @param options 防抖选项
 * @returns 防抖后的回调函数
 *
 * @example
 * ```typescript
 * const debouncedSearch = useDebouncedCallback(
 *   async (query: string) => {
 *     const results = await searchAPI(query);
 *     setResults(results);
 *   },
 *   { delay: 500 }
 * );
 *
 * // 在 input 的 onChange 中调用
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  options: DebounceOptions = {}
): T {
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait,
  } = options;

  // 使用 ref 保存最新的回调函数，避免闭包陷阱
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  // 更新回调函数引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const currentTime = Date.now();
      const timeSinceLastCall = currentTime - lastCallTimeRef.current;
      const timeSinceLastInvoke = currentTime - lastInvokeTimeRef.current;

      lastCallTimeRef.current = currentTime;

      // 是否应该立即调用
      const shouldInvokeLeading = leading && timeSinceLastCall >= delay;

      // 是否达到最大等待时间
      const shouldInvokeMaxWait = maxWait !== undefined && timeSinceLastInvoke >= maxWait;

      // 清除现有的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 立即执行（首次调用或达到最大等待时间）
      if (shouldInvokeLeading || shouldInvokeMaxWait) {
        lastInvokeTimeRef.current = currentTime;
        callbackRef.current(...args);

        // 如果不需要尾部调用，直接返回
        if (!trailing) {
          return;
        }
      }

      // 设置延迟调用
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          lastInvokeTimeRef.current = Date.now();
          callbackRef.current(...args);
        }, delay);
      }

      // 设置最大等待时间定时器
      if (maxWait !== undefined && !maxWaitTimeoutRef.current) {
        maxWaitTimeoutRef.current = setTimeout(() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          lastInvokeTimeRef.current = Date.now();
          callbackRef.current(...args);
          maxWaitTimeoutRef.current = null;
        }, maxWait);
      }
    },
    [delay, leading, trailing, maxWait]
  ) as T;

  return debouncedCallback;
}

/**
 * 防抖值 Hook
 *
 * 对值进行防抖处理，延迟更新
 *
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的值
 *
 * @example
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(searchQuery, 500);
 *
 * // 在 effect 中使用防抖后的值
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
