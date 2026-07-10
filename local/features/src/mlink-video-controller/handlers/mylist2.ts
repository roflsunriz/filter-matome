import "@/types/global.d.ts";

import { Mylist2Manager } from "@/mylist2/components/manager-refactored.js";
import { VideoInfo } from "@/types/video-types.js";
import { showMylistSelector } from "@/mylist2/components/selector.js";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect.js";

type Mylist2Writer = Pick<Mylist2Manager, "addVideo" | "addKeyword">;
type MylistSelector = () => Promise<number>;

const SEARCH_PAGE_PREFIXES = ["/search/", "/tag/", "/mylist_search/"];

const decodeKeyword = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const extractMylist2SearchKeyword = (url: string): string | null => {
  try {
    const { pathname } = new URL(url, window.location.href);
    const prefix = SEARCH_PAGE_PREFIXES.find((candidate) =>
      pathname.startsWith(candidate),
    );
    if (!prefix) {
      return null;
    }

    const keyword = pathname.slice(prefix.length).trim();
    return keyword ? decodeKeyword(keyword) : null;
  } catch (error) {
    window.logger?.error("キーワード抽出エラー:", error);
    return null;
  }
};

export const isMylist2AddSupportedPage = (): boolean =>
  isWatchLikePage() ||
  extractMylist2SearchKeyword(window.location.href) !== null;

export class Mylist2Handler {
  private readonly manager: Mylist2Writer;
  private readonly selectMylist: MylistSelector;

  constructor(
    manager: Mylist2Writer = new Mylist2Manager(),
    selectMylist: MylistSelector = showMylistSelector,
  ) {
    this.manager = manager;
    this.selectMylist = selectMylist;
  }

  async handleAddFromCurrentPage(): Promise<void> {
    if (isWatchLikePage()) {
      await this.handleAddVideo();
      return;
    }
    await this.handleAddKeyword();
  }

  async handleAddVideo(): Promise<void> {
    try {
      if (!isWatchLikePage()) {
        throw new Error(
          "動画ページでのみ使用できます（現在のページ: " +
            window.location.pathname +
            "）",
        );
      }

      // SPA遷移後もNicoCache_nl内の古い状態を使わず、現在URLを正とする。
      const videoId = await this.getCurrentVideoId();
      if (!videoId) {
        throw new Error(
          "動画IDの取得に失敗しました。URLが正しいか確認してください。",
        );
      }

      const watchPageResult = await window.commonHelper.fetchWatchPage(videoId);
      if (!watchPageResult?.apiData?.video) {
        throw new Error(
          "動画情報の取得に失敗しました。ページが完全に読み込まれてから再度お試しください。",
        );
      }

      // 型ガード: apiDataが確実に存在することを保証
      const { apiData } = watchPageResult;

      // video情報の型安全な取得
      const video = apiData.video as {
        id: string;
        title: string;
        description?: string;
        registeredAt: string;
        duration?: number;
        count?: {
          view?: number;
          comment?: number;
          mylist?: number;
        };
        thumbnail?: {
          url?: string;
        };
      };

      const owner = apiData.owner as { nickname?: string } | null | undefined;
      const channel = apiData.channel as { name?: string } | null | undefined;

      if (!video.id || !video.title || !video.registeredAt) {
        throw new Error("必須の動画情報が不足しています");
      }
      if (video.id.toLowerCase() !== videoId.toLowerCase()) {
        throw new Error(
          "現在の動画と取得した動画情報が一致しません。もう一度お試しください。",
        );
      }

      await this.assertCurrentVideo(videoId);

      const videoInfo: VideoInfo = {
        id: video.id,
        title: video.title,
        viewCount: video.count?.view || 0,
        commentCount: video.count?.comment || 0,
        mylistCount: video.count?.mylist || 0,
        thumbnailUrl: video.thumbnail?.url || "",
        uploadedAt: new Date(video.registeredAt).getTime(),
        authorName: owner?.nickname || channel?.name || "不明",
        length: video.duration || 0,
        description: video.description || "",
        tags: (() => {
          try {
            const items =
              (
                apiData as unknown as {
                  tag?: { items?: Array<{ name?: string }> };
                }
              ).tag?.items || [];
            const tagNames = items
              .map((t) => (t?.name || "").trim())
              .filter(Boolean);
            return tagNames.length > 0 ? tagNames : undefined;
          } catch {
            return undefined;
          }
        })(),
      };

      const mylistId = await this.selectMylist();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
      }

      // 選択モーダルを開いている間にSPA遷移した場合、前の動画を誤登録しない。
      await this.assertCurrentVideo(videoId);
      const result = await this.manager.addVideo(mylistId, videoInfo);

      window.toastr.success(`${videoInfo.title}\nMylist2`, result, {
        timeOut: 5000,
      });
    } catch (error: unknown) {
      window.logger.error("エラーの詳細:", error);
      window.toastr.error(
        `${error instanceof Error ? error.message : "エラーが発生しました"}\nMylist2`,
        "エラー",
        { timeOut: 5000 },
      );
    }
  }

  async handleAddKeyword(): Promise<void> {
    try {
      const keyword = this.extractSearchKeyword(window.location.href);
      if (!keyword) {
        throw new Error(
          "キーワードを取得できませんでした。検索ページ、タグページ、またはマイリスト検索ページで使用してください。",
        );
      }
      const mylistId = await this.selectMylist();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
      }

      // 選択中に検索先が変わった場合、遷移前のキーワードを誤登録しない。
      if (this.extractSearchKeyword(window.location.href) !== keyword) {
        throw new Error(
          "ページが遷移したため追加を中止しました。現在のページでもう一度お試しください。",
        );
      }
      await this.manager.addKeyword(mylistId, keyword);

      window.toastr.success(`${keyword}\nMylist2`, "キーワードを追加しました", {
        timeOut: 5000,
      });
    } catch (error: unknown) {
      window.logger.error("エラーの詳細:", error);
      window.toastr.error(
        `${error instanceof Error ? error.message : "エラーが発生しました"}\nMylist2`,
        "エラー",
        { timeOut: 5000 },
      );
    }
  }

  extractSearchKeyword(url: string): string | null {
    const keyword = extractMylist2SearchKeyword(url);
    if (!keyword) {
      window.logger.debug(
        "対応していないページタイプ:",
        url,
        "（検索ページ、タグページ、マイリスト検索ページのみ対応）",
      );
    }
    return keyword;
  }

  private async getCurrentVideoId(): Promise<string | null> {
    return await window.commonHelper.getVideoIdWithFallback(window.location);
  }

  private async assertCurrentVideo(expectedVideoId: string): Promise<void> {
    const currentVideoId = isWatchLikePage()
      ? await this.getCurrentVideoId()
      : null;
    if (currentVideoId?.toLowerCase() !== expectedVideoId.toLowerCase()) {
      throw new Error(
        "ページが遷移したため追加を中止しました。現在の動画でもう一度お試しください。",
      );
    }
  }
}
