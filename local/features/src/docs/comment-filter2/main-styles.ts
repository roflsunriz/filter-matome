/**
 * Comment Filter2 ドキュメント用のメインCSSスタイル（index.css相当）
 */

export const MAIN_STYLES_PART1 = `
body {
  width: auto;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3498db 100%);
  margin: 0;
  padding: 20px;
  color: #ffffff;
}

a {
  transition: all 0.2s linear;
}
a:link,
a:visited {
  color: #4dd0e1;
  text-decoration: underline;
}
a:hover {
  color: #3498db;
  text-decoration: none;
}
a:active {
  color: #0097a7;
}

code {
  font-family: Menlo, Monaco, Consolas, "Courier New", Meiryo, monospace;
  background-color: rgba(66, 66, 66, 0.9);
  color: #4dd0e1;
  font-size: 14px;
  padding: 0.3em 0.5em;
  border-radius: 4px;
  border: 1px solid rgba(77, 208, 225, 0.3);
}

summary {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 15px;
  color: #4dd0e1;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
}

p {
  margin-bottom: 12px;
  line-height: 1.7;
  color: #b0bec5;
}

ul {
  margin: 10px 0;
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
  line-height: 1.6;
  color:#b0bec5;
}

h3 {
  color: #ffffff;
  font-size: 18px;
  margin: 20px 0 10px 0;
  padding: 8px 12px;
  background: linear-gradient(135deg, #3498db, #0097a7);
  color: white;
  border-radius: 6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.rule-section {
  margin-bottom: 25px;
  padding: 15px;
  background: rgba(45, 45, 45, 0.8);
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.example-box {
  background: rgba(0, 188, 212, 0.15);
  border: 1px solid rgba(0, 188, 212, 0.4);
  border-radius: 6px;
  padding: 12px;
  margin: 10px 0;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #4dd0e1;
  text-shadow: none;
}

.example-box p {
  color:rgb(0, 0, 0);
}

.example-box li {
  color:rgb(0, 0, 0);
}

.parent {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto auto 1fr;
  grid-column-gap: 15px;
  grid-row-gap: 20px;
  background-color: rgba(45, 45, 45, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(77, 208, 225, 0.3);
  border-radius: 12px;
  padding: 25px;
  max-width: 1400px;
  margin: 0 auto;
}

.CFExplanation1 {
  grid-area: 1 / 1 / 2 / 3;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  background: rgba(66, 66, 66, 0.6);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(77, 208, 225, 0.3);
  color: #b0bec5;
}

#screenshot {
  position: relative;
  width:70vw;
  top: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(77, 208, 225, 0.3);
}

.CFExplanation2 {
  grid-area: 2 / 1 / 3 / 3;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  background: rgba(66, 66, 66, 0.6);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(77, 208, 225, 0.3);
  color: #b0bec5;
}

.CFExplanation3 {
  width: 95%;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  background: rgba(66, 66, 66, 0.6);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(77, 208, 225, 0.3);
  grid-area: 3 / 1 / 4 / 2;
  color: #b0bec5;
}

.CFExplanation4 {
  width: 95%;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  background: rgba(66, 66, 66, 0.6);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(77, 208, 225, 0.3);
  grid-area: 3 / 2 / 4 / 3;
  color: #b0bec5;
}
`;

export const MAIN_STYLES_PART2 = `
.CFReplace {
  color: #ffffff;
  border: 1px solid #dc143c;
  background-color: #dc143c;
  border-radius: 5%;
  text-shadow: initial;
}
.CFsmid_ng {
  color: #ffffff;
  border: 1px solid #dccf14;
  background-color: #dccf14;
  border-radius: 5%;
  text-shadow: initial;
}
.CFsmid_rep {
  color: #ffffff;
  border: 1px solid #ff8c00;
  background-color: #ff8c00;
  border-radius: 5%;
  text-shadow: initial;
}
.CFsmid_reprep {
  color: #ffffff;
  border: 1px solid #4ddc14;
  background-color: #4ddc14;
  border-radius: 5%;
  text-shadow: initial;
}
.CFExcludeKeyword {
  color: #ffffff;
  border: 1px solid #00ff4c;
  background-color: #00ff4c;
  border-radius: 5%;
  text-shadow: initial;
}
.CFUserId {
  color: #ffffff;
  border: 1px solid #006400;
  background-color: #006400;
  border-radius: 5%;
  text-shadow: initial;
}
.CFExclude {
  color: #ffffff;
  border: 1px solid teal;
  background-color: teal;
  border-radius: 5%;
  text-shadow: initial;
}
.CFsuper_ng {
  color: #ffffff;
  border: 1px solid rgb(92, 0, 128);
  background-color: rgb(92, 0, 128);
  border-radius: 5%;
  text-shadow: initial; 
}
.CFsuper_user {
  color: #ffffff;
  border: 1px solid rgb(128, 0, 96);
  background-color: rgb(128, 0, 96);
  border-radius: 5%;
  text-shadow: initial; 
}
.CFKeyboard {
  color: #fff;
  border: 1px solid #606060;
  background-color: #606060;
  text-shadow: initial;
}

.CFConfig {
  color: #fff;
  border-radius: 5%;
  text-shadow: initial;
}
.CFConfig.replace {
  border: 1px solid #dc143c;
  background-color: #dc143c;
}
.CFConfig.smid_ng {
  border: 1px solid #dc8514;
  background-color: #dc8514;
}
.CFConfig.smid_rep {
  border: 1px solid #d9dc14;
  background-color: #d9dc14;
}
.CFConfig.smid_reprep {
  border: 1px solid #6edc14;
  background-color: #6edc14;
}
.CFConfig.excludeKeyword {
  border: 1px solid #14dcbb;
  background-color: #14dcbb;
}
.CFConfig.userId {
  border: 1px solid #1714dc;
  background-color: #1714dc;
}
.CFConfig.exclude {
  border: 1px solid #b414dc;
  background-color: #b414dc;
}
.CFConfig.super_ng {
  border: 1px solid #dc1489;
  background-color: #dc1489;
}
.CFConfig.super_user {
  border: 1px solid #dc148f;
  background-color: #dc148f;
}
`;

/**
 * メインスタイルを統合
 */
export const COMMENT_FILTER2_MAIN_STYLES = `
${MAIN_STYLES_PART1}

${MAIN_STYLES_PART2}
`;

/**
 * メインスタイルをDOMに適用する関数
 */
export const applyCommentFilter2MainStyles = (): HTMLStyleElement => {
  const styleElement = document.createElement("style");
  styleElement.textContent = COMMENT_FILTER2_MAIN_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};
