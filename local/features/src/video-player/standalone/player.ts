import { UrlManager } from "@/video-player/core/url-manager";
import { ToastManager } from "@/video-player/utils/toast";
import { applyStyles } from "@/video-player/utils/dom-utils";
import { PlayerControlsShadow } from "@/video-player/ui/player-controls";
import { CommentSystem } from "@/video-player/core/comment-system";
import {
  CUSTOM_PLAYER_SHADOW_HTML,
  CUSTOM_PLAYER_SHADOW_STYLES,
} from "@/video-player/ui/templates";
import type { ApiData } from "@/types/index";
import type { HlsConstructor, HlsInstance } from "@/types/video-types";

const ensureCustomElements = (): void => {
  if (!customElements.get("player-controls-shadow")) {
    customElements.define("player-controls-shadow", PlayerControlsShadow);
  }
};

let playerStylesInjected = false;

export interface StandalonePlayerOptions {
  mount: HTMLElement;
}

export interface StandalonePlayerInitOptions {
  apiData?: ApiData;
  displayTitle?: string;
  enableComments?: boolean;
}

export class StandalonePlayer {
  private readonly mount: HTMLElement;
  private readonly urlManager = new UrlManager();
  private readonly toastManager = new ToastManager();
  private readonly commentSystem = new CommentSystem();

  private playerControls: PlayerControlsShadow | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private videoContainer: HTMLElement | null = null;
  private customPlayerContainer: HTMLElement | null = null;
  private hlsConstructor: HlsConstructor | null = null;
  private hlsConstructorPromise: Promise<HlsConstructor | null> | null = null;
  private hls: HlsInstance | null = null;
  private enableComments = true;

  // マウス非アクティブ検出用
  private globalMouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private inactivityTimer: number | null = null;
  private readonly INACTIVITY_DELAY_MS = 3000; // 3秒間非アクティブで非表示
  private readonly CONTROLS_PROXIMITY_MARGIN = 100; // コントローラー付近のマージン（ピクセル）

  // レスポンシブ対応用
  private resizeObserver: ResizeObserver | null = null;
  private fullscreenChangeHandler: (() => void) | null = null;
  private standaloneWrapper: HTMLElement | null = null;

  // 動画終了・再再生検出用
  private hasEnded = false;
  private endedEventHandler: (() => void) | null = null;
  private playEventHandler: (() => void) | null = null;

  constructor(options: StandalonePlayerOptions) {
    this.mount = options.mount;
    ensureCustomElements();
    void this.ensureHlsLibrary();
    this.setupGlobalInterface();
  }

  public async initialize(
    videoId: string,
    options: StandalonePlayerInitOptions = {},
  ): Promise<void> {
    this.enableComments = options.enableComments !== false;

    this.preparePlayerShell();

    const displayTitle =
      options.displayTitle ?? options.apiData?.video.title ?? videoId;
    await this.playWithCustomSource(videoId, displayTitle);

    if (this.enableComments) {
      await this.loadComments(videoId);
    }
  }

  private preparePlayerShell(): void {
    this.mount.innerHTML = "";

    if (!playerStylesInjected) {
      applyStyles(CUSTOM_PLAYER_SHADOW_STYLES);
      playerStylesInjected = true;
    }

    const container = document.createElement("div");
    container.innerHTML = CUSTOM_PLAYER_SHADOW_HTML;
    this.customPlayerContainer = container.firstElementChild as HTMLElement;
    this.mount.append(this.customPlayerContainer);

    this.videoContainer = this.customPlayerContainer.querySelector(
      ".video-container",
    ) as HTMLElement;

    // 新しいラッパーを作成し、プレイヤーとコメントリストを配置
    const wrapper = document.createElement("div");
    wrapper.className = "standalone-player-wrapper";
    this.standaloneWrapper = wrapper;

    // 既存のプレイヤーをラッパーに移動
    wrapper.appendChild(this.customPlayerContainer);
    this.mount.appendChild(wrapper);

    this.videoContainer = wrapper.querySelector(
      ".video-container",
    ) as HTMLElement;
    this.videoElement = this.customPlayerContainer.querySelector(
      "#video-element",
    ) as HTMLVideoElement;
    this.playerControls = this.customPlayerContainer.querySelector(
      "player-controls-shadow",
    ) as PlayerControlsShadow;

    if (!this.videoElement) {
      throw new Error("動画要素が生成できませんでした");
    }

    if (this.enableComments) {
      try {
        this.commentSystem.initialize(
          this.videoElement,
          wrapper, // 親コンテナを新しいラッパーに変更
        );
      } catch (error) {
        window.logger.error("コメントシステムの初期化に失敗しました", error);
      }
    }

    if (this.playerControls) {
      const initControls = (): void => {
        if (typeof this.playerControls?.setVideoElement === "function") {
          this.playerControls.setVideoElement(this.videoElement!);
        }
        if (
          this.enableComments &&
          typeof this.playerControls?.setCommentSystem === "function"
        ) {
          this.playerControls.setCommentSystem(this.commentSystem);
        }
        if (
          !this.enableComments &&
          typeof this.playerControls?.disableComments === "function"
        ) {
          this.playerControls.disableComments();
        }
      };

      if (typeof this.playerControls.setVideoElement === "function") {
        initControls();
      } else {
        setTimeout(initControls, 200);
      }
    }

    this.setupHoverControls();
    this.setupResponsiveHandlers();
    this.setupVideoReplayHandlers();
  }

