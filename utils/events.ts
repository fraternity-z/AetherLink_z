/**
 * 🎯 应用事件系统
 *
 * 用于跨组件通信的简单事件总线
 */

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();
  private throttleTimers: Map<string, { timer: ReturnType<typeof setTimeout> | null; lastArgs: any[] }> = new Map();

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
   * 🚀 节流发送事件（用于高频更新场景，如 AI 流式响应）
   * @param event 事件名称
   * @param delay 节流延迟（毫秒），默认 200ms
   * @param args 事件参数
   */
  emitThrottled(event: string, delay: number = 200, ...args: any[]) {
    const key = event;
    const throttleData = this.throttleTimers.get(key);

    if (throttleData) {
      // 更新最后的参数，并清除之前的定时器
      throttleData.lastArgs = args;
      if (throttleData.timer) {
        clearTimeout(throttleData.timer);
      }
    } else {
      // 首次调用，立即触发
      this.throttleTimers.set(key, { timer: null, lastArgs: args });
      this.emit(event, ...args);
      return;
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      const data = this.throttleTimers.get(key);
      if (data) {
        this.emit(event, ...data.lastArgs);
        this.throttleTimers.delete(key);
      }
    }, delay);

    this.throttleTimers.set(key, { timer, lastArgs: args });
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
} as const;
