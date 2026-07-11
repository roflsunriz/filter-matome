import "@/types/global.d.ts";

import { Mylist2Manager } from "@/mylist2/components/manager-refactored";
import type {
  MylistInfo,
  KeywordInfo,
  ExportData,
  ManagerSettings,
  VideoLinkTarget,
} from "@/types/mylist-types";
import { DBVideo as VideoInfo } from "@/types/video-types";
import { hydrateMaterialIconImages } from "@/common/material-icons";
import { setThumbnailSource } from "@/common/thumbnail-fallback";

import { ModalService } from "@/mylist2/ui/modal-service";
import { ValidationService } from "@/mylist2/ui/validation-service";
import { ProgressService } from "@/mylist2/ui/progress-service";
import { FileHelperService } from "@/mylist2/ui/file-helper-service";
import { EventHandlers } from "@/mylist2/ui/event-handlers";
import { BatchOperations } from "@/mylist2/ui/batch-operations";
import {
  sanitizeDescriptionHtml,
  buildVideoUrl,
  setVideoLinkTarget,
  needsAvailabilityCheck,
  checkVideoAvailability,
} from "@/mylist2/utils/linkify";
import {
  VirtualScrollManager,
  type VirtualScrollItem,
} from "@/mylist2/ui/virtual-scroll";
import {
  getActionMenuManager,
  type ActionMenuContext,
} from "@/mylist2/ui/action-menu";
import {
  getOrCreateVideoDetailsModal,
  openVideoDetailsModal,
  renderVideoTags,
} from "@/mylist2/ui/video-details-modal";
import { createAvailabilityBadge } from "@/mylist2/ui/availability-badge";
import { renderMylistListItems } from "@/mylist2/ui/mylist-list-renderer";

export class Mylist2ManagerUI {
  private manager: Mylist2Manager;
  private currentMylistId: number | null;
  private videoItemTemplate!: HTMLTemplateElement;
  private keywordItemTemplate!: HTMLTemplateElement;

  // 分離されたサービス
  private modalService: ModalService;
  private validationService: ValidationService;
  private progressService: ProgressService;
  private fileHelperService: FileHelperService;
  private eventHandlers: EventHandlers;
  private batchOperations!: BatchOperations;

  // 仮想スクロールとアクションメニュー
  private virtualScrollManager: VirtualScrollManager;
  private currentVideos: VideoInfo[] = [];
  private currentKeywords: KeywordInfo[] = [];

  // 動画リンク先設定
  private videoLinkTarget: VideoLinkTarget = "official";

  constructor() {
    this.manager = new Mylist2Manager();
    this.currentMylistId = null;

    // サービスの初期化
    this.modalService = new ModalService();
    this.validationService = new ValidationService();
    this.progressService = new ProgressService();
    this.fileHelperService = new FileHelperService();

    // 仮想スクロールマネージャーの初期化
    this.virtualScrollManager = new VirtualScrollManager({
      itemHeight: 92,
      bufferSize: 5,
      containerSelector: "#videoList",
    });

    // イベントハンドラーの初期化
    this.eventHandlers = new EventHandlers(
      this.manager,
      this.modalService,
      this.validationService,
      this.progressService,
      this.fileHelperService,
      () => this.currentMylistId,
      (id: number | null) => {
        this.currentMylistId = id;
      },
      () => this.loadMylists(),
      () => this.loadVideos(),
    );

    // 一括操作の初期化（仮想スクロール対応）
    this.batchOperations = new BatchOperations(
      this.manager,
      this.modalService,
      this.progressService,
      this.eventHandlers,
      () => this.loadVideos(),
      this.virtualScrollManager,
    );

    // テンプレートを最初に初期化
    this.initializeTemplates();

    // 仮想スクロールの初期化
    this.initializeVirtualScroll();

    // video-player ルーティング用 API チェックハンドラの初期化
    this.setupVideoLinkApiCheck();

    // アクションメニューの初期化
    this.initializeActionMenu();

    // イベントリスナーを初期化（ただし設定は後で）
    this.initializeEventListeners();
    this.initializeAdditionalControls();

    // 設定モーダルとFABの初期化
    this.initializeSettingsModal();

    // 設定の初期化（これによってマイリストも読み込まれる）
    void this.initializeSettings();
  }

  private applyTheme(theme: string): void {
    const root = document.getElementById("Mylist2Manager");
    if (!root) return;
    // Remove existing theme classes
    root.classList.forEach((cls) => {
      if (cls.startsWith("cml2-theme-")) root.classList.remove(cls);
    });
    // Add selected theme class; fallback to dark-blue
    const themeClass = `cml2-theme-${theme}`;
    root.classList.add(themeClass);
  }

  // デリゲートメソッド群（各サービスへの橋渡し）
  private guardEvent(
    handler: (event: Event) => Promise<unknown>,
  ): (event: Event) => void {
    return (event: Event) => {
      void handler(event);
    };
  }
  async showCustomAlert(
    message: string,
    type = "info",
    title = "",
  ): Promise<boolean> {
    return this.modalService.showCustomAlert(message, type, title);
  }

  async showCustomConfirm(
    message: string,
    type = "warning",
    title = "",
  ): Promise<boolean> {
    return this.modalService.showCustomConfirm(message, type, title);
  }

  sanitizeInput(input: string): string {
    return this.validationService.sanitizeInput(input);
  }

  validateInput(input: string, type = "text"): string {
    return this.validationService.validateInput(input, type);
  }

  updateProgress(current: number, total: number): void {
    this.progressService.updateProgress(current, total);
  }

  showProgress(): void {
    this.progressService.showProgress();
  }

  hideProgress(): void {
    this.progressService.hideProgress();
  }

  formatDateTime(): string {
    return this.fileHelperService.formatDateTime();
  }

  parseLength(lengthText: string): number {
    return this.fileHelperService.parseLength(lengthText);
  }

  async loadMylists(): Promise<void> {
    try {
      window.logger.info("マイリスト一覧を読み込み中...");

      // 現在のソート設定を取得
      const mylistSortTypeElement = document.getElementById(
        "mylistSortType",
      ) as HTMLSelectElement;
      const sortType = mylistSortTypeElement
        ? mylistSortTypeElement.value
        : "name_asc";

      // ソートされたマイリストを取得
      const mylists = await this.sortMylists(sortType);
      await this.renderMylistList(mylists);
    } catch (error) {
      window.logger.error("マイリスト一覧の読み込みに失敗しました:", error);
    }
  }

  async renderMylistList(mylists: MylistInfo[]): Promise<void> {
    const mylistList = document.getElementById("mylistList");
    if (!mylistList) {
      window.logger.error("マイリストリスト要素が見つかりません");
      return;
    }

    const mylistsWithCount = await Promise.all(
      mylists.map(async (mylist) => {
        // mylist.idがundefinedの場合のチェックを追加
        if (mylist.id === undefined) {
          window.logger.error("マイリストIDが未定義です");
          return { ...mylist, videoCount: 0 };
        }
        const videos = await this.manager.getVideos(mylist.id);
        return {
          ...mylist,
          videoCount: videos.length,
        };
      }),
    );

    renderMylistListItems(
      mylistList,
      mylistsWithCount,
      this.currentMylistId,
      (id) => {
        void this.selectMylist(id);
      },
    );
  }

