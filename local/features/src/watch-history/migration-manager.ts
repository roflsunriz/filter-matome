/**
 * ニコニコ動画視聴履歴拡張 - マイグレーション管理
 *
 * @description データベースマイグレーション・永続化管理クラス
 * @author roflsunriz
 */

import type {
  MigrationInfo,
  PersistenceStatus,
  MigrationProgress,
  DatabaseManagementConfig,
  WatchHistoryEntry,
  SeriesAlert,
  DBResult,
} from "@/types/watch-history-types";
import { logger } from "@/common/logger";

/**
 * マイグレーション・永続化管理クラス
 */
export class MigrationManager {
  private config: DatabaseManagementConfig;
  private migrations: MigrationInfo[] = [];
  private currentProgress: MigrationProgress = {
    isRunning: false,
    currentMigration: null,
    progress: 0,
    completedCount: 0,
    totalCount: 0,
    error: null,
  };

  constructor(config?: Partial<DatabaseManagementConfig>) {
    this.config = {
      autoMigration: true,
      autoPersist: true,
      autoBackup: true,
      backupBeforeMigration: true,
      ...config,
    };

    this.initializeMigrations();
  }

  private static toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * マイグレーション定義を初期化する
   */
  private initializeMigrations(): void {
    // v1 → v2: シリーズ情報を追加
    this.migrations.push({
      id: "add-series-info",
      fromVersion: 1,
      toVersion: 2,
      description: "視聴履歴にシリーズ情報を追加",
      migrate: this.migrateV1ToV2.bind(this),
    });

    // 将来のマイグレーションはここに追加
    logger.debug(
      `[MigrationManager] ${this.migrations.length}個のマイグレーションを定義しました`,
    );
  }

  /**
   * v1からv2へのマイグレーション（シリーズ情報追加）
   */
  private async migrateV1ToV2(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ): Promise<void> {
    logger.info(
      "[MigrationManager] v1→v2マイグレーション開始: シリーズ情報を追加",
    );

    const store = transaction.objectStore("watchHistory");
    const request = store.getAll();

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result as WatchHistoryEntry[];
        let processedCount = 0;

        if (entries.length === 0) {
          logger.info(
            "[MigrationManager] マイグレーション対象のデータがありません",
          );
          resolve();
          return;
        }

        entries.forEach((entry) => {
          // シリーズプロパティが存在しない場合は追加
          if (!("series" in entry)) {
            const updatedEntry: WatchHistoryEntry = {
              ...(entry as WatchHistoryEntry),
              series: null, // デフォルト値を設定
            };

            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => {
              processedCount++;
              if (processedCount === entries.length) {
                logger.info(
                  `[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを更新`,
                );
                resolve();
              }
            };
            updateRequest.onerror = () => {
              logger.error(
                "[MigrationManager] データ更新エラー:",
                updateRequest.error,
              );
              reject(
                new Error(MigrationManager.toErrorMessage(updateRequest.error)),
              );
            };
          } else {
            processedCount++;
            if (processedCount === entries.length) {
              logger.info(
                `[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを確認`,
              );
              resolve();
            }
          }
        });
      };

