/**
 * Mylist2 Manager 用の CSS スタイル（style.css 相当） */

export const MYLIST_MANAGER_STYLES_PART1 = `
/* Theme variables (scoped to Mylist2 root) */
.custom-mylist2-manager {
  /* base defaults (dark-blue) */
  --cml2-bg: #1a1b1c;
  --cml2-text: #ffffff;
  --cml2-panel: #2a2b2c;
  --cml2-border: #333333;
  --cml2-muted: #888888;
  --cml2-muted-strong: #666666;
  --cml2-accent: #2a88bd;
  --cml2-accent-hover: #3498db;
  --cml2-danger: #e74c3c;
  --cml2-danger-hover: #c0392b;
  --cml2-focus-ring: rgba(52, 152, 219, 0.3);
  --cml2-link: #1976d2;
  --cml2-link-hover: #1565c0;
  --cml2-scrollbar-thumb: #666666;
  --cml2-scrollbar-track: var(--cml2-panel);
  --cml2-text-soft: #dddddd;
  --cml2-border-success: #27ae60;
  --cml2-border-danger: #e74c3c;
  --cml2-border-warning: #f39c12;
  --cml2-border-info: #3498db;
}

/* Theme presets */
.cml2-theme-dark-blue { /* defaults already match */ }
.cml2-theme-dark-green {
  --cml2-accent: #27ae60;
  --cml2-accent-hover: #2ecc71;
  --cml2-focus-ring: rgba(39, 174, 96, 0.3);
}
.cml2-theme-dark-amber {
  --cml2-accent: #f39c12;
  --cml2-accent-hover: #f1c40f;
  --cml2-focus-ring: rgba(243, 156, 18, 0.3);
}
.cml2-theme-dark-violet {
  --cml2-accent: #8e44ad;
  --cml2-accent-hover: #9b59b6;
  --cml2-focus-ring: rgba(142, 68, 173, 0.3);
}
.cml2-theme-dark-red {
  --cml2-accent: #e74c3c;
  --cml2-accent-hover: #c0392b;
  --cml2-focus-ring: rgba(231, 76, 60, 0.3);
}

.mylist-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--cml2-border);
  transition: background-color 0.2s;
}

.mylist-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mylist-details {
  flex: 1;
}

.mylist-count-mylist-tab,
.mylist-count {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-left: 8px;
  padding: 2px 6px;
}

.mylist-count-mylist-tab {
  background: var(--cml2-panel);
  border-radius: 4px;
}

.mylist-name {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.mylist-date {
  font-size: 12px;
  color: var(--cml2-muted);
}

.mylist-controls {
  display: flex;
  gap: 8px;
}

.mylist-item:hover {
  background: var(--cml2-panel);
}

.mylist-item.active {
  background: var(--cml2-accent);
}

/* 既存スタイルに追加 */

.custom-mylist2-manager {
  display: flex;
  position: fixed;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 97%;
  height: 87%;
  background: var(--cml2-bg);
  color: var(--cml2-text);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 8000;
}

.mylist-sidebar {
  width: 250px;
  border-right: 1px solid var(--cml2-border);
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: 95%;
}

.mylist-main {
  flex: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.mylist-controls {
  margin-bottom: 15px;
}

.video-list {
  flex: 1;
  overflow-y: auto;
}

.video-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--cml2-border);
  gap: 10px;
}

/* 動画リスト用の豪華なチェックボックススタイル */
.video-item .video-select {
  appearance: none;
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  position: relative;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.video-item .video-select::before {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0) 65%);
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.video-item .video-select::after {
  content: "";
  width: 10px;
  height: 6px;
  border: 2px solid transparent;
  border-left-color: #ffffff;
  border-bottom-color: #ffffff;
  transform: translateY(-1px) rotate(-45deg) scale(0);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.video-item .video-select:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.video-item .video-select:focus-visible {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 3px var(--cml2-focus-ring), 0 6px 18px rgba(0, 0, 0, 0.5);
}

.video-item .video-select:checked {
  border-color: rgba(255, 255, 255, 0.25);
  background: linear-gradient(135deg, var(--cml2-accent) 0%, var(--cml2-accent-hover) 100%);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.video-item .video-select:checked::before {
  opacity: 0.4;
}

.video-item .video-select:checked::after {
  opacity: 1;
  transform: translateY(-1px) rotate(-45deg) scale(1);
}

.video-item .video-select:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .video-item .video-select {
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }

  .video-item .video-select::after {
    transition: opacity 0.2s ease;
  }
}

.video-thumbnail {
  width: 96px;
  height: 72px;
  object-fit: cover;
}

.video-info {
  flex: 1;
  padding: 5px;
}

.video-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.video-author {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-bottom: 2px;
}

.video-upload-date {
  font-size: 12px;
  color: var(--cml2-muted);
  margin-bottom: 5px;
}

.video-stats {
  font-size: 12px;
  color: var(--cml2-muted);
}

.video-stats span:not(:last-child) {
  margin-right: 15px;
}

/* フォーム要素のスタイル */
input[type="text"],
select {
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  color: var(--cml2-text);
  padding: 8px;
  border-radius: 4px;
}

#searchOption {
  margin-right: 10px;
}

#mylistSortType {
  margin-top: 10px;
}

button {
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: var(--cml2-accent-hover);
}

button.danger {
  background: var(--cml2-danger);
}

button.danger:hover {
  background: var(--cml2-danger-hover);
}
`;