  async selectMylist(mylistId: number): Promise<void> {
    this.currentMylistId = mylistId;

    // マイリスト情報の表示
    const mylists = await this.manager.getAllMylists();
    const currentMylist = mylists.find((m) => m.id === mylistId);
    if (!currentMylist) {
      window.logger.error("選択されたマイリストが見つかりません");
      return;
    }

    const mylistNameElement = document.getElementById(
      "currentMylistName",
    ) as HTMLInputElement;
    if (mylistNameElement) {
      mylistNameElement.value = currentMylist.name;
    }

    // 動画一覧の表示
    await this.loadVideos();

    // 選択状態の視覚的な更新と動画件数の更新
    const videos = await this.manager.getVideos(mylistId);
    document.querySelectorAll(".mylist-item").forEach((item) => {
      const idAttr = item.getAttribute("data-id");
      if (!idAttr) return;

      const isActive = parseInt(idAttr) === mylistId;
      item.classList.toggle("active", isActive);
      if (isActive) {
        const countElement = item.querySelector(".mylist-count-mylist-tab");
        if (countElement) {
          countElement.textContent = `${videos.length}件`;
        }
      }
    });
  }

  async loadVideos(): Promise<void> {
    if (!this.currentMylistId) {
      window.logger.warn("マイリストが選択されていません");
      return;
    }

    try {
      window.logger.info(
        `マイリスト ${this.currentMylistId} の動画を読み込み中...`,
      );

      // 現在のソート設定を取得
      const videoSortTypeElement = document.getElementById(
        "videoSortType",
      ) as HTMLSelectElement;
      const sortType = videoSortTypeElement
        ? videoSortTypeElement.value
        : "uploadedAt_desc";

      // 動画とキーワードを取得
      const videos = await this.manager.getVideos(this.currentMylistId);
      const keywords = await this.manager.getKeywords(this.currentMylistId);

      // ソートを適用
      const sortedVideos = this.sortVideos(videos, sortType);
      const sortedKeywords = this.sortKeywords(keywords, sortType);

      this.renderVideoList(sortedVideos, sortedKeywords);
    } catch (error) {
      window.logger.error("動画一覧の読み込みに失敗しました:", error);
    }
  }

  sortKeywords(keywords: KeywordInfo[], sortType: string): KeywordInfo[] {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";

    return keywords.sort((a, b) => {
      let comparison = 0;

      switch (type) {
        case "title":
          comparison = a.keyword.localeCompare(b.keyword, "ja");
          break;

        case "addedAt":
          comparison = a.addedAt - b.addedAt;
          break;

        default:
          comparison = a.addedAt - b.addedAt;
      }

      return isAsc ? comparison : -comparison;
    });
  }

  // マイリストのソート処理で型を明示的に指定
  async sortMylists(sortType: string): Promise<MylistInfo[]> {
    // managerのsortMylistsメソッドを使用
    return await this.manager.sortMylists(sortType);
  }

  // sortVideosメソッドを再実装
  sortVideos(videos: VideoInfo[], sortType: string): VideoInfo[] {
    // managerのsortVideosメソッドを使用
    return this.manager.sortVideos(videos, sortType);
  }

  private initializeTemplates(): void {
    const videoTemplateElement = document.getElementById(
      "videoItemTemplate",
    ) as HTMLTemplateElement;
    if (!videoTemplateElement) {
      window.logger.error("動画アイテムのテンプレートが見つかりません！");
      throw new Error("動画アイテムのテンプレートが見つかりません");
    }
    this.videoItemTemplate = videoTemplateElement;

    const keywordTemplateElement = document.getElementById(
      "keywordItemTemplate",
    ) as HTMLTemplateElement;
    if (!keywordTemplateElement) {
      window.logger.error("キーワードアイテムのテンプレートが見つかりません！");
      throw new Error("キーワードアイテムのテンプレートが見つかりません");
    }
    this.keywordItemTemplate = keywordTemplateElement;
  }

  /**
   * 仮想スクロールの初期化
   */
  private initializeVirtualScroll(): void {
    const initialized = this.virtualScrollManager.initialize(
      this.renderVirtualScrollItem.bind(this),
    );

    if (!initialized) {
      window.logger.error("仮想スクロールの初期化に失敗しました");
      return;
    }

    this.virtualScrollManager.onSelectionChange((selectedIds) => {
      const root = document.getElementById("Mylist2Manager");
      const countElement = document.getElementById("selectedItemsCount");
      const count = selectedIds.size;

      root?.classList.toggle("has-selection", count > 0);
      if (countElement) {
        countElement.textContent = count > 0 ? `${count}件を選択中` : "";
      }
      const actionBar = document.querySelector(".selection-action-bar");
      actionBar?.setAttribute("aria-hidden", String(count === 0));

      const selectAllCheckbox = document.getElementById(
        "selectAllVideos",
      ) as HTMLInputElement | null;
      if (selectAllCheckbox) {
        const selectableVideoCount = this.virtualScrollManager
          .getFilteredItems()
          .filter((item) => item.type === "video").length;
        const selectedVideoCount = [...selectedIds].filter((id) =>
          id.startsWith("video:"),
        ).length;
        selectAllCheckbox.checked =
          selectableVideoCount > 0 &&
          selectedVideoCount === selectableVideoCount;
        selectAllCheckbox.indeterminate =
          selectedVideoCount > 0 && selectedVideoCount < selectableVideoCount;
      }
    });

    // アクショントリガーのクリックイベントを委譲で処理
    const container = document.getElementById("videoList");
    if (container) {
      container.addEventListener("click", (e) => {
        const detailsTrigger = (e.target as HTMLElement).closest(
          ".video-details-trigger",
        );
        if (detailsTrigger) {
          e.stopPropagation();
          void this.handleVideoDetailsClick(detailsTrigger as HTMLElement);
          return;
        }

        const trigger = (e.target as HTMLElement).closest(".action-trigger");
        if (trigger) {
          e.stopPropagation();
          this.handleActionTriggerClick(trigger as HTMLElement);
        }
      });
    }

    window.logger.info("仮想スクロールを初期化しました");
  }

  /**
   * video-player ルーティングの API 可用性チェック用クリックハンドラー。
   *
   * data-needs-api-check 属性を持つリンクがクリックされたとき、
   * getthumbinfo API で公開状態を確認し、削除済み/非公開なら video-player へ遷移する。
   * 公開中なら公式プレーヤーへ遷移する。
   */
  private setupVideoLinkApiCheck(): void {
    const container = document.getElementById("videoList");
    if (!container) return;

    container.addEventListener("click", (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const el = e.target.closest("a[data-needs-api-check]");
      if (!el || !(el instanceof HTMLAnchorElement)) return;

      const videoId = el.dataset.videoId;
      if (!videoId) return;

      e.preventDefault();

      const originalText = el.textContent ?? "";
      el.textContent = `${originalText}（確認中…）`;
      el.style.cursor = "wait";
      el.style.pointerEvents = "none";

      void (async () => {
        try {
          const available = await checkVideoAvailability(videoId);
          const url =
            available === false
              ? `/local/features/dist/pages/video-player/index.html?videoId=${encodeURIComponent(videoId)}`
              : `https://www.nicovideo.jp/watch/${videoId}`;
          window.open(url, "_blank");
        } finally {
          el.textContent = originalText;
          el.style.cursor = "";
          el.style.pointerEvents = "";
        }
      })();
    });
  }

