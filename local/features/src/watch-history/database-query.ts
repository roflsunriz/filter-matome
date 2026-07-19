/** 履歴のページング・検索・インポートを担う層。 */
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
  FilterCondition,
  HourlyStats,
  ImportConfig,
  OverallStats,
  SortBy,
  SortOrder,
  WatchHistoryEntry,
  WatchHistoryExportData,
  WatchHistoryPage,
  WatchLogEntry,
} from "@/types/watch-history-types";
import { WatchHistoryDatabaseCore } from "./database-core";

export abstract class WatchHistoryQueryDatabase extends WatchHistoryDatabaseCore {
  protected abstract calculateDailyStats(
    entries: WatchHistoryEntry[],
  ): DailyStats[];
  protected abstract calculateHourlyStats(
    entries: WatchHistoryEntry[],
  ): HourlyStats[];
  protected abstract calculateCreatorStats(
    entries: WatchHistoryEntry[],
  ): CreatorStats[];

  /**
   * 履歴を1ページ分だけ取得する。
   *
   * IndexedDBのインデックスで表現できるソートではカーソルを使い、
   * ページ外のエントリを配列へ展開しない。複合フィルタ時は一致件数を
   * 数えるため全カーソルを走査するが、保持するのは対象ページだけにする。
   */
  async getEntriesPage(
    offset: number,
    limit: number,
    sortBy: SortBy = "watchedAt",
    sortOrder: SortOrder = "desc",
    filter?: FilterCondition,
  ): Promise<DBResult<WatchHistoryPage>> {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }

