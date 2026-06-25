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

const DEBUG = false;
let lastLogTime = 0;
function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    const now = performance.now();
    const delta = now - lastLogTime;
    lastLogTime = now;
    window.logger?.debug(`[VirtualScroll +${delta.toFixed(1)}ms]`, ...args);
  }
}

export class VirtualScrollRenderer {
  private container: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private topSpacer: HTMLElement | null = null;
  private bottomSpacer: HTMLElement | null = null;

  private allData: VideoData[] = [];
  private visibleRange: VisibleRange = { start: 0, end: 0 };
  private resizeObserver: ResizeObserver | null = null;

  private readonly config: VirtualScrollConfig;
  private createVideoCard: ((data: VideoData) => HTMLElement) | null = null;
  private isRendering = false;
  private pendingRender = false;

  // 動的に計算されるカード高さ
  private measuredItemHeight: number;
  private columnsCount = 1;

  // スクロールイベント用
  private scrollHandler: (() => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private rafId: number | null = null;
  private containerOffsetTop = 0; // キャッシュされたオフセット

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: config.itemHeight ?? 420,
      bufferSize: config.bufferSize ?? 15,
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

    // グリッドコンテナ（実際のカードが入る）
    this.container = document.createElement("div");
    this.container.className = "virtual-scroll-grid";

    // 下部スペーサー
    this.bottomSpacer = document.createElement("div");
    this.bottomSpacer.className = "virtual-scroll-spacer virtual-scroll-spacer-bottom";
    this.bottomSpacer.style.height = "0px";

    // DOM構造を組み立て
    this.contentContainer.appendChild(this.topSpacer);
    this.contentContainer.appendChild(this.container);
    this.contentContainer.appendChild(this.bottomSpacer);
    this.scrollContainer.appendChild(this.contentContainer);

    // 既存のコンテナを置き換え
    existingContainer.replaceWith(this.scrollContainer);

    // オフセットをキャッシュ (DOMの配置後に計算)
    requestAnimationFrame(() => {
      this.cacheContainerOffset();
    });
  }

  private cacheContainerOffset(): void {
    if (this.scrollContainer) {
      const rect = this.scrollContainer.getBoundingClientRect();
      this.containerOffsetTop = rect.top + window.scrollY;
    }
  }

