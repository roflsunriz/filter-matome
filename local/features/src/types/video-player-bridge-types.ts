/**
 * Video Player Bridge関連の型定義
 */

/**
 * Video Playerのコメント取得関数の引数型
 */
export type VideoPlayerGetCommentsArgs = readonly unknown[];

/**
 * Video Playerが期待するコメントデータの形式
 */
export interface VideoPlayerCommentData {
  vpos: number;
  vposMs?: number;
  body: string;
  userId: string;
  premium: boolean;
  isPremium?: boolean;
  [key: string]: unknown;
}

/**
 * Video Playerが期待するスレッドデータの形式
 */
export interface VideoPlayerThreadData {
  commentCount: number;
  fork: string;
  comments: VideoPlayerCommentData[];
  [key: string]: unknown;
}

/**
 * Video Playerが期待するレスポンス形式
 */
export interface VideoPlayerResponse {
  meta: {
    status: number;
    [key: string]: unknown;
  };
  data: {
    threads: VideoPlayerThreadData[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Video Playerインスタンスの型定義
 */
export interface VideoPlayerInstance {
  getComments: (...args: VideoPlayerGetCommentsArgs) => VideoPlayerResponse | Promise<VideoPlayerResponse>;
  [key: string]: unknown;
}

/**
 * Video Player Bridge の状態情報
 */
export interface VideoPlayerBridgeStatus {
  isVideoPlayerDetected: boolean;
  hasFilteredData: boolean;
  lastSync: number | null;
  hasSuccessfullyNotified?: boolean;
  lastNotifiedSmid?: string | null;
}

/**
 * Video Player Bridge インターフェース
 */
export interface IVideoPlayerBridge {
  forceSync(): void;
  getStatus(): VideoPlayerBridgeStatus;
  destroy(): void;
}

/**
 * カスタムイベントの詳細データ
 */
export interface CommentFilter2UpdateEventDetail {
  filteredData: VideoPlayerResponse;
  timestamp: number;
}

/**
 * Windowオブジェクトの拡張（Video Player関連）
 */
declare global {
  interface Window {
    videoPlayer?: VideoPlayerInstance;
  }
}

export {}; 