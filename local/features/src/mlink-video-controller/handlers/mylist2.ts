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
      const apiData = window.NicoCache_nl.watch.apiData;
      if (!apiData || !apiData.video) {
        throw new Error("動画情報の取得に失敗しました");
      }

      const videoInfo: VideoInfo = {
        id: apiData.video.id,
        title: apiData.video.title,
        viewCount: apiData.video.count.view || 0,
        commentCount: apiData.video.count.comment || 0,
        mylistCount: apiData.video.count.mylist || 0,
        thumbnailUrl: apiData.video.thumbnail.url,
        uploadedAt: new Date(apiData.video.registeredAt).getTime(),
        authorName: apiData.owner?.nickname || apiData.channel?.name || "不明",
        length: apiData.video.duration,
        description: apiData.video.description || "",
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
      const keyword = this.extractSearchKeyword(window.location.href);
      if (!keyword) {
        throw new Error("キーワードを取得できませんでした");
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
        return decodeURIComponent(urlObj.pathname.replace("/search/", ""));
      }

      // タグページの場合
      if (urlObj.pathname.startsWith("/tag/")) {
        return decodeURIComponent(urlObj.pathname.replace("/tag/", ""));
      }

      // マイリスト検索の場合
      if (urlObj.pathname.startsWith("/mylist_search/")) {
        return decodeURIComponent(
          urlObj.pathname.replace("/mylist_search/", ""),
        );
      }

      return null;
    } catch (error) {
      window.logger.error("キーワード抽出エラー:", error);
      return null;
    }
  }
}
