import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
} from "@/types/module-types";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";

type StoragePrototype = Storage & {
  getItem: Storage["getItem"];
  setItem: Storage["setItem"];
  removeItem: Storage["removeItem"];
};

type SessionMap = Record<string, unknown>;

interface SessionEntry {
  key: string;
  value: unknown;
  index: number;
}

/**
 * タブセッション制限回避モジュール（強化版）
 * Storage プロトタイプを差し替え、読み取り側に仮想的な上限を提示する
 */
export class WatchTabSessionsModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private static readonly TARGET_KEY = "nvpc:watch:tab-sessions";
  private static readonly MAX_VISIBLE_SESSIONS = 3;
  private static readonly OWN_KEY_SESSION_STORAGE =
    "mlink_watch_tab_sessions_key";

  private readonly storage: Storage;
  private storagePrototype: StoragePrototype | null = null;

  private originalPrototypeGetItem: Storage["getItem"] | null = null;
  private originalPrototypeSetItem: Storage["setItem"] | null = null;
  private originalPrototypeRemoveItem: Storage["removeItem"] | null = null;
  private originalInstanceDescriptor: PropertyDescriptor | null = null;

  private storageListener: ((event: StorageEvent) => void) | null = null;

  private dispatchingSyntheticEvent = false;
  private parseErrorLogged = false;
  private isModuleActive = false;

  private ownSessionKey: string | null = null;
  private sanitizedCacheRaw: string | null = null;
  private sanitizedCache: string | null = null;

  constructor(config: ModuleConfig) {
    this.config = config;
    this.storage = window.localStorage;
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
      this.restoreOwnSessionKey();
      this.overrideStoragePrototype();
      this.overrideDirectAccessor();
      this.registerStorageListener();
      this.invalidateCache();
      this.primeSanitizedSnapshot();
      this.isModuleActive = true;
    } catch (error) {
      window.logger?.error(
        "[WatchTabSessionsModule] 初期化に失敗しました",
        error,
      );
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

  private overrideStoragePrototype(): void {
    const prototype = Object.getPrototypeOf(
      this.storage,
    ) as StoragePrototype | null;
    if (!prototype) {
      window.logger?.warn(
        "[WatchTabSessionsModule] Storageプロトタイプを取得できませんでした",
      );
      return;
    }

    this.storagePrototype = prototype;

    if (!this.originalPrototypeGetItem) {
      this.originalPrototypeGetItem = prototype.getItem;
      const getItemPatch = this.createGetItemPatch();
      prototype.getItem = function patchedGetItem(
        this: Storage,
        key: string,
      ): string | null {
        return getItemPatch(this, key);
      };
    }

    if (!this.originalPrototypeSetItem) {
      this.originalPrototypeSetItem = prototype.setItem;
      const setItemPatch = this.createSetItemPatch();
      prototype.setItem = function patchedSetItem(
        this: Storage,
        key: string,
        value: string,
      ): void {
        setItemPatch(this, key, value);
      };
    }

    if (!this.originalPrototypeRemoveItem) {
      this.originalPrototypeRemoveItem = prototype.removeItem;
      const removeItemPatch = this.createRemoveItemPatch();
      prototype.removeItem = function patchedRemoveItem(
        this: Storage,
        key: string,
      ): void {
        removeItemPatch(this, key);
      };
    }
  }

  private overrideDirectAccessor(): void {
    try {
      this.originalInstanceDescriptor =
        Object.getOwnPropertyDescriptor(
          this.storage,
          WatchTabSessionsModule.TARGET_KEY,
        ) || null;
      Object.defineProperty(this.storage, WatchTabSessionsModule.TARGET_KEY, {
        configurable: true,
        enumerable: true,
        get: () =>
          this.getSanitizedValue(
            this.callOriginalGetItem(
              this.storage,
              WatchTabSessionsModule.TARGET_KEY,
            ),
          ),
        set: (value: string) => {
          this.callOriginalSetItem(
            this.storage,
            WatchTabSessionsModule.TARGET_KEY,
            String(value),
          );
        },
      });
    } catch (error) {
      window.logger?.warn(
        "[WatchTabSessionsModule] direct accessor 差し替えに失敗しました",
        error,
      );
    }
  }

  private registerStorageListener(): void {
    if (this.storageListener) return;

    this.storageListener = (event: StorageEvent) => {
      if (this.dispatchingSyntheticEvent) return;
      if (
        !event ||
        !this.shouldIntercept(event.storageArea ?? this.storage, event.key)
      )
        return;

      const sanitizedNewValue = this.getSanitizedValue(event.newValue);
      const sanitizedOldValue = this.getSanitizedValue(event.oldValue);

      if (
        sanitizedNewValue === event.newValue &&
        sanitizedOldValue === event.oldValue
      ) {
        return;
      }

      try {
        event.stopImmediatePropagation?.();
      } catch (stopError) {
        window.logger?.warn(
          "[WatchTabSessionsModule] StorageEventの伝播停止に失敗しました",
          stopError,
        );
      }

      this.dispatchSyntheticStorageEvent(
        event,
        sanitizedNewValue,
        sanitizedOldValue,
      );
    };

    window.addEventListener("storage", this.storageListener, true);
  }

  private dispatchSyntheticStorageEvent(
    event: StorageEvent,
    newValue: string | null,
    oldValue: string | null,
  ): void {
    const init: StorageEventInit = {
      key: event.key ?? WatchTabSessionsModule.TARGET_KEY,
      newValue,
      oldValue,
      url: event.url,
      storageArea: event.storageArea ?? this.storage,
    };

    this.dispatchingSyntheticEvent = true;
    try {
      let syntheticEvent: StorageEvent;
      if (typeof StorageEvent === "function") {
        syntheticEvent = new StorageEvent("storage", init);
      } else {
        const legacyEvent = document.createEvent("StorageEvent");
        legacyEvent.initStorageEvent(
          "storage",
          false,
          false,
          init.key ?? null,
          init.oldValue ?? null,
          init.newValue ?? null,
          init.url ?? document.URL,
          init.storageArea ?? this.storage,
        );
        syntheticEvent = legacyEvent;
      }

      window.dispatchEvent(syntheticEvent);
    } catch (error) {
      window.logger?.error(
        "[WatchTabSessionsModule] StorageEventの再発行に失敗しました",
        error,
      );
    } finally {
      this.dispatchingSyntheticEvent = false;
    }
  }

  private handleAfterWrite(
    previousRaw: string | null,
    writtenRaw: string,
  ): void {
    this.identifyOwnSession(previousRaw, writtenRaw);
    this.invalidateCache();
    this.persistOwnSessionKey();
  }

  private handleAfterRemove(): void {
    this.invalidateCache();
  }

  private identifyOwnSession(
    previousRaw: string | null,
    currentRaw: string,
  ): void {
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

    const previousMap = new Map<string, unknown>(
      previousEntries.map((entry) => [entry.key, entry.value]),
    );
    const additions = currentEntries.filter(
      (entry) => !previousMap.has(entry.key),
    );

    if (additions.length === 1) {
      this.ownSessionKey = additions[0].key;
      return;
    }

    const changes = currentEntries.filter((entry) => {
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

  private getSanitizedValue(rawValue: string | null): string | null {
    if (rawValue === null || rawValue === "") {
      return rawValue;
    }

    if (this.sanitizedCacheRaw === rawValue) {
      return this.sanitizedCache;
    }

    const filtered = this.filterSessions(rawValue);
    this.sanitizedCacheRaw = rawValue;
    this.sanitizedCache = filtered;
    return filtered;
  }

  private filterSessions(rawValue: string | null): string | null {
    if (rawValue === null) {
      return null;
    }

    const entries = this.parseSessions(rawValue);
    if (entries === null) {
      return rawValue;
    }

    if (entries.length <= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
      return rawValue;
    }

    const selected = this.selectEntries(entries);
    const result: SessionMap = {};
    for (const entry of selected) {
      result[entry.key] = entry.value;
    }

    try {
      return JSON.stringify(result);
    } catch (error) {
      window.logger?.warn(
        "[WatchTabSessionsModule] フィルタ結果のシリアライズに失敗しました",
        error,
      );
      return rawValue;
    }
  }

  private selectEntries(entries: SessionEntry[]): SessionEntry[] {
    const selected: SessionEntry[] = [];
    const seen = new Set<string>();

    const push = (entry: SessionEntry | undefined) => {
      if (!entry) return;
      if (seen.has(entry.key)) return;
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS)
        return;
      selected.push(entry);
      seen.add(entry.key);
    };

    if (this.ownSessionKey) {
      push(entries.find((entry) => entry.key === this.ownSessionKey));
    }

    const sortedByValueDesc = [...entries].sort((a, b) => {
      const aValue =
        typeof a.value === "number" ? a.value : Number(a.value) || 0;
      const bValue =
        typeof b.value === "number" ? b.value : Number(b.value) || 0;
      return bValue - aValue;
    });

    for (const entry of sortedByValueDesc) {
      push(entry);
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
        break;
      }
    }

    for (const entry of entries) {
      push(entry);
      if (selected.length >= WatchTabSessionsModule.MAX_VISIBLE_SESSIONS) {
        break;
      }
    }

    return selected.sort((a, b) => a.index - b.index);
  }

  private parseSessions(rawValue: string | null): SessionEntry[] | null {
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue) as SessionMap | null;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return Object.entries(parsed).map(([key, value], index) => ({
        key,
        value,
        index,
      }));
    } catch (error) {
      if (!this.parseErrorLogged) {
        window.logger?.warn(
          "[WatchTabSessionsModule] タブセッション情報の解析に失敗しました",
          error,
        );
        this.parseErrorLogged = true;
      }
      return null;
    }
  }

  private createGetItemPatch(): (
    storage: Storage,
    key: string,
  ) => string | null {
    return (storage, key) => {
      const rawValue = this.callOriginalGetItem(storage, key);
      if (!this.shouldIntercept(storage, key)) {
        return rawValue;
      }
      return this.getSanitizedValue(rawValue);
    };
  }

  private createSetItemPatch(): (
    storage: Storage,
    key: string,
    value: string,
  ) => void {
    return (storage, key, value) => {
      const shouldFilter = this.shouldIntercept(storage, key);
      let previousRaw: string | null = null;
      if (shouldFilter) {
        previousRaw = this.callOriginalGetItem(storage, key);
      }

      this.callOriginalSetItem(storage, key, value);

      if (shouldFilter) {
        this.handleAfterWrite(previousRaw, value);
      }
    };
  }

  private createRemoveItemPatch(): (storage: Storage, key: string) => void {
    return (storage, key) => {
      const shouldFilter = this.shouldIntercept(storage, key);
      this.callOriginalRemoveItem(storage, key);
      if (shouldFilter) {
        this.handleAfterRemove();
      }
    };
  }

  private callOriginalGetItem(target: Storage, key: string): string | null {
    try {
      if (this.originalPrototypeGetItem) {
        return this.originalPrototypeGetItem.call(target, key);
      }
      return target.getItem(key);
    } catch (error) {
      window.logger?.warn(
        "[WatchTabSessionsModule] original getItem 呼び出しに失敗しました",
        error,
      );
      return null;
    }
  }

  private callOriginalSetItem(
    target: Storage,
    key: string,
    value: string,
  ): void {
    try {
      if (this.originalPrototypeSetItem) {
        this.originalPrototypeSetItem.call(target, key, value);
        return;
      }
      target.setItem(key, value);
    } catch (error) {
      window.logger?.error(
        "[WatchTabSessionsModule] original setItem 呼び出しに失敗しました",
        error,
      );
    }
  }

  private callOriginalRemoveItem(target: Storage, key: string): void {
    try {
      if (this.originalPrototypeRemoveItem) {
        this.originalPrototypeRemoveItem.call(target, key);
        return;
      }
      target.removeItem(key);
    } catch (error) {
      window.logger?.error(
        "[WatchTabSessionsModule] original removeItem 呼び出しに失敗しました",
        error,
      );
    }
  }

  private shouldIntercept(
    storage: Storage | null | undefined,
    key: string | null | undefined,
  ): boolean {
    if (!storage || !key) {
      return false;
    }
    return (
      key === WatchTabSessionsModule.TARGET_KEY && this.isTargetStorage(storage)
    );
  }

  private isTargetStorage(storage: Storage): boolean {
    try {
      return storage === this.storage;
    } catch {
      return false;
    }
  }

  private restoreOwnSessionKey(): void {
    try {
      this.ownSessionKey = sessionStorage.getItem(
        WatchTabSessionsModule.OWN_KEY_SESSION_STORAGE,
      );
    } catch {
      this.ownSessionKey = null;
    }
  }

  private persistOwnSessionKey(): void {
    if (!this.ownSessionKey) {
      return;
    }
    try {
      sessionStorage.setItem(
        WatchTabSessionsModule.OWN_KEY_SESSION_STORAGE,
        this.ownSessionKey,
      );
    } catch {
      // セッションストレージが利用できない場合は無視
    }
  }

  private primeSanitizedSnapshot(): void {
    const raw = this.callOriginalGetItem(
      this.storage,
      WatchTabSessionsModule.TARGET_KEY,
    );
    if (raw !== null && raw !== undefined) {
      this.getSanitizedValue(raw);
    }
  }

  private invalidateCache(): void {
    this.sanitizedCacheRaw = null;
    this.sanitizedCache = null;
  }

  private restoreOverrides(): void {
    if (this.storageListener) {
      window.removeEventListener("storage", this.storageListener, true);
      this.storageListener = null;
    }

    if (this.storagePrototype) {
      if (this.originalPrototypeGetItem) {
        this.storagePrototype.getItem = this.originalPrototypeGetItem;
        this.originalPrototypeGetItem = null;
      }
      if (this.originalPrototypeSetItem) {
        this.storagePrototype.setItem = this.originalPrototypeSetItem;
        this.originalPrototypeSetItem = null;
      }
      if (this.originalPrototypeRemoveItem) {
        this.storagePrototype.removeItem = this.originalPrototypeRemoveItem;
        this.originalPrototypeRemoveItem = null;
      }
    }

    try {
      if (this.originalInstanceDescriptor) {
        Object.defineProperty(
          this.storage,
          WatchTabSessionsModule.TARGET_KEY,
          this.originalInstanceDescriptor,
        );
      } else {
        delete (this.storage as Record<string, unknown>)[
          WatchTabSessionsModule.TARGET_KEY
        ];
      }
    } catch (error) {
      window.logger?.warn(
        "[WatchTabSessionsModule] direct accessor の復元に失敗しました",
        error,
      );
    }

    this.originalInstanceDescriptor = null;
    this.storagePrototype = null;
  }

  private areValuesEqual(a: unknown, b: unknown): boolean {
    if (typeof a === "object" || typeof b === "object") {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }
    return a === b;
  }
}
