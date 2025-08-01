import type { VideoData } from '../types/index.js';
import type { LoadDataFromMemory } from '../loaders/load-data-from-memory.js';
import type { EventManager } from '../managers/event-manager.js';
import type { ProgressManager } from '../managers/progress-manager.js';
import { BatchRenderer } from '../renderers/batch-renderer.js';
import { SearchEngine } from '../engines/search-engine.js';
import { createHeaderTemplate } from '../templates/header-template.js';
import { createCardTemplate } from '../templates/card-template.js';

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
    card.dataset.id = videoData.baseId;

    // 基本情報設定
    (card.querySelector(".video-id") as HTMLElement).textContent = videoData.baseId;
    (card.querySelector(".video-title") as HTMLElement).textContent = videoData.title === "null" ? "タイトルを取得できません" : videoData.title || "タイトルを取得できません";
    const thumbnailImg = card.querySelector(".thumbnail-image") as HTMLImageElement;
    thumbnailImg.src = videoData.thumbnailUrl;
    // エラーハンドリング追加
    thumbnailImg.onerror = () => {
      thumbnailImg.src = "/local/fallback-thumbnail.svg";
      thumbnailImg.classList.add("error-thumbnail");
    };
    (card.querySelector(".quality-badge") as HTMLElement).textContent = videoData.quality === 'unknown' ? "不明な画質" : videoData.quality || "不明な画質";
    (card.querySelector(".quality-badge") as HTMLElement).className = `quality-badge ${this.getQualityClass(videoData.quality)}`;
    (card.querySelector(".temp-file") as HTMLElement).textContent = this.getTempOrCompleteString(videoData.isTemp);

    return card;
  }

  private getQualityClass(quality: string): string {
    // 数値部分のみ抽出して数値化
    const numericValue = parseInt(String(quality).replace(/[^0-9]/g, '')) || 'unknown';
    
    const qualityMap: Record<string | number, string> = {
      1080: "hd-quality",
      720: "hd-quality",
      480: "sd-quality",
      360: "low-quality",
      unknown: "unknown-quality",
    };
    return qualityMap[numericValue] || "unknown-quality";
  }

  private getTempOrCompleteString(string: boolean): string {
    if (string === true) {
      return "Temporary";
    } else {
      return "Complete";
    }
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
      const entries = await this.dataLoader.getAllEntries();
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
        const entries = await this.dataLoader.getAllEntries();
        await this.renderer.processBatch(entries);
      } finally {
        this.progressManager.hide();
      }
    });
  }
} 