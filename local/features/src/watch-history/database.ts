/** 視聴履歴の統計・シリーズ・管理操作。 */
/**
 * ニコニコ動画視聴履歴拡張 - データベース操作
 *
 * @description IndexedDBを使った視聴履歴の保存・取得・統計計算
 * @author roflsunriz
 */

import type {
  CreatorStats,
  DBResult,
  DailyStats,
  DatabaseManagementConfig,
  HourlyStats,
  MigrationProgress,
  PersistenceStatus,
  SeriesAlert,
  SeriesFilterCondition,
  SeriesStats,
  WatchHistoryEntry,
} from "@/types/watch-history-types";
import { migrationManager } from "@/watch-history/migration-manager";
import { WatchHistoryDatabaseCore } from "./database-core";
import { WatchHistoryQueryDatabase } from "./database-query";

export class WatchHistoryDatabase extends WatchHistoryQueryDatabase {
  /**
   * 日別統計を計算する
   */
  protected calculateDailyStats(entries: WatchHistoryEntry[]): DailyStats[] {
    const dailyMap = new Map<string, DailyStats>();

    for (const entry of entries) {
      const date = new Date(entry.watchedAt).toISOString().split("T")[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          watchCount: 0,
          totalWatchTime: 0,
          completedCount: 0,
        });
      }

      const stats = dailyMap.get(date)!;
      stats.watchCount += entry.watchCount;
      stats.totalWatchTime += WatchHistoryDatabaseCore.normalizeWatchSeconds(
        entry.lastPosition,
      );
      if (entry.completed) {
        stats.completedCount++;
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * 時間帯別統計を計算する
   */
  protected calculateHourlyStats(entries: WatchHistoryEntry[]): HourlyStats[] {
    const hourlyMap = new Map<number, number>();

    for (const entry of entries) {
      for (const log of entry.watchLogs) {
        const hour = new Date(log.date).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    }

    const hourlyStats: HourlyStats[] = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.push({
        hour,
        watchCount: hourlyMap.get(hour) || 0,
      });
    }

    return hourlyStats;
  }

  /**
   * 投稿者別統計を計算する
   */
  protected calculateCreatorStats(
    entries: WatchHistoryEntry[],
  ): CreatorStats[] {
    const creatorMap = new Map<string, CreatorStats>();

    for (const entry of entries) {
      if (!creatorMap.has(entry.ownerId)) {
        creatorMap.set(entry.ownerId, {
          ownerId: entry.ownerId,
          ownerName: entry.ownerName,
          videoCount: 0,
          totalWatchTime: 0,
        });
      }

      const stats = creatorMap.get(entry.ownerId)!;
      stats.videoCount++;
      stats.totalWatchTime += WatchHistoryDatabaseCore.normalizeWatchSeconds(
        entry.lastPosition,
      );
    }

    return Array.from(creatorMap.values()).sort(
      (a, b) => b.videoCount - a.videoCount,
    );
  }

  // ===== シリーズ関連メソッド =====

  /**
   * シリーズ統計を取得する
   */
  async getSeriesStats(
    filter?: SeriesFilterCondition,
  ): Promise<DBResult<SeriesStats[]>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ統計用データ取得失敗" };
    }

    const entries = entriesResult.data;
    const seriesMap = new Map<number, SeriesStats>();

