import type { VideoData } from "@/types";
import type { LoadDataFromMemory } from "@/cache-data-manager/loaders/load-data-from-memory.js";
import type { EventManager } from "@/cache-data-manager/managers/event-manager.js";
import type { ProgressManager } from "@/cache-data-manager/managers/progress-manager.js";
import { VirtualScrollRenderer } from "@/cache-data-manager/renderers/virtual-scroll-renderer.js";
import { SearchEngine } from "@/cache-data-manager/engines/search-engine.js";
import { FilterManager } from "@/cache-data-manager/managers/filter-manager.js";
import { SortManager } from "@/cache-data-manager/managers/sort-manager.js";
import { FilterSortUI } from "@/cache-data-manager/components/filter-sort-ui.js";
import { SearchResultsModal } from "@/cache-data-manager/components/search-results-modal.js";
import { getLazyImageLoader } from "@/cache-data-manager/components/lazy-image-loader.js";
import { createHeaderTemplate } from "@/cache-data-manager/templates/header-template.js";
import { createCardTemplate } from "@/cache-data-manager/templates/card-template.js";

export class UIBuilder {
  public dataLoader: LoadDataFromMemory;
  public eventManager: EventManager;
  public progressManager: ProgressManager;
  public virtualScrollRenderer: VirtualScrollRenderer;
  public searchEngine: SearchEngine;
  public filterManager: FilterManager;
  public sortManager: SortManager;
  public filterSortUI: FilterSortUI | null = null;
  public searchResultsModal: SearchResultsModal;

  private templates: Map<string, HTMLElement> = new Map();
  private allData: VideoData[] = [];

  // ヘッダー/サイドバー/検索UIなどの構築
  constructor(
    dataLoader: LoadDataFromMemory,
    eventManager: EventManager,
    progressManager: ProgressManager,
  ) {
    this.loadFonts();
    this.dataLoader = dataLoader;
    this.eventManager = eventManager;
    this.progressManager = progressManager;

    // マネージャー初期化
    this.filterManager = new FilterManager();
    this.sortManager = new SortManager();

    this.initializeTemplates();
    this.createHeaderAndContainer();

    // 仮想スクロールレンダラー初期化
    this.virtualScrollRenderer = new VirtualScrollRenderer({
      itemHeight: 420,
      bufferSize: 10,
      containerSelector: ".cache-container",
    });
    this.virtualScrollRenderer.initialize(this.createVideoCard.bind(this));

    // 検索エンジン初期化
    this.searchEngine = new SearchEngine(dataLoader);

    // 検索結果モーダル初期化
    this.searchResultsModal = new SearchResultsModal({
      itemsPerPage: 50,
      maxDisplayItems: 1000,
    });
    this.searchResultsModal.setCardCreator(this.createVideoCard.bind(this));

    // フィルター・ソートUI初期化
    this.initializeFilterSortUI();

    this.setupSearchListener();
    this.setupFilterSortListeners();
  }

  // フォント読み込みメソッド追加
  private loadFonts(): void {
    if (!document.fonts.check('16px "Mochiy Pop P One"')) {
      const fontLink = document.createElement("link");
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&display=swap";
      fontLink.rel = "stylesheet";
      fontLink.crossOrigin = "anonymous";
      document.head.appendChild(fontLink);
    }
  }

  private initializeTemplates(): void {
    const cardTemplate = document.createElement("div");
    cardTemplate.className = "video-card";
    // インラインスタイルで固定高さを保証
    cardTemplate.style.height = "420px";
    cardTemplate.style.maxHeight = "420px";
    cardTemplate.style.minHeight = "420px";
    cardTemplate.style.display = "flex";
    cardTemplate.style.flexDirection = "column";
    cardTemplate.style.overflow = "hidden";
    cardTemplate.innerHTML = createCardTemplate();
    this.templates.set("videoCard", cardTemplate);
  }

  private buildHeader(): HTMLElement {
    // 既存のヘッダーを削除
    const existingHeader = document.querySelector("header");
    if (existingHeader) {
      existingHeader.remove();
    }

    const header = document.createElement("header");
    header.innerHTML = createHeaderTemplate();
    return header;
  }

  public createVideoCard(videoData: VideoData): HTMLElement {
    const card = (this.templates.get("videoCard") as HTMLElement).cloneNode(
      true,
    ) as HTMLElement;
    const safe = this.normalizeVideoData(videoData);
    card.dataset.id = safe.baseId;

    // 基本情報設定
    (card.querySelector(".video-id") as HTMLElement).textContent = safe.baseId;
    
    // タイトル設定（ツールチップで全文表示）
    const titleElement = card.querySelector(".video-title") as HTMLElement;
    const displayTitle = safe.title === "null"
      ? "タイトルを取得できません"
      : safe.title || "タイトルを取得できません";
    titleElement.textContent = displayTitle;
    titleElement.title = displayTitle; // ホバー時にツールチップで全文表示

    // サムネイル - 遅延読み込み用にdata-srcを設定
    const thumbnailImg = card.querySelector(
      ".thumbnail-image",
    ) as HTMLImageElement;
    thumbnailImg.dataset.src = safe.thumbnailUrl;
    thumbnailImg.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 130 100'%3E%3Crect fill='%23ddd' width='130' height='100'/%3E%3C/svg%3E";
    thumbnailImg.classList.add("lazy-placeholder");

    // エラーハンドリング追加
    thumbnailImg.onerror = () => {
      thumbnailImg.src = "/local/images/fallback-thumbnail.svg";
      thumbnailImg.classList.add("error-thumbnail");
    };

    (card.querySelector(".quality-badge") as HTMLElement).textContent =
      safe.quality === "unknown" ? "不明な画質" : safe.quality || "不明な画質";
    (card.querySelector(".quality-badge") as HTMLElement).className =
      `quality-badge ${this.getQualityClass(safe.quality)}`;
    (card.querySelector(".temp-file") as HTMLElement).textContent =
      this.getTempOrCompleteString(safe.isTemp);

    // カード追加後に遅延読み込み監視を設定
    requestAnimationFrame(() => {
      getLazyImageLoader().observe(thumbnailImg);
    });

    return card;
  }

