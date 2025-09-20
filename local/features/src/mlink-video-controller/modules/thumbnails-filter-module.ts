import { ModuleInstance, ModuleConfig, ModuleStatus } from '@/types/module-types';
import { 
  Keyword, 
  PageType, 
  NicovideoSelectors, 
  UrlPatterns, 
  UpdateItem,
  ThumbnailsFilterGlobal 
} from '@/types/thumbnails-filter-types';
// import { ToastrInstance } from '@/types/toastr-types';
import { createMaterialIcon } from '../../common/material-icons';
import { isWatchLikePage } from '../utils/page-detect';

// 設定管理クラス
class HideVideoSettings {
  private storageKey: string;
  public tempDisabled: boolean;
  public keywords: Keyword[];

  constructor() {
    this.storageKey = "hideVideoKeywords";
    this.tempDisabled = false;
    this.keywords = this.loadKeywords();
  }

  loadKeywords(): Keyword[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) { return []; }
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) { return []; }
      return parsed.filter((v): v is Keyword => typeof v === 'string');
    } catch (error) {
      window.logger.error("キーワードの読み込みエラー:", error);
      return [];
    }
  }

  saveKeywords(keywords: Keyword[]): void {
    this.keywords = [...keywords];
    localStorage.setItem(this.storageKey, JSON.stringify(this.keywords));
  }

  addKeyword(keyword: Keyword): void {
    const currentKeywords = this.loadKeywords();
    if (!currentKeywords.includes(keyword)) {
      const newKeywords = [...currentKeywords, keyword];
      this.saveKeywords(newKeywords);
    }
  }

  removeKeyword(keyword: Keyword): void {
    const currentKeywords = this.loadKeywords();
    const newKeywords = currentKeywords.filter((k) => k !== keyword);
    this.saveKeywords(newKeywords);
  }

  isRegExp(keyword: Keyword): boolean {
    return keyword.startsWith("/") && keyword.endsWith("/");
  }

  matchKeyword(title: string, keyword: Keyword): boolean {
    if (this.isRegExp(keyword)) {
      try {
        const pattern = keyword.slice(1, -1);
        return new RegExp(pattern, "i").test(title);
      } catch (e) {
        window.logger.error("Invalid RegExp:", e);
        return false;
      }
    }
    return title.toLowerCase().includes(keyword.toLowerCase());
  }
}

// ニコニコ動画のセレクター定数
const NICOVIDEO_SELECTORS: NicovideoSelectors = {
  VIDEO_ELEMENTS: {
    watch: [
      'a[data-anchor-page="watch"][data-anchor-area="playlist"]',
      'a[data-anchor-page="watch"][data-anchor-area="nicoad_videos"]',
      'a[data-anchor-page="watch"]',
    ].join(","),
    top: ".NC-VideoCard",
    ranking: ".NC-Card",
    tag: ".item[data-video-item]",
    search: ".item[data-video-item]",
    other: "",
  },
  TITLE_ELEMENTS: {
    watch: {
      playlist: "h2",
      nicoad: "p",
      default: "h2",
    },
    top: ".NC-CardTitle",
    ranking: ".NC-CardTitle",
    tag: ".itemTitle a",
    search: ".itemTitle a",
    other: "",
  },
  PARENT_ELEMENTS: {
    watch: "",
    top: ".NC-Card",
    ranking: ".NC-Card",
    tag: ".item",
    search: ".item",
    other: "",
  },
};

const URL_PATTERNS: UrlPatterns = {
  WATCH: "/watch/",
  TAG: "/tag/",
  SEARCH: "/search/",
  RANKING: "/ranking",
  VIDEO_TOP: "/video_top",
};

// UI管理クラス
class HideVideoUI {
  private settings: HideVideoSettings;
  private hiddenCount: number;
  private observer: MutationObserver | null;
  private pageType: PageType;
  private modalElement: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(settings: HideVideoSettings) {
    this.settings = settings;
    this.hiddenCount = 0;
    this.observer = null;
    this.pageType = this.detectPageType();
  }