      request.onerror = () => {
        logger.error("[MigrationManager] データ取得エラー:", request.error);
        reject(new Error(MigrationManager.toErrorMessage(request.error)));
      };
    });
  }

  /**
   * 必要なマイグレーションを実行する
   */
  async executeMigrations(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
  ): Promise<void> {
    const requiredMigrations = this.migrations.filter(
      (migration) =>
        migration.fromVersion >= oldVersion &&
        migration.toVersion <= newVersion,
    );

    if (requiredMigrations.length === 0) {
      logger.info("[MigrationManager] 実行するマイグレーションがありません");
      return;
    }

    logger.info(
      `[MigrationManager] ${requiredMigrations.length}個のマイグレーションを実行します`,
    );

    this.currentProgress = {
      isRunning: true,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: requiredMigrations.length,
      error: null,
    };

    this.dispatchProgressEvent();

    try {
      if (this.config.backupBeforeMigration) {
        await this.createBackup(db);
      }

      for (let i = 0; i < requiredMigrations.length; i++) {
        const migration = requiredMigrations[i];
        this.currentProgress.currentMigration = migration.description;
        this.currentProgress.progress = i / requiredMigrations.length;
        this.dispatchProgressEvent();

        logger.info(
          `[MigrationManager] マイグレーション実行中: ${migration.description}`,
        );

        // トランザクションを作成（必要に応じて）
        const storeNames = ["watchHistory", "seriesAlerts"];
        const transaction = db.transaction(storeNames, "readwrite");

        await migration.migrate(db, transaction);

        this.currentProgress.completedCount++;
        this.currentProgress.progress = (i + 1) / requiredMigrations.length;
        this.dispatchProgressEvent();
      }

      this.currentProgress.isRunning = false;
      this.currentProgress.currentMigration = null;
      this.currentProgress.progress = 1;
      this.dispatchProgressEvent();

      logger.info("[MigrationManager] 全てのマイグレーションが完了しました");
    } catch (error) {
      this.currentProgress.error =
        error instanceof Error ? error.message : String(error);
      this.currentProgress.isRunning = false;
      this.dispatchProgressEvent();

      logger.error("[MigrationManager] マイグレーション実行エラー:", error);
      throw new Error(String(error));
    }
  }

  /**
   * データベースの永続化を要求する
   */
  async requestPersistence(): Promise<DBResult<boolean>> {
    try {
      if (!("storage" in navigator) || !("persist" in navigator.storage)) {
        return {
          success: false,
          error: "このブラウザはデータベース永続化をサポートしていません",
        };
      }

      const isPersistent = await navigator.storage.persist();

      if (isPersistent) {
        logger.info("[MigrationManager] データベースの永続化に成功しました");
        return { success: true, data: true };
      } else {
        logger.warn("[MigrationManager] データベースの永続化に失敗しました");
        return { success: true, data: false };
      }
    } catch (error) {
      logger.error("[MigrationManager] 永続化要求エラー:", error);
      return {
        success: false,
        error: `永続化要求失敗: ${MigrationManager.toErrorMessage(error)}`,
      };
    }
  }

  /**
   * 永続化状態を取得する
   */
  async getPersistenceStatus(): Promise<DBResult<PersistenceStatus>> {
    try {
      if (!("storage" in navigator)) {
        return {
          success: false,
          error: "このブラウザはStorage APIをサポートしていません",
        };
      }

      const [isPersistent, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate(),
      ]);

      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usageRate = quota > 0 ? usage / quota : 0;
      const canPersist = "persist" in navigator.storage;

      const status: PersistenceStatus = {
        isPersistent,
        quota,
        usage,
        usageRate,
        canPersist,
      };

      return { success: true, data: status };
    } catch (error) {
      logger.error("[MigrationManager] 永続化状態取得エラー:", error);
      return {
        success: false,
        error: `永続化状態取得失敗: ${MigrationManager.toErrorMessage(error)}`,
      };
    }
  }

  /**
   * バックアップを作成する
   */
  private async createBackup(db: IDBDatabase): Promise<void> {
    if (!this.config.autoBackup) return;

    try {
      logger.info("[MigrationManager] バックアップを作成中...");

      const transaction = db.transaction(
        ["watchHistory", "seriesAlerts"],
        "readonly",
      );
      const watchHistoryStore = transaction.objectStore("watchHistory");
      const seriesAlertsStore = transaction.objectStore("seriesAlerts");

      const [watchHistory, seriesAlerts] = await Promise.all([
        new Promise<WatchHistoryEntry[]>((resolve, reject) => {
          const request = watchHistoryStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(new Error(MigrationManager.toErrorMessage(request.error)));
        }),
        new Promise<SeriesAlert[]>((resolve, reject) => {
          const request = seriesAlertsStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(new Error(MigrationManager.toErrorMessage(request.error)));
        }),
      ]);

      const backup = {
        version: db.version,
        timestamp: Date.now(),
        entries: watchHistory,
        seriesAlerts,
      };

      // LocalStorageにバックアップを保存
      const backupKey = `watch-history-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // 古いバックアップを削除（最新5つまで保持）
      this.cleanupOldBackups();

      logger.info("[MigrationManager] バックアップを作成しました:", backupKey);
    } catch (error) {
      logger.error("[MigrationManager] バックアップ作成エラー:", error);
      // バックアップ失敗してもマイグレーションは続行
    }
  }

  /**
   * 古いバックアップを削除する
   */
  private cleanupOldBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter((key) => key.startsWith("watch-history-backup-"))
        .sort((a, b) => {
          const timestampA = parseInt(a.split("-").pop() || "0");
          const timestampB = parseInt(b.split("-").pop() || "0");
          return timestampB - timestampA;
        });

      // 最新5つを除いて削除
      backupKeys.slice(5).forEach((key) => {
        localStorage.removeItem(key);
        logger.debug(`[MigrationManager] 古いバックアップを削除: ${key}`);
      });
    } catch (error) {
      logger.error("[MigrationManager] バックアップ削除エラー:", error);
    }
  }

  /**
   * マイグレーション進捗イベントを発行する
   */
  private dispatchProgressEvent(): void {
    const event = new CustomEvent("migrationProgress", {
      detail: { ...this.currentProgress },
    });
    document.dispatchEvent(event);
  }

  /**
   * 現在のマイグレーション進捗を取得する
   */
  getMigrationProgress(): MigrationProgress {
    return { ...this.currentProgress };
  }

  /**
   * マイグレーション設定を取得する
   */
  getConfig(): DatabaseManagementConfig {
    return { ...this.config };
  }

  /**
   * マイグレーション設定を更新する
   */
  updateConfig(newConfig: Partial<DatabaseManagementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("[MigrationManager] 設定を更新しました:", this.config);
  }

  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups(): Array<{
    key: string;
    timestamp: number;
    version: number;
  }> {
    try {
      const backups = Object.keys(localStorage)
        .filter((key) => key.startsWith("watch-history-backup-"))
        .map((key) => {
          try {
            const backup = JSON.parse(localStorage.getItem(key) || "{}") as {
              timestamp?: unknown;
              version?: unknown;
            };
            return {
              key,
              timestamp:
                typeof backup.timestamp === "number" ? backup.timestamp : 0,
              version: typeof backup.version === "number" ? backup.version : 0,
            };
          } catch {
            return null;
          }
        })
        .filter(
          (
            backup,
          ): backup is { key: string; timestamp: number; version: number } =>
            backup !== null,
        )
        .sort((a, b) => b.timestamp - a.timestamp);

      return backups as Array<{
        key: string;
        timestamp: number;
        version: number;
      }>;
    } catch (error) {
      logger.error("[MigrationManager] バックアップ一覧取得エラー:", error);
      return [];
    }
  }

  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey: string): Promise<DBResult<void>> {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: "バックアップデータが見つかりません" };
      }

      const backup = JSON.parse(backupData) as {
        version?: number;
        entries?: unknown[];
        watchHistory?: unknown[];
        seriesAlerts?: unknown[];
      };
      logger.info(
        "[MigrationManager] バックアップからリストア中...",
        backupKey,
      );

      // データベースを開き直してリストア
      const request = indexedDB.open("NicoWatchHistory", backup.version);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(
            ["watchHistory", "seriesAlerts"],
            "readwrite",
          );

          // 既存データを削除
          const watchHistoryStore = transaction.objectStore("watchHistory");
          const seriesAlertsStore = transaction.objectStore("seriesAlerts");

          Promise.all([
            new Promise<void>((resolve, reject) => {
              const clearRequest = watchHistoryStore.clear();
              clearRequest.onsuccess = () => resolve();
              clearRequest.onerror = () =>
                reject(
                  new Error(
                    MigrationManager.toErrorMessage(clearRequest.error),
                  ),
                );
            }),
            new Promise<void>((resolve, reject) => {
              const clearRequest = seriesAlertsStore.clear();
              clearRequest.onsuccess = () => resolve();
              clearRequest.onerror = () =>
                reject(
                  new Error(
                    MigrationManager.toErrorMessage(clearRequest.error),
                  ),
                );
            }),
          ])
            .then(() => {
              // バックアップデータを復元
              const promises: Promise<void>[] = [];

              // 後方互換性のため、watchHistoryとentriesの両方をチェック
              const entries = (backup.entries ||
                backup.watchHistory ||
                []) as WatchHistoryEntry[];
              entries.forEach((entry: WatchHistoryEntry) => {
                promises.push(
                  new Promise<void>((resolve, reject) => {
                    const addRequest = watchHistoryStore.add(entry);
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = () =>
                      reject(
                        new Error(
                          MigrationManager.toErrorMessage(addRequest.error),
                        ),
                      );
                  }),
                );
              });

              if (backup.seriesAlerts && Array.isArray(backup.seriesAlerts)) {
                (backup.seriesAlerts as SeriesAlert[]).forEach(
                  (alert: SeriesAlert) => {
                    promises.push(
                      new Promise<void>((resolve, reject) => {
                        const addRequest = seriesAlertsStore.add(alert);
                        addRequest.onsuccess = () => resolve();
                        addRequest.onerror = () =>
                          reject(
                            new Error(
                              MigrationManager.toErrorMessage(addRequest.error),
                            ),
                          );
                      }),
                    );
                  },
                );
              }

              Promise.all(promises)
                .then(() => {
                  logger.info(
                    "[MigrationManager] バックアップからのリストアが完了しました",
                  );
                  resolve({ success: true });
                })
                .catch((error) => {
                  logger.error(
                    "[MigrationManager] リストア中にエラーが発生:",
                    error,
                  );
                  reject(
                    new Error(
                      `リストア失敗: ${MigrationManager.toErrorMessage(error)}`,
                    ),
                  );
                });
            })
            .catch((error) => {
              logger.error(
                "[MigrationManager] データクリア中にエラーが発生:",
                error,
              );
              reject(
                new Error(
                  `データクリア失敗: ${MigrationManager.toErrorMessage(error)}`,
                ),
              );
            });
        };

        request.onerror = () => {
          logger.error(
            "[MigrationManager] データベース開放エラー:",
            request.error,
          );
          reject(
            new Error(
              `データベース開放失敗: ${MigrationManager.toErrorMessage(request.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      logger.error("[MigrationManager] リストアエラー:", error);
      return {
        success: false,
        error: `リストア失敗: ${MigrationManager.toErrorMessage(error)}`,
      };
    }
  }
}

// デフォルトインスタンスをエクスポート
export const migrationManager = new MigrationManager();
