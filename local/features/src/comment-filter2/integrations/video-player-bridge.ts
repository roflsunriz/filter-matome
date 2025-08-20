// video_player連携部 - video_playerライブラリとの橋渡し
import { CONSTANTS } from '../utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData } from '@/types/filter-types';
import { 
  VideoPlayerGetCommentsArgs, 
  VideoPlayerResponse, 
  VideoPlayerBridgeStatus, 
  CommentFilter2UpdateEventDetail,
  IVideoPlayerBridge 
} from '@/types/video-player-bridge-types';
// グローバル型定義はglobalTypes.tsで管理
import '../../types/global-types.js';

export class VideoPlayerBridge implements IVideoPlayerBridge {
  private isVideoPlayerDetected: boolean = false;
  private hasSuccessfullyNotified: boolean = false;
  private lastNotifiedSmid: string | null = null;
  private mutationObserver: MutationObserver | null = null;
  private lastDataHash: string = ""; // データの差分検知用
  private lastNotificationTime: number = 0; // 最後の通知時刻
  private backoffDelay: number = 1000; // バックオフ遅延（初期値1秒）
  private maxBackoffDelay: number = 32000; // 最大バックオフ遅延（32秒）
  private retryTimeoutId: number | null = null;
  private forceSyncDebounceId: number | null = null; // forceSync用デバウンスタイマー

  constructor() {
    this.initialize();
  }

  /**
   * Singleton インスタンスを取得
   */
  static getInstance(): VideoPlayerBridge {
    if (window.__CF2_BRIDGE__) {
      window.logger?.info('[CommentFilter2] VideoPlayerBridge already exists, returning existing instance');
      return window.__CF2_BRIDGE__ as VideoPlayerBridge;
    }
    
    const instance = new VideoPlayerBridge();
    window.__CF2_BRIDGE__ = instance;
    return instance;
  }

  /**
   * 連携の初期化
   */
  private initialize(): void {
    this.startVideoPlayerDetection();
  }