  initialize(): void {
    this.setupModal();
    this.updateKeywordList();
    this.setupObserver();
    this.setupToggleButton();

    setTimeout(() => {
      this.setupSettingsButton();
    }, 100);

    document.addEventListener('updateKeywordList', () => {
      this.updateKeywordList();
    });

    this.checkVideos(true);
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    // 非表示にした動画を復元
    this.restoreAllVideos();

    // イベントリスナーを削除
    document.removeEventListener('updateKeywordList', () => {
      this.updateKeywordList();
    });
  }

  private restoreAllVideos(): void {
    const hiddenElements = document.querySelectorAll('[data-nvf-hidden="true"]');
    hiddenElements.forEach(element => {
      this.showElement(element);
    });
  }

  setupModal(): void {
    const modal = document.createElement("div");
    modal.innerHTML = `
      <div id="nvfHideVideoModal" class="nvf-modal" style="display:none;">
        <div class="nvf-modal-content">
          <h2>非表示キーワード設定</h2>
          <div class="nvf-status-info">
            <span id="nvfHiddenCount">非表示動画数: 0</span>
            <label class="nvf-toggle-switch">
              <input type="checkbox" id="nvfToggleFilter">
              <span class="nvf-slider">フィルター一時停止</span>
            </label>
          </div>
          <div class="nvf-search-box">
            <input type="text" id="nvfKeywordSearch" placeholder="キーワードを検索">
          </div>
          <div id="nvfKeywordList" class="nvf-keyword-list"></div>
          <div class="nvf-add-keyword-box">
            <input type="text" id="nvfNewKeyword" placeholder="新しいキーワード（正規表現は /pattern/ 形式）">
            <button id="nvfAddKeyword">追加</button>
          </div>
          <button id="nvfCloseModal">閉じる</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalElement = modal;

    // スタイル追加
    this.styleElement = document.createElement("style");
    this.styleElement.textContent = `
      .nvf-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 10001;
        backdrop-filter: blur(3px);
      }
      .nvf-modal-content {
        position: relative;
        background: rgba(32, 34, 37, 0.95);
        color: #ffffff;
        margin: 15% auto;
        padding: 20px;
        width: 70%;
        max-width: 500px;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .nvf-modal h2 {
        margin-top: 0;
        text-align: center;
        color: #4CAF50;
      }
      .nvf-status-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 5px;
      }
      .nvf-toggle-switch {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nvf-search-box {
        margin-bottom: 15px;
      }
      .nvf-search-box input {
        width: 100%;
        padding: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        color: white;
        box-sizing: border-box;
      }
      .nvf-keyword-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 15px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 5px;
        padding: 5px;
        background: rgba(0,0,0,0.2);
      }
      .nvf-keyword-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background: rgba(255,255,255,0.05);
        border-radius: 3px;
        border-left: 3px solid #4CAF50;
      }
      .nvf-keyword-text.regex-keyword {
        color: #ff9800;
        font-family: monospace;
      }
      .delete-keyword {
        background: #f44336;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      .delete-keyword:hover {
        background: #d32f2f;
      }
      .nvf-add-keyword-box {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      .nvf-add-keyword-box input {
        flex: 1;
        padding: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .nvf-add-keyword-box button {
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .nvf-add-keyword-box button:hover {
        background: #45a049;
      }
      #nvfCloseModal {
        width: 100%;
        padding: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }
      #nvfCloseModal:hover {
        background: #1976D2;
      }
      [data-nvf-hidden="true"] {
        display: none !important;
      }
    `;
    document.head.appendChild(this.styleElement);

    this.setupEventListeners();
  }

  detectPageType(): PageType {
    const url = window.location.pathname;
    if (isWatchLikePage()) return "watch";
    if (url.includes(URL_PATTERNS.TAG)) return "tag";
    if (url.includes(URL_PATTERNS.SEARCH)) return "search";
    if (url.includes(URL_PATTERNS.RANKING)) return "ranking";
    if (url.includes(URL_PATTERNS.VIDEO_TOP)) return "top";
    return "other";
  }

  getVideoElements(): NodeListOf<Element> {
    const selector = NICOVIDEO_SELECTORS.VIDEO_ELEMENTS[this.pageType];
    return document.querySelectorAll(selector);
  }

  getTitleFromElement(element: Element): string {
    const titleSelectors = NICOVIDEO_SELECTORS.TITLE_ELEMENTS[this.pageType];
    
    if (this.pageType === "watch" && typeof titleSelectors === "object") {
      const href = element.getAttribute("href") || "";
      if (href.includes("playlist")) {
        const titleElement = element.querySelector(titleSelectors.playlist);
        return titleElement?.textContent?.trim() || "";
      } else if (href.includes("nicoad")) {
        const titleElement = element.querySelector(titleSelectors.nicoad);
        return titleElement?.textContent?.trim() || "";
      } else {
        const titleElement = element.querySelector(titleSelectors.default);
        return titleElement?.textContent?.trim() || "";
      }
    } else if (typeof titleSelectors === "string") {
      const titleElement = element.querySelector(titleSelectors);
      return titleElement?.textContent?.trim() || "";
    }
    
    return "";
  }

  hideElement(element: Element): void {
    const parentSelector = NICOVIDEO_SELECTORS.PARENT_ELEMENTS[this.pageType];
    const targetElement = parentSelector ? element.closest(parentSelector) || element : element;
    
    targetElement.setAttribute("data-nvf-hidden", "true");
    
    if (targetElement instanceof HTMLElement) {
      targetElement.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      targetElement.style.opacity = "0";
      targetElement.style.transform = "scale(0.8)";
      
      setTimeout(() => {
        targetElement.style.display = "none";
      }, 300);
    }
  }

  showElement(element: Element): void {
    const parentSelector = NICOVIDEO_SELECTORS.PARENT_ELEMENTS[this.pageType];
    const targetElement = parentSelector ? element.closest(parentSelector) || element : element;
    
    targetElement.removeAttribute("data-nvf-hidden");
    
    if (targetElement instanceof HTMLElement) {
      targetElement.style.display = "";
      targetElement.style.opacity = "0";
      targetElement.style.transform = "scale(0.8)";
      
      setTimeout(() => {
        targetElement.style.opacity = "1";
        targetElement.style.transform = "scale(1)";
      }, 10);
    }
  }

  setupObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const selector = NICOVIDEO_SELECTORS.VIDEO_ELEMENTS[this.pageType];
              if (selector && (element.matches(selector) || element.querySelector(selector))) {
                shouldCheck = true;
              }
            }
          });
        }
      });

      if (shouldCheck) {
        setTimeout(() => this.checkVideos(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupToggleButton(): void {
    const toggleContainer = document.querySelector("#siteHeaderUserContainer, .SiteHeaderContainer");
    if (toggleContainer && !document.getElementById("nvfToggleButton")) {
      const button = document.createElement("button");
      button.id = "nvfToggleButton";
              button.innerHTML = createMaterialIcon('block', { style: 'outlined', color: 'white' });
      button.title = "動画フィルター切り替え";
      button.style.cssText = `
        background: rgba(0,0,0,0.7);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        padding: 5px 8px;
        margin-left: 8px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      button.addEventListener("click", () => {
        this.settings.tempDisabled = !this.settings.tempDisabled;
        button.style.opacity = this.settings.tempDisabled ? "0.5" : "1";
        this.checkVideos();
      });
      
      toggleContainer.appendChild(button);
    }
  }

  updateHiddenCount(): void {
    const countElement = document.getElementById("nvfHiddenCount");
    if (countElement) {
      countElement.textContent = `非表示動画数: ${this.hiddenCount}`;
    }
  }

  checkVideos(isInitial = false): void {
    if (this.settings.tempDisabled) {
      document.querySelectorAll('[data-nvf-hidden="true"]').forEach(element => {
        this.showElement(element);
      });
      this.hiddenCount = 0;
      this.updateHiddenCount();
      return;
    }

    const videos = this.getVideoElements();
    const keywords = this.settings.keywords;
    const previousCount = this.hiddenCount;

    if (keywords.length === 0) {
      this.hiddenCount = 0;
      this.updateHiddenCount();
      return;
    }

    setTimeout(() => {
      const updates: UpdateItem[] = [];
      let newHiddenCount = 0;

      videos.forEach((video) => {
        const title = this.getTitleFromElement(video);
        const shouldHide = this.shouldHideVideo(title);
        const isCurrentlyHidden = video.hasAttribute("data-nvf-hidden");

        updates.push({ video, hide: shouldHide });

        if (shouldHide && !isCurrentlyHidden) {
          newHiddenCount++;
        } else if (shouldHide && isCurrentlyHidden) {
          newHiddenCount++;
        }
      });

      this.hiddenCount = newHiddenCount;

      updates.forEach(({ video, hide }) => {
        if (hide) {
          this.hideElement(video);
        } else {
          this.showElement(video);
        }
      });
      this.updateHiddenCount();

      if (!isInitial && this.hiddenCount !== previousCount) {
        const matchedKeywords = keywords.filter((keyword) =>
          Array.from(videos).some((video) =>
            this.settings.matchKeyword(this.getTitleFromElement(video), keyword)
          )
        );

        const message = `${this.hiddenCount}件の動画を非表示にしました！`;
        
        const subtitle = matchedKeywords.length > 0
          ? `マッチしたキーワード: ${matchedKeywords.slice(0, 3).join(", ")}${
              matchedKeywords.length > 3 ? " など" : ""
            }`
          : "";

        if (typeof window !== 'undefined' && 'toastr' in window) {
          const toastr = window.toastr;
          toastr.info(
            message,
            "動画フィルター",
            { 
              timeOut: 3000,
              extendedTimeOut: subtitle ? 1000 : 0
            }
          );
        }
      }
    });
  }

  shouldHideVideo(title: string): boolean {
    return this.settings.keywords.some((keyword) => this.settings.matchKeyword(title, keyword));
  }

  setupEventListeners(): void {
    const closeModalButton = document.getElementById("nvfCloseModal");
    if (closeModalButton) {
      closeModalButton.addEventListener("click", () => {
        const modal = document.getElementById("nvfHideVideoModal");
        if (modal) {
          modal.style.display = "none";
          this.checkVideos();
        }
      });
    }

    const modal = document.getElementById("nvfHideVideoModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target instanceof HTMLElement && e.target.id === "nvfHideVideoModal") {
          e.target.style.display = "none";
          this.checkVideos();
        }
      });
    }

    const addKeywordButton = document.getElementById("nvfAddKeyword");
    if (addKeywordButton) {
      addKeywordButton.addEventListener("click", () => {
        const input = document.getElementById("nvfNewKeyword") as HTMLInputElement | null;
        if (input) {
          const keyword = input.value.trim();
          if (keyword) {
            this.settings.addKeyword(keyword);
            input.value = "";
            this.updateKeywordList();
            this.checkVideos();
          }
        }
      });
    }

    const toggleFilterInput = document.getElementById("nvfToggleFilter");
    if (toggleFilterInput) {
      toggleFilterInput.addEventListener("change", (e) => {
        if (e.target instanceof HTMLInputElement) {
          this.settings.tempDisabled = e.target.checked;
          this.checkVideos();
        }
      });
    }

    const keywordSearch = document.getElementById("nvfKeywordSearch") as HTMLInputElement | null;
    if (keywordSearch) {
      keywordSearch.addEventListener("input", (e) => {
        if (e.target instanceof HTMLInputElement) {
          const searchText = e.target.value.toLowerCase();
          const items = document.querySelectorAll<HTMLElement>(".nvf-keyword-item");
          items.forEach((item) => {
            const keywordElement = item.querySelector(".nvf-keyword-text");
            if (keywordElement && keywordElement.textContent) {
              const keyword = keywordElement.textContent.toLowerCase();
              item.style.display = keyword.includes(searchText) ? "flex" : "none";
            }
          });
        }
      });
    }
  }

  setupSettingsButton(): void {
    const settingsButton = document.getElementById("HideVideoSettingsButton");
    if (settingsButton) {
      settingsButton.addEventListener("click", () => {
        const modal = document.getElementById("nvfHideVideoModal");
        this.settings.keywords = this.settings.loadKeywords();
        if (modal) {
          modal.style.display = "block";
          this.updateKeywordList();
        }
      });
    }
  }

  updateKeywordList(): void {
    const listElement = document.getElementById("nvfKeywordList");
    if (!listElement) {
      window.logger.error("nvfKeywordList要素が見つかりません");
      return;
    }

    const newListElement = document.createElement("div");
    newListElement.id = "nvfKeywordList";
    newListElement.className = "nvf-keyword-list";

    this.settings.keywords.forEach((keyword) => {
      const item = document.createElement("div");
      item.className = "nvf-keyword-item";
      const keywordClass = this.settings.isRegExp(keyword) ? "regex-keyword" : "";
      item.innerHTML = `
        <span class="nvf-keyword-text ${keywordClass}">${keyword}</span>
        <button class="delete-keyword" data-keyword="${keyword}">削除</button>
      `;

      const deleteButton = item.querySelector(".delete-keyword");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          this.settings.removeKeyword(keyword);
          this.updateKeywordList();
          this.checkVideos();
        });
      }

      newListElement.appendChild(item);
    });

    if (listElement.parentNode) {
      listElement.parentNode.replaceChild(newListElement, listElement);
    }
  }

  public openSettingsPanel(): void {
    const modal = document.getElementById("nvfHideVideoModal");
    if (modal) {
      this.settings.keywords = this.settings.loadKeywords();
      modal.style.display = "block";
      this.updateKeywordList();
    }
  }
}

