export type MetaSourceLabel = "再生" | "コメント" | "マイリスト" | "投稿日時";

export interface MetaItem {
  key: string;
  label: string;
  source: MetaSourceLabel;
}

interface StructuredVideoData {
  "@type"?: string;
  uploadDate?: string;
  commentCount?: number;
  interactionStatistic?: Array<{
    interactionType?: string;
    userInteractionCount?: number;
  }>;
}

export const META_ITEMS: MetaItem[] = [
  { key: "views", label: "再生", source: "再生" },
  { key: "comments", label: "コメント", source: "コメント" },
  { key: "mylists", label: "マイリスト", source: "マイリスト" },
  { key: "postedAt", label: "投稿日時", source: "投稿日時" },
];

/** 視聴ページ上の複数ソースから原宿UI用統計を収集する。 */
export class HarajukuMetadataReader {
  constructor(
    private readonly detailListSelector: string,
    private readonly bottomSelector: string,
  ) {}

  private textOf(element: Element | null | undefined): string {
    return (element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  private readDetailMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    const dl = document.querySelector(this.detailListSelector);
    if (!dl) {
      return result;
    }

    for (const item of Array.from(dl.children)) {
      const label = this.textOf(item.querySelector("dt"));
      const value = this.textOf(item.querySelector("dd"));
      if (this.isMetaSourceLabel(label) && value) {
        result[label] = value;
      }
    }

    return result;
  }

  private readStructuredMeta(): Partial<Record<MetaSourceLabel, string>> {
    const video = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ),
    )
      .map((script) => this.parseStructuredVideoData(script.textContent))
      .find(
        (data): data is StructuredVideoData =>
          data?.["@type"] === "VideoObject",
      );

    if (!video) {
      return {};
    }

    const stats = Array.isArray(video.interactionStatistic)
      ? video.interactionStatistic
      : [];
    const interactionCount = (type: string): number | undefined => {
      const item = stats.find((stat) =>
        String(stat.interactionType || "").includes(type),
      );
      return typeof item?.userInteractionCount === "number"
        ? item.userInteractionCount
        : undefined;
    };

    return {
      投稿日時: this.formatDateTime(video.uploadDate),
      再生: this.formatNumber(interactionCount("WatchAction")),
      コメント: this.formatNumber(video.commentCount),
      マイリスト: this.formatNumber(interactionCount("WantAction")),
    };
  }

  private readFallbackMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    const infoRoot = document.querySelector(
      `${this.bottomSelector} > div:first-child > :first-child`,
    );
    const metaLine = infoRoot?.querySelector("div:has(> time[datetime])");
    const children = metaLine ? Array.from(metaLine.children) : [];
    const time = children.find((child) => child.matches("time[datetime]"));
    const counters = children.filter((child) => child.matches("div"));

    if (time) {
      result["投稿日時"] = this.textOf(time);
    }
    if (counters[0]) {
      result["再生"] = this.textOf(counters[0]);
    }
    if (counters[1]) {
      result["コメント"] = this.textOf(counters[1]);
    }

    return result;
  }

  public currentMeta(): Partial<Record<MetaSourceLabel, string>> {
    const result: Partial<Record<MetaSourceLabel, string>> = {};
    for (const source of [
      this.readFallbackMeta(),
      this.readDetailMeta(),
      this.readStructuredMeta(),
    ]) {
      for (const [key, value] of Object.entries(source)) {
        if (this.isMetaSourceLabel(key) && value) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  private parseStructuredVideoData(
    value: string | null,
  ): StructuredVideoData | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return this.isStructuredVideoData(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private isStructuredVideoData(value: unknown): value is StructuredVideoData {
    return typeof value === "object" && value !== null;
  }

  private isMetaSourceLabel(value: string): value is MetaSourceLabel {
    return (
      value === "再生" ||
      value === "コメント" ||
      value === "マイリスト" ||
      value === "投稿日時"
    );
  }

  private formatNumber(value: number | undefined): string | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }
    return value.toLocaleString("ja-JP");
  }

  private formatDateTime(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
}
