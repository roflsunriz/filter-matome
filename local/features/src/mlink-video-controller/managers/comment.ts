import { NicoApiFetcher } from './nico-api-fetcher';
import { MlinkVideoComment, CommentSearchResult, CommentSearchOptions } from '@/types/mlink-video-controller-types';

export class CommentManager {
  private static instance: CommentManager;
  private apiFetcher: NicoApiFetcher;
  private searchOptions: CommentSearchOptions = {
    enableRegexp: false,
    enableExtended: false
  };
  private currentVideoId: string | null = null;
  private eventListeners: Array<() => void> = [];
  // URL 監視のクリーンアップ用ハンドラを保持
  private cleanupHandlers: Array<() => void> = [];
  // URL監視が重複しないようにするフラグ
  private isWatchingUrl: boolean = false;

  private constructor() {
    this.apiFetcher = NicoApiFetcher.getInstance();
  }

  public static getInstance(): CommentManager {
    if (!CommentManager.instance) {
      CommentManager.instance = new CommentManager();
    }
    return CommentManager.instance;
  }

  private extractVideoIdFromUrl(): string | null {
    // 統一された動画ID抽出処理を使用
    return window.commonHelper?.getVideoIdWithFallback() ?? null;
  }

  public async fetchComments(videoId?: string): Promise<boolean> {
    const effectiveVideoId = videoId || this.extractVideoIdFromUrl();
    if (!effectiveVideoId) {
      window.logger?.warn('動画IDが指定されていません');
      return false;
    }

    // 同じ動画IDの場合はスキップ
    if (this.currentVideoId === effectiveVideoId) {
      window.logger?.debug('同じ動画IDのため、コメント取得をスキップしました:', effectiveVideoId);
      return true;
    }

    try {
      window.logger?.info('コメントを取得中:', effectiveVideoId);
      const success = await this.apiFetcher.fetchAll(effectiveVideoId);
      if (!success) {
        window.logger?.warn('コメントの取得に失敗しました (APIレスポンスなし):', effectiveVideoId);
        return false;
      }

      this.currentVideoId = effectiveVideoId;
      this.notifyDataChanged();
      return true;
    } catch (error) {
      window.logger.error('コメントの取得に失敗しました:', error);
      return false;
    }
  }

  public getComments(): MlinkVideoComment[] {
    return this.apiFetcher.getComments();
  }

  public getCommentsCountAtTime(timeMs: number): number {
    return this.apiFetcher.getCommentsCountAtTime(timeMs);
  }

  public searchComments(query: string): CommentSearchResult {
    try {
      const results = this.apiFetcher.searchComments(query, {
        enableRegexp: this.searchOptions.enableRegexp
      });

      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '検索に失敗しました'
      };
    }
  }

  public setSearchOptions(options: Partial<CommentSearchOptions>): void {
    this.searchOptions = {
      ...this.searchOptions,
      ...options
    };
  }

  public getSearchOptions(): CommentSearchOptions {
    return { ...this.searchOptions };
  }

  public getCommentDensityData(segments: number = 100): { time: number; count: number }[] {
    return this.apiFetcher.getCommentDensityData(segments);
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  public onDataChanged(callback: () => void): () => void {
    this.eventListeners.push(callback);
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  private notifyDataChanged(): void {
    this.eventListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        window.logger?.error('データ変更通知でエラーが発生しました:', error);
      }
    });
  }

  public startUrlWatching(): void {
    if (this.isWatchingUrl) {
      return; // すでに監視中なら二重登録しない
    }

    this.isWatchingUrl = true;

    // URLの変更を監視してコメントデータを自動更新
    const checkUrl = () => {
      const currentVideoId = this.extractVideoIdFromUrl();
      if (currentVideoId && currentVideoId !== this.currentVideoId) {
        window.logger?.info('URL変更を検出、コメントを再取得:', currentVideoId);
        this.fetchComments(currentVideoId)
          .then(success => {
            if (!success) {
              window.logger?.warn('URL変更時のコメント取得に失敗:', currentVideoId);
            }
          })
          .catch(error => {
            window.logger?.error('URL変更時のコメント取得処理で予期しないエラー:', error);
          });
      }
    };

    // popstateイベント（戻る/進むボタン）を監視
    const popstateListener = () => {
      setTimeout(checkUrl, 100); // DOM更新を待つ
    };
    window.addEventListener('popstate', popstateListener);

    // =============================================
    // 🚀 pushState/replaceState フック (SPA遷移対策)
    // =============================================
    const patchHistoryMethod = (type: 'pushState' | 'replaceState') => {
      type HistoryMethod = History['pushState']; // pushState と replaceState は同じシグネチャ

      // インデックスアクセスで型が落ちるため一旦キャスト
      const historyObj = history as History & {
        pushState: HistoryMethod;
        replaceState: HistoryMethod;
      };

      const original: HistoryMethod = historyObj[type];
      if (!original) return;

      historyObj[type] = (...args: Parameters<HistoryMethod>) => {
        const result = original.apply(historyObj, args);
        // カスタムイベントを発火
        window.dispatchEvent(new Event('ml-location-change'));
        return result;
      };
    };

    const win = window as Window & { __mlink_comment_history_patched?: boolean };

    if (!win.__mlink_comment_history_patched) {
      patchHistoryMethod('pushState');
      patchHistoryMethod('replaceState');

      // popstate でも同じイベントを呼ぶ
      window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('ml-location-change'));
      });

      win.__mlink_comment_history_patched = true;
    }

    // カスタムイベントでURL変更を検知
    const locationChangeListener = () => {
      setTimeout(checkUrl, 100);
    };
    window.addEventListener('ml-location-change', locationChangeListener);

    // MutationObserver でもDOM更新を検知（後方互換）
    const observer = new MutationObserver(() => {
      setTimeout(checkUrl, 100); // DOM更新を待つ
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // クリーンアップ関数を記録（データ変更通知とは切り離す）
    this.cleanupHandlers.push(() => {
      window.removeEventListener('popstate', popstateListener);
      window.removeEventListener('ml-location-change', locationChangeListener);
      observer.disconnect();
    });
  }
} 


