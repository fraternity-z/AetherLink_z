/**
 * 🎯 应用事件系统
 *
 * 用于跨组件通信的简单事件总线
 */

type EventCallback = (...args: any[]) => void;

interface ThrottleData {
  timer: ReturnType<typeof setTimeout> | null;
  lastArgs: any[];
  lastUsed: number; // 最后使用时间戳
}

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();
  private throttleTimers: Map<string, ThrottleData> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly THROTTLE_TTL = 60000; // 节流定时器 TTL: 1分钟无活动自动清理

  constructor() {
    // 每分钟清理一次过期的节流定时器
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredThrottles();
    }, 60000);
  }

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  /**
   * 🧹 清理过期的节流定时器
   * @private
   */
  private cleanupExpiredThrottles() {
    const now = Date.now();
    let cleanedCount = 0;

    // 使用 forEach 替代 for...of，兼容性更好
    this.throttleTimers.forEach((data, key) => {
      if (now - data.lastUsed > this.THROTTLE_TTL) {
        if (data.timer) {
          clearTimeout(data.timer);
        }
        this.throttleTimers.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      // 仅在清理了定时器时输出日志，避免日志刷屏
      // logger.debug('[EventEmitter] 清理过期节流定时器', { count: cleanedCount });
    }
  }

  /**
   * 💥 销毁事件总线，清理所有资源
   */
  destroy() {
    // 清理定期清理任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 清理所有节流定时器
    this.throttleTimers.forEach((data) => {
      if (data.timer) {
        clearTimeout(data.timer);
      }
    });
    this.throttleTimers.clear();

    // 清理所有事件监听器
    this.events.clear();
  }

  /**
   * 🚀 节流发送事件（用于高频更新场景，如 AI 流式响应）
   * @param event 事件名称
   * @param delay 节流延迟（毫秒），默认 200ms
   * @param args 事件参数
   */
  emitThrottled(event: string, delay: number = 200, ...args: any[]) {
    const key = event;
    const now = Date.now();
    const throttleData = this.throttleTimers.get(key);

    if (throttleData) {
      // 更新最后的参数、使用时间，并清除之前的定时器
      throttleData.lastArgs = args;
      throttleData.lastUsed = now;
      if (throttleData.timer) {
        clearTimeout(throttleData.timer);
      }
    } else {
      // 首次调用，立即触发
      this.throttleTimers.set(key, { timer: null, lastArgs: args, lastUsed: now });
      this.emit(event, ...args);
      return;
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      const data = this.throttleTimers.get(key);
      if (data) {
        this.emit(event, ...data.lastArgs);
        // 定时器触发后删除，避免累积
        this.throttleTimers.delete(key);
      }
    }, delay);

    this.throttleTimers.set(key, { timer, lastArgs: args, lastUsed: now });
  }
}

export const appEvents = new EventEmitter();

// 预定义的事件类型
export const AppEvents = {
  MESSAGES_CLEARED: 'messages:cleared',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_CHANGED: 'message:changed',
  CONVERSATION_CHANGED: 'conversation:changed',
  ASSISTANT_CHANGED: 'assistant:changed',
  QUICK_PHRASES_SETTING_CHANGED: 'quick_phrases:setting_changed',
} as const;
