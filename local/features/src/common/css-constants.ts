/**
 * 共通CSS定数ファイル
 * 全環境で統一的に使用する位置調整値を定義
 */

export const CSS_CONSTANTS = `
:root {
  /* ヘッダー位置調整定数 */
  --header-offset-top: 0;
  --header-offset-left: 0;
  --header-width: 100%;
  --header-height: 49px;
  --header-z-index: 9000;
  
  /* 各環境での微調整 */
  --header-mylist2-top: 0;
  --header-mylist2-left: 0;
  --header-mylist2-docs-top: -21px;
  --header-mylist2-docs-left: -335px;
  --header-comment-filter2-docs-top: -22px;
  --header-comment-filter2-docs-left: -22px;
  --header-video-player-width: 100%;
  --header-video-player-top: 0;
  --header-video-player-left: 0;
  --header-movie-info-width: 100%;
  --header-movie-info-top: 0;
  --header-movie-info-left: 0;

  /* ヘッダー背景・色関連 */
  --header-bg-color: #252525;
  --header-text-color: #fff;
  --header-padding: 8px 20px;
  --header-font-size: 15px;
  
  /* 固定モード時の追加スタイル */
  --header-fixed-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  
  /* 検索ボタン色 */
  --header-search-btn-bg: #2a88bd;
  --header-search-btn-hover: #3498db;
  
  /* リンク色 */
  --header-link-color: #fff;
  --header-link-hover: #2196f3;
}
`;

/**
 * CSS定数をDOMに適用する関数
 */
export const applyCssConstants = (): HTMLStyleElement => {
  const styleElement = document.createElement("style");
  styleElement.textContent = CSS_CONSTANTS;
  document.head.appendChild(styleElement);
  return styleElement;
};
