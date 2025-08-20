// データ取得部（Proxy）
import { CONSTANTS } from '../utils/constants';
import { CF2CommentApiResponse, CommentFilter2GlobalData, CF2Thread, toCompatibleGlobalData } from '@/types/filter-types';

// グローバル型定義は types/global.d.ts で管理されているのじゃ

export class DataInterceptor {
  private originalFetch: typeof fetch;
  private originalPushState: typeof history.pushState;
  private originalReplaceState: typeof history.replaceState;
  private currentSmid: string | null = null;

  constructor() {
    this.originalFetch = window.fetch.bind(window);
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
    this.setupInterception();
    this.setupSPANavigation();
    this.initializeGlobalData();
  }

  /**
   * グローバルデータオブジェクトを初期化
   */
  private initializeGlobalData(): void {
    const globalData: CommentFilter2GlobalData = {
      originalData: null,
      filteredData: null,
      currentSmid: null,
      lastUpdated: 0
    };
    
    window[CONSTANTS.GLOBAL_DATA_KEY] = globalData;
    
    // 後方互換用alias（任意）
    if (!window.commentFilter2GlobalData) {
      window.commentFilter2GlobalData = toCompatibleGlobalData(globalData);
    }
    
    // 初期SMID設定
    this.updateCurrentSmid();
  }

