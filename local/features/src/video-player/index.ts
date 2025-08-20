import { UrlManager } from './core/url-manager.js';
import { CacheManager } from './core/cache-manager.js';
import { ToastManager } from './utils/toast.js';
import { applyStyles, waitForPlayer } from './utils/dom-utils.js';
import { PlayerControlsShadow } from './ui/player-controls.js';
import { CommentList } from './ui/comment-list.js';
import { CUSTOM_PLAYER_SHADOW_HTML, CUSTOM_PLAYER_SHADOW_STYLES } from './ui/templates.js';
import { WATCH_CONFIG } from './config/constants.js';
import { CommentSystem } from './core/comment-system.js';
import { FloatingDeletedPlayer } from './ui/floating-player.js';
import { ApiData } from '@/types/index.js';
import { HlsInstance } from '@/types/video-types.js';

// カスタムエレメントの明示的な登録確認
if (!customElements.get('player-controls-shadow')) {
  customElements.define('player-controls-shadow', PlayerControlsShadow);
}

if (!customElements.get('comment-list-shadow')) {
  customElements.define('comment-list-shadow', CommentList);
}

/**
 * シャドウDOM版カスタムプレイヤーのメインクラス
 * スタイル分離とコンポーネント化を実現するのじゃ
 */
export class NicoCachePlayer {
  private urlManager: UrlManager;
  private toastManager: ToastManager;
  private cacheManager: CacheManager | null = null;
  private playerControls: PlayerControlsShadow | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private commentSystem: CommentSystem | null = null;
  private observer: MutationObserver | null = null;
  private customPlayerContainer: HTMLElement | null = null;
  private videoContainer: HTMLElement | null = null;
  private floatingDeletedPlayer: FloatingDeletedPlayer | null = null;
  private hls: HlsInstance | null = null;

  constructor() {
    this.urlManager = new UrlManager();
    this.toastManager = new ToastManager();
    this.commentSystem = new CommentSystem();
    this.floatingDeletedPlayer = new FloatingDeletedPlayer();

    // HLS.jsライブラリを動的読み込み
    this.loadHLSLibrary();

    // ページ読み込み時やURL変更時のイベントハンドラを設定
    this.setupEventListeners();

    // グローバルオブジェクトに削除済み動画プレーヤーのインターフェースを追加
    this.setupGlobalInterface();
  }

  /**
   * HLS.jsライブラリの動的読み込み
   */
  private loadHLSLibrary(): void {
    // 既にHLS.jsが読み込まれているかチェック
    if (typeof Hls !== 'undefined') {
      return;
    }

    // HLS.jsスクリプトタグが既に存在するかチェック
    if (document.querySelector('script[src*="hls.js"]')) {
      return;
    }

    // HLS.jsを動的に読み込み
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    script.onload = () => {
      window.logger.info('HLS.jsライブラリの読み込みが完了したのじゃ！');
    };
    script.onerror = () => {
      window.logger.warn('HLS.jsライブラリの読み込みに失敗したのじゃ。ネイティブHLS再生を試行するのじゃ。');
    };
    document.head.appendChild(script);
  }

