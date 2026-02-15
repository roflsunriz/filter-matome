import "@/types/global.d.ts";

import { Mylist2Manager } from "@/mylist2/components/manager-refactored";
import { ModalService } from "@/mylist2/ui/modal-service";
import { ProgressService } from "@/mylist2/ui/progress-service";
import { EventHandlers } from "@/mylist2/ui/event-handlers";
import type { DBVideo } from "@/types/video-types";
import type { KeywordInfo } from "@/types/mylist-types";
import type { VirtualScrollManager } from "@/mylist2/ui/virtual-scroll";

export class BatchOperations {
  private manager: Mylist2Manager;
  private modalService: ModalService;
  private progressService: ProgressService;
  private eventHandlers: EventHandlers;
  private loadVideos: () => Promise<void>;
  private virtualScrollManager: VirtualScrollManager | null;

  constructor(
    manager: Mylist2Manager,
    modalService: ModalService,
    progressService: ProgressService,
    eventHandlers: EventHandlers,
    loadVideos: () => Promise<void>,
    virtualScrollManager?: VirtualScrollManager,
  ) {
    this.manager = manager;
    this.modalService = modalService;
    this.progressService = progressService;
    this.eventHandlers = eventHandlers;
    this.loadVideos = loadVideos;
    this.virtualScrollManager = virtualScrollManager ?? null;
  }

  // =============================================
  // データベースの一括操作（仮想スクロール対応）
  // =============================================

  /**
   * 一括移動の処理（データベース）
   */
  async moveSelectedItemsFromData(
    videos: DBVideo[],
    keywords: KeywordInfo[],
  ): Promise<void> {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "移動",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist(),
    );
    if (!targetMylistId) return;

    // 動画の移動
    for (const video of videos) {
      await this.manager.addVideo(targetMylistId, video);
      await this.manager.deleteVideo(video.id);
    }

