// CommentFilter2 メインエントリーポイント
import { DataInterceptor } from './proxy/data-interceptor';
import { UIManager } from './components/ui-manager';
import { VideoPlayerBridge } from './integrations/video-player-bridge';
import { CONSTANTS } from './utils/constants';
import { VideoPlayerBridgeStatus } from '@/types/video-player-bridge-types';

export class CommentFilter2 {
  private dataInterceptor: DataInterceptor;
  private uiManager: UIManager;
  private videoPlayerBridge: VideoPlayerBridge;
  private isInitialized: boolean = false;
  private keyboardShortcutEnabled: boolean = true;

  constructor() {
    this.dataInterceptor = new DataInterceptor();
    this.uiManager = new UIManager();
    this.videoPlayerBridge = new VideoPlayerBridge();
    
    void this.initialize();
  }

  /**
   * CommentFilter2の初期化
   */
  private async initialize(): Promise<void> {
    await Promise.resolve();
    try {
      // キーボードショートカットを設定
      this.setupKeyboardShortcuts();
      
      // データの変更を監視
      this.startDataMonitoring();
      
      this.isInitialized = true;
      window.logger?.info('[CommentFilter2] Initialization completed successfully');
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Initialization failed:', error);
    }
  }

  /**
   * キーボードショートカットを設定
   */
  private setupKeyboardShortcuts(): void {
    if (!this.keyboardShortcutEnabled) return;

    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+F でUIを表示/非表示
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        void this.toggleUI();
        window.logger?.debug('[CommentFilter2] UI toggled via keyboard shortcut');
      }
    });
  }

  /**
   * データの変更を監視してフィルターを適用
   */
  private startDataMonitoring(): void {
    // 初回ページロード時に1回実行
    void this.processCommentData();
    
    // コメントデータ更新時のイベントリスナー
    window.addEventListener(CONSTANTS.EVENTS.DATA_UPDATED, () => {
      window.logger?.debug('[CommentFilter2] Processing comment data due to DATA_UPDATED event');
      void this.processCommentData();
    });
    
    // SMID変更（動画切替）時のイベントリスナー
    window.addEventListener(CONSTANTS.EVENTS.SMID_CHANGED, (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = (customEvent.detail ?? {}) as { smid?: unknown };
      const smid = typeof detail.smid === 'string' ? detail.smid : '';
      window.logger?.debug(`[CommentFilter2] Processing comment data due to SMID change: ${smid}`);
      void this.processCommentData();
    });
    
    window.logger?.info('[CommentFilter2] Event-driven data monitoring initialized');
  }

  /**
   * コメントデータの処理
   */

  private extractSmidFromLocation(): string | null {
    try {
      const href = window.location.href;
      const watchMatch = href.match(/\/watch\/([a-z]{2}\d+)/i);
      if (watchMatch) {
        return watchMatch[1].toLowerCase();
      }
      const genericMatch = href.match(/([a-z]{2}\d+)/i);
      return genericMatch ? genericMatch[1].toLowerCase() : null;
    } catch (error) {
      window.logger?.warn('[CommentFilter2] Failed to extract SMID from URL:', error);
      return null;
    }
  }

  private async processCommentData(): Promise<void> {
    await Promise.resolve();
    try {
      const globalData = DataInterceptor.getGlobalData();
      const fallbackSmid = this.extractSmidFromLocation();
      const smid = globalData?.currentSmid ?? fallbackSmid;
      
      if (globalData?.originalData && smid) {
        // フィルターを適用
        await this.uiManager.applyFilter(smid);
        
        // video_playerとの同期を実行
        this.videoPlayerBridge.forceSync();
      }
    } catch (error) {
      window.logger?.error('[CommentFilter2] Comment data processing failed:', error);
    }
  }

  /**
   * UIを表示
   */
  public async showUI(): Promise<void> {
    await this.uiManager.show();
  }

  /**
   * UIを非表示
   */
  public hideUI(): void {
    this.uiManager.hide();
  }

  /**
   * UIの表示状態を切り替え
   */
  public async toggleUI(): Promise<void> {
    await this.uiManager.toggle();
  }

  /**
   * video_playerとの連携状態を取得
   */
  public getVideoPlayerStatus(): VideoPlayerBridgeStatus {
    return this.videoPlayerBridge.getStatus();
  }

  /**
   * キーボードショートカットの有効/無効を切り替え
   */
  public setKeyboardShortcutEnabled(enabled: boolean): void {
    this.keyboardShortcutEnabled = enabled;
  }

  /**
   * 初期化状態を取得
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * CommentFilter2を完全に無効化
   */
  public destroy(): void {
    try {
      this.dataInterceptor.disable();
      this.uiManager.destroy();
      this.videoPlayerBridge.destroy();
      
      this.isInitialized = false;
      window.logger?.info('[CommentFilter2] Destroyed successfully');
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Destruction failed:', error);
    }
  }

  /**
   * デバッグ情報を取得
   */
  public getDebugInfo(): {
    isInitialized: boolean;
    keyboardShortcutEnabled: boolean;
    globalData: {
      hasOriginalData: boolean;
      hasFilteredData: boolean;
      currentSmid: string | null;
      lastUpdated: number | null;
    };
    videoPlayer: VideoPlayerBridgeStatus;
    constants: typeof CONSTANTS;
  } {
    const globalData = DataInterceptor.getGlobalData();
    const videoPlayerStatus = this.videoPlayerBridge.getStatus();
    
    return {
      isInitialized: this.isInitialized,
      keyboardShortcutEnabled: this.keyboardShortcutEnabled,
      globalData: {
        hasOriginalData: !!globalData?.originalData,
        hasFilteredData: !!globalData?.filteredData,
        currentSmid: globalData?.currentSmid ?? null,
        lastUpdated: globalData?.lastUpdated ?? null
      },
      videoPlayer: videoPlayerStatus,
      constants: CONSTANTS
    };
  }
}

// グローバルに公開（デバッグやコンソールからのアクセス用）
declare global {
  interface Window {
    CommentFilter2Instance?: CommentFilter2;
  }
}

// 自動初期化
let commentFilter2Instance: CommentFilter2 | null = null;

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initializeCommentFilter2(); });
} else {
  initializeCommentFilter2();
}

function initializeCommentFilter2() {
  try {
    commentFilter2Instance = new CommentFilter2();
    window.CommentFilter2Instance = commentFilter2Instance;
    
    // 初期化完了イベントを送信
    window.dispatchEvent(new CustomEvent('CommentFilter2Ready'));
    
    window.logger?.info('[CommentFilter2] Auto-initialization completed');
    window.logger?.info('[CommentFilter2] Use Ctrl+Shift+F to toggle UI or call via links_video_controller');
    window.logger?.info('[CommentFilter2] Access via window.CommentFilter2Instance for debugging');
    
  } catch (error) {
    window.logger?.error('[CommentFilter2] Auto-initialization failed:', error);
  }
}

// エクスポート
export default CommentFilter2; 
