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

body {
  margin: 0;
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--nc-bg, #11151b);
  color: var(--nc-text, #edf1f7);
}

#headerContainer {
  position: relative;
  z-index: 9000;
  flex: 0 0 auto;
  width: 100%;
}

#Mylist2Manager {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  overflow: hidden;
}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const headerAdjustments = (): HTMLStyleElement => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MYLIST2_HEADER_ADJUSTMENT_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};
