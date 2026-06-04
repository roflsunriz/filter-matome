/**
 * データベース統合管理システム
 * 永続化昇格機能の中核システム、複数ストアの統合管理を行います！
 */

import { MigrationManager } from "@/video-player/core/migration-manager";
import {
  DB_CONFIG,
  DB_STORES,
  VideoCache,
  ViewHistory,
  UserStats,
  CommentHistory,
  SystemInfo,
  CLEANUP_CONFIG,
  SETTING_CATEGORIES,
} from "@/video-player/config/database-config";
import { ModeValue } from "@/types";

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: IDBDatabase | null = null;
  private migrationManager: MigrationManager;
  private initializationPromise: Promise<void> | null = null;
  private cleanupTimer: number | null = null;

  private toMessage(value: unknown): string {
    if (value && typeof (value as { message?: unknown }).message === "string") {
      return (value as { message: string }).message;
    }
    return String(value);
  }

  private constructor() {
    this.migrationManager = new MigrationManager();
    this.setupPeriodicCleanup();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * データベースを初期化
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization().catch((error) => {
      this.initializationPromise = null;
      throw error;
    });
    return this.initializationPromise;
  }

  /**
   * データベース初期化の実行
   */
  private async performInitialization(): Promise<void> {
    try {
      this.db = await this.openHealthyDatabase();
      window.logger?.info("データベース初期化完了しました！");
    } catch (error) {
      window.logger?.error("データベース初期化失敗しました！:", error);
      throw error;
    }
  }

  /**
   * DB を開いた直後にスキーマを検証し、壊れた作成残骸があれば一度だけ再作成
   */
  private async openHealthyDatabase(): Promise<IDBDatabase> {
    let db: IDBDatabase | null = null;

    try {
      db = await this.openDatabase();
      this.validateSchema(db);
      return db;
    } catch (error) {
      db?.close();
      window.logger?.warn(
        "データベースの破損を検出したため再作成します！:",
        error,
      );
      await this.recreateDatabase();
    }

    const recreatedDb = await this.openDatabase();
    this.validateSchema(recreatedDb);
    return recreatedDb;
  }

  /**
   * データベースを開く
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.CURRENT_VERSION);

      request.onerror = () => {
        window.logger?.error(
          "データベースのオープンに失敗しました！:",
          this.toMessage(request.error),
        );
        reject(new Error(this.toMessage(request.error)));
      };

      request.onsuccess = () => {
        const db = request.result;
        this.setupDatabaseErrorHandling(db);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_CONFIG.CURRENT_VERSION;

        window.logger?.info(
          `データベース昇格しました: v${oldVersion} → v${newVersion}`,
        );

        try {
          const transaction = request.transaction;
          if (!transaction) {
            throw new Error("バージョン変更トランザクションを取得できません");
          }

          this.upgradeSchema(db, transaction);
        } catch (error) {
          window.logger?.error(
            "マイグレーション実行エラーが発生しました！:",
            error,
          );
          throw error;
        }
      };
    });
  }

  /**
   * IndexedDB のスキーマをバージョン変更トランザクション内で同期的に更新
   */
  private upgradeSchema(db: IDBDatabase, transaction: IDBTransaction): void {
    Object.values(DB_STORES).forEach((storeConfig) => {
      const store = db.objectStoreNames.contains(storeConfig.name)
        ? transaction.objectStore(storeConfig.name)
        : db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath,
            autoIncrement: storeConfig.autoIncrement,
          });

      storeConfig.indexes?.forEach((indexConfig) => {
        if (!store.indexNames.contains(indexConfig.name)) {
          store.createIndex(indexConfig.name, indexConfig.name, {
            unique: indexConfig.unique,
          });
        }
      });
    });

    if (db.objectStoreNames.contains("systemInfo")) {
      const systemStore = transaction.objectStore("systemInfo");
      systemStore.put({
        key: `schema_v${DB_CONFIG.CURRENT_VERSION}`,
        value: true,
        version: DB_CONFIG.CURRENT_VERSION,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          description: "video-player IndexedDB スキーマ更新完了",
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * 期待するストアとインデックスが揃っているか検証
   */
  private validateSchema(db: IDBDatabase): void {
    Object.values(DB_STORES).forEach((storeConfig) => {
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        throw new Error(
          `必須オブジェクトストアが不足しています: ${storeConfig.name}`,
        );
      }

      const transaction = db.transaction([storeConfig.name], "readonly");
      const store = transaction.objectStore(storeConfig.name);

      storeConfig.indexes?.forEach((indexConfig) => {
        if (!store.indexNames.contains(indexConfig.name)) {
          throw new Error(
            `必須インデックスが不足しています: ${storeConfig.name}.${indexConfig.name}`,
          );
        }
      });
    });
  }

  /**
   * 壊れた IndexedDB を閉じて削除し、次の openDatabase で作り直せる状態にする
   */
  private async recreateDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    await this.deleteDatabase();
  }

  /**
   * IndexedDB の削除
   */
  private deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_CONFIG.NAME);
      deleteRequest.onsuccess = () => {
        window.logger?.info("データベースを削除しました！");
        resolve();
      };
      deleteRequest.onerror = () =>
        reject(new Error(this.toMessage(deleteRequest.error)));
      deleteRequest.onblocked = () =>
        reject(new Error("データベース削除がブロックされました"));
    });
  }

  /**
   * データベースエラーハンドリング設定
   */
  private setupDatabaseErrorHandling(db: IDBDatabase): void {
    db.onerror = (event) => {
      window.logger?.error("データベースエラーが発生しました！:", event);
    };

    db.onversionchange = () => {
      window.logger?.warn("データベースバージョン変更が検出されました！");
      db.close();
      this.db = null;
    };
  }

  /**
   * プレーヤー設定の保存
   */
  async savePlayerSetting(
    key: string,
    value: ModeValue,
    category: string = SETTING_CATEGORIES.PLAYER,
  ): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["playerSettings"], "readwrite");
    const store = transaction.objectStore("playerSettings");

    const settingData = {
      id: key,
      value,
      category,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(settingData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * プレーヤー設定の取得
   */
  async getPlayerSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result as { value?: T } | null | undefined;
        resolve(
          result &&
            typeof result === "object" &&
            "value" in result &&
            result.value !== undefined
            ? (result.value as T)
            : defaultValue,
        );
      };
      request.onerror = () => {
        window.logger?.warn(`設定取得失敗しました！: ${key}`);
        resolve(defaultValue);
      };
    });
  }

  /**
   * 動画キャッシュ情報の保存
   */
  async saveVideoCache(videoCache: VideoCache): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");

    return new Promise((resolve, reject) => {
      const request = store.put(videoCache);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 動画キャッシュ情報の取得
   */
  async getVideoCache(videoId: string): Promise<VideoCache | null> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["videoCache"], "readonly");
    const store = transaction.objectStore("videoCache");

    return new Promise((resolve, reject) => {
      const request = store.get(videoId);
      request.onsuccess = () => {
        const resultUnknown = request.result as unknown;
        resolve(resultUnknown ? (resultUnknown as VideoCache) : null);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 視聴履歴の追加
   */
  async addViewHistory(viewHistory: Omit<ViewHistory, "id">): Promise<number> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");

    return new Promise((resolve, reject) => {
      const request = store.add(viewHistory);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 視聴履歴の取得
   */
  async getViewHistory(limit: number = 50): Promise<ViewHistory[]> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["viewHistory"], "readonly");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev");
      const results: ViewHistory[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          results.push(cursor.value as ViewHistory);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * ユーザー統計の保存
   */
  async saveUserStats(userStats: UserStats): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["userStats"], "readwrite");
    const store = transaction.objectStore("userStats");

    return new Promise((resolve, reject) => {
      const request = store.put(userStats);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * ユーザー統計の取得
   */
  async getUserStats(
    category: "daily" | "weekly" | "monthly",
    date: string,
  ): Promise<UserStats | null> {
    await this.ensureInitialized();

    const statId = `${category}_${date}`;
    const transaction = this.db!.transaction(["userStats"], "readonly");
    const store = transaction.objectStore("userStats");

    return new Promise((resolve, reject) => {
      const request = store.get(statId);
      request.onsuccess = () => resolve((request.result as UserStats) || null);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * コメント履歴の追加
   */
  async addCommentHistory(
    commentHistory: Omit<CommentHistory, "id">,
  ): Promise<number> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");

    return new Promise((resolve, reject) => {
      const request = store.add(commentHistory);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * システム情報の保存
   */
  async saveSystemInfo(systemInfo: SystemInfo): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["systemInfo"], "readwrite");
    const store = transaction.objectStore("systemInfo");

    return new Promise((resolve, reject) => {
      const request = store.put(systemInfo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * システム情報の取得
   */
  async getSystemInfo(key: string): Promise<SystemInfo | null> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["systemInfo"], "readonly");
    const store = transaction.objectStore("systemInfo");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const resultUnknown = request.result as unknown;
        resolve(resultUnknown ? (resultUnknown as SystemInfo) : null);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 全設定の取得（後方互換性）
   */
  async getAllSettings(): Promise<Record<string, ModeValue>> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(["playerSettings"], "readonly");
    const store = transaction.objectStore("playerSettings");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results: Record<string, ModeValue> = {};
        (request.result as Array<{ id?: string; value?: ModeValue }>).forEach(
          (item) => {
            if (item && typeof item.id === "string") {
              results[item.id] = item.value as ModeValue;
            }
          },
        );
        resolve(results);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * データベースの統計情報を取得
   */
  async getDatabaseStats(): Promise<{
    totalRecords: number;
    storeStats: Record<string, number>;
    dbSize: number;
  }> {
    await this.ensureInitialized();

    const storeStats: Record<string, number> = {};
    let totalRecords = 0;

    const storeNames = Array.from(this.db!.objectStoreNames);
    const transaction = this.db!.transaction(storeNames, "readonly");

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new Error(this.toMessage(request.error)));
      });

      storeStats[storeName] = count;
      totalRecords += count;
    }

    // 概算サイズ（正確なサイズ計算は困難）
    const dbSize = totalRecords * 1024; // 1KB per record estimate

    return { totalRecords, storeStats, dbSize };
  }

  /**
   * 自動クリーンアップ実行
   */
  async performCleanup(): Promise<void> {
    await this.ensureInitialized();

    try {
      window.logger?.info("データベースクリーンアップ開始");

      // 古い視聴履歴を削除
      await this.cleanupViewHistory();

      // 古いコメント履歴を削除
      await this.cleanupCommentHistory();

      // 期限切れキャッシュを削除
      await this.cleanupExpiredCache();

      window.logger?.info("データベースクリーンアップ完了");
    } catch (error) {
      window.logger?.error("クリーンアップエラーが発生しました！:", error);
    }
  }

  /**
   * 視聴履歴のクリーンアップ
   */
  private async cleanupViewHistory(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.VIEW_HISTORY_DAYS);

    const transaction = this.db!.transaction(["viewHistory"], "readwrite");
    const store = transaction.objectStore("viewHistory");
    const index = store.index("watchedAt");

    const range = IDBKeyRange.upperBound(cutoffDate);
    const request = index.openCursor(range);

    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(`視聴履歴 ${deletedCount} 件を削除しました！`);
          resolve();
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * コメント履歴のクリーンアップ
   */
  private async cleanupCommentHistory(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - CLEANUP_CONFIG.COMMENT_HISTORY_DAYS,
    );

    const transaction = this.db!.transaction(["commentHistory"], "readwrite");
    const store = transaction.objectStore("commentHistory");
    const index = store.index("timestamp");

    const range = IDBKeyRange.upperBound(cutoffDate.getTime());
    const request = index.openCursor(range);

    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          window.logger?.debug(
            `コメント履歴 ${deletedCount} 件を削除しました！`,
          );
          resolve();
        }
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 期限切れキャッシュのクリーンアップ
   */
  private async cleanupExpiredCache(): Promise<void> {
    const now = new Date();
    const transaction = this.db!.transaction(["videoCache"], "readwrite");
    const store = transaction.objectStore("videoCache");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const caches = request.result as Array<{
          videoId?: IDBValidKey;
          expiresAt?: string | number | Date;
        }>;
        let deletedCount = 0;

        caches.forEach((cache) => {
          if (
            cache &&
            cache.expiresAt &&
            new Date(cache.expiresAt) < now &&
            cache.videoId !== undefined
          ) {
            store.delete(cache.videoId);
            deletedCount++;
          }
        });

        window.logger?.debug(
          `期限切れキャッシュ ${deletedCount} 件を削除しました！`,
        );
        resolve();
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  /**
   * 定期クリーンアップ設定
   */
  private setupPeriodicCleanup(): void {
    const interval = DB_CONFIG.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;

    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch((error) => {
        window.logger?.error("定期クリーンアップ失敗しました！:", error);
      });
    }, interval);
  }

  /**
   * 初期化確認
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initializationPromise = null;
  }

  /**
   * データベースのリセット
   */
  async reset(): Promise<void> {
    this.close();
    await this.deleteDatabase();
    window.logger?.info("データベースをリセットしました！");
  }

  /**
   * バックアップの作成
   */
  async createBackup(): Promise<{
    version: number;
    timestamp: string;
    stores: Record<string, unknown[]>;
  }> {
    await this.ensureInitialized();

    const backup = {
      version: DB_CONFIG.CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      stores: {} as Record<string, unknown[]>,
    };

    const storeNames = Array.from(this.db!.objectStoreNames);
    const transaction = this.db!.transaction(storeNames, "readonly");

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      backup.stores[storeName] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as unknown[]);
        request.onerror = () =>
          reject(new Error(this.toMessage(request.error)));
      });
    }

    return backup;
  }

  /**
   * デバッグ情報の取得
   */
  async getDebugInfo(): Promise<{
    initialized: boolean;
    dbVersion: number;
    stats: {
      totalRecords: number;
      storeStats: Record<string, number>;
      dbSize: number;
    };
    migration: Record<string, unknown>;
    cleanupTimer: boolean;
  }> {
    const stats = await this.getDatabaseStats();
    const migrationDebug = this.migrationManager.getDebugInfo();

    return {
      initialized: !!this.db,
      dbVersion: DB_CONFIG.CURRENT_VERSION,
      stats,
      migration: migrationDebug,
      cleanupTimer: !!this.cleanupTimer,
    };
  }
}
