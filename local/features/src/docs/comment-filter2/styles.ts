import { materialIconsStyles } from "@/common/material-icons";

/**
 * Comment Filter2 ドキュメント用のCSSスタイル
 */

export const HEADER_ADJUSTMENT_STYLES = `
/**
 * Comment Filter2 Docs専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして環境に最適化
 */

:root {
  /* comment-filter2環境での位置調整 */
  --header-offset-top: var(--header-comment-filter2-docs-top, -22px);
  --header-offset-left: var(--header-comment-filter2-docs-left, -22px);
}
`;

export const HEADER_STYLES = `
#PAGEHEADER {
  position: relative;
  top: -10px;
  left: -10px;
  height: 32px;
  width: 100vw;
  background: linear-gradient(180deg, #303030 0%, #303030 50%, #191919 50%, #191919 100%);
}

#PAGEHEADER:has(#fixedCheckBox:checked) {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
}

body:has(#fixedCheckBox:checked) {
  position: relative;
  top: 35px;
}

#head {
  font-family: "Goldman", cursive;
  color: white;
}

#fixed {
  position: relative;
  left: 19vw;
}

input:where([type="checkbox"][role="switch"]) {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  position: relative;
  font-size: inherit;
  width: 2em;
  height: 1em;
  box-sizing: content-box;
  border: 1px solid;
  border-radius: 1em;
  vertical-align: text-bottom;
  margin: auto;
  color: white;
  background-color: white;
}

input:where([type="checkbox"][role="switch"])::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(0, -50%);
  box-sizing: border-box;
  width: 0.7em;
  height: 0.7em;
  margin: 0 0.15em;
  border: 1px solid;
  border-radius: 50%;
  background: linear-gradient(45deg, #757575 0%, #9e9e9e 45%, #e8e8e8 70%, #9e9e9e 85%, #757575 90% 100%);
}

input:where([type="checkbox"][role="switch"]):checked::before {
  left: 1em;
}

input:where([type="checkbox"][role="switch"]):checked {
  background-color: greenyellow;
}

#headerlinks {
  position: relative;
  left: 19vw;
}

#headerlinks > a {
  color: white;
  text-shadow: 1px 1px 2px black;
}
`;

export const COLORS_STYLES = `
:root {
  --CF-white: white;
  --CF-red: red;
  --CF-pink: pink;
  --CF-orange: orange;
  --CF-yellow: yellow;
  --CF-green: green;
  --CF-cyan: cyan;
  --CF-blue: blue;
  --CF-purple: purple;
  --CF-black: black;
  --CF-white2: #cc9;
  --CF-red2: #c03;
  --CF-pink2: #f3c;
  --CF-orange2: #f60;
  --CF-yellow2: #990;
  --CF-green2: #0c6;
  --CF-cyan2: #0cc;
  --CF-blue2: #39f;
  --CF-purple2: #63c;
  --CF-black2: #666;
  --CF-HEXblue: #004e72;
}

.CFOwnColor {
  text-shadow: initial;
}
.CFOwnColor.white {
  color: black;
  border: 1px solid black;
  background-color: var(--CF-white);
  border-radius: 5%;
}

.CFOwnColor.red {
  color: white;
  border: 1px solid var(--CF-red);
  background-color: var(--CF-red);
  border-radius: 5%;
}

.CFOwnColor.pink {
  color: white;
  border: 1px solid var(--CF-pink);
  background-color: var(--CF-pink);
  border-radius: 5%;
}

.CFOwnColor.orange {
  color: white;
  border: 1px solid var(--CF-orange);
  background-color: var(--CF-orange);
  border-radius: 5%;
}

.CFOwnColor.yellow {
  color: #000000;
  border: 1px solid var(--CF-yellow);
  background-color: var(--CF-yellow);
  border-radius: 5%;
}

.CFOwnColor.green {
  color: white;
  border: 1px solid var(--CF-green);
  background-color: var(--CF-green);
  border-radius: 5%;
}

.CFOwnColor.cyan {
  color: white;
  border: 1px solid var(--CF-cyan);
  background-color: var(--CF-cyan);
  border-radius: 5%;
}

.CFOwnColor.blue {
  color: white;
  border: 1px solid var(--CF-blue);
  background-color: var(--CF-blue);
  border-radius: 5%;
}

.CFOwnColor.purple {
  color: white;
  border: 1px solid var(--CF-purple);
  background-color: var(--CF-purple);
  border-radius: 5%;
}

.CFOwnColor.black {
  color: white;
  border: 1px solid var(--CF-black);
  background-color: var(--CF-black);
  border-radius: 5%;
}

.CFOwnColor.white2 {
  color: white;
  border: 1px solid var(--CF-white2);
  background-color: var(--CF-white2);
  border-radius: 5%;
}

.CFOwnColor.red2 {
  color: white;
  border: 1px solid var(--CF-red2);
  background-color: var(--CF-red2);
  border-radius: 5%;
}

.CFOwnColor.pink2 {
  color: white;
  border: 1px solid var(--CF-pink2);
  background-color: var(--CF-pink2);
  border-radius: 5%;
}

.CFOwnColor.orange2 {
  color: white;
  border: 1px solid var(--CF-orange2);
  background-color: var(--CF-orange2);
  border-radius: 5%;
}

.CFOwnColor.yellow2 {
  color: white;
  border: 1px solid var(--CF-yellow2);
  background-color: var(--CF-yellow2);
  border-radius: 5%;
}

.CFOwnColor.green2 {
  color: white;
  border: 1px solid var(--CF-green2);
  background-color: var(--CF-green2);
  border-radius: 5%;
}

.CFOwnColor.cyan2 {
  color: white;
  border: 1px solid var(--CF-cyan2);
  background-color: var(--CF-cyan2);
  border-radius: 5%;
}

.CFOwnColor.blue2 {
  color: white;
  border: 1px solid var(--CF-blue2);
  background-color: var(--CF-blue2);
  border-radius: 5%;
}

.CFOwnColor.purple2 {
  color: white;
  border: 1px solid var(--CF-purple2);
  background-color: var(--CF-purple2);
  border-radius: 5%;
}

.CFOwnColor.black2 {
  color: white;
  border: 1px solid var(--CF-black2);
  background-color: var(--CF-black2);
  border-radius: 5%;
}

.CFOwnColor.HEXblue {
  color: white;
  border: 1px solid var(--CF-HEXblue);
  background-color: var(--CF-HEXblue);
  border-radius: 5%;
}
`;

/**
 * すべてのスタイルを統合
 */
export const COMMENT_FILTER2_DOCS_STYLES = `
${materialIconsStyles}
${HEADER_ADJUSTMENT_STYLES}
${HEADER_STYLES}
${COLORS_STYLES}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const applyCommentFilter2DocsStyles = (): HTMLStyleElement => {
  const styleElement = document.createElement("style");
  styleElement.textContent = COMMENT_FILTER2_DOCS_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};
