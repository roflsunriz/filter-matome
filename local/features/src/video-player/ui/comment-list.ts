import { Comment } from "@/types/index.js";

const ACTIVE_COMMENT_WINDOW_MS = 5000;
const COMMENT_CANVAS_CENTER_OFFSET_MS = ACTIVE_COMMENT_WINDOW_MS / 2;

/**
 * シャドウDOM版コメントリスト表示クラス
 * Web Componentsとして実装してスタイル分離を実現
 */
export class CommentList extends HTMLElement {
  private shadow: ShadowRoot;
  private list: HTMLElement | null = null;
  private comments: Comment[] = [];
  private commentItems: HTMLElement[] = [];
  private currentTime = 0;
  private activeStartIndex = 0;
  private activeEndIndex = 0;
  private autoScroll = true;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();

    // シャドウDOMを作成
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = this.getTemplate();

    this.setupEventListeners();
  }

  /**
   * HTMLテンプレートを取得
   */
  private getTemplate(): string {
    return `
      <style>
        ${this.getStyles()}
      </style>
      <div class="comment-list-container">
        <div class="comment-list"></div>
      </div>
    `;
  }

  /**
   * CSSスタイルを取得（シャドウDOM内で完全に分離）
   */
  private getStyles(): string {
    return `
      :host {
        display: block;
        width: 100%; /* 親コンテナに追従 */
        height: 100%; /* 親コンテナに追従 */
        background: rgba(40, 40, 40, 0.95);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        color: white;
        box-sizing: border-box;
        /* シャドウDOM内では外部スタイルの影響を受けない */
      }

      .comment-list-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }



      .comment-list {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
      }

      .comment-list::-webkit-scrollbar {
        width: 6px;
      }

      .comment-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .comment-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }

      .comment-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .comment-item {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 13px;
        line-height: 1.4;
      }

      .comment-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .comment-item.active {
        background: rgba(0, 123, 255, 0.2);
        border-left: 3px solid #007bff;
        padding-left: 9px;
      }

      .comment-time {
        color: #80cbc4;
        font-size: 11px;
        font-family: monospace;
        margin-right: 8px;
        min-width: 45px;
        display: inline-block;
      }

      .comment-text {
        color: white;
        word-break: break-word;
        line-height: 1.3;
      }

      .comment-item:last-child {
        border-bottom: none;
      }

      /* 空の状態 */
      .comment-list:empty::before {
        content: "コメントがありません";
        display: block;
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

      /* レスポンシブ対応 */
      @media (max-width: 1023px) {
        :host {
          width: 100%;
          max-width: 100vw;
          height: 300px;
          margin-top: 10px;
          border-radius: 0;
        }


        .comment-item {
          padding: 6px 10px;
          font-size: 12px;
        }

        .comment-time {
          font-size: 10px;
          margin-right: 6px;
          min-width: 40px;
        }
      }

      /* 画面幅1024px以上での高さ自動調整 */
      @media (min-width: 1024px) {
        :host(.auto-height) {
          height: var(--player-height, 400px);
        }
      }
    `;
  }

  /**
   * コンポーネントがDOMに接続された時
   */
  connectedCallback(): void {
    this.list = this.shadow.querySelector(".comment-list");
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // スクロールイベントの設定
    this.setupScrollListener();
  }

  /**
   * リサイズ監視の設定
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") {
      window.logger.warn("ResizeObserverが利用できません...");
      window.addEventListener("resize", () => this.syncHeight());
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.syncHeight();
    });

    // プレイヤーの高さに合わせる
    const player = document.getElementById("custom-player");
    if (player) {
      this.resizeObserver.observe(player);
    }
  }

  /**
   * スクロールイベントの設定
   */
  private setupScrollListener(): void {
    if (!this.list) return;

    this.list.addEventListener("scroll", () => {
      if (this.autoScroll && this.list) {
        const scrollDiff =
          this.list.scrollHeight - this.list.clientHeight - this.list.scrollTop;
        if (scrollDiff > 50) {
          this.autoScroll = false;
          // 一定時間後に自動スクロールを再開
          setTimeout(() => (this.autoScroll = true), 5000);
        }
      }
    });
  }

  /**
   * プレイヤーの高さに同期
   */
  syncHeight(): void {
    const player = document.getElementById("custom-player");
    if (!player) return;

    // 画面幅に応じて高さを調整
    if (window.innerWidth > 1023) {
      const playerHeight = player.offsetHeight;
      this.style.setProperty("--player-height", `${playerHeight}px`);
      this.classList.add("auto-height");
    } else {
      this.classList.remove("auto-height");
    }
  }

  /**
   * コメントの追加
   */
  addComments(comments: Comment[]): void {
    this.comments = [...comments].sort((a, b) => a.vposMs - b.vposMs);
    this.activeStartIndex = 0;
    this.activeEndIndex = 0;
    this.renderComments();
  }

  getComments(): Comment[] {
    return [...this.comments];
  }

  /**
   * コメントリストのレンダリング
   */
  private renderComments(): void {
    if (!this.list) return;

    this.list.innerHTML = "";
    this.commentItems = [];
    this.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.dataset.vpos = comment.vposMs.toString();

      const time = this.formatTime(comment.vposMs / 1000);
      item.innerHTML = `
        <span class="comment-time">${time}</span>
        <span class="comment-text">${this.escapeHtml(comment.body)}</span>
      `;

      // クリックイベントの追加（動画のシーク）
      item.addEventListener("click", () => {
        const videoElement = document.getElementById(
          "video-element",
        ) as HTMLVideoElement;
        if (videoElement) {
          videoElement.currentTime = comment.vposMs / 1000;
        }
      });

      if (this.list) {
        this.list.appendChild(item);
        this.commentItems.push(item);
      }
    });
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 表示時間の更新
   */
  updateTime(currentTimeMs: number): void {
    this.currentTime = currentTimeMs;
    if (!this.list) return;

    const nextStartIndex = this.findFirstCommentAfter(
      currentTimeMs - ACTIVE_COMMENT_WINDOW_MS,
    );
    const nextEndIndex = this.findFirstCommentAfter(currentTimeMs);

    this.updateActiveRange(nextStartIndex, nextEndIndex);

    // 自動スクロール（scrollIntoView を使わずリスト内のみをスクロール）
    if (this.autoScroll && nextEndIndex > nextStartIndex) {
      const centerIndex = this.findCommentIndexAtCanvasCenter(
        currentTimeMs,
        nextStartIndex,
        nextEndIndex,
      );
      this.scrollToCenteredItem(centerIndex);
    }
  }

  private findCommentIndexAtCanvasCenter(
    currentTimeMs: number,
    activeStartIndex: number,
    activeEndIndex: number,
  ): number {
    const centerTimeMs = currentTimeMs - COMMENT_CANVAS_CENTER_OFFSET_MS;
    const centerIndex = this.findFirstCommentAfter(centerTimeMs) - 1;
    if (centerIndex < activeStartIndex) {
      return activeStartIndex;
    }
    if (centerIndex >= activeEndIndex) {
      return activeEndIndex - 1;
    }
    return centerIndex;
  }

  private findFirstCommentAfter(timeMs: number): number {
    let low = 0;
    let high = this.comments.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.comments[mid].vposMs <= timeMs) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  private updateActiveRange(
    nextStartIndex: number,
    nextEndIndex: number,
  ): void {
    if (
      nextStartIndex === this.activeStartIndex &&
      nextEndIndex === this.activeEndIndex
    ) {
      return;
    }

    this.updateItemActiveState(
      this.activeStartIndex,
      this.activeEndIndex,
      false,
      nextStartIndex,
      nextEndIndex,
    );
    this.updateItemActiveState(nextStartIndex, nextEndIndex, true);

    this.activeStartIndex = nextStartIndex;
    this.activeEndIndex = nextEndIndex;
  }

  private updateItemActiveState(
    startIndex: number,
    endIndex: number,
    active: boolean,
    skipStartIndex = -1,
    skipEndIndex = -1,
  ): void {
    for (let index = startIndex; index < endIndex; index++) {
      if (index >= skipStartIndex && index < skipEndIndex) {
        continue;
      }
      this.commentItems[index]?.classList.toggle("active", active);
    }
  }

  private scrollToCenteredItem(index: number): void {
    if (!this.list) return;
    const activeItem = this.commentItems[index];
    if (!activeItem) return;

    const list = this.list;
    const itemCenter = activeItem.offsetTop + activeItem.offsetHeight / 2;
    const nextScrollTop = itemCenter - list.clientHeight / 2;
    const maxScrollTop = list.scrollHeight - list.clientHeight;

    list.scrollTop = Math.max(0, Math.min(nextScrollTop, maxScrollTop));
  }

  /**
   * 秒数をMM:SS形式に変換
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * コメントリストの表示/非表示を切り替え
   */
  setVisible(visible: boolean): void {
    this.style.display = visible ? "block" : "none";
  }

  /**
   * コメントをクリア
   */
  clearComments(): void {
    this.comments = [];
    this.commentItems = [];
    this.activeStartIndex = 0;
    this.activeEndIndex = 0;
    if (this.list) {
      this.list.innerHTML = "";
    }
  }

  /**
   * コンポーネントがDOMから切断された時
   */
  disconnectedCallback(): void {
    // ResizeObserverの解除
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // イベントリスナーの削除
    window.removeEventListener("resize", () => this.syncHeight());
  }
}

// カスタムエレメントとして登録
if (!customElements.get("comment-list-shadow")) {
  customElements.define("comment-list-shadow", CommentList);
}
