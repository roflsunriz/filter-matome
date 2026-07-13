import { createMaterialIcon } from "@/common/material-icons";
import { logger } from "@/common/logger";
import type { SeriesAlertExtensionStatus } from "@/watch-history/series-alert-extension-client";
import type {
  DatabaseManagementConfig,
  DailyStats,
  HistoryViewConfig,
  HourlyStats,
  MigrationProgress,
  OverallStats,
  PersistenceStatus,
  SeriesAlert,
  SeriesFilterCondition,
  SeriesInfo,
  SeriesStats,
  WatchHistoryEntry,
} from "@/types/watch-history-types";

/**
 * SPA全体で共有する状態、共通UI操作、抽象的な機能境界を提供する。
 */
export abstract class WatchHistoryAppBase {
  protected entries: WatchHistoryEntry[] = [];
  protected filteredEntries: WatchHistoryEntry[] = [];
  protected config: HistoryViewConfig = {
    sortBy: "watchedAt",
    sortOrder: "desc",
    filter: {},
    pageSize: 50,
    currentPage: 1,
  };
  protected stats: OverallStats | null = null;
  protected selectedEntry: WatchHistoryEntry | null = null;

  // シリーズ関連
  protected seriesStats: SeriesStats[] = [];
  protected seriesDataLoadPromise: Promise<void> | null = null;
  protected filteredSeriesStats: SeriesStats[] = [];
  protected seriesFilter: SeriesFilterCondition = {};
  protected seriesAlerts: SeriesAlert[] = [];
  protected selectedSeries: SeriesStats | null = null;
  protected alertUIUpdateInterval: number | null = null;
  protected seriesAlertRefreshInFlight = false;
  protected seriesAlertWriteInFlight = false;
  protected seriesAlertMutationVersion = 0;

  // データベース管理関連
  protected persistenceStatus: PersistenceStatus | null = null;
  protected migrationProgress: MigrationProgress | null = null;
  protected databaseConfig: DatabaseManagementConfig | null = null;

  // DOM要素
  protected elements: { [key: string]: HTMLElement } = {};

  protected abstract deleteHistoryEntry(
    entry: WatchHistoryEntry,
  ): Promise<void>;
  protected abstract showVideoDetail(entry: WatchHistoryEntry): void;
  protected abstract filterEntries(): void;
  protected abstract saveConfig(): void;
  protected abstract loadData(): Promise<void>;
  protected abstract updateUI(): void;
  protected abstract updateContentCount(): void;
  protected abstract handleFilter(): void;
  protected abstract initializeSeriesTab(): Promise<void>;
  protected abstract initializeSeriesAlertTab(): Promise<void>;
  protected abstract refreshSeriesAlertData(): Promise<void>;
  protected abstract applySeriesAlertExtensionStatus(
    status: SeriesAlertExtensionStatus,
  ): void;
  protected abstract showSeriesLoading(show: boolean): void;
  protected abstract showSeriesAlertLoading(show: boolean): void;
  protected abstract showSeriesEmptyState(show: boolean): void;
  protected abstract showSeriesAlertEmptyState(show: boolean): void;
  protected abstract updateSeriesCount(): void;
  protected abstract updateSeriesAlertCount(): void;
  protected abstract getSeriesInfo(
    seriesId: number,
  ): Promise<SeriesInfo | null>;
  protected abstract createSeriesNavigationHTML(seriesInfo: SeriesInfo): string;
  protected abstract openVideoFromSeries(videoId: string): void;
  protected abstract updateSeriesSelectOptions(): void;
  protected abstract startAlertUIUpdater(): void;
  /**
   * 非同期ハンドラをイベントリスナー用に安全にラップする
   */
  protected guardEvent<T extends Event>(
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
  protected setElementText(id: string, value: string): void {
    const element = this.elements[id];
    if (element) {
      element.textContent = value;
    }
  }

  // ===== ユーティリティメソッド =====

  /**
   * 読み込み状態を表示する
   */
  protected showLoading(show: boolean): void {
    const loading = this.elements["loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  /**
   * 空の状態を表示する
   */
  protected showEmptyState(show: boolean): void {
    const emptyState = this.elements["empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }

  /**
   * トースト通知を表示する
   */
  protected showToast(
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
  protected drawDailyChart(
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
  protected drawHourlyChart(
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
  protected formatDuration(seconds: number): string {
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
  protected formatNumber(num: number): string {
    if (num >= 10000) {
      return `${Math.floor(num / 1000)}k`;
    }
    return num.toLocaleString();
  }

  /**
   * タイムスタンプを date input の値 (YYYY-MM-DD) に変換する
   */
  protected toDateInputValue(timestamp: number): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  protected readDateRange(
    startInput: HTMLInputElement | null | undefined,
    endInput: HTMLInputElement | null | undefined,
  ): { start: number; end: number } | undefined {
    if (!startInput?.value || !endInput?.value) {
      return undefined;
    }

    const start = new Date(startInput.value).getTime();
    const end = new Date(endInput.value).getTime() + 24 * 60 * 60 * 1000 - 1;
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return undefined;
    }

    return { start, end };
  }

  /**
   * 日付文字列 (YYYY-MM-DD) を表示用に整形する
   */
  protected formatDateLabel(dateStr: string): string {
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
  protected getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * HTMLをエスケープする
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
