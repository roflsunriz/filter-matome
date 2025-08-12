import type { EventCallback } from '../types/index.js';

export class EventManager {
  private listeners: Map<string, EventCallback<unknown>[]> = new Map();

  public addListener<T>(eventType: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    // 型を擦り合わせて格納
    this.listeners.get(eventType)?.push(callback as EventCallback<unknown>);
  }

  public trigger<T>(eventType: string, data?: T): void {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((cb) => {
      const result = (cb as EventCallback<T>)(data);
      // ignore returned Promise intentionally
      void result;
    });
  }
} 