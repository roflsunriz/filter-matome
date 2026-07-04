import { NicoVideoPlayer } from "@/mlink-video-controller/services/nico-video-player";
import { TimeFormatter } from "@/mlink-video-controller/utils/time-formatter";
import { NicoApiFetcher } from "@/mlink-video-controller/managers/nico-api-fetcher";

export type HeatmapColorScheme = "default" | "rainbow" | "fire" | "cool";
export type HeatmapDisplayMode = "fab" | "overlay" | "off";

export class HeatmapManager {
  private static instance: HeatmapManager;
  private player: NicoVideoPlayer;
  private apiFetcher: NicoApiFetcher;

  // FAB内表示用
  private fabCanvas: HTMLCanvasElement | null = null;
  private fabTooltip: HTMLElement | null = null;
  private fabContext: CanvasRenderingContext2D | null = null;

  // オーバーレイ表示用
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayTooltip: HTMLElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;
  private overlayContainer: HTMLElement | null = null;

  private colorScheme: HeatmapColorScheme = "default";
  private smoothing: boolean = false;
  private commentData: { time: number; count: number }[] = [];
  private displayMode: HeatmapDisplayMode = "off";
  private updateInterval: number | null = null;

  // SPA遷移検知用
  private videoPlayerObserver: MutationObserver | null = null;
  private currentVideoElement: HTMLVideoElement | null = null;

  // ResizeObserver管理用を追加
  private resizeObserver: ResizeObserver | null = null;

  // フルスクリーン状態管理
  private isFullscreen: boolean = false;
  private fullscreenChangeHandler: (() => void) | null = null;

  // ローカルストレージのキー
  private readonly STORAGE_KEYS = {
    DISPLAY_MODE: "heatmapDisplayMode",
    COLOR_SCHEME: "heatmapColorScheme",
    SMOOTHING: "heatmapSmoothing",
  };

  private constructor() {
    this.player = NicoVideoPlayer.getInstance();
    this.apiFetcher = NicoApiFetcher.getInstance();
    // 初期化時に保存された設定を復元
    this.restoreSettings();
    // SPA遷移検知を開始
    this.startVideoPlayerObserver();
    // フルスクリーン状態監視を開始
    this.startFullscreenObserver();
  }

  public static getInstance(): HeatmapManager {
    if (!HeatmapManager.instance) {
      HeatmapManager.instance = new HeatmapManager();
    }
    return HeatmapManager.instance;
  }

  public initialize(canvas: HTMLCanvasElement, tooltip: HTMLElement): void {
    this.fabCanvas = canvas;
    this.fabTooltip = tooltip;
    this.fabContext = canvas.getContext("2d");

    if (this.fabContext) {
      this.fabContext.imageSmoothingEnabled = this.smoothing;
    }

    // キャンバスサイズを親要素に合わせて設定
    this.resizeFabCanvas();

    this.setupFabEventListeners();
    this.updateCommentData();
  }

  public setDisplayMode(mode: HeatmapDisplayMode): void {
    this.displayMode = mode;

    // 既存の表示をクリア
    this.clearAllDisplays();

    // 定期更新を停止
    this.stopPeriodicUpdate();

    switch (mode) {
      case "fab":
        this.showFabHeatmap();
        this.startPeriodicUpdate(); // 定期更新を開始
        break;
      case "overlay":
        this.showOverlayHeatmap();
        this.startPeriodicUpdate(); // 定期更新を開始
        break;
      case "off":
        // 何も表示しない（定期更新も停止）
        break;
    }

    // 設定を保存
    this.saveSettings();
  }

  public getDisplayMode(): HeatmapDisplayMode {
    return this.displayMode;
  }

  private clearAllDisplays(): void {
    // FAB内のキャンバスをクリア
    if (this.fabCanvas && this.fabContext) {
      this.fabContext.clearRect(
        0,
        0,
        this.fabCanvas.width,
        this.fabCanvas.height,
      );
    }

    // ResizeObserverを停止
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 現在のオーバーレイを削除
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
      this.overlayCanvas = null;
      this.overlayTooltip = null;
      this.overlayContext = null;
    }