    const safeOffset = Number.isFinite(offset)
      ? Math.max(0, Math.trunc(offset))
      : 0;
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.trunc(limit))
      : 1;
    const indexName = this.getPagingIndexName(sortBy);

    // IndexedDBのインデックスで順序を保証できない項目は、従来の
    // ソート結果を利用してからページ範囲だけを返す。
    if (!indexName) {
      const allResult = await this.getAllEntries(sortBy, sortOrder, filter);
      if (!allResult.success || !allResult.data) {
        return { success: false, error: allResult.error ?? "取得失敗" };
      }
      return {
        success: true,
        data: {
          entries: allResult.data.slice(safeOffset, safeOffset + safeLimit),
          total: allResult.data.length,
          offset: safeOffset,
          limit: safeLimit,
        },
      };
    }

    try {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly",
      );
      const store = transaction.objectStore(this.config.storeName);
      const source: IDBIndex | IDBObjectStore = store.index(indexName);
      const direction: IDBCursorDirection =
        sortOrder === "asc" ? "next" : "prev";

      if (!filter) {
        const totalPromise = new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(
              new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
            );
        });
        const entriesPromise = new Promise<WatchHistoryEntry[]>(
          (resolve, reject) => {
            const entries: WatchHistoryEntry[] = [];
            let advanced = safeOffset === 0;
            const request = source.openCursor(null, direction);
            request.onerror = () =>
              reject(
                new Error(
                  WatchHistoryDatabaseCore.toErrorMessage(request.error),
                ),
              );
            request.onsuccess = () => {
              const cursor = request.result;
              if (!cursor) {
                resolve(entries);
                return;
              }
              if (!advanced) {
                advanced = true;
                cursor.advance(safeOffset);
                return;
              }
              entries.push(cursor.value as WatchHistoryEntry);
              if (entries.length >= safeLimit) {
                resolve(entries);
                return;
              }
              cursor.continue();
            };
          },
        );
        const [total, entries] = await Promise.all([
          totalPromise,
          entriesPromise,
        ]);
        return {
          success: true,
          data: {
            entries,
            total,
            offset: safeOffset,
            limit: safeLimit,
          },
        };
      }

      const page = await new Promise<WatchHistoryPage>((resolve, reject) => {
        const entries: WatchHistoryEntry[] = [];
        let matchingCount = 0;
        const request = source.openCursor(null, direction);

        request.onerror = () =>
          reject(
            new Error(WatchHistoryDatabaseCore.toErrorMessage(request.error)),
          );
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve({
              entries,
              total: matchingCount,
              offset: safeOffset,
              limit: safeLimit,
            });
            return;
          }

          const entry = cursor.value as WatchHistoryEntry;
          const matches = this.matchesFilter(entry, filter);
          if (matches) {
            if (matchingCount >= safeOffset && entries.length < safeLimit) {
              entries.push(entry);
            }
            matchingCount += 1;
          }
          cursor.continue();
        };
      });

      return { success: true, data: page };
    } catch (error) {
      return { success: false, error: `ページ取得失敗: ${String(error)}` };
    }
  }

  /**
   * 統計データを計算する
   */
  async calculateStats(
    sourceEntries?: readonly WatchHistoryEntry[],
  ): Promise<DBResult<OverallStats>> {
    let entries: WatchHistoryEntry[];
    if (sourceEntries) {
      entries = [...sourceEntries];
    } else {
      const entriesResult = await this.getAllEntries();
      if (!entriesResult.success || !entriesResult.data) {
        return { success: false, error: "統計計算用データ取得失敗" };
      }
      entries = entriesResult.data;
    }

    try {
      // 基本統計
      const totalVideos = entries.length;
      const totalWatchTime = entries.reduce(
        (sum, entry) =>
          sum +
          WatchHistoryDatabaseCore.normalizeWatchSeconds(entry.lastPosition),
        0,
      );
      const completedCount = entries.filter((entry) => entry.completed).length;
      const completionRate = totalVideos > 0 ? completedCount / totalVideos : 0;

      // 日別統計
      const dailyStats = this.calculateDailyStats(entries);

      // 時間帯別統計
      const hourlyStats = this.calculateHourlyStats(entries);

      // 投稿者別統計
      const creatorStats = this.calculateCreatorStats(entries);

      const stats: OverallStats = {
        totalVideos,
        totalWatchTime,
        completionRate,
        dailyStats,
        hourlyStats,
        creatorStats,
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `統計計算失敗: ${String(error)}` };
    }
  }

  /**
   * データをエクスポートする
   */
  async exportData(): Promise<DBResult<WatchHistoryExportData>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "エクスポート用データ取得失敗" };
    }

    const exportData: WatchHistoryExportData = {
      exportedAt: Date.now(),
      version: "3.0.0",
      entries: entriesResult.data,
      // 正本はNicoCache_nl extensionにあるため、app.tsで取得して設定する。
      seriesAlerts: [],
    };

    return { success: true, data: exportData };
  }

  /**
   * データをインポートする
   */
  async importData(
    exportData: WatchHistoryExportData,
    config: ImportConfig,
  ): Promise<DBResult<number>> {
    if (!exportData.entries || !Array.isArray(exportData.entries)) {
      return { success: false, error: "不正なデータ形式" };
    }

    let importedCount = 0;
    const maxEntries = config.maxEntries || exportData.entries.length;

    try {
      // 視聴履歴データをインポート
      for (const entry of exportData.entries.slice(0, maxEntries)) {
        const existingEntry = await this.getEntry(entry.videoId);

        if (existingEntry.success && existingEntry.data) {
          // 既存エントリがある場合
          if (config.duplicateHandling === "skip") {
            continue;
          } else if (config.duplicateHandling === "overwrite") {
            await this.saveEntry(entry);
            importedCount++;
          } else if (config.duplicateHandling === "merge") {
            // マージ処理
            const merged = this.mergeEntries(existingEntry.data, entry);
            await this.saveEntry(merged);
            importedCount++;
          }
        } else {
          // 新規エントリ
          await this.saveEntry(entry);
          importedCount++;
        }
      }

      return { success: true, data: importedCount };
    } catch (error) {
      return { success: false, error: `インポート失敗: ${String(error)}` };
    }
  }

  // ===== プライベートメソッド =====

  /**
   * 視聴ログをマージする
   */
  protected mergeWatchLogs(
    existing: WatchLogEntry[],
    newLogs: WatchLogEntry[],
  ): WatchLogEntry[] {
    const merged = [...existing];

    for (const newLog of newLogs) {
      const existingIndex = merged.findIndex(
        (log) => Math.abs(log.date - newLog.date) < 1000, // 1秒以内は同じ視聴とみなす
      );

      if (existingIndex >= 0) {
        // 既存ログを更新
        merged[existingIndex] = newLog;
      } else {
        // 新しいログを追加
        merged.push(newLog);
      }
    }

    // 日時順でソート
    return merged.sort((a, b) => a.date - b.date);
  }

  /**
   * エントリをマージする
   */
  private mergeEntries(
    existing: WatchHistoryEntry,
    newEntry: WatchHistoryEntry,
  ): WatchHistoryEntry {
    return {
      ...existing,
      ...newEntry,
      // 重要フィールドは最新の情報を優先
      watchedAt: Math.max(existing.watchedAt, newEntry.watchedAt),
      firstWatchedAt: Math.min(
        existing.firstWatchedAt,
        newEntry.firstWatchedAt,
      ),
      watchCount: existing.watchCount + newEntry.watchCount,
      watchLogs: this.mergeWatchLogs(existing.watchLogs, newEntry.watchLogs),
    };
  }

  /**
   * フィルタを適用する
   */
  protected applyFilter(
    entries: WatchHistoryEntry[],
    filter: FilterCondition,
  ): WatchHistoryEntry[] {
    return entries.filter((entry) => this.matchesFilter(entry, filter));
  }

  private matchesFilter(
    entry: WatchHistoryEntry,
    filter: FilterCondition,
  ): boolean {
    // ===== 検索テキストフィルタ =====
    // 空文字列や "null" / "undefined" といった無効値は無視する
    const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
    if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
      const searchTargets = [
        entry.title,
        entry.ownerName,
        (entry.tags ?? []).join(" "),
        entry.memo,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchTargets.includes(rawSearch)) return false;
    }

    const ownerIdFilter =
      filter.ownerId && String(filter.ownerId).trim().toLowerCase();
    if (
      ownerIdFilter &&
      ownerIdFilter !== "null" &&
      ownerIdFilter !== "undefined" &&
      String(entry.ownerId).toLowerCase() !== ownerIdFilter
    ) {
      return false;
    }

    if (filter.completedOnly && !entry.completed) return false;

    if (
      filter.dateRange &&
      (entry.watchedAt < filter.dateRange.start ||
        entry.watchedAt > filter.dateRange.end)
    ) {
      return false;
    }

    const uploadedAt = entry.stats?.uploadedAt;
    if (
      filter.uploadedDateRange &&
      (uploadedAt === undefined ||
        uploadedAt < filter.uploadedDateRange.start ||
        uploadedAt > filter.uploadedDateRange.end)
    ) {
      return false;
    }

    return true;
  }

  /**
   * ソートを適用する
   */
  protected applySorting(
    entries: WatchHistoryEntry[],
    sortBy: SortBy,
    sortOrder: SortOrder,
  ): WatchHistoryEntry[] {
    return entries.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "watchedAt":
          aValue = a.watchedAt;
          bValue = b.watchedAt;
          break;
        case "firstWatchedAt":
          aValue = a.firstWatchedAt;
          bValue = b.firstWatchedAt;
          break;
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "ownerName":
          aValue = a.ownerName;
          bValue = b.ownerName;
          break;
        case "lengthSec":
          aValue = a.lengthSec;
          bValue = b.lengthSec;
          break;
        case "watchCount":
          aValue = a.watchCount;
          bValue = b.watchCount;
          break;
        case "viewCount":
          aValue = a.stats?.viewCount || 0;
          bValue = b.stats?.viewCount || 0;
          break;
        case "commentCount":
          aValue = a.stats?.commentCount || 0;
          bValue = b.stats?.commentCount || 0;
          break;
        case "mylistCount":
          aValue = a.stats?.mylistCount || 0;
          bValue = b.stats?.mylistCount || 0;
          break;
        case "likeCount":
          aValue = a.stats?.likeCount || 0;
          bValue = b.stats?.likeCount || 0;
          break;
        case "uploadedAt":
          aValue = a.stats?.uploadedAt || 0;
          bValue = b.stats?.uploadedAt || 0;
          break;
        default:
          aValue = a.watchedAt;
          bValue = b.watchedAt;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const result = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? result : -result;
      } else {
        const result = (aValue as number) - (bValue as number);
        return sortOrder === "asc" ? result : -result;
      }
    });
  }

  /** カーソルページングに利用できるIndexedDBインデックス名を返す。 */
  private getPagingIndexName(sortBy: SortBy): string | null {
    switch (sortBy) {
      case "watchedAt":
      case "firstWatchedAt":
      case "title":
        return sortBy;
      default:
        return null;
    }
  }
}