export const MYLIST_MANAGER_STYLES_PART2 = `
/* メインコンテンツ領域のスタイル */
.mylist-main {
  padding: 20px;
  background: var(--cml2-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* マイリスト情報セクション */
.current-mylist-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mylist-name-edit {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--cml2-text);
}

.current-mylist-info button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.current-mylist-info button:not(.danger) {
  background: var(--cml2-accent);
  color: var(--cml2-text);
}

.current-mylist-info button.danger {
  background: var(--cml2-danger);
  color: var(--cml2-text);
}

.current-mylist-info button:hover {
  opacity: 0.9;
}

/* インポート・エクスポートコントロール */
.import-export-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.import-export-controls button {
  background: var(--cml2-accent);
}

/* 動画追加フォーム */
.video-add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.video-add-form input {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--cml2-text);
}

.video-add-form button {
  padding: 8px 20px;
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.video-add-form button:hover {
  background: var(--cml2-accent-hover);
}

/* 動画一覧コントロール */
.video-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--cml2-panel);
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 常時表示の動画一覧コントロール */
.video-list-controls.always-visible {
  position: relative;
  z-index: 8000;
  background: rgba(42, 43, 44, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid var(--cml2-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 常時表示コントロールのレスポンシブ調整 */
@media (max-width: 1024px) {
  .video-list-controls.always-visible {
    flex-wrap: wrap;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .video-list-controls.always-visible {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }
  
  .video-list-controls.always-visible select,
  .video-list-controls.always-visible .search-container,
  .video-list-controls.always-visible .video-selection-controls,
  .video-list-controls.always-visible .bulk-action-controls {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .video-list-controls.always-visible {
    padding: 10px;
    margin-bottom: 10px;
  }
}

.video-selection-controls {
  display: flex;
  gap: 8px;
}

#videoSortType {
  min-width: 200px;
}

/* 一括操作コントロール */
.bulk-action-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.bulk-action-controls select {
  min-width: 200px;
}

.bulk-action-controls button {
  padding: 8px 16px;
  background: var(--cml2-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bulk-action-controls button:hover {
  background: var(--cml2-accent-hover);
}

/* ホバーエフェクト */
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* フォーカス時のスタイル */
input:focus,
select:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

/* プレースホルダーのスタイル */
input::placeholder {
  color: var(--cml2-muted-strong);
}

/* スクロールバーのスタイル */
.video-list::-WebKit-scrollbar {
  width: 8px;
}

.video-list::-WebKit-scrollbar-track {
  background: var(--cml2-bg);
}

.video-list::-WebKit-scrollbar-thumb {
  background: var(--cml2-border);
  border-radius: 4px;
}

.video-list::-WebKit-scrollbar-thumb:hover {
  background: var(--cml2-border);
}
`;

