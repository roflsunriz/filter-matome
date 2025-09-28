/**
 * 共通CSS定数ファイル
 * 全環境で統一的に使用する位置調整値を定義
 */

export const CSS_CONSTANTS = `
:root {
  /* ヘッダー位置調整定数 */
  --header-offset-top: -8px;
  --header-offset-left: -8px;
  --header-width: 100vw;
  --header-height: 49px;
  --header-z-index: 9000;
  
  /* 各環境での微調整 */
  --header-mylist2-top: -8px;
  --header-mylist2-left: -8px;
  --header-mylist2-docs-top: -21px;
  --header-mylist2-docs-left: -43px;
  --header-comment-filter2-docs-top: -22px;
  --header-comment-filter2-docs-left: -22px;
  --header-video-player-width: 102vw;
  --header-video-player-top: -32px;
  --header-video-player-left: -134px;
  
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
  const styleElement = document.createElement('style');
  styleElement.textContent = CSS_CONSTANTS;
  document.head.appendChild(styleElement);
  return styleElement;
}; 