    for (const entry of entries) {
      if (!entry.series) continue;

      const seriesId = entry.series.id;
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          seriesId,
          seriesTitle: entry.series.title,
          watchedCount: 0,
          totalCount: 0, // 実際の総数は不明なので0に設定
          progressRate: 0,
          lastWatchedAt: 0,
          lastVideoId: "",
          lastVideoTitle: "",
        });
      }

      const stats = seriesMap.get(seriesId)!;
      stats.watchedCount++;

      if (entry.watchedAt > stats.lastWatchedAt) {
        stats.lastWatchedAt = entry.watchedAt;
        stats.lastVideoId = entry.videoId;
        stats.lastVideoTitle = entry.title;
      }
    }

    let seriesStats = Array.from(seriesMap.values());

    // フィルタを適用
    if (filter) {
      seriesStats = this.applySeriesFilter(seriesStats, filter);
    }

    return { success: true, data: seriesStats };
  }

  /**
   * シリーズの動画一覧を取得する
   */
  async getSeriesVideos(
    seriesId: number,
  ): Promise<DBResult<WatchHistoryEntry[]>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ動画取得失敗" };
    }

    const seriesVideos = entriesResult.data.filter(
      (entry) => entry.series && entry.series.id === seriesId,
    );

    return { success: true, data: seriesVideos };
  }

  /**
   * extension管理へ移すため、旧IndexedDBのシリーズアラートを取得する。
   */
  async getLegacySeriesAlerts(): Promise<DBResult<SeriesAlert[]>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    if (!this.db.objectStoreNames.contains("seriesAlerts")) {
      return { success: true, data: [] };
    }

    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");

      const alerts = await new Promise<SeriesAlert[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
          );
      });

      return { success: true, data: alerts };
    } catch (error) {
      return {
        success: false,
        error: `シリーズアラート一覧取得失敗: ${String(error)}`,
      };
    }
  }

  /**
   * extensionへの移行が完了した旧シリーズアラートを消去する。
   */
  async clearLegacySeriesAlerts(): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    if (!this.db.objectStoreNames.contains("seriesAlerts")) {
      return { success: true };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");

        transaction.oncomplete = () => {
          resolve({ success: true });
        };

        transaction.onerror = () => {
          reject(
            new Error(
              `旧シリーズアラート消去失敗: ${WatchHistoryDatabaseCore.toErrorMessage(transaction.error)}`,
            ),
          );
        };

        const clearRequest = store.clear();
        clearRequest.onerror = () => {
          reject(
            new Error(
              `旧シリーズアラート消去失敗: ${WatchHistoryDatabaseCore.toErrorMessage(clearRequest.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      return {
        success: false,
        error: `旧シリーズアラート消去失敗: ${String(error)}`,
      };
    }
  }

  // ===== 視聴履歴削除機能 =====

  /**
   * 指定した動画IDの視聴履歴を削除する（個別削除）
   */
  async deleteEntry(videoId: string): Promise<DBResult<void>> {
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
              `視聴履歴削除失敗: ${WatchHistoryDatabaseCore.toErrorMessage(transaction.error)}`,
            ),
          );
        };

        const deleteRequest = store.delete(videoId);
        deleteRequest.onerror = () => {
          reject(
            new Error(
              `視聴履歴削除失敗: ${WatchHistoryDatabaseCore.toErrorMessage(deleteRequest.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      return { success: false, error: `視聴履歴削除失敗: ${String(error)}` };
    }
  }

  /**
   * 全ての視聴履歴を削除する（一括削除）
   */
  async deleteAllEntries(): Promise<DBResult<number>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }

    try {
      return new Promise<DBResult<number>>((resolve, reject) => {
        const transaction = this.db!.transaction(
          [this.config.storeName],
          "readwrite",
        );
        const store = transaction.objectStore(this.config.storeName);

        // 削除前に件数を取得
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          const deletedCount = countRequest.result;

          // 全削除を実行
          const clearRequest = store.clear();

          clearRequest.onsuccess = () => {
            resolve({ success: true, data: deletedCount });
          };

          clearRequest.onerror = () => {
            reject(
              new Error(
                `一括削除失敗: ${WatchHistoryDatabaseCore.toErrorMessage(clearRequest.error)}`,
              ),
            );
          };
        };

        countRequest.onerror = () => {
          reject(
            new Error(
              `件数取得失敗: ${WatchHistoryDatabaseCore.toErrorMessage(countRequest.error)}`,
            ),
          );
        };

        transaction.onerror = () => {
          reject(
            new Error(
              `一括削除失敗: ${WatchHistoryDatabaseCore.toErrorMessage(transaction.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      return { success: false, error: `一括削除失敗: ${String(error)}` };
    }
  }

  /**
   * 条件に一致する視聴履歴を削除する（条件付き削除）
   * @param maxWatchCount 最大視聴回数（この回数以下を削除、nullの場合は視聴回数条件を無視）
   * @param maxProgressRate 最大進捗率（この進捗率以下を削除、0-100の範囲、nullの場合は進捗率条件を無視）
   */
  async deleteEntriesByCondition(
    maxWatchCount: number | null,
    maxProgressRate: number | null,
  ): Promise<DBResult<number>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }

    if (maxWatchCount === null && maxProgressRate === null) {
      return {
        success: false,
        error: "少なくとも1つの条件を指定してください",
      };
    }

    if (
      (maxWatchCount !== null && maxWatchCount < 0) ||
      (maxProgressRate !== null &&
        (maxProgressRate < 0 || maxProgressRate > 100))
    ) {
      return {
        success: false,
        error: "無効な条件値（視聴回数は0以上、進捗率は0-100の範囲）",
      };
    }

    try {
      return new Promise<DBResult<number>>((resolve, reject) => {
        const transaction = this.db!.transaction(
          [this.config.storeName],
          "readwrite",
        );
        const store = transaction.objectStore(this.config.storeName);
        const deletedVideoIds: string[] = [];

        transaction.oncomplete = () => {
          resolve({ success: true, data: deletedVideoIds.length });
        };

        transaction.onerror = () => {
          reject(
            new Error(
              `条件付き削除失敗: ${WatchHistoryDatabaseCore.toErrorMessage(transaction.error)}`,
            ),
          );
        };

        // 全エントリをカーソルで走査
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;

          if (cursor) {
            const entry = cursor.value as WatchHistoryEntry;

            // 進捗率を計算（UI上の計算式に合わせる）
            const lastPosition = WatchHistoryDatabaseCore.normalizeWatchSeconds(
              entry.lastPosition,
            );
            const progressRate =
              entry.lengthSec > 0
                ? Math.round((lastPosition / entry.lengthSec) * 100)
                : 0;

            // 有効な条件のみチェック（nullの条件は常にマッチ）
            const watchCountMatch =
              maxWatchCount === null || entry.watchCount <= maxWatchCount;
            const progressRateMatch =
              maxProgressRate === null || progressRate <= maxProgressRate;

            if (watchCountMatch && progressRateMatch) {
              // 削除対象として記録
              deletedVideoIds.push(entry.videoId);

              // エントリを削除
              const deleteRequest = cursor.delete();
              deleteRequest.onerror = () => {
                reject(
                  new Error(
                    `エントリ削除失敗 (${entry.videoId}): ${WatchHistoryDatabaseCore.toErrorMessage(deleteRequest.error)}`,
                  ),
                );
                return;
              };
            }

            // 次のエントリへ
            cursor.continue();
          }
          // カーソルがnullになったら完了（transactionのoncompleteが呼ばれる）
        };

        cursorRequest.onerror = () => {
          reject(
            new Error(
              `カーソル取得失敗: ${WatchHistoryDatabaseCore.toErrorMessage(cursorRequest.error)}`,
            ),
          );
        };
      });
    } catch (error) {
      return { success: false, error: `条件付き削除失敗: ${String(error)}` };
    }
  }

  /**
   * シリーズフィルタを適用する
   */
  private applySeriesFilter(
    seriesStats: SeriesStats[],
    filter: SeriesFilterCondition,
  ): SeriesStats[] {
    return seriesStats.filter((stats) => {
      // テキスト検索
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      // 進捗状況フィルタ
      if (filter.progressFilter && filter.progressFilter !== "all") {
        switch (filter.progressFilter) {
          case "watching":
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case "completed":
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case "not_started":
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }

      // 日付範囲フィルタ
      if (filter.dateRange) {
        const lastWatchedAt = stats.lastWatchedAt;
        if (
          lastWatchedAt < filter.dateRange.start ||
          lastWatchedAt > filter.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // ===== 永続化・マイグレーション管理メソッド =====

  /**
   * データベースの永続化状態を取得する
   */
  async getPersistenceStatus(): Promise<DBResult<PersistenceStatus>> {
    return await migrationManager.getPersistenceStatus();
  }

  /**
   * データベースの永続化を要求する
   */
  async requestPersistence(): Promise<DBResult<boolean>> {
    return await migrationManager.requestPersistence();
  }

  /**
   * マイグレーション進捗を取得する
   */
  getMigrationProgress(): MigrationProgress {
    return migrationManager.getMigrationProgress();
  }

  /**
   * マイグレーション設定を取得する
   */
  getMigrationConfig(): DatabaseManagementConfig {
    return migrationManager.getConfig();
  }

  /**
   * マイグレーション設定を更新する
   */
  updateMigrationConfig(config: Partial<DatabaseManagementConfig>): void {
    migrationManager.updateConfig(config);
  }

  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups(): Array<{
    key: string;
    timestamp: number;
    version: number;
  }> {
    return migrationManager.getAvailableBackups();
  }

  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey: string): Promise<DBResult<void>> {
    return await migrationManager.restoreFromBackup(backupKey);
  }

  /**
   * 手動でマイグレーションを実行する
   */
  async runMigration(): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }

    try {
      await migrationManager.executeMigrations(this.db, 1, this.config.version);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `マイグレーション実行失敗: ${WatchHistoryDatabaseCore.toErrorMessage(error)}`,
      };
    }
  }
}

// デフォルトインスタンスをエクスポート
export const watchHistoryDB = new WatchHistoryDatabase();