  /**
   * SPA ナビゲーション対応セットアップ
   */
  private setupSPANavigation(): void {
    // History API をフック
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      this.originalPushState(...args);
      // pushState 後に SMID を更新
      setTimeout(() => this.updateCurrentSmid(), 0);
    };

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      this.originalReplaceState(...args);
      // replaceState 後に SMID を更新
      setTimeout(() => this.updateCurrentSmid(), 0);
    };

    // popstate イベント（ブラウザの戻る/進む）
    window.addEventListener('popstate', () => {
      setTimeout(() => this.updateCurrentSmid(), 0);
    });

    window.logger?.debug('[CommentFilter2] SPA navigation hooks initialized');
  }

  /**
   * 現在のSMIDを更新
   */
  private updateCurrentSmid(): void {
    const newSmid = this.extractSmidFromCurrentUrl();
    if (newSmid !== this.currentSmid) {
      this.currentSmid = newSmid;
      
      // グローバルデータも更新
      const global = window[CONSTANTS.GLOBAL_DATA_KEY] as CommentFilter2GlobalData;
      if (global) {
        global.currentSmid = newSmid;
      }
      
      // SMID変更イベントを発火
      window.dispatchEvent(new CustomEvent(CONSTANTS.EVENTS.SMID_CHANGED, {
        detail: { smid: newSmid, previousSmid: this.currentSmid }
      }));
      
      window.logger?.debug(`[CommentFilter2] SMID updated due to SPA navigation: ${this.currentSmid}`);
    }
  }

  /**
   * 現在のURLからSMIDを抽出（SPA対応版）
   */
  private extractSmidFromCurrentUrl(): string | null {
    try {
      const currentUrl = window.location.href;
      
      // ニコニコ動画の視聴ページ形式: /watch/sm123456 (大文字小文字無視)
      const smidMatch = currentUrl.match(/\/watch\/([a-z]{2}\d+)/i);
      
      if (smidMatch) {
        return smidMatch[1];
      }
      
      return null;
    } catch (error) {
      window.logger?.error('[CommentFilter2] SMID extraction from current URL failed:', error);
      return null;
    }
  }

  /**
   * fetchをインターセプトしてAPIデータを取得
   */
  private setupInterception(): void {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url: string;
      if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (typeof input === 'string') {
        url = input;
      } else {
        url = '';
      }
      
      // 対象エンドポイントをチェック
      if (url.includes(CONSTANTS.API_ENDPOINT)) {
        try {
          const response = await this.originalFetch(input, init);
          const clonedResponse = response.clone();
          
          // レスポンスデータを処理（unknown→最小限の形チェック後にキャスト）
          const dataRaw: unknown = await clonedResponse.json();
          if (!dataRaw || typeof dataRaw !== 'object') {
            return response;
          }
          const processedData = await this.processCommentData(dataRaw as CF2CommentApiResponse, url);
          
          // フィルタリング済みデータで新しいレスポンスを作成
          const filteredResponse = await this.createFilteredResponse(processedData, response);
          
          return filteredResponse;
        } catch (error) {
          window.logger?.error('[CommentFilter2] API interception failed:', error);
          return this.originalFetch(input, init);
        }
      }
      
      return this.originalFetch(input, init);
    };
  }

  /**
   * コメントデータを処理してグローバルオブジェクトに保存
   */
  private async processCommentData(data: CF2CommentApiResponse, url: string): Promise<CF2CommentApiResponse> {
    try {
      // SMIDを抽出（URLパラメータから）
      const smid = this.extractSmidFromUrl(url);
      
      // 公式動画の場合、commentCountが最多のmainスレッドを選択
      const processedData = this.selectMainThread(data);
      
      // グローバルオブジェクトに保存
      const global = window[CONSTANTS.GLOBAL_DATA_KEY] as CommentFilter2GlobalData;
      global.originalData = processedData;
      global.currentSmid = smid;
      global.lastUpdated = Date.now();
      
      // データインターセプト情報：重要度は高いがAPIレスポンス毎に出るのでINFOレベル
      window.logger?.info('[CommentFilter2] Comment data intercepted:', {
        smid,
        threadsCount: processedData.data.threads.length,
        totalComments: processedData.data.threads.reduce((sum, thread) => sum + thread.commentCount, 0),
        currentUrl: window.location.href?.substring(0, 50) + '...' // URL短縮
      });
      
      // デバッグ用テーブル表示は大量ログ回避のため無効化
      // if (smid) {
      //   window.logger.table([{
      //     '項目': 'Current SMID',
      //     '値': smid,
      //     'URL': window.location.href
      //   }]);
      // }
      
      // フィルタリングを実行
      const filteredData = await this.applyFiltersToData(processedData, smid);
      
      // フィルタリング済みデータもグローバルオブジェクトに保存
      global.filteredData = filteredData;
      
      // コメントデータ更新イベントを発火
      window.dispatchEvent(new CustomEvent(CONSTANTS.EVENTS.DATA_UPDATED, {
        detail: { smid, threadsCount: processedData.data.threads.length }
      }));
      
      return filteredData;
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Comment data processing failed:', error);
      return data; // エラー時は元データを返す
    }
  }

  /**
   * URLからSMIDを抽出（SPA対応強化版）
   */
  private extractSmidFromUrl(url: string): string | null {
    try {
      // 1. キャッシュされたSMIDを優先使用（SPA遷移対応）
      if (this.currentSmid) {
        window.logger?.debug(`[CommentFilter2] Using cached SMID: ${this.currentSmid}`);
        return this.currentSmid;
      }
      
      // 2. 現在のページURLから直接SMIDを抽出
      const currentUrl = window.location.href;
      const smidMatch = currentUrl.match(/\/watch\/([a-z]{2}\d+)/i);
      
      if (smidMatch) {
        const smid = smidMatch[1];
        this.currentSmid = smid; // キャッシュに保存
        window.logger?.debug(`[CommentFilter2] SMID extracted from URL: ${smid}`);
        return smid;
      }
      
      // 3. APIリクエストURLからの抽出も試行（フォールバック）
      const apiSmidMatch = url.match(/threadId=([^&]+)/);
      if (apiSmidMatch) {
        // threadIdから推定（必要に応じて変換ロジックを追加）
        window.logger?.debug(`[CommentFilter2] ThreadId found in API URL: ${apiSmidMatch[1]}`);
      }
      
      window.logger?.warn('[CommentFilter2] Could not extract SMID:', {
        currentUrl: currentUrl?.substring(0, 50) + '...',
        apiUrl: url?.substring(0, 80) + '...'
      });
      return null;
    } catch (error) {
      window.logger?.error('[CommentFilter2] SMID extraction failed:', error);
      return null;
    }
  }

  /**
   * 公式動画でcommentCountが最多のmainスレッドを選択
   */
  private selectMainThread(data: CF2CommentApiResponse): CF2CommentApiResponse {
    const threads = data.data.threads;
    const mainThreads = threads.filter((thread: CF2Thread) => thread.fork === CONSTANTS.FORK_TYPES.MAIN);
    
    if (mainThreads.length > 1) {
      // commentCountが最多のスレッドを選択
      const selectedThread = mainThreads.reduce((max: CF2Thread, current: CF2Thread) => 
        current.commentCount > max.commentCount ? current : max
      );
      
      // 他のmainスレッドを除外 
      const filteredThreads = threads.filter((thread: CF2Thread) => 
        thread.fork !== CONSTANTS.FORK_TYPES.MAIN || thread.id === selectedThread.id
      );
      
      return {
        ...data,
        data: {
          ...data.data,
          threads: filteredThreads
        }
      };
    }
    
    return data;
  }

  /**
   * インターセプションを無効化（デバッグ用）
   */
  public disable(): void {
    window.fetch = this.originalFetch;
    history.pushState = this.originalPushState;
    history.replaceState = this.originalReplaceState;
    window.logger?.info('[CommentFilter2] All hooks disabled');
  }

  /**
   * データにフィルターを適用
   */
  private async applyFiltersToData(data: CF2CommentApiResponse, smid: string | null): Promise<CF2CommentApiResponse> {
    // フィルターヘルパーを使用（循環依存を回避）
    const { applyFiltersToData } = await import('../utils/filter-helper');
    return await applyFiltersToData(data, smid);
  }

  /**
   * フィルタリング済みデータで新しいレスポンスを作成
   */
  private async createFilteredResponse(filteredData: CF2CommentApiResponse, originalResponse: Response): Promise<Response> {
    await Promise.resolve();
    try {
      // フィルタリング済みデータをJSON文字列に変換
      const filteredJson = JSON.stringify(filteredData);
      
      // 新しいResponseオブジェクトを作成
      const newResponse = new Response(filteredJson, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers
      });
      
      return newResponse;
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to create filtered response:', error);
      return originalResponse; // エラー時は元のレスポンスを返す
    }
  }

  /**
   * 現在のグローバルデータを取得
   */
  public static getGlobalData(): CommentFilter2GlobalData | null {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    // 型安全性を保つため、データが存在し、必要なプロパティを持っているかチェック
    if (data && typeof data === 'object' && 'originalData' in data) {
      return data;
    }
    return null;
  }
} 