/**
 * ニコニコ動画視聴履歴拡張 - メインアプリケーション
 *
 * @description 視聴履歴ビューSPAの初期化とイベント配線
 */
import { CommonHeader } from "@/common/header";
import { hydrateMaterialIconImages } from "@/common/material-icons";
import { logger } from "@/common/logger";
import type { HistoryViewConfig } from "@/types/watch-history-types";
import { WatchHistoryDatabaseAdminApp } from "@/watch-history/app-database-admin";
import { watchHistoryDB } from "@/watch-history/database";
import {
  cleanHistoryFilter,
  filterHistoryEntries,
} from "@/watch-history/history-filter";
import { applyWatchHistoryStyles } from "@/watch-history/styles";

class WatchHistoryApp extends WatchHistoryDatabaseAdminApp {
  constructor() {
    super();
    this.initializeElements();
    hydrateMaterialIconImages();
    this.setupEventListeners();
    this.loadConfig();
    this.initializeCommonHeader();
    void this.initialize();
    applyWatchHistoryStyles();
  }

  /**
   * DOM要素を初期化する
   */
  protected initializeElements(): void {
    const elementIds = [
      "search-input",
      "search-clear",
      "history-list",
      "loading",
      "empty-state",
      "content-count",
      "history-pagination",
      "history-page-previous",
      "history-page-next",
      "history-page-status",
      "history-page-size",
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
      "filter-uploaded-date-start",
      "filter-uploaded-date-end",
      "clear-uploaded-date-range",
      "open-history-delete-modal-btn",
      "history-delete-modal",
      "history-delete-modal-close",
      "delete-all-btn",
      "delete-by-condition-btn",
      "delete-metadata-select",
      "delete-operator-select",
      "delete-value-input",
      "delete-range-max-input",
      "delete-range-max-field",
      "delete-value-label",
      "delete-dry-run-console",
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
      "series-alert-extension-status",
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
  protected setupEventListeners(): void {
    // 検索
    this.elements["search-input"]?.addEventListener(
      "input",
      this.guardEvent((ev) => this.handleSearch(ev)),
    );
    this.elements["search-clear"]?.addEventListener(
      "click",
      this.guardEvent(() => this.clearSearch()),
    );
    this.elements["history-page-previous"]?.addEventListener(
      "click",
      this.guardEvent(() => this.changeHistoryPage(-1)),
    );
    this.elements["history-page-next"]?.addEventListener(
      "click",
      this.guardEvent(() => this.changeHistoryPage(1)),
    );
    this.elements["history-page-size"]?.addEventListener(
      "change",
      this.guardEvent((event) => this.changeHistoryPageSize(event)),
    );

    // ソート
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        this.guardEvent((ev) => this.handleSort(ev)),
      );
    });
    document
      .querySelectorAll(".management-menu .tab-actions button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const menu = button.closest(".management-menu") as HTMLDetailsElement;
          menu.open = false;
        });
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
      "input",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-date-start"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-date-end"]?.addEventListener(
      "input",
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
    this.elements["filter-uploaded-date-start"]?.addEventListener(
      "input",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-uploaded-date-start"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-uploaded-date-end"]?.addEventListener(
      "input",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["filter-uploaded-date-end"]?.addEventListener(
      "change",
      this.guardEvent(() => this.handleFilter()),
    );
    this.elements["clear-uploaded-date-range"]?.addEventListener(
      "click",
      this.guardEvent(() => this.clearUploadedDateRange()),
    );
    document.getElementById("library-all")?.addEventListener(
      "click",
      this.guardEvent(() => this.setLibraryFilter("all")),
    );
    document.getElementById("library-in-progress")?.addEventListener(
      "click",
      this.guardEvent(() => this.setLibraryFilter("in-progress")),
    );
    document.getElementById("library-completed")?.addEventListener(
      "click",
      this.guardEvent(() => this.setLibraryFilter("completed")),
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
    this.elements["open-history-delete-modal-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.openHistoryDeleteModal()),
    );
    this.elements["history-delete-modal-close"]?.addEventListener(
      "click",
      this.guardEvent(() => this.closeHistoryDeleteModal()),
    );
    this.elements["history-delete-modal"]?.addEventListener(
      "click",
      this.guardEvent((e) => {
        if (
          e.target === this.elements["history-delete-modal"] ||
          (e.target as HTMLElement).classList.contains("modal-overlay")
        ) {
          this.closeHistoryDeleteModal();
        }
      }),
    );
    this.elements["delete-all-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.deleteAllHistoryEntries()),
    );
    this.elements["delete-by-condition-btn"]?.addEventListener(
      "click",
      this.guardEvent(() => this.handleConditionalDelete()),
    );
    for (const id of [
      "delete-metadata-select",
      "delete-operator-select",
      "delete-value-input",
      "delete-range-max-input",
    ]) {
      this.elements[id]?.addEventListener(
        "input",
        this.guardEvent(() => this.updateDeleteDryRun()),
      );
      this.elements[id]?.addEventListener(
        "change",
        this.guardEvent(() => this.updateDeleteDryRun()),
      );
    }

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
      this.guardEvent(() => this.testExtensionNotification()),
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
  protected loadConfig(): void {
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
        if (![25, 50, 100].includes(this.config.pageSize)) {
          this.config.pageSize = 50;
        }
        this.config.currentPage = Math.max(
          1,
          Math.trunc(this.config.currentPage || 1),
        );
        // ===== 読み込んだ検索テキストをサニタイズします =====
        const txt = (this.config.filter.searchText ?? "").trim().toLowerCase();
        if (!txt || txt === "null" || txt === "undefined") {
          delete this.config.filter.searchText;
        } else {
          this.config.filter.searchText = txt;
        }
        this.lastAppliedFilterKey = JSON.stringify(this.config.filter);
      } catch (error) {
        logger.warn("設定読み込みエラー:", error);
      }
    }
  }

  /**
   * 設定を保存する
   */
  protected saveConfig(): void {
    sessionStorage.setItem("watchHistoryConfig", JSON.stringify(this.config));
  }

  /**
   * 共通ヘッダーを初期化する
   */
  protected initializeCommonHeader(): void {
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
  protected async initialize(): Promise<void> {
    try {
      this.showLoading(true);

      // データベースを初期化
      await watchHistoryDB.initialize();

      // データを読み込み
      await this.loadData();

      // 旧IndexedDBアラートを一度だけextensionの正本へ移行する。
      await this.loadSeriesAlertData(false);

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
   * データを読み込む
   */
  protected async loadData(): Promise<void> {
    try {
      logger.debug("データ読み込み開始");

      // 履歴データを取得
      logger.debug("getAllEntries呼び出し前:", {
        sortBy: this.config.sortBy,
        sortOrder: this.config.sortOrder,
        filter: this.config.filter,
      });

      const sanitizedFilter = cleanHistoryFilter(this.config.filter);
      // サニタイズ後のフィルタを設定し直す
      this.config.filter = sanitizedFilter;

      const entriesResult = await watchHistoryDB.getAllEntries(
        this.config.sortBy,
        this.config.sortOrder,
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
      const statsResult = await watchHistoryDB.calculateStats(this.entries);
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
  protected filterEntries(): void {
    logger.debug("フィルタリング開始:", {
      totalEntries: this.entries.length,
      filter: this.config.filter,
    });

    const filterKey = JSON.stringify(this.config.filter);
    if (filterKey !== this.lastAppliedFilterKey) {
      this.config.currentPage = 1;
      this.lastAppliedFilterKey = filterKey;
    }

    this.filteredEntries = filterHistoryEntries(
      this.entries,
      this.config.filter,
    );

    logger.debug("フィルタリング完了:", {
      filteredEntries: this.filteredEntries.length,
    });
  }

  /**
   * UIを更新する
   */
  protected updateUI(): void {
    this.updateHistoryList();
    this.updateStats();
    this.updateFilters();
    this.updateContentCount();
    this.updateActiveFilterChips();
  }
}

let started = false;

export function startWatchHistoryApp(): void {
  if (started) {
    return;
  }
  started = true;
  new WatchHistoryApp();
}
