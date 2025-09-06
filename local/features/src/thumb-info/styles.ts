/**
 * Thumb Info 用のCSSスタイル
 */

import { materialIconsStyles } from '../common/material-icons.js';

export const THUMB_INFO_STYLES = `
${materialIconsStyles}
:root {
  --primary-color: #24292f;
  --secondary-color: #0969da;
  --background-color: #ffffff;
  --border-color: #d0d7de;
  --hover-color: #f6f8fa;
  --text-color: #24292f;
  --success-color: #2da44e;
  --container-width: 800px;
  --border-radius: 6px;
  --shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

body {
  background-color: #f6f8fa;
  color: var(--text-color);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

#video-id-input-container {
  color: black;
}

/* コンテナのスタイル */
#externalDecodedResults,
#nicovideoDecodedResults {
  position: relative;
  width: var(--container-width);
  margin: 20px auto;
  padding: 24px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

/* ボタンの共通スタイル */
button,
input[type="button"] {
  padding: 8px 16px;
  color: var(--background-color);
  background-color: var(--secondary-color);
  border: 1px solid rgba(27, 31, 36, 0.15);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover,
input[type="button"]:hover {
  background-color: #0858c5;
}

/* アクションボタン */
#estimateProcessingTime,
#nicovideoCommentExec {
  display: block;
  width: fit-content;
  margin: 16px auto;
  font-size: 14px;
}

/* コピーボタン */
.copy {
  padding: 4px 12px;
  margin-right: 12px;
  color: var(--text-color);
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  font-size: 12px;
}

.copy:hover {
  background-color: var(--hover-color);
}

/* アイコンスタイル */
.copy-icon,
.action-icon,
.link-icon {
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}

/* ボタン内のアイコン調整 */
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* リンク内のアイコン調整 */
a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 情報表示エリア */
#videoInfoTemplate > p,
#channel-info > p,
#user-info > p {
  padding: 12px;
  margin: 8px 0;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
}

/* タグコンテナ */
#tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
}

#tags-container p {
  margin: 0;
  padding: 4px 12px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
}

/* 画像スタイル */
#thumbnail-img,
#ch-icon-img,
#user-icon-img {
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius);
  margin: 16px 0;
}

/* コメントアイテム */
.comment-item {
  margin: 16px 0;
  padding: 16px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

/* コメントサマリー（常時表示） */
.comment-summary {
  margin-bottom: 12px;
}

.comment-body-preview {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
  color: var(--text-color);
  word-wrap: break-word;
}

.comment-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.comment-basic-info > span {
  padding: 2px 8px;
  background-color: var(--hover-color);
  border-radius: 12px;
}

/* 展開/折りたたみボタン */
.comment-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  margin: 8px 0;
  background-color: var(--hover-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: var(--text-color);
  font-size: 14px;
}

.comment-toggle:hover {
  background-color: var(--border-color);
}

/* コメント詳細（折りたたみ可能） */
.comment-details {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

/* コメントフィールド */
.comment-field {
  display: flex;
  align-items: center;
  margin: 8px 0;
  padding: 8px;
  background-color: var(--background-color);
  border-radius: var(--border-radius);
}

.comment-field > div {
  flex: 1;
  margin-left: 12px;
}

/* 統計情報 */
.json_length,
.userId_length {
  margin: 16px 0;
  padding: 16px;
  background-color: var(--hover-color);
  border-radius: var(--border-radius);
}

/* リンクスタイル */
a {
  color: var(--secondary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* iframeスタイル */
.thumb iframe {
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  margin: 16px 0;
}

/* レスポンシブ対応 */
@media (max-width: 1200px) {
  :root {
    --container-width: 80%;
  }
}

@media (max-width: 768px) {
  :root {
    --container-width: 95%;
  }
  
  #videoInfoTemplate > p,
  .comment-field {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .comment-field > div {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .copy {
    margin: 8px 0;
  }
  
  .comment-basic-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .comment-toggle {
    justify-content: flex-start;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #c9d1d9;
    --secondary-color: #58a6ff;
    --background-color: #0d1117;
    --border-color: #30363d;
    --hover-color: #161b22;
    --text-color: #c9d1d9;
  }
  
  body {
    background-color: #010409;
  }
}
`;

/**
 * スタイルをDOMに適用する関数
 */
export const applyThumbInfoStyles = (): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = THUMB_INFO_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
}; 