// データ取得部（Proxy）
// ニコニコ動画公式動画プレイヤーが取得しているコメントデータを取得して改変して再送出するProxy
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  CF2CommentApiResponse,
  CommentFilter2GlobalData,
  CF2Thread,
  toCompatibleGlobalData,
} from "@/types/filter-types";
import { addNavigationListener } from "@/runtime/navigation";

// グローバル型定義は types/global.d.ts で管理されています
const COMMENT_FILTER_BYPASS_FLAG = "__commentFilter2Bypass";

export class DataInterceptor {
  private originalFetch: typeof fetch;
  private currentSmid: string | null = null;
  private removeNavigationListener: (() => void) | null = null;

  constructor() {
    this.originalFetch = window.fetch.bind(window);
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
      lastUpdated: 0,
    };

    window[CONSTANTS.GLOBAL_DATA_KEY] = globalData;

    // 後方互換用alias（任意）
    if (!window.commentFilter2GlobalData) {
      window.commentFilter2GlobalData = toCompatibleGlobalData(globalData);
    }

    // 初期SMID設定
    void this.updateCurrentSmid();
  }

  /**
   * SPA ナビゲーション対応セットアップ（他モジュールのフックと共存可能）
   */
  private setupSPANavigation(): void {
    this.removeNavigationListener = addNavigationListener(() => {
      setTimeout(() => void this.updateCurrentSmid(), 100);
    });

    window.logger?.debug(
      "[CommentFilter2] SPA navigation hooks initialized (chaining compatible)",
    );
  }

  /**
   * 現在のSMIDを更新
   */
  private async updateCurrentSmid(): Promise<void> {
    const newSmid = await this.extractSmidFromCurrentUrl();
    if (newSmid !== this.currentSmid) {
      const previousSmid = this.currentSmid;
      this.currentSmid = newSmid;

      // グローバルデータも更新
      const global = window[
        CONSTANTS.GLOBAL_DATA_KEY
      ] as CommentFilter2GlobalData;
      if (global) {
        global.currentSmid = newSmid;
      }

      // SMID変更イベントを発火
      window.dispatchEvent(
        new CustomEvent(CONSTANTS.EVENTS.SMID_CHANGED, {
          detail: { smid: newSmid, previousSmid },
        }),
      );

      window.logger?.debug(
        `[CommentFilter2] SMID updated due to SPA navigation: ${this.currentSmid}`,
      );
    }
  }

  /**
   * 現在のURLからSMIDを抽出（SPA対応版）
   * 共通ヘルパーのgetVideoIdWithFallbackを利用
   */
  private async extractSmidFromCurrentUrl(): Promise<string | null> {
    try {
      // window.commonHelper.getVideoIdWithFallbackはURL等から動画IDを抽出する
      const smid = await window.commonHelper?.getVideoIdWithFallback?.(
        window.location,
      );
      if (smid && typeof smid === "string") {
        return smid;
      }
      return null;
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] SMID extraction from current URL failed:",
        error,
      );
      return null;
    }
  }

  /**
   * fetchをインターセプトしてAPIデータを取得
   */
  private setupInterception(): void {
    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      let url: string;
      if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (typeof input === "string") {
        url = input;
      } else {
        url = "";
      }

      if (this.shouldBypassCommentFiltering(input, init)) {
        return this.originalFetch(input, this.stripBypassFlag(init));
      }

      // 対象エンドポイントをチェック
      if (url.includes(CONSTANTS.API_ENDPOINT)) {
        try {
          const response = await this.originalFetch(input, init);
          const clonedResponse = response.clone();

          // レスポンスデータを処理（unknown→最小限の形チェック後にキャスト）
          const dataRaw: unknown = await clonedResponse.json();
          if (!dataRaw || typeof dataRaw !== "object") {
            return response;
          }
          const processedData = await this.processCommentData(
            dataRaw as CF2CommentApiResponse,
            url,
          );

          // フィルタリング済みデータで新しいレスポンスを作成
          const filteredResponse = await this.createFilteredResponse(
            processedData,
            response,
          );

          return filteredResponse;
        } catch (error) {
          window.logger?.error(
            "[CommentFilter2] API interception failed:",
            error,
          );
          return this.originalFetch(input, init);
        }
      }

      return this.originalFetch(input, init);
    };
  }

  private shouldBypassCommentFiltering(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): boolean {
    void input;
    return (
      (init as RequestInit & { [COMMENT_FILTER_BYPASS_FLAG]?: boolean })?.[
        COMMENT_FILTER_BYPASS_FLAG
      ] === true
    );
  }

  private stripBypassFlag(init?: RequestInit): RequestInit | undefined {
    if (!init) {
      return init;
    }
    const cleanInit = {
      ...init,
    } as RequestInit & { [COMMENT_FILTER_BYPASS_FLAG]?: boolean };
    delete cleanInit[COMMENT_FILTER_BYPASS_FLAG];
    return cleanInit;
  }

  /**
   * コメントデータを処理してグローバルオブジェクトに保存
   */
  private async processCommentData(
    data: CF2CommentApiResponse,
    url: string,
  ): Promise<CF2CommentApiResponse> {
    try {
      // SMIDを抽出（URLパラメータから）
      const smid = await this.extractSmidFromUrl(url);

      // 公式動画の場合、commentCountが最多のmainスレッドを選択
      const processedData = this.selectMainThread(data);

      // グローバルオブジェクトに保存
      const global = window[
        CONSTANTS.GLOBAL_DATA_KEY
      ] as CommentFilter2GlobalData;
      global.originalData = processedData;
      global.currentSmid = smid;
      global.lastUpdated = Date.now();

      // データインターセプト情報：重要度は高いがAPIレスポンス毎に出るのでINFOレベル
      window.logger?.info("[CommentFilter2] Comment data intercepted:", {
        smid,
        threadsCount: processedData.data.threads.length,
        totalComments: processedData.data.threads.reduce(
          (sum, thread) => sum + thread.commentCount,
          0,
        ),
        currentUrl: window.location.href?.substring(0, 50) + "...", // URL短縮
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
      window.dispatchEvent(
        new CustomEvent(CONSTANTS.EVENTS.DATA_UPDATED, {
          detail: { smid, threadsCount: processedData.data.threads.length },
        }),
      );

      return filteredData;
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Comment data processing failed:",
        error,
      );
      return data; // エラー時は元データを返す
    }
  }

  /**
   * URLやwindowからSMID（動画ID）を抽出（共通ヘルパー利用・SPA対応）
   */
  private async extractSmidFromUrl(url: string): Promise<string | null> {
    try {
      // 1. キャッシュされたSMIDを優先使用（SPA遷移対応）
      if (this.currentSmid) {
        window.logger?.debug(
          `[CommentFilter2] Using cached SMID: ${this.currentSmid}`,
        );
        return this.currentSmid;
      }

      // 2. 共通ヘルパーで動画ID抽出（window.commonHelper.getVideoIdWithFallbackを利用）
      //    urlはフォールバック用引数として渡す
      if (typeof window.commonHelper?.getVideoIdWithFallback === "function") {
        const smid = await window.commonHelper.getVideoIdWithFallback(url);
        if (smid) {
          this.currentSmid = smid;
          window.logger?.debug(
            `[CommentFilter2] SMID extracted by commonHelper: ${smid}`,
          );
          return smid;
        }
      }

      window.logger?.warn("[CommentFilter2] Could not extract SMID:", {
        currentUrl: window.location.href?.substring(0, 50) + "...",
        apiUrl: url?.substring(0, 80) + "...",
      });
      return null;
    } catch (error) {
      window.logger?.error("[CommentFilter2] SMID extraction failed:", error);
      return null;
    }
  }

  /**
   * 公式動画でcommentCountが最多のmainスレッドを選択
   */
  private selectMainThread(data: CF2CommentApiResponse): CF2CommentApiResponse {
    const threads = data.data.threads;
    const mainThreads = threads.filter(
      (thread: CF2Thread) => thread.fork === CONSTANTS.FORK_TYPES.MAIN,
    );

    if (mainThreads.length > 1) {
      // commentCountが最多のスレッドを選択
      const selectedThread = mainThreads.reduce(
        (max: CF2Thread, current: CF2Thread) =>
          current.commentCount > max.commentCount ? current : max,
      );

      // 他のmainスレッドを除外
      const filteredThreads = threads.filter(
        (thread: CF2Thread) =>
          thread.fork !== CONSTANTS.FORK_TYPES.MAIN ||
          thread.id === selectedThread.id,
      );

      return {
        ...data,
        data: {
          ...data.data,
          threads: filteredThreads,
        },
      };
    }

    return data;
  }

  /**
   * インターセプションを無効化（デバッグ用）
   */
  public disable(): void {
    window.fetch = this.originalFetch;
    this.removeNavigationListener?.();
    this.removeNavigationListener = null;
    window.logger?.info("[CommentFilter2] All hooks disabled");
  }

  /**
   * データにフィルターを適用
   */
  private async applyFiltersToData(
    data: CF2CommentApiResponse,
    smid: string | null,
  ): Promise<CF2CommentApiResponse> {
    // フィルターヘルパーを使用（循環依存を回避）
    const { applyFiltersToData } = await import("../utils/filter-helper");
    return await applyFiltersToData(data, smid);
  }

  /**
   * フィルタリング済みデータで新しいレスポンスを作成
   */
  private async createFilteredResponse(
    filteredData: CF2CommentApiResponse,
    originalResponse: Response,
  ): Promise<Response> {
    await Promise.resolve();
    try {
      // フィルタリング済みデータをJSON文字列に変換
      const filteredJson = JSON.stringify(filteredData);

      // 新しいResponseオブジェクトを作成
      const newResponse = new Response(filteredJson, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });

      return newResponse;
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to create filtered response:",
        error,
      );
      return originalResponse; // エラー時は元のレスポンスを返す
    }
  }

  /**
   * 現在のグローバルデータを取得
   */
  public static getGlobalData(): CommentFilter2GlobalData | null {
    const data = window[CONSTANTS.GLOBAL_DATA_KEY];
    // 型安全性を保つため、データが存在し、必要なプロパティを持っているかチェック
    if (data && typeof data === "object" && "originalData" in data) {
      return data;
    }
    return null;
  }
}
