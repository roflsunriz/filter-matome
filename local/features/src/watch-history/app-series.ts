import { createMaterialIcon } from "@/common/material-icons";
import { logger } from "@/common/logger";
import {
  normalizeThumbnailUrl,
  THUMBNAIL_ERROR_HANDLER,
} from "@/common/thumbnail-fallback";
import type {
  SeriesAlert,
  SeriesInfo,
  SeriesStats,
  WatchHistoryEntry,
} from "@/types/watch-history-types";
import { watchHistoryDB } from "@/watch-history/database";
import { filterSeriesStats } from "@/watch-history/series-filter";
import {
  getSeriesAlertExtensionStatus,
  mergeSeriesAlertStates,
  replaceSeriesAlertsInExtension,
  type SeriesAlertExtensionStatus,
} from "@/watch-history/series-alert-extension-client";
import { WatchHistoryDashboardApp } from "@/watch-history/app-dashboard";

/** シリーズ一覧とextension管理のシリーズアラートUIを提供する。 */
export abstract class WatchHistorySeriesApp extends WatchHistoryDashboardApp {
  // ===== シリーズ関連メソッド =====

  /**
   * シリーズタブを初期化する
   */
  protected async initializeSeriesTab(): Promise<void> {
    await this.ensureSeriesDataLoaded();
    await this.updateSeriesUI();
  }

  /**
   * シリーズアラートタブを初期化する
   */
  protected async initializeSeriesAlertTab(): Promise<void> {
    await Promise.all([
      this.ensureSeriesDataLoaded(),
      this.loadSeriesAlertData(),
    ]);
    this.updateSeriesAlertUI();
    this.startAlertUIUpdater();
  }

  /**
   * どのタブからアラート追加を開いてもシリーズ選択肢を利用可能にする。
   */
  protected async ensureSeriesDataLoaded(): Promise<void> {
    if (this.seriesStats.length > 0) return;
    if (!this.seriesDataLoadPromise) {
      this.seriesDataLoadPromise = this.loadSeriesData().finally(() => {
        this.seriesDataLoadPromise = null;
      });
    }
    await this.seriesDataLoadPromise;
  }