export const MYLIST_MANAGER_STYLES_PART3 = `
/* 進捗モーダルのスタイル */
.progress-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  /* 進捗は背面。お知らせ(.cml2-alert-modal: z-index 99999)が前面 */
  z-index: 9500;
}

.progress-content {
  background: white;
  padding: 2em;
  border-radius: 8px;
  text-align: center;
}

.progress-circle {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 1em auto;
}

.circular-progress {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.progress {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5em;
  font-weight: bold;
}

.progress-status {
  margin-top: 1em;
  color: var(--cml2-muted-strong);
}

/* ヘッダースタイル */
/* ヘッダー関連のスタイルは共通モジュールに移動しました */

/* メインコンテンツの調整 */
.custom-mylist2-manager {
  margin-top: 10px;
  padding-top: 10px;
}

.cml2-video-link {
  color: var(--cml2-link);
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: var(--cml2-link-hover);
  text-decoration: underline;
}

/* ボタンの共通スタイルを独自の名前空間付きに変更 */
.cml2-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--cml2-text);
  background: var(--cml2-accent);
}

.cml2-btn:hover {
  background: var(--cml2-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 危険な操作用ボタンスタイル - 詳細度を上げる */
.current-mylist-info .cml2-btn.cml2-btn-danger,
.video-actions .delete-video,
.video-actions .delete-keyword {
  background: var(--cml2-danger);
}

.current-mylist-info .cml2-btn.cml2-btn-danger:hover,
.video-actions .delete-video:hover,
.video-actions .delete-keyword:hover {
  background: var(--cml2-danger-hover);
}

.cml2-video-link {
  color: var(--cml2-link);
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: var(--cml2-link-hover);
  text-decoration: underline;
}

/* マイリストサイドバーのスクロール設定 */
.mylist-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--cml2-scrollbar-thumb) var(--cml2-scrollbar-track);
  margin-top: 15px;
}

/* WebKit系ブラウザ用のスクロールバー スタイル */
.mylist-list::-WebKit-scrollbar {
  width: 8px;
}

.mylist-list::-WebKit-scrollbar-track {
  background: var(--cml2-scrollbar-track);
}

.mylist-list::-WebKit-scrollbar-thumb {
  background-color: var(--cml2-scrollbar-thumb);
  border-radius: 4px;
}
`;

