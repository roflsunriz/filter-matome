/**
 * 共通モジュール関連の型定義
 */

export interface HeaderConfig {
  title?: string;
  showSearch?: boolean;
  showMoreLinks?: boolean;
  enableFixedMode?: boolean;
  customLinks?: Array<{ text: string; url: string; target?: string }>;
}

export interface CommonHeaderInstance {
  setTitle(title: string): void;
  toggleFixedMode(enabled: boolean): void;
  destroy(): void;
}

/**
 * ニコニコ動画のAPIデータ関連の型定義
 */

// コメントAPIのリクエストパラメータ
export interface NvCommentParams {
  targets: Array<{
    id: string;
    fork: string;
  }>;
  language: string;
}

// コメントAPIのスレッドキー
export interface NvCommentThreadKey {
  threadkey: string;
  force184: string;
}

// サーバーレスポンスの基本構造
export interface NicoApiServerResponse {
  data: {
    response: NicoApiData;
  };
}

// ニコニコ動画のAPIデータ
export interface NicoApiData {
  comment: {
    nvComment: {
      server: string;
      params: NvCommentParams;
      threadKey: NvCommentThreadKey;
    };
  };
  video: {
    description: string;
    [key: string]: unknown;
  };
  series?: {
    video: {
      next: {
        id: string;
      };
    };
  };
  [key: string]: unknown;
}

// コメントスレッドデータ
export interface CommentThread {
  id: string;
  fork: string;
  commentCount: number;
  comments: CommentData[];
}

// コメントデータ
export interface CommentData {
  id: string;
  no: number;
  vposMs: number;
  body: string;
  commands: string[];
  userId: string;
  isPremium: boolean;
  score: number;
  postedAt: string;
  nicoruCount: number;
  nicoruId: string;
  source: string;
  isMyPost: boolean;
  fork?: string;
  threadId?: string;
}

// コメントAPIレスポンス
export interface CommentApiResponse {
  data: {
    threads: CommentThread[];
  };
}

// 統合データ（APIデータ + コメントデータ）
export interface IntegratedNicoData {
  apiData: NicoApiData;
  threads: CommentThread[];
  comments: CommentData[];
  mainThread: CommentThread;
}

// fetch関数のオプション
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  bypassCommentFilter?: boolean;
}

export interface FetchNicoCommentsOptions {
  bypassCommentFilter?: boolean;
}

// fetchWatchPageの結果（拡張版）
export interface ExtendedFetchWatchPageResult {
  serverContext: unknown;
  serverResponse: unknown;
  apiData: NicoApiData;
}