  private async playWithCustomSource(
    videoId: string,
    title: string,
  ): Promise<void> {
    this.cleanupPlayback();

    this.toastManager.showInfo(
      "キャッシュから動画ソースを検索中...",
      title,
      videoId,
    );

    const url = await this.urlManager.findFirstAvailableUrl(videoId);
    if (!url) {
      this.toastManager.showError(
        "動画ソースが見つかりません",
        "キャッシュまたはローカルソースを確認してください",
      );
      throw new Error("動画ソースが見つかりません");
    }

    await this.playVideo(url, title);
  }

  private async playVideo(url: string, title: string): Promise<void> {
    if (!this.videoElement) {
      throw new Error("動画要素が初期化されていません");
    }

    const isHls = this.isHLSUrl(url);
    if (isHls) {
      await this.loadHLSVideo(url);
    } else {
      this.videoElement.src = url;
      this.toastManager.showInfo("ネイティブ再生を試みます");
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = (): void => {
          cleanup();
          resolve();
        };
        const onError = (): void => {
          cleanup();
          reject(new Error("動画読み込みエラー"));
        };
        const cleanup = (): void => {
          this.videoElement?.removeEventListener("canplay", onCanPlay);
          this.videoElement?.removeEventListener("error", onError);
        };
        this.videoElement?.addEventListener("canplay", onCanPlay);
        this.videoElement?.addEventListener("error", onError);
      });
    } catch (error) {
      window.logger.warn("動画メタデータ取得に失敗しました", error);
    }

    const wasMuted = this.videoElement.muted;
    try {
      if (!wasMuted) {
        this.videoElement.muted = true;
      }
      const playPromise = this.videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      if (!wasMuted) {
        this.videoElement.muted = false;
      }
    } catch (error) {
      window.logger.warn("自動再生がブロックされた可能性があります", error);
      this.playerControls?.show();
    }

    // 再生開始時に一度コントロールを表示する
    this.playerControls?.show();

    this.videoElement.addEventListener("error", (evt) => {
      window.logger.error("[VIDEO-ERROR]", evt);
    });

    this.toastManager.showSuccess(url + " で再生します", title);
  }

  private setupHoverControls(): void {
    if (!this.videoContainer || !this.playerControls) {
      return;
    }

    let hoverTimer: number | null = null;

    this.videoContainer.addEventListener("mouseenter", () => {
      this.playerControls?.show();
      this.clearInactivityTimer();
    });

    // グローバルなマウス移動イベントリスナーを設定
    this.globalMouseMoveHandler = (event: MouseEvent): void => {
      // コントローラー付近にマウスがある場合は非表示にしない
      if (this.isMouseNearControls(event.clientX, event.clientY)) {
        this.playerControls?.show();
        this.clearInactivityTimer();
        return;
      }

      // コントローラー付近でない場合、非アクティブタイマーをリセット
      this.playerControls?.show();
      this.resetInactivityTimer();
    };

    document.addEventListener("mousemove", this.globalMouseMoveHandler);

    // ビデオコンテナでのマウス移動（既存の動作を維持）
    this.videoContainer.addEventListener("mousemove", () => {
      this.playerControls?.show();
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }
      hoverTimer = window.setTimeout(() => {
        if (
          this.playerControls &&
          !this.playerControls.classList.contains("always-visible")
        ) {
          this.playerControls.hide();
        }
      }, 2000);
    });

    this.videoContainer.addEventListener("mouseleave", () => {
      if (!this.playerControls) {
        return;
      }
      // マウスがコンテナから離れた後も、非アクティブタイマーを開始
      this.resetInactivityTimer();
    });

    this.videoContainer.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("player-controls-shadow")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!this.videoElement) {
        return;
      }
      if (this.videoElement.paused) {
        void this.videoElement
          .play()
          .catch((err) => window.logger.error("再生開始に失敗しました", err));
      } else {
        this.videoElement.pause();
      }
    });
  }

  /**
   * マウスがコントローラー付近にあるかを判定
   * @param mouseX マウスのX座標（clientX）
   * @param mouseY マウスのY座標（clientY）
   * @returns コントローラー付近にある場合true
   */
  private isMouseNearControls(mouseX: number, mouseY: number): boolean {
    if (!this.playerControls) {
      return false;
    }

    try {
      const rect = this.playerControls.getBoundingClientRect();

      // マージンを考慮した範囲を計算
      const margin = this.CONTROLS_PROXIMITY_MARGIN;
      const leftBound = rect.left - margin;
      const rightBound = rect.right + margin;
      const topBound = rect.top - margin;
      const bottomBound = rect.bottom + margin;

      return (
        mouseX >= leftBound &&
        mouseX <= rightBound &&
        mouseY >= topBound &&
        mouseY <= bottomBound
      );
    } catch (error) {
      window.logger.warn("コントローラー位置の取得に失敗しました", error);
      return false;
    }
  }

  /**
   * 非アクティブタイマーをリセット（マウスが動いた時）
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();

    if (
      !this.playerControls ||
      this.playerControls.classList.contains("always-visible")
    ) {
      return;
    }

    this.inactivityTimer = window.setTimeout(() => {
      if (
        this.playerControls &&
        !this.playerControls.classList.contains("always-visible")
      ) {
        this.playerControls.hide();
      }
    }, this.INACTIVITY_DELAY_MS);
  }

  /**
   * 非アクティブタイマーをクリア
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private isHLSUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.includes("hls") ||
      lower.includes(".m3u8") ||
      url.includes("master.m3u8") ||
      url.includes("playlist.m3u8")
    );
  }

  private async loadHLSVideo(url: string): Promise<void> {
    if (!this.videoElement) {
      return;
    }

    const HlsConstructor = await this.ensureHlsLibrary();
    if (HlsConstructor && HlsConstructor.isSupported()) {
      this.hls?.destroy();
      this.hls = new HlsConstructor();
      this.hls.on(
        HlsConstructor.Events.ERROR,
        (_event: unknown, data: unknown) => {
          window.logger.error("HLS Error", data);
          this.toastManager.showError("HLS再生でエラーが発生しました");
        },
      );
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
      return;
    }

    this.videoElement.src = url;
    this.toastManager.showInfo(
      "HLS.jsが利用できないためネイティブ再生を試みます",
    );
  }

  private async loadComments(videoId: string): Promise<void> {
    if (!this.enableComments) {
      return;
    }
    try {
      await this.commentSystem.loadComments(videoId);
    } catch (error) {
      window.logger.error("コメント読み込みに失敗しました", error);
      this.toastManager.showWarning(
        "コメント読み込みに失敗しました",
        "動画の再生は継続します",
      );
    }
  }

  private async ensureHlsLibrary(): Promise<HlsConstructor | null> {
    if (this.hlsConstructor) {
      return this.hlsConstructor;
    }
    if (!this.hlsConstructorPromise) {
      this.hlsConstructorPromise = import("hls.js")
        .then((module) => module.default)
        .catch((error) => {
          window.logger.warn("HLS.jsの読み込みに失敗しました", error);
          return null;
        });
    }
    const ctor = await this.hlsConstructorPromise;
    if (ctor) {
      this.hlsConstructor = ctor;
    }
    return this.hlsConstructor;
  }

  private cleanupPlayback(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = "";
      this.videoElement.load();
    }
  }

  /**
   * 動画の再再生時にコメントをリセットするハンドラーを設定
   */
  private setupVideoReplayHandlers(): void {
    if (!this.videoElement) {
      return;
    }

    // ended イベントハンドラー
    this.endedEventHandler = (): void => {
      this.hasEnded = true;
      window.logger.info("動画が終了しました");
    };

    // play イベントハンドラー
    this.playEventHandler = (): void => {
      if (this.hasEnded && this.enableComments) {
        window.logger.info(
          "動画終了後の再再生を検出、コメントをリセットして再度流します",
        );

        // コメントレンダラーをハードリセット
        try {
          this.commentSystem.hardReset();
          window.logger.info("コメントレンダラーをハードリセットしました");
        } catch (error) {
          window.logger.error("コメントのハードリセットに失敗しました", error);
        }

        // 再再生フラグをリセット
        this.hasEnded = false;
      }
    };

    this.videoElement.addEventListener("ended", this.endedEventHandler);
    this.videoElement.addEventListener("play", this.playEventHandler);
  }

  /**
   * レスポンシブ対応のイベントハンドラーを設定
   */
  private setupResponsiveHandlers(): void {
    if (!this.standaloneWrapper) {
      return;
    }

    // 全画面切り替えイベントのハンドリング
    this.fullscreenChangeHandler = (): void => {
      this.handleFullscreenChange();
    };

    document.addEventListener(
      "fullscreenchange",
      this.fullscreenChangeHandler,
    );
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

    // リサイズ監視
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });

    if (this.videoContainer) {
      this.resizeObserver.observe(this.videoContainer);
    }
    if (this.standaloneWrapper) {
      this.resizeObserver.observe(this.standaloneWrapper);
    }
  }

  /**
   * 全画面切り替え時の処理
   */
  private handleFullscreenChange(): void {
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element })
        .webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element })
        .mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element })
        .msFullscreenElement
    );

    window.logger.info(
      `全画面モード: ${isFullscreen ? "有効" : "無効"}`,
    );

    // 全画面から戻った時にレイアウトを再調整
    if (!isFullscreen) {
      this.adjustLayout();
    }
  }

  /**
   * リサイズ時の処理
   */
  private handleResize(): void {
    // デバウンス処理のため、requestAnimationFrameを使用
    requestAnimationFrame(() => {
      this.adjustLayout();
      
      // コメントレンダラーのハードリセットでアーティファクトを除去
      if (this.enableComments && this.commentSystem) {
        try {
          this.commentSystem.hardReset();
        } catch (error) {
          window.logger.warn("コメントレンダラーのハードリセットに失敗しました", error);
        }
      }
    });
  }

  /**
   * レイアウトの調整
   */
  private adjustLayout(): void {
    if (!this.videoContainer || !this.standaloneWrapper) {
      return;
    }

    // コメントコンテナの高さをvideoコンテナに合わせる
    const commentContainer = this.standaloneWrapper.querySelector(
      ".comment-container",
    );
    if (commentContainer instanceof HTMLElement && this.videoContainer) {
      const videoHeight = this.videoContainer.offsetHeight;
      if (videoHeight > 0) {
        // CSSのmax-heightと組み合わせて適切な高さを設定
        commentContainer.style.maxHeight = `${videoHeight}px`;
      }
    }
  }

  /**
   * リソースのクリーンアップ（イベントリスナーの削除など）
   */
  private cleanup(): void {
    // グローバルマウス移動イベントリスナーの削除
    if (this.globalMouseMoveHandler) {
      document.removeEventListener("mousemove", this.globalMouseMoveHandler);
      this.globalMouseMoveHandler = null;
    }

    // タイマーのクリア
    this.clearInactivityTimer();

    // ResizeObserverのクリーンアップ
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 全画面イベントリスナーのクリーンアップ
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

    // 動画再再生イベントリスナーのクリーンアップ
    if (this.videoElement) {
      if (this.endedEventHandler) {
        this.videoElement.removeEventListener("ended", this.endedEventHandler);
        this.endedEventHandler = null;
      }
      if (this.playEventHandler) {
        this.videoElement.removeEventListener("play", this.playEventHandler);
        this.playEventHandler = null;
      }
    }
  }

  private setupGlobalInterface(): void {
    if (!window.NicoCache_nl) {
      window.NicoCache_nl = {
        watch: {
          getVideoID: () => "",
          apiData: {} as ApiData,
          addEventListener: () => {},
        },
        cacheUtil: {
          formatCacheInfo: async () => {
            await Promise.resolve();
            return false;
          },
        },
        // ccはwindow.commonHelperに移行し、MainVideoPlayerWidthHeightReturnerも不要になったため削除
        handleError: () => {},
      };
    }

    // deletedVideoPlayer インターフェースは watch ページ側で再定義されるためここでは設定しない
  }
}
