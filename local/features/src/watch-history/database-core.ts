/** IndexedDB接続と履歴エントリの基本CRUD。 */
/**
 * ニコニコ動画視聴履歴拡張 - データベース操作
 *
 * @description IndexedDBを使った視聴履歴の保存・取得・統計計算
 * @author roflsunriz
 */

import { logger } from "@/common/logger";
import type {
  DBResult,
  DatabaseConfig,
  FilterCondition,
  SortBy,
  SortOrder,
  WatchHistoryEntry,
  WatchLogEntry,
} from "@/types/watch-history-types";
import { migrationManager } from "@/watch-history/migration-manager";

export abstract class WatchHistoryDatabaseCore {
  protected abstract mergeWatchLogs(
    existing: WatchLogEntry[],
    newLogs: WatchLogEntry[],
  ): WatchLogEntry[];
  protected abstract applyFilter(
    entries: WatchHistoryEntry[],
    filter: FilterCondition,
  ): WatchHistoryEntry[];
  protected abstract applySorting(
    entries: WatchHistoryEntry[],
    sortBy: SortBy,
    sortOrder: SortOrder,
  ): WatchHistoryEntry[];
  protected db: IDBDatabase | null = null;
  protected readonly config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      dbName: config?.dbName || "NicoWatchHistory",
      version: config?.version || 3,
      storeName: config?.storeName || "watchHistory",
    };
  }

  public static toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  public static normalizeWatchSeconds(value: unknown): number {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return numeric;
  }

  /**
   * データベースを初期化する
   */
  async initialize(repairAttempted: boolean = false): Promise<DBResult<void>> {
    try {
      logger.debug("データベース初期化開始:", {
        dbName: this.config.dbName,
        version: this.config.version,
      });
      const request = indexedDB.open(this.config.dbName, this.config.version);

      const initResult = await new Promise<DBResult<void>>(
        (resolve, reject) => {
          request.onerror = () => {
            logger.error("データベース接続失敗");
            reject(new Error("データベース接続失敗"));
          };

          request.onsuccess = () => {
            this.db = request.result;
            logger.debug("データベース初期化成功:", {
              dbName: this.config.dbName,
            });
            resolve({ success: true });
          };

          request.onupgradeneeded = async (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion || this.config.version;

            logger.debug("データベーススキーマ更新:", {
              oldVersion,
              newVersion,
              version: this.config.version,
            });

            // 新規作成の場合（oldVersion === 0）
            if (oldVersion === 0) {
              // 視聴履歴ストアを作成
              const store = db.createObjectStore(this.config.storeName, {
                keyPath: "videoId",
              });
              logger.debug("新しいストアを作成:", {
                storeName: this.config.storeName,
              });

              // インデックスを作成
              store.createIndex("watchedAt", "watchedAt", { unique: false });
              store.createIndex("ownerId", "ownerId", { unique: false });
              store.createIndex("completed", "completed", { unique: false });
              store.createIndex("firstWatchedAt", "firstWatchedAt", {
                unique: false,
              });
              store.createIndex("title", "title", { unique: false });
              store.createIndex("seriesId", "series.id", { unique: false });

              logger.debug("インデックス作成完了");
            } else {
              // 既存データベースの場合はマイグレーション実行
              try {
                // まずストアが存在しない場合は作成
                if (!db.objectStoreNames.contains(this.config.storeName)) {
                  const store = db.createObjectStore(this.config.storeName, {
                    keyPath: "videoId",
                  });
                  store.createIndex("watchedAt", "watchedAt", {
                    unique: false,
                  });
                  store.createIndex("ownerId", "ownerId", { unique: false });
                  store.createIndex("completed", "completed", {
                    unique: false,
                  });
                  store.createIndex("firstWatchedAt", "firstWatchedAt", {
                    unique: false,
                  });
                  store.createIndex("title", "title", { unique: false });
                  store.createIndex("seriesId", "series.id", { unique: false });
                }

                // マイグレーションを実行
                await migrationManager.executeMigrations(
                  db,
                  oldVersion,
                  newVersion,
                );
              } catch (error) {
                logger.error("マイグレーション実行エラー:", error);
                reject(
                  error instanceof Error
                    ? error
                    : new Error(WatchHistoryDatabaseCore.toErrorMessage(error)),
                );
                request.transaction?.abort();
              }
            }
          };
        },
      );

      if (initResult.success && this.db) {
        try {
          this.validateSchema(this.db);
        } catch (error) {
          if (repairAttempted) {
            throw error;
          }

          logger.warn("IndexedDBの破損を検出したため再作成します:", error);
          this.db.close();
          this.db = null;
          await this.deleteDatabase();
          return await this.initialize(true);
        }
      }

      // 永続化を自動で要求
      if (initResult.success && migrationManager.getConfig().autoPersist) {
        try {
          await migrationManager.requestPersistence();
        } catch (error) {
          logger.warn("永続化自動要求失敗:", error);
        }
      }

      return initResult;
    } catch (error) {
      if (!repairAttempted) {
        logger.warn("IndexedDB初期化失敗のため再作成を試行します:", error);
        this.db?.close();
        this.db = null;
        await this.deleteDatabase();
        return await this.initialize(true);
      }
      return { success: false, error: `初期化失敗: ${String(error)}` };
    }
  }

  private validateSchema(db: IDBDatabase): void {
    const expectedSchema: Record<string, string[]> = {
      [this.config.storeName]: [
        "watchedAt",
        "ownerId",
        "completed",
        "firstWatchedAt",
        "title",
        "seriesId",
      ],
    };

    Object.entries(expectedSchema).forEach(([storeName, indexNames]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`Missing object store: ${storeName}`);
      }

      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      indexNames.forEach((indexName) => {
        if (!store.indexNames.contains(indexName)) {
          throw new Error(`Missing index: ${storeName}.${indexName}`);
        }
      });
    });
  }

  private deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
        );
      request.onblocked = () =>
        reject(new Error("IndexedDB deletion was blocked"));
    });
  }

  /**
   * 視聴履歴エントリを保存する（upsert操作）
   */
  async saveEntry(entry: WatchHistoryEntry): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction(
          [this.config.storeName],
          "readwrite",
        );
        const store = transaction.objectStore(this.config.storeName);

        transaction.oncomplete = () => {
          resolve({ success: true });
        };

        transaction.onerror = () => {
          reject(
            new Error(
              `保存失敗: ${WatchHistoryDatabaseCore.toErrorMessage(transaction.error)}`,
            ),
          );
        };

        transaction.onabort = () => {
          reject(new Error("保存処理が中断されました"));
        };

        // 既存エントリの確認
        const getRequest = store.get(entry.videoId);

        getRequest.onsuccess = () => {
          const existingEntry = getRequest.result as
            WatchHistoryEntry | undefined;

          if (existingEntry) {
            // 既存エントリがある場合は更新
            const updated = {
              ...existingEntry,
              ...entry,
              // watchLogsはマージ
              watchLogs: this.mergeWatchLogs(
                existingEntry.watchLogs,
                entry.watchLogs,
              ),
              // 初回視聴日時は保持
              firstWatchedAt:
                existingEntry.firstWatchedAt || entry.firstWatchedAt,
            };

            const putRequest = store.put(updated);
            putRequest.onerror = () => {
              reject(
                new Error(
                  `更新失敗: ${WatchHistoryDatabaseCore.toErrorMessage(putRequest.error)}`,
                ),
              );
            };
          } else {
            // 新規エントリ
            const putRequest = store.put(entry);
            putRequest.onerror = () => {
              reject(
                new Error(
                  `追加失敗: ${WatchHistoryDatabaseCore.toErrorMessage(putRequest.error)}`,
                ),
              );
            };
          }
        };

        getRequest.onerror = () => {
          reject(
            new Error(
              `既存エントリ確認失敗: ${WatchHistoryDatabaseCore.toErrorMessage(getRequest.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      return { success: false, error: `保存失敗: ${String(error)}` };
    }
  }

  /**
   * 個別エントリを取得する
   */
  async getEntry(videoId: string): Promise<DBResult<WatchHistoryEntry>> {
    if (!this.db) {
      return { success: false, error: "データベースが未初期化です" };
    }

    try {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly",
      );
      const store = transaction.objectStore(this.config.storeName);

      const result = await new Promise<WatchHistoryEntry | undefined>(
        (resolve, reject) => {
          const request = store.get(videoId);
          request.onsuccess = () =>
            resolve(request.result as WatchHistoryEntry | undefined);
          request.onerror = () =>
            reject(
              new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
            );
        },
      );

      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "動画が見つかりません" };
      }
    } catch (error) {
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }

  /**
   * 全エントリを取得する（ソート・フィルタ付き）
   */
  async getAllEntries(
    sortBy: SortBy = "watchedAt",
    sortOrder: SortOrder = "desc",
    filter?: FilterCondition,
  ): Promise<DBResult<WatchHistoryEntry[]>> {
    logger.debug("getAllEntries開始:", { sortBy, sortOrder, filter });

    if (!this.db) {
      logger.error("データベース未初期化");
      return { success: false, error: "データベース未初期化" };
    }

    try {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly",
      );
      const store = transaction.objectStore(this.config.storeName);

      // 全エントリを取得
      const entries = await new Promise<WatchHistoryEntry[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(
              new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
            );
        },
      );

      logger.debug("データベースからエントリ取得完了:", {
        totalEntries: entries.length,
      });

      if (entries.length > 0) {
        logger.debug("最初のエントリ:", entries[0]);
      }

      // フィルタを適用
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
        logger.debug("フィルタ適用後:", {
          filteredCount: filteredEntries.length,
        });
      }

      // ソートを適用
      const sortedEntries = this.applySorting(
        filteredEntries,
        sortBy,
        sortOrder,
      );

      logger.debug("getAllEntries完了:", { resultCount: sortedEntries.length });

      return { success: true, data: sortedEntries };
    } catch (error) {
      logger.error("getAllEntriesエラー:", error);
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
}
