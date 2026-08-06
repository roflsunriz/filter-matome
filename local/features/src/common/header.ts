/**
 * 共通ヘッダーコンポーネント (Shadow DOM版)
 * ニコニコ動画風のヘッダーを提供します
 */

import type {
  HeaderConfig,
  CommonHeaderInstance,
} from "@/types/common-types.js";
import {
  createMaterialIcon,
  materialIconsStyles,
  ICONS,
} from "@/common/material-icons.js";

// 型を再エクスポート
export type { HeaderConfig, CommonHeaderInstance };

export class CommonHeader implements CommonHeaderInstance {
  private container: HTMLElement;
  private config: HeaderConfig;
  private isFixed: boolean = false;
  private shadowRoot: ShadowRoot;

  constructor(container: HTMLElement | string, config: HeaderConfig = {}) {
    this.container =
      typeof container === "string"
        ? document.getElementById(container) || document.createElement("div")
        : container;

    this.config = {
      title: "CustomMylist2 Manager",
      showSearch: true,
      showMoreLinks: true,
      enableFixedMode: false,
      ...config,
    };

    // Shadow DOM を作成
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    this.init();
  }

  /**
   * ヘッダーを初期化
   */
  private init(): void {
    this.loadTemplate();
    this.setupEventListeners();
    this.applyConfig();
  }