  private setupObservers(): void {
    // スクロールイベントでRAF（requestAnimationFrame）を使用
    this.scrollHandler = () => {
      // レンダリング中はスクロールイベントを無視（スクロール補正による再発火防止）
      if (this.isRendering) return;
      if (this.rafId !== null) return; // 既にRAFが予約されている場合はスキップ
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.recalculateVisibleRange();
      });
    };
    window.addEventListener("scroll", this.scrollHandler, { passive: true });

    // キーボードナビゲーション対応（PageDown, PageUp, Home, End）
    this.keydownHandler = (e: KeyboardEvent) => {
      // 入力フィールドでは無視
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "PageDown":
          this.handlePageDown();
          break;
        case "PageUp":
          this.handlePageUp();
          break;
        case "End":
          if (e.ctrlKey) {
            this.handleEnd();
          }
          break;
        case "Home":
          if (e.ctrlKey) {
            this.handleHome();
          }
          break;
      }
    };
    window.addEventListener("keydown", this.keydownHandler);

    // ResizeObserver でカラム数を監視
    this.resizeObserver = new ResizeObserver(() => {
      this.updateColumnsCount();
      this.cacheContainerOffset(); // リサイズ時にオフセットを再計算
      this.recalculateVisibleRange();
    });

    if (this.scrollContainer) {
      this.resizeObserver.observe(this.scrollContainer);
    }
  }

  private handlePageDown(): void {
    // 現在のスクロール位置から1ページ分進める
    const pageHeight = window.innerHeight * 0.9;
    const newScrollTop = window.scrollY + pageHeight;
    
    // スクロール前に表示範囲を事前計算
    this.preloadForScroll(newScrollTop);
  }

  private handlePageUp(): void {
    // 現在のスクロール位置から1ページ分戻る
    const pageHeight = window.innerHeight * 0.9;
    const newScrollTop = Math.max(0, window.scrollY - pageHeight);
    
    // スクロール前に表示範囲を事前計算
    this.preloadForScroll(newScrollTop);
  }

  private handleEnd(): void {
    // ページ最下部へ - 最後のデータを表示するように範囲を設定
    const visibleItems = this.getVisibleItemCount();
    this.visibleRange = {
      start: Math.max(0, this.allData.length - visibleItems),
      end: this.allData.length,
    };
    this.scheduleRender();
    
    // スクロール位置も最下部へ
    const totalRows = Math.ceil(this.allData.length / this.columnsCount);
    const totalHeight = totalRows * this.measuredItemHeight + this.containerOffsetTop;
    window.scrollTo({ top: totalHeight, behavior: "instant" });
  }

  private handleHome(): void {
    // ページ先頭へ
    this.scrollToTop();
  }

  private preloadForScroll(targetScrollTop: number): void {
    if (this.allData.length === 0) return;

    const viewportHeight = window.innerHeight;
    const effectiveScrollTop = Math.max(0, targetScrollTop - this.containerOffsetTop);
    
    // バッファを適用
    const bufferPixels = this.measuredItemHeight * this.config.bufferSize;
    const startPixel = Math.max(0, effectiveScrollTop - bufferPixels);
    const endPixel = effectiveScrollTop + viewportHeight + bufferPixels;

    // 行数からアイテムインデックスを計算
    const startRow = Math.floor(startPixel / this.measuredItemHeight);
    const endRow = Math.ceil(endPixel / this.measuredItemHeight);

    const newStart = Math.max(0, startRow * this.columnsCount);
    const newEnd = Math.min(this.allData.length, endRow * this.columnsCount);

    // 範囲を更新してレンダリング
    this.visibleRange = { start: newStart, end: newEnd };
    this.scheduleRender();
  }

  private recalculateVisibleRange(): void {
    if (this.allData.length === 0 || this.isRendering) {
      return;
    }

    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    
    // キャッシュされたオフセットを使用（getBoundingClientRectを避ける）
    const effectiveScrollTop = Math.max(0, scrollTop - this.containerOffsetTop);
    
    // バッファを適用
    const bufferPixels = this.measuredItemHeight * this.config.bufferSize;
    const startPixel = Math.max(0, effectiveScrollTop - bufferPixels);
    const endPixel = effectiveScrollTop + viewportHeight + bufferPixels;

    // 行数からアイテムインデックスを計算
    const startRow = Math.floor(startPixel / this.measuredItemHeight);
    const endRow = Math.ceil(endPixel / this.measuredItemHeight);

    const newStart = Math.max(0, startRow * this.columnsCount);
    const newEnd = Math.min(this.allData.length, endRow * this.columnsCount);

    // 十分な変化があった場合のみ再レンダリング（hysteresisを追加）
    const threshold = this.columnsCount * 2;
    const startDiff = Math.abs(newStart - this.visibleRange.start);
    const endDiff = Math.abs(newEnd - this.visibleRange.end);
    
    if (startDiff >= threshold || endDiff >= threshold) {
      debugLog("recalc TRIGGER:", {
        scrollY: scrollTop,
        range: { from: this.visibleRange, to: { start: newStart, end: newEnd } },
        diffs: { start: startDiff, end: endDiff },
      });
      this.visibleRange = { start: newStart, end: newEnd };
      this.scheduleRender();
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
    debugLog("setData:", { dataLength: data.length });
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
    
    // データ設定後にオフセットを再計算
    requestAnimationFrame(() => {
      this.cacheContainerOffset();
    });
  }

  public getData(): VideoData[] {
    return this.allData;
  }

  public getFilteredData(): VideoData[] {
    return this.allData;
  }

  private scheduleRender(): void {
    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }
    void this.render();
  }

  private async render(): Promise<void> {
    if (!this.container || !this.createVideoCard) {
      debugLog("render skipped: no container or createVideoCard");
      return;
    }
    
    const scrollBefore = window.scrollY;
    debugLog("render START:", { range: this.visibleRange, scrollY: scrollBefore });
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
    
    debugLog("render DONE:", { 
      items: visibleData.length, 
      scrollY: window.scrollY
    });

    // レンダリング完了後、少し遅延してからisRenderingをfalseにする
    // これにより、スクロール補正によるイベントが落ち着くまで待つ
    setTimeout(() => {
      this.isRendering = false;
      
      if (this.pendingRender) {
        this.pendingRender = false;
        debugLog("render: scheduling pending render");
        this.scheduleRender();
      }
    }, 50);
  }

  // 高さ測定が完了したかどうか
  private heightMeasured = false;

  private async measureItemHeight(): Promise<void> {
    // 一度測定したら再測定しない（高さの変動を防ぐ）
    if (this.heightMeasured) return;
    if (!this.container) return;
    
    const firstCard = this.container.querySelector(".video-card");
    if (firstCard instanceof HTMLElement) {
      // レイアウト完了を待つ
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const rect = firstCard.getBoundingClientRect();
      if (rect.height > 0) {
        // CSSで420pxを指定しているため、異常に大きい値は無視
        const expectedHeight = 420 + 32; // カード高さ + gap
        const measuredWithGap = rect.height + 32;
        
        // 測定値が期待値の1.5倍以上なら、CSSの値を使用
        if (measuredWithGap > expectedHeight * 1.5) {
          this.measuredItemHeight = expectedHeight;
          debugLog("measureItemHeight: using CSS default (measured too large):", {
            measured: measuredWithGap,
            using: expectedHeight,
          });
        } else {
          this.measuredItemHeight = measuredWithGap;
          debugLog("measureItemHeight FIXED:", this.measuredItemHeight);
        }
        this.heightMeasured = true;
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

    const prevTopHeight = parseFloat(this.topSpacer.style.height) || 0;
    const prevBottomHeight = parseFloat(this.bottomSpacer.style.height) || 0;

    this.topSpacer.style.height = `${Math.max(0, topHeight)}px`;
    this.bottomSpacer.style.height = `${Math.max(0, bottomHeight)}px`;
    
    // デバッグログ（高さが変わった場合のみ）
    if (topHeight !== prevTopHeight || bottomHeight !== prevBottomHeight) {
      debugLog("updateSpacers:", {
        topSpacer: { prev: prevTopHeight, new: topHeight },
        bottomSpacer: { prev: prevBottomHeight, new: bottomHeight },
        totalHeight: topHeight + bottomHeight + (endRow - startRow) * this.measuredItemHeight,
        range: this.visibleRange,
      });
    }
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
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
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
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