  private getQualityClass(quality: unknown): string {
    // 数値部分のみ抽出して数値化
    const qualityStr =
      typeof quality === "string" || typeof quality === "number"
        ? String(quality)
        : "";
    const numericValue =
      parseInt(qualityStr.replace(/[^0-9]/g, "")) || "unknown";

    const qualityMap: Record<string | number, string> = {
      1080: "hd-quality",
      720: "hd-quality",
      480: "sd-quality",
      360: "low-quality",
      unknown: "unknown-quality",
    };
    return qualityMap[numericValue] ?? "unknown-quality";
  }

  private getTempOrCompleteString(isTemp: unknown): string {
    if (isTemp === true) {
      return "Temporary";
    } else {
      return "Complete";
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private normalizeVideoData(input: unknown): {
    baseId: string;
    title: string;
    thumbnailUrl: string;
    quality: string;
    isTemp: boolean;
  } {
    if (this.isRecord(input)) {
      const baseId = typeof input.baseId === "string" ? input.baseId : "";
      const title = typeof input.title === "string" ? input.title : "";
      const thumbnailUrl =
        typeof input.thumbnailUrl === "string" ? input.thumbnailUrl : "";
      const quality =
        typeof input.quality === "string" ? input.quality : "unknown";
      const isTemp = typeof input.isTemp === "boolean" ? input.isTemp : false;
      return { baseId, title, thumbnailUrl, quality, isTemp };
    }
    return {
      baseId: "",
      title: "",
      thumbnailUrl: "",
      quality: "unknown",
      isTemp: false,
    };
  }

  private createHeaderAndContainer(): void {
    document.body.prepend(this.buildHeader());
    const container = document.createElement("div");
    container.className = "cache-container";
    document.body.appendChild(container);
  }

  private initializeFilterSortUI(): void {
    this.filterSortUI = new FilterSortUI(
      this.filterManager,
      this.sortManager,
      () => {
        void this.applyFiltersAndSort();
      },
    );

    const filterSortContainer = this.filterSortUI.createUI();

    // プレースホルダーをフィルターUIで置き換え
    const placeholder = document.querySelector(".filter-sort-placeholder");
    if (placeholder) {
      placeholder.replaceWith(filterSortContainer);
    } else {
      // フォールバック: header-controls-rowに追加
      const controlsRow = document.querySelector(".header-controls-row");
      controlsRow?.appendChild(filterSortContainer);
    }
  }

  public async renderAllEntries(): Promise<void> {
    this.progressManager.show("動画データ読み込み中");
    try {
      this.allData = this.dataLoader.getAllEntries();
      await this.applyFiltersAndSort();
    } finally {
      this.progressManager.hide();
    }
  }

  private async applyFiltersAndSort(): Promise<void> {
    // フィルター適用
    let processedData = this.filterManager.filterData(this.allData);

    // ソート適用
    processedData = this.sortManager.sortData(processedData);

    // 仮想スクロールでレンダリング
    await this.virtualScrollRenderer.setData(processedData);

    // 結果件数更新
    this.filterSortUI?.updateResultCount(
      this.allData.length,
      processedData.length,
    );
  }

  private setupSearchListener(): void {
    this.eventManager.addListener(
      "search",
      (data: { query: string } | undefined) => {
        if (!data) return;
        const { query } = data;
        this.progressManager.show("検索中...");
        
        void (async () => {
          try {
            const resultIds = await this.searchEngine.search(query);
            const results = this.dataLoader.getEntriesByIds(resultIds);

            // フィルター・ソートを適用した結果
            let filteredResults = this.filterManager.filterData(results);
            filteredResults = this.sortManager.sortData(filteredResults);

            // モーダルで表示
            this.searchResultsModal.open(query, filteredResults);
          } finally {
            this.progressManager.hide();
          }
        })();
      },
    );

    this.eventManager.addListener("searchClear", () => {
      // 検索モーダルを閉じる
      if (this.searchResultsModal.isOpen()) {
        this.searchResultsModal.close();
      }
    });
  }

  private setupFilterSortListeners(): void {
    // フィルター変更時
    this.filterManager.onFilterChange(() => {
      // 検索モーダルが開いている場合は再検索
      if (this.searchResultsModal.isOpen()) {
        const query = this.searchResultsModal.getQuery();
        this.eventManager.trigger("search", { query });
      }
    });

    // ソート変更時
    this.sortManager.onSortChange(() => {
      // 検索モーダルが開いている場合は再検索
      if (this.searchResultsModal.isOpen()) {
        const query = this.searchResultsModal.getQuery();
        this.eventManager.trigger("search", { query });
      }
    });
  }

  /**
   * 全データを再読み込み
   */
  public async refresh(): Promise<void> {
    this.allData = this.dataLoader.getAllEntries();
    await this.applyFiltersAndSort();
  }

  /**
   * スクロールを先頭に戻す
   */
  public scrollToTop(): void {
    this.virtualScrollRenderer.scrollToTop();
  }

  /**
   * 現在のデータ件数を取得
   */
  public getTotalCount(): number {
    return this.allData.length;
  }

  /**
   * フィルター適用後のデータ件数を取得
   */
  public getFilteredCount(): number {
    return this.virtualScrollRenderer.getTotalCount();
  }
}
