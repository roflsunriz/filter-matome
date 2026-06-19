/**
 * コメント関連の型定義
 */

// 他の型定義ファイルからのインポート
import type {
  SettingValue,
  CompatibleCommentFilter2GlobalData,
} from "./filter-types";


/**
 * コメントデータの型定義
 */
export interface CommentData {
  id?: string;
  no?: number;
  vpos: number;
  vposMs?: number;
  body: string;
  commands?: string[];
  userId: string;
  isPremium?: boolean;
  score?: number;
  postedAt?: number;
  nicoruCount?: number;
  nicoruId?: string;
  source?: string;
  fork?: string;
  threadId?: string;
  isMyPost?: boolean;
}

/**
 * コメントレンダラーで使用される拡張コメント型
 * CommentDataに加えて、レンダリング時に必要な追加プロパティを含む
 */
export interface Comment extends CommentData {
  vposMs: number; // optionalをなくして必須に
  startTime?: number; // 表示開始時間
  width?: number; // コメントの描画幅
  initialX?: number; // 初期X座標
  speed?: number; // 移動速度
  fixedY?: number; // 固定Y座標
  fixedLane?: number; // 固定レーン番号
  color?: string; // コメント色
  forceVisible?: boolean; // 強制表示フラグ
  group?: number; // グループID
  groupIndex?: number; // グループ内インデックス
}

/**
 * API用のコメントデータ型定義（必須プロパティを明確化）
 */
export interface ApiComment {
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
}

/**
 * コメントフィールド設定の型定義（UI表示用）
 */
export interface CommentField {
  key: keyof ApiComment;
  label: string;
  className: string;
  format?: (val: string | number | boolean | string[]) => string;
  isLast?: boolean;
}

/**
 * コメントスレッドの型定義
 */
export interface CommentThread {
  commentCount: number;
  fork: string;
  comments: CommentData[];
}

/**
 * APIレスポンスのスレッド型定義（フィルター用）
 */
export interface Thread {
  commentCount: number;
  fork: string;
  comments: CommentData[];
}

/**
 * API用のスレッド型定義（必須プロパティを明確化）
 */
export interface ApiThread {
  commentCount: number;
  fork: string;
  comments: ApiComment[];
}

/**
 * コメントAPIレスポンスの型定義
 */
export interface CommentApiResponse {
  data: {
    threads: CommentThread[];
  };
}

/**
 * APIレスポンスの型定義（フィルター用）
 */
export interface ApiResponse {
  data: {
    threads: Thread[];
  };
}

/**
 * API用のレスポンス型定義（必須プロパティを明確化）
 */
export interface NvCommentApiResponse {
  data: {
    threads: ApiThread[];
  };
}

/**
 * 設定値の型定義（様々な型を許可）
 */
// export type SettingValue = string | number | boolean | object | null | undefined; // filterTypes.tsから使用するため削除

/**
 * 設定オブジェクトの型定義
 */
export interface SettingsObject {
  [key: string]: SettingValue;
}

/**
 * データベースエクスポート/インポート用の型定義
 */
export interface DatabaseData {
  settings?: SettingsObject;
  modes?: SettingsObject;
  commands?: CommandsData;
  [key: string]: unknown;
}

/**
 * コマンドデータの型定義
 */
export interface CommandsData {
  [type: string]: string[] | object;
}

/**
 * APIパラメータの型定義
 */
export interface ApiParams {
  [key: string]: string | number | boolean | object;
}

/**
 * フィルター機能の基本インターフェース
 */
export interface FilterModule {
  init?(): void;
  destroy?(): void;
  process?(data: unknown): unknown;
  [key: string]: unknown;
}

/**
 * UI機能の基本インターフェース
 */
export interface UIModule {
  render?(): void;
  update?(): void;
  open?(): void;
  close?(): void;
  [key: string]: unknown;
}

/**
 * データベース機能の基本インターフェース
 */
export interface DatabaseModule {
  get?(key: string): Promise<unknown>;
  set?(key: string, value: unknown): Promise<void>;
  clear?(): Promise<void>;
  [key: string]: unknown;
}

/**
 * コメントAPIデータの型定義
 */
export interface CommentApiData {
  threadKey: string;
  params: ApiParams;
  server: string;
}

/**
 * コメントフィルターのデバッグ用インターフェース
 */
export interface CommentFilterDebug {
  getAllSettings(): Promise<SettingsObject>;
  getSetting(key: string): Promise<SettingValue>;
  setSetting(key: string, value: SettingValue): Promise<SettingValue>;
  exportDB(): Promise<DatabaseData>;
  importDB(jsonData: DatabaseData): Promise<DatabaseData>;
  clearDB(): Promise<void>;
  getMode(key: string): Promise<SettingValue>;
  setMode(key: string, value: SettingValue): Promise<SettingValue>;
  getCommands(type: string): Promise<CommandsData>;
  setCommands(type: string, commands: CommandsData): Promise<CommandsData>;
}

/**
 * コメントフィルターのメインインターフェース
 */
export interface CommentFilterInterface {
  filter: FilterModule;
  ui: UIModule;
  db: DatabaseModule;
  debug: CommentFilterDebug;
}

/**
 * video_player用のコメント型定義
 * video_playerで使用される基本的なコメント構造
 */
export interface VideoPlayerComment {
  vpos: number;
  vposMs?: number;
  body: string;
  userId: string;
  nicoruCount?: number;
  [key: string]: unknown; // 将来的な拡張性のため
}

// CommentFilter2GlobalDataは filterTypes.ts で定義済み（重複削除）

/**
 * CommentFilter2の安全なグローバルデータ型定義（型ガード後）
 */
export interface SafeCommentFilter2GlobalData {
  originalData: CommentApiResponse;
  filteredData: CommentApiResponse;
  currentSmid: string;
  lastUpdated: number;
}

/**
 * ウィンドウオブジェクトへのCommentFilter2データ拡張
 */
declare global {
  interface Window {
    commentFilter2GlobalData?: CompatibleCommentFilter2GlobalData;
    CommentFilter?: {
      filter: {
        processVideoPlayerComments: (
          comments: Comment[],
          videoId: string,
        ) => Promise<Comment[]>;
      };
    };
    CommentFilterState?: {
      isVideoPlayerActive: boolean;
      fetchProxyEnabled: boolean;
    };
  }
}