    // キーワードの移動
    for (const keyword of keywords) {
      if (keyword.id !== undefined) {
        await this.manager.moveKeyword(keyword.id, targetMylistId);
      }
    }

    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を移動しました");
  }

  /**
   * 一括コピーの処理（データベース）
   */
  async copySelectedItemsFromData(
    videos: DBVideo[],
    keywords: KeywordInfo[],
  ): Promise<void> {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "コピー",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist(),
    );
    if (!targetMylistId) return;

    // 動画のコピー
    for (const video of videos) {
      await this.manager.addVideo(targetMylistId, video);
    }

    // キーワードのコピー
    for (const keyword of keywords) {
      await this.manager.addKeyword(targetMylistId, keyword.keyword);
    }

    await this.modalService.showCustomAlert("選択した項目をコピーしました");
  }

  /**
   * 一括削除の処理（データベース）
   */
  async deleteSelectedItemsFromData(
    videos: DBVideo[],
    keywords: KeywordInfo[],
  ): Promise<void> {
    const titles: string[] = [];

    // 動画タイトルの収集
    for (const video of videos) {
      titles.push(video.title);
    }

    // キーワードの収集
    for (const keyword of keywords) {
      titles.push(`キーワード: ${keyword.keyword}`);
    }

    const confirmMessage =
      `以下の${titles.length}件の項目を削除しますか？\n\n` +
      titles.slice(0, 10).map((title) => `・${title}`).join("\n") +
      (titles.length > 10 ? `\n...他${titles.length - 10}件` : "");

    if (!(await this.modalService.showCustomConfirm(confirmMessage))) return;

    // 動画の削除
    for (const video of videos) {
      await this.manager.deleteVideo(video.id);
    }

    // キーワードの削除
    for (const keyword of keywords) {
      if (keyword.id !== undefined) {
        await this.manager.deleteKeyword(keyword.id);
      }
    }

    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を削除しました");
  }

  /**
   * 一括情報更新の処理（データベース）
   */
  async refreshSelectedVideosFromData(videos: DBVideo[]): Promise<void> {
    const total = videos.length;
    let processed = 0;
    const batchSize = 50;

    this.progressService.showProgress();

    try {
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (!video) continue;

        const videoId = video.originalId;
        const compositeId = video.id;

        try {
          // キャッシュを無効化して最新のAPI情報を取得する
          this.manager.invalidateVideoCache(videoId);
          const videoInfo = await this.manager.fetchVideoInfo(videoId);

          // データベースの情報を更新
          await this.manager.updateVideoInfo(compositeId, videoInfo);

          processed++;

          // 進捗表示を更新
          this.progressService.updateProgress(processed, total);
        } catch (error) {
          window.logger.error(`動画ID ${videoId} の更新に失敗:`, error);
        }

        // 200ミリ秒待機
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 50件ごとに2秒待機
        if (processed % batchSize === 0 && i < videos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // 完了後に一覧を再読み込み
      await this.loadVideos();
      await this.modalService.showCustomAlert(
        `${processed}件の動画情報を更新しました`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "動画情報の更新に失敗しました";
      throw new Error("動画情報の更新に失敗しました: " + errorMessage);
    } finally {
      this.progressService.hideProgress();
    }
  }

  // =============================================
  // DOM要素ベースの一括操作（後方互換性のため残す）
  // =============================================

  /**
   * 一括移動の処理（DOM要素）
   * @deprecated 仮想スクロール対応のため moveSelectedItemsFromData を使用してください
   */
  async moveSelectedItems(
    videos: HTMLElement[],
    keywords: HTMLElement[],
  ): Promise<void> {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "移動",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist(),
    );
    if (!targetMylistId) return;

    // 動画の移動
    for (const video of videos) {
      const videoData = await this.eventHandlers.getVideoData(video);
      if (videoData) {
        await this.manager.addVideo(targetMylistId, videoData);

        const compositeId = video.dataset.compositeId;
        if (compositeId) {
          await this.manager.deleteVideo(compositeId);
        }
      }
    }

    // キーワードの移動
    for (const keyword of keywords) {
      const keywordIdStr = keyword.dataset.id;
      if (keywordIdStr) {
        const keywordId = parseInt(keywordIdStr);
        await this.manager.moveKeyword(keywordId, targetMylistId);
      }
    }

    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を移動しました");
  }

  /**
   * 一括コピーの処理（DOM要素）
   * @deprecated 仮想スクロール対応のため copySelectedItemsFromData を使用してください
   */
  async copySelectedItems(
    videos: HTMLElement[],
    keywords: HTMLElement[],
  ): Promise<void> {
    const targetMylistId = await this.modalService.showMylistSelectModal(
      "コピー",
      await this.manager.getAllMylists(),
      this.eventHandlers.getCurrentMylist(),
    );
    if (!targetMylistId) return;

    // 動画のコピー
    for (const video of videos) {
      const videoData = await this.eventHandlers.getVideoData(video);
      if (videoData) {
        await this.manager.addVideo(targetMylistId, videoData);
      }
    }

    // キーワードのコピー
    for (const keyword of keywords) {
      const keywordTextElement = keyword.querySelector(".keyword-text");
      if (keywordTextElement && keywordTextElement.textContent) {
        await this.manager.addKeyword(
          targetMylistId,
          keywordTextElement.textContent,
        );
      }
    }

    await this.modalService.showCustomAlert("選択した項目をコピーしました");
  }

  /**
   * 一括削除の処理（DOM要素）
   * @deprecated 仮想スクロール対応のため deleteSelectedItemsFromData を使用してください
   */
  async deleteSelectedItems(
    videos: HTMLElement[],
    keywords: HTMLElement[],
  ): Promise<void> {
    const titles: string[] = [];

    // 動画タイトルの収集
    for (const video of videos) {
      const titleElement =
        video.querySelector(".video-title-link") ||
        video.querySelector(".video-title");
      if (titleElement && titleElement.textContent) {
        titles.push(titleElement.textContent);
      }
    }

    // キーワードの収集
    for (const keyword of keywords) {
      const keywordTextElement = keyword.querySelector(".keyword-text");
      if (keywordTextElement && keywordTextElement.textContent) {
        titles.push(`キーワード: ${keywordTextElement.textContent}`);
      }
    }

    const confirmMessage =
      `以下の${titles.length}件の項目を削除しますか？\n\n` +
      titles.map((title) => `・${title}`).join("\n");

    if (!(await this.modalService.showCustomConfirm(confirmMessage))) return;

    // 動画の削除
    for (const video of videos) {
      const compositeId = video.dataset.compositeId;
      if (compositeId) {
        await this.manager.deleteVideo(compositeId);
      }
    }

    // キーワードの削除
    for (const keyword of keywords) {
      const keywordIdStr = keyword.dataset.id;
      if (keywordIdStr) {
        const keywordId = parseInt(keywordIdStr);
        await this.manager.deleteKeyword(keywordId);
      }
    }

    await this.loadVideos();
    await this.modalService.showCustomAlert("選択した項目を削除しました");
  }

  /**
   * 一括情報更新の処理（DOM要素）
   * @deprecated 仮想スクロール対応のため refreshSelectedVideosFromData を使用してください
   */
  async refreshSelectedVideos(selectedVideos: HTMLElement[]): Promise<void> {
    const total = selectedVideos.length;
    let processed = 0;
    const batchSize = 50;

    this.progressService.showProgress();

    try {
      for (let i = 0; i < selectedVideos.length; i++) {
        const video = selectedVideos[i];
        if (!video) continue;
        const videoId = video.dataset.id;
        const compositeId = video.dataset.compositeId;

        if (!videoId || !compositeId) continue;

        try {
          // キャッシュを無効化して最新のAPI情報を取得する
          this.manager.invalidateVideoCache(videoId);
          const videoInfo = await this.manager.fetchVideoInfo(videoId);

          // データベースの情報を更新
          await this.manager.updateVideoInfo(compositeId, videoInfo);

          processed++;

          // 進捗表示を更新
          this.progressService.updateProgress(processed, total);
          video.style.opacity = "0.5";
        } catch (error) {
          window.logger.error(`動画ID ${videoId} の更新に失敗:`, error);
        }

        // 200ミリ秒待機
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 50件ごとに2秒待機
        if (processed % batchSize === 0 && i < selectedVideos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // 完了後に一覧を再読み込み
      await this.loadVideos();
      await this.modalService.showCustomAlert(
        `${processed}件の動画情報を更新しました`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "動画情報の更新に失敗しました";
      throw new Error("動画情報の更新に失敗しました: " + errorMessage);
    } finally {
      this.progressService.hideProgress();
    }
  }
}
