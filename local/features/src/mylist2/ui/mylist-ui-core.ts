import "@/types/global.d.ts";

import { Mylist2Manager } from "@/mylist2/components/manager-refactored";
import type {
  KeywordInfo,
  MylistInfo,
  VideoLinkTarget,
  VideoSearchScope,
} from "@/types/mylist-types";
import { DBVideo as VideoInfo } from "@/types/video-types";

import {
  getActionMenuManager,
  type ActionMenuContext,
} from "@/mylist2/ui/action-menu";
import { BatchOperations } from "@/mylist2/ui/batch-operations";
import { EventHandlers } from "@/mylist2/ui/event-handlers";
import { FileHelperService } from "@/mylist2/ui/file-helper-service";
import { ModalService } from "@/mylist2/ui/modal-service";
import { renderMylistListItems } from "@/mylist2/ui/mylist-list-renderer";
import { ProgressService } from "@/mylist2/ui/progress-service";
import { ValidationService } from "@/mylist2/ui/validation-service";
import {
  VirtualScrollManager,
  type VirtualScrollItem,
} from "@/mylist2/ui/virtual-scroll";
import { checkVideoAvailability } from "@/mylist2/utils/linkify";

/** 一覧読込・テンプレート・仮想スクロールの基盤。 */
export abstract class Mylist2UICore {
  // 残りのメソッド実装
  protected abstract initializeEventListeners(): void;
  protected abstract initializeAdditionalControls(): void;
  // 設定モーダルとFABの初期化
  protected abstract initializeSettingsModal(): void;
  protected abstract initializeSettings(): Promise<void>;
  protected abstract renderVideoList(
    videos: VideoInfo[],
    keywords: KeywordInfo[],
  ): void;
  /**
   * アクショントリガークリック時の処理
   */
  protected abstract handleActionTriggerClick(trigger: HTMLElement): void;
  protected abstract handleVideoDetailsClick(
    trigger: HTMLElement,
  ): Promise<void>;
  protected abstract renderVideoItem(video: VideoInfo): HTMLElement;
  protected abstract renderKeywordItem(keyword: KeywordInfo): HTMLElement;
  // 動画詳細モーダルの表示（メモ編集対応）
  protected abstract showVideoDetailsModal(
    video: VideoInfo,
    compositeId?: string,
    memoText?: string,
  ): Promise<void>;
  protected manager: Mylist2Manager;
  protected currentMylistId: number | null;
  protected videoItemTemplate!: HTMLTemplateElement;
  protected keywordItemTemplate!: HTMLTemplateElement;

  // 分離されたサービス
  protected modalService: ModalService;
  protected validationService: ValidationService;
  protected progressService: ProgressService;
  protected fileHelperService: FileHelperService;
  protected eventHandlers: EventHandlers;
  protected batchOperations!: BatchOperations;

  // 仮想スクロールとアクションメニュー
  protected virtualScrollManager: VirtualScrollManager;
  protected currentVideos: VideoInfo[] = [];
  protected currentKeywords: KeywordInfo[] = [];

  // 動画リンク先設定
  protected videoLinkTarget: VideoLinkTarget = "official";

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

  protected applyTheme(theme: string): void {
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
  protected guardEvent(
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

      const searchScopeElement = document.getElementById(
        "videoSearchScope",
      ) as HTMLSelectElement | null;
      const searchScope: VideoSearchScope =
        searchScopeElement?.value === "all" ? "all" : "selected";

      // 検索範囲に応じて動画とキーワードを取得
      const [videos, keywords] =
        searchScope === "all"
          ? await Promise.all([
              this.manager.getAllVideos(),
              this.manager.getAllKeywords(),
            ])
          : await Promise.all([
              this.manager.getVideos(this.currentMylistId),
              this.manager.getKeywords(this.currentMylistId),
            ]);

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

  protected initializeTemplates(): void {
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
  protected initializeVirtualScroll(): void {
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
        const target = e.target as HTMLElement;
        const trigger = target.closest(".action-trigger");
        if (trigger) {
          e.stopPropagation();
          this.handleActionTriggerClick(trigger as HTMLElement);
          return;
        }

        const videoItem = target.closest<HTMLElement>(
          ".video-item:not(.keyword-item)",
        );
        if (videoItem && target.closest(".video-thumbnail-link")) {
          e.preventDefault();
          void this.handleVideoDetailsClick(videoItem);
          return;
        }
        if (
          videoItem &&
          !target.closest("a, button, input, select, textarea")
        ) {
          void this.handleVideoDetailsClick(videoItem);
        }
      });
      container.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const target = e.target as HTMLElement;
        const videoItem = target.closest<HTMLElement>(
          ".video-item:not(.keyword-item)",
        );
        if (!videoItem || target !== videoItem) return;
        e.preventDefault();
        void this.handleVideoDetailsClick(videoItem);
      });
    }

    window.logger.info("仮想スクロールを初期化しました");
  }

  /**
   * video-player ルーティングの API 可用性チェック用クリックハンドラー。
   *
   * data-needs-api-check 属性を持つリンクがクリックされたとき、
   * 動画情報APIで公開状態を確認し、削除済み/非公開なら video-player へ遷移する。
   * 公開中なら公式プレーヤーへ遷移する。
   */
  protected setupVideoLinkApiCheck(): void {
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
      const canReplaceText = !el.querySelector("img");
      if (canReplaceText) {
        el.textContent = `${originalText}（確認中…）`;
      }
      el.setAttribute("aria-busy", "true");
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
          if (canReplaceText) {
            el.textContent = originalText;
          }
          el.removeAttribute("aria-busy");
          el.style.cursor = "";
          el.style.pointerEvents = "";
        }
      })();
    });
  }

  /**
   * 仮想スクロール用のアイテムレンダラー
   */
  protected renderVirtualScrollItem(
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
  protected initializeActionMenu(): void {
    const actionMenu = getActionMenuManager();

    // 動画用ハンドラーを登録
    actionMenu.registerHandlers({
      move: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          await this.eventHandlers.moveVideo(
            ctx.element,
            ctx.data.title,
            ctx.data.mylistId,
          );
        } else {
          const keywordId = ctx.data.id;
          if (keywordId !== undefined) {
            const event = { target: ctx.element } as unknown as Event;
            await this.eventHandlers.handleKeywordMove(
              event,
              ctx.data.mylistId,
            );
          }
        }
      },
      copy: async (ctx: ActionMenuContext) => {
        if (ctx.type === "video") {
          await this.eventHandlers.copyVideo(
            ctx.element,
            ctx.data.title,
            ctx.data.mylistId,
          );
        } else {
          const event = { target: ctx.element } as unknown as Event;
          await this.eventHandlers.handleKeywordCopy(event, ctx.data.mylistId);
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
}