export class ThumbnailsFilterModule implements ModuleInstance {
  public readonly config: ModuleConfig;
  
  private settings: HideVideoSettings | null = null;
  private ui: HideVideoUI | null = null;
  private _isActive: boolean = false;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.resolve();
      
      this.settings = new HideVideoSettings();
      this.ui = new HideVideoUI(this.settings);
      this.ui.initialize();

      // グローバルオブジェクトとしてThumbnailsFilterを設定
      const thumbnailsFilter: ThumbnailsFilterGlobal = {
        openSettingsPanel: () => this.ui?.openSettingsPanel()
      };
      (window as Window & { ThumbnailsFilter: ThumbnailsFilterGlobal }).ThumbnailsFilter = thumbnailsFilter;

      this._isActive = true;
      
    } catch (error) {
      window.logger.error('[ThumbnailsFilterModule] 初期化に失敗しました:', error);
      this._isActive = false;
      throw error;
    }
  }

  destroy(): void {
    
    
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }

    this.settings = null;

    // グローバルオブジェクトを削除
    if (typeof window !== 'undefined') {
      const windowWithThumbnailsFilter = window as Window & { ThumbnailsFilter?: ThumbnailsFilterGlobal };
      delete windowWithThumbnailsFilter.ThumbnailsFilter;
    }

    this._isActive = false;
    
  }

  isActive(): boolean {
    return this._isActive;
  }

  getStatus(): ModuleStatus {
    if (!this._isActive) {
      return ModuleStatus.INACTIVE;
    }

    return ModuleStatus.ACTIVE;
  }
} 