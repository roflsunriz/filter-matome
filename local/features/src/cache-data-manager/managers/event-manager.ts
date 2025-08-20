import type { EventCallback } from '@/types';

export class EventManager {
  private listeners: Map<string, EventCallback<unknown>[]> = new Map();

  // すべて unknown ベースで扱うことで呼び出し側のジェネリクス差異を吸収する
  public addListener(eventType: string, callback: EventCallback<unknown>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  public trigger(eventType: string, data?: unknown): void {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((cb) => {
      // 安全性のため関数であることを確認してから呼ぶ
      if (typeof cb === 'function') {
        try {
          void (cb as (...args: unknown[]) => unknown)(data);
        } catch (e) {
          // 個別リスナーの例外は他へ影響させない
          console.error('Event listener error', e);
        }
      }
    });
  }
}