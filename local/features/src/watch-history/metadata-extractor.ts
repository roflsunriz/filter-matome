import type { NicoApiData } from "@/types/common-types";
import type {
  SeriesInfo,
  SeriesVideoInfo,
  VideoStats,
} from "@/types/watch-history-types";

/** Nico API・DOMフォールバックから履歴表示用メタデータを正規化する。 */
export class WatchMetadataExtractor {
  constructor(
    private readonly getVideoElement: () => HTMLVideoElement | null,
  ) {}

  public extractTitle(apiData: NicoApiData): string | null {
    try {
      // 複数の可能性を試す
      const videoData = apiData.video as {
        title?: string;
        name?: string;
        [key: string]: unknown;
      };
      return (
        videoData?.title ||
        videoData?.name ||
        document.querySelector("h1.VideoTitle")?.textContent ||
        document.title.replace(" - ニコニコ動画", "") ||
        null
      );
    } catch (error) {
      window?.logger.warn("タイトル抽出エラー:", error);
      return null;
    }
  }

  /**
   * 投稿者IDを抽出する
   */
  public extractOwnerId(apiData: NicoApiData): string | null {
    try {
      const ownerData = apiData.owner as {
        id?: string | number;
        [key: string]: unknown;
      };
      const channelData = apiData.channel as {
        id?: string | number;
        [key: string]: unknown;
      };
      const videoData = apiData.video as {
        owner?: { id?: string | number; [key: string]: unknown };
        [key: string]: unknown;
      };

      const id =
        ownerData?.id || channelData?.id || videoData?.owner?.id || null;
      return id ? String(id) : null;
    } catch (error) {
      window?.logger.warn("投稿者ID抽出エラー:", error);
      return null;
    }
  }

  /**
   * 投稿者名を抽出する
   */
  public extractOwnerName(apiData: NicoApiData): string | null {
    try {
      const ownerData = apiData.owner as {
        nickname?: string;
        [key: string]: unknown;
      };
      const channelData = apiData.channel as {
        name?: string;
        [key: string]: unknown;
      };
      const videoData = apiData.video as {
        owner?: { nickname?: string; [key: string]: unknown };
        [key: string]: unknown;
      };

      return (
        ownerData?.nickname ||
        channelData?.name ||
        videoData?.owner?.nickname ||
        document.querySelector(".VideoOwner-name")?.textContent ||
        null
      );
    } catch (error) {
      window?.logger.warn("投稿者名抽出エラー:", error);
      return null;
    }
  }

  /**
   * 動画長を抽出する
   */
  public extractLengthSec(apiData: NicoApiData): number | null {
    try {
      const videoData = apiData.video as {
        duration?: number;
        length?: number;
        [key: string]: unknown;
      };
      return (
        videoData?.duration ||
        videoData?.length ||
        this.getVideoElement()?.duration ||
        0
      );
    } catch (error) {
      window?.logger.warn("動画長抽出エラー:", error);
      return null;
    }
  }

  /**
   * 統計情報を抽出する
   */
  public extractStats(apiData: NicoApiData): VideoStats | null {
    try {
      const videoData = apiData.video as {
        count?: {
          view?: number;
          comment?: number;
          mylist?: number;
          like?: number;
          [key: string]: unknown;
        };
        registeredAt?: string;
        [key: string]: unknown;
      };

      return {
        viewCount: videoData?.count?.view || 0,
        commentCount: videoData?.count?.comment || 0,
        mylistCount: videoData?.count?.mylist || 0,
        likeCount: videoData?.count?.like || 0,
        uploadedAt: videoData?.registeredAt
          ? new Date(videoData.registeredAt).getTime()
          : Date.now(),
      };
    } catch (error) {
      window?.logger.warn("統計情報抽出エラー:", error);
      return null;
    }
  }

  /**
   * タグを抽出する
   */
  public extractTags(apiData: NicoApiData): string[] | null {
    try {
      const tagData = apiData.tag as {
        items?: { name?: string; [key: string]: unknown }[];
        [key: string]: unknown;
      };
      return (
        tagData?.items?.map((tag) => tag.name || "") ||
        Array.from(document.querySelectorAll(".VideoTag")).map(
          (el) => el.textContent || "",
        ) ||
        []
      );
    } catch (error) {
      window?.logger.warn("タグ抽出エラー:", error);
      return null;
    }
  }

  /**
   * サムネイルURLを抽出する
   */
  public extractThumbnailUrl(apiData: NicoApiData): string | null {
    try {
      const videoData = apiData.video as {
        thumbnail?: { url?: string; [key: string]: unknown };
        thumbnailUrl?: string;
        [key: string]: unknown;
      };

      return (
        videoData?.thumbnail?.url ||
        videoData?.thumbnailUrl ||
        document
          .querySelector('meta[property="og:image"]')
          ?.getAttribute("content") ||
        null
      );
    } catch (error) {
      window?.logger.warn("サムネイルURL抽出エラー:", error);
      return null;
    }
  }

  /**
   * シリーズ情報を抽出する
   */
  public extractSeries(apiData: NicoApiData): SeriesInfo | null {
    try {
      const seriesData = apiData.series as {
        id?: number;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        video?: {
          prev?: unknown;
          next?: unknown;
          first?: unknown;
        };
        [key: string]: unknown;
      };

      if (!seriesData || !seriesData.id) {
        return null;
      }

      return {
        id: seriesData.id,
        title: seriesData.title || "",
        description: seriesData.description || "",
        thumbnailUrl: seriesData.thumbnailUrl || "",
        video: {
          prev: seriesData.video?.prev as SeriesVideoInfo | null,
          next: seriesData.video?.next as SeriesVideoInfo | null,
          first: seriesData.video?.first as SeriesVideoInfo | null,
        },
      };
    } catch (error) {
      window?.logger.warn("シリーズ情報抽出エラー:", error);
      return null;
    }
  }
}
