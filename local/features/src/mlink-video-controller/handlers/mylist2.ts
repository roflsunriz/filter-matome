import "@/types/global.d.ts";

import { Mylist2Manager } from "@/mylist2/components/manager-refactored.js";
import { VideoInfo } from "@/types/video-types.js";
import { showMylistSelector } from "@/mylist2/components/selector.js";

export class Mylist2Handler {
  private manager: Mylist2Manager;

  constructor() {
    this.manager = new Mylist2Manager();
  }

  async handleAddVideo(): Promise<void> {
    try {
      // watchページかどうかを確認
      if (!/\/watch\/[a-z]{2}\d+/.test(location.pathname)) {
        throw new Error(
          "動画ページでのみ使用できます（現在のページ: " +
            location.pathname +
            "）",
        );
      }

      // SPA対応: fetchWatchPageでAPIデータを確実に取得
      const videoId = window.commonHelper.extractVideoIdFromUrl(
        window.location,
      );
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

      const mylistId = await showMylistSelector();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
      }

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
      // SPA対応: 最新のURLから動的にキーワードを抽出
      const keyword = this.extractSearchKeyword(window.location.href);
      if (!keyword) {
        throw new Error(
          "キーワードを取得できませんでした。検索ページ、タグページ、またはマイリスト検索ページで使用してください。",
        );
      }
      const mylistId = await showMylistSelector();
      if (!mylistId) {
        throw new Error("マイリストが選択されていません");
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
    try {
      const urlObj = new URL(url);

      // 検索ページの場合
      if (urlObj.pathname.startsWith("/search/")) {
        const keyword = urlObj.pathname.replace("/search/", "").trim();
        if (!keyword) return null;
        try {
          return decodeURIComponent(keyword);
        } catch {
          // デコードに失敗した場合はそのまま返す
          return keyword;
        }
      }

      // タグページの場合
      if (urlObj.pathname.startsWith("/tag/")) {
        const keyword = urlObj.pathname.replace("/tag/", "").trim();
        if (!keyword) return null;
        try {
          return decodeURIComponent(keyword);
        } catch {
          return keyword;
        }
      }

      // マイリスト検索の場合
      if (urlObj.pathname.startsWith("/mylist_search/")) {
        const keyword = urlObj.pathname.replace("/mylist_search/", "").trim();
        if (!keyword) return null;
        try {
          return decodeURIComponent(keyword);
        } catch {
          return keyword;
        }
      }

      window.logger.debug(
        "対応していないページタイプ:",
        urlObj.pathname,
        "（検索ページ、タグページ、マイリスト検索ページのみ対応）",
      );
      return null;
    } catch (error) {
      window.logger.error("キーワード抽出エラー:", error);
      return null;
    }
  }
}
