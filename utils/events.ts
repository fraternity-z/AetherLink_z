/**
 * 🎯 应用事件系统
 *
 * 用于跨组件通信的简单事件总线
 */

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

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
}

export const appEvents = new EventEmitter();

// 预定义的事件类型
export const AppEvents = {
  MESSAGES_CLEARED: 'messages:cleared',
  MESSAGE_SENT: 'message:sent',
  CONVERSATION_CHANGED: 'conversation:changed',
  ASSISTANT_CHANGED: 'assistant:changed',
} as const;
