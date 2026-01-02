/**
 * LazyImageLoader - Intersection Observer を使用したサムネイル遅延読み込み
 */

export interface LazyImageConfig {
  rootMargin: string;
  threshold: number;
  fallbackSrc: string;
  placeholderClass: string;
  loadedClass: string;
  errorClass: string;
}

export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private observedImages: WeakSet<HTMLImageElement> = new WeakSet();
  private readonly config: LazyImageConfig;

  constructor(config: Partial<LazyImageConfig> = {}) {
    this.config = {
      rootMargin: config.rootMargin ?? "200px 0px",
      threshold: config.threshold ?? 0,
      fallbackSrc: config.fallbackSrc ?? "/local/images/fallback-thumbnail.svg",
      placeholderClass: config.placeholderClass ?? "lazy-placeholder",
      loadedClass: config.loadedClass ?? "lazy-loaded",
      errorClass: config.errorClass ?? "lazy-error",
    };

    this.setupObserver();
  }

  private setupObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
          this.observer?.unobserve(img);
        }
      },
      {
        root: null,
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold,
      },
    );
  }

  /**
   * 画像要素を監視対象に追加
   */
  public observe(img: HTMLImageElement): void {
    if (!this.observer || this.observedImages.has(img)) return;

    // data-src が設定されていない場合は src を data-src に移動
    const src = img.dataset.src ?? img.src;
    if (src && !img.dataset.src) {
      img.dataset.src = src;
    }

    // プレースホルダー状態に設定
    if (!img.classList.contains(this.config.loadedClass)) {
      img.classList.add(this.config.placeholderClass);
      // 透明なプレースホルダーを設定
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 130 100'%3E%3Crect fill='%23ddd' width='130' height='100'/%3E%3C/svg%3E";
    }

    this.observedImages.add(img);
    this.observer.observe(img);
  }

  /**
   * 複数の画像要素を一括で監視
   */
  public observeAll(container: HTMLElement | Document = document): void {
    const images = container.querySelectorAll(
      "img[data-src], img.thumbnail-image:not(.lazy-loaded)",
    );
    
    for (const element of Array.from(images)) {
      if (element instanceof HTMLImageElement) {
        this.observe(element);
      }
    }
  }

  /**
   * 画像を読み込む
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src) return;

    // 新しいイメージで事前読み込み
    const tempImg = new Image();

    tempImg.onload = () => {
      img.src = src;
      img.classList.remove(this.config.placeholderClass);
      img.classList.add(this.config.loadedClass);
      img.removeAttribute("data-src");
    };

    tempImg.onerror = () => {
      img.src = this.config.fallbackSrc;
      img.classList.remove(this.config.placeholderClass);
      img.classList.add(this.config.errorClass);
      img.removeAttribute("data-src");
    };

    tempImg.src = src;
  }

  /**
   * 画像要素の監視を解除
   */
  public unobserve(img: HTMLImageElement): void {
    if (!this.observer) return;
    this.observer.unobserve(img);
  }

  /**
   * 全ての監視を解除してリソースを解放
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * 画像を即座に読み込む（仮想スクロール用）
   */
  public loadImmediate(img: HTMLImageElement): void {
    if (!this.observer) return;
    this.observer.unobserve(img);
    this.loadImage(img);
  }

  /**
   * コンテナ内の全画像を即座に読み込む
   */
  public loadAllInContainer(container: HTMLElement): void {
    const images = container.querySelectorAll(
      "img[data-src]",
    );
    
    for (const element of Array.from(images)) {
      if (element instanceof HTMLImageElement) {
        this.loadImmediate(element);
      }
    }
  }
}

// シングルトンインスタンス
let lazyImageLoaderInstance: LazyImageLoader | null = null;

export function getLazyImageLoader(): LazyImageLoader {
  if (!lazyImageLoaderInstance) {
    lazyImageLoaderInstance = new LazyImageLoader();
  }
  return lazyImageLoaderInstance;
}

export function destroyLazyImageLoader(): void {
  if (lazyImageLoaderInstance) {
    lazyImageLoaderInstance.destroy();
    lazyImageLoaderInstance = null;
  }
}

