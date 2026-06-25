/**
 * Links Video Controller関連の型定義
 */

// 再生状態の型定義
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}

// シーク操作の型定義
export interface SeekOptions {
  seconds: number;
  direction: "forward" | "backward";
}

// 音量操作の型定義
export interface VolumeOptions {
  value: number;
  isLogarithmic?: boolean;
}

// 再生速度操作の型定義
export interface PlaybackRateOptions {
  value: number;
  min?: number;
  max?: number;
}

// コメント検索オプションの型定義
export interface CommentSearchOptions {
  enableRegexp: boolean;
  enableExtended: boolean;
}

// コメント検索結果の型定義
export interface CommentSearchResult {
  success: boolean;
  error?: string;
  results?: MlinkVideoComment[];
}

// Mlink Video Controller専用のコメント型定義
// 既存のCommentDataと区別するため、MlinkVideoCommentとして定義
export interface MlinkVideoComment {
  id?: string;
  no?: number;
  vposMs: number;
  body: string;
  userId?: string;
  postedAt?: string;
  commands?: string[];
  isPremium?: boolean;
  score?: number;
  nicoruCount?: number;
  nicoruId?: string;
  source?: string;
  isMyPost?: boolean;
}

// リンクグループの型定義
export type LinkGroup = "custom" | "services" | "dataManagement";

// リンクデータの型定義
export interface LinkData {
  id: string;
  title: string;
  icon: string;
  action: string;
  url?: string;
  disabled?: boolean;
  disabledReason?: string;
}

// ニコニコAPI関連の型定義
export interface NicoApiData {
  comment: {
    nvComment: {
      server: string;
      params: Record<string, unknown>;
      threadKey: string;
    };
  };
}

export interface NicoApiResponse {
  data: {
    response: NicoApiData;
  };
}

/**
 * アクション操作の型定義
 */
export type ActionType = string;

/**
 * アクションマップの型定義
 */
export interface ActionMap {
  [key: string]: string | (() => Promise<void> | void);
}