export const MYLIST_MANAGER_STYLES_PART4 = `
/* モーダルダイアログのスタイル */
.cml2-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.cml2-modal-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-modal-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border, #333333);
}

.cml2-modal-body {
  margin-bottom: 20px;
}

.cml2-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.video-details-body {
  max-height: 60vh;
  overflow: auto;
}

.video-details-section {
  margin-top: 8px;
}

.video-description {
  white-space: pre-wrap;
  background: var(--cml2-panel, #2a2b2c);
  color: var(--cml2-text, #ffffff);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 6px;
  padding: 8px;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.video-tags .cml2-tag {
  display: inline-block;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 12px;
  padding: 2px 8px;
  color: var(--cml2-text-soft, #dddddd);
}

/* セレクトボックスのスタイル */
.cml2-select {
  width: 100%;
  padding: 8px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  color: var(--cml2-text, #ffffff);
  border-radius: 4px;
  margin-bottom: 15px;
}

.cml2-select option {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
}

/* 検索コンテナのスタイル */
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-container input {
  flex: 1;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
  min-width: 0; /* flexアイテムの最小幅を0に設定 */
}

.search-container input::placeholder {
  color: var(--cml2-muted);
}

.search-clear-btn {
  background: var(--cml2-muted-strong);
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  transition: background-color 0.2s;
}

.search-clear-btn:hover {
  background: var(--cml2-muted);
}

.search-clear-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* 検索欄のスタイル（後方互換性のため残す）*/
.mylist-search,
.video-search {
  margin: 10px 0;
  padding: 0 10px;
}

.mylist-search input,
.video-search input {
  width: 93%;
  padding: 8px 12px;
  background: var(--cml2-bg);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
}

.mylist-search input::placeholder,
.video-search input::placeholder {
  color: var(--cml2-muted);
}

/* 非表示アイテムのスタイル */
.mylist-item.hidden,
.video-item.hidden {
  display: none;
}

/* プログレスサークルのスタイル */
.circular-progress path.progress {
  stroke-dasharray: 100; /* 円周の長さを100単位で設定 */
  stroke-dashoffset: 100; /* 初期状態では完全に非表示 */
  transition: stroke-dashoffset 0.3s ease; /* アニメーション効果を追加 */
  transform: rotate(-90deg); /* 開始位置を12時の位置に調整 */
  transform-origin: center; /* 回転の中心を設定 */
}

#createNewMylist {
  font-size: 10px;
}

.keyword-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--cml2-scrollbar-thumb);
  border-radius: 4px;
}

.keyword-icon svg {
  fill: var(--cml2-muted-strong);
}

.keyword-links a {
  margin-right: 1em;
  color: var(--cml2-link);
  text-decoration: none;
}

.keyword-links a:hover {
  text-decoration: underline;
}

.keyword-text,
.keyword-added-date {
  font-weight: bold;
  color: var(--cml2-text-soft);
}

/* キーワード編集モーダルのスタイル */
#keywordEditModal.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

#keywordEditModal .modal-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  position: relative;
}

#keywordEditModal h2 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border);
  font-size: 1.2em;
}

#keywordEditModal .close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 24px;
  color: var(--cml2-muted);
  cursor: pointer;
  transition: color 0.2s;
}

#keywordEditModal .close-button:hover {
  color: var(--cml2-text);
}

#keywordEditModal #editKeywordInput {
  width: 100%;
  padding: 8px 12px;
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  border-radius: 4px;
  color: var(--cml2-text);
  font-size: 14px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

#keywordEditModal #editKeywordInput:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

#keywordEditModal #saveKeywordEdit {
  padding: 8px 16px;
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

#keywordEditModal #saveKeywordEdit:hover {
  background: var(--cml2-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* カスタムアラートモーダルのスタイル */
.cml2-alert-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.cml2-alert-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-alert-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cml2-border, #333333);
  font-size: 1.2em;
}

.cml2-alert-message {
  margin-bottom: 20px;
  line-height: 1.5;
}

.cml2-alert-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* アラートタイプによる色分け */
.cml2-alert-content.success {
  border-left: 4px solid var(--cml2-border-success, #27ae60);
}

.cml2-alert-content.error {
  border-left: 4px solid var(--cml2-border-danger, #e74c3c);
}

.cml2-alert-content.warning {
  border-left: 4px solid var(--cml2-border-warning, #f39c12);
}

.cml2-alert-content.info {
  border-left: 4px solid var(--cml2-border-info, #3498db);
}
`;

/**
 * 折りたたみ可能なコントロール用のCSSスタイル
 */
