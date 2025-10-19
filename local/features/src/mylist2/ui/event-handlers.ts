import "@/types/global.d.ts";
import { DBVideo } from "@/types/video-types";
import { MylistInfo, MylistManager } from "@/types/mylist-types";

// 最低限のサービスインターフェース定義
interface ModalService {
  showCustomConfirm(message: string): Promise<boolean>;
  showCustomAlert(message: string): Promise<boolean>;
  showMylistSelectModal(
    action: string, 
    mylists: MylistInfo[], 
    currentMylistId: number | null, 
    itemTitle: string
  ): Promise<number | null>;
  showKeywordEditModal(keywordId: number, currentKeyword: string): Promise<string | null>;
}

interface ValidationService {
  sanitizeInput(input: string): string;
  validateInput(input: string, type?: string): string;
}

interface ProgressService {
  showProgress(): void;
  hideProgress(): void;
  updateProgress(current: number, total: number): void;
}

interface FileHelperService {
  parseLength(lengthStr: string): number;
}

export class EventHandlers {
  private manager: MylistManager;
  private modalService: ModalService;
  private validationService: ValidationService;
  private progressService: ProgressService;
  private fileHelperService: FileHelperService;
  private getCurrentMylistId: () => number | null;
  private setCurrentMylistId: (id: number | null) => void;
  private loadMylists: () => Promise<void>;
  private loadVideos: () => Promise<void>;

  constructor(
    manager: MylistManager,
    modalService: ModalService,
    validationService: ValidationService,
    progressService: ProgressService,
    fileHelperService: FileHelperService,
    getCurrentMylistId: () => number | null,
    setCurrentMylistId: (id: number | null) => void,
    loadMylists: () => Promise<void>,
    loadVideos: () => Promise<void>
  ) {
    this.manager = manager;
    this.modalService = modalService;
    this.validationService = validationService;
    this.progressService = progressService;
    this.fileHelperService = fileHelperService;
    this.getCurrentMylistId = getCurrentMylistId;
    this.setCurrentMylistId = setCurrentMylistId;
    this.loadMylists = loadMylists;
    this.loadVideos = loadVideos;
  }

  // BatchOperationsから呼び出されるためのパブリックメソッド
  public getCurrentMylist(): number | null {
    return this.getCurrentMylistId();
  }

  // 動画操作ハンドラー
  async handleVideoMove(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const videoItem = target.closest(".video-item") as HTMLElement;
    if (!videoItem) return;
    
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    
    const videoTitle = titleElement.textContent || "";
    
    await this.moveVideo(videoItem, videoTitle);
  }

  async handleVideoCopy(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const videoItem = target.closest(".video-item") as HTMLElement;
    if (!videoItem) return;
    
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    
    const videoTitle = titleElement.textContent || "";
    
    await this.copyVideo(videoItem, videoTitle);
  }

  async handleVideoDelete(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const videoItem = target.closest(".video-item") as HTMLElement;
    if (!videoItem) return;
    
    const compositeId = videoItem.dataset.compositeId;
    if (!compositeId) return;
    
    const titleElement = videoItem.querySelector(".video-title");
    if (!titleElement) return;
    
    const videoTitle = titleElement.textContent || "";

    if (await this.modalService.showCustomConfirm(`「${videoTitle}」をマイリストから削除しますか？`)) {
      try {
        await this.manager.deleteVideo(compositeId);
        await this.loadVideos();
      } catch (error) {
        window.logger.error("動画の削除に失敗しました:", error);
      }
    }
  }