  /**
   * シリーズデータを読み込む
   */
  protected async loadSeriesData(): Promise<void> {
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
  protected async loadSeriesAlertData(showLoading = true): Promise<void> {
    if (this.seriesAlertWriteInFlight) return;
    const mutationVersion = this.seriesAlertMutationVersion;
    try {
      if (showLoading) this.showSeriesAlertLoading(true);
      let extensionStatus = await getSeriesAlertExtensionStatus();
      if (
        this.seriesAlertWriteInFlight ||
        mutationVersion !== this.seriesAlertMutationVersion
      ) {
        return;
      }
      const legacyResult = await watchHistoryDB.getLegacySeriesAlerts();
      if (
        this.seriesAlertWriteInFlight ||
        mutationVersion !== this.seriesAlertMutationVersion
      ) {
        return;
      }

      if (
        legacyResult.success &&
        legacyResult.data &&
        legacyResult.data.length > 0
      ) {
        const migrated = mergeSeriesAlertStates(
          extensionStatus.alerts,
          legacyResult.data,
        );
        extensionStatus = await replaceSeriesAlertsInExtension(migrated);
        if (
          this.seriesAlertWriteInFlight ||
          mutationVersion !== this.seriesAlertMutationVersion
        ) {
          return;
        }
        const clearResult = await watchHistoryDB.clearLegacySeriesAlerts();
        if (clearResult.success) {
          this.showToast(
            `${legacyResult.data.length}件の旧シリーズアラートをextensionへ移行しました`,
            "success",
          );
        } else {
          logger.warn("旧シリーズアラート消去失敗:", clearResult.error);
        }
      }

      this.seriesAlerts = extensionStatus.alerts;
      this.applySeriesAlertExtensionStatus(extensionStatus);
    } catch (error) {
      logger.error("シリーズアラートデータ読み込みエラー:", error);
      this.updateSeriesAlertExtensionStatus("拡張DB: 未接続", "error");
      if (showLoading) {
        this.showToast(
          "extensionからシリーズアラートを読み込めませんでした",
          "error",
        );
      }
    } finally {
      if (showLoading) this.showSeriesAlertLoading(false);
    }
  }

  /**
   * extensionを正本としてアラート一覧を置き換える。
   */
  protected async saveSeriesAlertsToExtension(
    alerts: SeriesAlert[],
    showFailureToast = true,
  ): Promise<boolean> {
    if (this.seriesAlertWriteInFlight) {
      if (showFailureToast) {
        this.showToast("シリーズアラートを更新中です", "info");
      }
      return false;
    }
    this.seriesAlertWriteInFlight = true;
    const mutationVersion = ++this.seriesAlertMutationVersion;
    try {
      const status = await replaceSeriesAlertsInExtension(alerts);
      if (mutationVersion !== this.seriesAlertMutationVersion) return false;
      this.seriesAlerts = status.alerts;
      this.applySeriesAlertExtensionStatus(status);
      return true;
    } catch (error) {
      logger.warn("シリーズアラートextension保存エラー:", error);
      this.updateSeriesAlertExtensionStatus("拡張DB: 未接続", "error");
      if (showFailureToast) {
        this.showToast(
          "NicoCache_nl extensionへ保存できません。拡張の配置と再起動を確認してください",
          "error",
        );
      }
      return false;
    } finally {
      this.seriesAlertWriteInFlight = false;
    }
  }

  protected applySeriesAlertExtensionStatus(
    status: SeriesAlertExtensionStatus,
  ): void {
    this.updateSeriesAlertExtensionStatus(
      status.notificationAvailable
        ? "拡張DB: 接続済み・通知有効"
        : "拡張DB: 接続済み・GUIログ/通知音",
      status.lastError ? "error" : "success",
    );
  }

  protected updateSeriesAlertExtensionStatus(
    message: string,
    state: "success" | "error",
  ): void {
    const status = this.elements["series-alert-extension-status"];
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  /**
   * シリーズ統計をフィルタリングする
   */
  protected filterSeriesStats(): void {
    this.filteredSeriesStats = filterSeriesStats(
      this.seriesStats,
      this.seriesFilter,
    );
  }

  /**
   * シリーズUIを更新する
   */
  protected async updateSeriesUI(): Promise<void> {
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズアラートUIを更新する
   */
  protected updateSeriesAlertUI(): void {
    this.updateSeriesAlertList();
    this.updateSeriesAlertCount();
  }

  /**
   * シリーズ一覧を更新する
   */
  protected async updateSeriesList(): Promise<void> {
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
  protected updateSeriesAlertList(): void {
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
  protected async createSeriesItem(stats: SeriesStats): Promise<string> {
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
  protected createSeriesAlertItem(alert: SeriesAlert): string {
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
  protected async handleSeriesSearch(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.seriesFilter.searchText = input.value.trim() || undefined;
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズ検索をクリアする
   */
  protected async clearSeriesSearch(): Promise<void> {
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
  protected async handleSeriesFilter(): Promise<void> {
    const progressFilter = this.elements[
      "series-progress-filter"
    ] as HTMLSelectElement;
    this.seriesFilter.progressFilter =
      (progressFilter?.value as
        "all" | "watching" | "completed" | "not_started") || "all";
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }

  /**
   * シリーズデータを更新する
   */
  protected async refreshSeriesData(): Promise<void> {
    await this.loadSeriesData();
    await this.updateSeriesUI();
    this.showToast("シリーズデータを更新しました", "success");
  }

  /**
   * シリーズアラートデータを更新する
   */
  protected async refreshSeriesAlertData(): Promise<void> {
    await this.loadSeriesAlertData();
    this.updateSeriesAlertUI();
    this.showToast("シリーズアラートデータを更新しました", "success");
  }

  /**
   * シリーズアラートモーダルを開く
   */
  protected async openSeriesAlertModal(): Promise<void> {
    await this.ensureSeriesDataLoaded();
    // シリーズ選択肢を更新
    this.updateSeriesSelectOptions();
    this.elements["series-alert-modal"]?.classList.remove("hidden");
  }

  /**
   * シリーズアラートモーダルを閉じる
   */
  protected closeSeriesAlertModal(): void {
    this.elements["series-alert-modal"]?.classList.add("hidden");
  }

  /**
   * シリーズ詳細モーダルを閉じる
   */
  protected closeSeriesDetailModal(): void {
    this.elements["series-detail-modal"]?.classList.add("hidden");
    this.selectedSeries = null;
  }

  /**
   * シリーズアラートを保存する
   */
  protected async saveSeriesAlert(): Promise<void> {
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
      if (
        await this.saveSeriesAlertsToExtension([...this.seriesAlerts, newAlert])
      ) {
        this.updateSeriesAlertUI();
        this.closeSeriesAlertModal();
        this.showToast("シリーズアラートを追加しました", "success");
      }
    } catch (error) {
      logger.error("シリーズアラート保存エラー:", error);
      this.showToast("シリーズアラートの保存に失敗しました", "error");
    }
  }

  /**
   * シリーズ詳細からアラートを追加する
   */
  protected async addAlertFromSeriesDetail(): Promise<void> {
    if (!this.selectedSeries) return;

    const selectedSeriesId = this.selectedSeries.seriesId;

    // 既存のアラートをチェック
    const existingAlert = this.seriesAlerts.find(
      (alert) => alert.seriesId === selectedSeriesId,
    );
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }

    // シリーズ詳細モーダルを閉じてアラートモーダルを開く
    this.closeSeriesDetailModal();
    await this.openSeriesAlertModal();

    // 選択されたシリーズを設定
    const seriesSelect = this.elements[
      "series-alert-series-select"
    ] as HTMLSelectElement;
    if (seriesSelect) {
      seriesSelect.value = selectedSeriesId.toString();
    }
  }

  /**
   * シリーズ詳細を表示する
   */
  protected async showSeriesDetail(stats: SeriesStats): Promise<void> {
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
  protected createSeriesDetailHTML(
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
  protected createSeriesVideosHTML(videos: WatchHistoryEntry[]): string {
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
        <div class="series-video-item" data-video-id="${video.videoId}" data-content-id="${this.escapeHtml(video.videoId)}">
          <a class="video-thumbnail" href="https://www.nicovideo.jp/watch/${encodeURIComponent(video.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="${this.escapeHtml(video.title)}を開く">
            <img src="${normalizeThumbnailUrl(video.thumbnailUrl)}" alt="${this.escapeHtml(video.title)}" onerror="${THUMBNAIL_ERROR_HANDLER}">
            <div class="video-duration">${this.formatDuration(video.lengthSec)}</div>
          </a>
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
  protected async toggleSeriesAlert(alert: SeriesAlert): Promise<void> {
    const updatedAlert = {
      ...alert,
      enabled: !alert.enabled,
      updatedAt: Date.now(),
    };

    try {
      const nextAlerts = this.seriesAlerts.map((item) =>
        item.id === alert.id ? updatedAlert : item,
      );
      if (await this.saveSeriesAlertsToExtension(nextAlerts)) {
        this.updateSeriesAlertUI();
        this.showToast(
          `アラートを${updatedAlert.enabled ? "有効" : "無効"}にしました`,
          "success",
        );
      }
    } catch (error) {
      logger.error("アラート更新エラー:", error);
      this.showToast("アラートの更新に失敗しました", "error");
    }
  }

  /**
   * シリーズアラートを削除する
   */
  protected async deleteSeriesAlert(alert: SeriesAlert): Promise<void> {
    if (!confirm(`「${alert.seriesTitle}」のアラートを削除しますか？`)) {
      return;
    }

    try {
      const nextAlerts = this.seriesAlerts.filter(
        (item) => item.id !== alert.id,
      );
      if (await this.saveSeriesAlertsToExtension(nextAlerts)) {
        this.updateSeriesAlertUI();
        this.showToast("アラートを削除しました", "success");
      }
    } catch (error) {
      logger.error("アラート削除エラー:", error);
      this.showToast("アラートの削除に失敗しました", "error");
    }
  }
}
