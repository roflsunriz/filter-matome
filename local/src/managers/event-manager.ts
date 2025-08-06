import type { EventCallback } from '../types/index.js';

export class EventManager {
  private listeners: Map<string, EventCallback[]> = new Map();

  public addListener<T>(eventType: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  public trigger<T>(eventType: string, data?: T): void {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((cb) => cb(data));
  }
} 