import { createMaterialIcon, getIconPath } from "@/common/material-icons";
import { logger } from "@/common/logger";
import {
  normalizeThumbnailUrl,
  THUMBNAIL_ERROR_HANDLER,
} from "@/common/thumbnail-fallback";
import { createVideoDetailHTML } from "@/watch-history/video-detail-renderer";
import {
  calculateTagStats,
  renderTagCloud,
} from "@/watch-history/tag-cloud-renderer";
import type {
  DailyStats,
  HourlyStats,
  ImportConfig,
  SortBy,
  WatchHistoryEntry,
  WatchHistoryExportData,
} from "@/types/watch-history-types";
import { watchHistoryDB } from "@/watch-history/database";
import { calculateFavoriteVideos } from "@/watch-history/history-filter";
import {
  getSeriesAlertExtensionStatus,
  mergeSeriesAlertStates,
  replaceSeriesAlertsInExtension,
} from "@/watch-history/series-alert-extension-client";
import { WatchHistoryHistoryListApp } from "@/watch-history/app-history-list";

/** 統計、フィルター、入出力、動画詳細、メモ編集を提供する。 */
export abstract class WatchHistoryDashboardApp extends WatchHistoryHistoryListApp {
  protected updateStats(): void {
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
  protected updateRecentActivityStats(): void {
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
  protected updateHighlightStats(): void {
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
  protected updateFilters(): void {
    const completedFilter = this.elements[
      "filter-completed"
    ] as HTMLInputElement;
    if (completedFilter) {
      completedFilter.checked = this.config.filter.completedOnly === true;
    }

    const dateStartFilter = this.elements[
      "filter-date-start"
    ] as HTMLInputElement;
    const dateEndFilter = this.elements["filter-date-end"] as HTMLInputElement;
    if (this.config.filter.dateRange) {
      if (dateStartFilter) {
        dateStartFilter.value = this.toDateInputValue(
          this.config.filter.dateRange.start,
        );
      }
      if (dateEndFilter) {
        dateEndFilter.value = this.toDateInputValue(
          this.config.filter.dateRange.end,
        );
      }
    } else {
      if (dateStartFilter) {
        dateStartFilter.value = "";
      }
      if (dateEndFilter) {
        dateEndFilter.value = "";
      }
    }

    const uploadedDateStartFilter = this.elements[
      "filter-uploaded-date-start"
    ] as HTMLInputElement;
    const uploadedDateEndFilter = this.elements[
      "filter-uploaded-date-end"
    ] as HTMLInputElement;
    if (this.config.filter.uploadedDateRange) {
      if (uploadedDateStartFilter) {
        uploadedDateStartFilter.value = this.toDateInputValue(
          this.config.filter.uploadedDateRange.start,
        );
      }
      if (uploadedDateEndFilter) {
        uploadedDateEndFilter.value = this.toDateInputValue(
          this.config.filter.uploadedDateRange.end,
        );
      }
    } else {
      if (uploadedDateStartFilter) {
        uploadedDateStartFilter.value = "";
      }
      if (uploadedDateEndFilter) {
        uploadedDateEndFilter.value = "";
      }
    }

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

      const currentValue = this.config.filter.ownerId ?? ownerSelect.value;

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
  protected updateContentCount(): void {
    const contentCount = this.elements["content-count"];
    if (contentCount) {
      contentCount.textContent = `${this.filteredEntries.length} 件の動画`;
    }
  }

  /**
   * グラフを更新する
   */
  protected updateCharts(): void {
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
  protected updateCreatorStats(): void {
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
   * タグクラウドを更新する
   */
  protected updateTagCloud(): void {
    const tagCloudElement = this.elements["tag-cloud"];
    if (!tagCloudElement) return;

    renderTagCloud(tagCloudElement, calculateTagStats(this.entries), (tag) => {
      this.searchByTag(tag);
    });
  }

  /**
   * お気に入り動画リストを更新する
   */
  protected updateFavoriteVideos(): void {
    const container = this.elements["favorite-videos"];
    if (!container) return;

    const favorites = calculateFavoriteVideos(this.entries);

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
          <img class="favorite-thumb" src="${normalizeThumbnailUrl(entry.thumbnailUrl)}" alt="${this.escapeHtml(entry.title)}" onerror="${THUMBNAIL_ERROR_HANDLER}">
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
  protected searchByTag(tag: string): void {
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
  protected handleSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.config.filter.searchText = input.value.trim() || undefined;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.updateActiveFilterChips();
    this.saveConfig();
  }

  /**
   * 検索をクリアする
   */
  protected clearSearch(): void {
    const searchInput = this.elements["search-input"] as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      this.config.filter.searchText = undefined;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.updateActiveFilterChips();
      this.saveConfig();
    }
  }

  /**
   * 期間フィルタを一括クリアする
   */
  protected clearDateRange(): void {
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
    this.updateActiveFilterChips();
    this.saveConfig();

    // 成功メッセージを表示
    this.showToast("視聴期間フィルタをクリアしました", "success");
  }

  /**
   * 投稿期間フィルタを一括クリアする
   */
  protected clearUploadedDateRange(): void {
    const startDateInput = this.elements[
      "filter-uploaded-date-start"
    ] as HTMLInputElement;
    const endDateInput = this.elements[
      "filter-uploaded-date-end"
    ] as HTMLInputElement;

    if (startDateInput) {
      startDateInput.value = "";
    }
    if (endDateInput) {
      endDateInput.value = "";
    }

    this.config.filter.uploadedDateRange = undefined;

    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.updateActiveFilterChips();
    this.saveConfig();

    this.showToast("投稿期間フィルタをクリアしました", "success");
  }

  /**
   * ソートを処理する
   */
  protected async handleSort(event: Event): Promise<void> {
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
  protected updateSortUI(): void {
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
  protected handleFilter(): void {
    const completedFilter = this.elements[
      "filter-completed"
    ] as HTMLInputElement;
    const ownerFilter = this.elements["filter-owner"] as HTMLSelectElement;
    const dateStartFilter = this.elements[
      "filter-date-start"
    ] as HTMLInputElement;
    const dateEndFilter = this.elements["filter-date-end"] as HTMLInputElement;
    const uploadedDateStartFilter = this.elements[
      "filter-uploaded-date-start"
    ] as HTMLInputElement;
    const uploadedDateEndFilter = this.elements[
      "filter-uploaded-date-end"
    ] as HTMLInputElement;

    this.config.filter.completedOnly = completedFilter?.checked
      ? true
      : undefined;
    this.config.filter.ownerId = ownerFilter?.value || undefined;

    logger.debug("フィルタ更新:", {
      completedOnly: this.config.filter.completedOnly,
      ownerId: this.config.filter.ownerId,
      ownerName: ownerFilter?.selectedOptions[0]?.textContent,
    });

    this.config.filter.dateRange = this.readDateRange(
      dateStartFilter,
      dateEndFilter,
    );
    this.config.filter.uploadedDateRange = this.readDateRange(
      uploadedDateStartFilter,
      uploadedDateEndFilter,
    );

    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.updateActiveFilterChips();
    this.saveConfig();
  }

  /**
   * データを更新する
   */
  protected async refreshData(): Promise<void> {
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
  protected async handleExport(): Promise<void> {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const extensionStatus = await getSeriesAlertExtensionStatus();
        result.data.seriesAlerts = extensionStatus.alerts;
        this.applySeriesAlertExtensionStatus(extensionStatus);
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
  protected handleImport(): void {
    const fileInput = this.elements["import-file"] as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * インポートファイルを処理する
   */
  protected async handleImportFile(event: Event): Promise<void> {
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
        let importedAlertCount = 0;
        if (data.seriesAlerts.length > 0) {
          const current = await getSeriesAlertExtensionStatus();
          const merged = mergeSeriesAlertStates(
            current.alerts,
            data.seriesAlerts,
          );
          const updated = await replaceSeriesAlertsInExtension(merged);
          this.seriesAlerts = updated.alerts;
          this.applySeriesAlertExtensionStatus(updated);
          importedAlertCount = data.seriesAlerts.length;
        }
        this.showToast(
          `${result.data}件の履歴と${importedAlertCount}件のシリーズアラートをインポートしました`,
          "success",
        );
        await this.refreshData();
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
  protected switchTab(tabName: string): void {
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
  protected showVideoDetail(entry: WatchHistoryEntry): void {
    this.selectedEntry = entry;

    const modalTitle = this.elements["modal-title"];
    if (modalTitle) {
      modalTitle.textContent = entry.title;
    }

    const modalVideoInfo = this.elements["modal-video-info"];
    if (modalVideoInfo) {
      modalVideoInfo.innerHTML = createVideoDetailHTML(entry, {
        formatDuration: this.formatDuration.bind(this),
      });
    }

    this.elements["video-detail-modal"]?.classList.remove("hidden");
  }

  /**
   * モーダルを閉じる
   */
  protected closeModal(): void {
    this.elements["video-detail-modal"]?.classList.add("hidden");
    this.selectedEntry = null;
  }

  /**
   * 動画を開く
   */
  protected openVideo(): void {
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
  protected openMemoEdit(): void {
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
  protected closeMemoEdit(): void {
    this.elements["memo-edit-modal"]?.classList.add("hidden");
  }

  /**
   * メモを保存する
   */
  protected async saveMemo(): Promise<void> {
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
}
