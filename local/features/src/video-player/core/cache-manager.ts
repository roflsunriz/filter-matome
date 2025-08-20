import { CACHE_MANAGEMENT } from '../config/constants.js';
import { HlsInstance } from '@/types/video-types.js';

/**
 * ビデオプレイヤーのキャッシュ管理クラス
 * ブラウザの非効率的なメディアバッファリングを管理します
 */
export class CacheManager {
  private video: HTMLVideoElement;
  private playStartTime: number = 0;
  private lastCleanupTime: number = 0;
  private cacheCheckInterval: number | null = null;
  private hls: HlsInstance | null = null;
  private currentUrl: string = '';

  /**
   * @param videoElement 管理対象のビデオ要素
   * @param hlsInstance HLS.jsのインスタンス（HLS再生時のみ）
   * @param url 現在の動画URL
   */
  constructor(videoElement: HTMLVideoElement, hlsInstance?: HlsInstance, url?: string) {
    this.video = videoElement;
    this.hls = hlsInstance || null;
    this.currentUrl = url || '';
    this.playStartTime = Date.now();
    this.lastCleanupTime = Date.now();
  }

  /**
   * キャッシュ管理を開始します
   */
  public startMonitoring(): void {
    // すでに監視中なら何もしない
    if (this.cacheCheckInterval !== null) return;

    // 定期的にキャッシュ状態をチェック
    this.cacheCheckInterval = window.setInterval(() => {
      if (!this.video.paused) {
        this.checkCacheState();
      }
    }, CACHE_MANAGEMENT.CHECK_INTERVAL_MS);

    // クリーンアップ時にイベントリスナーを設定
    this.video.addEventListener('emptied', this.handleEmptied);
    this.video.addEventListener('waiting', this.handleWaiting);
    this.video.addEventListener('playing', this.handlePlaying);
  }

  /**
   * キャッシュ管理を停止します
   */
  public stopMonitoring(): void {
    if (this.cacheCheckInterval !== null) {
      window.clearInterval(this.cacheCheckInterval);
      this.cacheCheckInterval = null;
    }

    // イベントリスナーを削除
    this.video.removeEventListener('emptied', this.handleEmptied);
    this.video.removeEventListener('waiting', this.handleWaiting);
    this.video.removeEventListener('playing', this.handlePlaying);
  }

  /**
   * HLS.jsインスタンスを更新します（HLS再生への切り替え時）
   */
  public updateHlsInstance(hlsInstance: HlsInstance | null, url?: string): void {
    this.hls = hlsInstance;
    if (url) {
      this.currentUrl = url;
    }
    window.logger.info('CacheManagerのHLS.jsインスタンスを更新したのじゃ！', {
      hasHls: !!this.hls,
      url: this.currentUrl
    });
  }

