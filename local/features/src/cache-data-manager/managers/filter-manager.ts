import type { VideoData } from "@/types";

/**
 * 画質フィルターオプション
 */
export type QualityFilter = "all" | "hd" | "sd" | "low" | "unknown";

/**
 * ステータスフィルターオプション
 */
export type StatusFilter = "all" | "complete" | "temporary" | "unavailable";

/**
 * フィルター設定
 */
export interface FilterConfig {
  quality: QualityFilter;
  status: StatusFilter;
}

/**
 * フィルター変更イベントのコールバック型
 */
export type FilterChangeCallback = (config: FilterConfig) => void;

/**
 * FilterManager - 画質・ステータスフィルター管理
 */
export class FilterManager {
  private config: FilterConfig = {
    quality: "all",
    status: "all",
  };

  private changeCallbacks: FilterChangeCallback[] = [];

  constructor(initialConfig?: Partial<FilterConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * 現在のフィルター設定を取得
   */
  public getConfig(): FilterConfig {
    return { ...this.config };
  }

  /**
   * 画質フィルターを設定
   */
  public setQualityFilter(quality: QualityFilter): void {
    if (this.config.quality !== quality) {
      this.config.quality = quality;
      this.notifyChange();
    }
  }

  /**
   * ステータスフィルターを設定
   */
  public setStatusFilter(status: StatusFilter): void {
    if (this.config.status !== status) {
      this.config.status = status;
      this.notifyChange();
    }
  }

  /**
   * 全フィルターをリセット
   */
  public resetFilters(): void {
    const changed =
      this.config.quality !== "all" || this.config.status !== "all";

    this.config = {
      quality: "all",
      status: "all",
    };

    if (changed) {
      this.notifyChange();
    }
  }

  /**
   * フィルター変更時のコールバックを登録
   */
  public onFilterChange(callback: FilterChangeCallback): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyChange(): void {
    const config = this.getConfig();
    for (const callback of this.changeCallbacks) {
      callback(config);
    }
  }

  /**
   * データをフィルタリング
   */
  public filterData(data: VideoData[]): VideoData[] {
    return data.filter((item) => this.matchesFilter(item));
  }

  /**
   * 単一アイテムがフィルターに一致するか確認
   */
  public matchesFilter(item: VideoData): boolean {
    // 画質フィルター
    if (!this.matchesQualityFilter(item)) {
      return false;
    }

    // ステータスフィルター
    if (!this.matchesStatusFilter(item)) {
      return false;
    }

    return true;
  }

  private matchesQualityFilter(item: VideoData): boolean {
    if (this.config.quality === "all") return true;

    const qualityValue = this.parseQualityValue(item.quality);

    switch (this.config.quality) {
      case "hd":
        return qualityValue >= 720;
      case "sd":
        return qualityValue >= 480 && qualityValue < 720;
      case "low":
        return qualityValue > 0 && qualityValue < 480;
      case "unknown":
        return qualityValue === 0;
      default:
        return true;
    }
  }

  private matchesStatusFilter(item: VideoData): boolean {
    if (this.config.status === "all") return true;

    switch (this.config.status) {
      case "complete":
        return !item.isTemp;
      case "temporary":
        return item.isTemp;
      case "unavailable":
        return ["deleted", "private", "unavailable"].includes(
          item.availabilityStatus ?? "",
        );
      default:
        return true;
    }
  }

  /**
   * 画質文字列から数値を抽出
   */
  private parseQualityValue(quality: string): number {
    const match = quality.match(/(\d+)/);
    if (!match?.[1]) return 0;
    return parseInt(match[1], 10);
  }

  /**
   * フィルターが適用されているかどうか
   */
  public hasActiveFilters(): boolean {
    return this.config.quality !== "all" || this.config.status !== "all";
  }

  /**
   * フィルター適用後のカウントを取得（プレビュー用）
   */
  public getFilteredCount(data: VideoData[]): number {
    return this.filterData(data).length;
  }

  /**
   * 各フィルターオプションのカウントを取得
   */
  public getFilterCounts(data: VideoData[]): {
    quality: Record<QualityFilter, number>;
    status: Record<StatusFilter, number>;
  } {
    const qualityCounts: Record<QualityFilter, number> = {
      all: data.length,
      hd: 0,
      sd: 0,
      low: 0,
      unknown: 0,
    };

    const statusCounts: Record<StatusFilter, number> = {
      all: data.length,
      complete: 0,
      temporary: 0,
      unavailable: 0,
    };

    for (const item of data) {
      // 画質カウント
      const qualityValue = this.parseQualityValue(item.quality);
      if (qualityValue >= 720) {
        qualityCounts.hd++;
      } else if (qualityValue >= 480) {
        qualityCounts.sd++;
      } else if (qualityValue > 0) {
        qualityCounts.low++;
      } else {
        qualityCounts.unknown++;
      }

      // ステータスカウント
      if (item.isTemp) {
        statusCounts.temporary++;
      } else {
        statusCounts.complete++;
      }

      if (
        ["deleted", "private", "unavailable"].includes(
          item.availabilityStatus ?? "",
        )
      ) {
        statusCounts.unavailable++;
      }
    }

    return {
      quality: qualityCounts,
      status: statusCounts,
    };
  }
}

/**
 * 画質フィルターのラベル
 */
export const QUALITY_FILTER_LABELS: Record<QualityFilter, string> = {
  all: "すべての画質",
  hd: "HD (720p+)",
  sd: "SD (480p)",
  low: "低画質 (360p以下)",
  unknown: "不明",
};

/**
 * ステータスフィルターのラベル
 */
export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "すべてのステータス",
  complete: "完了",
  temporary: "一時ファイル",
  unavailable: "利用不可",
};
