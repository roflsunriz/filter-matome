import { UrlManager } from '../core/url-manager.js';
import { CacheManager } from '../core/cache-manager.js';
import { ToastManager } from '../utils/toast.js';
import { applyStyles } from '../utils/dom-utils.js';
import { PlayerControlsShadow } from '../ui/player-controls.js';
import { CommentList } from '../ui/comment-list.js';
import { CommentSystem } from '../core/comment-system.js';
import { CUSTOM_PLAYER_SHADOW_HTML, CUSTOM_PLAYER_SHADOW_STYLES } from '../ui/templates.js';
import { FloatingDeletedPlayer } from '../ui/floating-player.js';
import type { ApiData } from '@/types/index.js';
import type { HlsInstance } from '@/types/video-types.js';

const ensureCustomElements = (): void => {
  if (!customElements.get('player-controls-shadow')) {
    customElements.define('player-controls-shadow', PlayerControlsShadow);
  }

  if (!customElements.get('comment-list-shadow')) {
    customElements.define('comment-list-shadow', CommentList);
  }
};

let playerStylesInjected = false;

export interface StandalonePlayerOptions {
  mount: HTMLElement;
}

export class StandalonePlayer {
  private readonly mount: HTMLElement;
  private readonly urlManager = new UrlManager();
  private readonly toastManager = new ToastManager();
  private readonly commentSystem = new CommentSystem();
  private readonly floatingDeletedPlayer = new FloatingDeletedPlayer();

  private cacheManager: CacheManager | null = null;
  private playerControls: PlayerControlsShadow | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private videoContainer: HTMLElement | null = null;
  private customPlayerContainer: HTMLElement | null = null;
  private hls: HlsInstance | null = null;

  constructor(options: StandalonePlayerOptions) {
    this.mount = options.mount;
    ensureCustomElements();
    this.loadHLSLibrary();
    this.setupGlobalInterface();
  }

  public async initialize(videoId: string, apiData: ApiData): Promise<void> {
    await this.preparePlayerShell();
    await this.playWithCustomSource(videoId, apiData.video.title);
    await this.loadComments(videoId);
  }

  private async preparePlayerShell(): Promise<void> {
    this.mount.innerHTML = '';

    if (!playerStylesInjected) {
      applyStyles(CUSTOM_PLAYER_SHADOW_STYLES);
      playerStylesInjected = true;
    }

    const container = document.createElement('div');
    container.innerHTML = CUSTOM_PLAYER_SHADOW_HTML;
    this.customPlayerContainer = container.firstElementChild as HTMLElement;
    this.mount.append(this.customPlayerContainer);

    this.videoContainer = this.customPlayerContainer.querySelector('.video-container') as HTMLElement;
    this.videoElement = this.customPlayerContainer.querySelector('#video-element') as HTMLVideoElement;
    this.playerControls = this.customPlayerContainer.querySelector('player-controls-shadow') as PlayerControlsShadow;

    if (!this.videoElement) {
      throw new Error('動画要素が生成できませんでした');
    }

    try {
      await this.commentSystem.initialize(this.videoElement);
    } catch (error) {
      window.logger.error('コメントシステムの初期化に失敗しました', error);
    }

    if (this.playerControls) {
      const initControls = (): void => {
        if (typeof this.playerControls?.setVideoElement === 'function') {
          this.playerControls.setVideoElement(this.videoElement!);
        }
        if (typeof this.playerControls?.setCommentSystem === 'function') {
          this.playerControls.setCommentSystem(this.commentSystem);
        }
      };

      if (typeof this.playerControls.setVideoElement === 'function') {
        initControls();
      } else {
        setTimeout(initControls, 200);
      }
    }

    this.setupHoverControls();
  }

  private async playWithCustomSource(videoId: string, title: string): Promise<void> {
    this.cleanupPlayback();

    this.toastManager.showInfo('キャッシュから動画ソースを検索中...', title, videoId);

    const url = await this.urlManager.findFirstAvailableUrl(videoId);
    if (!url) {
      this.toastManager.showError('動画ソースが見つかりません', 'キャッシュまたはローカルソースを確認してください');
      throw new Error('動画ソースが見つかりません');
    }

    await this.playVideo(url, title);
  }

