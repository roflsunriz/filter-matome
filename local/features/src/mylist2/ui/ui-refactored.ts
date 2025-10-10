import "../../types/global.d.ts"

import { Mylist2Manager } from "../components/manager-refactored.js";
import { MylistInfo, KeywordInfo, ExportData } from "../../types/mylist-types.js";
import { DBVideo as VideoInfo } from "../../types/video-types.js";
import { createMaterialIcon, ICONS, hydrateMaterialIconImages } from "../../common/material-icons.js";

import { ModalService } from "./modal-service.js";
import { ValidationService } from "./validation-service.js";
import { ProgressService } from "./progress-service.js";
import { FileHelperService } from "./file-helper-service.js";
import { EventHandlers } from "./event-handlers.js";
import { BatchOperations } from "./batch-operations.js";
import { linkify } from "../utils/linkify.js";

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
  private batchOperations: BatchOperations;

  constructor() {
    this.manager = new Mylist2Manager();
    this.currentMylistId = null;
    
    // サービスの初期化
    this.modalService = new ModalService();
    this.validationService = new ValidationService();
    this.progressService = new ProgressService();
    this.fileHelperService = new FileHelperService();
    
    // イベントハンドラーの初期化
    this.eventHandlers = new EventHandlers(
      this.manager,
      this.modalService,
      this.validationService,
      this.progressService,
      this.fileHelperService,
      () => this.currentMylistId,
      (id: number | null) => { this.currentMylistId = id; },
      () => this.loadMylists(),
      () => this.loadVideos()
    );
    
    // 一括操作の初期化
    this.batchOperations = new BatchOperations(
      this.manager,
      this.modalService,
      this.progressService,
      this.eventHandlers,
      () => this.loadVideos()
    );
    
    // テンプレートを最初に初期化
    this.initializeTemplates();
    
    // イベントリスナーを初期化（ただし設定は後で）
    this.initializeEventListeners();
    this.initializeAdditionalControls();
    
    // 折りたたみ可能なコントロールの初期化
    this.initializeCollapsibleControls();
    
    // 設定の初期化（これによってマイリストも読み込まれる）
    void this.initializeSettings();
  }

  private applyTheme(theme: string): void {
    const root = document.getElementById("Mylist2Manager");
    if (!root) return;
    // Remove existing theme classes
    root.classList.forEach(cls => {
      if (cls.startsWith('cml2-theme-')) root.classList.remove(cls);
    });
    // Add selected theme class; fallback to dark-blue
    const themeClass = `cml2-theme-${theme}`;
    root.classList.add(themeClass);
  }

  // デリゲートメソッド群（各サービスへの橋渡し）
  private guardEvent(handler: (event: Event) => Promise<unknown>): (event: Event) => void {
    return (event: Event) => {
      void handler(event);
    };
  }
  async showCustomAlert(message: string, type = "info", title = ""): Promise<boolean> {
    return this.modalService.showCustomAlert(message, type, title);
  }

  async showCustomConfirm(message: string, type = "warning", title = ""): Promise<boolean> {
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
      const mylistSortTypeElement = document.getElementById("mylistSortType") as HTMLSelectElement;
      const sortType = mylistSortTypeElement ? mylistSortTypeElement.value : "name_asc";
      
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
      })
    );

    mylistList.innerHTML = mylistsWithCount
      .map(
        (mylist) => {
          // idがundefinedの場合のチェック
          if (mylist.id === undefined) {
            return '';
          }
          return `
            <div class="mylist-item ${this.currentMylistId === mylist.id ? "active" : ""}" data-id="${
            mylist.id
          }">
                <div class="mylist-info">
                    <div class="mylist-details">
                        <span class="mylist-name">${mylist.name}</span>
                        <span class="mylist-date">${new Date(
                          mylist.createdAt
                        ).toLocaleDateString()}</span>
                    </div>
                    <span class="mylist-count-mylist-tab">${mylist.videoCount}件</span>
                </div>
            </div>
          `;
        }
      )
      .join("");

    // マイリストクリックイベントの追加
    mylistList.querySelectorAll(".mylist-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id");
        if (id) {
          void this.selectMylist(parseInt(id));
        }
      });
    });
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
    
    const mylistNameElement = document.getElementById("currentMylistName") as HTMLInputElement;
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
      window.logger.info(`マイリスト ${this.currentMylistId} の動画を読み込み中...`);
      
      // 現在のソート設定を取得
      const videoSortTypeElement = document.getElementById("videoSortType") as HTMLSelectElement;
      const sortType = videoSortTypeElement ? videoSortTypeElement.value : "uploadedAt_desc";
      
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
    const videoTemplateElement = document.getElementById("videoItemTemplate") as HTMLTemplateElement;
    if (!videoTemplateElement) {
      window.logger.error("動画アイテムのテンプレートが見つかりません！");
      throw new Error("動画アイテムのテンプレートが見つかりません");
    }
    this.videoItemTemplate = videoTemplateElement;

    const keywordTemplateElement = document.getElementById("keywordItemTemplate") as HTMLTemplateElement;
    if (!keywordTemplateElement) {
      window.logger.error("キーワードアイテムのテンプレートが見つかりません！");
      throw new Error("キーワードアイテムのテンプレートが見つかりません");
    }
    this.keywordItemTemplate = keywordTemplateElement;
  }

  private initializeAdditionalControls(): void {
    this.initializeHeaderControls();
    this.initializeSearchEventListeners();
    void this.initializeSettings();
  }

  renderVideoList(videos: VideoInfo[], keywords: KeywordInfo[]): void {
    const videoList = document.getElementById("videoList");
    if (!videoList) {
      window.logger.error("動画リスト要素が見つかりません");
      return;
    }
    
    videoList.innerHTML = "";

    // キーワードの表示
    keywords.forEach((keyword) => {
      const keywordElement = this.renderKeywordItem(keyword);
      videoList.appendChild(keywordElement);
    });

    // 動画の表示
    videos.forEach((video) => {
      const videoElement = this.renderVideoItem(video);
      videoList.appendChild(videoElement);
    });

    // イベントリスナーの追加
    this.setupVideoListEvents(videoList);
  }

  renderVideoItem(video: VideoInfo): HTMLElement {
    // 保持しているテンプレートを使用
    if (!this.videoItemTemplate) {
      window.logger.error("動画テンプレートが初期化されていません！");
      // フォールバック用の要素を作成
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item";
      fallbackElement.innerHTML = `
        <input type="checkbox" class="video-select" />
        <img class="video-thumbnail" src="${video.thumbnailUrl}" alt="サムネイル" />
        <div class="video-info">
          <div class="video-title">
            <a href="https://www.nicovideo.jp/watch/${video.originalId}" target="_blank">${video.title}</a>
          </div>
          <div class="video-stats">
            <span class="view-count">再生数: ${video.viewCount.toLocaleString()}</span>
            <span class="comment-count">コメント数: ${video.commentCount.toLocaleString()}</span>
            <span class="mylist-count">マイリスト数: ${video.mylistCount.toLocaleString()}</span>
            <span class="video-length">${Math.floor(video.length / 60)}分${video.length % 60}秒</span>
          </div>
          <div class="video-meta">
            <span class="video-author">投稿者: ${video.authorName}</span>
            <span class="video-upload-date">投稿日: ${new Date(video.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="move-video">${createMaterialIcon('drive_file_move', { color: 'white' })}移動</button>
          <button class="copy-video">${createMaterialIcon('content_copy', { color: 'white' })}コピー</button>
          <button class="delete-video">${createMaterialIcon(ICONS.delete, { color: 'white' })}削除</button>
          <button class="refresh-video">${createMaterialIcon(ICONS.refresh, { color: 'white' })}情報更新</button>
          <button class="open-video-details">${createMaterialIcon('info', { color: 'white' })}詳細</button>
        </div>
      `;
      fallbackElement.dataset.id = video.originalId;
      fallbackElement.dataset.compositeId = video.id;
      return fallbackElement;
    }

    const clone = this.videoItemTemplate.content.cloneNode(true) as DocumentFragment;
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
    const thumbnailElement = item.querySelector(".video-thumbnail") as HTMLImageElement;
    if (thumbnailElement) {
      thumbnailElement.src = video.thumbnailUrl;
    }

    // タイトルをリンクとして設定
    const titleElement = item.querySelector(".video-title");
    if (titleElement) {
      const titleLink = document.createElement("a");
      const trimmedTitle = video.title.replace(/^[\p{White_Space}\p{Cf}]+|[\p{White_Space}\p{Cf}]+$/gu, "");
      const titleText = trimmedTitle ? trimmedTitle : "無題";
      titleLink.href = `https://www.nicovideo.jp/watch/${video.originalId}`;
      titleLink.textContent = titleText;
      titleLink.className = "video-title-link";
      titleLink.target = "_blank";
      titleElement.appendChild(titleLink);
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
      uploadDateElement.textContent = "投稿日: " + new Date(video.uploadedAt).toLocaleDateString();
    }
  }

  renderKeywordItem(keyword: KeywordInfo): HTMLElement {
    if (!this.keywordItemTemplate) {
      window.logger.error("キーワードテンプレートが初期化されていません！");
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item keyword-item";
      fallbackElement.innerHTML = `
        <input type="checkbox" class="video-select" />
        <div class="keyword-icon">${createMaterialIcon(ICONS.search, { color: 'white' })}</div>
        <div class="video-info">
          <div class="video-title">
            <span class="keyword-text">${keyword.keyword}</span>
          </div>
          <div class="keyword-meta">
            <span class="keyword-added-date">追加日時: ${new Date(keyword.addedAt).toLocaleString()}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="edit-keyword">${createMaterialIcon(ICONS.edit, { color: 'white' })}編集</button>
          <button class="move-keyword">${createMaterialIcon('drive_file_move', { color: 'white' })}移動</button>
          <button class="copy-keyword">${createMaterialIcon('content_copy', { color: 'white' })}コピー</button>
          <button class="delete-keyword">${createMaterialIcon(ICONS.delete, { color: 'white' })}削除</button>
        </div>
      `;
      if (keyword.id !== undefined) {
        fallbackElement.dataset.id = keyword.id.toString();
      }
      fallbackElement.dataset.type = "keyword";
      return fallbackElement;
    }

    const clone = this.keywordItemTemplate.content.cloneNode(true) as DocumentFragment;
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
    
    const keywordSearchLink = item.querySelector(".keyword-search") as HTMLAnchorElement;
    if (keywordSearchLink) {
      keywordSearchLink.href = `https://www.nicovideo.jp/search/${encodedKeyword}`;
    }
    
    const tagSearchLink = item.querySelector(".tag-search") as HTMLAnchorElement;
    if (tagSearchLink) {
      tagSearchLink.href = `https://www.nicovideo.jp/tag/${encodedKeyword}`;
    }
    
    const mylistSearchLink = item.querySelector(".mylist-search") as HTMLAnchorElement;
    if (mylistSearchLink) {
      mylistSearchLink.href = `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`;
    }
  }

  private setupVideoListEvents(videoList: HTMLElement): void {
    // 動画関連のボタンイベント設定
    this.setupVideoActions(videoList);
    // キーワード関連のボタンイベント設定  
    this.setupKeywordActions(videoList);
  }

  private setupVideoActions(videoList: HTMLElement): void {
    // 移動ボタン
    videoList.querySelectorAll(".move-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoMove(event);
      });
    });

    // コピーボタン  
    videoList.querySelectorAll(".copy-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoCopy(event);
      });
    });

    // 削除ボタン
    videoList.querySelectorAll(".delete-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoDelete(event);
      });
    });

    // 情報更新ボタン
    videoList.querySelectorAll(".refresh-video").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleVideoRefresh(event);
      });
    });

    // 詳細表示ボタン
    videoList.querySelectorAll('.open-video-details').forEach((button) => {
      button.addEventListener('click', (event) => {
        void (async () => {
        const target = (event.currentTarget as HTMLElement).closest('.video-item');
        if (!target) return;
          const compositeId = target.getAttribute('data-composite-id') || undefined;
        if (!compositeId) {
          // フォールバック: DOM上のデータ属性だけで表示
          const descFromDom = target.getAttribute('data-description') || undefined;
          const tagsFromDom = target.getAttribute('data-tags') || undefined;
          const memoFromDom = target.getAttribute('data-memo') || '';
          const fallback: Partial<VideoInfo> = {};
          if (descFromDom) fallback.description = descFromDom;
          if (tagsFromDom) {
            try { fallback.tags = JSON.parse(tagsFromDom) as string[]; } catch (err) { void err; }
          }
          await this.showVideoDetailsModal(fallback as VideoInfo, undefined, memoFromDom);
          return;
        }
        try {
          const db = await this.manager.getDB();
          const tx = db.transaction(['videos'], 'readonly');
          const store = tx.objectStore('videos');
          const video = await new Promise<VideoInfo | null>((resolve, reject) => {
            const req = store.get(compositeId);
            req.onsuccess = () => resolve((req.result as unknown as VideoInfo) || null);
            req.onerror = () => {
              const err = req.error;
              reject(new Error(err instanceof Error ? err.message : String(err)));
            };
          });
          db.close();
          const descFromDom = target.getAttribute('data-description') || undefined;
          const tagsFromDom = target.getAttribute('data-tags') || undefined;
          const memoFromDom = target.getAttribute('data-memo') || '';
          if (video) {
            const enriched: VideoInfo = {
              ...video,
              description: video.description ?? descFromDom,
              tags: video.tags ?? (tagsFromDom ? ((): string[] | undefined => { try { return JSON.parse(tagsFromDom) as string[]; } catch { return undefined; } })() : undefined),
            } as VideoInfo;
            await this.showVideoDetailsModal(enriched, compositeId, memoFromDom);
          } else {
            // DBに見つからない場合でもDOMの情報でモーダルを表示
            const fallback: Partial<VideoInfo> = {};
            if (descFromDom) fallback.description = descFromDom;
            if (tagsFromDom) { try { fallback.tags = JSON.parse(tagsFromDom) as string[]; } catch (err) { void err; } }
            await this.showVideoDetailsModal(fallback as VideoInfo, compositeId, memoFromDom);
          }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            window.logger.error('詳細表示に失敗:', msg);
          }
        })();
      });
    });

    // 追加のイベント委譲（再描画や将来のDOM変更にも強い）
    videoList.addEventListener('click', (ev) => {
      void (async () => {
      const trigger = (ev.target as HTMLElement).closest('.open-video-details');
      if (!trigger) return;
      const target = (trigger as HTMLElement).closest('.video-item');
      if (!target) return;
      const compositeId = target.getAttribute('data-composite-id') || undefined;
      const descFromDom = target.getAttribute('data-description') || undefined;
      const tagsFromDom = target.getAttribute('data-tags') || undefined;
      const memoFromDom = target.getAttribute('data-memo') || '';
      try {
        if (!compositeId) {
          const fallback: Partial<VideoInfo> = {};
          if (descFromDom) fallback.description = descFromDom;
          if (tagsFromDom) { try { fallback.tags = JSON.parse(tagsFromDom) as string[]; } catch (err) { void err; } }
          await this.showVideoDetailsModal(fallback as VideoInfo, compositeId, memoFromDom);
          return;
        }
        const db = await this.manager.getDB();
        const tx = db.transaction(['videos'], 'readonly');
        const store = tx.objectStore('videos');
        const video = await new Promise<VideoInfo | null>((resolve, reject) => {
          const req = store.get(compositeId);
          req.onsuccess = () => resolve((req.result as unknown as VideoInfo) || null);
            req.onerror = () => {
              const err = req.error;
              reject(new Error(err instanceof Error ? err.message : String(err)));
            };
        });
        db.close();
        if (video) {
          const enriched: VideoInfo = {
            ...video,
            description: video.description ?? descFromDom,
            tags: video.tags ?? (tagsFromDom ? ((): string[] | undefined => { try { return JSON.parse(tagsFromDom) as string[]; } catch { return undefined; } })() : undefined),
          } as VideoInfo;
          await this.showVideoDetailsModal(enriched, compositeId, memoFromDom);
        } else {
          const fallback: Partial<VideoInfo> = {};
          if (descFromDom) fallback.description = descFromDom;
          if (tagsFromDom) { try { fallback.tags = JSON.parse(tagsFromDom) as string[]; } catch (err) { void err; } }
          await this.showVideoDetailsModal(fallback as VideoInfo, compositeId, memoFromDom);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        window.logger.error('詳細表示(委譲)に失敗:', msg);
      }
      })();
    });
  }

  private setupKeywordActions(videoList: HTMLElement): void {
    // 移動ボタン
    videoList.querySelectorAll(".move-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordMove(event);
      });
    });

    // コピーボタン
    videoList.querySelectorAll(".copy-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordCopy(event);
      });
    });
    
    // 削除ボタン
    videoList.querySelectorAll(".delete-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordDelete(event);
      });
    });

    // 編集ボタン
    videoList.querySelectorAll(".edit-keyword").forEach((button) => {
      button.addEventListener("click", (event) => {
        void this.eventHandlers.handleKeywordEdit(event);
      });
    });
  }

  // 残りのメソッド実装
  initializeEventListeners(): void {
    // ソートイベントはinitializeSettingsで設定されるため、ここでは設定しない

    const createNewMylistElement = document.getElementById("createNewMylist");
    if (createNewMylistElement) {
      createNewMylistElement.addEventListener("click", this.guardEvent(async () => {
        const nameInput = document.getElementById("newMylistName") as HTMLInputElement;
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
          const errorMessage = error instanceof Error ? error.message : "マイリストの作成に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }

    // 動画ソートイベントもinitializeSettingsで設定されるため、ここでは設定しない

    // 動画追加ボタンのイベントリスナー
    const addVideoElement = document.getElementById("addVideo");
    if (addVideoElement) {
      addVideoElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }

        const input = document.getElementById("videoIdInput") as HTMLInputElement;
        if (!input) {
          await this.showCustomAlert("動画ID入力欄が見つかりません");
          return;
        }
        
        try {
          const videoUrl = this.validateInput(input.value, "videoId");

          // URLから動画IDを抽出
          let videoId: string;
          if (videoUrl.includes("nicovideo.jp") || videoUrl.includes("nico.ms")) {
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
          const errorMessage = error instanceof Error ? error.message : "動画の追加に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
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
      addKeywordElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }

        const input = document.getElementById("keywordInput") as HTMLInputElement;
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
          const errorMessage = error instanceof Error ? error.message : "キーワードの追加に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
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
    const executeSelectedActionElement = document.getElementById("executeSelectedAction");
    if (executeSelectedActionElement) {
      executeSelectedActionElement.addEventListener("click", this.guardEvent(async () => {
        const actionSelectElement = document.getElementById("selectedVideosAction") as HTMLSelectElement;
        if (!actionSelectElement) {
          await this.showCustomAlert("操作選択要素が見つかりません");
          return;
        }
        
        const action = actionSelectElement.value;
        if (!action) {
          await this.showCustomAlert("操作を選択してください");
          return;
        }

        const selectedItems = Array.from(document.querySelectorAll(".video-select:checked")).map(
          (checkbox) => (checkbox as HTMLInputElement).closest(".video-item, .keyword-item") as HTMLElement
        ).filter(item => item !== null);

        if (selectedItems.length === 0) {
          await this.showCustomAlert("項目を選択してください");
          return;
        }

        // キーワードと動画を分離
        const selectedVideos = selectedItems.filter((item) => !item.classList.contains("keyword-item"));
        const selectedKeywords = selectedItems.filter((item) => item.classList.contains("keyword-item"));

        try {
          switch (action) {
            case "move":
              await this.batchOperations.moveSelectedItems(selectedVideos, selectedKeywords);
              break;
            case "copy":
              await this.batchOperations.copySelectedItems(selectedVideos, selectedKeywords);
              break;
            case "delete":
              await this.batchOperations.deleteSelectedItems(selectedVideos, selectedKeywords);
              break;
            case "refresh":
              if (selectedKeywords.length > 0) {
                await this.showCustomAlert("キーワードは情報更新できません。動画のみ選択してください。");
                return;
              }
              if (selectedVideos.length > 0) {
                await this.batchOperations.refreshSelectedVideos(selectedVideos);
              }
              break;
          }
        } catch (error) {
          window.logger.error("一括操作に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "操作に失敗しました";
          await this.showCustomAlert(errorMessage);
        }

        // 操作完了後、セレクトボックスをリセット
        actionSelectElement.value = "";
      }));
    }

    // マイリスト名の保存
    const saveMylistNameElement = document.getElementById("saveMylistName");
    if (saveMylistNameElement) {
      saveMylistNameElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }

        try {
          const mylistNameElement = document.getElementById("currentMylistName") as HTMLInputElement;
          if (!mylistNameElement) {
            await this.showCustomAlert("マイリスト名入力欄が見つかりません");
            return;
          }
          
          const newName = this.validateInput(mylistNameElement.value, "mylistName");
          await this.manager.updateMylistName(this.currentMylistId, newName);
          await this.loadMylists();
          await this.showCustomAlert("マイリスト名を更新しました");
        } catch (error) {
          window.logger.error("マイリスト名の更新に失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "マイリスト名の更新に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }

    // マイリストの削除
    const deleteMylistElement = document.getElementById("deleteMylist");
    if (deleteMylistElement) {
      deleteMylistElement.addEventListener("click", this.guardEvent(async () => {
        if (!this.currentMylistId) {
          await this.showCustomAlert("マイリストを選択してください");
          return;
        }

        const mylistNameElement = document.getElementById("currentMylistName") as HTMLInputElement;
        if (!mylistNameElement) {
          await this.showCustomAlert("マイリスト名入力欄が見つかりません");
          return;
        }
        
        const mylistName = mylistNameElement.value;
        if (!await this.showCustomConfirm(`マイリスト「${mylistName}」を削除しますか？\n※この操作は取り消せません`)) {
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
          const errorMessage = error instanceof Error ? error.message : "マイリストの削除に失敗しました";
          await this.showCustomAlert(errorMessage);
        }
      }));
    }

    // エクスポート機能（モーダル経由）
    const exportMylistElement = document.getElementById("exportMylist");
    if (exportMylistElement) {
      exportMylistElement.addEventListener("click", this.guardEvent(async () => {
        const choice = await this.modalService.showExportOptionsModal();
        if (choice.action === 'cancel') return;
        try {
          if (choice.action === 'local') {
            const data = await this.manager.exportData();
            const dateTime = this.formatDateTime();
            const fileName = `Mylist2_${dateTime}.json`;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            await new Promise<void>((resolve, reject) => {
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.onclick = () => { setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 500); };
              a.onerror = () => { URL.revokeObjectURL(url); reject(new Error("ダウンロードに失敗しました")); };
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            });
            await this.showCustomAlert("エクスポートが完了しました");
          } else if (choice.action === 'cloud') {
            const provider = await this.modalService.showCloudProviderSelectModal();
            if (!provider) return;
            const dateTime = this.formatDateTime();
            const baseName = `Mylist2_${dateTime}`;
            const result = await this.manager.uploadBackupToCloud(provider, baseName);
            if (result.success) {
              const providerName = provider === 'gdrive' ? 'Google Drive' : provider === 'onedrive' ? 'OneDrive' : provider === 'dropbox' ? 'Dropbox' : 'MEGA';
              await this.showCustomAlert(`${providerName} にバックアップを保存しました`);
            } else {
              const providerName = provider === 'gdrive' ? 'Google Drive' : provider === 'onedrive' ? 'OneDrive' : provider === 'dropbox' ? 'Dropbox' : 'MEGA';
              await this.showCustomAlert(`${providerName} へのバックアップに失敗しました: ` + (result.error || "不明なエラー"));
            }
          }
        } catch (error) {
          window.logger.error("エクスポート処理でエラー:", error);
          const errorMessage = error instanceof Error ? error.message : "エクスポートに失敗しました";
          await this.showCustomAlert("エクスポートに失敗しました: " + errorMessage);
        }
      }));
    }

    // インポート機能（モーダル経由）
    const importMylistElement = document.getElementById("importMylist");
    if (importMylistElement) {
      importMylistElement.addEventListener("click", this.guardEvent(async () => {
        const choice = await this.modalService.showImportOptionsModal();
        if (choice.action === 'cancel') return;
        if (choice.action === 'local') {
          const input = document.getElementById("importFile") as HTMLInputElement;
          if (!input) {
            await this.showCustomAlert("インポートファイル選択要素が見つかりません");
            return;
          }
          input.accept = ".json,.txt";
          input.click();
        } else if (choice.action === 'clear') {
          const confirmed = await this.showCustomConfirm("本当に全データをクリアしますか？この操作は取り消せません。", "warning", "データベースのクリア");
          if (!confirmed) return;
          const result = await this.manager.clearAllData(false);
          if (result.success) {
            await this.loadMylists();
            const videoListElement = document.getElementById("videoList");
            if (videoListElement) videoListElement.innerHTML = "";
            await this.showCustomAlert("データベースをクリアしました");
          } else {
            await this.showCustomAlert("データベースのクリアに失敗しました: " + (result.error || "不明なエラー"));
          }
        } else if (choice.action === 'cloud') {
          const provider = await this.modalService.showCloudProviderSelectModal();
          if (!provider) return;
          try {
            const backups = await this.manager.listCloudBackups(provider);
            const providerName = provider === 'gdrive' ? 'Google Drive' : provider === 'onedrive' ? 'OneDrive' : provider === 'dropbox' ? 'Dropbox' : 'MEGA';
            if (!backups || backups.length === 0) {
              await this.showCustomAlert(`${providerName} にバックアップが見つかりません`);
              return;
            }
            const selectedId = await this.modalService.showSelectionModal(
              '復元するバックアップを選択',
              backups.map(f => ({ id: f.id, label: f.name, subLabel: f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '' })),
              '復元'
            );
            if (!selectedId) return;
            const confirmed = await this.showCustomConfirm("選択したバックアップで復元します。現在のデータは上書きされます。よろしいですか？", 'warning', '復元確認');
            if (!confirmed) return;
            this.showProgress();
            const res = await this.manager.restoreFromCloudBackup(provider, selectedId);
            if (res.success) {
              await this.loadMylists();
              await this.showCustomAlert("バックアップから復元しました");
            } else {
              await this.showCustomAlert("復元に失敗しました: " + (res.error || "不明なエラー"));
            }
          } finally {
            this.hideProgress();
          }
        }
      }));
    }

    const importFileElement = document.getElementById("importFile");
    if (importFileElement) {
      importFileElement.addEventListener("change", this.guardEvent(async (event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          let mylistId: number | undefined;

          // ファイル形式を判定
          try {
            const data = JSON.parse(text) as unknown;
            if (Array.isArray(data) && typeof data[0] === 'object' && data[0] !== null && 'vid' in data[0]) {
              // カスタムマイリスト1の形式
              this.showProgress();
              mylistId = await this.manager.importLegacyData(text, (current: number, total: number) =>
                this.updateProgress(current, total)
              );
              await this.showCustomAlert("カスタムマイリスト1のデータを正常にインポートしました");
            } else {
              // Mylist2の形式
              this.showProgress();
              // data は unknown なので ExportData の形状を厳密に確認し、明示的に構築
              const rec = data as Record<string, unknown>;
              if (!rec || typeof rec !== 'object') {
                throw new Error('無効なデータ形式です');
              }
              const mylistsUnknown = rec.mylists;
              const videosUnknown = rec.videos;
              const keywordsUnknown = rec.keywords;
              if (!Array.isArray(mylistsUnknown) || !Array.isArray(videosUnknown)) {
                throw new Error('Mylist2のエクスポート形式ではありません');
              }
              const isMylistInfo = (v: unknown): v is MylistInfo => {
                if (typeof v !== 'object' || v === null) return false;
                const r = v as Record<string, unknown>;
                return typeof r.name === 'string' && typeof r.createdAt === 'number';
              };
              const isDBVideo = (v: unknown): v is VideoInfo => {
                if (typeof v !== 'object' || v === null) return false;
                const r = v as Record<string, unknown>;
                return typeof r.id === 'string' && typeof r.originalId === 'string' && typeof r.mylistId === 'number';
              };
              const isKeywordInfo = (v: unknown): v is KeywordInfo => {
                if (typeof v !== 'object' || v === null) return false;
                const r = v as Record<string, unknown>;
                return typeof r.keyword === 'string' && typeof r.addedAt === 'number';
              };
              const exportData: ExportData = {
                mylists: (mylistsUnknown as unknown[]).filter(isMylistInfo),
                videos: (videosUnknown as unknown[]).filter(isDBVideo),
                keywords: Array.isArray(keywordsUnknown) ? (keywordsUnknown as unknown[]).filter(isKeywordInfo) : [],
              };
              await this.manager.importData(exportData);
              await this.showCustomAlert("データを正常にインポートしました");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "JSONの解析に失敗しました";
            throw new Error("無効なJSONファイルです: " + errorMessage);
          }

          // マイリスト一覧を更新
          await this.loadMylists();

          // インポートしたマイリストを選択
          if (mylistId) {
            await this.selectMylist(mylistId);
          }
        } catch (error) {
          window.logger.error("インポートに失敗しました:", error);
          const errorMessage = error instanceof Error ? error.message : "インポートに失敗しました";
          await this.showCustomAlert(errorMessage);
        } finally {
          this.hideProgress();
        }

        // ファイル選択をリセット
        input.value = "";
      }));
    }

    // 全選択ボタンのイベントリスナー（動画のみ）
    const selectAllVideosElement = document.getElementById("selectAllVideos");
    if (selectAllVideosElement) {
      selectAllVideosElement.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(".video-select");
        checkboxes.forEach((checkbox) => {
          // 親要素がキーワードアイテムでない場合のみ選択
          const parentItem = checkbox.closest(".video-item, .keyword-item");
          if (parentItem && !parentItem.classList.contains("keyword-item")) {
            checkbox.checked = true;
          }
        });
      });
    }

    // 選択解除ボタンのイベントリスナー
    const deselectAllVideosElement = document.getElementById("deselectAllVideos");
    if (deselectAllVideosElement) {
      deselectAllVideosElement.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(".video-select");
        checkboxes.forEach((checkbox) => (checkbox.checked = false));
      });
    }
  }

  // 動画詳細モーダルの表示（メモ編集対応）
  private async showVideoDetailsModal(video: VideoInfo, compositeId?: string, memoText: string = ""): Promise<void> {
    await Promise.resolve();
    const modalId = 'videoDetailsModal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      const html = `
        <div id="${modalId}" class="cml2-modal" style="display:none">
          <div class="cml2-modal-content" role="dialog" aria-modal="true">
            <h2 class="cml2-modal-title">動画詳細</h2>
            <div class="cml2-modal-body video-details-body">
              <div class="video-details-section">
                <strong>説明</strong>
                <div class="video-description" style="white-space:pre-wrap"></div>
              </div>
              <div class="video-details-section" style="margin-top:12px">
                <strong>タグ</strong>
                <div class="video-tags"></div>
              </div>
              <div class="video-details-section" style="margin-top:12px">
                <strong>メモ</strong>
                <textarea class="video-memo" rows="4" style="width:100%" placeholder="メモを入力..."></textarea>
              </div>
            </div>
            <div class="cml2-modal-footer">
              <button type="button" class="cml2-btn save-memo-button">メモを保存</button>
              <button type="button" class="cml2-btn close-button">閉じる</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const found = document.getElementById(modalId);
      if (found) {
        modal = found;
      }
    }
    if (!modal) return;
    const descEl = modal.querySelector('.video-description');
    const tagsEl = modal.querySelector('.video-tags');
    const memoEl = modal.querySelector<HTMLTextAreaElement>('.video-memo');
    if (descEl instanceof HTMLElement) {
      const text = video.description || '(説明なし)';
      descEl.innerHTML = linkify(text);
    }
    if (tagsEl) {
      const tags = (video.tags && video.tags.length > 0) ? video.tags : [];
      tagsEl.innerHTML = tags.length > 0
        ? tags.map(t => `<span class="tag" style="display:inline-block;background:#2a2b2c;border:1px solid #444;border-radius:12px;padding:2px 8px;margin:2px 6px 0 0;">${t}</span>`).join('')
        : '(タグなし)';
    }
    if (memoEl) {
      memoEl.value = memoText || '';
    }
    // 表示とクローズ処理
    // タグを辞書リンクに差し替え（上書き）
    if (tagsEl instanceof HTMLElement) {
      const tags = (video.tags && video.tags.length > 0) ? video.tags : [];
      if (tags.length > 0) {
        const anchors = tags.map((t) => {
          const a = document.createElement('a');
          a.className = 'cml2-tag';
          a.href = `https://dic.nicovideo.jp/a/${encodeURIComponent(t)}`;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = t;
          return a.outerHTML;
        }).join('');
        tagsEl.innerHTML = anchors;
      } else {
        tagsEl.innerHTML = '(タグなし)';
      }
    }

    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close-button');
    const saveBtn = modal.querySelector('.save-memo-button');
    const content = modal.querySelector('.cml2-modal-content');
    const handleClose = () => {
      modal.style.display = 'none';
      document.removeEventListener('keydown', onKeydown);
      modal.removeEventListener('click', onBackdrop);
    };
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    const onBackdrop = (e: MouseEvent) => {
      if (!content) return;
      if (!content.contains(e.target as Node)) handleClose();
    };
    if (closeBtn) closeBtn.addEventListener('click', handleClose, { once: true });
    if (saveBtn && memoEl) {
      saveBtn.addEventListener('click', () => {
        void (async () => {
          const text = memoEl.value || '';
          if (compositeId) {
            try {
              await this.manager.updateVideoMemo(compositeId, text);
              const item = document.querySelector(`.video-item[data-composite-id="${compositeId}"]`);
              if (item) {
                (item as HTMLElement).setAttribute('data-memo', text);
              }
              await this.showCustomAlert('メモを保存しました');
            } catch {
              await this.showCustomAlert('メモの保存に失敗しました');
            }
          } else {
            await this.showCustomAlert('メモの保存対象が特定できませんでした');
          }
        })();
      }, { once: true });
    }
    document.addEventListener('keydown', onKeydown);
    modal.addEventListener('click', onBackdrop);
  }

  initializeHeaderControls(): void {
    // 検索機能
    const searchExecElement = document.getElementById("searchExec");
    if (searchExecElement) {
      searchExecElement.addEventListener("click", this.guardEvent(async () => {
        await this.executeSearch();
      }));
    }

    const searchClearElement = document.getElementById("searchClear");
    if (searchClearElement) {
      searchClearElement.addEventListener("click", () => {
        const searchWordsElement = document.getElementById("searchWords") as HTMLInputElement;
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
    const optionElement = document.getElementById("searchOption") as HTMLSelectElement;
    const wordsElement = document.getElementById("searchWords") as HTMLInputElement;
    
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
    window.open(`https://${host}.nicovideo.jp/${type}/${encodeURIComponent(word)}`, "_blank");
  }

  initializeSearchEventListeners(): void {
    // マイリスト検索
    const mylistSearchInput = document.getElementById("mylistSearchInput") as HTMLInputElement;
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
    const videoSearchInput = document.getElementById("videoSearchInput") as HTMLInputElement;
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

  // 動画の検索フィルター
  filterVideos(searchText: string): void {
    const items = document.querySelectorAll(".video-item, .keyword-item");
    items.forEach((item) => {
      if (item.classList.contains("keyword-item")) {
        const keywordElement = item.querySelector(".keyword-text");
        if (!keywordElement) return;
        
        const keyword = keywordElement.textContent?.toLowerCase() || "";
        
        if (keyword.includes(searchText)) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      } else {
        const titleElement = item.querySelector(".video-title-link") || item.querySelector(".video-title");
        const authorElement = item.querySelector(".video-author");
        
        if (!titleElement || !authorElement) return;
        
        const title = titleElement.textContent?.toLowerCase() || "";
        const author = authorElement.textContent?.toLowerCase() || "";
        const memo = (item.getAttribute('data-memo') || '').toLowerCase();

        if (title.includes(searchText) || author.includes(searchText) || memo.includes(searchText)) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      }
    });
  }

  async initializeSettings(): Promise<void> {
    const settings = await this.manager.loadManagerSettings();

    // プルダウンメニューの初期値を設定
    const mylistSort = document.getElementById("mylistSortType") as HTMLSelectElement;
    const videoSort = document.getElementById("videoSortType") as HTMLSelectElement;
    const themeSelect = document.getElementById("themeSelect") as HTMLSelectElement | null;
    
    if (!mylistSort || !videoSort) {
      window.logger.error("ソート選択要素が見つかりません");
      return;
    }

    mylistSort.value = settings.mylistSortType;
    videoSort.value = settings.videoSortType;
    // テーマ初期値
    const themeValue = (settings as { theme?: string }).theme || 'dark-blue';
    if (themeSelect) themeSelect.value = themeValue;
    this.applyTheme(themeValue);

    // 初期表示時に並び替えを実行
    await this.loadMylists(); // マイリスト一覧の並び替え
    if (this.currentMylistId) {
      await this.loadVideos(); // 動画一覧の並び替え
    }

    // 変更イベントの設定
    mylistSort.addEventListener("change", this.guardEvent(async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value,
        theme: themeSelect ? themeSelect.value : (settings as { theme?: string }).theme || 'dark-blue',
      });
      await this.loadMylists();
    }));

    videoSort.addEventListener("change", this.guardEvent(async () => {
      await this.manager.saveManagerSettings({
        mylistSortType: mylistSort.value,
        videoSortType: videoSort.value,
        theme: themeSelect ? themeSelect.value : (settings as { theme?: string }).theme || 'dark-blue',
      });
      await this.loadVideos();
    }));

    if (themeSelect) {
      themeSelect.addEventListener("change", this.guardEvent(async () => {
        const newTheme = themeSelect.value;
        await this.manager.saveManagerSettings({
          mylistSortType: mylistSort.value,
          videoSortType: videoSort.value,
          theme: newTheme,
        });
        this.applyTheme(newTheme);
      }));
    }
  }

  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(keywordId: number, currentKeyword: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }
      
      const input = modal.querySelector("#editKeywordInput") as HTMLInputElement;
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
      (modal).style.display = "flex";

      // クローズボタンのイベントリスナー
      const closeHandler = () => {
        (modal).style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };

      // 保存ボタンのイベントリスナー
      const saveHandler = () => {
        const newKeyword = input.value;
        (modal).style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };

      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }

  // 折りたたみ可能なコントロールの初期化
  initializeCollapsibleControls(): void {
    const hoverArea = document.querySelector('.control-hover-area') as HTMLElement;
    const collapsibleControls = document.querySelector('.collapsible-controls') as HTMLElement;
    const alwaysShowCheckbox = document.getElementById('alwaysShowControls') as HTMLInputElement;
    
    if (!hoverArea || !collapsibleControls || !alwaysShowCheckbox) {
      window.logger.warn("折りたたみ可能なコントロール要素が見つかりません");
      return;
    }

    let autoHideTimer: number | null = null;
    let isControlsVisible = false;
    let alwaysVisible = false;

    // LocalStorageから設定を読み込み
    const savedSetting = localStorage.getItem('mylist2-always-show-controls');
    if (savedSetting === 'true') {
      alwaysVisible = true;
      alwaysShowCheckbox.checked = true;
    }

    // 表示モードの切り替え関数
    const updateDisplayMode = () => {
      if (alwaysVisible) {
        // 常時表示モード
        collapsibleControls.classList.add('always-visible');
        hoverArea.classList.add('always-visible-mode');
        isControlsVisible = true;
        if (autoHideTimer) {
          clearTimeout(autoHideTimer);
          autoHideTimer = null;
        }
      } else {
        // ホバー表示モード
        collapsibleControls.classList.remove('always-visible');
        hoverArea.classList.remove('always-visible-mode');
        if (isControlsVisible) {
          hideControls();
        }
      }
    };

    // マウスホバーとフォーカス状態の管理
    const showControls = () => {
      if (alwaysVisible) return; // 常時表示モードでは何もしない
      
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }
      isControlsVisible = true;
      collapsibleControls.classList.add('transitioning');
      collapsibleControls.style.transform = 'translateY(0)';
    };

    const hideControls = () => {
      if (alwaysVisible) return; // 常時表示モードでは何もしない
      
      autoHideTimer = window.setTimeout(() => {
        isControlsVisible = false;
        collapsibleControls.style.transform = 'translateY(-100%)';
        setTimeout(() => {
          collapsibleControls.classList.remove('transitioning');
        }, 300);
      }, 2000); // 2秒後に自動で隠す
    };

    // チェックボックスのイベントリスナー
    alwaysShowCheckbox.addEventListener('change', () => {
      alwaysVisible = alwaysShowCheckbox.checked;
      // LocalStorageに設定を保存
      localStorage.setItem('mylist2-always-show-controls', alwaysVisible.toString());
      updateDisplayMode();
    });

    // ホバーエリアのイベント
    hoverArea.addEventListener('mouseenter', showControls);
    hoverArea.addEventListener('mouseleave', hideControls);

    // コントロールエリア自体のイベント
    collapsibleControls.addEventListener('mouseenter', showControls);
    collapsibleControls.addEventListener('mouseleave', hideControls);

    // フォーカスイベント（キーボードナビゲーション対応）
    collapsibleControls.addEventListener('focusin', showControls);
    collapsibleControls.addEventListener('focusout', () => {
      // フォーカスがコントロールエリア外に移った場合のみ隠す
      setTimeout(() => {
        if (!collapsibleControls.contains(document.activeElement)) {
          hideControls();
        }
      }, 100);
    });

    // タッチデバイス対応
    if ('ontouchstart' in window) {
      let touchTimer: number | null = null;
      
      hoverArea.addEventListener('touchstart', (e) => {
        if (alwaysVisible) return; // 常時表示モードでは何もしない
        
        e.preventDefault();
        if (isControlsVisible) {
          hideControls();
        } else {
          showControls();
        }
      });

      // タッチ後の自動隠し
      collapsibleControls.addEventListener('touchend', () => {
        if (alwaysVisible) return; // 常時表示モードでは何もしない
        
        if (touchTimer) clearTimeout(touchTimer);
        touchTimer = window.setTimeout(() => {
          hideControls();
        }, 5000); // タッチデバイスでは5秒後に隠す
      });
    }

    // キーボードショートカット（Ctrl + Shift + C でコントロール表示切り替え）
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault();
        if (isControlsVisible) {
          hideControls();
        } else {
          showControls();
        }
      }
    });

    // 初期状態の設定（LocalStorageに設定がない場合のみデフォルト値を設定）
    if (savedSetting === null && window.innerWidth > 1024) {
      // 初回アクセスかつ大画面の場合のみデフォルトで常時表示をオン
      alwaysVisible = true;
      alwaysShowCheckbox.checked = true;
      localStorage.setItem('mylist2-always-show-controls', 'true');
    }
    
    // 初期表示モードの適用
    updateDisplayMode();

    window.logger.info("折りたたみ可能なコントロールが初期化されました");
  }
} 
