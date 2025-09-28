import { ModuleInstance, ModuleConfig, ModuleStatus } from '@/types/module-types';
import { isWatchLikePage } from '../utils/page-detect';

interface SessionEntry {
  key: string;
  value: unknown;
  index: number;
}

/**
 * タブセッション制限回避モジュール
 * localStorage 読み取りをフィルタしてセッション数上限を緩和する
 */
export class WatchTabSessionsModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private static readonly TARGET_KEY = 'nvpc:watch:tab-sessions';
  private static readonly MAX_VISIBLE_SESSIONS = 3;

  private originalGetItemRef: Storage['getItem'] | null = null;
  private originalSetItemRef: Storage['setItem'] | null = null;
  private originalRemoveItemRef: Storage['removeItem'] | null = null;
  private boundGetItem: ((key: string) => string | null) | null = null;
  private boundSetItem: ((key: string, value: string) => void) | null = null;
  private boundRemoveItem: ((key: string) => void) | null = null;
  private originalPropertyDescriptor: PropertyDescriptor | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  private dispatchingSyntheticEvent = false;
  private parseErrorLogged = false;
  private ownSessionKey: string | null = null;
  private isModuleActive = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isModuleActive) {
      await Promise.resolve();
      return;
    }

    if (!isWatchLikePage()) {
      await Promise.resolve();
      return;
    }

    try {
      this.overrideStorageAPIs();
      this.registerStorageListener();
      this.isModuleActive = true;
    } catch (error) {
      window.logger?.error('[WatchTabSessionsModule] 初期化に失敗しました', error);
      this.restoreOverrides();
      throw error;
    }
  }

  destroy(): void {
    if (!this.isModuleActive) return;

    this.restoreOverrides();
    this.isModuleActive = false;
  }

  isActive(): boolean {
    return this.isModuleActive;
  }

  getStatus(): ModuleStatus {
    return this.isModuleActive ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  private overrideStorageAPIs(): void {
    this.overrideGetItem();
    this.overrideSetItem();
    this.overrideRemoveItem();
    this.overrideDirectPropertyAccess();
  }

  private overrideGetItem(): void {
    if (this.originalGetItemRef) return;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.originalGetItemRef = localStorage.getItem;
    this.boundGetItem = localStorage.getItem.bind(localStorage);

    localStorage.getItem = (key: string): string | null => {
      const rawValue = this.boundGetItem
        ? this.boundGetItem(key)
        : this.originalGetItemRef
          ? this.originalGetItemRef.call(localStorage, key)
          : null;
      if (!this.shouldFilter(key)) {
        return rawValue;
      }
      return this.filterSessions(rawValue);
    };
  }

  private overrideSetItem(): void {
    if (this.originalSetItemRef) return;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.originalSetItemRef = localStorage.setItem;
    this.boundSetItem = localStorage.setItem.bind(localStorage);

    localStorage.setItem = (key: string, value: string): void => {
      let previousRaw: string | null = null;
      if (this.shouldFilter(key)) {
        previousRaw = this.getRawValue();
      }

      if (this.boundSetItem) {
        this.boundSetItem(key, value);
      } else {
        this.originalSetItemRef?.call(localStorage, key, value);
      }

      if (this.shouldFilter(key)) {
        this.identifyOwnSession(previousRaw, value);
      }
    };
  }

  private overrideRemoveItem(): void {
    if (this.originalRemoveItemRef) return;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.originalRemoveItemRef = localStorage.removeItem;
    this.boundRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.removeItem = (key: string): void => {
      if (this.boundRemoveItem) {
        this.boundRemoveItem(key);
      } else {
        this.originalRemoveItemRef?.call(localStorage, key);
      }
      if (this.shouldFilter(key)) {
        this.ownSessionKey = null;
      }
    };
  }

  private overrideDirectPropertyAccess(): void {
    if (this.originalPropertyDescriptor) return;

    try {
      this.originalPropertyDescriptor = Object.getOwnPropertyDescriptor(localStorage, WatchTabSessionsModule.TARGET_KEY) || null;
      Object.defineProperty(localStorage, WatchTabSessionsModule.TARGET_KEY, {
        configurable: true,
        enumerable: true,
        get: () => this.filterSessions(this.getRawValue()),
        set: (value: string) => {
          const nextValue = String(value);
          if (this.boundSetItem) {
            this.boundSetItem(WatchTabSessionsModule.TARGET_KEY, nextValue);
          } else {
            this.originalSetItemRef?.call(localStorage, WatchTabSessionsModule.TARGET_KEY, nextValue);
          }
        }
      });
    } catch (error) {
      window.logger?.warn('[WatchTabSessionsModule] プロパティオーバーライドに失敗しました', error);
    }
  }

  private registerStorageListener(): void {
    if (this.storageListener) return;

    this.storageListener = (event: StorageEvent) => {
      if (this.dispatchingSyntheticEvent) {
        return;
      }

      if (!event || !this.shouldFilter(event.key)) {
        return;
      }

      const sanitizedNewValue = this.filterSessions(event.newValue);
      const sanitizedOldValue = this.filterSessions(event.oldValue);

      if (sanitizedNewValue === event.newValue && sanitizedOldValue === event.oldValue) {
        return;
      }

      try {
        event.stopImmediatePropagation?.();
      } catch (stopError) {
        window.logger?.warn('[WatchTabSessionsModule] StorageEventの伝播停止に失敗しました', stopError);
      }

      this.dispatchSyntheticStorageEvent(event, sanitizedNewValue, sanitizedOldValue);
    };

    window.addEventListener('storage', this.storageListener, true);
  }

  private dispatchSyntheticStorageEvent(event: StorageEvent, newValue: string | null, oldValue: string | null): void {
    const init: StorageEventInit = {
      key: event.key ?? WatchTabSessionsModule.TARGET_KEY,
      newValue,
      oldValue,
      url: event.url,
      storageArea: event.storageArea ?? localStorage
    };

    this.dispatchingSyntheticEvent = true;
    try {
      let syntheticEvent: StorageEvent;
      if (typeof StorageEvent === 'function') {
        syntheticEvent = new StorageEvent('storage', init);
      } else {
        const legacyEvent = document.createEvent('StorageEvent');
        legacyEvent.initStorageEvent(
          'storage',
          false,
          false,
          init.key ?? null,
          init.oldValue ?? null,
          init.newValue ?? null,
          init.url ?? document.URL,
          init.storageArea ?? localStorage
        );
        syntheticEvent = legacyEvent;
      }

      window.dispatchEvent(syntheticEvent);
    } catch (error) {
      window.logger?.error('[WatchTabSessionsModule] StorageEventの再発行に失敗しました', error);
    } finally {
      this.dispatchingSyntheticEvent = false;
    }
  }

  private restoreOverrides(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener, true);
      this.storageListener = null;
    }

    if (this.originalGetItemRef) {
      localStorage.getItem = this.originalGetItemRef;
      this.originalGetItemRef = null;
      this.boundGetItem = null;
    }

    if (this.originalSetItemRef) {
      localStorage.setItem = this.originalSetItemRef;
      this.originalSetItemRef = null;
      this.boundSetItem = null;
    }

    if (this.originalRemoveItemRef) {
      localStorage.removeItem = this.originalRemoveItemRef;
      this.originalRemoveItemRef = null;
      this.boundRemoveItem = null;
    }

    if (this.originalPropertyDescriptor) {
      try {
        Object.defineProperty(localStorage, WatchTabSessionsModule.TARGET_KEY, this.originalPropertyDescriptor);
      } catch (error) {
        window.logger?.warn('[WatchTabSessionsModule] プロパティ復元に失敗しました', error);
      }
      this.originalPropertyDescriptor = null;
    } else {
      try {
        delete (localStorage as Record<string, unknown>)[WatchTabSessionsModule.TARGET_KEY];
      } catch {
        // noop
      }
    }
  }

  private filterSessions(rawValue: string | null): string | null {
    if (rawValue === null || rawValue === '') {
      return rawValue;
    }

    const entries = this.parseSessions(rawValue);
    if (entries === null) {
      return rawValue;
    }

    if (entries.length <= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
      return rawValue;
    }

    const selected = this.selectEntries(entries);
    const filtered: Record<string, unknown> = {};
    for (const entry of selected) {
      filtered[entry.key] = entry.value;
    }

    try {
      return JSON.stringify(filtered);
    } catch (error) {
      window.logger?.warn('[WatchTabSessionsModule] フィルタ結果のシリアライズに失敗しました', error);
      return rawValue;
    }
  }

  private parseSessions(rawValue: string | null): SessionEntry[] | null {
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return Object.entries(parsed).map(([key, value], index) => ({
        key,
        value,
        index
      }));
    } catch (error) {
      if (!this.parseErrorLogged) {
        window.logger?.warn('[WatchTabSessionsModule] タブセッション情報の解析に失敗しました', error);
        this.parseErrorLogged = true;
      }
      return null;
    }
  }

  private selectEntries(entries: SessionEntry[]): SessionEntry[] {
    const selected: SessionEntry[] = [];
    const seen = new Set<string>();

    const push = (entry: SessionEntry | undefined) => {
      if (!entry) return;
      if (seen.has(entry.key)) return;
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) return;
      selected.push(entry);
      seen.add(entry.key);
    };

    if (this.ownSessionKey) {
      const ownEntry = entries.find(entry => entry.key === this.ownSessionKey);
      push(ownEntry);
    }

    const sortedByIndexDesc = [...entries].sort((a, b) => b.index - a.index);
    for (const entry of sortedByIndexDesc) {
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
        break;
      }
      push(entry);
    }

    for (const entry of entries) {
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
        break;
      }
      push(entry);
    }

    return selected.sort((a, b) => a.index - b.index);
  }

  private identifyOwnSession(previousRaw: string | null, currentRaw: string): void {
    const currentEntries = this.parseSessions(currentRaw);
    if (!currentEntries || currentEntries.length === 0) {
      return;
    }

    const previousEntries = this.parseSessions(previousRaw);

    if (!previousEntries) {
      const latest = currentEntries[currentEntries.length - 1];
      if (latest) {
        this.ownSessionKey = latest.key;
      }
      return;
    }

    const previousMap = new Map<string, unknown>(previousEntries.map(entry => [entry.key, entry.value]));
    const additions = currentEntries.filter(entry => !previousMap.has(entry.key));

    if (additions.length === 1) {
      this.ownSessionKey = additions[0].key;
      return;
    }

    const changes = currentEntries.filter(entry => {
      if (!previousMap.has(entry.key)) {
        return false;
      }
      return !this.areValuesEqual(previousMap.get(entry.key), entry.value);
    });

    if (changes.length === 1) {
      this.ownSessionKey = changes[0].key;
      return;
    }

    if (additions.length > 1) {
      this.ownSessionKey = additions[additions.length - 1].key;
      return;
    }

    const latest = currentEntries[currentEntries.length - 1];
    if (latest) {
      this.ownSessionKey = latest.key;
    }
  }

  private areValuesEqual(a: unknown, b: unknown): boolean {
    if (typeof a === 'object' || typeof b === 'object') {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }
    return a === b;
  }

  private getRawValue(): string | null {
    try {
      if (this.boundGetItem) {
        return this.boundGetItem(WatchTabSessionsModule.TARGET_KEY);
      }
      if (this.originalGetItemRef) {
        return this.originalGetItemRef.call(localStorage, WatchTabSessionsModule.TARGET_KEY);
      }
      return localStorage.getItem(WatchTabSessionsModule.TARGET_KEY);
    } catch (error) {
      window.logger?.warn('[WatchTabSessionsModule] localStorage.raw取得に失敗しました', error);
      return null;
    }
  }

  private shouldFilter(key: string | null | undefined): boolean {
    return key === WatchTabSessionsModule.TARGET_KEY;
  }
}
