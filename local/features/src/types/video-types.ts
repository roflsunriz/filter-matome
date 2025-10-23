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
  VOLUME: {
    DEFAULT: number;
    MIN: number;
    MAX: number;
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
  /** ユーザー任意のメモ */
  memo?: string;
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
export type VideoOperation = "cache_remove";

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
      like?: number;
    };
    thumbnail: {
      url: string;
    };
    registeredAt: string;
    duration: number;
    /** ニコ動の動画説明（任意） */
    description?: string;
    /** ウォッチページ用の短い説明（任意） */
    shortDescription?: string;
    /** いいね数 */
    likeCount?: number;
    /** 広告ポイント */
    advertisePoint?: number;
    /** ギフトポイント */
    giftPoint?: number;
    /** 有料判定用の視聴権限 */
    watchableUserTypeForPayment?: string;
    /** ジャンル情報 */
    genre?:
      | {
          id?: string;
          label?: string;
        }
      | string;
  };
  owner?: {
    id?: number | string;
    nickname: string;
    iconUrl?: string;
    userPageUrl?: string;
    description?: string;
  };
  channel?: {
    id?: number | string;
    name: string;
    iconUrl?: string;
    url?: string;
  };
  /** タグ情報（任意、watchページのみ想定） */
  tag?: {
    items?: Array<{
      name?: string;
      isCategory?: boolean;
      isCategoryCandidate?: boolean;
      isLocked?: boolean;
    }>;
    hasR18Tag?: boolean;
  };
  series?: {
    id?: string | number;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    current?: {
      id?: string;
      title?: string;
      thumbnailUrl?: string;
      description?: string;
    };
    next?: {
      id?: string;
      title?: string;
    };
    prev?: {
      id?: string;
      title?: string;
    };
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
  related?: {
    items?: Array<{
      id?: string;
      title?: string;
      thumbnail?: {
        url?: string;
      };
      registeredAt?: string;
      duration?: number;
      count?: {
        view?: number;
      };
    }>;
  };
  gift?: {
    totalPoint?: number;
  };
}

/**
 * ApiData型を拡張してisDefaultPostTargetプロパティを含む型
 */
export interface ExtendedApiData extends Omit<ApiData, "comment"> {
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
  | "play"
  | "pause"
  | "volume"
  | "muted"
  | "rewind10"
  | "forward10"
  | "comment"
  | "commentOff"
  | "fullscreen"
  | "exitFullscreen"
  | "settings";

/**
 * HLS.js関連の型定義
 */
export type HlsConstructor = (typeof import("hls.js"))["default"];
export type HlsInstance = InstanceType<HlsConstructor>;

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
