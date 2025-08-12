/**
 * ニコニコ動画視聴履歴拡張 - データベース操作なのじゃ
 * 
 * @description IndexedDBを使った視聴履歴の保存・取得・統計計算
 * @author わらわ（のじゃロリ娘）
 */

import type { 
  WatchHistoryEntry, 
  WatchLogEntry, 
  DBResult, 
  DatabaseConfig, 
  SortBy, 
  SortOrder, 
  FilterCondition,
  OverallStats,
  DailyStats,
  HourlyStats,
  CreatorStats,
  WatchHistoryExportData,
  ImportConfig,
  SeriesStats,
  SeriesAlert,
  SeriesFilterCondition,
  PersistenceStatus,
  MigrationProgress,
  DatabaseManagementConfig
} from '../types/watch-history-types';
import { logger } from '../common/logger';
import { migrationManager } from './migration-manager';

/**
 * 視聴履歴データベース操作クラスなのじゃ
 */
export class WatchHistoryDatabase {
  private db: IDBDatabase | null = null;
  private readonly config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      dbName: config?.dbName || 'NicoWatchHistory',
      version: config?.version || 2,
      storeName: config?.storeName || 'watchHistory'
    };
  }

  private static toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * データベースを初期化するのじゃ
   */
  async initialize(): Promise<DBResult<void>> {
    try {
      logger.debug('データベース初期化開始:', { dbName: this.config.dbName, version: this.config.version });
      const request = indexedDB.open(this.config.dbName, this.config.version);
      
      const initResult = await new Promise<DBResult<void>>((resolve, reject) => {
        request.onerror = () => {
          logger.error('データベース接続失敗');
          reject(new Error('データベース接続失敗なのじゃ'));
        };

        request.onsuccess = () => {
          this.db = request.result;
          logger.debug('データベース初期化成功:', { dbName: this.config.dbName });
          resolve({ success: true });
        };

        request.onupgradeneeded = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion || this.config.version;
          
          logger.debug('データベーススキーマ更新:', { 
            oldVersion, 
            newVersion, 
            version: this.config.version 
          });
          
          // 新規作成の場合（oldVersion === 0）
          if (oldVersion === 0) {
            // 視聴履歴ストアを作成
            const store = db.createObjectStore(this.config.storeName, {
              keyPath: 'videoId'
            });
            logger.debug('新しいストアを作成:', { storeName: this.config.storeName });

            // インデックスを作成
            store.createIndex('watchedAt', 'watchedAt', { unique: false });
            store.createIndex('ownerId', 'ownerId', { unique: false });
            store.createIndex('completed', 'completed', { unique: false });
            store.createIndex('firstWatchedAt', 'firstWatchedAt', { unique: false });
            store.createIndex('title', 'title', { unique: false });
            store.createIndex('seriesId', 'series.id', { unique: false });

            // シリーズアラートストアを作成
            const alertStore = db.createObjectStore('seriesAlerts', {
              keyPath: 'id'
            });
            logger.debug('シリーズアラートストアを作成');

            // シリーズアラートのインデックスを作成
            alertStore.createIndex('seriesId', 'seriesId', { unique: false });
            alertStore.createIndex('enabled', 'enabled', { unique: false });
            alertStore.createIndex('nextCheckAt', 'nextCheckAt', { unique: false });
            
            logger.debug('インデックス作成完了');
          } else {
            // 既存データベースの場合はマイグレーション実行
            try {
              // まずストアが存在しない場合は作成
              if (!db.objectStoreNames.contains(this.config.storeName)) {
                const store = db.createObjectStore(this.config.storeName, {
                  keyPath: 'videoId'
                });
                store.createIndex('watchedAt', 'watchedAt', { unique: false });
                store.createIndex('ownerId', 'ownerId', { unique: false });
                store.createIndex('completed', 'completed', { unique: false });
                store.createIndex('firstWatchedAt', 'firstWatchedAt', { unique: false });
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('seriesId', 'series.id', { unique: false });
              }

              if (!db.objectStoreNames.contains('seriesAlerts')) {
                const alertStore = db.createObjectStore('seriesAlerts', {
                  keyPath: 'id'
                });
                alertStore.createIndex('seriesId', 'seriesId', { unique: false });
                alertStore.createIndex('enabled', 'enabled', { unique: false });
                alertStore.createIndex('nextCheckAt', 'nextCheckAt', { unique: false });
              }

              // マイグレーションを実行
              await migrationManager.executeMigrations(db, oldVersion, newVersion);
              
            } catch (error) {
              logger.error('マイグレーション実行エラー:', error);
              // マイグレーションに失敗した場合でもデータベースは使用可能にする
            }
          }
        };
      });

      // 永続化を自動で要求
      if (initResult.success && migrationManager.getConfig().autoPersist) {
        try {
          await migrationManager.requestPersistence();
        } catch (error) {
          logger.warn('永続化自動要求失敗:', error);
        }
      }

      return initResult;
    } catch (error) {
      return { success: false, error: `初期化失敗: ${String(error)}` };
    }
  }

  /**
   * 視聴履歴エントリを保存するのじゃ（upsert操作）
   */
  async saveEntry(entry: WatchHistoryEntry): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        
        transaction.onerror = () => {
          reject(new Error(`保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        
        transaction.onabort = () => {
          reject(new Error('保存処理が中断されたのじゃ'));
        };
        
        // 既存エントリの確認
        const getRequest = store.get(entry.videoId);
        
        getRequest.onsuccess = () => {
          const existingEntry = getRequest.result as WatchHistoryEntry | undefined;
          
          if (existingEntry) {
            // 既存エントリがある場合は更新
            const updated = {
              ...existingEntry,
              ...entry,
              // watchLogsはマージ
              watchLogs: this.mergeWatchLogs(existingEntry.watchLogs, entry.watchLogs),
              // 初回視聴日時は保持
              firstWatchedAt: existingEntry.firstWatchedAt || entry.firstWatchedAt
            };
            
            const putRequest = store.put(updated);
            putRequest.onerror = () => {
              reject(new Error(`更新失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          } else {
            // 新規エントリ
            const putRequest = store.put(entry);
            putRequest.onerror = () => {
              reject(new Error(`追加失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          }
        };
        
        getRequest.onerror = () => {
          reject(new Error(`既存エントリ確認失敗: ${WatchHistoryDatabase.toErrorMessage(getRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `保存失敗: ${String(error)}` };
    }
  }

  /**
   * 個別エントリを取得するのじゃ
   */
  async getEntry(videoId: string): Promise<DBResult<WatchHistoryEntry>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      
      const result = await new Promise<WatchHistoryEntry | undefined>((resolve, reject) => {
        const request = store.get(videoId);
        request.onsuccess = () => resolve(request.result as WatchHistoryEntry | undefined);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });

      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: '動画が見つからぬのじゃ' };
      }
    } catch (error) {
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }

  /**
   * 全エントリを取得するのじゃ（ソート・フィルタ付き）
   */
  async getAllEntries(
    sortBy: SortBy = 'watchedAt',
    sortOrder: SortOrder = 'desc',
    filter?: FilterCondition
  ): Promise<DBResult<WatchHistoryEntry[]>> {
    logger.debug('getAllEntries開始:', { sortBy, sortOrder, filter });
    
    if (!this.db) {
      logger.error('データベース未初期化');
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      
      // 全エントリを取得
      const entries = await new Promise<WatchHistoryEntry[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });

      logger.debug('データベースからエントリ取得完了:', { totalEntries: entries.length });
      
      if (entries.length > 0) {
        logger.debug('最初のエントリ:', entries[0]);
      }

      // フィルタを適用
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
        logger.debug('フィルタ適用後:', { filteredCount: filteredEntries.length });
      }

      // ソートを適用
      const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder);

      logger.debug('getAllEntries完了:', { resultCount: sortedEntries.length });

      return { success: true, data: sortedEntries };
    } catch (error) {
      logger.error('getAllEntriesエラー:', error);
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }

  /**
   * 統計データを計算するのじゃ
   */
  async calculateStats(): Promise<DBResult<OverallStats>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: '統計計算用データ取得失敗なのじゃ' };
    }

    const entries = entriesResult.data;
    
    try {
      // 基本統計
      const totalVideos = entries.length;
      const totalWatchTime = entries.reduce((sum, entry) => sum + entry.lastPosition, 0);
      const completedCount = entries.filter(entry => entry.completed).length;
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
        creatorStats
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `統計計算失敗: ${String(error)}` };
    }
  }

  /**
   * データをエクスポートするのじゃ
   */
  async exportData(): Promise<DBResult<WatchHistoryExportData>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: 'エクスポート用データ取得失敗なのじゃ' };
    }

    const seriesAlertsResult = await this.getAllSeriesAlerts();
    const seriesAlerts = seriesAlertsResult.success && seriesAlertsResult.data ? seriesAlertsResult.data : [];

    const exportData: WatchHistoryExportData = {
      exportedAt: Date.now(),
      version: '2.0.0',
      entries: entriesResult.data,
      seriesAlerts: seriesAlerts
    };

    return { success: true, data: exportData };
  }

  /**
   * データをインポートするのじゃ
   */
  async importData(exportData: WatchHistoryExportData, config: ImportConfig): Promise<DBResult<number>> {
    if (!exportData.entries || !Array.isArray(exportData.entries)) {
      return { success: false, error: '不正なデータ形式なのじゃ' };
    }

    let importedCount = 0;
    const maxEntries = config.maxEntries || exportData.entries.length;

    try {
      // 視聴履歴データをインポート
      for (const entry of exportData.entries.slice(0, maxEntries)) {
        const existingEntry = await this.getEntry(entry.videoId);
        
        if (existingEntry.success && existingEntry.data) {
          // 既存エントリがある場合
          if (config.duplicateHandling === 'skip') {
            continue;
          } else if (config.duplicateHandling === 'overwrite') {
            await this.saveEntry(entry);
            importedCount++;
          } else if (config.duplicateHandling === 'merge') {
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

      // シリーズアラートデータをインポート
      if (exportData.seriesAlerts && Array.isArray(exportData.seriesAlerts)) {
        for (const alert of exportData.seriesAlerts) {
          const existingAlert = await this.getSeriesAlert(alert.id);
          
          if (existingAlert.success && existingAlert.data) {
            // 既存アラートがある場合
            if (config.duplicateHandling === 'skip') {
              continue;
            } else if (config.duplicateHandling === 'overwrite') {
              await this.saveSeriesAlert(alert);
              importedCount++;
            } else if (config.duplicateHandling === 'merge') {
              // アラートの場合はより新しいデータを使用
              const merged = alert.updatedAt > existingAlert.data.updatedAt ? alert : existingAlert.data;
              await this.saveSeriesAlert(merged);
              importedCount++;
            }
          } else {
            // 新規アラート
            await this.saveSeriesAlert(alert);
            importedCount++;
          }
        }
      }

      return { success: true, data: importedCount };
    } catch (error) {
      return { success: false, error: `インポート失敗: ${String(error)}` };
    }
  }

  // ===== プライベートメソッド =====

  /**
   * 視聴ログをマージするのじゃ
   */
  private mergeWatchLogs(existing: WatchLogEntry[], newLogs: WatchLogEntry[]): WatchLogEntry[] {
    const merged = [...existing];
    
    for (const newLog of newLogs) {
      const existingIndex = merged.findIndex(log => 
        Math.abs(log.date - newLog.date) < 1000 // 1秒以内は同じ視聴とみなす
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
   * エントリをマージするのじゃ
   */
  private mergeEntries(existing: WatchHistoryEntry, newEntry: WatchHistoryEntry): WatchHistoryEntry {
    return {
      ...existing,
      ...newEntry,
      // 重要フィールドは最新の情報を優先
      watchedAt: Math.max(existing.watchedAt, newEntry.watchedAt),
      firstWatchedAt: Math.min(existing.firstWatchedAt, newEntry.firstWatchedAt),
      watchCount: existing.watchCount + newEntry.watchCount,
      watchLogs: this.mergeWatchLogs(existing.watchLogs, newEntry.watchLogs)
    };
  }

  /**
   * フィルタを適用するのじゃ
   */
  private applyFilter(entries: WatchHistoryEntry[], filter: FilterCondition): WatchHistoryEntry[] {
    return entries.filter(entry => {
      // ===== 検索テキストフィルタ =====
      // 空文字列や "null" / "undefined" といった無効値は無視するのじゃ
      const rawSearch = (filter.searchText ?? '').trim().toLowerCase();
      if (rawSearch && rawSearch !== 'null' && rawSearch !== 'undefined') {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(' '),
          entry.memo
        ].join(' ').toLowerCase();

        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
 
      // 投稿者フィルタ
      const ownerIdFilter = filter.ownerId && String(filter.ownerId).trim().toLowerCase();
      if (ownerIdFilter && ownerIdFilter !== 'null' && ownerIdFilter !== 'undefined') {
        if (String(entry.ownerId).toLowerCase() !== ownerIdFilter) {
          return false;
        }
      }

      // 完走フィルタ
      if (filter.completedOnly && !entry.completed) {
        return false;
      }

      // 日付範囲フィルタ
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (watchedAt < filter.dateRange.start || watchedAt > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * ソートを適用するのじゃ
   */
  private applySorting(entries: WatchHistoryEntry[], sortBy: SortBy, sortOrder: SortOrder): WatchHistoryEntry[] {
    return entries.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'watchedAt':
          aValue = a.watchedAt;
          bValue = b.watchedAt;
          break;
        case 'firstWatchedAt':
          aValue = a.firstWatchedAt;
          bValue = b.firstWatchedAt;
          break;
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'ownerName':
          aValue = a.ownerName;
          bValue = b.ownerName;
          break;
        case 'lengthSec':
          aValue = a.lengthSec;
          bValue = b.lengthSec;
          break;
        case 'watchCount':
          aValue = a.watchCount;
          bValue = b.watchCount;
          break;
        case 'viewCount':
          aValue = a.stats?.viewCount || 0;
          bValue = b.stats?.viewCount || 0;
          break;
        case 'commentCount':
          aValue = a.stats?.commentCount || 0;
          bValue = b.stats?.commentCount || 0;
          break;
        case 'mylistCount':
          aValue = a.stats?.mylistCount || 0;
          bValue = b.stats?.mylistCount || 0;
          break;
        case 'likeCount':
          aValue = a.stats?.likeCount || 0;
          bValue = b.stats?.likeCount || 0;
          break;
        case 'uploadedAt':
          aValue = a.stats?.uploadedAt || 0;
          bValue = b.stats?.uploadedAt || 0;
          break;
        default:
          aValue = a.watchedAt;
          bValue = b.watchedAt;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? result : -result;
      } else {
        const result = (aValue as number) - (bValue as number);
        return sortOrder === 'asc' ? result : -result;
      }
    });
  }

  /**
   * 日別統計を計算するのじゃ
   */
  private calculateDailyStats(entries: WatchHistoryEntry[]): DailyStats[] {
    const dailyMap = new Map<string, DailyStats>();

    for (const entry of entries) {
      const date = new Date(entry.watchedAt).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          watchCount: 0,
          totalWatchTime: 0,
          completedCount: 0
        });
      }

      const stats = dailyMap.get(date)!;
      stats.watchCount += entry.watchCount;
      stats.totalWatchTime += entry.lastPosition;
      if (entry.completed) {
        stats.completedCount++;
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 時間帯別統計を計算するのじゃ
   */
  private calculateHourlyStats(entries: WatchHistoryEntry[]): HourlyStats[] {
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
        watchCount: hourlyMap.get(hour) || 0
      });
    }

    return hourlyStats;
  }

  /**
   * 投稿者別統計を計算するのじゃ
   */
  private calculateCreatorStats(entries: WatchHistoryEntry[]): CreatorStats[] {
    const creatorMap = new Map<string, CreatorStats>();

    for (const entry of entries) {
      if (!creatorMap.has(entry.ownerId)) {
        creatorMap.set(entry.ownerId, {
          ownerId: entry.ownerId,
          ownerName: entry.ownerName,
          videoCount: 0,
          totalWatchTime: 0
        });
      }

      const stats = creatorMap.get(entry.ownerId)!;
      stats.videoCount++;
      stats.totalWatchTime += entry.lastPosition;
    }

    return Array.from(creatorMap.values()).sort((a, b) => b.videoCount - a.videoCount);
  }

  // ===== シリーズ関連メソッド =====

  /**
   * シリーズ統計を取得するのじゃ
   */
  async getSeriesStats(filter?: SeriesFilterCondition): Promise<DBResult<SeriesStats[]>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: 'シリーズ統計用データ取得失敗なのじゃ' };
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
          lastVideoId: '',
          lastVideoTitle: ''
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
   * シリーズの動画一覧を取得するのじゃ
   */
  async getSeriesVideos(seriesId: number): Promise<DBResult<WatchHistoryEntry[]>> {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: 'シリーズ動画取得失敗なのじゃ' };
    }

    const seriesVideos = entriesResult.data.filter(entry => 
      entry.series && entry.series.id === seriesId
    );

    return { success: true, data: seriesVideos };
  }

  /**
   * シリーズアラートを保存するのじゃ
   */
  async saveSeriesAlert(alert: SeriesAlert): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction(['seriesAlerts'], 'readwrite');
        const store = transaction.objectStore('seriesAlerts');
        
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        
        const putRequest = store.put(alert);
        putRequest.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート保存失敗: ${String(error)}` };
    }
  }

  /**
   * シリーズアラートを取得するのじゃ
   */
  async getSeriesAlert(alertId: string): Promise<DBResult<SeriesAlert>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      const transaction = this.db.transaction(['seriesAlerts'], 'readonly');
      const store = transaction.objectStore('seriesAlerts');
      
      const result = await new Promise<SeriesAlert | undefined>((resolve, reject) => {
        const request = store.get(alertId);
        request.onsuccess = () => resolve(request.result as SeriesAlert | undefined);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });

      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: 'シリーズアラートが見つからぬのじゃ' };
      }
    } catch (error) {
      return { success: false, error: `シリーズアラート取得失敗: ${String(error)}` };
    }
  }

  /**
   * 全シリーズアラートを取得するのじゃ
   */
  async getAllSeriesAlerts(): Promise<DBResult<SeriesAlert[]>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      const transaction = this.db.transaction(['seriesAlerts'], 'readonly');
      const store = transaction.objectStore('seriesAlerts');
      
      const alerts = await new Promise<SeriesAlert[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });

      return { success: true, data: alerts };
    } catch (error) {
      return { success: false, error: `シリーズアラート一覧取得失敗: ${String(error)}` };
    }
  }

  /**
   * シリーズアラートを削除するのじゃ
   */
  async deleteSeriesAlert(alertId: string): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction(['seriesAlerts'], 'readwrite');
        const store = transaction.objectStore('seriesAlerts');
        
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        
        const deleteRequest = store.delete(alertId);
        deleteRequest.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート削除失敗: ${String(error)}` };
    }
  }

  // ===== 視聴履歴削除機能 =====

  /**
   * 指定した動画IDの視聴履歴を削除するのじゃ（個別削除）
   */
  async deleteEntry(videoId: string): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      return new Promise<DBResult<void>>((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        
        transaction.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        
        const deleteRequest = store.delete(videoId);
        deleteRequest.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `視聴履歴削除失敗: ${String(error)}` };
    }
  }

  /**
   * 全ての視聴履歴を削除するのじゃ（一括削除）
   */
  async deleteAllEntries(): Promise<DBResult<number>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      return new Promise<DBResult<number>>((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
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
            reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(clearRequest.error)}`));
          };
        };
        
        countRequest.onerror = () => {
          reject(new Error(`件数取得失敗: ${WatchHistoryDatabase.toErrorMessage(countRequest.error)}`));
        };
        
        transaction.onerror = () => {
          reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `一括削除失敗: ${String(error)}` };
    }
  }

  /**
   * 条件に一致する視聴履歴を削除するのじゃ（条件付き削除）
   * @param maxWatchCount 最大視聴回数（この回数以下を削除）
   * @param maxProgressRate 最大進捗率（この進捗率以下を削除、0-100の範囲）
   */
  async deleteEntriesByCondition(maxWatchCount: number, maxProgressRate: number): Promise<DBResult<number>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      return { success: false, error: '無効な条件値なのじゃ（視聴回数は0以上、進捗率は0-100の範囲）' };
    }

    try {
      return new Promise<DBResult<number>>((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const deletedVideoIds: string[] = [];
        
        transaction.oncomplete = () => {
          resolve({ success: true, data: deletedVideoIds.length });
        };
        
        transaction.onerror = () => {
          reject(new Error(`条件付き削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        
        // 全エントリをカーソルで走査
        const cursorRequest = store.openCursor();
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            const entry = cursor.value as WatchHistoryEntry;
            
            // 進捗率を計算（UI上の計算式に合わせる）
            const progressRate = entry.lengthSec > 0 
              ? Math.round((entry.lastPosition / entry.lengthSec) * 100)
              : 0;
            
            // 条件をチェック：視聴回数がmaxWatchCount以下 AND 進捗率がmaxProgressRate以下
            if (entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate) {
              // 削除対象として記録
              deletedVideoIds.push(entry.videoId);
              
              // エントリを削除
            const deleteRequest = cursor.delete();
            deleteRequest.onerror = () => {
              reject(new Error(`エントリ削除失敗 (${entry.videoId}): ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
              return;
            };
            }
            
            // 次のエントリへ
            cursor.continue();
          }
          // カーソルがnullになったら完了（transactionのoncompleteが呼ばれる）
        };
        
        cursorRequest.onerror = () => {
          reject(new Error(`カーソル取得失敗: ${WatchHistoryDatabase.toErrorMessage(cursorRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `条件付き削除失敗: ${String(error)}` };
    }
  }

  /**
   * チェックが必要なシリーズアラートを取得するのじゃ
   */
  async getAlertsToCheck(): Promise<DBResult<SeriesAlert[]>> {
    const alertsResult = await this.getAllSeriesAlerts();
    if (!alertsResult.success || !alertsResult.data) {
      return { success: false, error: 'アラート取得失敗なのじゃ' };
    }

    const now = Date.now();
    const alertsToCheck = alertsResult.data.filter(alert => 
      alert.enabled && alert.nextCheckAt <= now
    );

    return { success: true, data: alertsToCheck };
  }

  /**
   * シリーズフィルタを適用するのじゃ
   */
  private applySeriesFilter(seriesStats: SeriesStats[], filter: SeriesFilterCondition): SeriesStats[] {
    return seriesStats.filter(stats => {
      // テキスト検索
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      // 進捗状況フィルタ
      if (filter.progressFilter && filter.progressFilter !== 'all') {
        switch (filter.progressFilter) {
          case 'watching':
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case 'completed':
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case 'not_started':
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }

      // 日付範囲フィルタ
      if (filter.dateRange) {
        const lastWatchedAt = stats.lastWatchedAt;
        if (lastWatchedAt < filter.dateRange.start || lastWatchedAt > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  // ===== 永続化・マイグレーション管理メソッド =====

  /**
   * データベースの永続化状態を取得するのじゃ
   */
  async getPersistenceStatus(): Promise<DBResult<PersistenceStatus>> {
    return await migrationManager.getPersistenceStatus();
  }

  /**
   * データベースの永続化を要求するのじゃ
   */
  async requestPersistence(): Promise<DBResult<boolean>> {
    return await migrationManager.requestPersistence();
  }

  /**
   * マイグレーション進捗を取得するのじゃ
   */
  getMigrationProgress(): MigrationProgress {
    return migrationManager.getMigrationProgress();
  }

  /**
   * マイグレーション設定を取得するのじゃ
   */
  getMigrationConfig(): DatabaseManagementConfig {
    return migrationManager.getConfig();
  }

  /**
   * マイグレーション設定を更新するのじゃ
   */
  updateMigrationConfig(config: Partial<DatabaseManagementConfig>): void {
    migrationManager.updateConfig(config);
  }

  /**
   * 利用可能なバックアップ一覧を取得するのじゃ
   */
  getAvailableBackups(): Array<{ key: string; timestamp: number; version: number }> {
    return migrationManager.getAvailableBackups();
  }

  /**
   * バックアップからリストアするのじゃ
   */
  async restoreFromBackup(backupKey: string): Promise<DBResult<void>> {
    return await migrationManager.restoreFromBackup(backupKey);
  }

  /**
   * 手動でマイグレーションを実行するのじゃ
   */
  async runMigration(): Promise<DBResult<void>> {
    if (!this.db) {
      return { success: false, error: 'データベース未初期化なのじゃ' };
    }

    try {
      await migrationManager.executeMigrations(this.db, 1, this.config.version);
      return { success: true };
    } catch (error) {
      return { success: false, error: `マイグレーション実行失敗: ${WatchHistoryDatabase.toErrorMessage(error)}` };
    }
  }
}

// デフォルトインスタンスをエクスポート
export const watchHistoryDB = new WatchHistoryDatabase(); 