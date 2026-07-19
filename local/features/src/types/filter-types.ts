/**
 * フィルター関連の型定義
 */

// CommentDataをインポートするため
import type { CommentData } from "@/types/comment-types";

/**
 * 設定値の型定義
 */
export type SettingValue =
  string | number | boolean | object | (string | number | boolean | object)[];

/**
 * フィルター設定値の型定義
 */
export type FilterSettingValue = boolean | string | number | string[] | RegExp;

/**
 * フィルター設定のインターフェース
 */
export interface FilterSettings {
  DEBUG: boolean;
  lotOfNicorare: boolean;
  filterMode: "BlackList" | "WhiteList" | "Invisible";
  videoId: string;
  userId: string;
  commandList: string[];
  nicorareThreshold: number;
  filterEnabled: boolean;
  [key: string]: FilterSettingValue; // インデックスシグネチャを具体的な型に変更
}

/**
 * コマンド設定のインターフェース
 */
export interface CommandSettings {
  owner: string[]; // 投稿者コメント用コマンド
  main: string[]; // メインコメント用コマンド
  easy: string[]; // 簡単コメント用コマンド
  normal: string[]; // 通常コメント用コマンド
  [key: string]: string[]; // インデックス署名を追加
}

// FilterCommentをCommentDataの拡張として定義（フィルター用のComment型）
export interface FilterComment extends CommentData {
  body: string;
  userId: string;
  nicoruCount?: number;
  commands?: string[];
  isPremium?: boolean;
  vposMs?: number;
  [key: string]: unknown; // 既存のコードを壊さないため暫定措置だが、any より安全な unknown を使用
}

/**
 * フィルター結果のインターフェース
 */
export interface FilterResult {
  comment: FilterComment;
  filtered: boolean;
  filterReasons: string[];
  originalBody: string;
}

/**
 * フィルター詳細結果のインターフェース
 */
export interface FilterDetailResult {
  type: string;
  value: string | null;
}

/**
 * フィルターログのインターフェース
 */
export interface FilterLog {
  title: string;
  userId: string;
  comment: string;
  reasons: string[];
  videoId?: string;
  filterDetails?: FilterDetailResult[];
}

/**
 * CommentFilter2用フィルターログエントリーの型
 */
export interface CF2FilterLogEntry {
  title: string;
  userId: string;
  comment: string;
  videoId: string;
  reasons: string[];
  filterDetails: Array<{
    type: string;
    value: string | null;
  }>;
}

// ===== CommentFilter2 関連の型定義 =====

/**
 * CommentFilter2用コメントデータの型
 */
export interface CF2Comment {
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
  nicoruId: string | null;
  source: string;
  isMyPost: boolean;
}

/**
 * CommentFilter2用スレッドデータの型
 */
export interface CF2Thread {
  id: string;
  fork: "main" | "easy" | "owner";
  commentCount: number;
  comments: CF2Comment[];
}

/**
 * CommentFilter2用グローバルコメントデータの型
 */
export interface CF2GlobalComment {
  id: string;
  count: number;
}

/**
 * CommentFilter2用APIレスポンスの型
 */
export interface CF2CommentApiResponse {
  meta: {
    status: number;
  };
  data: {
    globalComments?: CF2GlobalComment[];
    threads: CF2Thread[];
  };
}

/**
 * CommentFilter2用NGワードルールの型
 */
export interface NGWordRule {
  regex?: string; // 正規表現パターン（ユーザーIDルールの場合は未定義）
  regexFlags?: string; // 正規表現フラグ（g、iなど）
  replace?: string; // 置換文字列（ユーザーIDルールの場合は未定義）
  smid: string; // 動画SMID（ALLまたは特定のSMID）
  nicoru: number | "EMPTY"; // ニコる数閾値
  userId?: string; // ユーザーID（@ルール用、完全一致）
  isUserIdRule?: boolean; // ユーザーIDルールかどうかのフラグ
}

/**
 * CommentFilter2用設定の型
 */
export interface Settings {
  debugMode: boolean;
  isEnabled: boolean;
  commandSettings: CommandSettings;
  clearExistingCommands: boolean;
  logToCommentFilterLogger?: boolean; // CommentFilterLogger.javaへのログ送信を有効にするか
}