  /**
   * グローバルオブジェクトのセットアップ
   * 削除済み動画プレーヤーのインターフェースを提供するのじゃ
   */
  private setupGlobalInterface(): void {
    // NicoCache_nlオブジェクトが存在しない場合は作成
    if (!window.NicoCache_nl) {
      // 最小限の必要なプロパティで初期化
      window.NicoCache_nl = {
        watch: {
          getVideoID: () => '',
          apiData: {} as ApiData,
          addEventListener: () => {}
        },
        cacheUtil: {
          formatCacheInfo: async () => { await Promise.resolve(); return false; }
        },
        cc: {
          MainVideoPlayerWidthHeightReturner: async () => { await Promise.resolve(); return 0; }
        },
        handleError: () => {}
      };
    }

    // 削除済み動画プレーヤーのインターフェースを追加
    window.NicoCache_nl.deletedVideoPlayer = {
      /**
       * 削除済み動画を再生
       * @param videoIdOrUrl 動画IDまたはURL
       * @param title 動画タイトル（オプション）
       */
      play: (videoIdOrUrl: string, title?: string) => {
        if (this.floatingDeletedPlayer) {
          this.floatingDeletedPlayer.show(videoIdOrUrl, title);
          window.logger.info(`削除済み動画プレーヤーで再生開始: ${videoIdOrUrl}`);
        }
      },

      /**
       * 削除済み動画プレーヤーを非表示
       */
      hide: () => {
        if (this.floatingDeletedPlayer) {
          this.floatingDeletedPlayer.hide();
          window.logger.info('削除済み動画プレーヤーを非表示にしたのじゃ');
        }
      },

      /**
       * 使用方法の説明
       */
      help: () => {
        window.logger.info(`
削除済み動画プレーヤーの使用方法なのじゃ：

1. 基本的な使用方法:
   window.NicoCache_nl.deletedVideoPlayer.play("動画IDまたはURL", "タイトル（オプション）");

2. 例:
   // 動画IDで再生
   window.NicoCache_nl.deletedVideoPlayer.play("sm12345678", "削除された動画");
   
   // URLで再生（HLS）
   window.NicoCache_nl.deletedVideoPlayer.play("https://example.com/video.m3u8", "HLS動画");
   
   // URLで再生（MP4）
   window.NicoCache_nl.deletedVideoPlayer.play("https://example.com/video.mp4", "MP4動画");

3. プレーヤーを非表示:
   window.NicoCache_nl.deletedVideoPlayer.hide();

4. ヘルプ表示:
   window.NicoCache_nl.deletedVideoPlayer.help();

特徴：
- 文字列に"hls"または".m3u8"が含まれる場合はHLS.jsを使用
- それ以外は通常のHTML5ビデオで再生
- ドラッガブル半透明ガラス効果のおしゃれプレーヤー
- 削除済み動画用なのでコメント機能は無効
        `);
      }
    };

    window.logger.info('削除済み動画プレーヤーのグローバルインターフェースを設定したのじゃ！');
    window.logger.info('使用方法: window.NicoCache_nl.deletedVideoPlayer.help()');
  }

  /**
   * イベントリスナーのセットアップ
   */
  private setupEventListeners(): void {
    // ページ読み込み完了時
    window.addEventListener('load', () => {
      if (window.NicoCache_nl && window.NicoCache_nl.watch) {
        window.NicoCache_nl.watch.addEventListener('initialized', () => {
          void this.handleVideoChange();
          this.setupUrlChangeListener();
        });
      }

      // history APIのオーバーライド
      this.overrideHistoryMethods();
    });
  }

