/**
 * データベース関連の型定義
 */

// モード値の型（配列も含む）
export type ModeValue = string | boolean | number | string[];

// コマンド値の型
export type CommandsValue = string | string[];

// ストア設定のインターフェース
export interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: Array<{
    name: string;
    unique?: boolean;
  }>;
}

// ストア設定のコレクション
export interface StoresConfig {
  [key: string]: StoreConfig;
}

// 配列として扱うべき設定キーのセット
export const ARRAY_FIELD_KEYS: Set<string> = new Set([
  "NGRegex",
  "OKRegex",
  "superNgRegex",
  "replaceRules",
  "superNgReplaceRules",
  "userIdFilters",
  "excludeUserIds",
  "superUserIdFilters",
  "excludeMovieIds",
  "NGWord",
  "OKWord",
  "superNgWords",
  "specificNgUsers",
  "specificNgWords",
]);

/**
 * CommentFilter2用IndexedDBアイテムの型定義
 */
export interface IndexedDBRuleItem {
  id?: number; // IndexedDBの自動インクリメントID
  regex?: string; // 正規表現パターン
  regexFlags?: string; // 正規表現フラグ
  replace?: string; // 置換文字列
  smid: string; // 動画SMID
  nicoru: number | "EMPTY"; // ニコる数閾値
  userId?: string; // ユーザーID
  isUserIdRule?: boolean; // ユーザーIDルールかどうか
}

/**
 * CommentFilter2用IndexedDB設定アイテムの型定義
 */
export interface IndexedDBSettingsItem {
  key: string; // 設定キー
  debugMode: boolean; // デバッグモード
  isEnabled: boolean; // 有効/無効
  commandSettings: {
    // コマンド設定
    owner: string[];
    main: string[];
    easy: string[];
  };
}

/**
 * 永続化昇格機能用の追加型定義
 */

// マイグレーション結果
export interface MigrationResult {
  success: boolean;
  error?: string;
  version?: number;
  backupCreated?: boolean;
}

// データベース統計情報
export interface DatabaseStats {
  totalRecords: number;
  storeStats: Record<string, number>;
  dbSize: number;
  lastCleanup?: Date;
  migrationHistory?: MigrationRecord[];
}

// マイグレーション記録
export interface MigrationRecord {
  version: number;
  description: string;
  executedAt: Date;
  success: boolean;
  error?: string;
}

// データベース設定
export interface DatabaseConfig {
  name: string;
  version: number;
  migrationBatchSize: number;
  backupRetentionDays: number;
  cleanupIntervalHours: number;
}

// クリーンアップ設定
export interface CleanupConfig {
  viewHistoryDays: number;
  commentHistoryDays: number;
  cacheExpireDays: number;
  statsRetentionMonths: number;
}

// バックアップデータ
export interface BackupData {
  version: number;
  timestamp: string;
  stores: Record<string, unknown[]>;
  metadata?: Record<string, unknown>;
}
