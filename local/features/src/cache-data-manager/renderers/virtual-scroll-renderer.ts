import type { VideoData } from "@/types";

export interface VirtualScrollConfig {
  itemHeight: number;
  bufferSize: number;
  containerSelector: string;
}

interface VisibleRange {
  start: number;
  end: number;
}

export class VirtualScrollRenderer {
  private container: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private topSentinel: HTMLElement | null = null;
  private bottomSentinel: HTMLElement | null = null;
  private topSpacer: HTMLElement | null = null;
  private bottomSpacer: HTMLElement | null = null;

  private allData: VideoData[] = [];
  private visibleRange: VisibleRange = { start: 0, end: 0 };
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private readonly config: VirtualScrollConfig;
  private createVideoCard: ((data: VideoData) => HTMLElement) | null = null;
  private isRendering = false;
  private pendingRender = false;

  // 動的に計算されるカード高さ
  private measuredItemHeight: number;
  private columnsCount = 1;

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: config.itemHeight ?? 420,
      bufferSize: config.bufferSize ?? 10,
      containerSelector: config.containerSelector ?? ".cache-container",
    };
    this.measuredItemHeight = this.config.itemHeight;
  }

  public initialize(
    createVideoCard: (data: VideoData) => HTMLElement,
  ): void {
    this.createVideoCard = createVideoCard;
    this.setupDOM();
    this.setupObservers();
  }

  private setupDOM(): void {
    // 既存のコンテナを取得
    const existingContainer = document.querySelector(
      this.config.containerSelector,
    );
    
    if (!(existingContainer instanceof HTMLElement)) {
      console.error("Virtual scroll container not found");
      return;
    }

    // スクロールコンテナをラップ
    this.scrollContainer = document.createElement("div");
    this.scrollContainer.className = "virtual-scroll-container";
    
    // コンテンツコンテナ
    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "virtual-scroll-content";

    // 上部スペーサー
    this.topSpacer = document.createElement("div");
    this.topSpacer.className = "virtual-scroll-spacer virtual-scroll-spacer-top";
    this.topSpacer.style.height = "0px";

    // 上部センチネル
    this.topSentinel = document.createElement("div");
    this.topSentinel.className = "virtual-scroll-sentinel virtual-scroll-sentinel-top";

    // グリッドコンテナ（実際のカードが入る）
    this.container = document.createElement("div");
    this.container.className = "virtual-scroll-grid";

    // 下部センチネル
    this.bottomSentinel = document.createElement("div");
    this.bottomSentinel.className = "virtual-scroll-sentinel virtual-scroll-sentinel-bottom";

    // 下部スペーサー
    this.bottomSpacer = document.createElement("div");
    this.bottomSpacer.className = "virtual-scroll-spacer virtual-scroll-spacer-bottom";
    this.bottomSpacer.style.height = "0px";

    // DOM構造を組み立て
    this.contentContainer.appendChild(this.topSpacer);
    this.contentContainer.appendChild(this.topSentinel);
    this.contentContainer.appendChild(this.container);
    this.contentContainer.appendChild(this.bottomSentinel);
    this.contentContainer.appendChild(this.bottomSpacer);
    this.scrollContainer.appendChild(this.contentContainer);

    // 既存のコンテナを置き換え
    existingContainer.replaceWith(this.scrollContainer);
  }

  private setupObservers(): void {
    // Intersection Observer でセンチネルを監視
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (entry.target === this.topSentinel) {
            this.loadMoreTop();
          } else if (entry.target === this.bottomSentinel) {
            this.loadMoreBottom();
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    if (this.topSentinel) {
      this.observer.observe(this.topSentinel);
    }
    if (this.bottomSentinel) {
      this.observer.observe(this.bottomSentinel);
    }

    // ResizeObserver でカラム数を監視
    this.resizeObserver = new ResizeObserver(() => {
      this.updateColumnsCount();
      this.scheduleRender();
    });

    if (this.scrollContainer) {
      this.resizeObserver.observe(this.scrollContainer);
    }
  }

  private updateColumnsCount(): void {
    if (!this.scrollContainer) return;
    
    const containerWidth = this.scrollContainer.clientWidth;
    const minCardWidth = 300; // styles.ts の minmax(300px, 1fr) に合わせる
    const gap = 32; // 2rem
    
    this.columnsCount = Math.max(
      1,
      Math.floor((containerWidth + gap) / (minCardWidth + gap)),
    );
  }

  private getVisibleRowCount(): number {
    const viewportHeight = window.innerHeight;
    return Math.ceil(viewportHeight / this.measuredItemHeight) + this.config.bufferSize * 2;
  }

  private getVisibleItemCount(): number {
    return this.getVisibleRowCount() * this.columnsCount;
  }

  public async setData(data: VideoData[]): Promise<void> {
    this.allData = data;
    this.updateColumnsCount();
    
    // 初期表示範囲を設定
    const initialCount = this.getVisibleItemCount();
    this.visibleRange = {
      start: 0,
      end: Math.min(initialCount, data.length),
    };

    await this.render();
    this.updateSpacers();
  }

  public getData(): VideoData[] {
    return this.allData;
  }

  public getFilteredData(): VideoData[] {
    return this.allData;
  }

  private loadMoreTop(): void {
    if (this.visibleRange.start <= 0) return;

    const rowsToLoad = Math.ceil(this.config.bufferSize / this.columnsCount);
    const itemsToLoad = rowsToLoad * this.columnsCount;
    
    const newStart = Math.max(0, this.visibleRange.start - itemsToLoad);
    const newEnd = Math.min(
      this.visibleRange.end,
      this.allData.length,
    );

    this.visibleRange = { start: newStart, end: newEnd };
    this.scheduleRender();
  }

  private loadMoreBottom(): void {
    if (this.visibleRange.end >= this.allData.length) return;

    const rowsToLoad = Math.ceil(this.config.bufferSize / this.columnsCount);
    const itemsToLoad = rowsToLoad * this.columnsCount;
    
    const newEnd = Math.min(
      this.visibleRange.end + itemsToLoad,
      this.allData.length,
    );

    this.visibleRange = { start: this.visibleRange.start, end: newEnd };
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }
    void this.render();
  }

  private async render(): Promise<void> {
    if (!this.container || !this.createVideoCard) return;
    
    this.isRendering = true;

    const fragment = document.createDocumentFragment();
    const visibleData = this.allData.slice(
      this.visibleRange.start,
      this.visibleRange.end,
    );

    for (const item of visibleData) {
      const card = this.createVideoCard(item);
      fragment.appendChild(card);
    }

    // 既存のカードをクリアして新しいカードを追加
    this.container.innerHTML = "";
    this.container.appendChild(fragment);

    // 最初のカードの高さを測定
    await this.measureItemHeight();

    this.updateSpacers();
    this.isRendering = false;

    if (this.pendingRender) {
      this.pendingRender = false;
      this.scheduleRender();
    }
  }

  private async measureItemHeight(): Promise<void> {
    if (!this.container) return;
    
    const firstCard = this.container.querySelector(".video-card");
    if (firstCard instanceof HTMLElement) {
      // レイアウト完了を待つ
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const rect = firstCard.getBoundingClientRect();
      if (rect.height > 0) {
        this.measuredItemHeight = rect.height + 32; // gap込み
      }
    }
  }

  private updateSpacers(): void {
    if (!this.topSpacer || !this.bottomSpacer) return;

    const totalRows = Math.ceil(this.allData.length / this.columnsCount);
    const startRow = Math.floor(this.visibleRange.start / this.columnsCount);
    const endRow = Math.ceil(this.visibleRange.end / this.columnsCount);

    const topHeight = startRow * this.measuredItemHeight;
    const bottomHeight = (totalRows - endRow) * this.measuredItemHeight;

    this.topSpacer.style.height = `${Math.max(0, topHeight)}px`;
    this.bottomSpacer.style.height = `${Math.max(0, bottomHeight)}px`;
  }

  public clear(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.allData = [];
    this.visibleRange = { start: 0, end: 0 };
    this.updateSpacers();
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clear();
  }

  public getTotalCount(): number {
    return this.allData.length;
  }

  public getVisibleCount(): number {
    return this.visibleRange.end - this.visibleRange.start;
  }

  public scrollToTop(): void {
    this.visibleRange = {
      start: 0,
      end: Math.min(this.getVisibleItemCount(), this.allData.length),
    };
    void this.render();
    
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

