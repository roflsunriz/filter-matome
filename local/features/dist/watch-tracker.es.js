var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["NONE"] = 0] = "NONE";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["LOG"] = 2] = "LOG";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["DEBUG"] = 5] = "DEBUG";
  return LogLevel2;
})(LogLevel || {});

class Logger {
  constructor() {
    this.currentLevel = LogLevel.ERROR;
    this.enabledFiles = /* @__PURE__ */ new Set();
    this.disabledFiles = /* @__PURE__ */ new Set();
    this.initializeLoggerConfig();
  }
  initializeLoggerConfig() {
    this.setLevel(LogLevel.ERROR);
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  setLevel(level) {
    this.currentLevel = level;
  }
  getCallerInfo() {
    const error = new Error();
    const stack = error.stack?.split("\n")[3] || "";
    const urlMatch = stack.match(/(?:@|at\s+)https:\/\/www\.nicovideo\.jp\/local\/(.*?\.js:\d+:\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const localMatch = stack.match(/\((.+?)\)/);
    if (localMatch) {
      const fullPath = localMatch[1].split("/");
      return fullPath[fullPath.length - 1].replace(/:\d+:\d+$/, "");
    }
    return "unknown";
  }
  enableLogging(filePattern) {
    this.enabledFiles.add(filePattern);
  }
  disableLogging(filePattern) {
    this.disabledFiles.add(filePattern);
  }
  shouldLog(filename) {
    const isDisabled = [...this.disabledFiles].some((pattern) => {
      if (pattern === "All") return true;
      return filename.includes(pattern);
    });
    if (isDisabled) {
      return [...this.enabledFiles].some((pattern) => filename.includes(pattern));
    }
    return true;
  }
  _log(level, args) {
    if (this.currentLevel < level) return;
    const filename = this.getCallerInfo();
    if (!this.shouldLog(filename)) return;
    const prefix = `[${filename}]`;
    switch (level) {
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.LOG:
        console.log(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
    }
  }
  info(...args) {
    this._log(LogLevel.INFO, args);
  }
  log(...args) {
    this._log(LogLevel.LOG, args);
  }
  warn(...args) {
    this._log(LogLevel.WARN, args);
  }
  error(...args) {
    this._log(LogLevel.ERROR, args);
  }
  debug(...args) {
    this._log(LogLevel.DEBUG, args);
  }
  handleError(component, method, error) {
    this.error(`[${component}::${method}] エラーが発生しました:`, error);
    this.debug(component, method, "エラー発生", error);
  }
  measurePerformance(component, method, callback) {
    const start = performance.now();
    try {
      callback();
    } catch (error) {
      this.handleError(component, method, error);
    } finally {
      const end = performance.now();
      this.debug(component, method, `実行時間: ${end - start}ms`);
    }
  }
}
const logger = Logger.getInstance();
window.logger = logger;

class MigrationManager {
  constructor(config) {
    this.migrations = [];
    this.currentProgress = {
      isRunning: false,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      error: null
    };
    this.config = {
      autoMigration: true,
      autoPersist: true,
      autoBackup: true,
      backupBeforeMigration: true,
      ...config
    };
    this.initializeMigrations();
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  /**
   * マイグレーション定義を初期化する
   */
  initializeMigrations() {
    this.migrations.push({
      id: "add-series-info",
      fromVersion: 1,
      toVersion: 2,
      description: "視聴履歴にシリーズ情報を追加",
      migrate: this.migrateV1ToV2.bind(this)
    });
    logger.debug(`[MigrationManager] ${this.migrations.length}個のマイグレーションを定義しました`);
  }
  /**
   * v1からv2へのマイグレーション（シリーズ情報追加）
   */
  async migrateV1ToV2(db, transaction) {
    logger.info("[MigrationManager] v1→v2マイグレーション開始: シリーズ情報を追加");
    const store = transaction.objectStore("watchHistory");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result;
        let processedCount = 0;
        if (entries.length === 0) {
          logger.info("[MigrationManager] マイグレーション対象のデータがありません");
          resolve();
          return;
        }
        entries.forEach((entry) => {
          if (!("series" in entry)) {
            const updatedEntry = {
              ...entry,
              series: null
              // デフォルト値を設定
            };
            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => {
              processedCount++;
              if (processedCount === entries.length) {
                logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを更新`);
                resolve();
              }
            };
            updateRequest.onerror = () => {
              logger.error("[MigrationManager] データ更新エラー:", updateRequest.error);
              reject(new Error(MigrationManager.toErrorMessage(updateRequest.error)));
            };
          } else {
            processedCount++;
            if (processedCount === entries.length) {
              logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを確認`);
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
  async executeMigrations(db, oldVersion, newVersion) {
    const requiredMigrations = this.migrations.filter(
      (migration) => migration.fromVersion >= oldVersion && migration.toVersion <= newVersion
    );
    if (requiredMigrations.length === 0) {
      logger.info("[MigrationManager] 実行するマイグレーションがありません");
      return;
    }
    logger.info(`[MigrationManager] ${requiredMigrations.length}個のマイグレーションを実行します`);
    this.currentProgress = {
      isRunning: true,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: requiredMigrations.length,
      error: null
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
        logger.info(`[MigrationManager] マイグレーション実行中: ${migration.description}`);
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
      this.currentProgress.error = error instanceof Error ? error.message : String(error);
      this.currentProgress.isRunning = false;
      this.dispatchProgressEvent();
      logger.error("[MigrationManager] マイグレーション実行エラー:", error);
      throw new Error(String(error));
    }
  }
  /**
   * データベースの永続化を要求する
   */
  async requestPersistence() {
    try {
      if (!("storage" in navigator) || !("persist" in navigator.storage)) {
        return {
          success: false,
          error: "このブラウザはデータベース永続化をサポートしていません"
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
        error: `永続化要求失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * 永続化状態を取得する
   */
  async getPersistenceStatus() {
    try {
      if (!("storage" in navigator)) {
        return {
          success: false,
          error: "このブラウザはStorage APIをサポートしていません"
        };
      }
      const [isPersistent, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate()
      ]);
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usageRate = quota > 0 ? usage / quota : 0;
      const canPersist = "persist" in navigator.storage;
      const status = {
        isPersistent,
        quota,
        usage,
        usageRate,
        canPersist
      };
      return { success: true, data: status };
    } catch (error) {
      logger.error("[MigrationManager] 永続化状態取得エラー:", error);
      return {
        success: false,
        error: `永続化状態取得失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * バックアップを作成する
   */
  async createBackup(db) {
    if (!this.config.autoBackup) return;
    try {
      logger.info("[MigrationManager] バックアップを作成中...");
      const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readonly");
      const watchHistoryStore = transaction.objectStore("watchHistory");
      const seriesAlertsStore = transaction.objectStore("seriesAlerts");
      const [watchHistory, seriesAlerts] = await Promise.all([
        new Promise((resolve, reject) => {
          const request = watchHistoryStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        }),
        new Promise((resolve, reject) => {
          const request = seriesAlertsStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        })
      ]);
      const backup = {
        version: db.version,
        timestamp: Date.now(),
        entries: watchHistory,
        seriesAlerts
      };
      const backupKey = `watch-history-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      this.cleanupOldBackups();
      logger.info("[MigrationManager] バックアップを作成しました:", backupKey);
    } catch (error) {
      logger.error("[MigrationManager] バックアップ作成エラー:", error);
    }
  }
  /**
   * 古いバックアップを削除する
   */
  cleanupOldBackups() {
    try {
      const backupKeys = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).sort((a, b) => {
        const timestampA = parseInt(a.split("-").pop() || "0");
        const timestampB = parseInt(b.split("-").pop() || "0");
        return timestampB - timestampA;
      });
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
  dispatchProgressEvent() {
    const event = new CustomEvent("migrationProgress", {
      detail: { ...this.currentProgress }
    });
    document.dispatchEvent(event);
  }
  /**
   * 現在のマイグレーション進捗を取得する
   */
  getMigrationProgress() {
    return { ...this.currentProgress };
  }
  /**
   * マイグレーション設定を取得する
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * マイグレーション設定を更新する
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info("[MigrationManager] 設定を更新しました:", this.config);
  }
  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups() {
    try {
      const backups = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).map((key) => {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            key,
            timestamp: typeof backup.timestamp === "number" ? backup.timestamp : 0,
            version: typeof backup.version === "number" ? backup.version : 0
          };
        } catch {
          return null;
        }
      }).filter((backup) => backup !== null).sort((a, b) => b.timestamp - a.timestamp);
      return backups;
    } catch (error) {
      logger.error("[MigrationManager] バックアップ一覧取得エラー:", error);
      return [];
    }
  }
  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: "バックアップデータが見つかりません" };
      }
      const backup = JSON.parse(backupData);
      logger.info("[MigrationManager] バックアップからリストア中...", backupKey);
      const request = indexedDB.open("NicoWatchHistory", backup.version);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readwrite");
          const watchHistoryStore = transaction.objectStore("watchHistory");
          const seriesAlertsStore = transaction.objectStore("seriesAlerts");
          Promise.all([
            new Promise((resolve2, reject2) => {
              const clearRequest = watchHistoryStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            }),
            new Promise((resolve2, reject2) => {
              const clearRequest = seriesAlertsStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            })
          ]).then(() => {
            const promises = [];
            const entries = backup.entries || backup.watchHistory || [];
            entries.forEach((entry) => {
              promises.push(new Promise((resolve2, reject2) => {
                const addRequest = watchHistoryStore.add(entry);
                addRequest.onsuccess = () => resolve2();
                addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
              }));
            });
            if (backup.seriesAlerts && Array.isArray(backup.seriesAlerts)) {
              backup.seriesAlerts.forEach((alert) => {
                promises.push(new Promise((resolve2, reject2) => {
                  const addRequest = seriesAlertsStore.add(alert);
                  addRequest.onsuccess = () => resolve2();
                  addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
                }));
              });
            }
            Promise.all(promises).then(() => {
              logger.info("[MigrationManager] バックアップからのリストアが完了しました");
              resolve({ success: true });
            }).catch((error) => {
              logger.error("[MigrationManager] リストア中にエラーが発生:", error);
              reject(new Error(`リストア失敗: ${MigrationManager.toErrorMessage(error)}`));
            });
          }).catch((error) => {
            logger.error("[MigrationManager] データクリア中にエラーが発生:", error);
            reject(new Error(`データクリア失敗: ${MigrationManager.toErrorMessage(error)}`));
          });
        };
        request.onerror = () => {
          logger.error("[MigrationManager] データベース開放エラー:", request.error);
          reject(new Error(`データベース開放失敗: ${MigrationManager.toErrorMessage(request.error)}`));
        };
      });
    } catch (error) {
      logger.error("[MigrationManager] リストアエラー:", error);
      return { success: false, error: `リストア失敗: ${MigrationManager.toErrorMessage(error)}` };
    }
  }
}
const migrationManager = new MigrationManager();

class WatchHistoryDatabase {
  constructor(config) {
    this.db = null;
    this.config = {
      dbName: config?.dbName || "NicoWatchHistory",
      version: config?.version || 2,
      storeName: config?.storeName || "watchHistory"
    };
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  /**
   * データベースを初期化する
   */
  async initialize() {
    try {
      logger.debug("データベース初期化開始:", { dbName: this.config.dbName, version: this.config.version });
      const request = indexedDB.open(this.config.dbName, this.config.version);
      const initResult = await new Promise((resolve, reject) => {
        request.onerror = () => {
          logger.error("データベース接続失敗");
          reject(new Error("データベース接続失敗"));
        };
        request.onsuccess = () => {
          this.db = request.result;
          logger.debug("データベース初期化成功:", { dbName: this.config.dbName });
          resolve({ success: true });
        };
        request.onupgradeneeded = async (event) => {
          const db = event.target.result;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion || this.config.version;
          logger.debug("データベーススキーマ更新:", {
            oldVersion,
            newVersion,
            version: this.config.version
          });
          if (oldVersion === 0) {
            const store = db.createObjectStore(this.config.storeName, {
              keyPath: "videoId"
            });
            logger.debug("新しいストアを作成:", { storeName: this.config.storeName });
            store.createIndex("watchedAt", "watchedAt", { unique: false });
            store.createIndex("ownerId", "ownerId", { unique: false });
            store.createIndex("completed", "completed", { unique: false });
            store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
            store.createIndex("title", "title", { unique: false });
            store.createIndex("seriesId", "series.id", { unique: false });
            const alertStore = db.createObjectStore("seriesAlerts", {
              keyPath: "id"
            });
            logger.debug("シリーズアラートストアを作成");
            alertStore.createIndex("seriesId", "seriesId", { unique: false });
            alertStore.createIndex("enabled", "enabled", { unique: false });
            alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
            logger.debug("インデックス作成完了");
          } else {
            try {
              if (!db.objectStoreNames.contains(this.config.storeName)) {
                const store = db.createObjectStore(this.config.storeName, {
                  keyPath: "videoId"
                });
                store.createIndex("watchedAt", "watchedAt", { unique: false });
                store.createIndex("ownerId", "ownerId", { unique: false });
                store.createIndex("completed", "completed", { unique: false });
                store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
                store.createIndex("title", "title", { unique: false });
                store.createIndex("seriesId", "series.id", { unique: false });
              }
              if (!db.objectStoreNames.contains("seriesAlerts")) {
                const alertStore = db.createObjectStore("seriesAlerts", {
                  keyPath: "id"
                });
                alertStore.createIndex("seriesId", "seriesId", { unique: false });
                alertStore.createIndex("enabled", "enabled", { unique: false });
                alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
              }
              await migrationManager.executeMigrations(db, oldVersion, newVersion);
            } catch (error) {
              logger.error("マイグレーション実行エラー:", error);
            }
          }
        };
      });
      if (initResult.success && migrationManager.getConfig().autoPersist) {
        try {
          await migrationManager.requestPersistence();
        } catch (error) {
          logger.warn("永続化自動要求失敗:", error);
        }
      }
      return initResult;
    } catch (error) {
      return { success: false, error: `初期化失敗: ${String(error)}` };
    }
  }
  /**
   * 視聴履歴エントリを保存する（upsert操作）
   */
  async saveEntry(entry) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        transaction.onabort = () => {
          reject(new Error("保存処理が中断されました"));
        };
        const getRequest = store.get(entry.videoId);
        getRequest.onsuccess = () => {
          const existingEntry = getRequest.result;
          if (existingEntry) {
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
   * 個別エントリを取得する
   */
  async getEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベースが未初期化です" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const result = await new Promise((resolve, reject) => {
        const request = store.get(videoId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
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
  async getAllEntries(sortBy = "watchedAt", sortOrder = "desc", filter) {
    logger.debug("getAllEntries開始:", { sortBy, sortOrder, filter });
    if (!this.db) {
      logger.error("データベース未初期化");
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const entries = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      logger.debug("データベースからエントリ取得完了:", { totalEntries: entries.length });
      if (entries.length > 0) {
        logger.debug("最初のエントリ:", entries[0]);
      }
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
        logger.debug("フィルタ適用後:", { filteredCount: filteredEntries.length });
      }
      const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder);
      logger.debug("getAllEntries完了:", { resultCount: sortedEntries.length });
      return { success: true, data: sortedEntries };
    } catch (error) {
      logger.error("getAllEntriesエラー:", error);
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
  /**
   * 統計データを計算する
   */
  async calculateStats() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "統計計算用データ取得失敗" };
    }
    const entries = entriesResult.data;
    try {
      const totalVideos = entries.length;
      const totalWatchTime = entries.reduce((sum, entry) => sum + entry.lastPosition, 0);
      const completedCount = entries.filter((entry) => entry.completed).length;
      const completionRate = totalVideos > 0 ? completedCount / totalVideos : 0;
      const dailyStats = this.calculateDailyStats(entries);
      const hourlyStats = this.calculateHourlyStats(entries);
      const creatorStats = this.calculateCreatorStats(entries);
      const stats = {
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
   * データをエクスポートする
   */
  async exportData() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "エクスポート用データ取得失敗" };
    }
    const seriesAlertsResult = await this.getAllSeriesAlerts();
    const seriesAlerts = seriesAlertsResult.success && seriesAlertsResult.data ? seriesAlertsResult.data : [];
    const exportData = {
      exportedAt: Date.now(),
      version: "2.0.0",
      entries: entriesResult.data,
      seriesAlerts
    };
    return { success: true, data: exportData };
  }
  /**
   * データをインポートする
   */
  async importData(exportData, config) {
    if (!exportData.entries || !Array.isArray(exportData.entries)) {
      return { success: false, error: "不正なデータ形式" };
    }
    let importedCount = 0;
    const maxEntries = config.maxEntries || exportData.entries.length;
    try {
      for (const entry of exportData.entries.slice(0, maxEntries)) {
        const existingEntry = await this.getEntry(entry.videoId);
        if (existingEntry.success && existingEntry.data) {
          if (config.duplicateHandling === "skip") {
            continue;
          } else if (config.duplicateHandling === "overwrite") {
            await this.saveEntry(entry);
            importedCount++;
          } else if (config.duplicateHandling === "merge") {
            const merged = this.mergeEntries(existingEntry.data, entry);
            await this.saveEntry(merged);
            importedCount++;
          }
        } else {
          await this.saveEntry(entry);
          importedCount++;
        }
      }
      if (exportData.seriesAlerts && Array.isArray(exportData.seriesAlerts)) {
        for (const alert of exportData.seriesAlerts) {
          const existingAlert = await this.getSeriesAlert(alert.id);
          if (existingAlert.success && existingAlert.data) {
            if (config.duplicateHandling === "skip") {
              continue;
            } else if (config.duplicateHandling === "overwrite") {
              await this.saveSeriesAlert(alert);
              importedCount++;
            } else if (config.duplicateHandling === "merge") {
              const merged = alert.updatedAt > existingAlert.data.updatedAt ? alert : existingAlert.data;
              await this.saveSeriesAlert(merged);
              importedCount++;
            }
          } else {
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
   * 視聴ログをマージする
   */
  mergeWatchLogs(existing, newLogs) {
    const merged = [...existing];
    for (const newLog of newLogs) {
      const existingIndex = merged.findIndex(
        (log) => Math.abs(log.date - newLog.date) < 1e3
        // 1秒以内は同じ視聴とみなす
      );
      if (existingIndex >= 0) {
        merged[existingIndex] = newLog;
      } else {
        merged.push(newLog);
      }
    }
    return merged.sort((a, b) => a.date - b.date);
  }
  /**
   * エントリをマージする
   */
  mergeEntries(existing, newEntry) {
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
   * フィルタを適用する
   */
  applyFilter(entries, filter) {
    return entries.filter((entry) => {
      const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
      if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(" "),
          entry.memo
        ].join(" ").toLowerCase();
        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
      const ownerIdFilter = filter.ownerId && String(filter.ownerId).trim().toLowerCase();
      if (ownerIdFilter && ownerIdFilter !== "null" && ownerIdFilter !== "undefined") {
        if (String(entry.ownerId).toLowerCase() !== ownerIdFilter) {
          return false;
        }
      }
      if (filter.completedOnly && !entry.completed) {
        return false;
      }
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
   * ソートを適用する
   */
  applySorting(entries, sortBy, sortOrder) {
    return entries.sort((a, b) => {
      let aValue;
      let bValue;
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
        const result = aValue - bValue;
        return sortOrder === "asc" ? result : -result;
      }
    });
  }
  /**
   * 日別統計を計算する
   */
  calculateDailyStats(entries) {
    const dailyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const date = new Date(entry.watchedAt).toISOString().split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          watchCount: 0,
          totalWatchTime: 0,
          completedCount: 0
        });
      }
      const stats = dailyMap.get(date);
      stats.watchCount += entry.watchCount;
      stats.totalWatchTime += entry.lastPosition;
      if (entry.completed) {
        stats.completedCount++;
      }
    }
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  /**
   * 時間帯別統計を計算する
   */
  calculateHourlyStats(entries) {
    const hourlyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      for (const log of entry.watchLogs) {
        const hour = new Date(log.date).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    }
    const hourlyStats = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.push({
        hour,
        watchCount: hourlyMap.get(hour) || 0
      });
    }
    return hourlyStats;
  }
  /**
   * 投稿者別統計を計算する
   */
  calculateCreatorStats(entries) {
    const creatorMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!creatorMap.has(entry.ownerId)) {
        creatorMap.set(entry.ownerId, {
          ownerId: entry.ownerId,
          ownerName: entry.ownerName,
          videoCount: 0,
          totalWatchTime: 0
        });
      }
      const stats = creatorMap.get(entry.ownerId);
      stats.videoCount++;
      stats.totalWatchTime += entry.lastPosition;
    }
    return Array.from(creatorMap.values()).sort((a, b) => b.videoCount - a.videoCount);
  }
  // ===== シリーズ関連メソッド =====
  /**
   * シリーズ統計を取得する
   */
  async getSeriesStats(filter) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ統計用データ取得失敗" };
    }
    const entries = entriesResult.data;
    const seriesMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!entry.series) continue;
      const seriesId = entry.series.id;
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          seriesId,
          seriesTitle: entry.series.title,
          watchedCount: 0,
          totalCount: 0,
          // 実際の総数は不明なので0に設定
          progressRate: 0,
          lastWatchedAt: 0,
          lastVideoId: "",
          lastVideoTitle: ""
        });
      }
      const stats = seriesMap.get(seriesId);
      stats.watchedCount++;
      if (entry.watchedAt > stats.lastWatchedAt) {
        stats.lastWatchedAt = entry.watchedAt;
        stats.lastVideoId = entry.videoId;
        stats.lastVideoTitle = entry.title;
      }
    }
    let seriesStats = Array.from(seriesMap.values());
    if (filter) {
      seriesStats = this.applySeriesFilter(seriesStats, filter);
    }
    return { success: true, data: seriesStats };
  }
  /**
   * シリーズの動画一覧を取得する
   */
  async getSeriesVideos(seriesId) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ動画取得失敗" };
    }
    const seriesVideos = entriesResult.data.filter(
      (entry) => entry.series && entry.series.id === seriesId
    );
    return { success: true, data: seriesVideos };
  }
  /**
   * シリーズアラートを保存する
   */
  async saveSeriesAlert(alert) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
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
   * シリーズアラートを取得する
   */
  async getSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const result = await new Promise((resolve, reject) => {
        const request = store.get(alertId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "シリーズアラートが見つからぬ" };
      }
    } catch (error) {
      return { success: false, error: `シリーズアラート取得失敗: ${String(error)}` };
    }
  }
  /**
   * 全シリーズアラートを取得する
   */
  async getAllSeriesAlerts() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const alerts = await new Promise((resolve, reject) => {
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
   * シリーズアラートを削除する
   */
  async deleteSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
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
   * 指定した動画IDの視聴履歴を削除する（個別削除）
   */
  async deleteEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
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
   * 全ての視聴履歴を削除する（一括削除）
   */
  async deleteAllEntries() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const deletedCount = countRequest.result;
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
   * 条件に一致する視聴履歴を削除する（条件付き削除）
   * @param maxWatchCount 最大視聴回数（この回数以下を削除）
   * @param maxProgressRate 最大進捗率（この進捗率以下を削除、0-100の範囲）
   */
  async deleteEntriesByCondition(maxWatchCount, maxProgressRate) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      return { success: false, error: "無効な条件値（視聴回数は0以上、進捗率は0-100の範囲）" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const deletedVideoIds = [];
        transaction.oncomplete = () => {
          resolve({ success: true, data: deletedVideoIds.length });
        };
        transaction.onerror = () => {
          reject(new Error(`条件付き削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            const progressRate = entry.lengthSec > 0 ? Math.round(entry.lastPosition / entry.lengthSec * 100) : 0;
            if (entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate) {
              deletedVideoIds.push(entry.videoId);
              const deleteRequest = cursor.delete();
              deleteRequest.onerror = () => {
                reject(new Error(`エントリ削除失敗 (${entry.videoId}): ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
                return;
              };
            }
            cursor.continue();
          }
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
   * チェックが必要なシリーズアラートを取得する
   */
  async getAlertsToCheck() {
    const alertsResult = await this.getAllSeriesAlerts();
    if (!alertsResult.success || !alertsResult.data) {
      return { success: false, error: "アラート取得失敗" };
    }
    const now = Date.now();
    const alertsToCheck = alertsResult.data.filter(
      (alert) => alert.enabled && alert.nextCheckAt <= now
    );
    return { success: true, data: alertsToCheck };
  }
  /**
   * シリーズフィルタを適用する
   */
  applySeriesFilter(seriesStats, filter) {
    return seriesStats.filter((stats) => {
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }
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
   * データベースの永続化状態を取得する
   */
  async getPersistenceStatus() {
    return await migrationManager.getPersistenceStatus();
  }
  /**
   * データベースの永続化を要求する
   */
  async requestPersistence() {
    return await migrationManager.requestPersistence();
  }
  /**
   * マイグレーション進捗を取得する
   */
  getMigrationProgress() {
    return migrationManager.getMigrationProgress();
  }
  /**
   * マイグレーション設定を取得する
   */
  getMigrationConfig() {
    return migrationManager.getConfig();
  }
  /**
   * マイグレーション設定を更新する
   */
  updateMigrationConfig(config) {
    migrationManager.updateConfig(config);
  }
  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups() {
    return migrationManager.getAvailableBackups();
  }
  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey) {
    return await migrationManager.restoreFromBackup(backupKey);
  }
  /**
   * 手動でマイグレーションを実行する
   */
  async runMigration() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      await migrationManager.executeMigrations(this.db, 1, this.config.version);
      return { success: true };
    } catch (error) {
      return { success: false, error: `マイグレーション実行失敗: ${WatchHistoryDatabase.toErrorMessage(error)}` };
    }
  }
}
const watchHistoryDB = new WatchHistoryDatabase();

const WATCH_PAGE_PATH_REGEX = /^\/watch\/[a-z]{2}\d+$/;
const VIDEO_ID_IN_PATH_REGEX = /[a-z]{2}\d+/;
const VIDEO_ID_PARAM_REGEX = /^[a-z]{2}\d+$/;
const STANDALONE_PLAYER_PATH = "/local/features/dist/src/video-player/standalone/index.html";
const extractVideoIdFromQuery = (search) => {
  if (typeof search !== "string" || search.length === 0) {
    return null;
  }
  try {
    const params = new URLSearchParams(search);
    const videoId = params.get("videoId");
    if (videoId && VIDEO_ID_PARAM_REGEX.test(videoId)) {
      return videoId;
    }
  } catch (error) {
    logger.warn("[WatchTracker] URLSearchParamsの解析に失敗しました", error);
  }
  return null;
};
const isStandalonePlayerLocation = (loc = location) => {
  if (loc.pathname !== STANDALONE_PLAYER_PATH) {
    return false;
  }
  return extractVideoIdFromQuery(loc.search) !== null;
};
const isWatchPageLocation = (loc = location) => {
  return WATCH_PAGE_PATH_REGEX.test(loc.pathname);
};
class WatchTracker {
  // 10秒以内の重複記録を防ぐ
  constructor() {
    this.currentVideoId = null;
    this.currentEntry = null;
    this.videoElement = null;
    this.progressTimer = null;
    this.startTime = 0;
    this.isWatching = false;
    this.previousTime = 0;
    // 前回の再生位置
    this.lastSessionRecordTime = 0;
    // 最後にセッションを記録した時刻
    this.PROGRESS_INTERVAL = 15e3;
    // 15秒間隔
    this.COMPLETION_THRESHOLD = 0.95;
    // 95%完走とみなす
    this.REPEAT_DETECTION_THRESHOLD = 5;
    // 5秒以上の後戻りで繰り返し再生と判定
    this.SESSION_RECORD_INTERVAL = 1e4;
    void this.initialize();
  }
  /**
   * 初期化処理
   */
  async initialize() {
    try {
      await watchHistoryDB.initialize();
      this.currentVideoId = this.extractVideoId();
      if (!this.currentVideoId) {
        logger.warn("[WatchTracker] 動画IDが取得できませんでした");
        return;
      }
      if (!window.commonHelper || !window.commonHelper.fetchWatchPage) {
        logger.error("[WatchTracker] commonHelper.fetchWatchPageが利用できません");
        return;
      }
      await this.fetchVideoMetadata();
      await this.startWatching();
    } catch (error) {
      logger.error("[WatchTracker] 初期化エラー:", error);
    }
  }
  /**
   * 動画IDを抽出する
   */
  extractVideoId() {
    const pathMatch = VIDEO_ID_IN_PATH_REGEX.exec(location.pathname);
    if (pathMatch) {
      return pathMatch[0];
    }
    return extractVideoIdFromQuery(location.search);
  }
  /**
   * 動画メタデータを取得する
   */
  async fetchVideoMetadata() {
    if (!this.currentVideoId) {
      throw new Error("動画IDが設定されていません");
    }
    try {
      const watchPageResult = await window.commonHelper.fetchWatchPage(this.currentVideoId);
      if (!watchPageResult) {
        throw new Error("動画データが取得できませんでした");
      }
      const apiData = watchPageResult.apiData;
      const existingResult = await watchHistoryDB.getEntry(this.currentVideoId);
      const now = Date.now();
      if (existingResult.success && existingResult.data) {
        this.currentEntry = {
          ...existingResult.data,
          // メタデータを更新
          title: this.extractTitle(apiData) || existingResult.data.title,
          ownerId: this.extractOwnerId(apiData) || existingResult.data.ownerId,
          ownerName: this.extractOwnerName(apiData) || existingResult.data.ownerName,
          lengthSec: this.extractLengthSec(apiData) || existingResult.data.lengthSec,
          stats: this.extractStats(apiData) || existingResult.data.stats,
          tags: this.extractTags(apiData) || existingResult.data.tags,
          thumbnailUrl: this.extractThumbnailUrl(apiData) || existingResult.data.thumbnailUrl,
          series: this.extractSeries(apiData) || existingResult.data.series,
          // 視聴情報を更新
          watchedAt: now,
          lastPosition: 0,
          completed: false,
          watchCount: existingResult.data.watchCount + 1,
          watchLogs: [...existingResult.data.watchLogs || []]
        };
      } else {
        this.currentEntry = {
          videoId: this.currentVideoId,
          title: this.extractTitle(apiData) || "タイトル不明",
          ownerId: this.extractOwnerId(apiData) || "unknown",
          ownerName: this.extractOwnerName(apiData) || "投稿者不明",
          lengthSec: this.extractLengthSec(apiData) || 0,
          watchedAt: now,
          firstWatchedAt: now,
          lastPosition: 0,
          completed: false,
          watchCount: 1,
          watchLogs: [],
          stats: this.extractStats(apiData),
          tags: this.extractTags(apiData) || [],
          thumbnailUrl: this.extractThumbnailUrl(apiData) || "",
          memo: "",
          series: this.extractSeries(apiData)
        };
      }
      await watchHistoryDB.saveEntry(this.currentEntry);
    } catch (error) {
      console.error("[WatchTracker] 動画メタデータ取得エラー:", error);
      throw error;
    }
  }
  /**
   * 視聴追跡を開始する
   */
  async startWatching() {
    if (!this.currentEntry) {
      console.error("[WatchTracker] 視聴エントリが設定されていません");
      return;
    }
    this.videoElement = document.querySelector("video");
    if (!this.videoElement) {
      console.warn("[WatchTracker] video要素が見つかりません。後で再試行します。");
      setTimeout(() => {
        void this.startWatching();
      }, 5e3);
      return;
    }
    this.setupVideoEventListeners();
    this.emitWatchEvent("start", 0);
    this.isWatching = true;
    this.startTime = Date.now();
    this.previousTime = 0;
    await this.startNewWatchSession();
  }
  /**
   * 新しい視聴セッションを開始する
   */
  async startNewWatchSession() {
    if (!this.currentEntry) return;
    const now = Date.now();
    const newWatchLog = {
      date: now,
      position: 0,
      completed: false
    };
    this.currentEntry.watchLogs.push(newWatchLog);
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug("[WatchTracker] 新しい視聴セッションを開始しました:", {
        videoId: this.currentEntry.videoId,
        sessionCount: this.currentEntry.watchLogs.length
      });
    } catch (error) {
      logger.error("[WatchTracker] 新しい視聴セッション開始エラー:", error);
    }
  }
  /**
   * 最新の視聴セッションを更新する
   */
  updateLatestWatchSession(currentTime, isCompleted, duration) {
    if (!this.currentEntry) {
      logger.warn("[WatchTracker] currentEntryが存在しません");
      return;
    }
    if (!this.currentEntry.watchLogs) {
      logger.warn("[WatchTracker] watchLogsが存在しません");
      return;
    }
    if (this.currentEntry.watchLogs.length === 0) {
      logger.warn("[WatchTracker] watchLogsが空です - 新しいセッションを作成します");
      this.currentEntry.watchLogs.push({
        date: Date.now(),
        position: 0,
        completed: false
      });
    }
    const latestSession = this.currentEntry.watchLogs[this.currentEntry.watchLogs.length - 1];
    latestSession.position = currentTime;
    latestSession.completed = isCompleted;
    const videoDuration = duration || this.videoElement?.duration || this.currentEntry.lengthSec || 1;
    logger.debug("[WatchTracker] 最新の視聴セッションを更新しました:", {
      videoId: this.currentEntry.videoId,
      position: currentTime,
      completed: isCompleted,
      progressPercent: Math.round(currentTime / videoDuration * 100),
      sessionCount: this.currentEntry.watchLogs.length,
      duration: videoDuration
    });
  }
  /**
   * video要素のイベントリスナーを設定する
   */
  setupVideoEventListeners() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener("loadedmetadata", () => {
      if (!this.progressTimer) {
        this.startProgressTracking();
      }
    });
    if (this.videoElement.readyState >= 1 && !this.progressTimer) {
      this.startProgressTracking();
    }
    this.videoElement.addEventListener("play", () => {
      this.emitWatchEvent("resume", this.videoElement.currentTime);
    });
    this.videoElement.addEventListener("pause", () => {
      const currentTime = this.videoElement.currentTime;
      this.emitWatchEvent("pause", currentTime);
      void this.recordCurrentSession();
    });
    this.videoElement.addEventListener("ended", () => {
      void this.handleVideoEnded();
    });
    let timeUpdateTimeout = null;
    this.videoElement.addEventListener("timeupdate", () => {
      if (timeUpdateTimeout) clearTimeout(timeUpdateTimeout);
      timeUpdateTimeout = setTimeout(() => {
        void this.handleTimeUpdate();
      }, 1e3);
    });
  }
  /**
   * 進捗追跡を開始する
   */
  startProgressTracking() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    this.progressTimer = setInterval(() => {
      void this.updateProgress();
    }, this.PROGRESS_INTERVAL);
  }
  /**
   * 進捗を更新する
   */
  async updateProgress() {
    if (!this.videoElement || !this.currentEntry) {
      logger.debug("[WatchTracker] updateProgress: videoElementまたはcurrentEntryが存在しません");
      return;
    }
    const currentTime = this.videoElement.currentTime;
    let duration = this.videoElement.duration;
    if (!isFinite(duration) || duration === 0) {
      duration = this.currentEntry.lengthSec || 0;
    }
    if (isNaN(currentTime) || !isFinite(duration) || duration === 0) {
      logger.debug("[WatchTracker] updateProgress: currentTimeまたはdurationが無効です", {
        currentTime,
        duration
      });
      return;
    }
    const now = Date.now();
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    const completionRate = currentTime / duration;
    if (completionRate >= this.COMPLETION_THRESHOLD && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
      this.emitWatchEvent("complete", currentTime);
    }
    logger.debug("[WatchTracker] 進捗を更新中:", {
      videoId: this.currentEntry.videoId,
      currentTime,
      duration,
      completionRate: Math.round(completionRate * 100),
      watchLogsLength: this.currentEntry.watchLogs?.length || 0
    });
    this.updateLatestWatchSession(currentTime, completionRate >= this.COMPLETION_THRESHOLD, duration);
    if (now - this.lastSessionRecordTime >= this.SESSION_RECORD_INTERVAL) {
      try {
        await watchHistoryDB.saveEntry(this.currentEntry);
        this.lastSessionRecordTime = now;
      } catch (error) {
        console.error("進捗保存エラー:", error);
      }
    }
  }
  /**
   * 時間更新を処理する
   */
  async handleTimeUpdate() {
    if (!this.videoElement || !this.currentEntry) return;
    const currentTime = this.videoElement.currentTime;
    if (this.previousTime > 0 && currentTime < this.previousTime && this.previousTime - currentTime > this.REPEAT_DETECTION_THRESHOLD) {
      console.log("[WatchTracker] 繰り返し再生を検出:", {
        previousTime: this.previousTime,
        currentTime,
        timeDiff: this.previousTime - currentTime
      });
      await this.recordRepeatCompletion();
    }
    this.previousTime = currentTime;
    this.emitWatchEvent("progress", currentTime);
  }
  /**
   * 繰り返し再生時に前のセッションを100%完了として記録する
   */
  async recordRepeatCompletion() {
    if (!this.currentEntry || !this.videoElement) return;
    const duration = this.videoElement.duration;
    const now = Date.now();
    this.currentEntry.completed = true;
    this.currentEntry.lastPosition = duration;
    this.currentEntry.watchedAt = now;
    this.updateLatestWatchSession(duration, true, duration);
    this.currentEntry.watchCount++;
    await this.startNewWatchSession();
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
    } catch (error) {
      console.error("[WatchTracker] 繰り返し再生による完了記録の保存エラー:", error);
    }
    this.emitWatchEvent("complete", duration);
  }
  /**
   * 動画終了を処理する
   */
  async handleVideoEnded() {
    if (!this.videoElement || !this.currentEntry) return;
    const currentTime = this.videoElement.currentTime;
    const now = Date.now();
    this.currentEntry.completed = true;
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    this.updateLatestWatchSession(currentTime, true, this.videoElement?.duration);
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
    } catch (error) {
      console.error("視聴完了保存エラー:", error);
    }
    this.emitWatchEvent("complete", currentTime);
    this.stopWatching();
  }
  /**
   * 視聴追跡を停止する
   */
  stopWatching() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.isWatching = false;
    logger.debug("[WatchTracker] 視聴追跡を停止しました");
  }
  /**
   * 視聴イベントを発行する
   */
  emitWatchEvent(type, currentTime) {
    if (!this.currentEntry) return;
    const event = {
      type,
      videoId: this.currentEntry.videoId,
      currentTime,
      duration: this.videoElement?.duration || 0,
      timestamp: Date.now()
    };
    const customEvent = new CustomEvent("watchHistoryEvent", {
      detail: event
    });
    document.dispatchEvent(customEvent);
  }
  /**
   * 破棄処理
   */
  async destroy() {
    logger.debug("[WatchTracker] 破棄処理を開始します");
    this.stopWatching();
    this.lastSessionRecordTime = 0;
    await this.recordCurrentSession();
    this.currentEntry = null;
    this.videoElement = null;
    this.currentVideoId = null;
    this.previousTime = 0;
    this.lastSessionRecordTime = 0;
    logger.debug("[WatchTracker] 破棄処理が完了しました");
  }
  /**
   * 同期的な破棄処理（beforeunload用）
   */
  destroySync() {
    logger.debug("[WatchTracker] 同期的な破棄処理を開始します");
    this.stopWatching();
    this.lastSessionRecordTime = 0;
    this.recordCurrentSessionSync();
    this.currentEntry = null;
    this.videoElement = null;
    this.currentVideoId = null;
    this.previousTime = 0;
    this.lastSessionRecordTime = 0;
    logger.debug("[WatchTracker] 同期的な破棄処理が完了しました");
  }
  /**
   * ページが背後に回った際など、一時的に進捗のみ保存する公開メソッド
   */
  async saveSnapshot() {
    await this.recordCurrentSession();
  }
  /**
   * 現在の視聴セッションを記録する
   */
  async recordCurrentSession() {
    if (!this.videoElement || !this.currentEntry || !this.isWatching) return;
    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;
    if (isNaN(currentTime) || isNaN(duration) || duration === 0) return;
    const now = Date.now();
    if (now - this.lastSessionRecordTime < this.SESSION_RECORD_INTERVAL) {
      logger.debug("[WatchTracker] 短時間での重複記録をスキップしました");
      return;
    }
    const completionRate = currentTime / duration;
    const isCompleted = completionRate >= this.COMPLETION_THRESHOLD;
    this.updateLatestWatchSession(currentTime, isCompleted, duration);
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    this.lastSessionRecordTime = now;
    if (isCompleted && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
    }
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug("[WatchTracker] 視聴セッションを記録しました:", {
        videoId: this.currentEntry.videoId,
        position: currentTime,
        completed: isCompleted,
        completionRate: Math.round(completionRate * 100)
      });
    } catch (error) {
      logger.error("[WatchTracker] 視聴セッション記録エラー:", error);
    }
  }
  /**
   * 現在の視聴セッションを同期的に記録する（beforeunload用）
   */
  recordCurrentSessionSync() {
    if (!this.videoElement || !this.currentEntry || !this.isWatching) {
      logger.debug("[WatchTracker] recordCurrentSessionSync: 必要な要素が存在しません");
      return;
    }
    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;
    if (isNaN(currentTime) || isNaN(duration) || duration === 0) {
      logger.debug("[WatchTracker] recordCurrentSessionSync: currentTimeまたはdurationが無効です");
      return;
    }
    const now = Date.now();
    const completionRate = currentTime / duration;
    const isCompleted = completionRate >= this.COMPLETION_THRESHOLD;
    this.updateLatestWatchSession(currentTime, isCompleted, duration);
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    if (isCompleted && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
    }
    try {
      void watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug("[WatchTracker] 視聴セッションを同期的に記録しました:", {
        videoId: this.currentEntry.videoId,
        position: currentTime,
        completed: isCompleted,
        completionRate: Math.round(completionRate * 100)
      });
    } catch (error) {
      logger.error("[WatchTracker] 同期的視聴セッション記録エラー:", error);
    }
  }
  // ===== メタデータ抽出メソッド =====
  /**
   * タイトルを抽出する
   */
  extractTitle(apiData) {
    try {
      const videoData = apiData.video;
      return videoData?.title || videoData?.name || document.querySelector("h1.VideoTitle")?.textContent || document.title.replace(" - ニコニコ動画", "") || null;
    } catch (error) {
      console.warn("タイトル抽出エラー:", error);
      return null;
    }
  }
  /**
   * 投稿者IDを抽出する
   */
  extractOwnerId(apiData) {
    try {
      const ownerData = apiData.owner;
      const channelData = apiData.channel;
      const videoData = apiData.video;
      const id = ownerData?.id || channelData?.id || videoData?.owner?.id || null;
      return id ? String(id) : null;
    } catch (error) {
      console.warn("投稿者ID抽出エラー:", error);
      return null;
    }
  }
  /**
   * 投稿者名を抽出する
   */
  extractOwnerName(apiData) {
    try {
      const ownerData = apiData.owner;
      const channelData = apiData.channel;
      const videoData = apiData.video;
      return ownerData?.nickname || channelData?.name || videoData?.owner?.nickname || document.querySelector(".VideoOwner-name")?.textContent || null;
    } catch (error) {
      console.warn("投稿者名抽出エラー:", error);
      return null;
    }
  }
  /**
   * 動画長を抽出する
   */
  extractLengthSec(apiData) {
    try {
      const videoData = apiData.video;
      return videoData?.duration || videoData?.length || (this.videoElement?.duration || 0);
    } catch (error) {
      console.warn("動画長抽出エラー:", error);
      return null;
    }
  }
  /**
   * 統計情報を抽出する
   */
  extractStats(apiData) {
    try {
      const videoData = apiData.video;
      return {
        viewCount: videoData?.count?.view || 0,
        commentCount: videoData?.count?.comment || 0,
        mylistCount: videoData?.count?.mylist || 0,
        likeCount: videoData?.count?.like || 0,
        uploadedAt: videoData?.registeredAt ? new Date(videoData.registeredAt).getTime() : Date.now()
      };
    } catch (error) {
      console.warn("統計情報抽出エラー:", error);
      return null;
    }
  }
  /**
   * タグを抽出する
   */
  extractTags(apiData) {
    try {
      const tagData = apiData.tag;
      return tagData?.items?.map((tag) => tag.name || "") || Array.from(document.querySelectorAll(".VideoTag")).map((el) => el.textContent || "") || [];
    } catch (error) {
      console.warn("タグ抽出エラー:", error);
      return null;
    }
  }
  /**
   * サムネイルURLを抽出する
   */
  extractThumbnailUrl(apiData) {
    try {
      const videoData = apiData.video;
      return videoData?.thumbnail?.url || videoData?.thumbnailUrl || document.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
    } catch (error) {
      console.warn("サムネイルURL抽出エラー:", error);
      return null;
    }
  }
  /**
   * シリーズ情報を抽出する
   */
  extractSeries(apiData) {
    try {
      const seriesData = apiData.series;
      if (!seriesData || !seriesData.id) {
        return null;
      }
      return {
        id: seriesData.id,
        title: seriesData.title || "",
        description: seriesData.description || "",
        thumbnailUrl: seriesData.thumbnailUrl || "",
        video: {
          prev: seriesData.video?.prev,
          next: seriesData.video?.next,
          first: seriesData.video?.first
        }
      };
    } catch (error) {
      console.warn("シリーズ情報抽出エラー:", error);
      return null;
    }
  }
}
let watchTracker = null;
async function initializeWatchTracker() {
  const isWatchPage = isWatchPageLocation();
  const isStandalonePlayer = isStandalonePlayerLocation();
  if (!isWatchPage && !isStandalonePlayer) {
    return;
  }
  if (watchTracker) {
    await watchTracker.destroy();
  }
  watchTracker = new WatchTracker();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initializeWatchTracker();
  });
} else {
  void initializeWatchTracker();
}
let currentUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    if (isWatchPageLocation() || isStandalonePlayerLocation()) {
      setTimeout(() => {
        void initializeWatchTracker();
      }, 1e3);
    }
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});
window.addEventListener("beforeunload", () => {
  if (watchTracker) {
    watchTracker.destroySync();
  }
});
document.addEventListener("visibilitychange", () => {
  if (watchTracker && document.visibilityState === "hidden") {
    logger.debug("[WatchTracker] ページが非表示になりました - 進捗を一時保存します");
    void watchTracker.saveSnapshot();
  }
});
window.addEventListener("pagehide", () => {
  if (watchTracker) {
    logger.debug("[WatchTracker] ページが離脱されました - 視聴セッションを記録します");
    void watchTracker.destroy();
  }
});

export { WatchTracker };
//# sourceMappingURL=watch-tracker.es.js.map