    // 既存の全てのヒートマップオーバーレイ要素を削除（クリーンアップ）
    const existingOverlays = document.querySelectorAll(
      ".heatmap-overlay-container",
    );
    existingOverlays.forEach((overlay) => {
      window.logger.info(
        "[HeatmapManager] 古いヒートマップオーバーレイを削除:",
        overlay,
      );
      overlay.remove();
    });

    // 定期更新も停止
    this.stopPeriodicUpdate();
  }

  private showFabHeatmap(): void {
    if (this.fabCanvas) {
      this.render();
    }
  }

  private showOverlayHeatmap(): void {
    this.createOverlayHeatmap();
  }

  private createOverlayHeatmap(): void {
    // 動画要素の準備完了を待つ
    this.waitForVideoPlayerReady()
      .then(() => {
        this.createOverlayHeatmapInternal();
      })
      .catch((error) => {
        window.logger.warn(
          "[HeatmapManager] 動画プレイヤーの準備完了を待機中にエラー:",
          error,
        );
        // エラーが発生しても一度は試行する
        setTimeout(() => {
          this.createOverlayHeatmapInternal();
        }, 2000);
      });
  }

  private async waitForVideoPlayerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 最大5秒待機

      const checkVideoReady = () => {
        attempts++;

        // 動画要素を取得
        const videoElement =
          (document.querySelector(
            'video[data-name="video-content"]',
          ) as HTMLVideoElement) ||
          (document.querySelector("#video-element") as HTMLVideoElement);
        if (
          videoElement &&
          videoElement.readyState >= 2 && // HAVE_CURRENT_DATA以上
          videoElement.duration > 0 &&
          !videoElement.paused
        ) {
          // 再生が開始されている

          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          window.logger.warn(
            "[HeatmapManager] 動画プレイヤーの準備完了待機がタイムアウト",
          );
          reject(new Error("Video player ready timeout"));
          return;
        }

        // 100ms後に再チェック
        setTimeout(checkVideoReady, 100);
      };

      checkVideoReady();
    });
  }

  private createOverlayHeatmapInternal(): void {
    // まず完全なクリーンアップを実行
    this.clearAllDisplays();

    // ヒートマップ用のCSSスタイルを追加（まだ存在しない場合）
    this.injectHeatmapStyles();

    // 動画要素を取得
    const videoElement =
      (document.querySelector(
        'video[data-name="video-content"]',
      ) as HTMLVideoElement) ||
      (document.querySelector("#video-element") as HTMLVideoElement);
    if (!videoElement) {
      window.logger.warn("[HeatmapManager] 動画要素が見つかりません");
      return;
    }

    // 動画の親要素を取得
    const videoContainer = videoElement.parentElement;
    if (!videoContainer) {
      window.logger.warn("[HeatmapManager] 動画コンテナが見つかりません");
      return;
    }

    // 念のため、このコンテナ内の既存のヒートマップ要素を削除
    const existingInContainer = videoContainer.querySelectorAll(
      ".heatmap-overlay-container",
    );
    existingInContainer.forEach((overlay) => {
      window.logger.info(
        "[HeatmapManager] コンテナ内の古いヒートマップを削除:",
        overlay,
      );
      overlay.remove();
    });

    // オーバーレイコンテナを作成
    this.overlayContainer = document.createElement("div");
    this.overlayContainer.className = "heatmap-overlay-container";
    this.applyOverlayContainerStyles(this.overlayContainer);

    // キャンバスを作成
    this.overlayCanvas = document.createElement("canvas");
    this.overlayCanvas.className = "heatmap-overlay-canvas";

    // ツールチップを作成
    this.overlayTooltip = document.createElement("div");
    this.overlayTooltip.className = "heatmap-overlay-tooltip";

    // 要素を組み立て
    this.overlayContainer.appendChild(this.overlayCanvas);
    this.overlayContainer.appendChild(this.overlayTooltip);

    // 動画コンテナに追加（相対位置指定が必要）
    if (getComputedStyle(videoContainer).position === "static") {
      videoContainer.style.position = "relative";
    }
    videoContainer.appendChild(this.overlayContainer);

    // コンテキストを取得
    this.overlayContext = this.overlayCanvas.getContext("2d");
    if (this.overlayContext) {
      this.overlayContext.imageSmoothingEnabled = this.smoothing;
    }

    // イベントリスナーを設定
    this.setupOverlayEventListeners();

    // キャンバスサイズを設定
    this.resizeOverlayCanvas();

    // 現在のフルスクリーン状態に応じてスタイルを再適用
    this.isFullscreen = this.checkFullscreenState();
    this.applyOverlayContainerStyles(this.overlayContainer);

    // レンダリング
    this.renderOverlay();

    // リサイズ監視（新しいResizeObserverを作成）
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeOverlayCanvas();
      this.renderOverlay();
    });
    this.resizeObserver.observe(videoContainer);

    window.logger.info(
      "[HeatmapManager] オーバーレイヒートマップを作成しました",
    );

    // オーバーレイ作成後に定期更新を再開（再生位置マーカーの更新のため）
    this.startPeriodicUpdate();
  }

  private resizeOverlayCanvas(): void {
    if (!this.overlayCanvas || !this.overlayContainer) return;

    const rect = this.overlayContainer.getBoundingClientRect();
    this.overlayCanvas.width = rect.width;
    this.overlayCanvas.height = rect.height;
  }

  private setupFabEventListeners(): void {
    if (!this.fabCanvas || !this.fabTooltip) return;

    // リサイズ監視を追加
    const resizeObserver = new ResizeObserver(() => {
      this.resizeFabCanvas();
      if (this.displayMode === "fab") {
        this.render();
      }
    });

    const container = this.fabCanvas.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    this.fabCanvas.addEventListener("mousemove", (e) => {
      if (this.displayMode === "fab") {
        const rect = this.fabCanvas!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        this.showTooltip(position, this.fabTooltip!);
      }
    });

    this.fabCanvas.addEventListener("mouseleave", () => {
      if (this.displayMode === "fab") {
        this.hideTooltip(this.fabTooltip!);
      }
    });

    this.fabCanvas.addEventListener("click", (e) => {
      if (this.displayMode === "fab") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const rect = this.fabCanvas!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        this.seekToPosition(position);
      }
    });
  }

  private setupOverlayEventListeners(): void {
    if (!this.overlayCanvas || !this.overlayTooltip) return;

    this.overlayCanvas.addEventListener("mousemove", (e) => {
      const rect = this.overlayCanvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;
      this.showTooltip(position, this.overlayTooltip!);

      // ツールチップの位置を設定
      this.overlayTooltip!.style.left = `${position * 100}%`;
    });

    this.overlayCanvas.addEventListener("mouseleave", () => {
      this.hideTooltip(this.overlayTooltip!);
    });

    this.overlayCanvas.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const rect = this.overlayCanvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;
      this.seekToPosition(position);
    });
  }

  private seekToPosition(position: number): void {
    const duration = this.player.getDuration();
    const time = position * duration;
    this.player.seek(time);
  }

  private updateCommentData(): void {
    this.commentData = this.apiFetcher.getCommentDensityData();
  }

  public setColorScheme(scheme: HeatmapColorScheme): void {
    this.colorScheme = scheme;
    this.render();
    this.renderOverlay();

    // 設定を保存
    this.saveSettings();
  }

  public setSmoothing(enabled: boolean): void {
    this.smoothing = enabled;
    if (this.fabContext) {
      this.fabContext.imageSmoothingEnabled = enabled;
    }
    if (this.overlayContext) {
      this.overlayContext.imageSmoothingEnabled = enabled;
    }
    this.render();
    this.renderOverlay();

    // 設定を保存
    this.saveSettings();
  }

  public showTooltip(position: number, tooltip: HTMLElement): void {
    const duration = this.player.getDuration();
    const time = position * duration;
    const commentCount = this.getCommentCountAtTime(time);

    tooltip.textContent = `${TimeFormatter.formatTime(time)} (${commentCount}コメント)`;
    tooltip.style.display = "block";
  }

  public hideTooltip(tooltip: HTMLElement): void {
    tooltip.style.display = "none";
  }

  private getCommentCountAtTime(time: number): number {
    const timeMs = time * 1000;
    return this.apiFetcher.getCommentsCountAtTime(timeMs);
  }

  private getColorForValue(value: number, max: number): string {
    const normalizedValue = Math.max(0, Math.min(1, value / max));
    let hue: number;
    let r: number;
    let g: number;
    let b: number;

    switch (this.colorScheme) {
      case "rainbow":
        hue = (1 - normalizedValue) * 240;
        return `hsl(${hue}, 100%, 50%)`;

      case "fire":
        r = Math.min(255, normalizedValue * 510);
        g = Math.min(255, normalizedValue * 255);
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, 0)`;

      case "cool":
        b = Math.min(255, normalizedValue * 255);
        return `rgb(0, ${Math.floor(normalizedValue * 255)}, ${Math.floor(b)})`;

      default:
        // デフォルトを色とりどりに改善
        if (normalizedValue === 0) return "transparent";

        // 密度に応じて青→緑→黄→赤のグラデーション
        if (normalizedValue <= 0.25) {
          // 青から水色へ
          const ratio = normalizedValue / 0.25;
          r = Math.floor(ratio * 100);
          g = Math.floor(150 + ratio * 105);
          b = 255;
        } else if (normalizedValue <= 0.5) {
          // 水色から緑へ
          const ratio = (normalizedValue - 0.25) / 0.25;
          r = Math.floor(100 - ratio * 100);
          g = 255;
          b = Math.floor(255 - ratio * 255);
        } else if (normalizedValue <= 0.75) {
          // 緑から黄色へ
          const ratio = (normalizedValue - 0.5) / 0.25;
          r = Math.floor(ratio * 255);
          g = 255;
          b = 0;
        } else {
          // 黄色から赤へ
          const ratio = (normalizedValue - 0.75) / 0.25;
          r = 255;
          g = Math.floor(255 - ratio * 255);
          b = 0;
        }

        return `rgb(${r}, ${g}, ${b})`;
    }
  }

  public render(): void {
    if (this.displayMode !== "fab" || !this.fabCanvas || !this.fabContext)
      return;

    // レンダリング前にキャンバスサイズを更新
    this.resizeFabCanvas();
    this.renderToCanvas(this.fabCanvas, this.fabContext);
  }

  private renderOverlay(): void {
    if (
      this.displayMode !== "overlay" ||
      !this.overlayCanvas ||
      !this.overlayContext
    )
      return;
    this.renderToCanvas(this.overlayCanvas, this.overlayContext);
  }

  private renderToCanvas(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ): void {
    const width = canvas.width;
    const height = canvas.height;
    const maxCount = Math.max(...this.commentData.map((data) => data.count));

    // キャンバスをクリア
    context.clearRect(0, 0, width, height);

    if (this.commentData.length === 0) return;

    // ヒートマップを描画 - キャンバス全体を使うように修正
    const duration = this.player.getDuration();
    if (duration <= 0) return;

    // 動画の長さに基づいてセグメント数を決定（最低100セグメント）
    const segments = Math.max(100, this.commentData.length);
    const barWidth = width / segments;

    // 高さ計算の改善：より視覚的に分かりやすくする
    const minBarHeight = Math.max(4, height * 0.15); // 最小の高さを15%または4pxに増加
    const maxBarHeight = height * 0.95; // 最大高さを95%に拡大

    // 各セグメントに対してコメント密度を計算
    for (let i = 0; i < segments; i++) {
      const segmentTime = (i / segments) * duration * 1000; // ミリ秒
      const segmentEndTime = ((i + 1) / segments) * duration * 1000;

      // このセグメントに含まれるコメント数を計算
      let commentCount = 0;
      for (const comment of this.apiFetcher.getComments()) {
        if (comment.vposMs >= segmentTime && comment.vposMs < segmentEndTime) {
          commentCount++;
        }
      }

      if (commentCount > 0) {
        // 高さ計算を改善：より直感的なスケールに変更
        const normalizedCount = commentCount / maxCount;

        // 平方根スケールを使用してコントラストを保ちつつ視認性を向上
        const sqrtScale = Math.sqrt(normalizedCount);

        // 最小値と最大値の間で線形補間
        let barHeight =
          minBarHeight + sqrtScale * (maxBarHeight - minBarHeight);

        // 最小高さを保証
        barHeight = Math.max(minBarHeight, barHeight);

        const x = i * barWidth;
        const y = height - barHeight;

        context.fillStyle = this.getColorForValue(commentCount, maxCount);
        context.fillRect(x, y, barWidth, barHeight);
      }
    }

    // 現在の再生位置を示すマーカーを描画
    const currentTime = this.player.getCurrentTime();
    if (duration > 0) {
      const position = (currentTime / duration) * width;

      context.strokeStyle = "#ff0000";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, height);
      context.stroke();
    }
  }

  // コメントデータが更新された時に呼び出される
  public updateComments(): void {
    this.updateCommentData();
    this.updateDisplay();
  }

  // 表示を更新（現在の表示モードに応じて適切な描画を実行）
  public updateDisplay(): void {
    switch (this.displayMode) {
      case "fab":
        this.render();
        break;
      case "overlay":
        this.renderOverlay();
        break;
      case "off":
        // 何もしない
        break;
    }
  }

  // 定期的な更新を開始（再生位置の更新のため）
  public startPeriodicUpdate(): void {
    // 既存のインターバルをクリア
    this.stopPeriodicUpdate();

    // 500msごとに表示を更新
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 500);
  }

  // 定期的な更新を停止
  public stopPeriodicUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private resizeFabCanvas(): void {
    if (!this.fabCanvas) return;

    const container = this.fabCanvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      // 親要素の横幅いっぱいに設定
      this.fabCanvas.width = rect.width;
      this.fabCanvas.height = 30; // 高さは固定

      // CSSでも横幅を100%に設定
      this.fabCanvas.style.width = "100%";
      this.fabCanvas.style.height = "30px";
    }
  }

  private restoreSettings(): void {
    try {
      const storedDisplayMode = localStorage.getItem(
        this.STORAGE_KEYS.DISPLAY_MODE,
      );
      const storedColorScheme = localStorage.getItem(
        this.STORAGE_KEYS.COLOR_SCHEME,
      );
      const storedSmoothing = localStorage.getItem(this.STORAGE_KEYS.SMOOTHING);

      if (
        storedDisplayMode &&
        ["fab", "overlay", "off"].includes(storedDisplayMode)
      ) {
        this.displayMode = storedDisplayMode as HeatmapDisplayMode;
      }

      if (
        storedColorScheme &&
        ["default", "rainbow", "fire", "cool"].includes(storedColorScheme)
      ) {
        this.colorScheme = storedColorScheme as HeatmapColorScheme;
      }

      if (storedSmoothing !== null) {
        this.smoothing = storedSmoothing === "true";
      }
    } catch (error) {
      window.logger.error("[HeatmapManager] Error restoring settings:", error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.DISPLAY_MODE, this.displayMode);
      localStorage.setItem(this.STORAGE_KEYS.COLOR_SCHEME, this.colorScheme);
      localStorage.setItem(
        this.STORAGE_KEYS.SMOOTHING,
        this.smoothing.toString(),
      );
    } catch (error) {
      window.logger.error("[HeatmapManager] Error saving settings:", error);
    }
  }

  // SPA遷移検知用のMutationObserverを開始
  private startVideoPlayerObserver(): void {
    this.videoPlayerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          // 新しい動画要素が追加されたかチェック
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const videoElement =
                (element.querySelector?.(
                  'video[data-name="video-content"]',
                ) as HTMLVideoElement) ||
                (element.querySelector?.("#video-element") as HTMLVideoElement);

              if (videoElement && videoElement !== this.currentVideoElement) {
                window.logger.info(
                  "[HeatmapManager] 新しい動画プレイヤーを検知",
                );
                this.currentVideoElement = videoElement;

                // オーバーレイモードの場合は再作成
                if (this.displayMode === "overlay") {
                  // 少し遅延を入れて動画プレイヤーの準備完了を待つ
                  setTimeout(() => {
                    this.clearAllDisplays();
                    this.showOverlayHeatmap();
                  }, 1000);
                }
              }
            }
          });

          // 削除されたノードもチェックして古いヒートマップを削除
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // 削除されたノードがヒートマップコンテナを含んでいる場合のクリーンアップ
              if (
                element.querySelector?.(".heatmap-overlay-container") ||
                element.classList?.contains("heatmap-overlay-container")
              ) {
                window.logger.info(
                  "[HeatmapManager] 古いヒートマップ要素の削除を検知",
                );
                // 現在のオーバーレイの参照をクリア
                if (
                  this.overlayContainer &&
                  !document.contains(this.overlayContainer)
                ) {
                  this.overlayContainer = null;
                  this.overlayCanvas = null;
                  this.overlayTooltip = null;
                  this.overlayContext = null;
                }
              }
            }
          });
        }
      });
    });

    // document全体を監視
    this.videoPlayerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // MutationObserverを停止
  private stopVideoPlayerObserver(): void {
    if (this.videoPlayerObserver) {
      this.videoPlayerObserver.disconnect();
      this.videoPlayerObserver = null;
    }
  }

  // フルスクリーン状態監視を開始
  private startFullscreenObserver(): void {
    this.fullscreenChangeHandler = () => {
      const wasFullscreen = this.isFullscreen;
      this.isFullscreen = this.checkFullscreenState();

      if (wasFullscreen !== this.isFullscreen) {
        window.logger.info(
          "[HeatmapManager] フルスクリーン状態が変更されました:",
          this.isFullscreen,
        );
        this.handleFullscreenChange();
      }
    };

    // フルスクリーンイベントのリスナーを追加
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener(
      "webkitfullscreenchange",
      this.fullscreenChangeHandler,
    );
    document.addEventListener(
      "mozfullscreenchange",
      this.fullscreenChangeHandler,
    );
    document.addEventListener(
      "MSFullscreenChange",
      this.fullscreenChangeHandler,
    );

    // 初期状態をチェック
    this.isFullscreen = this.checkFullscreenState();
  }

  // フルスクリーン状態監視を停止
  private stopFullscreenObserver(): void {
    if (this.fullscreenChangeHandler) {
      document.removeEventListener(
        "fullscreenchange",
        this.fullscreenChangeHandler,
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        this.fullscreenChangeHandler,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        this.fullscreenChangeHandler,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        this.fullscreenChangeHandler,
      );
      this.fullscreenChangeHandler = null;
    }
  }

  // フルスクリーン状態をチェック
  private checkFullscreenState(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element })
        .webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element })
        .mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element })
        .msFullscreenElement
    );
  }

  // フルスクリーン状態変更時の処理
  private handleFullscreenChange(): void {
    if (this.displayMode === "overlay" && this.overlayContainer) {
      this.applyOverlayContainerStyles(this.overlayContainer);

      // デバッグ情報をログ出力
      const computedStyle = getComputedStyle(this.overlayContainer);
      window.logger.info(
        "[HeatmapManager] フルスクリーン状態に応じてオーバーレイスタイルを更新しました:",
        {
          isFullscreen: this.isFullscreen,
          className: this.overlayContainer.className,
          position: computedStyle.position,
          bottom: computedStyle.bottom,
          zIndex: computedStyle.zIndex,
          visibility: computedStyle.visibility,
          display: computedStyle.display,
        },
      );
    }
  }

  // ヒートマップ用のCSSスタイルを挿入
  private injectHeatmapStyles(): void {
    const styleId = "heatmap-overlay-styles";

    // すでに存在する場合はスキップ
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* ヒートマップオーバーレイのベーススタイル */
      .heatmap-overlay-container {
        height: 40px;
        pointer-events: none !important;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* 通常時のスタイル */
      .heatmap-overlay-container.heatmap-windowed {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 998 !important;
        pointer-events: none !important;
      }
      
      /* フルスクリーン時のスタイル - プレーヤーコントロールより下のレイヤー */
      .heatmap-overlay-container.heatmap-fullscreen,
      body .heatmap-overlay-container.heatmap-fullscreen,
      html .heatmap-overlay-container.heatmap-fullscreen {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        width: 100vw !important;
        height: 40px !important;
        z-index: 1999 !important;
        background: rgba(0, 0, 0, 0.4) !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        visibility: visible !important;
        display: block !important;
        pointer-events: none !important;
      }
      
      /* キャンバスのスタイル - ポインターイベントを限定的に有効化 */
      .heatmap-overlay-canvas {
        width: 100% !important;
        height: 100% !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* フルスクリーン時のキャンバス */
      .heatmap-fullscreen .heatmap-overlay-canvas {
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* 通常時のキャンバス */
      .heatmap-windowed .heatmap-overlay-canvas {
        pointer-events: auto !important;
      }
      
      /* ツールチップのスタイル */
      .heatmap-overlay-tooltip {
        position: absolute;
        display: none;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 2147483648;
        transform: translateX(-50%);
        bottom: 45px;
        white-space: nowrap;
      }
    `;

    document.head.appendChild(style);
    window.logger.info(
      "[HeatmapManager] ヒートマップ用CSSスタイルを挿入しました",
    );
  }

  // オーバーレイコンテナのスタイルを適用
  private applyOverlayContainerStyles(container: HTMLElement): void {
    // フルスクリーン状態に応じてCSSクラスを切り替え
    container.classList.remove("heatmap-fullscreen", "heatmap-windowed");

    if (this.isFullscreen) {
      // フルスクリーン時のクラスを追加
      container.classList.add("heatmap-fullscreen");

      // フルスクリーン時はフルスクリーン化されたコンテナ内に配置
      // position: fixedなので親要素は関係ないが、適切な場所に配置
      const videoElement =
        (document.querySelector(
          'video[data-name="video-content"]',
        ) as HTMLVideoElement) ||
        (document.querySelector("#video-element") as HTMLVideoElement);
      const videoContainer = videoElement?.parentElement;

      if (videoContainer && container.parentElement !== videoContainer) {
        videoContainer.appendChild(container);
        window.logger.info(
          "[HeatmapManager] フルスクリーン時にヒートマップコンテナをフルスクリーン要素内に配置しました",
        );
      }
    } else {
      // 通常時のクラスを追加
      container.classList.add("heatmap-windowed");

      // 通常時はvideo要素のコンテナに配置
      const videoElement =
        (document.querySelector(
          'video[data-name="video-content"]',
        ) as HTMLVideoElement) ||
        (document.querySelector("#video-element") as HTMLVideoElement);
      const videoContainer = videoElement?.parentElement;

      if (
        videoContainer &&
        container.parentElement !== videoContainer &&
        videoContainer !== document.body
      ) {
        if (getComputedStyle(videoContainer).position === "static") {
          videoContainer.style.position = "relative";
        }
        videoContainer.appendChild(container);
        window.logger.info(
          "[HeatmapManager] 通常時にヒートマップコンテナを動画コンテナに配置しました",
        );
      }
    }
  }

  // インスタンス破棄時の処理
  public destroy(): void {
    this.stopPeriodicUpdate();
    this.stopVideoPlayerObserver();
    this.stopFullscreenObserver();
    this.clearAllDisplays();

    // 念のため全てのヒートマップ要素を削除
    const allOverlays = document.querySelectorAll(".heatmap-overlay-container");
    allOverlays.forEach((overlay) => {
      window.logger.info(
        "[HeatmapManager] destroy時に古いヒートマップを削除:",
        overlay,
      );
      overlay.remove();
    });

    // 参照をクリア
    this.fabCanvas = null;
    this.fabTooltip = null;
    this.fabContext = null;
    this.overlayCanvas = null;
    this.overlayTooltip = null;
    this.overlayContext = null;
    this.overlayContainer = null;
    this.currentVideoElement = null;
  }

  // 現在の設定を取得するメソッドを追加
  public getColorScheme(): HeatmapColorScheme {
    return this.colorScheme;
  }

  public getSmoothing(): boolean {
    return this.smoothing;
  }
}
