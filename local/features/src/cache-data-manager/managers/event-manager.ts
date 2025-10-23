import type { EventCallback } from "@/types";

export class EventManager {
  private listeners: Map<string, EventCallback<unknown>[]> = new Map();

  // 呼び出し側が具体的なイベント型を渡せるようにジェネリクスを受け取る
  // 内部では unknown ベースの配列に格納するためキャストして扱う
  public addListener<T = unknown>(
    eventType: string,
    callback: EventCallback<T>,
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback as EventCallback<unknown>);
  }

  public trigger(eventType: string, data?: unknown): void {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((cb) => {
      // 安全性のため関数であることを確認してから呼ぶ
      if (typeof cb === "function") {
        try {
          void (cb as (...args: unknown[]) => unknown)(data);
        } catch (e) {
          // 個別リスナーの例外は他へ影響させない
          window?.logger.error("Event listener error", e);
        }
      }
    });
  }
}