  async handleVideoRefresh(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLButtonElement;
    const videoItem = target.closest(".video-item") as HTMLElement;
    if (!videoItem) return;
    
    const videoId = videoItem.dataset.id;
    const compositeId = videoItem.dataset.compositeId;
    
    if (!videoId || !compositeId) return;

    try {
      target.disabled = true;
      target.textContent = "更新中...";

      this.progressService.showProgress();
      this.progressService.updateProgress(0, 1);

      const videoInfo = await this.manager.fetchVideoInfo(videoId);
      await this.manager.updateVideoInfo(compositeId, videoInfo);
      await this.loadVideos();
      this.progressService.updateProgress(1, 1);
    } catch (error) {
      window.logger.error("動画情報の更新に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      await this.modalService.showCustomAlert("動画情報の更新に失敗しました: " + errorMessage);

      target.disabled = false;
      target.textContent = "情報更新";
    } finally {
      this.progressService.hideProgress();
    }
  }

  // キーワード操作ハンドラー
  async handleKeywordMove(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const item = target.closest(".keyword-item") as HTMLElement;
    if (!item) return;
    
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    
    const keywordId = parseInt(keywordIdStr);
    
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    
    const keywordText = keywordTextElement.textContent || "";

    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("移動", mylists, currentMylistId, keywordText);
      if (!targetMylistId) return;

      await this.manager.moveKeyword(keywordId, targetMylistId);
      await this.loadVideos();
      await this.modalService.showCustomAlert("キーワードを移動しました");
    } catch (error) {
      window.logger.error("キーワードの移動に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードの移動に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }

  async handleKeywordCopy(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const item = target.closest(".keyword-item") as HTMLElement;
    if (!item) return;
    
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    
    const keywordText = keywordTextElement.textContent || "";

    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("コピー", mylists, currentMylistId, keywordText);
      if (!targetMylistId) return;

      await this.manager.addKeyword(targetMylistId, keywordText);
      await this.modalService.showCustomAlert("キーワードをコピーしました");
    } catch (error) {
      window.logger.error("キーワードのコピーに失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードのコピーに失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }

  async handleKeywordDelete(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const item = target.closest(".keyword-item") as HTMLElement;
    if (!item) return;
    
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    
    const keywordId = parseInt(keywordIdStr);
    
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    
    const keywordText = keywordTextElement.textContent || "";

    if (await this.modalService.showCustomConfirm(`キーワード「${keywordText}」を削除しますか？`)) {
      try {
        await this.manager.deleteKeyword(keywordId);
        await this.loadVideos();
        await this.modalService.showCustomAlert("キーワードを削除しました");
      } catch (error) {
        window.logger.error("キーワードの削除に失敗しました:", error);
        const errorMessage = error instanceof Error ? error.message : "キーワードの削除に失敗しました";
        await this.modalService.showCustomAlert(errorMessage);
      }
    }
  }

  async handleKeywordEdit(event: Event): Promise<void> {
    if (!event.target) return;
    
    const target = event.target as HTMLElement;
    const item = target.closest(".keyword-item") as HTMLElement;
    if (!item) return;
    
    const keywordIdStr = item.dataset.id;
    if (!keywordIdStr) return;
    
    const keywordId = parseInt(keywordIdStr);
    
    const keywordTextElement = item.querySelector(".keyword-text");
    if (!keywordTextElement) return;
    
    const currentKeyword = keywordTextElement.textContent || "";

    try {
      const newKeyword = await this.modalService.showKeywordEditModal(keywordId, currentKeyword);
      if (!newKeyword) return;

      await this.manager.updateKeyword(keywordId, newKeyword);
      await this.loadVideos();
      await this.modalService.showCustomAlert("キーワードを編集しました");
    } catch (error) {
      window.logger.error("キーワードの編集に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "キーワードの編集に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }

  // 動画移動メソッド
  async moveVideo(videoItem: HTMLElement, videoTitle: string): Promise<void> {
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("移動", mylists, currentMylistId, videoTitle);
      if (!targetMylistId) return;

      const compositeId = videoItem.dataset.compositeId;
      if (!compositeId) {
        throw new Error("動画IDが取得できません");
      }
      
      const videoData = await this.getVideoData(videoItem);
      if (!videoData) {
        throw new Error("動画データが取得できません");
      }

      await this.manager.addVideo(targetMylistId, videoData);
      await this.manager.deleteVideo(compositeId);
      await this.loadVideos();

      await this.modalService.showCustomAlert("動画を移動しました");
    } catch (error) {
      window.logger.error("動画の移動に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "動画の移動に失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }

  // 動画コピーメソッド
  async copyVideo(videoItem: HTMLElement, videoTitle: string): Promise<void> {
    try {
      const mylists = await this.manager.getAllMylists();
      const currentMylistId = this.getCurrentMylistId();
      const targetMylistId = await this.modalService.showMylistSelectModal("コピー", mylists, currentMylistId, videoTitle);
      if (!targetMylistId) return;

      const videoData = await this.getVideoData(videoItem);
      if (!videoData) {
        throw new Error("動画データが取得できません");
      }
      
      await this.manager.addVideo(targetMylistId, videoData);
      await this.modalService.showCustomAlert("動画をコピーしました");
    } catch (error) {
      window.logger.error("動画のコピーに失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "動画のコピーに失敗しました";
      await this.modalService.showCustomAlert(errorMessage);
    }
  }

  // getVideoDataメソッド（publicに変更）
  public async getVideoData(videoItem: HTMLElement): Promise<DBVideo | null> {
    await Promise.resolve();
    const id = videoItem.dataset.id;
    const titleElement = videoItem.querySelector(".video-title-link") || videoItem.querySelector(".video-title");
    const viewCountElement = videoItem.querySelector(".view-count");
    const commentCountElement = videoItem.querySelector(".comment-count");
    const mylistCountElement = videoItem.querySelector(".mylist-count");
    const thumbnailElement = videoItem.querySelector(".video-thumbnail") as HTMLImageElement;
    const uploadDateElement = videoItem.querySelector(".video-upload-date");
    const authorElement = videoItem.querySelector(".video-author");
    const lengthElement = videoItem.querySelector(".video-length");

    if (!id) {
      window.logger.error("動画IDが取得できません");
      return null;
    }

    const currentMylistId = this.getCurrentMylistId();
    if (currentMylistId === null) {
      window.logger.error("現在のマイリストIDが設定されていません");
      return null;
    }

    // データの安全な抽出
    const title = titleElement?.textContent || "無題";
    const viewCount = parseInt(viewCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const commentCount = parseInt(commentCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const mylistCount = parseInt(mylistCountElement?.textContent?.replace(/[^0-9]/g, "") || "0");
    const thumbnailUrl = thumbnailElement?.src || "";
    
    // 日付の安全な解析
    let uploadedAt = Date.now();
    if (uploadDateElement?.textContent) {
      const dateStr = uploadDateElement.textContent.replace("投稿日: ", "");
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        uploadedAt = parsedDate.getTime();
      }
    }
    
    const authorName = authorElement?.textContent?.replace("投稿者: ", "") || "不明";
    const length = lengthElement ? this.fileHelperService.parseLength(lengthElement.textContent || "") : 0;

    // data-* 属性から説明/タグ/メモを取得（存在すれば保持）
    const descriptionFromDom = videoItem.dataset.description;
    let tagsFromDom: string[] | undefined;
    const rawTags = videoItem.dataset.tags;
    if (rawTags) {
      try {
        const parsed: unknown = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          const onlyStrings = (parsed as unknown[]).filter((t): t is string => typeof t === 'string');
          tagsFromDom = onlyStrings;
        }
      } catch (e) {
        void e;
      }
    }
    const memoFromDom = videoItem.dataset.memo;

    const result: DBVideo = {
      id: id,
      originalId: id,
      title: title,
      viewCount: viewCount,
      commentCount: commentCount,
      mylistCount: mylistCount,
      thumbnailUrl: thumbnailUrl,
      uploadedAt: uploadedAt,
      authorName: authorName,
      length: length,
      // 可能なら説明/タグ/メモを保持
      ...(descriptionFromDom ? { description: descriptionFromDom } : {}),
      ...(tagsFromDom && tagsFromDom.length > 0 ? { tags: tagsFromDom } : {}),
      ...(memoFromDom !== undefined ? { memo: memoFromDom } : {}),
      addedAt: Date.now(),
      mylistId: currentMylistId
    };
    return result;
  }
}
