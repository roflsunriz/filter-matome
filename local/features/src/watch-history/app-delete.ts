import { createMaterialIcon } from "@/common/material-icons";
import { logger } from "@/common/logger";
import type {
  SeriesInfo,
  WatchHistoryEntry,
} from "@/types/watch-history-types";
import { watchHistoryDB } from "@/watch-history/database";
import {
  createDeleteCondition,
  describeDeleteCondition,
  findDeleteTargets,
  formatDeleteMetric,
  getDeleteMetric,
  type DeleteCondition,
  type DeleteMetadataKey,
  type DeleteOperator,
} from "@/watch-history/history-delete-rules";
import {
  requestSeriesAlertCheck,
  sendSeriesAlertTestNotification,
} from "@/watch-history/series-alert-extension-client";
import { WatchHistorySeriesApp } from "@/watch-history/app-series";

/** 履歴削除モーダルとシリーズ内ナビゲーションを提供する。 */
export abstract class WatchHistoryDeleteApp extends WatchHistorySeriesApp {
  // ===== 視聴履歴削除機能 =====

  /**
   * 個別の視聴履歴エントリを削除する
   */
  protected async deleteHistoryEntry(entry: WatchHistoryEntry): Promise<void> {
    const confirmed = await this.showHistoryDeleteConfirmDialog(
      "履歴削除の最終確認",
      "この視聴履歴を削除します。",
      [entry],
    );
    if (!confirmed) {
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
  protected async deleteAllHistoryEntries(): Promise<void> {
    const totalCount = this.entries.length;
    if (totalCount === 0) {
      this.showToast("削除する履歴がありません", "info");
      return;
    }

    const confirmed = await this.showHistoryDeleteConfirmDialog(
      "全削除の最終確認",
      `全ての視聴履歴 ${totalCount.toLocaleString()} 件を削除します。`,
      this.entries,
    );
    if (!confirmed) {
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
        this.updateDeleteDryRun();
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
   * 履歴削除モーダルを開く
   */
  protected openHistoryDeleteModal(): void {
    this.elements["history-delete-modal"]?.classList.remove("hidden");
    this.updateDeleteDryRun();
  }

  /**
   * 履歴削除モーダルを閉じる
   */
  protected closeHistoryDeleteModal(): void {
    this.elements["history-delete-modal"]?.classList.add("hidden");
  }

  /**
   * 条件付き削除のハンドラー
   */
  protected handleConditionalDelete(): void {
    const condition = this.readDeleteCondition();
    if (!condition) {
      this.showToast("削除条件が無効です", "error");
      return;
    }

    void this.deleteHistoryEntriesByCondition(condition);
  }

  /**
   * 条件に一致する視聴履歴を削除する
   */
  protected async deleteHistoryEntriesByCondition(
    condition: DeleteCondition,
  ): Promise<void> {
    const matchingEntries = findDeleteTargets(this.entries, condition);
    if (matchingEntries.length === 0) {
      this.showToast("条件に一致する履歴がありません", "info");
      return;
    }

    const confirmed = await this.showHistoryDeleteConfirmDialog(
      "条件削除の最終確認",
      `${describeDeleteCondition(condition)} に一致する履歴 ${matchingEntries.length.toLocaleString()} 件を削除します。`,
      matchingEntries,
    );
    if (!confirmed) {
      return;
    }

    try {
      let deleted = 0;
      for (const entry of matchingEntries) {
        const result = await watchHistoryDB.deleteEntry(entry.videoId);
        if (result.success) {
          deleted++;
        } else {
          logger.warn("条件付き削除で履歴削除に失敗:", {
            videoId: entry.videoId,
            error: result.error,
          });
        }
      }

      await this.refreshData();
      this.updateDeleteDryRun();
      this.showToast(`${deleted}件の履歴を削除しました`, "success");
    } catch (error) {
      logger.error("条件付き削除エラー:", error);
      this.showToast("条件付き削除に失敗しました", "error");
    }
  }

  protected updateDeleteDryRun(): void {
    this.updateDeleteOperatorUI();

    const consoleElement = this.elements["delete-dry-run-console"];
    const deleteButton = this.elements["delete-by-condition-btn"] as
      HTMLButtonElement | undefined;
    const condition = this.readDeleteCondition();

    if (!consoleElement) return;

    if (!condition) {
      consoleElement.textContent = "条件が無効です。数値を確認してください。";
      if (deleteButton) {
        deleteButton.disabled = true;
      }
      return;
    }

    const matchingEntries = findDeleteTargets(this.entries, condition);
    if (deleteButton) {
      deleteButton.disabled = matchingEntries.length === 0;
    }

    const samples = matchingEntries.slice(0, 10).map((entry, index) => {
      const value = getDeleteMetric(entry, condition.metadata);
      const metricText =
        value === null ? "値なし" : formatDeleteMetric(condition, value);
      return `${index + 1}. ${entry.title} (${entry.videoId}) - ${metricText}`;
    });

    consoleElement.textContent = [
      `条件: ${describeDeleteCondition(condition)}`,
      `対象: ${matchingEntries.length.toLocaleString()} / ${this.entries.length.toLocaleString()} 件`,
      "",
      samples.length > 0 ? "サンプル:" : "条件に一致する履歴はありません。",
      ...samples,
      matchingEntries.length > samples.length
        ? `...他 ${(matchingEntries.length - samples.length).toLocaleString()} 件`
        : "",
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  protected showHistoryDeleteConfirmDialog(
    title: string,
    message: string,
    entries: WatchHistoryEntry[],
  ): Promise<boolean> {
    const existing = document.getElementById("history-delete-confirm-modal");
    existing?.remove();

    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.id = "history-delete-confirm-modal";
      modal.className = "modal history-delete-confirm-modal";

      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      const content = document.createElement("div");
      content.className = "modal-content large history-delete-confirm-content";

      const header = document.createElement("div");
      header.className = "modal-header";

      const heading = document.createElement("h3");
      heading.className = "modal-title";
      heading.textContent = title;

      const closeButton = document.createElement("button");
      closeButton.className = "modal-close";
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "閉じる");
      closeButton.textContent = "×";

      header.append(heading, closeButton);

      const body = document.createElement("div");
      body.className = "modal-body";

      const warning = document.createElement("p");
      warning.className = "history-delete-confirm-warning";
      warning.textContent = `${message} この操作は取り消せません。`;

      const count = document.createElement("p");
      count.className = "history-delete-confirm-count";
      count.textContent = `削除対象: ${entries.length.toLocaleString()} 件`;

      const list = document.createElement("div");
      list.className = "history-delete-confirm-list";

      for (const entry of entries) {
        list.appendChild(this.createHistoryDeleteConfirmRow(entry));
      }

      const actions = document.createElement("div");
      actions.className = "modal-actions";

      const cancelButton = document.createElement("button");
      cancelButton.className = "btn btn-secondary";
      cancelButton.type = "button";
      cancelButton.textContent = "キャンセル";

      const confirmButton = document.createElement("button");
      confirmButton.className = "btn btn-danger";
      confirmButton.type = "button";
      confirmButton.textContent = "表示された対象を削除";

      actions.append(cancelButton, confirmButton);
      body.append(warning, count, list, actions);
      content.append(header, body);
      modal.append(overlay, content);

      const cleanup = (result: boolean) => {
        document.removeEventListener("keydown", onKey);
        modal.remove();
        resolve(result);
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          cleanup(false);
        }
      };

      closeButton.addEventListener("click", () => cleanup(false));
      cancelButton.addEventListener("click", () => cleanup(false));
      confirmButton.addEventListener("click", () => cleanup(true));
      overlay.addEventListener("click", () => cleanup(false));
      document.addEventListener("keydown", onKey);

      document.body.appendChild(modal);
      cancelButton.focus();
    });
  }

  protected createHistoryDeleteConfirmRow(
    entry: WatchHistoryEntry,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "history-delete-confirm-row";

    const title = document.createElement("div");
    title.className = "history-delete-confirm-title";
    title.textContent = entry.title;

    const details = document.createElement("div");
    details.className = "history-delete-confirm-details";

    const watchedAt = new Date(entry.watchedAt);
    const uploadedAt = entry.stats?.uploadedAt
      ? new Date(entry.stats.uploadedAt).toLocaleString("ja-JP")
      : "不明";
    const progressRate =
      entry.lengthSec > 0
        ? Math.round((entry.lastPosition / entry.lengthSec) * 100)
        : 0;

    const detailItems = [
      `動画ID: ${entry.videoId}`,
      `投稿者: ${entry.ownerName}`,
      `視聴日時: ${watchedAt.toLocaleString("ja-JP")}`,
      `投稿日時: ${uploadedAt}`,
      `視聴回数: ${entry.watchCount}`,
      `進捗率: ${progressRate}%`,
    ];

    for (const detailText of detailItems) {
      const item = document.createElement("span");
      item.textContent = detailText;
      details.appendChild(item);
    }

    row.append(title, details);
    return row;
  }

  protected updateDeleteOperatorUI(): void {
    const operator = (
      this.elements["delete-operator-select"] as HTMLSelectElement | undefined
    )?.value as DeleteOperator | undefined;
    const rangeMaxField = this.elements["delete-range-max-field"];
    const valueLabel = this.elements["delete-value-label"];

    if (rangeMaxField) {
      rangeMaxField.classList.toggle("hidden", operator !== "range");
    }
    if (valueLabel) {
      valueLabel.textContent = operator === "range" ? "下限" : "指定数";
    }
  }

  protected readDeleteCondition(): DeleteCondition | null {
    const metadata = (
      this.elements["delete-metadata-select"] as HTMLSelectElement | undefined
    )?.value as DeleteMetadataKey | undefined;
    const operator = (
      this.elements["delete-operator-select"] as HTMLSelectElement | undefined
    )?.value as DeleteOperator | undefined;
    const valueInput = this.elements["delete-value-input"] as
      HTMLInputElement | undefined;
    const maxInput = this.elements["delete-range-max-input"] as
      HTMLInputElement | undefined;

    return createDeleteCondition(
      metadata,
      operator,
      valueInput?.value ?? "",
      maxInput?.value,
    );
  }

  /**
   * シリーズ選択肢を更新する
   */
  protected updateSeriesSelectOptions(): void {
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
   * アラートUIの定期更新を開始する
   */
  protected startAlertUIUpdater(): void {
    if (this.alertUIUpdateInterval !== null) return;
    // 10秒間隔でUIを更新（残り時間表示を更新）
    this.alertUIUpdateInterval = window.setInterval(() => {
      if (this.elements["series-alert-tab"]?.classList.contains("active")) {
        this.updateSeriesAlertUI();
        if (!this.seriesAlertRefreshInFlight) {
          this.seriesAlertRefreshInFlight = true;
          void this.loadSeriesAlertData(false)
            .then(() => this.updateSeriesAlertUI())
            .finally(() => {
              this.seriesAlertRefreshInFlight = false;
            });
        }
      }
    }, 10 * 1000);
  }

  /**
   * 手動でアラートをチェックする
   */
  protected async manualCheckAlerts(): Promise<void> {
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
      const accepted = await requestSeriesAlertCheck();
      this.showToast(
        accepted
          ? `${enabledAlerts.length}件のアラート確認をextensionへ依頼しました`
          : "extensionは既にアラートを確認中です",
        accepted ? "success" : "info",
      );
    } catch (error) {
      logger.error("手動アラートチェックエラー:", error);
      this.updateSeriesAlertExtensionStatus("拡張DB: 未接続", "error");
      this.showToast("extensionへアラート確認を依頼できませんでした", "error");
    }
  }

  /**
   * extensionからOS通知をテスト送信する。
   */
  protected async testExtensionNotification(): Promise<void> {
    try {
      const displayed = await sendSeriesAlertTestNotification();
      this.updateSeriesAlertExtensionStatus(
        displayed
          ? "拡張DB: 接続済み・通知有効"
          : "拡張DB: 接続済み・GUIログ/通知音",
        "success",
      );
      this.showToast(
        displayed
          ? "extensionからテスト通知を送信しました"
          : "システム通知を利用できないため、GUIログと通知音でテストしました",
        "success",
      );
    } catch (error) {
      logger.error("extension通知テストエラー:", error);
      this.updateSeriesAlertExtensionStatus("拡張DB: 未接続", "error");
      this.showToast("extensionから通知を送信できませんでした", "error");
    }
  }

  // ===== ユーティリティメソッド（シリーズ関連） =====

  /**
   * シリーズ読み込み状態を表示する
   */
  protected showSeriesLoading(show: boolean): void {
    const loading = this.elements["series-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズアラート読み込み状態を表示する
   */
  protected showSeriesAlertLoading(show: boolean): void {
    const loading = this.elements["series-alert-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズ空の状態を表示する
   */
  protected showSeriesEmptyState(show: boolean): void {
    const emptyState = this.elements["series-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズアラート空の状態を表示する
   */
  protected showSeriesAlertEmptyState(show: boolean): void {
    const emptyState = this.elements["series-alert-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * シリーズ数を更新する
   */
  protected updateSeriesCount(): void {
    const seriesCount = this.elements["series-count"];
    if (seriesCount) {
      seriesCount.textContent = `${this.filteredSeriesStats.length} 件のシリーズ`;
    }
  }

  /**
   * シリーズアラート数を更新する
   */
  protected updateSeriesAlertCount(): void {
    const alertCount = this.elements["series-alert-count"];
    if (alertCount) {
      alertCount.textContent = `${this.seriesAlerts.length} 件のアラート`;
    }
  }

  /**
   * シリーズ情報を取得する
   */
  protected async getSeriesInfo(seriesId: number): Promise<SeriesInfo | null> {
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
  protected createSeriesNavigationHTML(seriesInfo: SeriesInfo): string {
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
  protected openVideoFromSeries(videoId: string): void {
    const url = `https://www.nicovideo.jp/watch/${videoId}`;
    window.open(url, "_blank");
    this.showToast("動画を開きました", "success");
  }
}
