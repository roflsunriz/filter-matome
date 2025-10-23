/**
 * ユーティリティ関連の型定義
 */

/**
 * SI接頭辞計算結果の型定義
 */
export type SIprefixResult =
  | {
      val: number;
      unit: string;
    }
  | "OutOfRange";

/**
 * プラットフォーム汎用タイマー型定義
 */
export type TimerHandle = ReturnType<typeof setInterval>;
export type TimeoutHandle = ReturnType<typeof setTimeout>;
