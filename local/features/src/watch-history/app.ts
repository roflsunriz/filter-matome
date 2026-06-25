/**
 * ニコニコ動画視聴履歴拡張 - メインアプリケーション
 *
 * @description 視聴履歴ビューSPAのメインコントローラー
 * @author roflsunriz
 */
import { applyWatchHistoryStyles } from "@/watch-history/styles";
import {
  createMaterialIcon,
  hydrateMaterialIconImages,
  getIconPath,
} from "@/common/material-icons";
import { CommonHeader } from "@/common/header";
import { logger } from "@/common/logger";
import type {
  WatchHistoryEntry,
  SortBy,
  FilterCondition,
  HistoryViewConfig,
  OverallStats,
  WatchHistoryExportData,
  ImportConfig,
  DailyStats,
  HourlyStats,
  SeriesStats,
  SeriesFilterCondition,
  SeriesAlert,
  SeriesInfo,
  PersistenceStatus,
  MigrationProgress,
  DatabaseManagementConfig,
} from "@/types/watch-history-types";
import { watchHistoryDB } from "@/watch-history/database";

/**
 * 視聴履歴アプリケーションクラス
 */
class WatchHistoryApp {
  private entries: WatchHistoryEntry[] = [];
  private filteredEntries: WatchHistoryEntry[] = [];
  private config: HistoryViewConfig = {
    sortBy: "watchedAt",
    sortOrder: "desc",
    filter: {},
    pageSize: 50,
    currentPage: 1,
  };
  private stats: OverallStats | null = null;
  private selectedEntry: WatchHistoryEntry | null = null;

  // シリーズ関連
  private seriesStats: SeriesStats[] = [];
  private filteredSeriesStats: SeriesStats[] = [];
  private seriesFilter: SeriesFilterCondition = {};
  private seriesAlerts: SeriesAlert[] = [];
  private selectedSeries: SeriesStats | null = null;
  private alertCheckInterval: number | null = null;

  // データベース管理関連
  private persistenceStatus: PersistenceStatus | null = null;
  private migrationProgress: MigrationProgress | null = null;
  private databaseConfig: DatabaseManagementConfig | null = null;

  // DOM要素
  private elements: { [key: string]: HTMLElement } = {};

  constructor() {
    this.initializeElements();
    hydrateMaterialIconImages();
    this.setupEventListeners();
    this.loadConfig();
    this.initializeCommonHeader();
    void this.initialize();
    applyWatchHistoryStyles();
  }

  /**
   * 非同期ハンドラをイベントリスナー用に安全にラップする
   */
  private guardEvent<T extends Event>(
    handler: (ev: T) => void | Promise<void>,
  ): (ev: T) => void {
    return (ev: T) => {
      try {
        const maybe = handler.call(this, ev);
        if (maybe instanceof Promise) {
          void maybe.catch((error) => {
            logger?.error("[WatchHistory] Event handler error:", error);
          });
        }
      } catch (error) {
        logger?.error("[WatchHistory] Event handler throw:", error);
      }
    };
  }

