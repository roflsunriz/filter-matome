import { FLOATING_DELETED_PLAYER_HTML, FLOATING_DELETED_PLAYER_STYLES } from './templates.js';
import { createMaterialIcon } from '../../common/material-icons.js';
import { applyStyles } from '../utils/dom-utils.js';
import '../../types/video-types.js';
import { HlsInstance, CacheInfoResponse, CacheUrlResult } from '@/types/video-types.js';

/**
 * フローティング削除済み動画プレーヤークラス
 * ドラッガブル半透明ガラス効果のおしゃれプレーヤー
 */
export class FloatingDeletedPlayer {
  private container: HTMLElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private hls: HlsInstance | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isMinimized = false;
  private originalVideoSize: { width: number; height: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.setupStyles();
    this.loadHLSLibrary();
  }

  /**
   * スタイルの適用
   */
  private setupStyles(): void {
    applyStyles(FLOATING_DELETED_PLAYER_STYLES);
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
      window.logger.info('HLS.jsライブラリの読み込みが完了しました！');
    };
    script.onerror = () => {
      window.logger.warn('HLS.jsライブラリの読み込みに失敗しました。ネイティブHLS再生を試行します。');
    };
    document.head.appendChild(script);
  }

  /**
   * プレーヤーを表示
   */
  public show(videoIdOrUrl: string, title?: string): void {
    // 既存のプレーヤーがあれば削除
    this.hide();

    // プレーヤーを作成
    this.createPlayer(videoIdOrUrl, title);
  }

  /**
   * プレーヤーを非表示
   */
  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.videoElement = null;
    this.originalVideoSize = null;
  }

  /**
   * プレーヤーの作成
   */
  private createPlayer(videoIdOrUrl: string, title?: string): void {
    // HTMLを作成
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = FLOATING_DELETED_PLAYER_HTML;
    this.container = tempDiv.firstElementChild as HTMLElement;

    // bodyに追加
    document.body.appendChild(this.container);

    // 動画情報を表示
    const videoIdDisplay = this.container.querySelector('.video-id-display') as HTMLElement;
    if (videoIdDisplay) {
      videoIdDisplay.textContent = title 
        ? `${videoIdOrUrl} (${title})`
        : videoIdOrUrl;
    }

    // video要素を取得
    this.videoElement = this.container.querySelector('#floating-video-element') as HTMLVideoElement;

    // イベントリスナーを設定
    this.setupEventListeners();

    // アイコンの初期化
    this.initializeIcons();

    // 動画を読み込み（未処理Promise防止）
    void this.loadVideo(videoIdOrUrl);
  }

  /**
   * アイコンの初期化
   */
  private initializeIcons(): void {
    if (!this.container) return;

    const iconElements = this.container.querySelectorAll('[data-material-icon]');
    iconElements.forEach((element) => {
      const iconName = element.getAttribute('data-material-icon');
      if (iconName) {
        element.innerHTML = createMaterialIcon(iconName, { 
          style: 'outlined', 
          color: 'white' 
        });
      }
    });
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // ドラッグ機能
    const header = this.container.querySelector('.floating-player-header') as HTMLElement;
    if (header) {
      header.addEventListener('mousedown', this.onDragStart.bind(this));
    }

    // 最小化ボタン
    const minimizeBtn = this.container.querySelector('.minimize-btn') as HTMLButtonElement;
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', this.toggleMinimize.bind(this));
    }

    // 閉じるボタン
    const closeBtn = this.container.querySelector('.close-btn') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', this.hide.bind(this));
    }

    // グローバルマウスイベント
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));

    // ウィンドウリサイズの監視
    this.setupResizeObserver();
  }

  /**
   * ドラッグ開始
   */
  private onDragStart(e: MouseEvent): void {
    if (!this.container) return;

    this.isDragging = true;
    this.container.classList.add('dragging');

    const rect = this.container.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    e.preventDefault();
  }

  /**
   * ドラッグ中
   */
  private onDragMove(e: MouseEvent): void {
    if (!this.isDragging || !this.container) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // 画面外に出ないように制限
    const maxX = window.innerWidth - this.container.offsetWidth;
    const maxY = window.innerHeight - this.container.offsetHeight;

    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    this.container.style.left = `${clampedX}px`;
    this.container.style.top = `${clampedY}px`;
    this.container.style.right = 'auto';
  }

  /**
   * ドラッグ終了
   */
  private onDragEnd(): void {
    if (!this.isDragging || !this.container) return;

    this.isDragging = false;
    this.container.classList.remove('dragging');
  }

  /**
   * リサイズ監視の設定
   */
  private setupResizeObserver(): void {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.originalVideoSize && !this.isMinimized) {
        this.resizePlayer();
      }
    });

    // ウィンドウのリサイズを監視
    this.resizeObserver.observe(document.body);
  }

  /**
   * 最適なプレーヤーサイズを計算
   */
  private calculateOptimalSize(): { width: number; height: number } {
    if (!this.originalVideoSize) {
      return { width: 400, height: 300 }; // デフォルトサイズ
    }

    const viewportHeight = window.innerHeight;
    const maxHeight = Math.floor(viewportHeight * 0.65); // ビューポートの65%
    
    // オリジナル高さとビューポート65%の小さい方を選択
    const targetHeight = Math.min(this.originalVideoSize.height, maxHeight);
    
    // アスペクト比を維持して幅を計算
    const aspectRatio = this.originalVideoSize.width / this.originalVideoSize.height;
    const targetWidth = Math.floor(targetHeight * aspectRatio);

    // 最小サイズと最大サイズの制限
    const minWidth = 300;
    const maxWidth = Math.floor(window.innerWidth * 0.8);
    
    const finalWidth = Math.max(minWidth, Math.min(targetWidth, maxWidth));
    const finalHeight = Math.floor(finalWidth / aspectRatio);

    return { width: finalWidth, height: finalHeight };
  }

  /**
   * プレーヤーサイズの調整
   */
  private resizePlayer(): void {
    if (!this.container || this.isMinimized) return;

    const { width, height } = this.calculateOptimalSize();
    
    // コンテナサイズを調整
    this.container.style.width = `${width}px`;
    this.container.style.minHeight = `${height + 120}px`; // ヘッダーとコントロール分を追加

    // 動画コンテナの高さを調整
    const videoContainer = this.container.querySelector('.video-container') as HTMLElement;
    if (videoContainer) {
      videoContainer.style.height = `${height}px`;
    }

    // 画面外に出ないように位置を調整
    this.adjustPosition();
  }

  /**
   * 画面外に出ないように位置を調整
   */
  private adjustPosition(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    const currentX = parseInt(this.container.style.left) || rect.left;
    const currentY = parseInt(this.container.style.top) || rect.top;

    // 画面外に出ている場合は調整
    if (currentX > maxX) {
      this.container.style.left = `${Math.max(0, maxX)}px`;
      this.container.style.right = 'auto';
    }
    if (currentY > maxY) {
      this.container.style.top = `${Math.max(0, maxY)}px`;
    }
  }

  /**
   * 最小化切り替え
   */
  private toggleMinimize(): void {
    if (!this.container) return;

    this.isMinimized = !this.isMinimized;
    this.container.classList.toggle('minimized', this.isMinimized);

    const minimizeBtn = this.container.querySelector('.minimize-btn') as HTMLButtonElement;
    if (minimizeBtn) {
      minimizeBtn.textContent = this.isMinimized ? '□' : '−';
      minimizeBtn.title = this.isMinimized ? '復元' : '最小化';
    }
  }

  /**
   * 動画の読み込み
   */
  private async loadVideo(videoIdOrUrl: string): Promise<void> {
    if (!this.videoElement) return;

    this.updateStatus('動画を読み込み中...');

    try {
      let finalUrl: string;
      let isHLS: boolean;

      // URLかどうかを判定（http/httpsで始まるかチェック）
      if (videoIdOrUrl.startsWith('http://') || videoIdOrUrl.startsWith('https://')) {
        // URLの場合はそのまま使用
        finalUrl = videoIdOrUrl;
        isHLS = videoIdOrUrl.toLowerCase().includes('hls') || videoIdOrUrl.includes('.m3u8');
             } else {
         // 動画IDの場合はキャッシュURLを生成
         this.updateStatus('キャッシュ情報を取得中...');
      const cacheResult = await this.getCacheUrl(videoIdOrUrl);
         finalUrl = cacheResult.url;
         isHLS = cacheResult.isHLS;
         
         // タイトルが取得できた場合は表示を更新
         if (cacheResult.title && this.container) {
           const videoIdDisplay = this.container.querySelector('.video-id-display') as HTMLElement;
           if (videoIdDisplay) {
             videoIdDisplay.textContent = `${videoIdOrUrl} (${cacheResult.title})`;
           }
         }
       }
      
      if (isHLS) {
        await this.loadHLSVideo(finalUrl);
      } else {
        await this.loadRegularVideo(finalUrl);
      }
    } catch (error) {
      window.logger.error('動画読み込みエラー:', error);
      this.showError(`動画の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * キャッシュURLの取得
   */
  private async getCacheUrl(videoId: string): Promise<CacheUrlResult> {
    const infoUrl = `https://www.nicovideo.jp/cache/info/v2?${videoId}`;
    
    try {
      const response = await fetch(infoUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonUnknown: unknown = await response.json();
      const data = jsonUnknown as CacheInfoResponse;

      if (!data || !(videoId in data)) {
        throw new Error("動画情報が見つかりません");
      }

      const videoInfo = data[videoId] as { preferred?: string; caches?: Record<string, { title?: string }> };
      if (!videoInfo.preferred) {
        throw new Error("この動画は現在利用できません");
      }

      const cacheId: string = videoInfo.preferred;
      const title: string = videoInfo.caches && videoInfo.caches[cacheId] ? String(videoInfo.caches[cacheId].title ?? '') : "";
      const isHLS = cacheId.endsWith(".hls");

      // URLを構築
      const url = isHLS
        ? `https://www.nicovideo.jp/cache/${cacheId}`
        : `https://www.nicovideo.jp/cache/${videoId}/auto/movie`;

      return { url, isHLS, title };
    } catch (error) {
      window.logger.error('キャッシュ情報取得エラー:', error);
      throw new Error(`キャッシュ情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * HLS動画の読み込み
   */
  private async loadHLSVideo(url: string): Promise<void> {
    await Promise.resolve();
    if (!this.videoElement) return;

    this.updateStatus('HLS動画を読み込み中...');

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls();

      this.hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
        const [data] = args;
        window.logger.error('HLS Error:', data);
        this.showError('HLS再生でエラーが発生しました');
      });

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateStatus('HLS動画読み込み完了！');
        this.showSuccess('HLSマニフェスト読み込み完了しました！');
        this.videoElement?.play().catch((e: Error) => {
          window.logger.error('再生開始エラー:', e);
          this.updateStatus('再生準備完了（クリックで再生）');
        });
      });

      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
    } else {
      // HLS.jsが利用できない場合はネイティブ再生を試行
      this.videoElement.src = url;
      this.updateStatus('ネイティブHLS再生を試行中...');
    }

    // 基本的な動画イベント
    this.setupVideoEvents();
  }

  /**
   * 通常動画の読み込み
   */
  private async loadRegularVideo(url: string): Promise<void> {
    await Promise.resolve();
    if (!this.videoElement) return;

    this.updateStatus('動画を読み込み中...');
    this.videoElement.src = url;
    this.setupVideoEvents();
  }

  /**
   * 動画イベントの設定
   */
  private setupVideoEvents(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('loadstart', () => {
      this.updateStatus('読み込み開始...');
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.updateStatus('メタデータ読み込み完了');
      
      // オリジナル動画サイズを取得
      if (this.videoElement) {
        this.originalVideoSize = {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        };
        
        // サイズを調整
        this.resizePlayer();
        
        window.logger.info(`動画サイズ: ${this.originalVideoSize.width}x${this.originalVideoSize.height}`);
      }
    });

    this.videoElement.addEventListener('canplay', () => {
      this.updateStatus('再生準備完了');
      this.showSuccess('動画の読み込みが完了しました！');
    });

    this.videoElement.addEventListener('playing', () => {
      this.updateStatus('再生中');
    });

    this.videoElement.addEventListener('pause', () => {
      this.updateStatus('一時停止中');
    });

    this.videoElement.addEventListener('waiting', () => {
      this.updateStatus('バッファリング中...');
    });

    this.videoElement.addEventListener('error', (e: Event) => {
      window.logger.error('動画エラー:', e);
      this.showError('動画の再生でエラーが発生しました');
    });

    // 音量を適切に設定
    this.videoElement.volume = 0.3;
  }

  /**
   * ステータス更新
   */
  private updateStatus(message: string): void {
    if (!this.container) return;

    const statusText = this.container.querySelector('.status-text') as HTMLElement;
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * エラー表示
   */
  private showError(message: string): void {
    this.updateStatus('エラー');
    this.showMessage(message, 'hls-error');
  }

  /**
   * 成功表示
   */
  private showSuccess(message: string): void {
    this.showMessage(message, 'hls-success');
  }

  /**
   * メッセージ表示
   */
  private showMessage(message: string, className: string): void {
    if (!this.container) return;

    // 既存のメッセージを削除
    const existingMessages = this.container.querySelectorAll('.hls-error, .hls-success');
    existingMessages.forEach(msg => msg.remove());

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div');
    messageDiv.className = className;
    messageDiv.textContent = message;

    const playerStatus = this.container.querySelector('.player-status') as HTMLElement;
    if (playerStatus) {
      playerStatus.appendChild(messageDiv);

      // 5秒後に自動削除
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }
} 