  private async playVideo(url: string, title: string): Promise<void> {
    if (!this.videoElement) {
      throw new Error('動画要素が初期化されていません');
    }

    const isHls = this.isHLSUrl(url);
    if (isHls) {
      this.loadHLSVideo(url);
    } else {
      this.videoElement.src = url;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = (): void => {
          cleanup();
          resolve();
        };
        const onError = (): void => {
          cleanup();
          reject(new Error('動画読み込みエラー'));
        };
        const cleanup = (): void => {
          this.videoElement?.removeEventListener('canplay', onCanPlay);
          this.videoElement?.removeEventListener('error', onError);
        };
        this.videoElement?.addEventListener('canplay', onCanPlay);
        this.videoElement?.addEventListener('error', onError);
      });
    } catch (error) {
      window.logger.warn('動画メタデータ取得に失敗しました', error);
    }

    this.cacheManager = new CacheManager(this.videoElement, this.hls || undefined, url);
    this.cacheManager.startMonitoring();

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
      window.logger.warn('自動再生がブロックされた可能性があります', error);
      this.playerControls?.show();
    }

    // 再生開始時に一度コントロールを表示する
    this.playerControls?.show();

    this.videoElement.addEventListener('error', evt => {
      window.logger.error('[VIDEO-ERROR]', evt);
    });

    this.toastManager.showSuccess(url + ' で再生します', title);
  }

  private setupHoverControls(): void {
    if (!this.videoContainer || !this.playerControls) {
      return;
    }

    let hoverTimer: number | null = null;

    this.videoContainer.addEventListener('mouseenter', () => {
      this.playerControls?.show();
    });

    this.videoContainer.addEventListener('mousemove', () => {
      this.playerControls?.show();
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }
      hoverTimer = window.setTimeout(() => {
        if (this.playerControls && !this.playerControls.classList.contains('always-visible')) {
          this.playerControls.hide();
        }
      }, 2000);
    });

    this.videoContainer.addEventListener('mouseleave', () => {
      if (!this.playerControls) {
        return;
      }
      if (!this.playerControls.classList.contains('always-visible')) {
        this.playerControls.hide();
      }
    });

    this.videoContainer.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('player-controls-shadow')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!this.videoElement) {
        return;
      }
      if (this.videoElement.paused) {
        void this.videoElement.play().catch(err => window.logger.error('再生開始に失敗しました', err));
      } else {
        this.videoElement.pause();
      }
    });
  }

  private isHLSUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('hls') || lower.includes('.m3u8') || url.includes('master.m3u8') || url.includes('playlist.m3u8');
  }

  private loadHLSVideo(url: string): void {
    if (!this.videoElement) {
      return;
    }

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.on(Hls.Events.ERROR, (_event: unknown, data: unknown) => {
        window.logger.error('HLS Error', data);
        this.toastManager.showError('HLS再生でエラーが発生しました');
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
    } else {
      this.videoElement.src = url;
      this.toastManager.showInfo('ネイティブHLS再生を試行します');
    }
  }

  private async loadComments(videoId: string): Promise<void> {
    try {
      await this.commentSystem.loadComments(videoId);
    } catch (error) {
      window.logger.error('コメント読み込みに失敗しました', error);
      this.toastManager.showWarning('コメント読み込みに失敗しました', '動画の再生は継続します');
    }
  }

  private loadHLSLibrary(): void {
    if (typeof Hls !== 'undefined') {
      return;
    }
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    script.onload = () => {
      window.logger.info('HLS.jsライブラリの読み込みが完了しました');
    };
    script.onerror = () => {
      window.logger.warn('HLS.jsライブラリの読み込みに失敗しました');
    };
    document.head.appendChild(script);
  }

  private cleanupPlayback(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.cacheManager) {
      this.cacheManager.stopMonitoring();
      this.cacheManager = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
    }
  }

  private setupGlobalInterface(): void {
    if (!window.NicoCache_nl) {
      window.NicoCache_nl = {
        watch: {
          getVideoID: () => '',
          apiData: {} as ApiData,
          addEventListener: () => {}
        },
        cacheUtil: {
          formatCacheInfo: async () => {
            await Promise.resolve();
            return false;
          }
        },
        cc: {
          MainVideoPlayerWidthHeightReturner: async () => {
            await Promise.resolve();
            return 0;
          }
        },
        handleError: () => {}
      };
    }

    window.NicoCache_nl.deletedVideoPlayer = {
      play: (videoIdOrUrl: string, title?: string): void => {
        this.floatingDeletedPlayer.show(videoIdOrUrl, title);
      },
      hide: (): void => {
        this.floatingDeletedPlayer.hide();
      },
      help: (): void => {
        window.logger.info('window.NicoCache_nl.deletedVideoPlayer.play("sm9"); で再生できます');
      }
    };
  }
}
