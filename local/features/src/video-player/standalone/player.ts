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
          this.videoContainer,
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
    });

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
      if (!this.playerControls.classList.contains("always-visible")) {
        this.playerControls.hide();
      }
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
