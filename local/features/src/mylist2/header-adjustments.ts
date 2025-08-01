/**
 * Mylist2 用のCSSスタイル
 */

export const MYLIST2_HEADER_ADJUSTMENT_STYLES = `
/**
 * Mylist2環境専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして各環境に最適化
 */

:root {
  /* mylist2環境での位置調整 */
  --header-offset-top: var(--header-mylist2-top);
  --header-offset-left: var(--header-mylist2-left);
}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const headerAdjustments = (): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = MYLIST2_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
}; 