  /**
   * キャッシュの状態をチェックします
   */
  private checkCacheState(): void {
    const currentTime = Date.now();
    const playDuration = (currentTime - this.playStartTime) / 1000; // 秒単位

    // メモリ使用量のチェック（サポートされている場合）
    if (window.performance && 'memory' in window.performance && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize;

      // キャッシュサイズまたは再生時間のしきい値を超えた場合
          if (usedMemory > CACHE_MANAGEMENT.CACHE_SIZE_THRESHOLD_BYTES || 
          playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1000) {
        
        window.logger.info('キャッシュクリーンアップが必要なのじゃ！', {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`,
          usedMemory: `${(usedMemory / (1024 * 1024)).toFixed(2)}MB`
        });
        
        void this.forceCleanup();
      }
    } else {
      // メモリ情報が取得できない場合は時間だけで判断
      if (playDuration > CACHE_MANAGEMENT.TIME_THRESHOLD_MS / 1000) {
        window.logger.info('再生時間に基づくキャッシュクリーンアップが必要なのじゃ！', {
          playDuration: `${Math.floor(playDuration / 60)}分${Math.floor(playDuration % 60)}秒`
        });
        
        void this.forceCleanup();
      }
    }
  }

  /**
   * キャッシュの強制クリーンアップを実行します
   */
  private async forceCleanup(): Promise<void> {
    try {
      window.logger.info('キャッシュクリーンアップを実行するのじゃ！');
      
      // 現在の再生状態を保存
      const wasPlaying = !this.video.paused;
      const currentPosition = this.video.currentTime;
      
      // バッファリング表示の追加
      this.addBufferingDisplay();
      
      if (this.hls) {
        // HLS.js使用時の特別な処理
        await this.hlsCleanup(wasPlaying, currentPosition);
      } else {
        // 通常の動画ファイルの処理
        await this.regularCleanup(wasPlaying, currentPosition);
      }
      
      // タイマーをリセット
      this.playStartTime = Date.now();
      this.lastCleanupTime = Date.now();
      
      // バッファリング表示を削除
      this.removeBufferingDisplay();
      
      window.logger.info('キャッシュクリーンアップが完了したのじゃ！');
    } catch (error) {
      window.logger.error('キャッシュクリーンアップでエラーが発生したのじゃ...', error);
      this.removeBufferingDisplay();
    }
  }

  /**
   * HLS.js使用時のキャッシュクリーンアップ
   */
  private async hlsCleanup(wasPlaying: boolean, currentPosition: number): Promise<void> {
    if (!this.hls) return;

    window.logger.info('HLS.js使用時のキャッシュクリーンアップを実行するのじゃ！');

    try {
      // HLS.jsの内部バッファをクリア
      if (typeof this.hls.destroy === 'function') {
        // 現在のソースを保存
        const currentSource = this.currentUrl;
        
        // HLS.jsインスタンスを一旦破棄
        this.hls.destroy();
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 新しいHLS.jsインスタンスを作成して再アタッチ
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
          this.hls = new Hls();
          
          // エラーハンドラを再設定
          this.hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
            const [, data] = args;
            window.logger.error('HLS Error during cleanup:', data);
          });

          // マニフェスト解析完了後に位置を復元
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.restorePlaybackPosition(wasPlaying, currentPosition);
          });

          // ソースを再読み込み
          this.hls.loadSource(currentSource);
          this.hls.attachMedia(this.video);
        } else {
          window.logger.warn('HLS.jsが利用できないため、ネイティブ再生にフォールバックするのじゃ');
          this.video.src = currentSource;
          await new Promise(resolve => setTimeout(resolve, 100));
          this.restorePlaybackPosition(wasPlaying, currentPosition);
        }
      } else {
        window.logger.warn('HLS.jsのdestroyメソッドが利用できないのじゃ');
        // フォールバック：通常の方法でクリーンアップ
        await this.regularCleanup(wasPlaying, currentPosition);
      }
    } catch (error) {
      window.logger.error('HLS.jsクリーンアップ中にエラーが発生したのじゃ:', error);
      // エラー時は通常のクリーンアップにフォールバック
      await this.regularCleanup(wasPlaying, currentPosition);
    }
  }

  /**
   * 通常の動画ファイルのキャッシュクリーンアップ
   */
  private async regularCleanup(wasPlaying: boolean, currentPosition: number): Promise<void> {
    window.logger.info('通常の動画ファイルのキャッシュクリーンアップを実行するのじゃ！');

    // 現在のソースを保存
    const currentSrc = this.video.src;
    
    // メディアソースをリセット
    this.video.pause();
    this.video.src = '';
    this.video.load();
    
    // 少し待ってからメディアを再読み込み
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // メディアソースを復元
    this.video.src = currentSrc;
    this.video.load();

    // 位置と再生状態を復元
    this.restorePlaybackPosition(wasPlaying, currentPosition);
  }

  /**
   * 再生位置と再生状態を復元
   */
  private restorePlaybackPosition(wasPlaying: boolean, currentPosition: number): void {
    // 再生位置を復元（バッファ分を考慮）
    const safePosition = Math.max(0, currentPosition - CACHE_MANAGEMENT.CLEANUP_BUFFER_SECONDS);
    this.video.currentTime = safePosition;
    
    // 再生状態を復元
    if (wasPlaying) {
      // 少し待ってから再生を試行
      setTimeout(() => {
        void this.video.play().catch((error) => {
          window.logger.error('再生の再開に失敗したのじゃ:', error);
        });
      }, 100);
    }
  }

  // イベントハンドラー
  private handleEmptied = (): void => {
    // メディアが空になった時に呼ばれる
    if (this.cacheCheckInterval !== null) {
      window.clearInterval(this.cacheCheckInterval);
      this.cacheCheckInterval = null;
    }
  };

  private handleWaiting = (): void => {
    // バッファリング時にビジュアルフィードバックを表示
    this.addBufferingDisplay();
  };

  private handlePlaying = (): void => {
    // 再生開始時にバッファリング表示を削除
    this.removeBufferingDisplay();
  };

  /**
   * バッファリング表示を追加します
   */
  private addBufferingDisplay(): void {
    const playerContainer = document.querySelector('.custom-player');
    if (playerContainer) {
      playerContainer.classList.add('buffering');
    }
  }

  /**
   * バッファリング表示を削除します
   */
  private removeBufferingDisplay(): void {
    const playerContainer = document.querySelector('.custom-player');
    if (playerContainer) {
      playerContainer.classList.remove('buffering');
    }
  }
} 