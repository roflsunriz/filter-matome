import type { VideoData } from "@/types";

/**
 * ソートオプション
 */
export type SortOption = "id" | "title" | "quality" | "availability";

/**
 * ソート方向
 */
export type SortDirection = "asc" | "desc";

/**
 * ソート設定
 */
export interface SortConfig {
  option: SortOption;
  direction: SortDirection;
}

/**
 * ソート変更イベントのコールバック型
 */
export type SortChangeCallback = (config: SortConfig) => void;

/**
 * SortManager - 複数ソートオプション管理
 */
export class SortManager {
  private config: SortConfig = {
    option: "id",
    direction: "asc",
  };

  private changeCallbacks: SortChangeCallback[] = [];

  constructor(initialConfig?: Partial<SortConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * 現在のソート設定を取得
   */
  public getConfig(): SortConfig {
    return { ...this.config };
  }

  /**
   * ソートオプションを設定
   */
  public setSortOption(option: SortOption): void {
    if (this.config.option !== option) {
      this.config.option = option;
      this.notifyChange();
    }
  }

  /**
   * ソート方向を設定
   */
  public setSortDirection(direction: SortDirection): void {
    if (this.config.direction !== direction) {
      this.config.direction = direction;
      this.notifyChange();
    }
  }

  /**
   * ソート方向を切り替え
   */
  public toggleDirection(): void {
    this.config.direction = this.config.direction === "asc" ? "desc" : "asc";
    this.notifyChange();
  }

  /**
   * ソート設定をリセット
   */
  public resetSort(): void {
    const changed =
      this.config.option !== "id" || this.config.direction !== "asc";

    this.config = {
      option: "id",
      direction: "asc",
    };

    if (changed) {
      this.notifyChange();
    }
  }

  /**
   * ソート変更時のコールバックを登録
   */
  public onSortChange(callback: SortChangeCallback): () => void {
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
   * データをソート
   */
  public sortData(data: VideoData[]): VideoData[] {
    const sorted = [...data];
    const multiplier = this.config.direction === "asc" ? 1 : -1;

    switch (this.config.option) {
      case "id":
        return this.sortById(sorted, multiplier);
      case "title":
        return this.sortByTitle(sorted, multiplier);
      case "quality":
        return this.sortByQuality(sorted, multiplier);
      case "availability":
        return this.sortByAvailability(sorted, multiplier);
      default:
        return sorted;
    }
  }

  private sortById(data: VideoData[], multiplier: number): VideoData[] {
    // IDのプレフィックス優先度
    const typePriority: Record<string, number> = { nm: 1, sm: 2, so: 3 };

    return data.sort((a, b) => {
      const aType = a.id.slice(0, 2);
      const bType = b.id.slice(0, 2);

      const aPriority = typePriority[aType] ?? 4;
      const bPriority = typePriority[bType] ?? 4;

      // タイプ順で比較
      if (aPriority !== bPriority) {
        return (aPriority - bPriority) * multiplier;
      }

      // 同じタイプなら数値で比較
      const aNum = this.extractNumber(a.id);
      const bNum = this.extractNumber(b.id);
      return (aNum - bNum) * multiplier;
    });
  }

  private sortByTitle(data: VideoData[], multiplier: number): VideoData[] {
    return data.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      return aTitle.localeCompare(bTitle, "ja") * multiplier;
    });
  }

  private sortByQuality(data: VideoData[], multiplier: number): VideoData[] {
    return data.sort((a, b) => {
      const aQuality = this.parseQualityValue(a.quality);
      const bQuality = this.parseQualityValue(b.quality);
      return (bQuality - aQuality) * multiplier; // 高画質が先（デフォルト昇順で高画質が先）
    });
  }

  private sortByAvailability(
    data: VideoData[],
    multiplier: number,
  ): VideoData[] {
    return data.sort((a, b) => {
      const availabilityDiff =
        this.getAvailabilityPriority(a) - this.getAvailabilityPriority(b);
      if (availabilityDiff !== 0) {
        return availabilityDiff * multiplier;
      }
      return this.compareById(a, b) * multiplier;
    });
  }

  private getAvailabilityPriority(item: VideoData): number {
    if (item.availabilityStatus === "unavailable") return 0;
    if (item.availabilityStatus === "unknown") return 1;
    return 2;
  }

  private compareById(a: VideoData, b: VideoData): number {
    const typePriority: Record<string, number> = { nm: 1, sm: 2, so: 3 };
    const aType = a.id.slice(0, 2);
    const bType = b.id.slice(0, 2);
    const aPriority = typePriority[aType] ?? 4;
    const bPriority = typePriority[bType] ?? 4;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return this.extractNumber(a.id) - this.extractNumber(b.id);
  }

  private extractNumber(id: string): number {
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private parseQualityValue(quality: string): number {
    const match = quality.match(/(\d+)/);
    if (!match?.[1]) return 0;
    return parseInt(match[1], 10);
  }

  /**
   * デフォルトソート（ID順）が適用されているかどうか
   */
  public isDefaultSort(): boolean {
    return this.config.option === "id" && this.config.direction === "asc";
  }
}

/**
 * ソートオプションのラベル
 */
export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  id: "ID順",
  title: "タイトル順",
  quality: "画質順",
  availability: "利用不可",
};

/**
 * ソート方向のラベル
 */
export const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: "昇順",
  desc: "降順",
};

/**
 * ソートオプションの説明
 */
export const SORT_OPTION_DESCRIPTIONS: Record<SortOption, string> = {
  id: "nm → sm → so の順、同タイプは番号順",
  title: "あいうえお順（五十音順）",
  quality: "高画質から低画質の順",
  availability: "利用不可、未確認、利用可能の順",
};