  /**
   * video_playerの検知を開始（MutationObserver使用でパフォーマンス向上）
   */
  private startVideoPlayerDetection(): void {
    // 初回チェック
    this.checkVideoPlayerStatus();
    
    // MutationObserverでDOM変化を監視（パフォーマンス最適化）
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver((mutations) => {
        // video-elementの追加/削除のみをチェック
        let shouldCheck = false;
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.id === 'video-element' || element.querySelector?.('#video-element')) {
                shouldCheck = true;
              }
            }
          });
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.id === 'video-element' || element.querySelector?.('#video-element')) {
                shouldCheck = true;
              }
            }
          });
        });
        
        if (shouldCheck) {
          this.checkVideoPlayerStatus();
        }
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      
      window.logger?.debug('[CommentFilter2] Using optimized MutationObserver for video_player detection');
    } else {
      // フォールバック: 古い環境用の単発チェック
      setTimeout(() => this.checkVideoPlayerStatus(), 1000);
      window.logger?.info('[CommentFilter2] Using timeout fallback for video_player detection');
    }
  }

  /**
   * video_playerの状態をチェック
   */
  private checkVideoPlayerStatus(): void {
    const videoElement = document.getElementById('video-element');
    
    if (videoElement && !this.isVideoPlayerDetected) {
      this.isVideoPlayerDetected = true;
      this.setupVideoPlayerIntegration();
      window.logger?.info('[CommentFilter2] video_player detected and integrated');
    } else if (!videoElement && this.isVideoPlayerDetected) {
      this.isVideoPlayerDetected = false;
      this.resetNotificationState();
      window.logger?.info('[CommentFilter2] video_player connection lost');
    }
  }

  /**
   * 通知状態をリセット
   */
  private resetNotificationState(): void {
    this.hasSuccessfullyNotified = false;
    this.lastNotifiedSmid = null;
    this.lastDataHash = "";
    this.backoffDelay = 1000; // バックオフをリセット
    this.lastNotificationTime = 0; // レートリミット用のタイムスタンプも初期化
    
    // リトライタイマーを停止
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
      window.logger?.debug('[CommentFilter2] Retry timer cleared');
    }
  }

  /**
   * video_playerとの統合を設定
   */
  private setupVideoPlayerIntegration(): void {
    try {
      // video_playerのコメント取得処理をフック
      this.hookCommentRetrieval();
      
      // データ監視を開始（最適化版）
      this.startDataMonitoring();
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to setup video_player integration:', error);
    }
  }

  /**
   * video_playerのコメント取得処理をフック
   */
  private hookCommentRetrieval(): void {
    // video_player側でコメントデータを要求する際のフック
    // グローバルオブジェクトからフィルタリング済みデータを提供
    
    // video_playerが使用するコメント取得関数を代替
    if (window.videoPlayer && typeof window.videoPlayer.getComments === 'function') {
      const originalGetComments = window.videoPlayer.getComments.bind(window.videoPlayer);
      
      window.videoPlayer.getComments = (...args: VideoPlayerGetCommentsArgs) => {
        // フィルタリング済みデータがあれば提供
        const globalData = this.getGlobalData();
        if (globalData?.filteredData) {
          return this.adaptDataForVideoPlayer(globalData.filteredData);
        }
        
        // フィルタリング済みデータがない場合は元の処理を実行
        return originalGetComments(...args);
      };
    }
  }

  /**
   * データ監視を完全停止
   */
  private stopMonitoring(): void {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
      window.logger?.debug('[CommentFilter2] Monitoring stopped - retry timer cleared');
    }
  }

  /**
   * データ監視を開始（バックオフ付き）
   */
  private startDataMonitoring(): void {
    // 既に成功済みまたは監視中なら開始しない
    if (this.hasSuccessfullyNotified || this.retryTimeoutId !== null) {
      window.logger?.debug('[CommentFilter2] Monitoring already active or completed, skipping start');
      return;
    }

    const checkGlobalData = () => {
      const globalData = this.getGlobalData();
      
      if (!globalData || !this.isVideoPlayerDetected) {
        return;
      }
      
      if (globalData.filteredData) {
        const currentSmid = globalData.currentSmid;
        
        // SMIDが変わったら通知状態をリセット
        if (this.lastNotifiedSmid !== null && this.lastNotifiedSmid !== currentSmid) {
          this.hasSuccessfullyNotified = false;
          this.lastDataHash = "";
          window.logger?.debug('[CommentFilter2] New video detected, resetting notification state');
        }
        
        // 未通知または新しい動画の場合のみ通知
        if (!this.hasSuccessfullyNotified) {
          const success = this.notifyVideoPlayerWithDiffCheck(globalData.filteredData);
          
          if (success) {
            this.hasSuccessfullyNotified = true;
            this.lastNotifiedSmid = currentSmid;
            this.backoffDelay = 1000; // 成功時はバックオフをリセット
            
            // 成功したら監視を完全停止
            this.stopMonitoring();
            window.logger?.info('[CommentFilter2] Data transfer successful, monitoring stopped');
            return;
          }
        }
      }
      
      // 失敗した場合はバックオフ付きでリトライ
      if (!this.hasSuccessfullyNotified && this.isVideoPlayerDetected) {
        this.retryTimeoutId = window.setTimeout(() => {
          checkGlobalData();
          // バックオフ遅延を倍増（最大値まで）
          this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
        }, this.backoffDelay);
        
        window.logger?.debug(`[CommentFilter2] Retrying in ${this.backoffDelay}ms`);
      }
    };

    // 最初の1回だけ即座にチェック
    checkGlobalData();
  }

  /**
   * 差分検知付きでvideo_playerにフィルタリング済みデータを通知
   */
  private notifyVideoPlayerWithDiffCheck(filteredData: CF2CommentApiResponse, skipRateLimit = false): boolean {
    try {
      // データのハッシュを計算（簡易版）
      const globalData = this.getGlobalData();
      const dataString = JSON.stringify({
        smid: globalData?.currentSmid || '',
        threadCount: filteredData.data?.threads?.length || 0,
        commentCount: filteredData.data?.threads?.reduce((sum, thread) => sum + (thread.comments?.length || 0), 0) || 0,
        lastUpdated: globalData?.lastUpdated || 0
      });
      
      const currentHash = this.simpleHash(dataString);
      
      // 前回と同じデータの場合はスキップ
      if (currentHash === this.lastDataHash) {
        window.logger?.debug('[CommentFilter2] Data unchanged, skipping notification');
        return true; // 成功扱いにして無限ループを防ぐ
      }
      
      // 通知頻度制限（最低1秒間隔）
      const now = Date.now();
      if (!skipRateLimit && now - this.lastNotificationTime < 1000) {
        window.logger?.debug('[CommentFilter2] Rate limited, deferring notification');
        return false;
      }
      
      // video_playerにカスタムイベントを送信
      const eventDetail: CommentFilter2UpdateEventDetail = {
        filteredData: this.adaptDataForVideoPlayer(filteredData),
        timestamp: now
      };
      
      const event = new CustomEvent('commentFilter2Update', {
        detail: eventDetail
      });
      
      const videoElement = document.getElementById('video-element');
      if (videoElement) {
        videoElement.dispatchEvent(event);
        
        // 成功時の状態更新
        this.lastDataHash = currentHash;
        this.lastNotificationTime = now;
        
        window.logger?.info('[CommentFilter2] Successfully notified video_player with filtered data');
        return true;
      }
      
      return false;
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to notify video_player:', error);
      return false;
    }
  }

  /**
   * 簡易ハッシュ関数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString();
  }

  /**
   * データをvideo_player形式に適合させる
   */
  private adaptDataForVideoPlayer(apiResponse: CF2CommentApiResponse): VideoPlayerResponse {
    try {
      // video_playerが期待する形式にデータを変換
      const adaptedData: VideoPlayerResponse = {
        meta: apiResponse.meta,
        data: {
          ...apiResponse.data,
          threads: apiResponse.data.threads.map(thread => ({
            ...thread,
            comments: thread.comments.map(comment => ({
              vpos: Math.floor(comment.vposMs / 10), // ミリ秒から1/100秒単位に変換
              vposMs: comment.vposMs,
              body: comment.body,
              userId: comment.userId,
              premium: comment.isPremium,
              isPremium: comment.isPremium,
              // その他のプロパティも引き継ぐ
              ...(comment.id !== undefined && { id: comment.id }),
              ...(comment.no !== undefined && { no: comment.no }),
              ...(comment.commands !== undefined && { commands: comment.commands }),
              ...(comment.score !== undefined && { score: comment.score }),
              ...(comment.postedAt !== undefined && { postedAt: comment.postedAt }),
              ...(comment.nicoruCount !== undefined && { nicoruCount: comment.nicoruCount }),
              ...(comment.nicoruId !== undefined && { nicoruId: comment.nicoruId }),
              ...(comment.source !== undefined && { source: comment.source }),
              ...(comment.isMyPost !== undefined && { isMyPost: comment.isMyPost }),
            }))
          }))
        }
      };
      
      return adaptedData;
    } catch (error) {
      window.logger?.error('[CommentFilter2] Data adaptation failed:', error);
      // 変換に失敗した場合は最低限の形式で返す
      return {
        meta: apiResponse.meta,
        data: {
          threads: []
        }
      } as VideoPlayerResponse;
    }
  }

  /**
   * グローバルデータを取得
   */
  private getGlobalData(): CommentFilter2GlobalData | null {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    
    // 型ガードで安全にチェック
    if (data && typeof data === 'object' && 
        'originalData' in data && 
        'filteredData' in data && 
        'currentSmid' in data && 
        'lastUpdated' in data) {
      return data;
    }
    
    return null;
  }

  /**
   * video_playerとの連携を手動で再実行（デバウンス付き）
   */
  public forceSync(): void {
    // デバウンス処理（100ms以内の連続呼び出しは最後の1回のみ実行）
    if (this.forceSyncDebounceId !== null) {
      clearTimeout(this.forceSyncDebounceId);
    }
    
    this.forceSyncDebounceId = window.setTimeout(() => {
      this.forceSyncDebounceId = null;
      this.executeForceSyncInternal();
    }, 100);
  }

  /**
   * 内部的なforceSync実行
   */
  private executeForceSyncInternal(): void {
    // 既に成功済みなら何もしない（無限ループ防止）
    if (this.hasSuccessfullyNotified) {
      window.logger?.debug('[CommentFilter2] Already successfully notified, skipping force sync');
      return;
    }

    if (!this.isVideoPlayerDetected) {
      window.logger?.warn('[CommentFilter2] video_player not detected, cannot sync');
      return;
    }

    // 強制同期時は状態をリセット
    this.resetNotificationState();
    
    const globalData = this.getGlobalData();
    if (globalData?.filteredData) {
      const success = this.notifyVideoPlayerWithDiffCheck(globalData.filteredData, true); // forceSync時はレートリミットを無視
      if (success) {
        this.hasSuccessfullyNotified = true;
        this.lastNotifiedSmid = globalData.currentSmid;
        this.stopMonitoring(); // 成功時は監視を完全停止
        window.logger?.info('[CommentFilter2] Force sync completed successfully');
      } else {
        // 失敗した場合は監視を再開
        this.startDataMonitoring();
        window.logger?.warn('[CommentFilter2] Force sync failed, restarting monitoring');
      }
    } else {
      window.logger?.warn('[CommentFilter2] No filtered data available for force sync');
    }
  }

  /**
   * 連携状態を取得
   */
  public getStatus(): VideoPlayerBridgeStatus {
    const globalData = this.getGlobalData();
    
    return {
      isVideoPlayerDetected: this.isVideoPlayerDetected,
      hasFilteredData: !!globalData?.filteredData,
      lastSync: globalData?.lastUpdated || null,
      hasSuccessfullyNotified: this.hasSuccessfullyNotified,
      lastNotifiedSmid: this.lastNotifiedSmid
    };
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    if (this.forceSyncDebounceId !== null) {
      clearTimeout(this.forceSyncDebounceId);
      this.forceSyncDebounceId = null;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    this.isVideoPlayerDetected = false;
    this.resetNotificationState();
    
    // Singletonインスタンスをクリア
    if (window.__CF2_BRIDGE__ === this) {
      delete window.__CF2_BRIDGE__;
    }
    
    window.logger?.info('[CommentFilter2] VideoPlayerBridge destroyed and resources cleaned up');
  }
} 