  /**
   * 仮想スクロール用のアイテムレンダラー
   */
  private renderVirtualScrollItem(
    item: VirtualScrollItem,
    _index: number,
  ): HTMLElement {
    if (item.type === "video") {
      return this.renderVideoItem(item.data);
    } else {
      return this.renderKeywordItem(item.data);
    }
  }

  /**
   * アクションメニューの初期化
   */
  private initializeActionMenu(): void {
    const actionMenu = getActionMenuManager();

    // 動画用ハンドラーを登録
    actionMenu.registerHandlers({
      move: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          await this.eventHandlers.moveVideo(ctx.element, ctx.data.title);
        } else {
          const keywordId = ctx.data.id;
          if (keywordId !== undefined) {
            const event = { target: ctx.element } as unknown as Event;
            await this.eventHandlers.handleKeywordMove(event);
          }
        }
      },
      copy: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          await this.eventHandlers.copyVideo(ctx.element, ctx.data.title);
        } else {
          const event = { target: ctx.element } as unknown as Event;
          await this.eventHandlers.handleKeywordCopy(event);
        }
      },
      delete: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          const compositeId = ctx.element.dataset.compositeId;
          if (compositeId) {
            const confirmed = await this.modalService.showCustomConfirm(
              `「${ctx.data.title}」をマイリストから削除しますか？`,
            );
            if (confirmed) {
              await this.manager.deleteVideo(compositeId);
              await this.loadVideos();
            }
          }
        } else {
          const event = { target: ctx.element } as unknown as Event;
          await this.eventHandlers.handleKeywordDelete(event);
        }
      },
      refresh: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          const videoId = ctx.data.originalId;
          const compositeId = ctx.element.dataset.compositeId;
          if (videoId && compositeId) {
            try {
              this.progressService.showProgress();
              this.progressService.updateProgress(0, 1);
              const videoInfo = await this.manager.fetchVideoInfo(videoId);
              await this.manager.updateVideoInfo(compositeId, videoInfo);
              await this.loadVideos();
              this.progressService.updateProgress(1, 1);
            } catch (error) {
              window.logger.error("動画情報の更新に失敗しました:", error);
              const errorMessage =
                error instanceof Error ? error.message : "不明なエラー";
              await this.modalService.showCustomAlert(
                "動画情報の更新に失敗しました: " + errorMessage,
              );
            } finally {
              this.progressService.hideProgress();
            }
          }
        }
      },
      details: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          const compositeId = ctx.element.dataset.compositeId;
          const memoFromDom = ctx.element.dataset.memo ?? "";
          await this.showVideoDetailsModal(ctx.data, compositeId, memoFromDom);
        }
      },
      edit: async (ctx: ActionMenuContext) => {
        if (ctx.type === "keyword") {
          const event = { target: ctx.element } as unknown as Event;
          await this.eventHandlers.handleKeywordEdit(event);
        }
      },
    });

    window.logger.info("アクションメニューを初期化しました");
  }

  /**
   * アクショントリガークリック時の処理
   */
  private handleActionTriggerClick(trigger: HTMLElement): void {
    const itemElement = trigger.closest(
      ".video-item, .keyword-item",
    ) as HTMLElement;
    if (!itemElement) return;

    const actionMenu = getActionMenuManager();
    const isKeyword = itemElement.classList.contains("keyword-item");

    if (isKeyword) {
      const keywordIdStr = itemElement.dataset.id;
      if (!keywordIdStr) return;

      const keywordId = parseInt(keywordIdStr, 10);
      const keywordData = this.currentKeywords.find((k) => k.id === keywordId);
      if (!keywordData) return;

      actionMenu.show(trigger, {
        type: "keyword",
        data: keywordData,
        element: itemElement,
      });
    } else {
      const compositeId = itemElement.dataset.compositeId;
      if (!compositeId) return;

      const videoData = this.currentVideos.find((v) => v.id === compositeId);
      if (!videoData) return;

      actionMenu.show(trigger, {
        type: "video",
        data: videoData,
        element: itemElement,
      });
    }
  }

  private async handleVideoDetailsClick(trigger: HTMLElement): Promise<void> {
    const itemElement = trigger.closest<HTMLElement>(".video-item");
    const compositeId = itemElement?.dataset.compositeId;
    if (!itemElement || !compositeId) return;

    const videoData = this.currentVideos.find(
      (video) => video.id === compositeId,
    );
    if (!videoData) return;

    await this.showVideoDetailsModal(
      videoData,
      compositeId,
      itemElement.dataset.memo ?? "",
    );
  }

  private initializeAdditionalControls(): void {
    this.initializeHeaderControls();
    this.initializeSearchEventListeners();
    void this.initializeSettings();
  }

  renderVideoList(videos: VideoInfo[], keywords: KeywordInfo[]): void {
    // 現在のデータを保持（アクションメニューで参照するため）
    this.currentVideos = videos;
    this.currentKeywords = keywords;

    // 仮想スクロール用のデータを構築
    const items: VirtualScrollItem[] = [
      ...keywords.map((k): VirtualScrollItem => ({ type: "keyword", data: k })),
      ...videos.map((v): VirtualScrollItem => ({ type: "video", data: v })),
    ];

    // 仮想スクロールマネージャーにデータを設定
    this.virtualScrollManager.setData(items);
  }

  renderVideoItem(video: VideoInfo): HTMLElement {
    // 保持しているテンプレートを使用
    if (!this.videoItemTemplate) {
      window.logger.error("動画テンプレートが初期化されていません！");
      // フォールバック用の要素を作成（シンプル化済み）
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item";
      const linkCtx = { authorName: video.authorName, title: video.title };
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "video-select";
      const thumbnail = document.createElement("img");
      thumbnail.className = "video-thumbnail";
      setThumbnailSource(thumbnail, video.thumbnailUrl);
      thumbnail.alt = "サムネイル";
      const info = document.createElement("div");
      info.className = "video-info";
      const title = document.createElement("div");
      title.className = "video-title";
      const titleLink = document.createElement("a");
      titleLink.href = buildVideoUrl(video.originalId, linkCtx);
      titleLink.target = "_blank";
      titleLink.textContent = video.title;
      if (needsAvailabilityCheck(video.originalId, linkCtx)) {
        titleLink.dataset.needsApiCheck = "true";
        titleLink.dataset.videoId = video.originalId;
      }
      title.appendChild(titleLink);
      const badge = createAvailabilityBadge(video);
      if (badge) title.appendChild(badge);
      const stats = document.createElement("div");
      stats.className = "video-stats";
      const meta = document.createElement("div");
      meta.className = "video-meta";
      [
        ["view-count", `再生数: ${video.viewCount.toLocaleString()}`],
        ["comment-count", `コメント数: ${video.commentCount.toLocaleString()}`],
        ["mylist-count", `マイリスト数: ${video.mylistCount.toLocaleString()}`],
        [
          "video-length",
          `${Math.floor(video.length / 60)}分${video.length % 60}秒`,
        ],
      ].forEach(([className, text]) => {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text;
        stats.appendChild(span);
      });
      [
        ["video-author", `投稿者: ${video.authorName}`],
        [
          "video-upload-date",
          `投稿日: ${new Date(video.uploadedAt).toLocaleDateString()}`,
        ],
      ].forEach(([className, text]) => {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text;
        meta.appendChild(span);
      });
      const actionButton = document.createElement("button");
      actionButton.className = "video-details-trigger";
      actionButton.type = "button";
      actionButton.setAttribute("aria-label", "動画の詳細");
      actionButton.title = "詳細";
      const actionIcon = document.createElement("img");
      actionIcon.className = "material-icon icon-white";
      actionIcon.dataset.style = "outlined";
      actionIcon.dataset.icon = "info";
      actionIcon.alt = "";
      actionButton.appendChild(actionIcon);
      hydrateMaterialIconImages(actionButton);
      info.append(title, stats, meta);
      fallbackElement.append(checkbox, thumbnail, info, actionButton);
      fallbackElement.dataset.id = video.originalId;
      fallbackElement.dataset.compositeId = video.id;
      return fallbackElement;
    }

    const clone = this.videoItemTemplate.content.cloneNode(
      true,
    ) as DocumentFragment;
    const item = clone.querySelector(".video-item") as HTMLElement;
    if (!item) {
      window.logger.error("動画アイテム要素が見つかりません");
      return document.createElement("div");
    }

    // データの設定
    item.dataset.id = video.originalId;
    item.dataset.compositeId = video.id;
    if (video.description) {
      item.dataset.description = video.description;
    }
    if (video.tags && video.tags.length > 0) {
      try {
        item.dataset.tags = JSON.stringify(video.tags);
      } catch (err) {
        void err;
      }
    }
    // メモ（存在すれば）
    const memoValue = (video as unknown as { memo?: string }).memo;
    if (memoValue !== undefined) {
      item.dataset.memo = String(memoValue);
    }

    // サムネイルと基本情報
    const thumbnailElement = item.querySelector(
      ".video-thumbnail",
    ) as HTMLImageElement;
    if (thumbnailElement) {
      setThumbnailSource(thumbnailElement, video.thumbnailUrl);
    }

    // タイトルをリンクとして設定
    const titleElement = item.querySelector(".video-title");
    if (titleElement) {
      const titleLink = document.createElement("a");
      const trimmedTitle = video.title.replace(
        /^[\p{White_Space}\p{Cf}]+|[\p{White_Space}\p{Cf}]+$/gu,
        "",
      );
      const titleText = trimmedTitle ? trimmedTitle : "無題";
      const linkContext = { authorName: video.authorName, title: video.title };
      titleLink.href = buildVideoUrl(video.originalId, linkContext);
      titleLink.textContent = titleText;
      titleLink.className = "video-title-link";
      titleLink.target = "_blank";
      if (needsAvailabilityCheck(video.originalId, linkContext)) {
        titleLink.dataset.needsApiCheck = "true";
        titleLink.dataset.videoId = video.originalId;
      }
      titleElement.appendChild(titleLink);
      const badge = createAvailabilityBadge(video);
      if (badge) {
        titleElement.appendChild(badge);
      }
    }

    // 統計情報の設定
    this.setVideoStats(item, video);

    hydrateMaterialIconImages(item);

    return item;
  }

  private setVideoStats(item: HTMLElement, video: VideoInfo): void {
    const viewCountElement = item.querySelector(".view-count");
    if (viewCountElement) {
      viewCountElement.textContent = `再生数: ${video.viewCount.toLocaleString()}`;
    }

    const commentCountElement = item.querySelector(".comment-count");
    if (commentCountElement) {
      commentCountElement.textContent = `コメント数: ${video.commentCount.toLocaleString()}`;
    }

    const mylistCountElement = item.querySelector(".mylist-count");
    if (mylistCountElement) {
      mylistCountElement.textContent = `マイリスト数: ${video.mylistCount.toLocaleString()}`;
    }

    const lengthElement = item.querySelector(".video-length");
    if (lengthElement) {
      const minutes = Math.floor(video.length / 60);
      const seconds = video.length % 60;
      lengthElement.textContent = `${minutes}分${seconds}秒`;
    }

    const authorElement = item.querySelector(".video-author");
    if (authorElement) {
      authorElement.textContent = "投稿者: " + video.authorName;
    }

    const uploadDateElement = item.querySelector(".video-upload-date");
    if (uploadDateElement) {
      uploadDateElement.textContent =
        "投稿日: " + new Date(video.uploadedAt).toLocaleDateString();
    }
  }

  renderKeywordItem(keyword: KeywordInfo): HTMLElement {
    if (!this.keywordItemTemplate) {
      window.logger.error("キーワードテンプレートが初期化されていません！");
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item keyword-item";
      const encodedKeyword = encodeURIComponent(keyword.keyword);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "video-select";
      const icon = document.createElement("div");
      icon.className = "keyword-icon";
      const iconImg = document.createElement("img");
      iconImg.className = "material-icon icon-dark";
      iconImg.dataset.style = "outlined";
      iconImg.dataset.icon = "search";
      iconImg.alt = "search";
      iconImg.loading = "lazy";
      icon.appendChild(iconImg);
      const info = document.createElement("div");
      info.className = "video-info";
      const title = document.createElement("div");
      title.className = "video-title";
      const keywordText = document.createElement("span");
      keywordText.className = "keyword-text";
      keywordText.textContent = keyword.keyword;
      title.appendChild(keywordText);
      const meta = document.createElement("div");
      meta.className = "keyword-meta";
      const addedDate = document.createElement("span");
      addedDate.className = "keyword-added-date";
      addedDate.textContent = `追加日時: ${new Date(keyword.addedAt).toLocaleString()}`;
      meta.appendChild(addedDate);
      const links = document.createElement("div");
      links.className = "keyword-links";
      [
        [
          "keyword-search",
          `https://www.nicovideo.jp/search/${encodedKeyword}`,
          "キーワード検索",
        ],
        [
          "tag-search",
          `https://www.nicovideo.jp/tag/${encodedKeyword}`,
          "タグ検索",
        ],
        [
          "mylist-search",
          `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`,
          "マイリスト検索",
        ],
      ].forEach(([className, href, text]) => {
        const anchor = document.createElement("a");
        anchor.className = className;
        anchor.href = href;
        anchor.target = "_blank";
        anchor.textContent = text;
        links.appendChild(anchor);
      });
      const actionButton = document.createElement("button");
      actionButton.className = "action-trigger";
      actionButton.type = "button";
      actionButton.setAttribute("aria-label", "アクションメニュー");
      actionButton.title = "アクション";
      actionButton.textContent = "⋮";
      info.append(title, meta, links);
      fallbackElement.append(checkbox, icon, info, actionButton);
      if (keyword.id !== undefined) {
        fallbackElement.dataset.id = keyword.id.toString();
      }
      fallbackElement.dataset.type = "keyword";
      hydrateMaterialIconImages(fallbackElement);
      return fallbackElement;
    }

    const clone = this.keywordItemTemplate.content.cloneNode(
      true,
    ) as DocumentFragment;
    const item = clone.querySelector(".keyword-item") as HTMLElement;
    if (!item) {
      window.logger.error("キーワードアイテム要素が見つかりません");
      return document.createElement("div");
    }

    if (keyword.id !== undefined) {
      item.dataset.id = keyword.id.toString();
    }
    item.dataset.type = "keyword";

    const keywordText = item.querySelector(".keyword-text");
    if (keywordText) {
      keywordText.textContent = keyword.keyword;
    }

    // 検索リンクの設定
    this.setKeywordSearchLinks(item, keyword.keyword);

    // 追加日時
    const dateElement = item.querySelector(".keyword-added-date");
    if (dateElement) {
      dateElement.textContent = `追加日時: ${new Date(keyword.addedAt).toLocaleString()}`;
    }

    hydrateMaterialIconImages(item);

    return item;
  }

  private setKeywordSearchLinks(item: HTMLElement, keyword: string): void {
    const encodedKeyword = encodeURIComponent(keyword);

    const keywordSearchLink = item.querySelector(
      ".keyword-search",
    ) as HTMLAnchorElement;
    if (keywordSearchLink) {
      keywordSearchLink.href = `https://www.nicovideo.jp/search/${encodedKeyword}`;
    }

    const tagSearchLink = item.querySelector(
      ".tag-search",
    ) as HTMLAnchorElement;
    if (tagSearchLink) {
      tagSearchLink.href = `https://www.nicovideo.jp/tag/${encodedKeyword}`;
    }

    const mylistSearchLink = item.querySelector(
      ".mylist-search",
    ) as HTMLAnchorElement;
    if (mylistSearchLink) {
      mylistSearchLink.href = `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`;
    }
  }

  /**
   * 動画リストのイベント設定
   * 仮想スクロール対応: イベントは initializeVirtualScroll で委譲方式で設定済み
   */
  private setupVideoListEvents(_videoList: HTMLElement): void {
    // 仮想スクロールとアクションメニューを使用するため、
    // 個別のボタンイベント設定は不要
    // イベントは initializeVirtualScroll() で委譲方式で処理
  }

  // 残りのメソッド実装
  initializeEventListeners(): void {
    // ソートイベントはinitializeSettingsで設定されるため、ここでは設定しない

    const createNewMylistElement = document.getElementById("createNewMylist");
    if (createNewMylistElement) {
      createNewMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const nameInput = document.getElementById(
            "newMylistName",
          ) as HTMLInputElement;
          if (!nameInput) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }

          try {
            const name = this.validateInput(nameInput.value, "mylistName");
            await this.manager.createMylist(name);
            nameInput.value = "";
            void this.loadMylists();
          } catch (error) {
            window.logger.error("マイリストの作成に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリストの作成に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // 動画ソートイベントもinitializeSettingsで設定されるため、ここでは設定しない

    // 動画追加ボタンのイベントリスナー
    const addVideoElement = document.getElementById("addVideo");
    if (addVideoElement) {
      addVideoElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const input = document.getElementById(
            "videoIdInput",
          ) as HTMLInputElement;
          if (!input) {
            await this.showCustomAlert("動画ID入力欄が見つかりません");
            return;
          }

          try {
            const videoUrl = this.validateInput(input.value, "videoId");

            // URLから動画IDを抽出
            let videoId: string;
            if (
              videoUrl.includes("nicovideo.jp") ||
              videoUrl.includes("nico.ms")
            ) {
              const match = videoUrl.match(/(?:sm|so|nm|nx)\d+/);
              if (!match) {
                throw new Error("動画IDを抽出できませんでした");
              }
              videoId = match[0];
            } else {
              videoId = videoUrl;
            }

            // 動画情報を取得してマイリストに追加
            const videoInfo = await this.manager.fetchVideoInfo(videoId);
            await this.manager.addVideo(this.currentMylistId, videoInfo);

            // 入力フォームをクリアして動画一覧を更新
            input.value = "";
            await this.loadVideos();

            await this.showCustomAlert("動画を追加しました");
          } catch (error) {
            window.logger.error("動画の追加に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "動画の追加に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // Enterキーでも追加できるように
    const videoIdInputElement = document.getElementById("videoIdInput");
    if (videoIdInputElement) {
      videoIdInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addVideoButton = document.getElementById("addVideo");
          if (addVideoButton) {
            (addVideoButton as HTMLButtonElement).click();
          }
        }
      });
    }

    // キーワード追加ボタンのイベントリスナー
    const addKeywordElement = document.getElementById("addKeyword");
    if (addKeywordElement) {
      addKeywordElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const input = document.getElementById(
            "keywordInput",
          ) as HTMLInputElement;
          if (!input) {
            await this.showCustomAlert("キーワード入力欄が見つかりません");
            return;
          }

          try {
            const keyword = this.validateInput(input.value, "text");
            await this.manager.addKeyword(this.currentMylistId, keyword);
            input.value = "";
            await this.loadVideos();
            await this.showCustomAlert("キーワードを追加しました");
          } catch (error) {
            window.logger.error("キーワードの追加に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "キーワードの追加に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // キーワード入力でもEnterキーで追加
    const keywordInputElement = document.getElementById("keywordInput");
    if (keywordInputElement) {
      keywordInputElement.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const addKeywordElement = document.getElementById("addKeyword");
          if (addKeywordElement) {
            addKeywordElement.click();
          }
        }
      });
    }

    // 一括操作の実行ボタン
    const executeSelectedActionElement = document.getElementById(
      "executeSelectedAction",
    );
    if (executeSelectedActionElement) {
      executeSelectedActionElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const actionSelectElement = document.getElementById(
            "selectedVideosAction",
          ) as HTMLSelectElement;
          if (!actionSelectElement) {
            await this.showCustomAlert("操作選択要素が見つかりません");
            return;
          }

          const action = actionSelectElement.value;
          if (!action) {
            await this.showCustomAlert("操作を選択してください");
            return;
          }

          // 仮想スクロールマネージャーから選択されたアイテムを取得
          const selectedVideos = this.virtualScrollManager.getSelectedVideos();
          const selectedKeywords =
            this.virtualScrollManager.getSelectedKeywords();

          if (selectedVideos.length === 0 && selectedKeywords.length === 0) {
            await this.showCustomAlert("項目を選択してください");
            return;
          }

          try {
            switch (action) {
              case "move":
                await this.batchOperations.moveSelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "copy":
                await this.batchOperations.copySelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "delete":
                await this.batchOperations.deleteSelectedItemsFromData(
                  selectedVideos,
                  selectedKeywords,
                );
                break;
              case "refresh":
                if (selectedKeywords.length > 0) {
                  await this.showCustomAlert(
                    "キーワードは情報更新できません。動画のみ選択してください。",
                  );
                  return;
                }
                if (selectedVideos.length > 0) {
                  await this.batchOperations.refreshSelectedVideosFromData(
                    selectedVideos,
                  );
                }
                break;
              case "availability-check":
                if (selectedKeywords.length > 0) {
                  await this.showCustomAlert(
                    "キーワードは公開状態チェックできません。動画のみ選択してください。",
                  );
                  return;
                }
                if (selectedVideos.length > 0) {
                  await this.batchOperations.checkSelectedVideoAvailabilityFromData(
                    selectedVideos,
                  );
                }
                break;
            }

            // 操作後に選択をクリア
            this.virtualScrollManager.deselectAll();
          } catch (error) {
            window.logger.error("一括操作に失敗しました:", error);
            const errorMessage =
              error instanceof Error ? error.message : "操作に失敗しました";
            await this.showCustomAlert(errorMessage);
          }

          // 操作完了後、セレクトボックスをリセット
          actionSelectElement.value = "";
        }),
      );
    }

    document
      .querySelectorAll<HTMLElement>("[data-batch-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.batchAction;
          const actionSelect = document.getElementById(
            "selectedVideosAction",
          ) as HTMLSelectElement | null;
          if (!action || !actionSelect) return;
          actionSelect.value = action;
          executeSelectedActionElement?.click();
        });
      });

    // マイリスト名の保存
    const saveMylistNameElement = document.getElementById("saveMylistName");
    if (saveMylistNameElement) {
      saveMylistNameElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          try {
            const mylistNameElement = document.getElementById(
              "currentMylistName",
            ) as HTMLInputElement;
            if (!mylistNameElement) {
              await this.showCustomAlert("マイリスト名入力欄が見つかりません");
              return;
            }

            const newName = this.validateInput(
              mylistNameElement.value,
              "mylistName",
            );
            await this.manager.updateMylistName(this.currentMylistId, newName);
            await this.loadMylists();
            await this.showCustomAlert("マイリスト名を更新しました");
          } catch (error) {
            window.logger.error("マイリスト名の更新に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリスト名の更新に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // マイリストの削除
    const deleteMylistElement = document.getElementById("deleteMylist");
    if (deleteMylistElement) {
      deleteMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          if (!this.currentMylistId) {
            await this.showCustomAlert("マイリストを選択してください");
            return;
          }

          const mylistNameElement = document.getElementById(
            "currentMylistName",
          ) as HTMLInputElement;
          if (!mylistNameElement) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }

          const mylistName = mylistNameElement.value;
          if (
            !(await this.showCustomConfirm(
              `マイリスト「${mylistName}」を削除しますか？\n※この操作は取り消せません`,
            ))
          ) {
            return;
          }

          try {
            await this.manager.deleteMylist(this.currentMylistId);
            this.currentMylistId = null;
            mylistNameElement.value = "";

            const videoListElement = document.getElementById("videoList");
            if (videoListElement) {
              videoListElement.innerHTML = "";
            }

            await this.loadMylists();
            await this.showCustomAlert("マイリストを削除しました");
          } catch (error) {
            window.logger.error("マイリストの削除に失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "マイリストの削除に失敗しました";
            await this.showCustomAlert(errorMessage);
          }
        }),
      );
    }

    // エクスポート機能（モーダル経由）
    const exportMylistElement = document.getElementById("exportMylist");
    if (exportMylistElement) {
      exportMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const choice = await this.modalService.showExportOptionsModal();
          if (choice.action === "cancel") return;
          try {
            if (choice.action === "local") {
              const data = await this.manager.exportData();
              const dateTime = this.formatDateTime();
              const fileName = `Mylist2_${dateTime}.json`;
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              await new Promise<void>((resolve, reject) => {
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.onclick = () => {
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve();
                  }, 500);
                };
                a.onerror = () => {
                  URL.revokeObjectURL(url);
                  reject(new Error("ダウンロードに失敗しました"));
                };
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              });
              await this.showCustomAlert("エクスポートが完了しました");
            } else if (choice.action === "cloud") {
              const provider = "gdrive" as const;
              const dateTime = this.formatDateTime();
              const baseName = `Mylist2_${dateTime}`;
              const result = await this.manager.uploadBackupToCloud(
                provider,
                baseName,
              );
              if (result.success) {
                const providerName = "Google Drive";
                await this.showCustomAlert(
                  `${providerName} にバックアップを保存しました`,
                );
              } else {
                const providerName = "Google Drive";
                await this.showCustomAlert(
                  `${providerName} へのバックアップに失敗しました: ` +
                    (result.error || "不明なエラー"),
                );
              }
            }
          } catch (error) {
            window.logger.error("エクスポート処理でエラー:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "エクスポートに失敗しました";
            await this.showCustomAlert(
              "エクスポートに失敗しました: " + errorMessage,
            );
          }
        }),
      );
    }

    // インポート機能（モーダル経由）
    const importMylistElement = document.getElementById("importMylist");
    if (importMylistElement) {
      importMylistElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          const choice = await this.modalService.showImportOptionsModal();
          if (choice.action === "cancel") return;
          if (choice.action === "local") {
            const input = document.getElementById(
              "importFile",
            ) as HTMLInputElement;
            if (!input) {
              await this.showCustomAlert(
                "インポートファイル選択要素が見つかりません",
              );
              return;
            }
            input.accept = ".json,.txt";
            input.click();
          } else if (choice.action === "clear") {
            const confirmed = await this.showCustomConfirm(
              "本当に全データをクリアしますか？この操作は取り消せません。",
              "warning",
              "データベースのクリア",
            );
            if (!confirmed) return;
            const result = await this.manager.clearAllData(false);
            if (result.success) {
              await this.loadMylists();
              const videoListElement = document.getElementById("videoList");
              if (videoListElement) videoListElement.innerHTML = "";
              await this.showCustomAlert("データベースをクリアしました");
            } else {
              await this.showCustomAlert(
                "データベースのクリアに失敗しました: " +
                  (result.error || "不明なエラー"),
              );
            }
          } else if (choice.action === "cloud") {
            const provider = "gdrive" as const;
            try {
              const backups = await this.manager.listCloudBackups(provider);
              const providerName = "Google Drive";
              if (!backups || backups.length === 0) {
                await this.showCustomAlert(
                  `${providerName} にバックアップが見つかりません`,
                );
                return;
              }
              const selectedId = await this.modalService.showSelectionModal(
                "復元するバックアップを選択",
                backups.map((f) => ({
                  id: f.id,
                  label: f.name,
                  subLabel: f.modifiedTime
                    ? new Date(f.modifiedTime).toLocaleString()
                    : "",
                })),
                "復元",
              );
              if (!selectedId) return;
              const confirmed = await this.showCustomConfirm(
                "選択したバックアップで復元します。現在のデータは上書きされます。よろしいですか？",
                "warning",
                "復元確認",
              );
              if (!confirmed) return;
              this.showProgress();
              const res = await this.manager.restoreFromCloudBackup(
                provider,
                selectedId,
              );
              if (res.success) {
                await this.loadMylists();
                await this.showCustomAlert("バックアップから復元しました");
              } else {
                await this.showCustomAlert(
                  "復元に失敗しました: " + (res.error || "不明なエラー"),
                );
              }
            } finally {
              this.hideProgress();
            }
          }
        }),
      );
    }

    const importFileElement = document.getElementById("importFile");
    if (importFileElement) {
      importFileElement.addEventListener(
        "change",
        this.guardEvent(async (event) => {
          const input = event.target as HTMLInputElement;
          const file = input.files?.[0];
          if (!file) return;

          try {
            const text = await file.text();
            let mylistId: number | undefined;

            // ファイル形式を判定
            let data: unknown;
            try {
              data = JSON.parse(text) as unknown;
            } catch {
              throw new Error(
                "無効なJSONファイルです: JSONの解析に失敗しました",
              );
            }

            // 既存データの存在チェック
            const existingData = await this.manager.exportData();
            const hasExistingData =
              existingData.mylists.length > 0 ||
              existingData.videos.length > 0 ||
              existingData.keywords.length > 0;

            if (hasExistingData) {
              const existingInfo = [
                existingData.mylists.length > 0
                  ? `マイリスト: ${existingData.mylists.length}件`
                  : null,
                existingData.videos.length > 0
                  ? `動画: ${existingData.videos.length}件`
                  : null,
                existingData.keywords.length > 0
                  ? `キーワード: ${existingData.keywords.length}件`
                  : null,
              ]
                .filter(Boolean)
                .join("、");

              const confirmed = await this.showCustomConfirm(
                `現在のストレージにデータが存在します（${existingInfo}）。\n\nインポートを実行すると、同じIDを持つデータは上書きされます。\n続行しますか？`,
                "warning",
                "データ上書き確認",
              );
              if (!confirmed) {
                input.value = "";
                return;
              }
            }

            if (
              Array.isArray(data) &&
              typeof data[0] === "object" &&
              data[0] !== null &&
              "vid" in data[0]
            ) {
              // カスタムマイリスト1の形式
              this.showProgress();
              mylistId = await this.manager.importLegacyData(
                text,
                (current: number, total: number) =>
                  this.updateProgress(current, total),
              );
              await this.showCustomAlert(
                "カスタムマイリスト1のデータを正常にインポートしました",
              );
            } else {
              // Mylist2の形式
              this.showProgress();
              // data は unknown なので ExportData の形状を厳密に確認し、明示的に構築
              const rec = data as Record<string, unknown>;
              if (!rec || typeof rec !== "object") {
                throw new Error("無効なデータ形式です");
              }
              const mylistsUnknown = rec.mylists;
              const videosUnknown = rec.videos;
              const keywordsUnknown = rec.keywords;
              if (
                !Array.isArray(mylistsUnknown) ||
                !Array.isArray(videosUnknown)
              ) {
                throw new Error("Mylist2のエクスポート形式ではありません");
              }
              const isMylistInfo = (v: unknown): v is MylistInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.name === "string" && typeof r.createdAt === "number"
                );
              };
              const isDBVideo = (v: unknown): v is VideoInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.id === "string" &&
                  typeof r.originalId === "string" &&
                  typeof r.mylistId === "number"
                );
              };
              const isKeywordInfo = (v: unknown): v is KeywordInfo => {
                if (typeof v !== "object" || v === null) return false;
                const r = v as Record<string, unknown>;
                return (
                  typeof r.keyword === "string" && typeof r.addedAt === "number"
                );
              };
              const exportData: ExportData = {
                mylists: (mylistsUnknown as unknown[]).filter(isMylistInfo),
                videos: (videosUnknown as unknown[]).filter(isDBVideo),
                keywords: Array.isArray(keywordsUnknown)
                  ? (keywordsUnknown as unknown[]).filter(isKeywordInfo)
                  : [],
              };
              await this.manager.importData(exportData);
              await this.showCustomAlert("データを正常にインポートしました");
            }

            // マイリスト一覧を更新
            await this.loadMylists();

            // インポートしたマイリストを選択
            if (mylistId) {
              await this.selectMylist(mylistId);
            }
          } catch (error) {
            window.logger.error("インポートに失敗しました:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "インポートに失敗しました";
            await this.showCustomAlert(errorMessage);
          } finally {
            this.hideProgress();
          }

          // ファイル選択をリセット
          input.value = "";
        }),
      );
    }

    // 全選択ボタンのイベントリスナー（動画のみ）
    const selectAllVideosElement = document.getElementById(
      "selectAllVideos",
    ) as HTMLInputElement | null;
    if (selectAllVideosElement) {
      selectAllVideosElement.addEventListener("change", () => {
        if (selectAllVideosElement.checked) {
          this.virtualScrollManager.selectAllVideos();
        } else {
          this.virtualScrollManager.deselectAll();
        }
      });
    }

    // 選択解除ボタンのイベントリスナー
    const deselectAllVideosElement =
      document.getElementById("deselectAllVideos");
    if (deselectAllVideosElement) {
      deselectAllVideosElement.addEventListener("click", () => {
        // 仮想スクロールマネージャーを使用
        this.virtualScrollManager.deselectAll();
      });
    }
  }

  // 動画詳細モーダルの表示（メモ編集対応）
  private async showVideoDetailsModal(
    video: VideoInfo,
    compositeId?: string,
    memoText: string = "",
  ): Promise<void> {
    await Promise.resolve();
    const modalElements = getOrCreateVideoDetailsModal();
    if (!modalElements) return;
    const { description, tags, memo } = modalElements;
    const text = video.description || "(説明なし)";
    description.innerHTML = sanitizeDescriptionHtml(text);

    // 視聴ページからのリッチ説明文をまだ取得していない場合、遅延エンリッチメント
    if (video.descriptionSource !== "watch" && compositeId) {
      const loadingEl = document.createElement("div");
      loadingEl.style.cssText =
        "color:#888;font-size:12px;margin-top:6px;font-style:italic";
      loadingEl.textContent = "完全な説明文を取得中…";
      description.after(loadingEl);

      void this.enrichDescription(
        video.originalId,
        compositeId,
        description,
        loadingEl,
      );
    }
    memo.value = memoText || "";
    renderVideoTags(
      tags,
      video.tags && video.tags.length > 0 ? video.tags : [],
    );
    openVideoDetailsModal(modalElements, async (text) => {
      if (!compositeId) {
        await this.showCustomAlert("メモの保存対象が特定できませんでした");
        return;
      }

      try {
        await this.manager.updateVideoMemo(compositeId, text);
        const item = document.querySelector(
          `.video-item[data-composite-id="${compositeId}"]`,
        );
        if (item) {
          (item as HTMLElement).setAttribute("data-memo", text);
        }
        await this.showCustomAlert("メモを保存しました");
      } catch {
        await this.showCustomAlert("メモの保存に失敗しました");
      }
    });
  }

  /**
   * 視聴ページからリッチHTML説明文を取得し、UI・DBを更新する。
   * showVideoDetailsModal から呼ばれる。
   */
  private async enrichDescription(
    videoId: string,
    compositeId: string,
    descEl: HTMLElement,
    loadingEl: HTMLElement,
  ): Promise<void> {
    try {
      const richDesc = await this.manager.fetchRichDescription(videoId);
      if (richDesc !== null) {
        descEl.innerHTML = sanitizeDescriptionHtml(richDesc);
        await this.manager.updateVideoDescription(
          compositeId,
          richDesc,
          "watch",
        );
        // DOMのdata属性も更新
        const item = document.querySelector(
          `.video-item[data-composite-id="${compositeId}"]`,
        );
        if (item instanceof HTMLElement) {
          item.dataset.description = richDesc;
        }
      }
    } catch (error) {
      window.logger.error("リッチ説明文の取得に失敗:", error);
    } finally {
      loadingEl.remove();
    }
  }

  initializeHeaderControls(): void {
    // 検索機能
    const searchExecElement = document.getElementById("searchExec");
    if (searchExecElement) {
      searchExecElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          await this.executeSearch();
        }),
      );
    }

    const searchClearElement = document.getElementById("searchClear");
    if (searchClearElement) {
      searchClearElement.addEventListener("click", () => {
        const searchWordsElement = document.getElementById(
          "searchWords",
        ) as HTMLInputElement;
        if (searchWordsElement) {
          searchWordsElement.value = "";
        }
      });
    }

    // Enterキーでの検索
    const searchWordsElement = document.getElementById("searchWords");
    if (searchWordsElement) {
      searchWordsElement.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.executeSearch();
        }
      });
    }
  }

  async executeSearch(): Promise<void> {
    const optionElement = document.getElementById(
      "searchOption",
    ) as HTMLSelectElement;
    const wordsElement = document.getElementById(
      "searchWords",
    ) as HTMLInputElement;

    if (!optionElement || !wordsElement) {
      await this.showCustomAlert("検索要素が見つかりません");
      return;
    }

    const option = optionElement.value;
    const word = wordsElement.value.trim();

    if (!word) {
      await this.showCustomAlert("検索キーワードが空です。");
      return;
    }

    const [host, type] = option.split("+");
    window.open(
      `https://${host}.nicovideo.jp/${type}/${encodeURIComponent(word)}`,
      "_blank",
    );
  }

  initializeSearchEventListeners(): void {
    // マイリスト検索
    const mylistSearchInput = document.getElementById(
      "mylistSearchInput",
    ) as HTMLInputElement;
    const mylistSearchClear = document.getElementById("mylistSearchClear");

    if (mylistSearchInput) {
      mylistSearchInput.addEventListener("input", () => {
        this.filterMylists(mylistSearchInput.value.toLowerCase());
      });
    }

    if (mylistSearchClear && mylistSearchInput) {
      mylistSearchClear.addEventListener("click", () => {
        mylistSearchInput.value = "";
        this.filterMylists("");
      });
    }

    // 動画検索
    const videoSearchInput = document.getElementById(
      "videoSearchInput",
    ) as HTMLInputElement;
    const videoSearchClear = document.getElementById("videoSearchClear");

    if (videoSearchInput) {
      videoSearchInput.addEventListener("input", () => {
        this.filterVideos(videoSearchInput.value.toLowerCase());
      });
    }

    if (videoSearchClear && videoSearchInput) {
      videoSearchClear.addEventListener("click", () => {
        videoSearchInput.value = "";
        this.filterVideos("");
      });
    }
  }

  // マイリストの検索フィルター
  filterMylists(searchText: string): void {
    const mylistItems = document.querySelectorAll(".mylist-item");
    mylistItems.forEach((item) => {
      const nameElement = item.querySelector("span");
      if (!nameElement) return;

      const mylistName = nameElement.textContent?.toLowerCase() || "";

      if (mylistName.includes(searchText)) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  }

  // 動画の検索フィルター（仮想スクロール対応）
  filterVideos(searchText: string): void {
    // 仮想スクロールマネージャーのフィルター機能を使用
    this.virtualScrollManager.setFilter(searchText);
  }

  /** 動画リンク先設定を適用する（インスタンス＋linkifyモジュール） */
  private applyVideoLinkTarget(target: VideoLinkTarget): void {
    this.videoLinkTarget = target;
    setVideoLinkTarget(target);
  }

  async initializeSettings(): Promise<void> {
    const settings = await this.manager.loadManagerSettings();

    // プルダウンメニューの初期値を設定
    const mylistSort = document.getElementById(
      "mylistSortType",
    ) as HTMLSelectElement;
    const videoSort = document.getElementById(
      "videoSortType",
    ) as HTMLSelectElement;
    const themeSelect = document.getElementById(
      "themeSelect",
    ) as HTMLSelectElement | null;
    const videoLinkTargetSelect = document.getElementById(
      "videoLinkTargetSelect",
    ) as HTMLSelectElement | null;

    if (!mylistSort || !videoSort) {
      window.logger.error("ソート選択要素が見つかりません");
      return;
    }

    mylistSort.value = settings.mylistSortType;
    videoSort.value = settings.videoSortType;
    // テーマ初期値
    const themeValue = (settings as { theme?: string }).theme || "dark-blue";
    if (themeSelect) themeSelect.value = themeValue;
    this.applyTheme(themeValue);

    // 動画リンク先初期値
    const videoLinkTargetValue: VideoLinkTarget =
      settings.videoLinkTarget === "local" ? "local" : "official";
    if (videoLinkTargetSelect)
      videoLinkTargetSelect.value = videoLinkTargetValue;
    this.applyVideoLinkTarget(videoLinkTargetValue);

    const normalizeVideoLinkTarget = (value: string): VideoLinkTarget =>
      value === "local" ? "local" : "official";
    type CurrentManagerSettings = ManagerSettings & {
      theme: string;
      videoLinkTarget: VideoLinkTarget;
    };

    /** 現在のUI上の全設定値を収集する */
    const collectCurrentSettings = (): CurrentManagerSettings => ({
      mylistSortType: mylistSort.value,
      videoSortType: videoSort.value,
      theme: themeSelect ? themeSelect.value : themeValue,
      videoLinkTarget: normalizeVideoLinkTarget(
        videoLinkTargetSelect?.value ?? "official",
      ),
    });

    // 初期表示時に並び替えを実行
    await this.loadMylists(); // マイリスト一覧の並び替え
    if (this.currentMylistId) {
      await this.loadVideos(); // 動画一覧の並び替え
    }

    // 変更イベントの設定
    mylistSort.addEventListener(
      "change",
      this.guardEvent(async () => {
        await this.manager.saveManagerSettings(collectCurrentSettings());
        await this.loadMylists();
      }),
    );

    videoSort.addEventListener(
      "change",
      this.guardEvent(async () => {
        await this.manager.saveManagerSettings(collectCurrentSettings());
        await this.loadVideos();
      }),
    );

    if (themeSelect) {
      themeSelect.addEventListener(
        "change",
        this.guardEvent(async () => {
          const current = collectCurrentSettings();
          await this.manager.saveManagerSettings(current);
          this.applyTheme(current.theme);
        }),
      );
    }

    if (videoLinkTargetSelect) {
      videoLinkTargetSelect.addEventListener(
        "change",
        this.guardEvent(async () => {
          const current = collectCurrentSettings();
          await this.manager.saveManagerSettings(current);
          this.applyVideoLinkTarget(current.videoLinkTarget);
          // 動画リンクを即時更新するために再描画
          if (this.currentMylistId) {
            await this.loadVideos();
          }
        }),
      );
    }
  }

  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(
    keywordId: number,
    currentKeyword: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }

      const input = modal.querySelector(
        "#editKeywordInput",
      ) as HTMLInputElement;
      const closeButton = modal.querySelector(".close-button");
      const saveButton = modal.querySelector("#saveKeywordEdit");

      if (!input || !closeButton || !saveButton) {
        window.logger.error("キーワード編集モーダルの要素が見つかりません");
        resolve(null);
        return;
      }

      // 現在のキーワードを入力欄にセット
      input.value = currentKeyword;

      // モーダルを表示
      modal.style.display = "flex";

      // クローズボタンのイベントリスナー
      const closeHandler = () => {
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };

      // 保存ボタンのイベントリスナー
      const saveHandler = () => {
        const newKeyword = input.value;
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };

      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }

  // 設定モーダルとFABの初期化
  initializeSettingsModal(): void {
    const fab = document.getElementById("settingsFab") as HTMLButtonElement;
    const modal = document.getElementById("settingsModal") as HTMLElement;
    const closeButton = document.getElementById(
      "settingsModalClose",
    ) as HTMLButtonElement;

    if (!fab || !modal || !closeButton) {
      window.logger.warn("設定モーダルまたはFAB要素が見つかりません");
      return;
    }

    // モーダルを開く
    const openModal = () => {
      modal.classList.add("visible");
      // モーダル内の最初の入力要素にフォーカス
      const firstInput = modal.querySelector("input") as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    };

    // モーダルを閉じる
    const closeModal = () => {
      modal.classList.remove("visible");
      // FABにフォーカスを戻す
      fab.focus();
    };

    // FABクリックでモーダルを開く
    fab.addEventListener("click", openModal);

    // 閉じるボタン
    closeButton.addEventListener("click", closeModal);

    // 背景クリックで閉じる
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escapeキーで閉じる
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("visible")) {
        closeModal();
      }
    });

    // キーボードショートカット（Ctrl + Shift + S で設定モーダルを開く）
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyS") {
        event.preventDefault();
        if (modal.classList.contains("visible")) {
          closeModal();
        } else {
          openModal();
        }
      }
    });

    window.logger.info("設定モーダルとFABが初期化されました");
  }
}
