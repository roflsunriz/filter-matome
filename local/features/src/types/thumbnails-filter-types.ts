/**
 * サムネイルフィルター関連の型定義
 */

/**
 * キーワードの型定義
 */
export type Keyword = string;

/**
 * ページタイプの型定義
 */
export type PageType = "watch" | "top" | "ranking" | "tag" | "search" | "other";

/**
 * ニコニコ動画のセレクター設定
 */
export interface NicovideoSelectors {
  VIDEO_ELEMENTS: Record<PageType, string>;
  TITLE_ELEMENTS: Record<PageType, string | Record<string, string>>;
  PARENT_ELEMENTS: Record<PageType, string>;
}

/**
 * URLパターンの定数
 */
export interface UrlPatterns {
  WATCH: string;
  TAG: string;
  SEARCH: string;
  RANKING: string;
  VIDEO_TOP: string;
}

/**
 * 動画更新アイテムのインターフェース
 */
export interface UpdateItem {
  video: Element;
  hide: boolean;
}

/**
 * ThumbnailsFilterのグローバルオブジェクト型
 */
export interface ThumbnailsFilterGlobal {
  openSettingsPanel: () => void;
}

/**
 * ウィンドウオブジェクトの拡張
 */
declare global {
  interface Window {
    ThumbnailsFilter?: ThumbnailsFilterGlobal;
  }
}
