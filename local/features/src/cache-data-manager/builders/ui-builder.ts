import type { APIResponse, CachedVideoMetadata, VideoData } from "@/types";
import type { LoadDataFromMemory } from "@/cache-data-manager/loaders/load-data-from-memory.js";
import type { EventManager } from "@/cache-data-manager/managers/event-manager.js";
import type { ProgressManager } from "@/cache-data-manager/managers/progress-manager.js";
import { APIClient } from "@/cache-data-manager/clients/api-client.js";
import { CacheMetadataDB } from "@/cache-data-manager/storage/cache-metadata-db.js";
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
  private static readonly TEMPORARY_DELETE_CONCURRENCY = 6;
  private static readonly THUMB_INFO_CONCURRENCY = 8;

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
  private metadataDB = new CacheMetadataDB();
  private apiClient = new APIClient();

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
    cardTemplate.style.height = "300px";
    cardTemplate.style.maxHeight = "300px";
    cardTemplate.style.minHeight = "300px";
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
    const displayTitle =
      safe.title === "null"
        ? "タイトルを取得できません"
        : safe.title || "タイトルを取得できません";
    titleElement.textContent = displayTitle;
    titleElement.title = displayTitle; // ホバー時にツールチップで全文表示

    // サムネイル - 遅延読み込み用にdata-srcを設定
    const thumbnailImg = card.querySelector(
      ".thumbnail-image",
    ) as HTMLImageElement;
    const lazyImageLoader = getLazyImageLoader();
    lazyImageLoader.setSource(thumbnailImg, safe.thumbnailUrl);

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
    const availabilityBadge = card.querySelector(
      ".availability-badge",
    ) as HTMLElement;
    const isUnavailable = safe.availabilityStatus === "unavailable";
    availabilityBadge.hidden = !isUnavailable;
    availabilityBadge.title =
      safe.availabilityErrorCode !== undefined
        ? `利用不可: ${safe.availabilityErrorCode}`
        : "利用不可";
    card.classList.toggle("unavailable-video", isUnavailable);

    // 仮想スクロールで描画済みのカードだけを即時プリロードし、スクロール時のプレースホルダー再表示を避ける
    lazyImageLoader.loadImmediate(thumbnailImg);

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
    availabilityStatus: string;
    availabilityErrorCode?: string;
  } {
    if (this.isRecord(input)) {
      const baseId = typeof input.baseId === "string" ? input.baseId : "";
      const title = typeof input.title === "string" ? input.title : "";
      const thumbnailUrl =
        typeof input.thumbnailUrl === "string" ? input.thumbnailUrl : "";
      const quality =
        typeof input.quality === "string" ? input.quality : "unknown";
      const isTemp = typeof input.isTemp === "boolean" ? input.isTemp : false;
      const availabilityStatus =
        typeof input.availabilityStatus === "string"
          ? input.availabilityStatus
          : "unknown";
      const availabilityErrorCode =
        typeof input.availabilityErrorCode === "string"
          ? input.availabilityErrorCode
          : undefined;
      return {
        baseId,
        title,
        thumbnailUrl,
        quality,
        isTemp,
        availabilityStatus,
        availabilityErrorCode,
      };
    }
    return {
      baseId: "",
      title: "",
      thumbnailUrl: "",
      quality: "unknown",
      isTemp: false,
      availabilityStatus: "unknown",
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
      () => {
        void this.deleteTemporaryVideos();
      },
      () => {
        void this.checkAvailabilityForAllVideos();
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
      this.allData = await this.loadEntriesWithMetadata();
      await this.fetchMissingMetadata();
      await this.applyFiltersAndSort();
    } finally {
      this.progressManager.hide();
    }
  }

  private async applyFiltersAndSort(): Promise<void> {
    this.searchEngine.setEntries(this.allData);

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
    this.allData = await this.loadEntriesWithMetadata();
    await this.fetchMissingMetadata();
    await this.applyFiltersAndSort();
  }

  private async loadEntriesWithMetadata(): Promise<VideoData[]> {
    const entries = this.dataLoader.getAllEntries();
    const metadataMap = await this.metadataDB.getMetadataMap(
      entries.map((entry) => entry.baseId),
    );

    return entries.map((entry) => this.applyCachedMetadata(entry, metadataMap));
  }

  private applyCachedMetadata(
    entry: VideoData,
    metadataMap: Map<string, CachedVideoMetadata>,
  ): VideoData {
    const metadata = metadataMap.get(entry.baseId);
    if (!metadata) {
      return {
        ...entry,
        availabilityStatus: entry.availabilityStatus ?? "unknown",
      };
    }

    return {
      ...entry,
      title: metadata.title || entry.title,
      thumbnailUrl: metadata.thumbnailUrl || entry.thumbnailUrl,
      metadataSource: "getthumbinfo",
      availabilityStatus: metadata.availabilityStatus,
      availabilityCheckedAt: metadata.availabilityCheckedAt,
      availabilityErrorCode: metadata.availabilityErrorCode,
    };
  }

  private async fetchMissingMetadata(): Promise<void> {
    const targets = this.allData.filter((entry) =>
      this.needsThumbInfoFallback(entry),
    );
    if (targets.length === 0) return;

    let completedCount = 0;
    this.progressManager.show("不足している動画情報を取得中...");
    await this.runWithConcurrency(
      targets,
      UIBuilder.THUMB_INFO_CONCURRENCY,
      async (entry) => {
        try {
          const response = await this.apiClient.fetchVideoInfo(entry.baseId);
          this.updateEntryFromApiResponse(entry, response);
          await this.metadataDB.saveMetadata(
            this.createMetadata(entry, response),
          );
        } catch {
          entry.availabilityStatus = "unknown";
        } finally {
          completedCount++;
          this.progressManager.updateProgress(completedCount, targets.length);
        }
      },
    );
  }

  private needsThumbInfoFallback(entry: VideoData): boolean {
    if (entry.metadataSource === "getthumbinfo") return false;
    return (
      this.isUnknownTitle(entry.title) ||
      entry.thumbnailUrl.trim().length === 0 ||
      this.isGeneratedThumbnailUrl(entry.thumbnailUrl, entry.baseId)
    );
  }

  private isUnknownTitle(title: string): boolean {
    const normalized = title.trim();
    return (
      normalized.length === 0 ||
      normalized === "null" ||
      normalized === "タイトル不明" ||
      normalized === "タイトルを取得できません"
    );
  }

  private isGeneratedThumbnailUrl(
    thumbnailUrl: string,
    videoId: string,
  ): boolean {
    const match = videoId.match(/[a-z]{2}(\d+)/);
    if (!match?.[1]) return false;
    const generated = `https://nicovideo.cdn.nimg.jp/thumbnails/${match[1]}/${match[1]}`;
    return thumbnailUrl === generated;
  }

  private updateEntryFromApiResponse(
    entry: VideoData,
    response: APIResponse,
  ): void {
    if (response.status === "ok") {
      if (response.title) {
        entry.title = response.title;
      }
      if (response.thumbnailUrl) {
        entry.thumbnailUrl = response.thumbnailUrl;
      }
      entry.metadataSource = "getthumbinfo";
      entry.availabilityStatus = "available";
      entry.availabilityCheckedAt = Date.now();
      entry.availabilityErrorCode = undefined;
      return;
    }

    entry.availabilityStatus = "unavailable";
    entry.availabilityCheckedAt = Date.now();
    entry.availabilityErrorCode = response.errorCode;
  }

  private createMetadata(
    entry: VideoData,
    response: APIResponse,
  ): CachedVideoMetadata {
    const now = Date.now();
    const status =
      response.status === "ok" ? "available" : ("unavailable" as const);
    return {
      id: entry.baseId,
      title:
        response.status === "ok" && response.title
          ? response.title
          : entry.title,
      thumbnailUrl:
        response.status === "ok" && response.thumbnailUrl
          ? response.thumbnailUrl
          : entry.thumbnailUrl,
      availabilityStatus: status,
      availabilityCheckedAt: now,
      availabilityErrorCode:
        response.status === "error" ? response.errorCode : undefined,
      updatedAt: now,
      schemaVersion: 1,
    };
  }

  private async checkAvailabilityForAllVideos(): Promise<void> {
    const targets = Array.from(
      new Map(this.allData.map((entry) => [entry.baseId, entry])).values(),
    );

    if (targets.length === 0) {
      alert("公開状態チェック対象の動画はありません。");
      return;
    }

    if (
      !confirm(
        `getthumbinfoで公開状態を一括確認しますか？\n対象: ${targets.length.toLocaleString()} 件`,
      )
    ) {
      return;
    }

    let completedCount = 0;
    let unavailableCount = 0;
    const failedIds: string[] = [];
    const metadataList: CachedVideoMetadata[] = [];
    this.progressManager.show("公開状態を確認中...");

    try {
      await this.runWithConcurrency(
        targets,
        UIBuilder.THUMB_INFO_CONCURRENCY,
        async (entry) => {
          try {
            const response = await this.apiClient.fetchVideoInfo(entry.baseId, {
              forceRefresh: true,
            });
            this.updateEntryFromApiResponse(entry, response);
            const metadata = this.createMetadata(entry, response);
            metadataList.push(metadata);
            if (metadata.availabilityStatus === "unavailable") {
              unavailableCount++;
            }
          } catch {
            failedIds.push(entry.baseId);
          } finally {
            completedCount++;
            this.progressManager.updateProgress(completedCount, targets.length);
          }
        },
      );

      await this.metadataDB.saveMetadataList(metadataList);
      await this.applyFiltersAndSort();

      if (failedIds.length > 0) {
        alert(
          `公開状態チェックが一部失敗しました。\n確認済み: ${metadataList.length.toLocaleString()} 件\n利用不可: ${unavailableCount.toLocaleString()} 件\n失敗: ${failedIds.length.toLocaleString()} 件\n失敗ID: ${failedIds.slice(0, 20).join(", ")}`,
        );
      } else {
        alert(
          `公開状態チェックが完了しました。\n確認済み: ${metadataList.length.toLocaleString()} 件\n利用不可: ${unavailableCount.toLocaleString()} 件`,
        );
      }
    } finally {
      this.progressManager.hide();
    }
  }

  private async deleteTemporaryVideos(): Promise<void> {
    const temporaryVideos = this.allData.filter((video) => video.isTemp);
    const temporaryCacheIds = Array.from(
      new Set(temporaryVideos.map((video) => video.id).filter(Boolean)),
    );

    if (temporaryCacheIds.length === 0) {
      alert("削除対象のテンポラリ動画はありません。");
      return;
    }

    const previewIds = temporaryCacheIds.slice(0, 10).join(", ");
    const omittedCount = temporaryCacheIds.length - 10;
    const previewText =
      omittedCount > 0
        ? `${previewIds} ほか ${omittedCount.toLocaleString()} 件`
        : previewIds;

    if (
      !confirm(
        `テンポラリ動画を一括削除しますか？\n対象: ${temporaryCacheIds.length.toLocaleString()} 件\n${previewText}`,
      )
    ) {
      return;
    }

    const successfulCacheIds = new Set<string>();
    const failedCacheIds: string[] = [];
    this.progressManager.show("テンポラリ動画を削除中...");

    try {
      let completedCount = 0;
      await this.runWithConcurrency(
        temporaryCacheIds,
        UIBuilder.TEMPORARY_DELETE_CONCURRENCY,
        async (cacheId) => {
          try {
            const response = await fetch(`./ajax_rmtmp?${cacheId}`, {
              cache: "no-store",
              credentials: "same-origin",
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = (await response.text()).trim();
            if (result !== "OK") {
              throw new Error(result || "empty response");
            }

            successfulCacheIds.add(cacheId);
          } catch {
            failedCacheIds.push(cacheId);
          } finally {
            completedCount++;
            this.progressManager.updateProgress(
              completedCount,
              temporaryCacheIds.length,
            );
          }
        },
      );

      this.removeTemporaryEntriesFromMemory(successfulCacheIds);
      await this.refresh();

      if (failedCacheIds.length > 0) {
        alert(
          `テンポラリ動画の一括削除が一部失敗しました。\n成功: ${successfulCacheIds.size.toLocaleString()} 件\n失敗: ${failedCacheIds.length.toLocaleString()} 件\n失敗ID: ${failedCacheIds.slice(0, 20).join(", ")}`,
        );
      } else {
        alert(
          `テンポラリ動画を ${successfulCacheIds.size.toLocaleString()} 件削除しました。`,
        );
      }
    } finally {
      this.progressManager.hide();
    }
  }

  private async runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const item = items[nextIndex];
          nextIndex++;
          if (item !== undefined) {
            await worker(item);
          }
        }
      }),
    );
  }

  private removeTemporaryEntriesFromMemory(cacheIds: Set<string>): void {
    if (cacheIds.size === 0) return;

    for (const id of Object.keys(window.tempList)) {
      if (cacheIds.has(id)) {
        delete window.tempList[id];
      }
    }
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