  /**
   * History APIをオーバーライドして動画変更を検知
   */
  private overrideHistoryMethods(): void {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      void this.handleVideoChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      void this.handleVideoChange();
    };
  }

  /**
   * URL変更の監視
   */
  private setupUrlChangeListener(): void {
    let lastUrl = location.href;

    // 既存のobserverがあれば切断
    if (this.observer) {
      this.observer.disconnect();
    }

    // URL変更を検知する
    this.observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl && WATCH_CONFIG.URL_PATTERN.test(currentUrl)) {
        lastUrl = currentUrl;
        // 動画情報の読み込みを待つ
        setTimeout(() => { void this.handleVideoChange(); }, WATCH_CONFIG.CHECK_INTERVAL_MS);
      }
    });

    this.observer.observe(document.querySelector('body') as HTMLElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    // HLS.jsインスタンスの破棄
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    // CacheManagerの停止
    if (this.cacheManager) {
      this.cacheManager.stopMonitoring();
      this.cacheManager = null;
    }

    // PlayerControlsの破棄（シャドウDOM版）
    if (this.playerControls && this.playerControls.parentElement) {
      this.playerControls.remove();
      this.playerControls = null;
    }

    // CommentSystemのクリーンアップ
    if (this.commentSystem) {
      this.commentSystem.cleanup();
    }

    // video要素の停止とクリーンアップ
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
      this.videoElement = null;
    }

    // カスタムプレイヤーのコンテナを削除
    if (this.customPlayerContainer) {
      this.customPlayerContainer.remove();
      this.customPlayerContainer = null;
    }

    // ビデオコンテナの参照をクリア
    this.videoContainer = null;

    // オリジナルプレイヤーを表示
    const originalPlayer = document.getElementsByTagName('video')[0];
    if (originalPlayer) {
      originalPlayer.style.display = '';
    }
  }

  /**
   * 動画変更時の処理
   */
  private async handleVideoChange(): Promise<void> {
    try {
      // 既存のリソースをクリーンアップ
      this.cleanup();

      // 動画IDを取得
      const videoId = this.getVideoId();
      if (!videoId) return;

      // 支払い情報と元のプレイヤーの状態をチェック
      const isPaymentRequired = this.isPaymentRequired();
      const hasOriginalSource = this.hasOriginalSource();

      // 無料動画または元のプレイヤーが正常なら処理をスキップ
      if (!isPaymentRequired || hasOriginalSource) {
        window.logger.info(
          isPaymentRequired 
            ? '元のプレイヤーが正常なので処理をスキップするのじゃ' 
            : '無料動画なので処理をスキップするのじゃ'
        );
        return;
      }

      // 有料動画で元のプレイヤーがないなら、カスタムプレイヤーで再生を試みる
      await this.playWithCustomSource(videoId);
    } catch (error) {
      window.logger.error('動画変更処理でエラーが発生したのじゃ:', error);
      this.toastManager.showError('動画の読み込みに失敗しました');
    }
  }

  /**
   * 現在の動画IDを取得
   */
  private getVideoId(): string | null {
    if (window.NicoCache_nl && window.NicoCache_nl.watch && typeof window.NicoCache_nl.watch.getVideoID === 'function') {
      return window.NicoCache_nl.watch.getVideoID();
    }
    return null;
  }

  /**
   * 有料動画かどうかを確認
   */
  private isPaymentRequired(): boolean {
    if (
      window.NicoCache_nl && 
      window.NicoCache_nl.watch && 
      window.NicoCache_nl.watch.apiData && 
      window.NicoCache_nl.watch.apiData.payment && 
      window.NicoCache_nl.watch.apiData.payment.video
    ) {
      return window.NicoCache_nl.watch.apiData.payment.video.watchableUserType !== 'all';
    }
    return false;
  }

  /**
   * 元のプレイヤーにソースがあるかを確認
   */
  private hasOriginalSource(): boolean {
    const originalPlayer = document.getElementsByTagName('video')[0];
    return originalPlayer ? !!originalPlayer.src : false;
  }

  /**
   * カスタムソースでの再生
   */
  private async playWithCustomSource(videoId: string): Promise<void> {
    try {
      const videoTitle = window.NicoCache_nl.watch.apiData.video.title;

      // トースト通知の表示
      this.toastManager.showInfo(
        'シャドウDOM版カスタムキャッシュプレイヤーを起動中...',
        videoTitle,
        videoId
      );

      // キャッシュから利用可能なURLを検索
      const url = await this.urlManager.findFirstAvailableUrl(videoId);
      if (!url) {
        this.toastManager.showError(
          '動画ソースが見つかりません',
          'HLSとMP4の動画ソースが見つかりませんでした'
        );
        throw new Error('動画ソースが見つかりません');
      }

      // 動画再生
      await this.playVideo(url, videoTitle);

      // コメントを読み込む
      await this.loadComments(videoId);
    } catch (error) {
      window.logger.error('カスタムソースでの再生に失敗したのじゃ:', error);
      throw error;
    }
  }

  /**
   * 動画の再生
   */
  private async playVideo(url: string, title: string): Promise<void> {
    try {
      // カスタムプレイヤーの設置
      await this.replaceWithCustomPlayer();

      // ビデオ要素の取得とソースの設定
      this.videoElement = document.getElementById('video-element') as HTMLVideoElement;
      if (!this.videoElement) {
        throw new Error('動画要素が見つかりません');
      }

      // HLS URLかどうかを判定して適切な再生方法を選択
      const isHLS = this.isHLSUrl(url);
      if (isHLS) {
        await this.loadHLSVideo(url);
      } else {
        this.videoElement.src = url;
      }

      // メタデータとバッファリング完了を待つ
      try {
        if (isHLS && this.hls) {
          // HLS.jsの場合はMANIFEST_PARSEDイベントを待つ
          await new Promise<void>((resolve, reject) => {
            if (!this.hls) { 
              reject(new Error('HLS instance not found'));
              return;
            }

            const onManifestParsed = () => {
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error('HLS manifest loading failed'));
            };

            const cleanup = () => {
              // HLS.jsのイベントリスナー削除はdestroyで行う
              // 個別のoff メソッドは型定義に含まれていない場合がある
            };

            this.hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
            this.hls.on(Hls.Events.ERROR, onError);
          });
        } else {
          // 通常の動画の場合はcanplayイベントを待つ
          await new Promise<void>((resolve, reject) => {
            const onCanPlay = () => {
              cleanup();
              resolve();
            };
            const onError = (_e: Event) => {
              cleanup();
              reject(new Error('video error'));
            };

            const cleanup = () => {
              this.videoElement?.removeEventListener('canplay', onCanPlay);
              this.videoElement?.removeEventListener('error', onError);
            };

            this.videoElement!.addEventListener('canplay', onCanPlay);
            this.videoElement!.addEventListener('error', onError);
          });
        }
      } catch (e) {
        window.logger.error('動画の読み込み待機に失敗したのじゃ:', e);
      }

      // キャッシュ管理の設定
      this.cacheManager = new CacheManager(this.videoElement, this.hls || undefined, url);
      this.cacheManager.startMonitoring();

      // マウスホバー時のコントロール表示処理を設定
      this.setupHoverControls();

      // 再生開始（Autoplay ポリシー回避のためミュート → 成功後に音量復元）
      const originalMuted = this.videoElement.muted;
      try {
        // 未操作状態ではミュートで再生を試みる
        if (!originalMuted) {
          this.videoElement.muted = true;
        }

        const playPromise = this.videoElement.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        // ユーザーが pause していなければ音声を戻す
        if (!originalMuted) {
          this.videoElement.muted = false;
        }
      } catch (playErr) {
        window.logger.warn('自動再生がブロックされた可能性があるのじゃ:', playErr);
        // 再生失敗時はコントロールを表示してユーザー操作を促す
        this.playerControls?.show();
      }

      // 成功通知
      this.toastManager.showSuccess(
        `${url} で再生します（シャドウDOM版）`,
        title
      );

      // 追加のエラーハンドラ
      this.videoElement.addEventListener('error', e => window.logger.error('[VIDEO-ERROR]', e));
    } catch (error) {
      window.logger.error('動画再生でエラーが発生したのじゃ:', error);
      this.toastManager.showError('動画の再生に失敗しました');
      throw error;
    }
  }

  /**
   * カスタムプレイヤーへの置き換え（シャドウDOM版）
   */
  private async replaceWithCustomPlayer(): Promise<void> {
    try {
      // オリジナルプレイヤーを待機
      const originalPlayer = await waitForPlayer();
      originalPlayer.style.display = 'none';

      // カスタムエレメントが登録されているか確認
      if (!customElements.get('player-controls-shadow')) {
        throw new Error('player-controls-shadowカスタムエレメントが登録されていません');
      }

      // カスタムプレイヤーの挿入
      const container = document.createElement('div');
      container.innerHTML = CUSTOM_PLAYER_SHADOW_HTML;
      this.customPlayerContainer = container.firstElementChild as HTMLElement;
      originalPlayer.parentNode?.insertBefore(this.customPlayerContainer, originalPlayer);

      // 基本スタイルの適用（シャドウDOM版用）
      applyStyles(CUSTOM_PLAYER_SHADOW_STYLES);

      // ビデオコンテナの参照を取得
      this.videoContainer = this.customPlayerContainer.querySelector('.video-container') as HTMLElement;

      // プレイヤーコントロール（シャドウDOM版）の設定
      const videoElement = document.getElementById('video-element') as HTMLVideoElement;
      this.playerControls = this.customPlayerContainer.querySelector('player-controls-shadow') as PlayerControlsShadow;
      
      if (this.playerControls) {
        // カスタムエレメントが完全に初期化されるまで短時間待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // メソッドの存在確認してから実行
        if (typeof this.playerControls.setVideoElement === 'function') {
          this.playerControls.setVideoElement(videoElement);
        } else {
          window.logger.warn('setVideoElementメソッドが利用できないのじゃ、直接初期化を試みるのじゃ');
          // フォールバック：カスタムエレメントが完全に初期化されるまで追加で待機
          await new Promise(resolve => setTimeout(resolve, 200));
          if (typeof this.playerControls.setVideoElement === 'function') {
            this.playerControls.setVideoElement(videoElement);
          }
        }
      } else {
        window.logger.warn('player-controls-shadow要素が見つからないのじゃ');
      }

      // コメントシステムの初期化
      if (this.commentSystem) {
        await this.commentSystem.initialize(videoElement);
        
        // コメントシステムをプレイヤーコントロールに設定
        if (this.playerControls && typeof this.playerControls.setCommentSystem === 'function') {
          this.playerControls.setCommentSystem(this.commentSystem);
        }
      }

      window.logger.info('シャドウDOM版カスタムプレイヤーの設置が完了したのじゃ！');
    } catch (error) {
      window.logger.error('プレイヤーの置き換えに失敗したのじゃ:', error);
      throw error;
    }
  }

  /**
   * マウスホバー時のコントロール表示処理を設定
   */
  private setupHoverControls(): void {
    if (!this.videoContainer || !this.playerControls) return;

    let hoverTimer: number | null = null;

    // マウスがビデオコンテナに入った時
    this.videoContainer.addEventListener('mouseenter', () => {
      if (this.playerControls) {
        this.playerControls.show();
      }
    });

    // マウスがビデオコンテナ上を移動している時
    this.videoContainer.addEventListener('mousemove', () => {
      if (this.playerControls) {
        this.playerControls.show();
      }

      // 前のタイマーをクリア
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }

      // 新しいタイマーを設定（2秒後に非表示）
      hoverTimer = window.setTimeout(() => {
        // 常時表示モードでない場合のみ隠す
        if (this.playerControls && !this.playerControls.classList.contains('always-visible')) {
          this.playerControls.hide();
        }
      }, 2000);
    });

    // マウスがビデオコンテナから出た時
    this.videoContainer.addEventListener('mouseleave', () => {
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }

      // 常時表示モードでない場合のみ隠す
      if (this.playerControls && !this.playerControls.classList.contains('always-visible')) {
        this.playerControls.hide();
      }
    });

    // ビデオコンテナクリック時の再生・一時停止切り替え
    this.videoContainer.addEventListener('click', (e: MouseEvent) => {
      // プレイヤーコントロール部分のクリックは無視
      const target = e.target as HTMLElement;
      if (target.closest('player-controls-shadow')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (this.videoElement) {
        if (this.videoElement.paused) {
          this.videoElement.play().catch(err => window.logger.error('再生開始に失敗したのじゃ:', err));
        } else {
          this.videoElement.pause();
        }
      }
    });
  }

  /**
   * HLS URLかどうかを判定
   */
  private isHLSUrl(url: string): boolean {
    return url.toLowerCase().includes('hls') || 
           url.includes('.m3u8') ||
           url.includes('master.m3u8') ||
           url.includes('playlist.m3u8');
  }

  /**
   * HLS動画の読み込み
   */
  private async loadHLSVideo(url: string): Promise<void> {
    await Promise.resolve();
    if (!this.videoElement) return;

    window.logger.info('HLS動画の読み込みを開始するのじゃ:', url);

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      // HLS.jsが利用可能な場合
      this.hls = new Hls();

      this.hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
        const [, data] = args;
        window.logger.error('HLS Error:', data);
        this.toastManager.showError('HLS再生でエラーが発生しました');
      });

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        window.logger.info('HLSマニフェスト読み込み完了！');
        this.toastManager.showSuccess('HLS動画読み込み完了', 'HLS.jsを使用して再生します');
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);

      // CacheManagerにHLS情報を更新
      if (this.cacheManager) {
        this.cacheManager.updateHlsInstance(this.hls, url);
      }
    } else {
      // HLS.jsが利用できない場合はネイティブ再生を試行
      window.logger.info('HLS.jsが利用できないため、ネイティブHLS再生を試行するのじゃ');
      this.videoElement.src = url;
      this.toastManager.showInfo('ネイティブHLS再生を試行中', 'ブラウザの対応に依存します');
    }
  }

  /**
   * コメントの読み込み
   */
  private async loadComments(videoId: string): Promise<void> {
    try {
      if (!this.commentSystem) return;
      
      await this.commentSystem.loadComments(videoId);
      window.logger.info('コメントの読み込みが完了したのじゃ！');
    } catch (error) {
      window.logger.error('コメント読み込みに失敗したのじゃ:', error);
      this.toastManager.showWarning('コメント読み込みに失敗しました', '動画の再生は継続します');
    }
  }
}

// プレイヤーインスタンスの作成と実行
const shadowPlayer = new NicoCachePlayer();

// ESLintの未使用変数警告を回避するため、shadowPlayerを明示的に使用することを示す
void shadowPlayer; 