  /**
   * HTMLテンプレートを読み込み
   */
  private loadTemplate(): void {
    // Shadow DOM内にスタイルとHTMLを挿入
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getHeaderStyles()}
      </style>
      ${this.getHeaderTemplate()}
    `;
  }

  /**
   * ヘッダーのスタイルを取得
   */
  private getHeaderStyles(): string {
    return `
      /* 共通ヘッダーコンポーネントのスタイル */
      :host {
        display: block;
        position: relative;
        top: var(--header-offset-top, 0);
        left: var(--header-offset-left, 0);
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .custom-header {
        background: var(--header-bg-color, #252525);
        color: var(--header-text-color, #fff);
        padding: var(--header-padding, 8px 20px);
        transition: all 0.3s ease;
        min-height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
        position: relative;
        width: min(var(--header-width, 100%), 100%);
        box-sizing: border-box;
        margin: 0;
        overflow: visible;
        border-bottom: 1px solid var(--nc-border, #364151);
      }

      .custom-header.fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--header-z-index, 9000);
        box-shadow: var(--header-fixed-shadow, 0 2px 5px rgba(0, 0, 0, 0.2));
        min-height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        max-width: 1200px;
        margin: 0 auto;
        min-width: 0;
      }

      /* ヘッダー左部分 */
      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
        flex: 0 1 auto;
        min-width: 0;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.2em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .header-center {
        flex: 1 1 320px;
        min-width: 240px;
      }

      .header-right {
        flex: 0 1 auto;
        min-width: 0;
      }

      /* 検索部分 */
      .search-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        width: 100%;
      }

      .search-clear-btn {
        position: relative;
        right: -5px;
        background-color: #3498db;
        border: solid 1px #444;
        cursor: pointer;
        padding: 5px;
        color: #666;
      }

      .search-clear-btn:hover {
        color: #333;
      }

      .search-container select,
      .search-container input {
        box-sizing: border-box;
        height: 36px;
        min-height: 36px;
        padding: 6px 10px;
        border: 1px solid var(--nc-border, #364151);
        border-radius: var(--nc-radius-sm, 6px);
        background: var(--nc-surface, #1a2029);
        color: var(--nc-text, #edf1f7);
      }

      .search-container select {
        flex: 0 0 auto;
        min-width: 96px;
      }

      .search-container input {
        flex: 0 0 var(--header-search-input-width, 240px);
        width: var(--header-search-input-width, 240px);
        max-width: 100%;
      }

      .search-container button {
        margin-left: 0;
        background: var(--header-search-btn-bg, #2a88bd);
        color: var(--nc-primary-contrast, #0d1b36);
        border: 1px solid var(--header-search-btn-bg, #6f9cff);
        padding: 8px 16px;
        border-radius: var(--nc-radius-sm, 6px);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .search-container button:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      /* アイコンボタン専用スタイル */
      .icon-btn {
        background: var(--header-search-btn-bg, #2a88bd);
        color: var(--nc-primary-contrast, #0d1b36);
        border: 1px solid var(--header-search-btn-bg, #6f9cff);
        padding: 8px;
        border-radius: var(--nc-radius-sm, 6px);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
      }

      .icon-btn:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      .clear-btn {
        background: var(--nc-surface, #1a2029);
        border-color: var(--nc-border, #364151);
        color: var(--nc-muted, #a9b4c3);
        margin-left: 0;
      }

      .clear-btn:hover {
        background: var(--nc-surface-subtle, #242c37);
        color: var(--nc-text, #edf1f7);
      }

      /* リンク部分 */
      .header-links {
        display: flex;
        gap: 15px;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        min-width: 0;
      }

      .header-links a {
        color: var(--header-link-color, #fff);
        text-decoration: none;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }

      .header-links a:hover {
        color: var(--header-link-hover, #2196f3);
      }

      .header-links button {
        background: transparent;
        border: none;
        color: var(--header-link-color, #fff);
        font-size: 0.9em;
        cursor: pointer;
        padding: 0;
      }

      .header-links button:hover {
        color: var(--header-link-hover, #2196f3);
      }

      /* ドロップダウンメニュー */
      .more-links {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .link-menu {
        position: relative;
      }

      .dropdown-content {
        display: none;
        position: absolute;
        right: 0;
        background-color: var(--nc-surface, #1a2029);
        border: 1px solid var(--nc-border, #364151);
        border-radius: var(--nc-radius, 10px);
        min-width: 160px;
        box-shadow: var(--nc-shadow-raised, 0 12px 30px rgba(0, 0, 0, 0.24));
        z-index: 9001;
      }

      .link-menu:first-child .dropdown-content {
        right: auto;
        left: 0;
      }

      .dropdown-content a {
        padding: 12px 16px;
        display: block;
        white-space: nowrap;
      }

      .link-menu:hover .dropdown-content,
      .link-menu:focus-within .dropdown-content {
        display: block;
      }

      button:focus-visible,
      input:focus-visible,
      select:focus-visible,
      a:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--nc-primary, #6f9cff) 35%, transparent);
        outline-offset: 2px;
      }

      @media (max-width: 960px) {
        .header-content {
          justify-content: flex-start;
        }

        .header-center {
          order: 3;
          flex-basis: 100%;
        }

        .header-right {
          margin-left: auto;
        }
      }

      @media (max-width: 640px) {
        .custom-header {
          padding: 8px 12px;
        }

        .header-left {
          flex-basis: 100%;
        }

        .header-right {
          width: 100%;
          margin-left: 0;
        }

        .header-links {
          justify-content: flex-start;
          gap: 10px;
        }

        .more-links {
          gap: 10px;
        }

        .search-container {
          flex-wrap: wrap;
        }

        .search-container select {
          flex: 1 1 120px;
        }

      }

      /* マテリアルアイコンの統合 */
      ${materialIconsStyles}
    `;
  }

  /**
   * ヘッダーテンプレート
   */
  private getHeaderTemplate(): string {
    return `
      <!-- 共通ヘッダーテンプレート -->
      <header id="customHeader" class="custom-header">
        <div class="header-content">
          <div class="header-left">
            <h1 data-header-title="${this.config.title}">${this.config.title}</h1>
          </div>
          <div class="header-center">
            <div class="search-container">
              <select id="searchOption" data-header-search-select>
                <option value="www+search">キーワード</option>
                <option value="www+tag">タグ</option>
                <option value="www+mylist_search">マイリスト</option>
                <option value="seiga+search">静画</option>
                <option value="live+search">生放送</option>
                <option value="ch+search">チャンネル</option>
                <option value="dic+s/al/t">大百科</option>
              </select>
              <input type="text" id="searchWords" data-header-search-input placeholder="入力して検索…" />
              <button id="searchExec" data-header-search-btn class="icon-btn" title="検索">
                ${createMaterialIcon(ICONS.search, { style: "outlined", color: "white" })}
              </button>
              <button id="searchClear" data-header-clear-btn class="icon-btn clear-btn" title="クリア">
                ${createMaterialIcon(ICONS.close, { style: "outlined", color: "white" })}
              </button>
            </div>
          </div>
          <div class="header-right">
            <nav class="header-links">
              <a href="https://www.nicovideo.jp/" target="_blank" title="トップ">
                ${createMaterialIcon(ICONS.home, { style: "outlined", color: "white" })}
                トップ
              </a>
              <span class="more-links">
                <span class="link-menu" data-header-menu="main">
                  <button type="button" aria-haspopup="true">メイン▼</button>
                  <div class="dropdown-content">
                    <a href="https://www.nicovideo.jp/video_top" target="_blank" title="動画">
                      ${createMaterialIcon(ICONS.play, { style: "outlined", color: "white" })}
                      動画
                    </a>
                    <a href="https://seiga.nicovideo.jp/" target="_blank" title="静画">
                      ${createMaterialIcon(ICONS.image, { style: "outlined", color: "white" })}
                      静画
                    </a>
                    <a href="https://live.nicovideo.jp/" target="_blank" title="生放送">
                      ${createMaterialIcon(ICONS.live_tv, { style: "outlined", color: "white" })}
                      生放送
                    </a>
                    <a href="https://ch.nicovideo.jp/" target="_blank" title="チャンネル">
                      ${createMaterialIcon(ICONS.tv, { style: "outlined", color: "white" })}
                      チャンネル
                    </a>
                  </div>
                </span>
                <span class="link-menu" data-header-menu="other">
                  <button id="moreLinksBtn" type="button" data-header-more-btn aria-haspopup="true">その他▼</button>
                  <div class="dropdown-content">
                    <a href="https://dic.nicovideo.jp/" target="_blank" title="大百科">
                      大百科
                    </a>
                    <a href="https://jk.nicovideo.jp/" target="_blank" title="実況">
                      実況
                    </a>
                    <a href="https://anime.nicovideo.jp/" target="_blank" title="Nアニメ">
                      Nアニメ
                    </a>
                    <a href="https://www.nicovideo.jp/ranking" target="_blank" title="ランキング">ランキング</a>
                    <a href="https://www.nicovideo.jp/my/history/video" target="_blank" title="マイページ">
                      ${createMaterialIcon(ICONS.bookmark, { style: "outlined", color: "white" })}
                      マイページ
                    </a>
                    <a href="https://www.nicovideo.jp/newarrival" target="_blank" title="新着動画">
                      新着動画
                    </a>
                    <a href="https://www.nicovideo.jp/recent" target="_blank" title="新着コメント">
                      新着コメント
                    </a>
                  </div>
                </span>
                <span class="link-menu" data-header-menu="filter-matome">
                  <button type="button" aria-haspopup="true">filter-matome▼</button>
                  <div class="dropdown-content">
                    <a href="https://www.nicovideo.jp/local/features/dist/pages/mylist2/index.html" target="_blank" title="mylist2">
                      mylist2
                    </a>
                    <a href="https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html" target="_blank" title="watch-history">
                      watch-history
                    </a>
                    <a href="https://www.nicovideo.jp/cache/" target="_blank" title="キャッシュ">
                      キャッシュ
                    </a>
                    <a href="https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html" target="_blank" title="video-player">
                      video-player
                    </a>
                    <a href="https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html" target="_blank" title="movie-info">
                      movie-info
                    </a>
                    <a href="https://www.nicovideo.jp/local/features/dist/pages/movie-fetcher/index.html" target="_blank" title="smartFetcher">
                      smartFetcher
                    </a>
                    <a href="https://github.com/roflsunriz/filter-matome" target="_blank" title="filter-matome">
                      filter-matome (GitHub)
                    </a>
                  </div>
                </span>
              </span>
            </nav>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // 検索機能
    const searchBtn = this.shadowRoot.querySelector(
      "#searchExec",
    ) as HTMLButtonElement;
    const clearBtn = this.shadowRoot.querySelector(
      "#searchClear",
    ) as HTMLButtonElement;

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.handleSearch());
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.handleClear());
    }

    // Enterキーでの検索
    const searchInput = this.shadowRoot.querySelector(
      "#searchWords",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch();
        }
      });
    }

    // 固定モード用のスクロール監視
    if (this.config.enableFixedMode) {
      window.addEventListener("scroll", () => this.handleScroll());
    }
  }

  /**
   * 設定を適用
   */
  private applyConfig(): void {
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement && this.config.title) {
      titleElement.textContent = this.config.title;
    }

    const searchContainer = this.shadowRoot.querySelector(".search-container");
    if (searchContainer && !this.config.showSearch) {
      (searchContainer as HTMLElement).style.display = "none";
    }

    const moreLinks = this.shadowRoot.querySelector(".more-links");
    if (moreLinks && !this.config.showMoreLinks) {
      (moreLinks as HTMLElement).style.display = "none";
    }

    // カスタムリンクの追加
    if (this.config.customLinks && this.config.customLinks.length > 0) {
      this.addCustomLinks();
    }
  }

  /**
   * カスタムリンクを追加
   */
  private addCustomLinks(): void {
    const headerLinks = this.shadowRoot.querySelector(".header-links");
    if (!headerLinks || !this.config.customLinks) return;

    this.config.customLinks.forEach((link) => {
      const linkElement = document.createElement("a");
      linkElement.href = link.url;
      linkElement.textContent = link.text;
      linkElement.target = link.target || "_blank";
      headerLinks.appendChild(linkElement);
    });
  }

  /**
   * 検索処理
   */
  private handleSearch(): void {
    const searchSelect = this.shadowRoot.querySelector(
      "#searchOption",
    ) as HTMLSelectElement;
    const searchInput = this.shadowRoot.querySelector(
      "#searchWords",
    ) as HTMLInputElement;

    if (!searchSelect || !searchInput || !searchInput.value.trim()) return;

    const searchType = searchSelect.value;
    const searchWords = encodeURIComponent(searchInput.value.trim());

    const baseUrl = "https://www.nicovideo.jp/search";
    let searchUrl: string;

    switch (searchType) {
      case "www+tag":
        searchUrl = `${baseUrl}/${searchWords}?f_range=0&type=tag`;
        break;
      case "www+mylist_search":
        searchUrl = `https://www.nicovideo.jp/mylist_search/${searchWords}`;
        break;
      case "seiga+search":
        searchUrl = `https://seiga.nicovideo.jp/search/${searchWords}`;
        break;
      case "live+search":
        searchUrl = `https://live.nicovideo.jp/search?keyword=${searchWords}`;
        break;
      case "ch+search":
        searchUrl = `https://ch.nicovideo.jp/search?q=${searchWords}`;
        break;
      case "dic+s/al/t":
        searchUrl = `https://dic.nicovideo.jp/s/al/t/${searchWords}`;
        break;
      default: // 'www+search'
        searchUrl = `${baseUrl}/${searchWords}`;
    }

    window.open(searchUrl, "_blank");
  }

  /**
   * 検索クリア処理
   */
  private handleClear(): void {
    const searchInput = this.shadowRoot.querySelector(
      "#searchWords",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
  }

  /**
   * スクロール処理（固定モード用）
   */
  private handleScroll(): void {
    const header = this.shadowRoot.querySelector(
      ".custom-header",
    ) as HTMLElement;
    if (!header) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 100 && !this.isFixed) {
      header.classList.add("fixed");
      this.isFixed = true;
    } else if (scrollTop <= 100 && this.isFixed) {
      header.classList.remove("fixed");
      this.isFixed = false;
    }
  }

  /**
   * ヘッダーのタイトルを更新
   */
  public setTitle(title: string): void {
    this.config.title = title;
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * 固定モードの切り替え
   */
  public toggleFixedMode(enabled: boolean): void {
    this.config.enableFixedMode = enabled;

    if (enabled) {
      window.addEventListener("scroll", () => this.handleScroll());
    } else {
      window.removeEventListener("scroll", () => this.handleScroll());
      const header = this.shadowRoot.querySelector(
        ".custom-header",
      ) as HTMLElement;
      if (header) {
        header.classList.remove("fixed");
        this.isFixed = false;
      }
    }
  }

  /**
   * Shadow DOM のルートを取得（外部からアクセス可能）
   */
  public getShadowRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  /**
   * Shadow DOM内の要素を取得するヘルパーメソッド
   */
  public querySelector(selector: string): Element | null {
    return this.shadowRoot.querySelector(selector);
  }

  /**
   * ヘッダーを破棄
   */
  public destroy(): void {
    window.removeEventListener("scroll", () => this.handleScroll());
    this.shadowRoot.innerHTML = "";
  }
}

/**
 * 簡単な初期化関数
 */
export function createHeader(
  containerId: string,
  config?: HeaderConfig,
): CommonHeader {
  return new CommonHeader(containerId, config);
}

// windowオブジェクトに追加してビルド時に除外されないようにする
window.NicoCommon = {
  CommonHeader,
  createHeader,
};
