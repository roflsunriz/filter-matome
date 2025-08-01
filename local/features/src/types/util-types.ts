/**
 * ユーティリティ関連の型定義
 */

/**
 * キャッシュ管理の設定の型定義
 */
export interface CacheManagementConfig {
  TIME_THRESHOLD_MS: number;
  CACHE_SIZE_THRESHOLD_BYTES: number;
  CHECK_INTERVAL_MS: number;
  CLEANUP_BUFFER_SECONDS: number;
}

/**
 * SI接頭辞計算結果の型定義
 */
export type SIprefixResult = {
  val: number;
  unit: string;
} | "OutOfRange";

/**
 * プラットフォーム汎用タイマー型定義
 */
export type TimerHandle = ReturnType<typeof setInterval>;
export type TimeoutHandle = ReturnType<typeof setTimeout>; 