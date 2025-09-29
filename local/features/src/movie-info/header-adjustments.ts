/**
 * movie-info 用のCSSスタイル
 */

export const MOVIE_INFO_HEADER_ADJUSTMENT_STYLES = `
/**
 * movie-info環境専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして各環境に最適化
 */

:root {
  /* movie-info環境での位置調整 */
  --header-offset-top: var(--header-movie-info-top);
  --header-offset-left: var(--header-movie-info-left);
  --header-width: var(--header-movie-info-width);
}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const headerAdjustments = (): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = MOVIE_INFO_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
}; 