export const COLLAPSIBLE_CONTROLS_STYLES = `
/* ホバーエリア */
.control-hover-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  z-index: 8100;
  background: linear-gradient(180deg, rgba(26, 27, 28, 0.1) 0%, transparent 100%);
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.control-hover-area:hover {
  opacity: 0.6;
}

/* 折りたたみ可能なコントロールエリア */
.collapsible-controls {
  position: relative;
  z-index: 8050;
  background: rgba(26, 27, 28, 0.98);
  color: var(--cml2-text);
  backdrop-filter: blur(10px);
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-10px);
  border-radius: 8px;
}

/* ホバー時の表示 */
.control-hover-area:hover + .collapsible-controls,
.collapsible-controls:hover {
  max-height: 800px;
  opacity: 1;
  transform: translateY(0);
}

/* モバイル用の調整 */
@media (max-width: 768px) {
  .control-hover-area {
    height: 30px;
    background: linear-gradient(180deg, rgba(26, 27, 28, 0.2) 0%, transparent 100%);
  }
  
  .collapsible-controls {
    background: rgba(26, 27, 28, 0.99);
  }
  
  /* 常時表示設定のモバイル調整 */
  .controls-toggle-setting {
    margin-left: 8px;
  }
  
  .controls-toggle-label {
    font-size: 11px;
  }
  
  /* タッチデバイスでも使いやすくするため、フォーカス時も表示 */
  .collapsible-controls:focus-within {
    max-height: 800px;
    opacity: 1;
    transform: translateY(0);
  }
}

/* サイドバー内要素の統一 */
#newMylistName {
  width: 100%;
  box-sizing: border-box;
}

#createNewMylist {
  width: 64px;
  box-sizing: border-box;
}

#mylistSearchInput {
  width: 100%;
  box-sizing: border-box;
}

#mylistSearchClear {
  width: 58px;
  box-sizing: border-box;
}

#mylistSortType {
  width: 100%;
  box-sizing: border-box;
}

/* 小さい画面での動画リスト拡張 */
@media (max-width: 1024px) {
  .mylist-main {
    position: relative;
  }
  
  #videoList {
    margin-top: 0;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
}

/* ホバーエリアのヒント表示 */
.control-hover-area::after {
  content: "ホバーでコントロールを表示";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(42, 43, 44, 0.9);
  padding: 2px 8px;
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  border: 1px solid var(--cml2-border);
}

.control-hover-area:hover::after {
  opacity: 1;
}

/* アニメーションの最適化 */
.collapsible-controls * {
  will-change: auto;
}

.collapsible-controls.transitioning {
  will-change: transform, opacity, max-height;
}

/* 小さい画面でのデバイス最適化 */
@media (max-width: 480px) {
  .control-hover-area {
    height: 40px;
  }
  
  .control-hover-area::after {
    content: "タッチでコントロールを切り替え";
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(42, 43, 44, 0.95);
  }
  
  .collapsible-controls {
    padding: 10px;
  }
  
  .current-mylist-info,
  .video-add-form,
  .video-list-controls {
    margin-bottom: 10px;
  }
}



/* コントロール用ボタンスタイルを統一 */
.collapsible-controls .cml2-btn,
.collapsible-controls button {
  background: var(--cml2-accent);
  color: var(--cml2-text);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapsible-controls .cml2-btn:hover,
.collapsible-controls button:hover {
  background: var(--cml2-accent-hover);
}

.collapsible-controls .cml2-btn.cml2-btn-danger {
  background: var(--cml2-danger);
}

.collapsible-controls .cml2-btn.cml2-btn-danger:hover {
  background: var(--cml2-danger-hover);
}

/* インプット要素のスタイル統一 */
.collapsible-controls input[type="text"],
.collapsible-controls select {
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  color: var(--cml2-text);
  padding: 8px 12px;
  border-radius: 4px;
}

.collapsible-controls input[type="text"]:focus,
.collapsible-controls select:focus {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

/* 常時表示設定のスタイル */
.controls-toggle-setting {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.controls-toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  user-select: none;
  transition: color 0.2s ease;
}

.controls-toggle-label:hover {
  color: rgba(255, 255, 255, 1);
}

.controls-toggle-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  background: var(--cml2-panel);
  border: 1px solid var(--cml2-border);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  appearance: none;
  transition: all 0.2s ease;
}

.controls-toggle-checkbox:checked {
  background: var(--cml2-accent);
  border-color: var(--cml2-accent);
}

.controls-toggle-checkbox:checked::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.controls-toggle-checkbox:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
}

.controls-toggle-text {
  white-space: nowrap;
}

/* 常時表示モードのまとめ */
.collapsible-controls.always-visible {
  max-height: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
}

/* 常時表示モード時はホバーエリアを非表示 */
.control-hover-area.always-visible-mode {
  display: none;
}
`;

/**
 * すべての Mylist Manager スタイルを統合 */
export const MYLIST_MANAGER_STYLES = `
${MYLIST_MANAGER_STYLES_PART1}

${MYLIST_MANAGER_STYLES_PART2}

${MYLIST_MANAGER_STYLES_PART3}

${MYLIST_MANAGER_STYLES_PART4}

${COLLAPSIBLE_CONTROLS_STYLES}
`;
/**
 * Mylist Manager スタイルをDOMに適用する関数
 */
export const applyMylistManagerStyles = (): HTMLStyleElement => {
  const styleElement = document.createElement("style");
  styleElement.textContent = MYLIST_MANAGER_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
};