  /**
   * 指定IDの要素テキストを更新する
   */
  private setElementText(id: string, value: string): void {
    const element = this.elements[id];
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * DOM要素を初期化する
   */
  private initializeElements(): void {
    const elementIds = [
      "search-input",
      "search-clear",
      "history-list",
      "loading",
      "empty-state",
      "content-count",
      "refresh-btn",
      "export-btn",
      "import-btn",
      "import-file",
      "history-tab",
      "stats-tab",
      "history-content",
      "stats-content",
      "filter-completed",
      "filter-owner",
      "filter-date-start",
      "filter-date-end",
      "clear-date-range",
      "delete-all-btn",
      "delete-by-condition-btn",
      "delete-watch-count",
      "delete-progress-rate",
      "delete-use-watch-count",
      "delete-use-progress-rate",
      "delete-condition-hint",
      "stats-total-videos",
      "stats-total-time",
      "stats-completion-rate",
      "stats-detail-total-videos",
      "stats-detail-total-time",
      "stats-detail-completion-rate",
      "stats-recent-total-videos",
      "stats-recent-total-time",
      "stats-recent-completed",
      "stats-highlight-top-day",
      "stats-highlight-peak-hour",
      "stats-highlight-top-creator",
      "daily-chart",
      "hourly-chart",
      "creator-stats",
      "tag-cloud",
      "video-detail-modal",
      "modal-title",
      "modal-video-info",
      "modal-close",
      "modal-open-video",
      "modal-edit-memo",
      "memo-edit-modal",
      "memo-textarea",
      "memo-save",
      "memo-cancel",
      "memo-modal-close",
      "favorite-videos",
      "toast-container",
      // シリーズ関連
      "series-tab",
      "series-content",
      "series-search-input",
      "series-search-clear",
      "series-progress-filter",
      "series-refresh-btn",
      "series-count",
      "series-list",
      "series-loading",
      "series-empty-state",
      // シリーズアラート関連
      "series-alert-tab",
      "series-alert-content",
      "add-series-alert-btn",
      "add-series-alert-btn-empty",
      "series-alert-refresh-btn",
      "series-alert-count",
      "series-alert-list",
      "series-alert-loading",
      "series-alert-empty-state",
      // モーダル関連
      "series-alert-modal",
      "series-alert-modal-close",
      "series-alert-series-select",
      "series-alert-interval-select",
      "series-alert-enabled",
      "series-alert-save",
      "series-alert-cancel",
      "series-detail-modal",
      "series-detail-title",
      "series-detail-modal-close",
      "series-detail-info",
      "series-detail-videos",
      "series-detail-add-alert",
      // データベース管理関連
      "database-management-btn",
      "database-management-modal",
      "db-management-modal-close",
      "persistence-badge",
      "persistence-status-text",
      "storage-usage-fill",
      "storage-usage-text",
      "request-persistence-btn",
      "refresh-persistence-btn",
      "migration-progress-container",
      "migration-current-task",
      "migration-progress-fill",
      "migration-progress-text",
      "run-migration-btn",
      "check-migration-btn",
      "create-backup-btn",
      "refresh-backups-btn",
      "backup-list-container",
      "auto-migration-checkbox",
      "auto-persist-checkbox",
      "auto-backup-checkbox",
      "backup-before-migration-checkbox",
      // 手動アラートチェック
      "manual-alert-check-btn",
      "notification-permission-btn",
      // 通知権限モーダル
      "notification-permission-modal",
      "notification-permission-modal-close",
      "test-notification-after-setup",
    ];

    for (const id of elementIds) {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    }
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    // 検索
    this.elements["search-input"]?.addEventListener(
      "input",
      this.guardEvent((ev) => this.handleSearch(ev)),
    );
    this.elements["search-clear"]?.addEventListener(
      "click",
      this.guardEvent(() => this.clearSearch()),
    );

    // ソート
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((ev) => this.handleSort(ev)),
      );
    });

    // フィルタ
    this.elements["filter-completed"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-owner"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-date-start"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-date-end"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["clear-date-range"]?.addEventListener(
      "click",
      this.guardEvent(() => this.clearDateRange()),
    );

    // リフレッシュ
    this.elements["refresh-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.refreshData()),
    );

    // インポート・エクスポート
    this.elements["export-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.handleExport()),
    );
    this.elements["import-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.handleImport()),
    );
    this.elements["import-file"]?.addEventListener(
      "change",
      this.guardEvent((ev) => this.handleImportFile(ev)),
    );

    // 削除機能
    this.elements["delete-all-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.deleteAllHistoryEntries()),
    );
    this.elements["delete-by-condition-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.handleConditionalDelete()),
    );
    this.elements["delete-use-watch-count"]?.addEventListener(
      "change",
      () => this.updateDeleteConditionUI(),
    );
    this.elements["delete-use-progress-rate"]?.addEventListener(
      "change",
      () => this.updateDeleteConditionUI(),
    );

    // タブ切り替え
    this.elements["history-tab"]?.addEventListener(
      "click",
      this.guardEvent(() => {
        this.switchTab("history");
      }),
    );
    this.elements["stats-tab"]?.addEventListener(
      "click",
      this.guardEvent(() => {
        this.switchTab("stats");
      }),
    );
    this.elements["series-tab"]?.addEventListener(
      "click",
      this.guardEvent(() => {
        this.switchTab("series");
      }),
    );
    this.elements["series-alert-tab"]?.addEventListener(
      "click",
      this.guardEvent(() => {
        this.switchTab("series-alert");
      }),
    );

    // モーダル
    this.elements["modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeModal()),
    );
    this.elements["modal-open-video"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openVideo()),
    );
    this.elements["modal-edit-memo"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openMemoEdit()),
    );

    // メモ編集モーダル
    this.elements["memo-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeMemoEdit()),
    );
    this.elements["memo-save"]?.addEventListener(
      "click",
      this.guardEvent(() => this.saveMemo()),
    );
    this.elements["memo-cancel"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeMemoEdit()),
    );

    // モーダルオーバーレイクリック
    this.elements["video-detail-modal"]?.addEventListener(
      "click",
      this.guardEvent((e) => {
        if ((e.target as HTMLElement) === this.elements["video-detail-modal"]) {
          this.closeModal();
        }
      }),
    );

    this.elements["memo-edit-modal"]?.addEventListener(
      "click",
      this.guardEvent((e) => {
        if ((e.target as HTMLElement) === this.elements["memo-edit-modal"]) {
          this.closeMemoEdit();
        }
      }),
    );

    // シリーズ関連イベント
    this.elements["series-search-input"]?.addEventListener(
      "input",
      this.guardEvent((ev) => this.handleSeriesSearch(ev)),
    );
    this.elements["series-search-clear"]?.addEventListener(
      "click",
      this.guardEvent(() => this.clearSeriesSearch()),
    );
    this.elements["series-progress-filter"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleSeriesFilter()),
    );
    this.elements["series-refresh-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.refreshSeriesData()),
    );

    // シリーズアラート関連イベント
    this.elements["add-series-alert-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openSeriesAlertModal()),
    );
    this.elements["add-series-alert-btn-empty"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openSeriesAlertModal()),
    );
    this.elements["series-alert-refresh-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.refreshSeriesAlertData()),
    );
    this.elements["manual-alert-check-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.manualCheckAlerts()),
    );
    this.elements["notification-permission-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.checkNotificationPermission()),
    );

    // シリーズアラートモーダル
    this.elements["series-alert-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeSeriesAlertModal()),
    );
    this.elements["series-alert-save"]?.addEventListener(
      "click",
      this.guardEvent(() => this.saveSeriesAlert()),
    );
    this.elements["series-alert-cancel"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeSeriesAlertModal()),
    );

    // シリーズ詳細モーダル
    this.elements["series-detail-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeSeriesDetailModal()),
    );
    this.elements["series-detail-add-alert"]?.addEventListener(
      "click",
      this.guardEvent(() => this.addAlertFromSeriesDetail()),
    );

    // モーダルオーバーレイクリック（シリーズ関連）
    this.elements["series-alert-modal"]?.addEventListener(
      "click",
      this.guardEvent((e) => {
        if (e.target === this.elements["series-alert-modal"]) {
          this.closeSeriesAlertModal();
        }
      }),
    );

    this.elements["series-detail-modal"]?.addEventListener(
      "click",
      this.guardEvent((e) => {
        if (e.target === this.elements["series-detail-modal"]) {
          this.closeSeriesDetailModal();
        }
      }),
    );

    // データベース管理関連イベント
    this.elements["database-management-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openDatabaseManagementModal()),
    );
    this.elements["db-management-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeDatabaseManagementModal()),
    );
    this.elements["request-persistence-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.requestPersistence()),
    );
    this.elements["refresh-persistence-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.refreshPersistenceStatus()),
    );
    this.elements["run-migration-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.runMigration()),
    );
    this.elements["check-migration-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.checkMigrationStatus()),
    );
    this.elements["create-backup-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.createBackup()),
    );
    this.elements["refresh-backups-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.refreshBackupList()),
    );

    // 設定チェックボックス
    this.elements["auto-migration-checkbox"]?.addEventListener(
      "change",
      this.guardEvent(() => this.updateDatabaseConfig()),
    );
    this.elements["auto-persist-checkbox"]?.addEventListener(
      "change",
      this.guardEvent(() => this.updateDatabaseConfig()),
    );
    this.elements["auto-backup-checkbox"]?.addEventListener(
      "change",
      this.guardEvent(() => this.updateDatabaseConfig()),
    );
    this.elements["backup-before-migration-checkbox"]?.addEventListener(
      "change",
      this.guardEvent(() => this.updateDatabaseConfig()),
    );

    // データベース管理モーダルオーバーレイクリック
    this.elements["database-management-modal"]?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.elements["database-management-modal"]) {
          this.closeDatabaseManagementModal();
        }
      },
    );

    // 通知権限モーダル
    this.elements["notification-permission-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeNotificationPermissionModal()),
    );
    this.elements["test-notification-after-setup"]?.addEventListener(
      "click",
      this.guardEvent(() => this.testNotificationAfterSetup()),
    );

    // 通知権限モーダルオーバーレイクリック
    this.elements["notification-permission-modal"]?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.elements["notification-permission-modal"]) {
          this.closeNotificationPermissionModal();
        }
      },
    );

    // マイグレーション進捗イベントリスナー
    document.addEventListener(
      "migrationProgress",
      this.guardEvent((e) => {
        this.handleMigrationProgress(e as CustomEvent);
      }),
    );
  }

  /**
   * 設定を読み込む
   */
  private loadConfig(): void {
    const savedConfig = sessionStorage.getItem("watchHistoryConfig");
    if (savedConfig) {
      try {
        const parsed: unknown = JSON.parse(savedConfig);
        if (parsed && typeof parsed === "object") {
          this.config = {
            ...this.config,
            ...(parsed as Partial<HistoryViewConfig>),
          };
        }
        // ===== 読み込んだ検索テキストをサニタイズします =====
        const txt = (this.config.filter.searchText ?? "").trim().toLowerCase();
        if (!txt || txt === "null" || txt === "undefined") {
          delete this.config.filter.searchText;
        } else {
          this.config.filter.searchText = txt;
        }
      } catch (error) {
        logger.warn("設定読み込みエラー:", error);
      }
    }
  }

  /**
   * 設定を保存する
   */
  private saveConfig(): void {
    sessionStorage.setItem("watchHistoryConfig", JSON.stringify(this.config));
  }

  /**
   * 共通ヘッダーを初期化する
   */
  private initializeCommonHeader(): void {
    const container = document.getElementById("common-header-container");
    if (container) {
      new CommonHeader(container, {
        title: "watch-history",
        showSearch: true,
        showMoreLinks: true,
        enableFixedMode: false,
      });
    }
  }

  /**
   * アプリケーションを初期化する
   */
  private async initialize(): Promise<void> {
    try {
      this.showLoading(true);

      // データベースを初期化
      await watchHistoryDB.initialize();

      // データを読み込み
      await this.loadData();

      // UIを更新
      this.updateUI();
    } catch (error) {
      logger.error("初期化エラーです:", error);
      this.showToast("初期化に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * フィルタオブジェクトをサニタイズして返す
   */
  private cleanFilter(filter: FilterCondition): FilterCondition {
    const cleaned: FilterCondition = { ...filter };

    // searchText
    const txt = (cleaned.searchText ?? "").trim();
    if (
      !txt ||
      txt.toLowerCase() === "null" ||
      txt.toLowerCase() === "undefined"
    ) {
      delete cleaned.searchText;
    } else {
      cleaned.searchText = txt;
    }

    // ownerId
    if (cleaned.ownerId) {
      const oid = String(cleaned.ownerId).trim();
      if (
        !oid ||
        oid.toLowerCase() === "null" ||
        oid.toLowerCase() === "undefined"
      ) {
        delete cleaned.ownerId;
      } else {
        cleaned.ownerId = oid;
      }
    }

    // dateRange
    if (cleaned.dateRange) {
      const { start, end } = cleaned.dateRange;
      if (!start && !end) {
        delete cleaned.dateRange;
      }
    }

    // completedOnly : leave as is (boolean)
    return cleaned;
  }

  /**
   * データを読み込む
   */
  private async loadData(): Promise<void> {
    try {
      logger.debug("データ読み込み開始");

      // 履歴データを取得
      logger.debug("getAllEntries呼び出し前:", {
        sortBy: this.config.sortBy,
        sortOrder: this.config.sortOrder,
        filter: this.config.filter,
      });

      const sanitizedFilter = this.cleanFilter(this.config.filter);
      // サニタイズ後のフィルタを設定し直す
      this.config.filter = sanitizedFilter;

      const entriesResult = await watchHistoryDB.getAllEntries(
        this.config.sortBy,
        this.config.sortOrder,
        sanitizedFilter,
      );

      logger.debug("履歴データ取得結果:", {
        success: entriesResult.success,
        count: entriesResult.data?.length || 0,
      });

      if (entriesResult.success && entriesResult.data) {
        this.entries = entriesResult.data;
        this.filterEntries();
      } else {
        logger.warn("履歴データの取得に失敗:", entriesResult);
        this.entries = [];
        this.filterEntries();
      }

      // 統計データを取得
      const statsResult = await watchHistoryDB.calculateStats();
      if (statsResult.success && statsResult.data) {
        this.stats = statsResult.data;
      }

      logger.debug("データ読み込み完了");
    } catch (error) {
      logger.error("データ読み込みエラー:", error);
      throw error;
    }
  }

  /**
   * エントリをフィルタリングする
   */
  private filterEntries(): void {
    logger.debug("フィルタリング開始:", {
      totalEntries: this.entries.length,
      filter: this.config.filter,
    });

    this.filteredEntries = this.entries.filter((entry) => {
      const filter = this.config.filter;

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

        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }

      // 投稿者フィルタ
      if (filter.ownerId && String(entry.ownerId) !== String(filter.ownerId)) {
        logger.debug("投稿者フィルタで除外:", {
          videoId: entry.videoId,
          title: entry.title,
          entryOwnerId: entry.ownerId,
          entryOwnerIdType: typeof entry.ownerId,
          filterOwnerId: filter.ownerId,
          filterOwnerIdType: typeof filter.ownerId,
          entryOwnerIdString: String(entry.ownerId),
          filterOwnerIdString: String(filter.ownerId),
          isStringEqual: String(entry.ownerId) === String(filter.ownerId),
        });
        return false;
      }

      // 完走フィルタ
      if (filter.completedOnly && !entry.completed) {
        return false;
      }

      // 日付範囲フィルタ
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (
          watchedAt < filter.dateRange.start ||
          watchedAt > filter.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });

    logger.debug("フィルタリング完了:", {
      filteredEntries: this.filteredEntries.length,
    });
  }

  /**
   * UIを更新する
   */
  private updateUI(): void {
    this.updateHistoryList();
    this.updateStats();
    this.updateFilters();
    this.updateContentCount();
  }

  /**
   * 履歴リストを更新する
   */
  private updateHistoryList(): void {
    const historyList = this.elements["history-list"];
    if (!historyList) return;

    // 空の場合の処理
    if (this.filteredEntries.length === 0) {
      historyList.innerHTML = "";
      this.showEmptyState(true);
      return;
    }

    this.showEmptyState(false);

    // アイテムを生成
    try {
      const items = this.filteredEntries.map((e) => this.createHistoryItem(e));
      historyList.innerHTML = items.join("");
    } catch (err) {
      logger.error("履歴アイテム生成で例外:", err);
      this.showToast("履歴描画でエラー発生しました", "error");
    }

    // イベントリスナーを設定
    historyList.querySelectorAll(".history-item").forEach((item, index) => {
      item.addEventListener(
        "click",
        this.guardEvent((e) => {
          // アコーディオンのクリックイベントを除外
          if (
            e.target &&
            (e.target as HTMLElement).closest(".watch-count-item")
          ) {
            return;
          }
          // 削除ボタンのクリックイベントを除外
          if (
            e.target &&
            (e.target as HTMLElement).closest(".history-delete-btn")
          ) {
            return;
          }
          this.showVideoDetail(this.filteredEntries[index]);
        }),
      );

      // 削除ボタンのイベントリスナーを設定
      const deleteBtn = item.querySelector(".history-delete-btn");
      deleteBtn?.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          void this.deleteHistoryEntry(this.filteredEntries[index]);
        }),
      );
    });

    // アコーディオンのイベントリスナーを設定
    historyList.querySelectorAll(".watch-count-item").forEach((item) => {
      item.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation(); // 履歴アイテムクリックを防ぐ
          this.toggleWatchLogsAccordion(item as HTMLElement);
        }),
      );
    });
  }

  /**
   * 履歴アイテムのHTMLを生成する
   */
  private createHistoryItem(entry: WatchHistoryEntry): string {
    const watchedAtDate = new Date(entry.watchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = (entry.lastPosition / entry.lengthSec) * 100;
      progressPercent =
        rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }

    const completionIcon = entry.completed
      ? createMaterialIcon("check_circle", {
          color: "green",
          classes: "completion-icon completed",
        })
      : createMaterialIcon("radio_button_unchecked", {
          color: "default",
          classes: "completion-icon",
        });

    return `
      <div class="history-item" data-video-id="${entry.videoId}">
        <div class="history-thumbnail">
          <img src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" 
               alt="${entry.title}" 
               class="thumbnail-image"
               onerror="this.src='/default-thumbnail.jpg'">
          <div class="video-duration">${this.formatDuration(entry.lengthSec)}</div>
        </div>
        <div class="history-content">
          <div class="history-header">
            <h3 class="history-title">${this.escapeHtml(entry.title)}</h3>
            <div class="history-actions">
              ${completionIcon}
              <button class="history-delete-btn btn btn-sm btn-danger" title="この履歴を削除">
                ${createMaterialIcon("delete", { color: "white", size: "small" })}
              </button>
            </div>
          </div>
          <div class="history-meta">
            <div class="history-owner">
              ${createMaterialIcon("person", { color: "dark", size: "small" })}
              ${this.escapeHtml(entry.ownerName)}
            </div>
            <div class="history-date">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              ${watchedAtDate.toLocaleDateString("ja-JP")} ${watchedAtDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
            ${
              entry.stats?.uploadedAt
                ? `
              <div class="history-upload-date">
                ${createMaterialIcon("publish", { color: "dark", size: "small" })}
                投稿: ${new Date(entry.stats.uploadedAt).toLocaleDateString("ja-JP")}
              </div>
            `
                : ""
            }
          </div>
          <div class="history-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="progress-text">${progressPercent}%</span>
          </div>
          <div class="history-stats">
            <div class="stat-item watch-count-item" data-video-id="${entry.videoId}">
              ${createMaterialIcon("repeat", { color: "dark", size: "small" })}
              <span class="watch-count-label">${entry.watchCount}回視聴</span>
              ${createMaterialIcon("expand_more", { color: "dark", size: "small", classes: "accordion-icon" })}
            </div>
            <div class="stat-item">
              ${createMaterialIcon("timer", { color: "dark", size: "small" })}
              <span>${this.formatDuration(entry.lengthSec)}</span>
            </div>
            ${
              entry.stats?.viewCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("visibility", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.viewCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.commentCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("comment", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.commentCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.mylistCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("bookmark", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.mylistCount)}</span>
              </div>
            `
                : ""
            }
            ${
              entry.stats?.likeCount
                ? `
              <div class="stat-item">
                ${createMaterialIcon("thumb_up", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.likeCount)}</span>
              </div>
            `
                : ""
            }
          </div>
          <div class="watch-logs-accordion" data-video-id="${entry.videoId}">
            <div class="watch-logs-content">
              ${this.createWatchLogsHTML(entry)}
            </div>
          </div>
          ${
            entry.memo
              ? `
            <div class="history-memo">
              ${createMaterialIcon("note", { color: "dark", size: "small" })}
              <span class="memo-text">${this.escapeHtml(entry.memo)}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * 視聴ログの詳細HTMLを作成する
   */
  private createWatchLogsHTML(entry: WatchHistoryEntry): string {
    const watchLogs = entry.watchLogs || [];

    // 現在の視聴状況も含めた全ての視聴セッションを作成
    const allSessions = [...watchLogs];

    // 視聴ログが空の場合、または最新の視聴セッションが記録されていない場合は現在の状況を追加
    const shouldAddCurrentSession =
      watchLogs.length === 0 ||
      (watchLogs.length > 0 &&
        Math.abs(entry.watchedAt - watchLogs[0].date) > 60000); // 1分以上の差がある場合

    if (shouldAddCurrentSession) {
      // 現在の視聴状況を追加
      allSessions.unshift({
        date: entry.watchedAt,
        position: entry.lastPosition,
        completed: entry.completed,
      });
    }

    if (allSessions.length === 0) {
      return `
        <div class="watch-logs-empty">
          ${createMaterialIcon("info", { color: "dark", size: "small" })}
          <span>視聴記録がありません</span>
        </div>
      `;
    }

    // 視聴ログを日時順（新しい順）でソート
    const sortedLogs = [...allSessions].sort((a, b) => b.date - a.date);

    return `
      <div class="watch-logs-list">
        ${sortedLogs
          .map((log, index) => {
            const logDate = new Date(log.date);
            let progressPercent = 0;
            if (entry.lengthSec > 0) {
              const rawPercent = (log.position / entry.lengthSec) * 100;
              progressPercent =
                rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
            }

            // 現在の視聴セッションかどうかを判定
            const isCurrentSession = shouldAddCurrentSession && index === 0;

            return `
            <div class="watch-log-item ${index === 0 ? "latest" : ""} ${isCurrentSession ? "current-session" : ""}">
              <div class="watch-log-header">
                <div class="watch-log-date">
                  ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
                  <span>${logDate.toLocaleDateString("ja-JP")} ${logDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                  ${index === 0 ? '<span class="latest-badge">最新</span>' : ""}
                  ${isCurrentSession ? '<span class="current-badge">現在</span>' : ""}
                </div>
                <div class="watch-log-completion">
                  ${
                    log.completed
                      ? createMaterialIcon("check_circle", {
                          color: "green",
                          size: "small",
                        })
                      : createMaterialIcon("play_circle", {
                          color: "dark",
                          size: "small",
                        })
                  }
                  <span class="completion-text">${log.completed ? "完走" : "途中"}</span>
                </div>
              </div>
              <div class="watch-log-progress">
                <div class="progress-bar small">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}% (${this.formatDuration(log.position)})</span>
              </div>
              ${
                isCurrentSession
                  ? `
                <div class="current-session-note">
                  <span>※ 現在の視聴進捗</span>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  /**
   * 視聴ログアコーディオンを切り替える
   */
  private toggleWatchLogsAccordion(item: HTMLElement): void {
    const videoId = item.getAttribute("data-video-id");
    if (!videoId) return;

    const accordion = document.querySelector(
      `.watch-logs-accordion[data-video-id="${videoId}"]`,
    ) as HTMLElement;
    if (!accordion) return;

    const icon = item.querySelector(".accordion-icon") as HTMLElement;
    if (!icon) return;

    // アコーディオンの状態を切り替え
    const isExpanded = accordion.classList.contains("expanded");

    if (isExpanded) {
      // 閉じる
      accordion.classList.remove("expanded");
      icon.innerHTML = createMaterialIcon("expand_more", {
        color: "dark",
        size: "small",
      });
    } else {
      // 開く
      accordion.classList.add("expanded");
      icon.innerHTML = createMaterialIcon("expand_less", {
        color: "dark",
        size: "small",
      });
    }
  }

  /**
   * 統計を更新する
   */
  private updateStats(): void {
    if (!this.stats) return;

    const totalTime = this.formatDuration(this.stats.totalWatchTime);
    const completionRate = `${Math.round(this.stats.completionRate * 100)}%`;

    // サイドバーの統計
    if (this.elements["stats-total-videos"]) {
      this.elements["stats-total-videos"].textContent =
        this.stats.totalVideos.toString();
    }
    if (this.elements["stats-total-time"]) {
      this.elements["stats-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-completion-rate"]) {
      this.elements["stats-completion-rate"].textContent = completionRate;
    }

    // 統計タブの詳細
    if (this.elements["stats-detail-total-videos"]) {
      this.elements["stats-detail-total-videos"].textContent =
        this.stats.totalVideos.toString();
    }
    if (this.elements["stats-detail-total-time"]) {
      this.elements["stats-detail-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-detail-completion-rate"]) {
      this.elements["stats-detail-completion-rate"].textContent =
        completionRate;
    }

    this.updateRecentActivityStats();
    this.updateHighlightStats();

    // グラフを更新
    this.updateCharts();
    this.updateCreatorStats();
    this.updateTagCloud();
    this.updateFavoriteVideos();
  }

  /**
   * 直近7日の統計を更新する
   */
  private updateRecentActivityStats(): void {
    if (!this.stats) return;

    if (this.stats.dailyStats.length === 0) {
      this.setElementText("stats-recent-total-videos", "-");
      this.setElementText("stats-recent-total-time", "-");
      this.setElementText("stats-recent-completed", "-");
      return;
    }

    const today = new Date();
    const endKey = this.getDateKey(today);
    const startDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 6,
    );
    const startKey = this.getDateKey(startDate);

    let totalWatchCount = 0;
    let totalWatchTime = 0;
    let totalCompleted = 0;

    for (const stat of this.stats.dailyStats) {
      if (stat.date < startKey || stat.date > endKey) continue;

      totalWatchCount += stat.watchCount;
      totalWatchTime += stat.totalWatchTime;
      totalCompleted += stat.completedCount;
    }

    this.setElementText(
      "stats-recent-total-videos",
      totalWatchCount.toLocaleString(),
    );
    this.setElementText(
      "stats-recent-total-time",
      this.formatDuration(totalWatchTime),
    );
    this.setElementText(
      "stats-recent-completed",
      totalCompleted.toLocaleString(),
    );
  }

  /**
   * ハイライト統計を更新する
   */
  private updateHighlightStats(): void {
    if (!this.stats) return;

    const topDay = this.stats.dailyStats.reduce<DailyStats | null>(
      (best, current) => {
        if (!best) return current;
        if (current.watchCount > best.watchCount) return current;
        if (
          current.watchCount === best.watchCount &&
          current.totalWatchTime > best.totalWatchTime
        )
          return current;
        if (
          current.watchCount === best.watchCount &&
          current.totalWatchTime === best.totalWatchTime &&
          current.date > best.date
        ) {
          return current;
        }
        return best;
      },
      null,
    );

    if (topDay) {
      const topDayText = `${this.formatDateLabel(topDay.date)} (${topDay.watchCount.toLocaleString()}回 / ${this.formatDuration(topDay.totalWatchTime)})`;
      this.setElementText("stats-highlight-top-day", topDayText);
    } else {
      this.setElementText("stats-highlight-top-day", "-");
    }

    const peakHour = this.stats.hourlyStats.reduce<HourlyStats | null>(
      (best, current) => {
        if (!best) return current;
        if (current.watchCount > best.watchCount) return current;
        if (current.watchCount === best.watchCount && current.hour > best.hour)
          return current;
        return best;
      },
      null,
    );

    const peakHourText =
      peakHour && peakHour.watchCount > 0
        ? `${peakHour.hour.toString().padStart(2, "0")}時台 (${peakHour.watchCount.toLocaleString()}回)`
        : "-";
    this.setElementText("stats-highlight-peak-hour", peakHourText);

    const topCreator = this.stats.creatorStats[0];
    if (topCreator) {
      const topCreatorText = `${topCreator.ownerName} (${topCreator.videoCount.toLocaleString()}本 / ${this.formatDuration(topCreator.totalWatchTime)})`;
      this.setElementText("stats-highlight-top-creator", topCreatorText);
    } else {
      this.setElementText("stats-highlight-top-creator", "-");
    }
  }

  /**
   * フィルタを更新する
   */
  private updateFilters(): void {
    // 投稿者フィルタのオプションを更新
    const ownerSelect = this.elements["filter-owner"] as HTMLSelectElement;
    if (ownerSelect) {
      logger.debug("投稿者フィルタを更新中:", {
        entriesCount: this.entries.length,
      });

      // 投稿者IDとnameの組み合わせを作成
      const ownersMap = new Map<string, string>();
      this.entries.forEach((entry) => {
        if (entry.ownerId && entry.ownerName) {
          ownersMap.set(entry.ownerId, entry.ownerName);
        }
      });

      logger.debug("投稿者マップ作成完了:", { ownersCount: ownersMap.size });

      const currentValue = ownerSelect.value;

      ownerSelect.innerHTML = '<option value="">すべて</option>';

      // Map をソートして表示
      const sortedOwners = Array.from(ownersMap.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      );

      sortedOwners.forEach(([ownerId, ownerName]) => {
        const option = document.createElement("option");
        option.value = ownerId;
        option.textContent = ownerName;
        ownerSelect.appendChild(option);
      });

      ownerSelect.value = currentValue;
      logger.debug("投稿者フィルタ更新完了:", {
        currentValue,
        optionsCount: sortedOwners.length,
      });
    }
  }

  /**
   * コンテンツ数を更新する
   */
  private updateContentCount(): void {
    const contentCount = this.elements["content-count"];
    if (contentCount) {
      contentCount.textContent = `${this.filteredEntries.length} 件の動画`;
    }
  }

  /**
   * グラフを更新する
   */
  private updateCharts(): void {
    if (!this.stats) return;

    // 日別グラフ
    const dailyChart = this.elements["daily-chart"] as HTMLCanvasElement;
    if (dailyChart) {
      this.drawDailyChart(dailyChart, this.stats.dailyStats);
    }

    // 時間帯別グラフ
    const hourlyChart = this.elements["hourly-chart"] as HTMLCanvasElement;
    if (hourlyChart) {
      this.drawHourlyChart(hourlyChart, this.stats.hourlyStats);
    }
  }

  /**
   * 投稿者統計を更新する
   */
  private updateCreatorStats(): void {
    const creatorStats = this.elements["creator-stats"];
    if (!creatorStats || !this.stats) return;

    const topCreators = this.stats.creatorStats.slice(0, 10);
    const html = topCreators
      .map(
        (creator) => `
      <div class="creator-stat-item">
        <div class="creator-info">
          <span class="creator-name">${this.escapeHtml(creator.ownerName)}</span>
          <span class="creator-count">${creator.videoCount}本</span>
        </div>
        <div class="creator-time">${this.formatDuration(creator.totalWatchTime)}</div>
      </div>
    `,
      )
      .join("");

    creatorStats.innerHTML = html;
  }

  /**
   * タグ統計を計算する
   */
  private calculateTagStats(): { tag: string; count: number; size: string }[] {
    const tagCounts = new Map<string, number>();

    // 全てのエントリからタグを収集
    this.entries.forEach((entry) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            const normalizedTag = tag.trim();
            tagCounts.set(
              normalizedTag,
              (tagCounts.get(normalizedTag) || 0) + 1,
            );
          }
        });
      }
    });

    // タグをソートし、上位50個を取得
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    if (sortedTags.length === 0) {
      return [];
    }

    // 最大・最小カウントを取得
    const maxCount = Math.max(...sortedTags.map(([, count]) => count));
    const minCount = Math.min(...sortedTags.map(([, count]) => count));

    // サイズを決定
    return sortedTags.map(([tag, count]) => {
      let size = "md";
      if (maxCount > minCount) {
        const ratio = (count - minCount) / (maxCount - minCount);
        if (ratio >= 0.8) size = "xl";
        else if (ratio >= 0.6) size = "lg";
        else if (ratio >= 0.4) size = "md";
        else if (ratio >= 0.2) size = "sm";
        else size = "xs";
      }
      return { tag, count, size };
    });
  }

  /**
   * タグクラウドを更新する
   */
  private updateTagCloud(): void {
    const tagCloudElement = this.elements["tag-cloud"];
    if (!tagCloudElement) return;

    const tagStats = this.calculateTagStats();

    if (tagStats.length === 0) {
      tagCloudElement.innerHTML = `
        <div class="tag-cloud-empty">
          ${createMaterialIcon("label", { color: "dark", size: "large" })}
          <span>タグがありません</span>
        </div>
      `;
      return;
    }

    const html = tagStats
      .map(
        ({ tag, count, size }) => `
      <span class="tag-cloud-item size-${size}" 
            data-tag="${this.escapeHtml(tag)}" 
            data-count="${count}"
            title="${this.escapeHtml(tag)}: ${count}回">
        ${this.escapeHtml(tag)}
      </span>
    `,
      )
      .join("");

    tagCloudElement.innerHTML = html;

    // タグクリックイベントを追加
    tagCloudElement.querySelectorAll(".tag-cloud-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tag = item.getAttribute("data-tag");
        if (tag) {
          this.searchByTag(tag);
        }
      });
    });
  }

  /**
   * お気に入り動画トップ15を計算する
   */
  private calculateFavoriteVideos(): {
    entry: WatchHistoryEntry;
    score: number;
  }[] {
    const list = this.entries.map((entry) => {
      const logs = Array.isArray(entry.watchLogs) ? entry.watchLogs : [];
      let totalScore = 0;
      if (logs.length > 0) {
        totalScore = logs.reduce((sum, log) => {
          const completionRatio =
            entry.lengthSec > 0
              ? log.completed
                ? 1
                : log.position / entry.lengthSec
              : 0;
          return sum + completionRatio;
        }, 0);
      } else {
        const ratio =
          entry.lengthSec > 0 ? entry.lastPosition / entry.lengthSec : 0;
        totalScore = ratio;
      }
      return { entry, score: totalScore };
    });

    return list.sort((a, b) => b.score - a.score).slice(0, 15);
  }

  /**
   * お気に入り動画リストを更新する
   */
  private updateFavoriteVideos(): void {
    const container = this.elements["favorite-videos"];
    if (!container) return;

    const favorites = this.calculateFavoriteVideos();

    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="favorite-empty">
          ${createMaterialIcon("star", { color: "dark", size: "large" })}
          <span>お気に入り動画がありません</span>
        </div>
      `;
      return;
    }

    const html = favorites
      .map((item, index) => {
        const { entry, score } = item;
        return `
        <div class="favorite-item" data-video-id="${entry.videoId}">
          <span class="favorite-rank">${index + 1}</span>
          <img class="favorite-thumb" src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" alt="${this.escapeHtml(entry.title)}" onerror="this.src='/default-thumbnail.jpg'">
          <span class="favorite-title">${this.escapeHtml(entry.title)}</span>
          <span class="favorite-score">${score.toFixed(2)}</span>
        </div>
      `;
      })
      .join("");

    container.innerHTML = html;

    container.querySelectorAll(".favorite-item").forEach((item, idx) => {
      item.addEventListener("click", () => {
        this.showVideoDetail(favorites[idx].entry);
      });
    });
  }

  /**
   * タグで検索する
   */
  private searchByTag(tag: string): void {
    // 履歴タブに切り替え
    this.switchTab("history");

    // 検索フィールドにタグを設定
    const searchInput = this.elements["search-input"] as HTMLInputElement;
    if (searchInput) {
      searchInput.value = tag;
      this.config.filter.searchText = tag;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }

  // ===== イベントハンドラ =====

  /**
   * 検索を処理する
   */
  private handleSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.config.filter.searchText = input.value.trim() || undefined;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }

  /**
   * 検索をクリアする
   */
  private clearSearch(): void {
    const searchInput = this.elements["search-input"] as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      this.config.filter.searchText = undefined;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }

  /**
   * 期間フィルタを一括クリアする
   */
  private clearDateRange(): void {
    const startDateInput = this.elements[
      "filter-date-start"
    ] as HTMLInputElement;
    const endDateInput = this.elements["filter-date-end"] as HTMLInputElement;

    if (startDateInput) {
      startDateInput.value = "";
    }
    if (endDateInput) {
      endDateInput.value = "";
    }

    // フィルタ設定をクリア
    this.config.filter.dateRange = undefined;

    // フィルタを再適用
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();

    // 成功メッセージを表示
    this.showToast("期間フィルタをクリアしました", "success");
  }

  /**
   * ソートを処理する
   */
  private async handleSort(event: Event): Promise<void> {
    const button = event.currentTarget as HTMLButtonElement;
    const sortBy = button.dataset.sort as SortBy;

    if (this.config.sortBy === sortBy) {
      // 同じソート項目の場合は順序を反転
      this.config.sortOrder = this.config.sortOrder === "asc" ? "desc" : "asc";
    } else {
      // 新しいソート項目
      this.config.sortBy = sortBy;
      this.config.sortOrder = "desc";
    }

    this.updateSortUI();
    await this.loadData();
    this.updateUI();
    this.saveConfig();
  }

  /**
   * ソートUIを更新する
   */
  private updateSortUI(): void {
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
      const icon = btn.querySelector(".sort-order-icon") as HTMLImageElement;
      if (icon) {
        icon.src = getIconPath("arrow_downward");
      }
    });

    const activeBtn = document.querySelector(
      `[data-sort="${this.config.sortBy}"]`,
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
      const icon = activeBtn.querySelector(
        ".sort-order-icon",
      ) as HTMLImageElement;
      if (icon) {
        icon.src =
          this.config.sortOrder === "asc"
            ? getIconPath("arrow_upward")
            : getIconPath("arrow_downward");
      }
    }
  }

  /**
   * フィルタを処理する
   */
  private handleFilter(): void {
    const completedFilter = this.elements[
      "filter-completed"
    ] as HTMLInputElement;
    const ownerFilter = this.elements["filter-owner"] as HTMLSelectElement;
    const dateStartFilter = this.elements[
      "filter-date-start"
    ] as HTMLInputElement;
    const dateEndFilter = this.elements["filter-date-end"] as HTMLInputElement;

    this.config.filter.completedOnly = completedFilter?.checked
      ? true
      : undefined;
    this.config.filter.ownerId = ownerFilter?.value || undefined;

    logger.debug("フィルタ更新:", {
      completedOnly: this.config.filter.completedOnly,
      ownerId: this.config.filter.ownerId,
      ownerName: ownerFilter?.selectedOptions[0]?.textContent,
    });

    if (dateStartFilter?.value && dateEndFilter?.value) {
      this.config.filter.dateRange = {
        start: new Date(dateStartFilter.value).getTime(),
        end: new Date(dateEndFilter.value).getTime() + 24 * 60 * 60 * 1000 - 1,
      };
    } else {
      this.config.filter.dateRange = undefined;
    }

    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }

  /**
   * データを更新する
   */
  private async refreshData(): Promise<void> {
    try {
      this.showLoading(true);
      await this.loadData();
      this.updateUI();
      this.showToast("データを更新しました", "success");
    } catch (error) {
      logger.error("データ更新エラー:", error);
      this.showToast("データ更新に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * エクスポートを処理する
   */
  private async handleExport(): Promise<void> {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // 年月日時分秒を含むファイル名を生成（コロンを避けるため）
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHMMSS
        a.download = `nico-watch-history-${dateStr}-${timeStr}.json`;

        a.click();
        URL.revokeObjectURL(url);
        this.showToast("エクスポートが完了しました", "success");
      }
    } catch (error) {
      logger.error("エクスポートエラー:", error);
      this.showToast("エクスポートに失敗しました", "error");
    }
  }

  /**
   * インポートを処理する
   */
  private handleImport(): void {
    const fileInput = this.elements["import-file"] as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * インポートファイルを処理する
   */
  private async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as WatchHistoryExportData;

      // 後方互換性のため、seriesAlertsが存在しない場合は空配列を設定
      if (!data.seriesAlerts) {
        data.seriesAlerts = [];
      }

      const config: ImportConfig = {
        duplicateHandling: "merge",
        maxEntries: 10000,
      };

      const result = await watchHistoryDB.importData(data, config);
      if (result.success && result.data !== undefined) {
        this.showToast(
          `${result.data}件のデータをインポートしました`,
          "success",
        );
        await this.refreshData();
        // シリーズアラートデータも更新
        await this.refreshSeriesAlertData();
      }
    } catch (error) {
      logger.error("インポートエラー:", error);
      this.showToast("インポートに失敗しました", "error");
    } finally {
      input.value = "";
    }
  }

  /**
   * タブを切り替える
   */
  private switchTab(tabName: string): void {
    // タブボタンの状態を更新
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.elements[`${tabName}-tab`]?.classList.add("active");

    // タブコンテンツの表示を更新
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    this.elements[`${tabName}-content`]?.classList.add("active");

    // 統計タブの場合はグラフを更新
    if (tabName === "stats") {
      setTimeout(() => {
        this.updateCharts();
      }, 100);
    }

    // シリーズタブの場合はシリーズデータを初期化
    if (tabName === "series") {
      void this.initializeSeriesTab();
    }

    // シリーズアラートタブの場合はアラートデータを初期化
    if (tabName === "series-alert") {
      void this.initializeSeriesAlertTab();
    }
  }

  /**
   * 動画詳細を表示する
   */
  private showVideoDetail(entry: WatchHistoryEntry): void {
    this.selectedEntry = entry;

    const modalTitle = this.elements["modal-title"];
    if (modalTitle) {
      modalTitle.textContent = entry.title;
    }

    const modalVideoInfo = this.elements["modal-video-info"];
    if (modalVideoInfo) {
      modalVideoInfo.innerHTML = this.createVideoDetailHTML(entry);
    }

    this.elements["video-detail-modal"]?.classList.remove("hidden");
  }

  /**
   * 動画詳細HTMLを作成する
   */
  private createVideoDetailHTML(entry: WatchHistoryEntry): string {
    const watchedAtDate = new Date(entry.watchedAt);
    const firstWatchedAtDate = new Date(entry.firstWatchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = (entry.lastPosition / entry.lengthSec) * 100;
      progressPercent =
        rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }

    return `
      <div class="video-detail-grid">
        <div class="video-detail-thumbnail">
          <img src="${entry.thumbnailUrl}" alt="${entry.title}" onerror="this.src='/default-thumbnail.jpg'">
        </div>
        <div class="video-detail-info">
          <div class="info-row">
            <span class="info-label">動画ID:</span>
            <span class="info-value">${entry.videoId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">投稿者:</span>
            <span class="info-value">${this.escapeHtml(entry.ownerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">再生時間:</span>
            <span class="info-value">${this.formatDuration(entry.lengthSec)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴進捗:</span>
            <span class="info-value">${progressPercent}% (${this.formatDuration(entry.lastPosition)})</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴回数:</span>
            <span class="info-value">${entry.watchCount}回</span>
          </div>
          <div class="info-row">
            <span class="info-label">初回視聴:</span>
            <span class="info-value">${firstWatchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${watchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          ${
            (entry.tags ?? []).length > 0
              ? `
            <div class="info-row">
              <span class="info-label">タグ:</span>
              <span class="info-value">${(entry.tags ?? []).map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(" ")}</span>
            </div>
          `
              : ""
          }
          ${
            entry.memo
              ? `
            <div class="info-row">
              <span class="info-label">メモ:</span>
              <span class="info-value">${this.escapeHtml(entry.memo)}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * モーダルを閉じる
   */
  private closeModal(): void {
    this.elements["video-detail-modal"]?.classList.add("hidden");
    this.selectedEntry = null;
  }

  /**
   * 動画を開く
   */
  private openVideo(): void {
    if (this.selectedEntry) {
      window.open(
        `https://www.nicovideo.jp/watch/${this.selectedEntry.videoId}`,
        "_blank",
      );
    }
  }

  /**
   * メモ編集を開く
   */
  private openMemoEdit(): void {
    if (!this.selectedEntry) return;

    const memoTextarea = this.elements["memo-textarea"] as HTMLTextAreaElement;
    if (memoTextarea) {
      memoTextarea.value = this.selectedEntry.memo || "";
    }

    this.elements["memo-edit-modal"]?.classList.remove("hidden");
  }

  /**
   * メモ編集を閉じる
   */
  private closeMemoEdit(): void {
    this.elements["memo-edit-modal"]?.classList.add("hidden");
  }

  /**
   * メモを保存する
   */
  private async saveMemo(): Promise<void> {
    if (!this.selectedEntry) return;

    const memoTextarea = this.elements["memo-textarea"] as HTMLTextAreaElement;
    const memo = memoTextarea?.value || "";

    try {
      this.selectedEntry.memo = memo;
      await watchHistoryDB.saveEntry(this.selectedEntry);

      // this.entries配列内の対応するエントリも更新
      const entryIndex = this.entries.findIndex(
        (entry) => entry.videoId === this.selectedEntry!.videoId,
      );
      if (entryIndex !== -1) {
        this.entries[entryIndex] = { ...this.selectedEntry };
      }

      // フィルタリングとUIを更新
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();

      this.closeMemoEdit();
      this.showVideoDetail(this.selectedEntry);
      this.showToast("メモを保存しました", "success");
    } catch (error) {
      logger.error("メモ保存エラー:", error);
      this.showToast("メモの保存に失敗しました", "error");
    }
  }

  // ===== ユーティリティメソッド =====

  /**
   * 読み込み状態を表示する
   */
  private showLoading(show: boolean): void {
    const loading = this.elements["loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * 空の状態を表示する
   */
  private showEmptyState(show: boolean): void {
    const emptyState = this.elements["empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * トースト通知を表示する
   */
  private showToast(
    message: string,
    type: "success" | "error" | "info" = "info",
  ): void {
    const toastContainer = this.elements["toast-container"];
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${this.escapeHtml(message)}</span>
        <button class="toast-close">
          ${createMaterialIcon("close", { color: "dark", size: "small" })}
        </button>
      </div>
    `;

    toastContainer.appendChild(toast);

    // 閉じるボタンのイベント
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => {
      toast.remove();
    });

    // 自動で閉じる
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  /**
   * 日別グラフを描画する
   */
  private drawDailyChart(
    canvas: HTMLCanvasElement,
    dailyStats: DailyStats[],
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 背景をクリア
    ctx.clearRect(0, 0, width, height);

    if (dailyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }

    // 最大値を計算
    const maxCount = Math.max(...dailyStats.map((d) => d.watchCount));
    if (maxCount === 0) return;

    // バーを描画
    const barWidth = chartWidth / dailyStats.length;
    dailyStats.forEach((stat, index) => {
      const barHeight = (stat.watchCount / maxCount) * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;

      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);

      // 日付ラベル（45度回転表示）
      const labelX = x + barWidth * 0.4;
      const labelY = height - padding / 2;
      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(stat.date.split("-")[2], 0, 0);
      ctx.restore();
    });
  }

  /**
   * 時間帯別グラフを描画する
   */
  private drawHourlyChart(
    canvas: HTMLCanvasElement,
    hourlyStats: HourlyStats[],
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 背景をクリア
    ctx.clearRect(0, 0, width, height);

    if (hourlyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }

    // 最大値を計算
    const maxCount = Math.max(...hourlyStats.map((h) => h.watchCount));
    if (maxCount === 0) return;

    // バーを描画
    const barWidth = chartWidth / 24;
    hourlyStats.forEach((stat, index) => {
      const barHeight = (stat.watchCount / maxCount) * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;

      ctx.fillStyle = "#2196F3";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);

      // 時間ラベル
      if (index % 2 === 0) {
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          stat.hour.toString(),
          x + barWidth * 0.4,
          height - padding / 2,
        );
      }
    });
  }

  /**
   * 期間をフォーマットする
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }

  /**
   * 数値をフォーマットする
   */
  private formatNumber(num: number): string {
    if (num >= 10000) {
      return `${Math.floor(num / 1000)}k`;
    }
    return num.toLocaleString();
  }

  /**
   * 日付文字列 (YYYY-MM-DD) を表示用に整形する
   */
  private formatDateLabel(dateStr: string): string {
    const parts = dateStr.split("-").map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return dateStr;
    }
    const [year, month, day] = parts;
    const monthStr = month.toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    return `${year}/${monthStr}/${dayStr}`;
  }

  /**
   * Dateオブジェクトを比較用キー（YYYY-MM-DD）に変換する
   */
  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * HTMLをエスケープする
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== シリーズ関連メソッド =====

  /**
   * シリーズタブを初期化する
   */
  private async initializeSeriesTab(): Promise<void> {
    if (this.seriesStats.length === 0) {
      await this.loadSeriesData();
    }
    await this.updateSeriesUI();
  }

  /**
   * シリーズアラートタブを初期化する
   */
  private async initializeSeriesAlertTab(): Promise<void> {
    if (this.seriesAlerts.length === 0) {
      await this.loadSeriesAlertData();
    }
    this.updateSeriesAlertUI();
    this.startAlertCheck();
    this.startAlertUIUpdater();

    // 通知権限をチェックして必要に応じて案内を表示
    this.checkNotificationPermissionOnTab();
  }

  /**
   * シリーズデータを読み込む
   */
  private async loadSeriesData(): Promise<void> {
    try {
      this.showSeriesLoading(true);
      const seriesResult = await watchHistoryDB.getSeriesStats(
        this.seriesFilter,
      );

      if (seriesResult.success && seriesResult.data) {
        this.seriesStats = seriesResult.data;
        this.filterSeriesStats();
      } else {
        this.seriesStats = [];
      }
    } catch (error) {
      logger.error("シリーズデータ読み込みエラー:", error);
      this.showToast("シリーズデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesLoading(false);
    }
  }

  /**
   * シリーズアラートデータを読み込む
   */
  private async loadSeriesAlertData(): Promise<void> {
    try {
      this.showSeriesAlertLoading(true);
      const alertResult = await watchHistoryDB.getAllSeriesAlerts();

      if (alertResult.success && alertResult.data) {
        this.seriesAlerts = alertResult.data;
      } else {
        this.seriesAlerts = [];
      }
    } catch (error) {
      logger.error("シリーズアラートデータ読み込みエラー:", error);
      this.showToast("シリーズアラートデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesAlertLoading(false);
    }
  }

  /**
   * シリーズ統計をフィルタリングする
   */
  private filterSeriesStats(): void {
    this.filteredSeriesStats = this.seriesStats.filter((stats) => {
      // 検索テキストフィルタ
      if (this.seriesFilter.searchText) {
        const searchText = this.seriesFilter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      // 進捗フィルタ
      if (
        this.seriesFilter.progressFilter &&
        this.seriesFilter.progressFilter !== "all"
      ) {
        switch (this.seriesFilter.progressFilter) {
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

      return true;
    });
  }

  /**
   * シリーズUIを更新する
   */
  private async updateSeriesUI(): Promise<void> {
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズアラートUIを更新する
   */
  private updateSeriesAlertUI(): void {
    this.updateSeriesAlertList();
    this.updateSeriesAlertCount();
  }

  /**
   * シリーズ一覧を更新する
   */
  private async updateSeriesList(): Promise<void> {
    const seriesList = this.elements["series-list"];
    if (!seriesList) return;

    if (this.filteredSeriesStats.length === 0) {
      seriesList.innerHTML = "";
      this.showSeriesEmptyState(true);
      return;
    }

    this.showSeriesEmptyState(false);

    // 非同期で各アイテムを生成
    const items = await Promise.all(
      this.filteredSeriesStats.map((stats) => this.createSeriesItem(stats)),
    );
    seriesList.innerHTML = items.join("");

    // イベントリスナーを設定
    seriesList.querySelectorAll(".series-item").forEach((item, index) => {
      // シリーズアイテムのクリックイベント（ナビゲーションボタンは除外）
      item.addEventListener(
        "click",
        this.guardEvent((e) => {
          if (
            !(e.target as HTMLElement).closest(
              ".series-nav-btn, .series-last-play-btn",
            )
          ) {
            void this.showSeriesDetail(this.filteredSeriesStats[index]);
          }
        }),
      );
    });

    // ナビゲーションボタンのイベントリスナーを設定
    seriesList.querySelectorAll(".series-nav-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          const videoId = (e.currentTarget as HTMLElement).getAttribute(
            "data-video-id",
          );
          if (videoId) {
            void this.openVideoFromSeries(videoId);
          }
        }),
      );
    });

    seriesList.querySelectorAll(".series-last-play-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          const videoId = (e.currentTarget as HTMLElement).getAttribute(
            "data-video-id",
          );
          if (videoId) {
            void this.openVideoFromSeries(videoId);
          }
        }),
      );
    });
  }

  /**
   * シリーズアラート一覧を更新する
   */
  private updateSeriesAlertList(): void {
    const alertList = this.elements["series-alert-list"];
    if (!alertList) return;

    if (this.seriesAlerts.length === 0) {
      alertList.innerHTML = "";
      this.showSeriesAlertEmptyState(true);
      return;
    }

    this.showSeriesAlertEmptyState(false);

    const items = this.seriesAlerts.map((alert) =>
      this.createSeriesAlertItem(alert),
    );
    alertList.innerHTML = items.join("");

    // イベントリスナーを設定
    alertList.querySelectorAll(".series-alert-item").forEach((item, index) => {
      const toggleBtn = item.querySelector(".alert-toggle");
      toggleBtn?.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          void this.toggleSeriesAlert(this.seriesAlerts[index]);
        }),
      );

      const deleteBtn = item.querySelector(".alert-delete");
      deleteBtn?.addEventListener(
        "click",
        this.guardEvent((e) => {
          e.stopPropagation();
          void this.deleteSeriesAlert(this.seriesAlerts[index]);
        }),
      );
    });
  }

  /**
   * シリーズアイテムのHTMLを生成する
   */
  private async createSeriesItem(stats: SeriesStats): Promise<string> {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);

    // シリーズ情報を取得
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);

    return `
      <div class="series-item" data-series-id="${stats.seriesId}">
        <div class="series-content">
          <div class="series-header">
            <h3 class="series-title">${this.escapeHtml(stats.seriesTitle)}</h3>
            <div class="series-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${stats.watchedCount}/${stats.totalCount || "?"} (${progressPercent}%)</span>
            </div>
          </div>
          <div class="series-meta">
            <div class="series-stat">
              ${createMaterialIcon("video_library", { color: "dark", size: "small" })}
              <span>${stats.watchedCount}本視聴</span>
            </div>
            <div class="series-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>最終視聴: ${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
            </div>
          </div>
          <div class="series-last-video">
            <span class="last-video-label">最後に視聴:</span>
            <button class="series-last-play-btn" data-video-id="${this.escapeHtml(stats.lastVideoId)}" title="最後に視聴した動画を再生: ${this.escapeHtml(stats.lastVideoTitle)}" aria-label="最後に視聴した動画を再生">
              ${createMaterialIcon("play_arrow", { color: "white", size: "small" })}
            </button>
            <span class="last-video-title">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
          ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
        </div>
      </div>
    `;
  }

  /**
   * シリーズアラートアイテムのHTMLを生成する
   */
  private createSeriesAlertItem(alert: SeriesAlert): string {
    const lastCheckedDate = new Date(alert.lastCheckedAt);
    const intervalMs = alert.checkInterval;

    // 間隔を適切な単位で表示
    let intervalText = "";
    if (intervalMs < 60 * 1000) {
      intervalText = `${Math.round(intervalMs / 1000)}秒`;
    } else if (intervalMs < 60 * 60 * 1000) {
      intervalText = `${Math.round(intervalMs / (60 * 1000))}分`;
    } else if (intervalMs < 24 * 60 * 60 * 1000) {
      intervalText = `${Math.round(intervalMs / (60 * 60 * 1000))}時間`;
    } else {
      intervalText = `${Math.round(intervalMs / (24 * 60 * 60 * 1000))}日`;
    }

    // 次回チェックまでの残り時間
    const timeUntilCheck = alert.nextCheckAt - Date.now();
    const isOverdue = timeUntilCheck <= 0;

    let timeUntilText = "";
    if (isOverdue) {
      timeUntilText = "期限切れ";
    } else if (timeUntilCheck < 60 * 1000) {
      timeUntilText = `${Math.round(timeUntilCheck / 1000)}秒後`;
    } else if (timeUntilCheck < 60 * 60 * 1000) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 1000))}分後`;
    } else if (timeUntilCheck < 24 * 60 * 60 * 1000) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 60 * 1000))}時間後`;
    } else {
      timeUntilText = `${Math.round(timeUntilCheck / (24 * 60 * 60 * 1000))}日後`;
    }

    return `
      <div class="series-alert-item" data-alert-id="${alert.id}">
        <div class="alert-content">
          <div class="alert-header">
            <h3 class="alert-title">${this.escapeHtml(alert.seriesTitle)}</h3>
            <div class="alert-status ${alert.enabled ? "enabled" : "disabled"}">
              ${alert.enabled ? "有効" : "無効"}
            </div>
          </div>
          <div class="alert-meta">
            <div class="alert-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>${intervalText}間隔</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("update", { color: "dark", size: "small" })}
              <span class="${isOverdue ? "overdue" : ""}">次回チェック: ${timeUntilText}</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("history", { color: "dark", size: "small" })}
              <span>最終チェック: ${lastCheckedDate.toLocaleString("ja-JP")}</span>
            </div>
          </div>
          <div class="alert-last-video">
            <span class="last-video-label">最後に確認:</span>
            <span class="last-video-title">${this.escapeHtml(alert.lastVideoTitle)}</span>
          </div>
          <div class="alert-actions">
            <button class="alert-toggle btn btn-${alert.enabled ? "secondary" : "primary"} btn-sm">
              ${alert.enabled ? "無効にする" : "有効にする"}
            </button>
            <button class="alert-delete btn btn-danger btn-sm">
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== イベントハンドラ（シリーズ関連） =====

  /**
   * シリーズ検索を処理する
   */
  private async handleSeriesSearch(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.seriesFilter.searchText = input.value.trim() || undefined;
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズ検索をクリアする
   */
  private async clearSeriesSearch(): Promise<void> {
    const searchInput = this.elements[
      "series-search-input"
    ] as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      this.seriesFilter.searchText = undefined;
      this.filterSeriesStats();
      await this.updateSeriesList();
      this.updateSeriesCount();
    }
  }

  /**
   * シリーズフィルタを処理する
   */
  private async handleSeriesFilter(): Promise<void> {
    const progressFilter = this.elements[
      "series-progress-filter"
    ] as HTMLSelectElement;
    this.seriesFilter.progressFilter =
      (progressFilter?.value as
        | "all"
        | "watching"
        | "completed"
        | "not_started") || "all";
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズデータを更新する
   */
  private async refreshSeriesData(): Promise<void> {
    await this.loadSeriesData();
    await this.updateSeriesUI();
    this.showToast("シリーズデータを更新しました", "success");
  }

  /**
   * シリーズアラートデータを更新する
   */
  private async refreshSeriesAlertData(): Promise<void> {
    await this.loadSeriesAlertData();
    this.updateSeriesAlertUI();
    this.showToast("シリーズアラートデータを更新しました", "success");
  }

  /**
   * シリーズアラートモーダルを開く
   */
  private openSeriesAlertModal(): void {
    // 通知権限をチェック
    if ("Notification" in window && Notification.permission === "denied") {
      this.openNotificationPermissionModal();
      return;
    }

    // シリーズ選択肢を更新
    this.updateSeriesSelectOptions();
    this.elements["series-alert-modal"]?.classList.remove("hidden");
  }

  /**
   * シリーズアラートモーダルを閉じる
   */
  private closeSeriesAlertModal(): void {
    this.elements["series-alert-modal"]?.classList.add("hidden");
  }

  /**
   * シリーズ詳細モーダルを閉じる
   */
  private closeSeriesDetailModal(): void {
    this.elements["series-detail-modal"]?.classList.add("hidden");
    this.selectedSeries = null;
  }

  /**
   * シリーズアラートを保存する
   */
  private async saveSeriesAlert(): Promise<void> {
    const seriesSelect = this.elements[
      "series-alert-series-select"
    ] as HTMLSelectElement;
    const intervalSelect = this.elements[
      "series-alert-interval-select"
    ] as HTMLSelectElement;
    const enabledCheckbox = this.elements[
      "series-alert-enabled"
    ] as HTMLInputElement;

    if (!seriesSelect?.value) {
      this.showToast("シリーズを選択してください", "error");
      return;
    }

    const seriesId = parseInt(seriesSelect.value);
    const interval = parseInt(intervalSelect.value);
    const enabled = enabledCheckbox.checked;

    // 既存のアラートをチェック
    const existingAlert = this.seriesAlerts.find(
      (alert) => alert.seriesId === seriesId,
    );
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }

    // 対応するシリーズを検索
    const seriesStats = this.seriesStats.find(
      (stats) => stats.seriesId === seriesId,
    );
    if (!seriesStats) {
      this.showToast("シリーズが見つかりません", "error");
      return;
    }

    const now = Date.now();
    const newAlert: SeriesAlert = {
      id: `alert_${seriesId}_${now}`,
      seriesId,
      seriesTitle: seriesStats.seriesTitle,
      lastVideoId: seriesStats.lastVideoId,
      lastVideoTitle: seriesStats.lastVideoTitle,
      lastCheckedAt: now,
      nextCheckAt: now + interval,
      checkInterval: interval,
      enabled,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await watchHistoryDB.saveSeriesAlert(newAlert);
      if (result.success) {
        this.seriesAlerts.push(newAlert);
        this.updateSeriesAlertUI();
        this.closeSeriesAlertModal();
        this.showToast("シリーズアラートを追加しました", "success");
      } else {
        this.showToast("シリーズアラートの保存に失敗しました", "error");
      }
    } catch (error) {
      logger.error("シリーズアラート保存エラー:", error);
      this.showToast("シリーズアラートの保存に失敗しました", "error");
    }
  }

  /**
   * シリーズ詳細からアラートを追加する
   */
  private addAlertFromSeriesDetail(): void {
    if (!this.selectedSeries) return;

    // 既存のアラートをチェック
    const existingAlert = this.seriesAlerts.find(
      (alert) => alert.seriesId === this.selectedSeries!.seriesId,
    );
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }

    // シリーズ詳細モーダルを閉じてアラートモーダルを開く
    this.closeSeriesDetailModal();
    this.openSeriesAlertModal();

    // 選択されたシリーズを設定
    const seriesSelect = this.elements[
      "series-alert-series-select"
    ] as HTMLSelectElement;
    if (seriesSelect) {
      seriesSelect.value = this.selectedSeries.seriesId.toString();
    }
  }

  /**
   * シリーズ詳細を表示する
   */
  private async showSeriesDetail(stats: SeriesStats): Promise<void> {
    this.selectedSeries = stats;

    const modalTitle = this.elements["series-detail-title"];
    if (modalTitle) {
      modalTitle.textContent = stats.seriesTitle;
    }

    // シリーズ情報を取得
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);

    // シリーズ詳細情報を表示
    const detailInfo = this.elements["series-detail-info"];
    if (detailInfo) {
      detailInfo.innerHTML = this.createSeriesDetailHTML(stats, seriesInfo);
    }

    // シリーズ動画一覧を読み込み
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(stats.seriesId);
      const detailVideos = this.elements["series-detail-videos"];

      if (detailVideos && videosResult.success && videosResult.data) {
        detailVideos.innerHTML = this.createSeriesVideosHTML(videosResult.data);
      }
    } catch (error) {
      logger.error("シリーズ動画取得エラー:", error);
    }

    this.elements["series-detail-modal"]?.classList.remove("hidden");

    // ナビゲーションボタンのイベントリスナーを設定
    this.elements["series-detail-modal"]
      ?.querySelectorAll(".series-nav-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const videoId = (e.currentTarget as HTMLElement).getAttribute(
            "data-video-id",
          );
          if (videoId) {
            this.openVideoFromSeries(videoId);
          }
        });
      });
  }

  /**
   * シリーズ詳細HTMLを作成する
   */
  private createSeriesDetailHTML(
    stats: SeriesStats,
    seriesInfo: SeriesInfo | null,
  ): string {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);

    return `
      <div class="series-detail-grid">
        <div class="series-detail-stats">
          <div class="info-row">
            <span class="info-label">視聴動画数:</span>
            <span class="info-value">${stats.watchedCount}本</span>
          </div>
          <div class="info-row">
            <span class="info-label">進捗:</span>
            <span class="info-value">${progressPercent}%</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最後に視聴した動画:</span>
            <span class="info-value">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
        </div>
        ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
      </div>
    `;
  }

  /**
   * シリーズ動画一覧HTMLを作成する
   */
  private createSeriesVideosHTML(videos: WatchHistoryEntry[]): string {
    if (videos.length === 0) {
      return '<div class="series-videos-empty">このシリーズの動画がありません</div>';
    }

    const videoItems = videos
      .map((video) => {
        const watchedDate = new Date(video.watchedAt);
        let progressPercent = 0;
        if (video.lengthSec > 0) {
          progressPercent = Math.round(
            (video.lastPosition / video.lengthSec) * 100,
          );
        }

        return `
        <div class="series-video-item" data-video-id="${video.videoId}">
          <div class="video-thumbnail">
            <img src="${video.thumbnailUrl}" alt="${this.escapeHtml(video.title)}" onerror="this.src='/default-thumbnail.jpg'">
            <div class="video-duration">${this.formatDuration(video.lengthSec)}</div>
          </div>
          <div class="video-content">
            <h4 class="video-title">${this.escapeHtml(video.title)}</h4>
            <div class="video-meta">
              <span class="video-watched-date">${watchedDate.toLocaleDateString("ja-JP")}</span>
              <span class="video-progress">${progressPercent}%</span>
            </div>
            <div class="video-progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    return `
      <div class="series-videos-header">
        <h4>シリーズ動画一覧 (${videos.length}本)</h4>
      </div>
      <div class="series-videos-list">
        ${videoItems}
      </div>
    `;
  }

  /**
   * シリーズアラートを切り替える
   */
  private async toggleSeriesAlert(alert: SeriesAlert): Promise<void> {
    const updatedAlert = {
      ...alert,
      enabled: !alert.enabled,
      updatedAt: Date.now(),
    };

    try {
      const result = await watchHistoryDB.saveSeriesAlert(updatedAlert);
      if (result.success) {
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }
        this.updateSeriesAlertUI();
        this.showToast(
          `アラートを${updatedAlert.enabled ? "有効" : "無効"}にしました`,
          "success",
        );
      } else {
        this.showToast("アラートの更新に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート更新エラー:", error);
      this.showToast("アラートの更新に失敗しました", "error");
    }
  }

  /**
   * シリーズアラートを削除する
   */
  private async deleteSeriesAlert(alert: SeriesAlert): Promise<void> {
    if (!confirm(`「${alert.seriesTitle}」のアラートを削除しますか？`)) {
      return;
    }

    try {
      const result = await watchHistoryDB.deleteSeriesAlert(alert.id);
      if (result.success) {
        this.seriesAlerts = this.seriesAlerts.filter((a) => a.id !== alert.id);
        this.updateSeriesAlertUI();
        this.showToast("アラートを削除しました", "success");
      } else {
        this.showToast("アラートの削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート削除エラー:", error);
      this.showToast("アラートの削除に失敗しました", "error");
    }
  }

  // ===== 視聴履歴削除機能 =====

  /**
   * 個別の視聴履歴エントリを削除する
   */
  private async deleteHistoryEntry(entry: WatchHistoryEntry): Promise<void> {
    if (!confirm(`「${entry.title}」の視聴履歴を削除しますか？`)) {
      return;
    }

    try {
      const result = await watchHistoryDB.deleteEntry(entry.videoId);
      if (result.success) {
        // データを更新
        this.entries = this.entries.filter((e) => e.videoId !== entry.videoId);
        this.filterEntries();
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast("履歴を削除しました", "success");
      } else {
        this.showToast("履歴の削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("履歴削除エラー:", error);
      this.showToast("履歴の削除に失敗しました", "error");
    }
  }

  /**
   * 全ての視聴履歴を削除する（一括削除）
   */
  private async deleteAllHistoryEntries(): Promise<void> {
    const totalCount = this.entries.length;
    if (totalCount === 0) {
      this.showToast("削除する履歴がありません", "info");
      return;
    }

    if (
      !confirm(
        `全ての視聴履歴（${totalCount}件）を削除しますか？\n\nこの操作は取り消せません。`,
      )
    ) {
      return;
    }

    try {
      const result = await watchHistoryDB.deleteAllEntries();
      if (result.success && typeof result.data === "number") {
        // データを更新
        this.entries = [];
        this.filteredEntries = [];
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("一括削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("一括削除エラー:", error);
      this.showToast("一括削除に失敗しました", "error");
    }
  }

  /**
   * 条件に一致する視聴履歴を削除する
   * @param maxWatchCount 視聴回数上限（nullの場合は条件無効）
   * @param maxProgressRate 進捗率上限（nullの場合は条件無効）
   */
  private async deleteHistoryEntriesByCondition(
    maxWatchCount: number | null,
    maxProgressRate: number | null,
  ): Promise<void> {
    if (maxWatchCount === null && maxProgressRate === null) {
      this.showToast("少なくとも1つの条件を有効にしてください", "error");
      return;
    }

    if (
      (maxWatchCount !== null && maxWatchCount < 0) ||
      (maxProgressRate !== null &&
        (maxProgressRate < 0 || maxProgressRate > 100))
    ) {
      this.showToast("無効な条件値です", "error");
      return;
    }

    // 条件に一致する件数を事前計算
    const matchingEntries = this.entries.filter((entry) => {
      const progressRate =
        entry.lengthSec > 0
          ? Math.round((entry.lastPosition / entry.lengthSec) * 100)
          : 0;
      const watchCountMatch =
        maxWatchCount === null || entry.watchCount <= maxWatchCount;
      const progressRateMatch =
        maxProgressRate === null || progressRate <= maxProgressRate;
      return watchCountMatch && progressRateMatch;
    });

    if (matchingEntries.length === 0) {
      this.showToast("条件に一致する履歴がありません", "info");
      return;
    }

    // 確認メッセージを条件に応じて生成
    const conditionParts: string[] = [];
    if (maxWatchCount !== null) {
      conditionParts.push(`${maxWatchCount}回以下視聴`);
    }
    if (maxProgressRate !== null) {
      conditionParts.push(`${maxProgressRate}%以下進捗`);
    }
    const conditionText =
      conditionParts.length === 2
        ? conditionParts.join("かつ")
        : conditionParts[0] ?? "";

    if (
      !confirm(
        `${conditionText}の履歴（${matchingEntries.length}件）を削除しますか？\n\nこの操作は取り消せません。`,
      )
    ) {
      return;
    }

    try {
      const result = await watchHistoryDB.deleteEntriesByCondition(
        maxWatchCount,
        maxProgressRate,
      );
      if (result.success && typeof result.data === "number") {
        // データを更新
        await this.refreshData();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("条件付き削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("条件付き削除エラー:", error);
      this.showToast("条件付き削除に失敗しました", "error");
    }
  }

  /**
   * 条件付き削除のハンドラー
   */
  private handleConditionalDelete(): void {
    const useWatchCount = (
      this.elements["delete-use-watch-count"] as HTMLInputElement | undefined
    )?.checked;
    const useProgressRate = (
      this.elements["delete-use-progress-rate"] as HTMLInputElement | undefined
    )?.checked;
    const watchCountInput = this.elements[
      "delete-watch-count"
    ] as HTMLInputElement;
    const progressRateInput = this.elements[
      "delete-progress-rate"
    ] as HTMLInputElement;

    if (!watchCountInput || !progressRateInput) {
      this.showToast("削除条件の入力フィールドが見つかりません", "error");
      return;
    }

    const maxWatchCount = useWatchCount
      ? (parseInt(watchCountInput.value) || 0)
      : null;
    const maxProgressRate = useProgressRate
      ? (parseInt(progressRateInput.value) || 0)
      : null;

    void this.deleteHistoryEntriesByCondition(maxWatchCount, maxProgressRate);
  }

  /**
   * 条件付き削除UIの状態を更新する
   * チェックボックスのON/OFFに応じて入力欄のdisabled状態とヒントテキストを切り替える
   */
  private updateDeleteConditionUI(): void {
    const useWatchCount = (
      this.elements["delete-use-watch-count"] as HTMLInputElement | undefined
    )?.checked ?? true;
    const useProgressRate = (
      this.elements["delete-use-progress-rate"] as HTMLInputElement | undefined
    )?.checked ?? true;

    // 入力欄の親要素にdisabledクラスを切り替え
    const watchCountItem = this.elements["delete-use-watch-count"]
      ?.closest(".delete-condition-item");
    const progressRateItem = this.elements["delete-use-progress-rate"]
      ?.closest(".delete-condition-item");

    if (watchCountItem) {
      watchCountItem.classList.toggle("disabled", !useWatchCount);
    }
    if (progressRateItem) {
      progressRateItem.classList.toggle("disabled", !useProgressRate);
    }

    // ヒントテキストを更新
    const hint = this.elements["delete-condition-hint"];
    if (hint) {
      if (useWatchCount && useProgressRate) {
        hint.textContent = "両方有効時はAND条件で削除します";
      } else if (useWatchCount) {
        hint.textContent = "視聴回数の条件のみで削除します";
      } else if (useProgressRate) {
        hint.textContent = "進捗率の条件のみで削除します";
      } else {
        hint.textContent = "少なくとも1つの条件を有効にしてください";
      }
    }

    // ボタンの有効/無効切り替え
    const deleteBtn = this.elements[
      "delete-by-condition-btn"
    ] as HTMLButtonElement | undefined;
    if (deleteBtn) {
      deleteBtn.disabled = !useWatchCount && !useProgressRate;
    }
  }

  /**
   * シリーズ選択肢を更新する
   */
  private updateSeriesSelectOptions(): void {
    const seriesSelect = this.elements[
      "series-alert-series-select"
    ] as HTMLSelectElement;
    if (!seriesSelect) return;

    seriesSelect.innerHTML =
      '<option value="">シリーズを選択してください</option>';

    this.seriesStats.forEach((stats) => {
      const option = document.createElement("option");
      option.value = stats.seriesId.toString();
      option.textContent = stats.seriesTitle;
      seriesSelect.appendChild(option);
    });
  }

  /**
   * アラートチェックを開始する
   */
  private startAlertCheck(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }

    // 1分間隔でアラートをチェック（テスト用）
    this.alertCheckInterval = setInterval(
      () => {
        void this.checkSeriesAlerts();
      },
      1 * 60 * 1000,
    );

    // 初回チェック
    void this.checkSeriesAlerts();
  }

  /**
   * アラートUIの定期更新を開始する
   */
  private startAlertUIUpdater(): void {
    // 10秒間隔でUIを更新（残り時間表示を更新）
    setInterval(() => {
      if (this.elements["series-alert-tab"]?.classList.contains("active")) {
        this.updateSeriesAlertUI();
      }
    }, 10 * 1000);
  }

  /**
   * シリーズアラートをチェックする
   */
  private async checkSeriesAlerts(): Promise<void> {
    try {
      const alertsResult = await watchHistoryDB.getAlertsToCheck();
      if (alertsResult.success && alertsResult.data) {
        const alertsToCheck = alertsResult.data;

        for (const alert of alertsToCheck) {
          await this.checkSingleAlert(alert);
        }
      }
    } catch (error) {
      logger.error("アラートチェックエラー:", error);
    }
  }

  /**
   * 単一のアラートをチェックする
   */
  private async checkSingleAlert(alert: SeriesAlert): Promise<boolean> {
    try {
      // 実際のシリーズチェック機能を実装
      const hasNewVideo = await this.checkForNewSeriesVideo(alert);

      const now = Date.now();
      const updatedAlert = {
        ...alert,
        lastCheckedAt: now,
        nextCheckAt: now + alert.checkInterval,
        updatedAt: now,
      };

      await watchHistoryDB.saveSeriesAlert(updatedAlert);

      // アラートリストも更新
      const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
      if (index !== -1) {
        this.seriesAlerts[index] = updatedAlert;
      }

      // 新しい動画が見つかった場合は通知
      if (hasNewVideo) {
        this.showSeriesNotification(alert);
      }

      return hasNewVideo;
    } catch (error) {
      logger.error("個別アラートチェックエラー:", error);
      return false;
    }
  }

  /**
   * シリーズの新しい動画をチェックする
   */
  private async checkForNewSeriesVideo(alert: SeriesAlert): Promise<boolean> {
    try {
      // 1. 該当シリーズの最新動画を取得
      const seriesVideosResult = await watchHistoryDB.getSeriesVideos(
        alert.seriesId,
      );
      if (
        !seriesVideosResult.success ||
        !seriesVideosResult.data ||
        seriesVideosResult.data.length === 0
      ) {
        return false;
      }

      // 2. 最新の動画からシリーズ情報を取得
      const latestVideo = seriesVideosResult.data[0];
      if (!latestVideo.series || !latestVideo.series.video.next) {
        return false;
      }

      const nextVideo = latestVideo.series.video.next;

      // 3. 前回チェック時の動画IDと比較
      if (nextVideo.id !== alert.lastVideoId) {
        // 新しい動画が見つかった！
        // アラート情報を更新
        const updatedAlert = {
          ...alert,
          lastVideoId: nextVideo.id,
          lastVideoTitle: nextVideo.title,
          updatedAt: Date.now(),
        };
        await watchHistoryDB.saveSeriesAlert(updatedAlert);

        // アラートリストも更新
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.error("シリーズ動画チェックエラー:", error);
      return false;
    }
  }

  /**
   * シリーズ通知を表示する（ブラウザ通知のみ）
   */
  private showSeriesNotification(alert: SeriesAlert): void {
    // ブラウザ通知のみ
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`🎬 ${alert.seriesTitle}`, {
          body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
          icon: getIconPath("notifications"),
          tag: `series-${alert.seriesId}`,
          requireInteraction: true,
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission()
          .then((permission) => {
            if (permission === "granted") {
              new Notification(`🎬 ${alert.seriesTitle}`, {
                body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
                icon: getIconPath("notifications"),
                tag: `series-${alert.seriesId}`,
                requireInteraction: true,
              });
            }
          })
          .catch((error) => {
            logger?.error("Notification permission request failed:", error);
          });
      }
    } else {
      // ブラウザ通知が利用できない場合のフォールバック
      logger.warn?.("ブラウザ通知が利用できません");
    }
  }

  /**
   * 手動でアラートをチェックする
   */
  private async manualCheckAlerts(): Promise<void> {
    try {
      if (this.seriesAlerts.length === 0) {
        this.showToast("アラートがありません", "info");
        return;
      }

      const enabledAlerts = this.seriesAlerts.filter((alert) => alert.enabled);
      if (enabledAlerts.length === 0) {
        this.showToast("有効なアラートがありません", "info");
        return;
      }

      // ブラウザ通知の権限を確認
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      this.showToast("アラートチェックを開始します...", "info");

      let checkedCount = 0;
      let notificationCount = 0;

      for (const alert of enabledAlerts) {
        const hasNewVideo = await this.checkSingleAlert(alert);
        checkedCount++;

        // 実際のチェック結果に基づいて通知カウント
        if (hasNewVideo) {
          notificationCount++;
        }
      }

      this.updateSeriesAlertUI();

      const notificationStatus =
        "Notification" in window
          ? Notification.permission === "granted"
            ? "ブラウザ通知有効"
            : "ブラウザ通知無効"
          : "ブラウザ通知未対応";

      this.showToast(
        `${checkedCount}件のアラートをチェックしました。${notificationCount}件の新しい動画が見つかりました。（${notificationStatus}）`,
        "success",
      );
    } catch (error) {
      logger.error("手動アラートチェックエラー:", error);
      this.showToast("アラートチェックに失敗しました", "error");
    }
  }

  /**
   * 通知権限を確認・要求する
   */
  private async checkNotificationPermission(): Promise<void> {
    try {
      if (!("Notification" in window)) {
        this.showToast(
          "このブラウザはデスクトップ通知に対応していません",
          "error",
        );
        return;
      }

      const permission = Notification.permission;

      if (permission === "granted") {
        this.showToast("ブラウザ通知は既に許可されています", "success");
        // テスト通知を送信
        new Notification("🎬 シリーズアラート", {
          body: "通知権限が正常に動作しています！",
          icon: getIconPath("notifications"),
          tag: "permission-test",
        });
      } else if (permission === "denied") {
        // 拒否されている場合は詳細な案内モーダルを表示
        this.openNotificationPermissionModal();
      } else {
        // 'default' の場合
        this.showToast("ブラウザ通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();

        if (result === "granted") {
          this.showToast("ブラウザ通知が許可されました！", "success");
          // テスト通知を送信
          new Notification("🎬 シリーズアラート", {
            body: "通知権限が正常に設定されました！",
            icon: getIconPath("notifications"),
            tag: "permission-granted",
          });
        } else {
          // 拒否された場合も案内モーダルを表示
          this.openNotificationPermissionModal();
        }
      }
    } catch (error) {
      logger.error("通知権限確認エラー:", error);
      this.showToast("通知権限の確認に失敗しました", "error");
    }
  }

  /**
   * 通知権限案内モーダルを開く
   */
  private openNotificationPermissionModal(): void {
    this.elements["notification-permission-modal"]?.classList.remove("hidden");

    // ブラウザ別の説明を強調表示
    this.highlightCurrentBrowserInstructions();
  }

  /**
   * 通知権限案内モーダルを閉じる
   */
  private closeNotificationPermissionModal(): void {
    this.elements["notification-permission-modal"]?.classList.add("hidden");
  }

  /**
   * 設定後の通知テストを実行する
   */
  private async testNotificationAfterSetup(): Promise<void> {
    try {
      if (!("Notification" in window)) {
        this.showToast(
          "このブラウザはデスクトップ通知に対応していません",
          "error",
        );
        return;
      }

      const permission = Notification.permission;

      if (permission === "granted") {
        // テスト通知を送信
        new Notification("🎬 シリーズアラート", {
          body: "通知設定が正常に動作しています！設定完了です。",
          icon: getIconPath("notifications"),
          tag: "setup-test",
        });
        this.showToast("通知テストが送信されました！", "success");

        // 成功したらモーダルを閉じる
        setTimeout(() => {
          this.closeNotificationPermissionModal();
        }, 1000);
      } else if (permission === "denied") {
        this.showToast(
          "まだ通知が拒否されています。上記の手順に従って設定を変更してください",
          "error",
        );
      } else {
        // 'default' の場合は再度許可を求める
        this.showToast("通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();

        if (result === "granted") {
          new Notification("🎬 シリーズアラート", {
            body: "通知設定が正常に完了しました！",
            icon: getIconPath("notifications"),
            tag: "setup-complete",
          });
          this.showToast("通知設定が完了しました！", "success");

          // 成功したらモーダルを閉じる
          setTimeout(() => {
            this.closeNotificationPermissionModal();
          }, 1000);
        } else {
          this.showToast(
            "通知が拒否されました。上記の手順に従って手動で設定してください",
            "error",
          );
        }
      }
    } catch (error) {
      logger.error("通知テストエラー:", error);
      this.showToast("通知テストに失敗しました", "error");
    }
  }

  /**
   * タブ移動時の通知権限チェックを行う
   */
  private checkNotificationPermissionOnTab(): void {
    // シリーズアラートタブに移動したときに通知権限をチェック
    if ("Notification" in window && Notification.permission === "denied") {
      // 少し遅延してからモーダルを表示（タブ切り替えアニメーション後）
      setTimeout(() => {
        this.showToast(
          "ブラウザ通知が拒否されています。シリーズアラートを利用するには通知の許可が必要です",
          "error",
        );
      }, 500);
    }
  }

  /**
   * 現在のブラウザに適した説明を強調表示する
   */
  private highlightCurrentBrowserInstructions(): void {
    // すべてのブラウザタブをリセット
    document.querySelectorAll(".browser-tab").forEach((tab) => {
      tab.classList.remove("current-browser");
    });

    // ブラウザを検出
    const userAgent = navigator.userAgent;
    let currentBrowser = "";

    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      currentBrowser = "chrome";
    } else if (userAgent.includes("Edg")) {
      currentBrowser = "chrome"; // EdgeもChrome系なので同じ手順
    } else if (userAgent.includes("Firefox")) {
      currentBrowser = "firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      currentBrowser = "safari";
    } else {
      currentBrowser = "chrome"; // デフォルトはChrome系
    }

    // 該当するブラウザの説明を強調表示
    const currentTab = document.getElementById(`${currentBrowser}-tab`);
    if (currentTab) {
      currentTab.classList.add("current-browser");
    }
  }

  // ===== ユーティリティメソッド（シリーズ関連） =====

  /**
   * シリーズ読み込み状態を表示する
   */
  private showSeriesLoading(show: boolean): void {
    const loading = this.elements["series-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズアラート読み込み状態を表示する
   */
  private showSeriesAlertLoading(show: boolean): void {
    const loading = this.elements["series-alert-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズ空の状態を表示する
   */
  private showSeriesEmptyState(show: boolean): void {
    const emptyState = this.elements["series-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズアラート空の状態を表示する
   */
  private showSeriesAlertEmptyState(show: boolean): void {
    const emptyState = this.elements["series-alert-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズ数を更新する
   */
  private updateSeriesCount(): void {
    const seriesCount = this.elements["series-count"];
    if (seriesCount) {
      seriesCount.textContent = `${this.filteredSeriesStats.length} 件のシリーズ`;
    }
  }

  /**
   * シリーズアラート数を更新する
   */
  private updateSeriesAlertCount(): void {
    const alertCount = this.elements["series-alert-count"];
    if (alertCount) {
      alertCount.textContent = `${this.seriesAlerts.length} 件のアラート`;
    }
  }

  /**
   * シリーズ情報を取得する
   */
  private async getSeriesInfo(seriesId: number): Promise<SeriesInfo | null> {
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(seriesId);
      if (
        videosResult.success &&
        videosResult.data &&
        videosResult.data.length > 0
      ) {
        // 最初に見つかったシリーズ情報を返す
        for (const video of videosResult.data) {
          if (video.series && video.series.id === seriesId) {
            return video.series;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error("シリーズ情報取得エラー:", error);
      return null;
    }
  }

  /**
   * シリーズナビゲーションHTMLを作成する
   */
  private createSeriesNavigationHTML(seriesInfo: SeriesInfo): string {
    const { video } = seriesInfo;
    const navigationItems = [];

    if (video.first) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.first.id}" title="第1話: ${this.escapeHtml(video.first.title)}">
          ${createMaterialIcon("first_page", { color: "white", size: "small" })}
          <span>第1話</span>
        </button>
      `);
    }

    if (video.prev) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.prev.id}" title="前の話: ${this.escapeHtml(video.prev.title)}">
          ${createMaterialIcon("navigate_before", { color: "white", size: "small" })}
          <span>前の話</span>
        </button>
      `);
    }

    if (video.next) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.next.id}" title="次の話: ${this.escapeHtml(video.next.title)}">
          <span>次の話</span>
          ${createMaterialIcon("navigate_next", { color: "white", size: "small" })}
        </button>
      `);
    }

    if (navigationItems.length === 0) {
      return "";
    }

    return `
      <div class="series-navigation">
        <div class="series-nav-header">
          ${createMaterialIcon("play_arrow", { color: "dark", size: "small" })}
          <span>シリーズナビゲーション</span>
        </div>
        <div class="series-nav-buttons">
          ${navigationItems.join("")}
        </div>
      </div>
    `;
  }

  /**
   * シリーズから動画を開く
   */
  private openVideoFromSeries(videoId: string): void {
    const url = `https://www.nicovideo.jp/watch/${videoId}`;
    window.open(url, "_blank");
    this.showToast("動画を開きました", "success");
  }

  // ===== データベース管理関連メソッド =====

  /**
   * データベース管理モーダルを開く
   */
  private async openDatabaseManagementModal(): Promise<void> {
    // 現在の状態を取得
    await this.refreshPersistenceStatus();
    await this.refreshDatabaseConfig();
    await this.refreshBackupList();

    this.elements["database-management-modal"]?.classList.remove("hidden");
  }

  /**
   * データベース管理モーダルを閉じる
   */
  private closeDatabaseManagementModal(): void {
    this.elements["database-management-modal"]?.classList.add("hidden");
  }

  /**
   * 永続化を要求する
   */
  private async requestPersistence(): Promise<void> {
    try {
      const result = await watchHistoryDB.requestPersistence();
      if (result.success) {
        if (result.data) {
          this.showToast("データベースの永続化に成功しました", "success");
        } else {
          this.showToast("データベースの永続化に失敗しました", "error");
        }
      } else {
        this.showToast(result.error || "永続化要求に失敗しました", "error");
      }

      // 状態を更新
      await this.refreshPersistenceStatus();
    } catch (error) {
      logger.error("永続化要求エラー:", error);
      this.showToast("永続化要求に失敗しました", "error");
    }
  }

  /**
   * 永続化状態を更新する
   */
  private async refreshPersistenceStatus(): Promise<void> {
    try {
      const result = await watchHistoryDB.getPersistenceStatus();
      if (result.success && result.data) {
        this.persistenceStatus = result.data;
        this.updatePersistenceUI();
      } else {
        logger.error("永続化状態取得エラー:", result.error);
      }
    } catch (error) {
      logger.error("永続化状態取得エラー:", error);
    }
  }

  /**
   * マイグレーションを実行する
   */
  private async runMigration(): Promise<void> {
    try {
      const result = await watchHistoryDB.runMigration();
      if (result.success) {
        this.showToast("マイグレーションが完了しました", "success");
      } else {
        this.showToast(
          result.error || "マイグレーションに失敗しました",
          "error",
        );
      }
    } catch (error) {
      logger.error("マイグレーション実行エラー:", error);
      this.showToast("マイグレーションに失敗しました", "error");
    }
  }

  /**
   * マイグレーション状態を確認する
   */
  private checkMigrationStatus(): void {
    this.migrationProgress = watchHistoryDB.getMigrationProgress();
    this.updateMigrationUI();
  }

  /**
   * バックアップを作成する
   */
  private async createBackup(): Promise<void> {
    try {
      // 現在のデータをエクスポート（バックアップとして使用）
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const backup = {
          version: 2,
          timestamp: Date.now(),
          watchHistory: result.data.entries,
          seriesAlerts: result.data.seriesAlerts,
        };

        const backupKey = `watch-history-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));

        this.showToast("バックアップを作成しました", "success");
        await this.refreshBackupList();
      } else {
        this.showToast("バックアップの作成に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ作成エラー:", error);
      this.showToast("バックアップの作成に失敗しました", "error");
    }
  }

  /**
   * バックアップリストを更新します
   */
  private async refreshBackupList(): Promise<void> {
    await Promise.resolve();
    try {
      const backups = watchHistoryDB.getAvailableBackups();
      this.updateBackupListUI(backups);
    } catch (error) {
      logger.error("バックアップリスト取得エラー:", error);
    }
  }

  /**
   * データベース設定を更新する
   */
  private updateDatabaseConfig(): void {
    const autoMigration =
      (this.elements["auto-migration-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const autoPersist =
      (this.elements["auto-persist-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const autoBackup =
      (this.elements["auto-backup-checkbox"] as HTMLInputElement)?.checked ||
      false;
    const backupBeforeMigration =
      (this.elements["backup-before-migration-checkbox"] as HTMLInputElement)
        ?.checked || false;

    const config = {
      autoMigration,
      autoPersist,
      autoBackup,
      backupBeforeMigration,
    };

    watchHistoryDB.updateMigrationConfig(config);
    this.showToast("設定を更新しました", "success");
  }

  /**
   * データベース設定を更新
   */
  private async refreshDatabaseConfig(): Promise<void> {
    await Promise.resolve();
    try {
      this.databaseConfig = watchHistoryDB.getMigrationConfig();
      this.updateDatabaseConfigUI();
    } catch (error) {
      logger.error("データベース設定取得エラー:", error);
    }
  }

  /**
   * マイグレーション進捗を処理する
   */
  private handleMigrationProgress(event: CustomEvent): void {
    const progress = event.detail as MigrationProgress;
    this.migrationProgress = progress;
    this.updateMigrationUI();
  }

  /**
   * 永続化UIを更新する
   */
  private updatePersistenceUI(): void {
    if (!this.persistenceStatus) return;

    const badge = this.elements["persistence-badge"];
    const statusText = this.elements["persistence-status-text"];
    const usageFill = this.elements["storage-usage-fill"];
    const usageText = this.elements["storage-usage-text"];

    if (statusText) {
      statusText.textContent = this.persistenceStatus.isPersistent
        ? "永続化済み"
        : "一時的";
    }

    if (badge) {
      badge.className = `persistence-badge ${this.persistenceStatus.isPersistent ? "persistent" : "temporary"}`;
    }

    if (usageFill) {
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageFill.style.width = `${usagePercent}%`;
    }

    if (usageText) {
      const usageFormatted = this.formatBytes(this.persistenceStatus.usage);
      const quotaFormatted = this.formatBytes(this.persistenceStatus.quota);
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageText.textContent = `${usageFormatted} / ${quotaFormatted} (${usagePercent}%)`;
    }
  }

  /**
   * マイグレーションUIを更新する
   */
  private updateMigrationUI(): void {
    if (!this.migrationProgress) return;

    const container = this.elements["migration-progress-container"];
    const currentTask = this.elements["migration-current-task"];
    const progressFill = this.elements["migration-progress-fill"];
    const progressText = this.elements["migration-progress-text"];

    if (container) {
      container.classList.toggle("hidden", !this.migrationProgress.isRunning);
    }

    if (currentTask) {
      currentTask.textContent =
        this.migrationProgress.currentMigration || "マイグレーション待機中";
    }

    if (progressFill) {
      const progressPercent = Math.round(this.migrationProgress.progress * 100);
      progressFill.style.width = `${progressPercent}%`;
    }

    if (progressText) {
      progressText.textContent = `${this.migrationProgress.completedCount} / ${this.migrationProgress.totalCount} (${Math.round(this.migrationProgress.progress * 100)}%)`;
    }
  }

  /**
   * データベース設定UIを更新する
   */
  private updateDatabaseConfigUI(): void {
    if (!this.databaseConfig) return;

    const autoMigrationCheckbox = this.elements[
      "auto-migration-checkbox"
    ] as HTMLInputElement;
    const autoPersistCheckbox = this.elements[
      "auto-persist-checkbox"
    ] as HTMLInputElement;
    const autoBackupCheckbox = this.elements[
      "auto-backup-checkbox"
    ] as HTMLInputElement;
    const backupBeforeMigrationCheckbox = this.elements[
      "backup-before-migration-checkbox"
    ] as HTMLInputElement;

    if (autoMigrationCheckbox) {
      autoMigrationCheckbox.checked = this.databaseConfig.autoMigration;
    }
    if (autoPersistCheckbox) {
      autoPersistCheckbox.checked = this.databaseConfig.autoPersist;
    }
    if (autoBackupCheckbox) {
      autoBackupCheckbox.checked = this.databaseConfig.autoBackup;
    }
    if (backupBeforeMigrationCheckbox) {
      backupBeforeMigrationCheckbox.checked =
        this.databaseConfig.backupBeforeMigration;
    }
  }

  /**
   * バックアップリストUIを更新する
   */
  private updateBackupListUI(
    backups: Array<{ key: string; timestamp: number; version: number }>,
  ): void {
    const container = this.elements["backup-list-container"];
    if (!container) return;

    if (backups.length === 0) {
      container.innerHTML =
        '<div class="backup-list-empty"><span>バックアップがありません</span></div>';
      return;
    }

    const backupItems = backups
      .map((backup) => {
        const date = new Date(backup.timestamp);
        return `
        <div class="backup-item" data-backup-key="${backup.key}">
          <div class="backup-info">
            <div class="backup-date">${date.toLocaleString("ja-JP")}</div>
            <div class="backup-version">バージョン ${backup.version}</div>
          </div>
          <div class="backup-actions">
            <button class="backup-restore-btn btn btn-sm btn-primary" data-backup-key="${backup.key}">
              復元
            </button>
            <button class="backup-delete-btn btn btn-sm btn-danger" data-backup-key="${backup.key}">
              削除
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = backupItems;

    // イベントリスナーを設定
    container.querySelectorAll(".backup-restore-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent(async (e) => {
          const backupKey = (e.target as HTMLElement).getAttribute(
            "data-backup-key",
          );
          if (backupKey) {
            await this.restoreBackup(backupKey);
          }
        }),
      );
    });

    container.querySelectorAll(".backup-delete-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((e) => {
          const backupKey = (e.target as HTMLElement).getAttribute(
            "data-backup-key",
          );
          if (backupKey) {
            void this.deleteBackup(backupKey);
          }
        }),
      );
    });
  }

  /**
   * バックアップを復元する
   */
  private async restoreBackup(backupKey: string): Promise<void> {
    if (!confirm("バックアップを復元しますか？現在のデータは失われます。")) {
      return;
    }

    try {
      const result = await watchHistoryDB.restoreFromBackup(backupKey);
      if (result.success) {
        this.showToast("バックアップを復元しました", "success");
        // データを再読み込み
        await this.refreshData();
      } else {
        this.showToast(
          result.error || "バックアップの復元に失敗しました",
          "error",
        );
      }
    } catch (error) {
      logger.error("バックアップ復元エラー:", error);
      this.showToast("バックアップの復元に失敗しました", "error");
    }
  }

  /**
   * バックアップを削除する
   */
  private deleteBackup(backupKey: string): void {
    if (!confirm("バックアップを削除しますか？")) {
      return;
    }

    try {
      localStorage.removeItem(backupKey);
      this.showToast("バックアップを削除しました", "success");
      void this.refreshBackupList();
    } catch (error) {
      logger.error("バックアップ削除エラー:", error);
      this.showToast("バックアップの削除に失敗しました", "error");
    }
  }

  /**
   * バイト数をフォーマットする
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// アプリケーションを起動
document.addEventListener("DOMContentLoaded", () => new WatchHistoryApp());
