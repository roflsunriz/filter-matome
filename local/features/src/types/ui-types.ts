/**
 * UI関連の型定義
 */

/**
 * トースト通知のモード
 */
export enum ToastMode {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

/**
 * トースト通知の設定
 */
export interface ToastConfig {
  MODES: {
    INFO: string;
    SUCCESS: string;
    WARNING: string;
    ERROR: string;
  };
  TIMEOUTS: {
    PLAYABLE_MS: number;
    WARN_MS: number;
    START_MS: number;
    ERROR_MS: number;
  };
}

/**
 * トースト通知のオプション
 */
export interface ToastOptions {
  mode: "Success" | "Info" | "Warning" | "Error";
  middle: string;
  low?: string;
  title: string;
  timeout?: number;
}

/**
 * UI設定値の型定義（UIコンポーネント専用）
 */
export type UISettingValue = string | boolean | string[];

/**
 * UI設定値のレコード型
 */
export type UISettingsRecord = Record<string, UISettingValue>;

/**
 * レガシー設定の型定義
 */
export interface LegacySettings {
  DEBUG?: string;
  lotOfNicorare?: string;
  blackAndWhite?: string;
  ownerCommands?: string;
  easyCommands?: string;
  normalCommands?: string;
  excludeMovieId?: string;
  NGWord?: string;
  OKWord?: string;
  cmd?: string;
  [key: string]: string | undefined;
}

/**
 * UI用のフィルター設定のインターフェース
 */
export interface UIFilterSettings {
  DEBUG: boolean;
  filterMode?: string;
  lotOfNicorare?: boolean;
  [key: string]: string | boolean | string[] | undefined;
}

/**
 * フィールドの種類
 */
export type FieldType = "checkbox" | "radio" | "textarea" | "text";

/**
 * フィールドオプション
 */
export interface FieldOptions {
  [key: string]: string;
}

/**
 * 設定フィールドの定義
 */
export interface ConfigField {
  label: string;
  type: FieldType;
  default: UISettingValue;
  options?: FieldOptions;
  value?: UISettingValue;
  condition?: (settings: UIFilterSettings) => boolean;
}

/**
 * 設定フィールドのコレクション
 */
export interface ConfigFields {
  [key: string]: ConfigField;
}

/**
 * HTML要素関連の型定義
 */

/**
 * プロパティ付きHTMLInputElement
 */
export type HTMLInputElementWithProperties = HTMLInputElement & {
  name?: string;
};

/**
 * プロパティ付きHTMLTextAreaElement
 */
export type HTMLTextAreaElementWithProperties = HTMLTextAreaElement;

/**
 * プロパティ付きHTMLButtonElement
 */
export type HTMLButtonElementWithProperties = HTMLButtonElement;

/**
 * HTMLElementの共通型
 */
export type HTMLAnyInputElement =
  | HTMLInputElementWithProperties
  | HTMLTextAreaElementWithProperties
  | HTMLButtonElementWithProperties;

/**
 * ドラッグ可能要素のメトリクス情報
 */
export interface ElementMetrics {
  width: number;
  height: number;
  borderRadius: string;
  border: string;
  backgroundColor: string;
  boxShadow: string;
}

/**
 * 要素最小化機能のオプション
 */
export interface ElementMinimizerOptions {
  buttonClass?: string;
  minimizedClass?: string;
}

/**
 * Fullscreen API の型定義（ベンダープレフィックス対応）
 */
export interface ExtendedDocument extends Document {
  readonly mozFullScreenElement?: Element | null;
  readonly webkitFullscreenElement?: Element | null;
  readonly msFullscreenElement?: Element | null;
  mozCancelFullScreen?(): void;
  webkitExitFullscreen?(): void;
  msExitFullscreen?(): void;
}

/**
 * 拡張HTMLElement（Fullscreen API対応）
 */
export interface ExtendedHTMLElement extends HTMLElement {
  mozRequestFullScreen?(): void;
  webkitRequestFullscreen?(): void;
  msRequestFullscreen?(): void;
}
