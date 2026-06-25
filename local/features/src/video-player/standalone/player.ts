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
let missingCacheDialogStylesInjected = false;
const SOURCE_PROBE_TIMEOUT_MS = 5000;
const VIDEO_READY_TIMEOUT_MS = 8000;
const MISSING_CACHE_DIALOG_STYLES = `
.vp-missing-cache-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
}

.vp-missing-cache-dialog {
  width: min(520px, 100%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: #1f2329;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  color: #f4f7fb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.vp-missing-cache-dialog__header {
  padding: 18px 20px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.vp-missing-cache-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.vp-missing-cache-dialog__body {
  display: grid;
  gap: 10px;
  padding: 16px 20px 18px;
  font-size: 14px;
  line-height: 1.7;
}

.vp-missing-cache-dialog__body p {
  margin: 0;
}

.vp-missing-cache-dialog__meta {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #dce6f2;
  overflow-wrap: anywhere;
}

.vp-missing-cache-dialog__actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 18px;
}

.vp-missing-cache-dialog__button {
  min-width: 88px;
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  background: #4f9cff;
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.vp-missing-cache-dialog__button:hover,
.vp-missing-cache-dialog__button:focus-visible {
  background: #72b0ff;
  outline: 2px solid rgba(255, 255, 255, 0.75);
  outline-offset: 2px;
}
`;