/**
 * CommentFilter2用IndexedDBデータの型
 */
export interface FilterDatabase {
  rules: NGWordRule[];
  settings: Settings;
}

/**
 * CommentFilter2用グローバルオブジェクトの型
 */
export interface CommentFilter2GlobalData {
  originalData: CF2CommentApiResponse | null;
  filteredData: CF2CommentApiResponse | null;
  currentSmid: string | null;
  lastUpdated: number;
}

// ===== レガシー変換関連の型定義 =====

/**
 * レガシーデータ判定用の型（安全にanyを避けるため）
 */
export type UnknownData = Record<string, unknown>;

/**
 * レガシー変換結果の型定義
 */
export interface LegacyConversionResult {
  rules: NGWordRule[];
  settings: Settings;
  conversionLog: string[];
}

// ===== 型変換ヘルパー関数 =====

/**
 * CommentFilter2GlobalDataの互換型定義（video_player用）
 * 異なる型定義間での安全な変換を可能にする
 */
export interface CompatibleCommentFilter2GlobalData {
  originalData: CF2CommentApiResponse | null;
  filteredData: CF2CommentApiResponse | null;
  currentSmid: string | null;
  lastUpdated: number;
}

/**
 * CommentFilter2GlobalDataを互換性のある型に安全に変換
 */
export function toCompatibleGlobalData(
  data: CommentFilter2GlobalData,
): CompatibleCommentFilter2GlobalData {
  return {
    originalData: data.originalData,
    filteredData: data.filteredData,
    currentSmid: data.currentSmid,
    lastUpdated: data.lastUpdated,
  };
}

// JSON Lines形式の新しいルール定義
export interface ActionHide {
  type: "hide";
}

export interface ActionReplace {
  type: "replace";
  replacement: string;
}

export interface ActionUnspecified {
  type: "unspecified";
}

export type Action = ActionHide | ActionReplace | ActionUnspecified;

export interface NicoruCond {
  op: "=" | ">" | "<" | ">=" | "<=" | "range";
  value: number | [number, number];
  mode?: "include" | "exclude"; // default: "exclude"
}

export interface UserIdCond {
  userId: string;
  mode?: "include" | "exclude"; // default: "exclude"
}

export interface NgRuleJson {
  // 基本パターン（正規表現またはユーザーID）
  pattern?: string;
  flags?: string;
  userId?: string;

  // 実行アクション
  action: Action;

  // 適用条件
  smid: string[]; // ["ALL"] or ["sm123", "sm456"]
  nicoru_cond?: NicoruCond;

  // メタデータ
  id?: string;
  description?: string;
  enabled?: boolean; // default: true
}

// バージョン管理用
export interface NgRuleJsonCollection {
  version: "3.0";
  rules: NgRuleJson[];
  settings?: Settings; // 設定（コメントコマンド設定を含む）
  metadata?: {
    exportedAt: string;
    exportedBy: string;
    totalRules: number;
  };
}

// 移行用の互換性インターフェース
export interface MigrationResult {
  success: boolean;
  migratedRules: NgRuleJson[];
  errors: string[];
  warnings: string[];
  originalCount: number;
  migratedCount: number;
}

// === マイグレーション機能関連の型定義 ===

/**
 * マイグレーションイベントの詳細情報
 */
export interface MigrationEventDetails {
  fromBackup?: boolean;
  backupTimestamp?: string;
  backupVersion?: number;
  fromVersion?: number;
  toVersion?: number;
  steps?: string[];
  rulesOptimized?: boolean;
  originalCount?: number;
  optimizedCount?: number;
  migratedAt?: string;
  migratedRulesCount?: number;
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * マイグレーション履歴記録
 */
export interface MigrationHistoryRecord {
  key: string;
  eventType: string;
  timestamp: string;
  details: MigrationEventDetails;
  version: number;
}

/**
 * 設定項目の値型
 */
export interface SettingStorageItem {
  key: string;
  eventType?: string;
  timestamp?: string;
  details?: MigrationEventDetails;
  version?: number;
  [key: string]: unknown;
}

/**
 * 設定ストレージの型定義
 */
export interface SettingsStorage {
  [key: string]: SettingStorageItem;
}
