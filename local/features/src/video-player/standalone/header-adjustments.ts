/**
 * video-player 用のCSSスタイル
 */

export const VIDEO_PLAYER_HEADER_ADJUSTMENT_STYLES = `
/**
 * video-player環境専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして各環境に最適化
 */

:root {
  /* video-player環境での位置調整 */
  --header-offset-top: var(--header-video-player-top);
  --header-offset-left: var(--header-video-player-left);
  --header-width: var(--header-video-player-width);
}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const headerAdjustments = (): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = VIDEO_PLAYER_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
}; 