interface VideoSourceProbe {
  url: string;
  ready: Promise<string>;
  cleanup: () => void;
}

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

  // レスポンシブ対応用
  private resizeObserver: ResizeObserver | null = null;
  private fullscreenChangeHandler: (() => void) | null = null;
  private fullscreenLayoutTimers: number[] = [];
  private standaloneWrapper: HTMLElement | null = null;

  // 動画終了・再再生検出用
  private hasEnded = false;
  private endedEventHandler: (() => void) | null = null;
  private playEventHandler: (() => void) | null = null;
  private videoMetadataHandler: (() => void) | null = null;

  // 外部から登録される動画終了時コールバック
  private externalEndedCallback: (() => void) | null = null;

  /**
   * 動画再生終了時に呼び出される外部コールバックを登録する
   * シリーズ連続再生などの外部ロジックで使用
   */
  public onVideoEnded(callback: () => void): void {
    this.externalEndedCallback = callback;
  }

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

    const playback = this.playWithCustomSource(videoId, displayTitle);

    // コメント取得は再生可否に影響させない。コメントサーバが利用不可・低速でも動画再生を優先する。
    if (this.enableComments) {
      void this.loadComments(videoId);
    }

    await playback;
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

    this.setupVideoAspectRatioHandler();

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

    const url = await this.playFirstAvailableSource(videoId, title);
    if (!url) {
      this.showMissingCacheDialog(videoId, title);
      this.toastManager.showError(
        "動画ソースが見つかりません",
        "キャッシュまたはローカルソースを確認してください",
      );
      throw new Error("動画ソースが見つかりません");
    }
  }

  private showMissingCacheDialog(videoId: string, title: string): void {
    this.ensureMissingCacheDialogStyles();
    document.querySelector(".vp-missing-cache-backdrop")?.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "vp-missing-cache-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "vp-missing-cache-title");

    const dialog = document.createElement("section");
    dialog.className = "vp-missing-cache-dialog";

    const header = document.createElement("header");
    header.className = "vp-missing-cache-dialog__header";

    const heading = document.createElement("h2");
    heading.id = "vp-missing-cache-title";
    heading.className = "vp-missing-cache-dialog__title";
    heading.textContent = "キャッシュデータが存在しません";
    header.appendChild(heading);

    const body = document.createElement("div");
    body.className = "vp-missing-cache-dialog__body";

    const message = document.createElement("p");
    message.textContent =
      "すべての再生候補を確認しましたが、video-player で再生できるローカルキャッシュデータが見つかりませんでした。";

    const guidance = document.createElement("p");
    guidance.textContent =
      "NicoCache_nl に動画キャッシュが作成されているか確認してください。";

    const meta = document.createElement("p");
    meta.className = "vp-missing-cache-dialog__meta";
    meta.textContent = `対象: ${title} (${videoId})`;

    body.append(message, guidance, meta);

    const actions = document.createElement("footer");
    actions.className = "vp-missing-cache-dialog__actions";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "vp-missing-cache-dialog__button";
    closeButton.textContent = "OK";
    actions.appendChild(closeButton);

    dialog.append(header, body, actions);
    backdrop.appendChild(dialog);

    const closeDialog = (): void => {
      document.removeEventListener("keydown", handleKeydown);
      backdrop.remove();
    };

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    closeButton.addEventListener("click", closeDialog);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closeDialog();
      }
    });
    document.addEventListener("keydown", handleKeydown);

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => closeButton.focus());
  }

  private ensureMissingCacheDialogStyles(): void {
    if (missingCacheDialogStylesInjected) {
      return;
    }
    applyStyles(MISSING_CACHE_DIALOG_STYLES);
    missingCacheDialogStylesInjected = true;
  }

  private async playFirstAvailableSource(
    videoId: string,
    title: string,
  ): Promise<string | null> {
    const candidates = await this.urlManager.getCandidateUrls(videoId);
    const probes = candidates.map((url) => this.createVideoSourceProbe(url));

    try {
      return await this.playFirstReadyFallback(probes, title);
    } finally {
      probes.forEach((probe) => probe.cleanup());
    }
  }

  private createVideoSourceProbe(url: string): VideoSourceProbe {
    const probeVideo = document.createElement("video");
    probeVideo.preload = "metadata";
    probeVideo.muted = true;
    probeVideo.playsInline = true;
    probeVideo.crossOrigin = "anonymous";
    probeVideo.style.position = "fixed";
    probeVideo.style.width = "1px";
    probeVideo.style.height = "1px";
    probeVideo.style.opacity = "0";
    probeVideo.style.pointerEvents = "none";
    probeVideo.style.left = "-10px";
    probeVideo.style.top = "-10px";

    let active = true;
    let hls: HlsInstance | null = null;
    let timeoutId: number | null = null;
    let settled = false;
    let resolveReady: (readyUrl: string) => void = () => {};
    let rejectReady: (error: Error) => void = () => {};

    const cleanup = (): void => {
      active = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      probeVideo.removeEventListener("loadedmetadata", handleReady);
      probeVideo.removeEventListener("canplay", handleReady);
      probeVideo.removeEventListener("error", handleError);
      hls?.destroy();
      hls = null;
      probeVideo.pause();
      probeVideo.removeAttribute("src");
      probeVideo.load();
      probeVideo.remove();
    };

    const settleReady = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolveReady(url);
    };

    const settleError = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      rejectReady(error);
    };

    function handleReady(): void {
      settleReady();
    }

    function handleError(): void {
      const mediaError = probeVideo.error;
      settleError(
        new Error(
          mediaError?.message ||
            `動画ソースの実再生プローブに失敗しました: code=${mediaError?.code ?? "unknown"}`,
        ),
      );
    }

    const ready = new Promise<string>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    timeoutId = window.setTimeout(() => {
      settleError(
        new Error(`動画ソースの実再生プローブがタイムアウトしました: ${url}`),
      );
    }, SOURCE_PROBE_TIMEOUT_MS);

    probeVideo.addEventListener("loadedmetadata", handleReady, { once: true });
    probeVideo.addEventListener("canplay", handleReady, { once: true });
    probeVideo.addEventListener("error", handleError, { once: true });
    document.body.appendChild(probeVideo);

    void this.attachProbeSource(probeVideo, url, settleError)
      .then((probeHls) => {
        if (!active) {
          probeHls?.destroy();
          return;
        }
        hls = probeHls;
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        settleError(
          error instanceof Error
            ? error
            : new Error(`動画ソースの実再生プローブに失敗しました: ${String(error)}`),
        );
      });

    return { url, ready, cleanup };
  }

  private async attachProbeSource(
    probeVideo: HTMLVideoElement,
    url: string,
    onError: (error: Error) => void,
  ): Promise<HlsInstance | null> {
    if (!this.isHLSUrl(url)) {
      probeVideo.src = url;
      probeVideo.load();
      return null;
    }

    const HlsConstructor = await this.ensureHlsLibrary();
    if (HlsConstructor && HlsConstructor.isSupported()) {
      const hls = new HlsConstructor();
      hls.on(HlsConstructor.Events.ERROR, (_event: unknown, data: unknown) => {
        window.logger.warn("HLS probe error", data);
        onError(new Error(`HLS実再生プローブに失敗しました: ${url}`));
      });
      hls.loadSource(url);
      hls.attachMedia(probeVideo);
      return hls;
    }

    probeVideo.src = url;
    probeVideo.load();
    return null;
  }

  private async waitForFirstReadyProbe(
    probes: VideoSourceProbe[],
  ): Promise<string | null> {
    if (probes.length === 0) {
      return null;
    }

    return new Promise((resolve) => {
      let pendingCount = probes.length;
      let resolved = false;

      probes.forEach((probe) => {
        void probe.ready
          .then((url) => {
            if (resolved) {
              return;
            }
            resolved = true;
            resolve(url);
          })
          .catch((error) => {
            window.logger.warn(
              `動画ソースの実再生プローブに失敗しました: ${probe.url}`,
              error,
            );
          })
          .finally(() => {
            pendingCount--;
            if (!resolved && pendingCount === 0) {
              resolve(null);
            }
          });
      });
    });
  }

  private async playFirstReadyFallback(
    probes: VideoSourceProbe[],
    title: string,
  ): Promise<string | null> {
    while (probes.length > 0) {
      const url = await this.waitForFirstReadyProbe(probes);
      if (!url) {
        return null;
      }

      const readyIndex = probes.findIndex((probe) => probe.url === url);
      if (readyIndex >= 0) {
        const [readyProbe] = probes.splice(readyIndex, 1);
        readyProbe.cleanup();
      }

      try {
        await this.playVideo(url, title);
        return url;
      } catch (error) {
        window.logger.warn(
          `動画ソースの再生準備に失敗しました。次候補を試します: ${url}`,
          error,
        );
        this.cleanupPlayback();
      }
    }

    return null;
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
    await this.waitForVideoReady();
    this.updateVideoAspectRatio();

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

    // マウスがビデオ領域に入ったときにコントロールを表示する
    // 非表示タイマーの制御は PlayerControlsShadow.setupHoverEvents() に一元化
    this.videoContainer.addEventListener("mouseenter", () => {
      this.playerControls?.show();
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

  private async waitForVideoReady(): Promise<void> {
    const video = this.videoElement;
    if (!video) {
      throw new Error("動画要素が初期化されていません");
    }

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("動画メタデータの読み込みがタイムアウトしました"));
      }, VIDEO_READY_TIMEOUT_MS);

      const cleanup = (): void => {
        window.clearTimeout(timeoutId);
        video.removeEventListener("loadedmetadata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleError);
      };

      const handleReady = (): void => {
        cleanup();
        resolve();
      };

      const handleError = (): void => {
        cleanup();
        const mediaError = video.error;
        reject(
          new Error(
            mediaError?.message ||
              `動画ソースの読み込みに失敗しました: code=${mediaError?.code ?? "unknown"}`,
          ),
        );
      };

      video.addEventListener("loadedmetadata", handleReady, { once: true });
      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.load();
    });
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

  private setupVideoAspectRatioHandler(): void {
    if (!this.videoElement) {
      return;
    }

    this.videoMetadataHandler = (): void => {
      this.updateVideoAspectRatio();
    };
    this.videoElement.addEventListener(
      "loadedmetadata",
      this.videoMetadataHandler,
    );
  }

  private updateVideoAspectRatio(): void {
    if (!this.videoElement || !this.customPlayerContainer) {
      return;
    }

    const { videoWidth, videoHeight } = this.videoElement;
    if (videoWidth <= 0 || videoHeight <= 0) {
      return;
    }

    this.customPlayerContainer.style.setProperty(
      "--video-aspect-ratio",
      `${videoWidth} / ${videoHeight}`,
    );
    this.updateFullscreenVideoRect(videoWidth, videoHeight);

    this.adjustLayout();
    this.commentSystem.resize();
  }

  private updateFullscreenVideoRect(
    videoWidth: number,
    videoHeight: number,
  ): void {
    if (!this.customPlayerContainer) {
      return;
    }

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    const videoAspect = videoWidth / videoHeight;
    const viewportAspect = viewportWidth / viewportHeight;
    const rect =
      videoAspect > viewportAspect
        ? {
            width: viewportWidth,
            height: viewportWidth / videoAspect,
            left: 0,
            top: (viewportHeight - viewportWidth / videoAspect) / 2,
          }
        : {
            width: viewportHeight * videoAspect,
            height: viewportHeight,
            left: (viewportWidth - viewportHeight * videoAspect) / 2,
            top: 0,
          };

    this.customPlayerContainer.style.setProperty(
      "--fullscreen-video-left",
      `${rect.left.toFixed(3)}px`,
    );
    this.customPlayerContainer.style.setProperty(
      "--fullscreen-video-top",
      `${rect.top.toFixed(3)}px`,
    );
    this.customPlayerContainer.style.setProperty(
      "--fullscreen-video-width",
      `${rect.width.toFixed(3)}px`,
    );
    this.customPlayerContainer.style.setProperty(
      "--fullscreen-video-height",
      `${rect.height.toFixed(3)}px`,
    );
  }

  private refreshFullscreenLayout(): void {
    this.updateVideoAspectRatio();
    this.commentSystem.resize();
  }

  private clearFullscreenLayoutTimers(): void {
    this.fullscreenLayoutTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.fullscreenLayoutTimers = [];
  }

  private scheduleFullscreenLayoutRefresh(): void {
    this.clearFullscreenLayoutTimers();
    this.refreshFullscreenLayout();

    requestAnimationFrame(() => {
      this.refreshFullscreenLayout();
      requestAnimationFrame(() => {
        this.refreshFullscreenLayout();
      });
    });

    [100, 300, 700].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        this.refreshFullscreenLayout();
        this.fullscreenLayoutTimers = this.fullscreenLayoutTimers.filter(
          (id) => id !== timerId,
        );
      }, delay);
      this.fullscreenLayoutTimers.push(timerId);
    });
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
      this.externalEndedCallback?.();
    };

    // play イベントハンドラー

    this.playEventHandler = (): void => {

      if (this.hasEnded && this.enableComments) {

        window.logger.info(

          "再生終了後の再生再開時は comment-overlay の自動ハードリセット機構に委譲します",

        );

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

    this.scheduleFullscreenLayoutRefresh();

    // 全画面から戻った時にレイアウトを再調整
    if (!isFullscreen) {
      this.adjustLayout();
    }
  }

  /**
   * リサイズ時の処理
   */
  private handleResize(): void {
    // デバウンス相当のため、requestAnimationFrameを使用
    requestAnimationFrame(() => {
      this.updateVideoAspectRatio();
      this.adjustLayout();
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
    this.clearFullscreenLayoutTimers();

    // 動画再再生イベントリスナーのクリーンアップ
    if (this.videoElement) {
      if (this.videoMetadataHandler) {
        this.videoElement.removeEventListener(
          "loadedmetadata",
          this.videoMetadataHandler,
        );
        this.videoMetadataHandler = null;
      }
      if (this.endedEventHandler) {
        this.videoElement.removeEventListener("ended", this.endedEventHandler);
        this.endedEventHandler = null;
      }
      if (this.playEventHandler) {
        this.videoElement.removeEventListener("play", this.playEventHandler);
        this.playEventHandler = null;
      }
    }

    // 外部コールバックのクリーンアップ
    this.externalEndedCallback = null;
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
