import type { VideoData } from '@/types';
import type { LoadDataFromMemory } from '@/cache-data-manager/loaders/load-data-from-memory.js';
import type { EventManager } from '@/cache-data-manager/managers/event-manager.js';
import type { ProgressManager } from '@/cache-data-manager/managers/progress-manager.js';
import { BatchRenderer } from '@/cache-data-manager/renderers/batch-renderer.js';
import { SearchEngine } from '@/cache-data-manager/engines/search-engine.js';
import { createHeaderTemplate } from '@/cache-data-manager/templates/header-template.js';
import { createCardTemplate } from '@/cache-data-manager/templates/card-template.js';

export class UIBuilder {
  public dataLoader: LoadDataFromMemory;
  public eventManager: EventManager;
  public progressManager: ProgressManager;
  public renderer: BatchRenderer;
  public searchEngine: SearchEngine;
  private templates: Map<string, HTMLElement> = new Map();

  // ヘッダー/サイドバー/検索UIなどの構築
  constructor(dataLoader: LoadDataFromMemory, eventManager: EventManager, progressManager: ProgressManager) {
    this.loadFonts();
    this.dataLoader = dataLoader;
    this.eventManager = eventManager;
    this.progressManager = progressManager;
    this.initializeTemplates();
    this.createHeaderAndContainer();
    this.renderer = new BatchRenderer(this.createVideoCard.bind(this), dataLoader);
    this.searchEngine = new SearchEngine(dataLoader);
    this.setupSearchListener();
  }

  // フォント読み込みメソッド追加
  private loadFonts(): void {
    if (!document.fonts.check('16px "Mochiy Pop P One"')) {
      const fontLink = document.createElement("link");
      fontLink.href = "https://fonts.googleapis.com/css2?family=Mochiy+Pop+P+One&display=swap";
      fontLink.rel = "stylesheet";
      fontLink.crossOrigin = "anonymous";
      document.head.appendChild(fontLink);
    }
  }

  private initializeTemplates(): void {
    const cardTemplate = document.createElement("div");
    cardTemplate.className = "video-card";
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
    const card = (this.templates.get("videoCard") as HTMLElement).cloneNode(true) as HTMLElement;
    const safe = this.normalizeVideoData(videoData);
    card.dataset.id = safe.baseId;

    // 基本情報設定
    (card.querySelector(".video-id") as HTMLElement).textContent = safe.baseId;
    (card.querySelector(".video-title") as HTMLElement).textContent = safe.title === "null" ? "タイトルを取得できません" : safe.title || "タイトルを取得できません";
    const thumbnailImg = card.querySelector(".thumbnail-image") as HTMLImageElement;
    thumbnailImg.src = safe.thumbnailUrl;
    // エラーハンドリング追加
    thumbnailImg.onerror = () => {
      thumbnailImg.src = "/local/images/fallback-thumbnail.svg";
      thumbnailImg.classList.add("error-thumbnail");
    };
    (card.querySelector(".quality-badge") as HTMLElement).textContent = safe.quality === 'unknown' ? "不明な画質" : safe.quality || "不明な画質";
    (card.querySelector(".quality-badge") as HTMLElement).className = `quality-badge ${this.getQualityClass(safe.quality)}`;
    (card.querySelector(".temp-file") as HTMLElement).textContent = this.getTempOrCompleteString(safe.isTemp);

    return card;
  }

  private getQualityClass(quality: unknown): string {
    // 数値部分のみ抽出して数値化
    const qualityStr = typeof quality === 'string' || typeof quality === 'number' ? String(quality) : '';
    const numericValue = parseInt(qualityStr.replace(/[^0-9]/g, '')) || 'unknown';
    
    const qualityMap: Record<string | number, string> = {
      1080: "hd-quality",
      720: "hd-quality",
      480: "sd-quality",
      360: "low-quality",
      unknown: "unknown-quality",
    };
    return qualityMap[numericValue] || "unknown-quality";
  }

  private getTempOrCompleteString(isTemp: unknown): string {
    if (isTemp === true) {
      return "Temporary";
    } else {
      return "Complete";
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private normalizeVideoData(input: unknown): {
    baseId: string;
    title: string;
    thumbnailUrl: string;
    quality: string;
    isTemp: boolean;
  } {
    if (this.isRecord(input)) {
      const baseId = typeof input.baseId === 'string' ? input.baseId : '';
      const title = typeof input.title === 'string' ? input.title : '';
      const thumbnailUrl = typeof input.thumbnailUrl === 'string' ? input.thumbnailUrl : '';
      const quality = typeof input.quality === 'string' ? input.quality : 'unknown';
      const isTemp = typeof input.isTemp === 'boolean' ? input.isTemp : false;
      return { baseId, title, thumbnailUrl, quality, isTemp };
    }
    return { baseId: '', title: '', thumbnailUrl: '', quality: 'unknown', isTemp: false };
  }

  private createHeaderAndContainer(): void {
    document.body.prepend(this.buildHeader());
    const container = document.createElement("div");
    container.className = "cache-container";
    document.body.appendChild(container);
  }

  public async renderAllEntries(): Promise<void> {
    this.progressManager.show("動画データ読み込み中");
    try {
      const entries = this.dataLoader.getAllEntries();
      await this.renderer.processBatch(entries);
    } finally {
      this.progressManager.hide();
    }
  }

  private setupSearchListener(): void {
    this.eventManager.addListener("search", async (data: { query: string } | undefined) => {
      if (!data) return;
      const { query } = data;
      this.progressManager.show("検索中...");
      try {
        const results = await this.searchEngine.search(query);
        await this.renderer.renderSearchResults(results);
      } finally {
        this.progressManager.hide();
      }
    });

    this.eventManager.addListener("searchClear", async () => {
      this.progressManager.show("全データ再表示中");
      try {
        const entries = this.dataLoader.getAllEntries();
        await this.renderer.processBatch(entries);
      } finally {
        this.progressManager.hide();
      }
    });
  }
} 