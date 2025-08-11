/**
 * 動画関連の型定義
 */

/**
 * プレイヤー設定の型定義
 */
export interface PlayerSettings {
  CONTROLS_MODE: {
    ALWAYS: string;
    HOVER: string;
  };
  COMMENT: {
    OPACITY: {
      DEFAULT: number;
      MIN: number;
      MAX: number;
      STEP: number;
    };
    COLORS: {
      WHITE: string;
      RED: string;
      BLUE: string;
      GREEN: string;
      YELLOW: string;
      CYAN: string;
      MAGENTA: string;
      ORANGE: string;
      PURPLE: string;
    };
    NG: {
      MAX_WORDS: number;
      MAX_REGEX: number;
    };
  };
}

/**
 * 動画情報の型定義
 */
export interface VideoInfo {
  id: string;
  title: string;
  viewCount: number;
  commentCount: number;
  mylistCount: number;
  thumbnailUrl: string;
  uploadedAt: number;
  authorName: string;
  length: number;
  /** 動画説明（任意） */
  description?: string;
  /** タグ配列（任意） */
  tags?: string[];
}

/**
 * 動画URL情報の型定義
 */
export interface VideoUrlInfo {
  auto: string;
  ref: string;
  hls?: string;
  mp4?: string;
  customHls?: string;
  customMp4?: string;
}

/**
 * シンプルな動画情報の型定義
 */
export interface SimpleVideoInfo {
  videoId: string;
  threadId: string;
  title: string;
}

/**
 * データベースに保存する動画の型定義
 */
export interface DBVideo extends VideoInfo {
  originalId: string;
  mylistId: number;
  addedAt: number;
}

/**
 * 古い形式の動画情報
 */
export interface LegacyVideo {
  vid: string;
  title?: string;
  view_counter?: string | number;
  comment_num?: string | number;
  mylist_counter?: string | number;
  thumbUrl?: string;
  first_retrieve?: number;
  author?: string;
}

/**
 * 動画操作の種類
 */
export type VideoOperation = 'cache_remove';

/**
 * NicoCache_nl.watch.apiDataの型定義
 */
export interface ApiData {
  video: {
    id: string;
    title: string;
    count: {
      view: number;
      comment: number;
      mylist: number;
    };
    thumbnail: {
      url: string;
    };
    registeredAt: string;
    duration: number;
    /** ニコ動の動画説明（任意） */
    description?: string;
  };
  owner?: {
    nickname: string;
  };
  channel?: {
    name: string;
  };
  /** タグ情報（任意、watchページのみ想定） */
  tag?: {
    items?: Array<{
      name?: string;
      [key: string]: unknown;
    }>;
    hasR18Tag?: boolean;
    [key: string]: unknown;
  };
  payment?: {
    video: {
      watchableUserType: string;
    };
  };
  comment?: {
    threads?: Array<{
      id: string;
      fork: string;
    }>;
    nvComment?: {
      threadKey: string;
      server: string;
      params: object;
    };
  };
}

/**
 * ApiData型を拡張してisDefaultPostTargetプロパティを含む型
 */
export interface ExtendedApiData extends Omit<ApiData, 'comment'> {
  comment?: {
    threads?: Array<{
      id: string;
      fork: string;
      isDefaultPostTarget?: boolean;
    }>;
    nvComment?: {
      threadKey: string;
      server: string;
      params: object;
    };
  };
}

/**
 * プレイヤーアイコンの種類
 */
export type PlayerIconKey = 
  | 'play' 
  | 'pause' 
  | 'volume' 
  | 'muted' 
  | 'rewind10' 
  | 'forward10' 
  | 'comment' 
  | 'commentOff' 
  | 'fullscreen' 
  | 'exitFullscreen' 
  | 'settings'; 

/**
 * HLS.jsライブラリの型定義
 */
declare global {
  const Hls: {
    isSupported(): boolean;
    Events: {
      ERROR: string;
      MANIFEST_PARSED: string;
      MEDIA_ATTACHED: string;
    };
    new(): {
      on(event: string, callback: (...args: unknown[]) => void): void;
      loadSource(url: string): void;
      attachMedia(element: HTMLVideoElement): void;
      destroy(): void;
    };
  };
}

/**
 * HLS.jsインスタンスの型定義
 */
export interface HlsInstance {
  on(event: string, callback: (...args: unknown[]) => void): void;
  loadSource(url: string): void;
  attachMedia(element: HTMLVideoElement): void;
  destroy(): void;
}

/**
 * キャッシュ情報APIレスポンスの型定義
 */
export interface CacheInfoResponse {
  [videoId: string]: {
    preferred?: string;
    caches?: {
      [cacheId: string]: {
        title: string;
        [key: string]: unknown;
      };
    };
    [key: string]: unknown;
  };
}

/**
 * キャッシュURL取得結果の型定義
 */
export interface CacheUrlResult {
  url: string;
  isHLS: boolean;
  title: string;
}

/**
 * 削除動画検出器の状態型定義
 */
export interface DeletedVideoDetectorStatus {
  enabled: boolean;
  initialized: boolean;
} 