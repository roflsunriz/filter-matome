import type { VideoData } from "@/types";
import { createMaterialIcon } from "@/common/material-icons.js";

/**
 * 検索結果モーダルの設定
 */
export interface SearchResultsModalConfig {
  itemsPerPage: number;
  maxDisplayItems: number;
}

/**
 * SearchResultsModal - 検索結果をモーダルで表示
 */
export class SearchResultsModal {
  private modal: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private query = "";
  private results: VideoData[] = [];
  private currentPage = 0;
  private createVideoCard: ((data: VideoData) => HTMLElement) | null = null;
  private onCardClick: ((id: string) => void) | null = null;

  private readonly config: SearchResultsModalConfig;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: Partial<SearchResultsModalConfig> = {}) {
    this.config = {
      itemsPerPage: config.itemsPerPage ?? 50,
      maxDisplayItems: config.maxDisplayItems ?? 1000,
    };
  }

  /**
   * カード生成関数を設定
   */
  public setCardCreator(creator: (data: VideoData) => HTMLElement): void {
    this.createVideoCard = creator;
  }

  /**
   * カードクリック時のコールバックを設定
   */
  public setOnCardClick(handler: (id: string) => void): void {
    this.onCardClick = handler;
  }

  /**
   * モーダルを開いて検索結果を表示
   */
  public open(query: string, results: VideoData[]): void {
    this.query = query;
    this.results = results.slice(0, this.config.maxDisplayItems);
    this.currentPage = 0;

    this.createModal();
    this.renderResults();
    this.setupEventListeners();

    // フォーカストラップとESCキー
    document.body.style.overflow = "hidden";
    this.modal?.focus();
  }

  /**
   * モーダルを閉じる
   */
  public close(): void {
    if (this.modal) {
      this.modal.classList.add("closing");
      
      // アニメーション後に削除
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
        this.contentContainer = null;
        document.body.style.overflow = "";
      }, 200);
    }

    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  private createModal(): void {
    // 既存のモーダルを削除
    const existing = document.querySelector(".search-results-modal");
    if (existing) {
      existing.remove();
    }

    this.modal = document.createElement("div");
    this.modal.className = "search-results-modal";
    this.modal.tabIndex = -1;

    const closeIcon = createMaterialIcon("close", {
      color: "white",
      size: "medium",
    });

    const totalCount = this.results.length;
    const displayNote =
      totalCount >= this.config.maxDisplayItems
        ? `（上限 ${this.config.maxDisplayItems.toLocaleString()} 件）`
        : "";

    this.modal.innerHTML = `
      <div class="search-results-modal-overlay"></div>
      <div class="search-results-modal-content">
        <div class="search-results-modal-header">
          <div class="search-results-modal-title">
            <span class="search-query">"${this.escapeHtml(this.query)}"</span>
            <span class="search-count">${totalCount.toLocaleString()} 件の結果${displayNote}</span>
          </div>
          <button class="search-results-modal-close" aria-label="閉じる">
            ${closeIcon}
          </button>
        </div>
        <div class="search-results-modal-body">
          <div class="search-results-grid"></div>
        </div>
        <div class="search-results-modal-footer">
          <div class="search-results-pagination"></div>
        </div>
      </div>
    `;

    this.contentContainer = this.modal.querySelector(
      ".search-results-grid",
    ) as HTMLElement;

    document.body.appendChild(this.modal);

    // アニメーション用
    requestAnimationFrame(() => {
      this.modal?.classList.add("open");
    });
  }

  private renderResults(): void {
    if (!this.contentContainer || !this.createVideoCard) return;

    const start = this.currentPage * this.config.itemsPerPage;
    const end = Math.min(start + this.config.itemsPerPage, this.results.length);
    const pageResults = this.results.slice(start, end);

    this.contentContainer.innerHTML = "";

    if (pageResults.length === 0) {
      this.contentContainer.innerHTML = `
        <div class="search-no-results">
          ${createMaterialIcon("search_off", { color: "white", size: "large" })}
          <p>検索結果がありません</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of pageResults) {
      const card = this.createVideoCard(item);
      card.classList.add("search-result-card");
      fragment.appendChild(card);
    }
    this.contentContainer.appendChild(fragment);

    this.renderPagination();
  }

  private renderPagination(): void {
    const footer = this.modal?.querySelector(
      ".search-results-pagination",
    ) as HTMLElement | null;
    if (!footer) return;

    const totalPages = Math.ceil(
      this.results.length / this.config.itemsPerPage,
    );

    if (totalPages <= 1) {
      footer.innerHTML = "";
      return;
    }

    const prevIcon = createMaterialIcon("chevron_left", {
      color: "white",
      size: "small",
    });
    const nextIcon = createMaterialIcon("chevron_right", {
      color: "white",
      size: "small",
    });

    footer.innerHTML = `
      <button class="pagination-btn pagination-prev" ${this.currentPage === 0 ? "disabled" : ""}>
        ${prevIcon}
        前へ
      </button>
      <span class="pagination-info">
        ${this.currentPage + 1} / ${totalPages} ページ
      </span>
      <button class="pagination-btn pagination-next" ${this.currentPage >= totalPages - 1 ? "disabled" : ""}>
        次へ
        ${nextIcon}
      </button>
    `;

    // ページネーションイベント
    footer.querySelector(".pagination-prev")?.addEventListener("click", () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.renderResults();
        this.scrollToTop();
      }
    });

    footer.querySelector(".pagination-next")?.addEventListener("click", () => {
      if (this.currentPage < totalPages - 1) {
        this.currentPage++;
        this.renderResults();
        this.scrollToTop();
      }
    });
  }

  private scrollToTop(): void {
    const body = this.modal?.querySelector(
      ".search-results-modal-body",
    );
    if (body instanceof HTMLElement) {
      body.scrollTop = 0;
    }
  }

  private setupEventListeners(): void {
    if (!this.modal) return;

    // 閉じるボタン
    this.modal
      .querySelector(".search-results-modal-close")
      ?.addEventListener("click", () => {
        this.close();
      });

    // オーバーレイクリック
    this.modal
      .querySelector(".search-results-modal-overlay")
      ?.addEventListener("click", () => {
        this.close();
      });

    // ESCキー
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.escapeHandler);

    // カードクリック
    this.modal.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      
      const card = target.closest(".video-card");
      if (card instanceof HTMLElement && this.onCardClick) {
        const id = card.dataset.id;
        if (id) {
          this.onCardClick(id);
        }
      }
    });

    // カード内ボタンのイベントを伝播させる
    this.modal.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      
      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const card = button.closest(".video-card");
      if (!(card instanceof HTMLElement)) return;

      const baseId = card.dataset.id;
      if (!baseId) return;

      // ボタンの種類に応じて処理
      if (button.classList.contains("play-btn")) {
        window.open(`/watch/${baseId}`, "_blank");
        e.stopPropagation();
      } else if (button.classList.contains("save-video-btn")) {
        window.open(`./ffmpeg?video=${baseId}`, "_blank");
        e.stopPropagation();
      } else if (button.classList.contains("save-audio-btn")) {
        window.open(`./ffmpeg?audio=${baseId}`, "_blank");
        e.stopPropagation();
      } else if (button.classList.contains("delete-btn")) {
        const title =
          card.querySelector(".video-title")?.textContent ?? "";
        if (
          confirm(
            `本当に削除しますか？\nID : ${baseId}\nタイトル : ${title}`,
          )
        ) {
          window.open(`./rm?${baseId}`, "_blank");
        }
        e.stopPropagation();
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * モーダルが開いているかどうか
   */
  public isOpen(): boolean {
    return this.modal !== null;
  }

  /**
   * 現在の検索クエリを取得
   */
  public getQuery(): string {
    return this.query;
  }

  /**
   * 結果数を取得
   */
  public getResultCount(): number {
    return this.results.length;
  }
}

