import { materialIconsStyles } from "@/common/material-icons";

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
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.video-title .video-title-link {
  min-width: 0;
}

.cml2-availability-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  border: 1px solid transparent;
}

.cml2-availability-badge.status-deleted {
  color: #ffdddd;
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.5);
}

.cml2-availability-badge.status-private {
  color: #ffe8bd;
  background: rgba(243, 156, 18, 0.2);
  border-color: rgba(243, 156, 18, 0.5);
}

.cml2-availability-badge.status-unavailable,
.cml2-availability-badge.status-unknown {
  color: #d6eaff;
  background: rgba(52, 152, 219, 0.18);
  border-color: rgba(52, 152, 219, 0.45);
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
  /* 進捗は背面。お知らせ(.cml2-alert-modal: z-index 100200)が前面 */
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
  z-index: 100100;
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

.cml2-batch-api-summary {
  margin: 0 0 12px;
  color: var(--cml2-text-soft, #dddddd);
}

.cml2-batch-api-field {
  display: grid;
  grid-template-columns: 130px minmax(120px, 1fr);
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.cml2-batch-api-field input {
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  color: var(--cml2-text, #ffffff);
  padding: 8px;
  border-radius: 4px;
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
  z-index: 100100;
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
  z-index: 100200;
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
  white-space: pre-line;
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
 * サイドバーユーティリティ用のCSSスタイル
 */
export const SIDEBAR_UTILITY_STYLES = `
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

/* 小さい画面でのレイアウト調整 */
@media (max-width: 480px) {
  .video-list-controls {
    margin-bottom: 10px;
  }
}
`;

/**
 * 仮想スクロールとアクションメニュー用のスタイル
 */
export const VIRTUAL_SCROLL_ACTION_MENU_STYLES = `
/* ============================
   仮想スクロール用スタイル
   ============================ */

/* スクロールコンテナ */
.video-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 高さスペーサー */
.video-list-spacer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

/* 仮想スクロール時のアイテム配置 */
.video-list .video-item,
.video-list .keyword-item {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--cml2-border);
  gap: 10px;
  background: var(--cml2-bg);
}

/* ホバー時の背景 */
.video-list .video-item:hover,
.video-list .keyword-item:hover {
  background: var(--cml2-panel);
}

/* ============================
   アクショントリガーボタン
   ============================ */

.action-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cml2-muted);
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}

.action-trigger:hover {
  background: var(--cml2-panel);
  color: var(--cml2-text);
}

.action-trigger:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--cml2-focus-ring);
  opacity: 1;
}

/* ホバー時にトリガーを表示 */
.video-item:hover .action-trigger,
.keyword-item:hover .action-trigger,
.video-item:focus-within .action-trigger,
.keyword-item:focus-within .action-trigger {
  opacity: 1;
}

/* タッチデバイスでは常時表示 */
@media (hover: none) and (pointer: coarse) {
  .action-trigger {
    opacity: 1;
  }
}

/* ============================
   チェックボックスのホバー表示
   ============================ */

/* 仮想スクロール時のチェックボックスはホバーで表示 */
.video-list .video-item .video-select,
.video-list .keyword-item .video-select {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* ホバー時にチェックボックスを表示 */
.video-list .video-item:hover .video-select,
.video-list .keyword-item:hover .video-select,
.video-list .video-item:focus-within .video-select,
.video-list .keyword-item:focus-within .video-select {
  opacity: 1;
}

/* チェック済みの場合は常時表示 */
.video-list .video-item .video-select:checked,
.video-list .keyword-item .video-select:checked {
  opacity: 1;
}

/* フォーカス時も表示 */
.video-list .video-item .video-select:focus,
.video-list .keyword-item .video-select:focus {
  opacity: 1;
}

/* タッチデバイスでは常時表示 */
@media (hover: none) and (pointer: coarse) {
  .video-list .video-item .video-select,
  .video-list .keyword-item .video-select {
    opacity: 1;
  }
}

/* ============================
   ポップオーバーメニュー
   ============================ */

.cml2-action-popover {
  position: fixed;
  z-index: 99999;
  min-width: 140px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  animation: cml2-popover-fade-in 0.15s ease-out;
}

@keyframes cml2-popover-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.cml2-action-popover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--cml2-text, #ffffff);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.cml2-action-popover-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.cml2-action-popover-item:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
}

.cml2-action-popover-item.danger {
  color: var(--cml2-danger, #e74c3c);
}

.cml2-action-popover-item.danger:hover {
  background: rgba(231, 76, 60, 0.15);
}

.cml2-action-popover-item .material-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.cml2-action-popover-label {
  flex: 1;
}

/* ============================
   動画アクションボタン（旧スタイル互換）
   ============================ */

/* 旧来の .video-actions は非表示 */
.video-item .video-actions,
.keyword-item .video-actions {
  display: none;
}
`;

/**
 * FAB（Floating Action Button）とマイリスト設定モーダル用スタイル
 */
export const FAB_AND_SETTINGS_MODAL_STYLES = `
/* ============================
   FAB（Floating Action Button）
   ============================ */

.cml2-fab {
  position: fixed;
  bottom: 80px;
  right: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--cml2-accent, #2a88bd);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 8500;
}

.cml2-fab:hover {
  background: var(--cml2-accent-hover, #3498db);
  transform: scale(1.08);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.3);
}

.cml2-fab:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--cml2-focus-ring, rgba(52, 152, 219, 0.3)), 
              0 6px 16px rgba(0, 0, 0, 0.5);
}

.cml2-fab:active {
  transform: scale(0.95);
}

.cml2-fab .material-icon {
  width: 28px;
  height: 28px;
}

/* FABのツールチップ */
.cml2-fab::before {
  content: attr(data-tooltip);
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 13px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.cml2-fab:hover::before {
  opacity: 1;
}

/* 動画リストの下部にFABと重ならないようパディング追加 */
.video-list {
  padding-bottom: 80px;
}

/* ============================
   マイリスト設定モーダル
   ============================ */

.cml2-settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 100000;
  animation: cml2-modal-fade-in 0.2s ease-out;
}

.cml2-settings-modal.visible {
  display: flex;
}

@keyframes cml2-modal-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.cml2-settings-content {
  background: var(--cml2-bg, #1a1b1c);
  color: var(--cml2-text, #ffffff);
  padding: 24px;
  border-radius: 12px;
  min-width: 400px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  animation: cml2-settings-slide-up 0.25s ease-out;
}

@keyframes cml2-settings-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cml2-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cml2-border, #333333);
}

.cml2-settings-title {
  margin: 0;
  font-size: 1.3em;
  font-weight: 600;
}

.cml2-settings-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cml2-muted, #888888);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.cml2-settings-close:hover {
  background: var(--cml2-panel, #2a2b2c);
  color: var(--cml2-text, #ffffff);
}

.cml2-settings-close .material-icon {
  width: 24px;
  height: 24px;
}

/* 設定セクション */
.cml2-settings-section {
  margin-bottom: 24px;
}

.cml2-settings-section:last-child {
  margin-bottom: 0;
}

.cml2-settings-section-title {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--cml2-muted, #888888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* マイリスト名編集 */
.cml2-settings-mylist-name {
  display: flex;
  gap: 8px;
}

.cml2-settings-mylist-name input {
  flex: 1;
  padding: 10px 14px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 6px;
  color: var(--cml2-text, #ffffff);
  font-size: 14px;
}

.cml2-settings-mylist-name input:focus {
  outline: none;
  border-color: var(--cml2-accent, #2a88bd);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring, rgba(52, 152, 219, 0.3));
}

/* テーマ選択 */
.cml2-settings-theme select {
  width: 100%;
  padding: 10px 14px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 6px;
  color: var(--cml2-text, #ffffff);
  font-size: 14px;
  cursor: pointer;
}

.cml2-settings-theme select:focus {
  outline: none;
  border-color: var(--cml2-accent, #2a88bd);
}

/* アクションボタングループ */
.cml2-settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cml2-settings-actions .cml2-btn {
  flex: 1;
  min-width: 120px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.cml2-settings-actions .cml2-btn .material-icon {
  width: 18px;
  height: 18px;
}

/* 動画/キーワード追加フォーム */
.cml2-settings-add-form {
  display: flex;
  gap: 8px;
}

.cml2-settings-add-form input {
  flex: 1;
  padding: 10px 14px;
  background: var(--cml2-panel, #2a2b2c);
  border: 1px solid var(--cml2-border, #333333);
  border-radius: 6px;
  color: var(--cml2-text, #ffffff);
  font-size: 14px;
}

.cml2-settings-add-form input:focus {
  outline: none;
  border-color: var(--cml2-accent, #2a88bd);
  box-shadow: 0 0 0 2px var(--cml2-focus-ring, rgba(52, 152, 219, 0.3));
}

.cml2-settings-add-form .cml2-btn {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 危険ゾーン */
.cml2-settings-danger-zone {
  padding-top: 16px;
  border-top: 1px solid var(--cml2-border, #333333);
}

.cml2-settings-danger-zone .cml2-settings-section-title {
  color: var(--cml2-danger, #e74c3c);
}

/* レスポンシブ対応 */
@media (max-width: 520px) {
  .cml2-settings-content {
    min-width: auto;
    width: calc(100% - 32px);
    margin: 16px;
    padding: 20px;
  }

  .cml2-settings-actions {
    flex-direction: column;
  }

  .cml2-settings-actions .cml2-btn {
    width: 100%;
  }

  .cml2-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }

  .cml2-fab .material-icon {
    width: 24px;
    height: 24px;
  }

  .cml2-fab::before {
    display: none;
  }
}
`;

/**
 * Midnight Indigo を基調に、選択中の一括操作を明確にする視覚調整
 */
export const MYLIST_VISUAL_REFRESH_STYLES = `
.custom-mylist2-manager {
  --cml2-bg: #070d1b;
  --cml2-text: #edf1ff;
  --cml2-panel: #0e172b;
  --cml2-border: #263450;
  --cml2-muted: #96a2bc;
  --cml2-muted-strong: #697793;
  --cml2-accent: #7068f4;
  --cml2-accent-hover: #857eff;
  --cml2-accent-rgb: 112, 104, 244;
  --cml2-accent-deep: #2455ad;
  --cml2-accent-gradient-end: #4b44be;
  --cml2-accent-contrast: #ffffff;
  --cml2-focus-ring: rgba(112, 104, 244, 0.34);
  --cml2-link: var(--cml2-accent-hover);
  --cml2-link-hover: var(--cml2-accent-contrast);
  --cml2-scrollbar-thumb: #465675;
  --cml2-scrollbar-track: #0a1222;
  --cml2-text-soft: #d6dcf0;
  overflow: hidden;
  border: 1px solid rgba(var(--cml2-accent-rgb), 0.2);
  border-radius: 12px;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.56);
}

.custom-mylist2-manager.cml2-theme-dark-green {
  --cml2-accent: #35a67a;
  --cml2-accent-hover: #43bd8d;
  --cml2-accent-rgb: 53, 166, 122;
  --cml2-accent-deep: #176c55;
  --cml2-accent-gradient-end: #238b69;
  --cml2-focus-ring: rgba(53, 166, 122, 0.34);
}

.custom-mylist2-manager.cml2-theme-dark-amber {
  --cml2-accent: #d79b36;
  --cml2-accent-hover: #e8ad49;
  --cml2-accent-rgb: 215, 155, 54;
  --cml2-accent-deep: #8c5d19;
  --cml2-accent-gradient-end: #b47820;
  --cml2-focus-ring: rgba(215, 155, 54, 0.34);
}

.custom-mylist2-manager.cml2-theme-dark-violet {
  --cml2-accent: #9968df;
  --cml2-accent-hover: #ad7cf0;
  --cml2-accent-rgb: 153, 104, 223;
  --cml2-accent-deep: #5c349b;
  --cml2-accent-gradient-end: #7949bd;
  --cml2-focus-ring: rgba(153, 104, 223, 0.34);
}

.custom-mylist2-manager.cml2-theme-dark-red {
  --cml2-accent: #d95666;
  --cml2-accent-hover: #ea6878;
  --cml2-accent-rgb: 217, 86, 102;
  --cml2-accent-deep: #8d2b3c;
  --cml2-accent-gradient-end: #b53c50;
  --cml2-focus-ring: rgba(217, 86, 102, 0.34);
}

.custom-mylist2-manager .mylist-sidebar {
  box-sizing: border-box;
  height: 100%;
  padding: 18px 14px;
  background: #091224;
  border-right-color: #263450;
}

.custom-mylist2-manager .mylist-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.custom-mylist2-manager .mylist-sidebar-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #263450;
}

.custom-mylist2-manager .sidebar-footer-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #2a3957;
  border-radius: 8px;
  background: transparent;
  color: var(--cml2-text-soft);
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.custom-mylist2-manager .sidebar-footer-action:hover {
  background: rgba(var(--cml2-accent-rgb), 0.12);
  border-color: rgba(var(--cml2-accent-rgb), 0.5);
  color: #ffffff;
}

.custom-mylist2-manager .sidebar-footer-action .material-icon {
  width: 19px;
  height: 19px;
}

.custom-mylist2-manager .mylist-main {
  padding: 16px;
  border-radius: 0;
  background: #070d1b;
  box-shadow: none;
}

.custom-mylist2-manager input[type="text"],
.custom-mylist2-manager select {
  min-height: 38px;
  border-radius: 8px;
  background: #0a1325;
  border-color: #2a3957;
}

.custom-mylist2-manager button {
  min-height: 38px;
  border-radius: 8px;
}

.custom-mylist2-manager .mylist-list {
  margin: 12px -6px 0;
}

.custom-mylist2-manager .mylist-item {
  position: relative;
  margin: 3px 0;
  padding: 12px 10px 12px 14px;
  border: 0;
  border-radius: 7px;
}

.custom-mylist2-manager .mylist-item::before {
  content: "";
  position: absolute;
  inset: 7px auto 7px 0;
  width: 3px;
  border-radius: 999px;
  background: transparent;
}

.custom-mylist2-manager .mylist-item:hover {
  background: rgba(var(--cml2-accent-rgb), 0.09);
}

.custom-mylist2-manager .mylist-item.active {
  background: rgba(var(--cml2-accent-rgb), 0.2);
  color: #f7f8ff;
}

.custom-mylist2-manager .mylist-item.active::before {
  background: var(--cml2-accent-hover);
  box-shadow: 0 0 14px rgba(var(--cml2-accent-rgb), 0.5);
}

.custom-mylist2-manager .video-filter-bar.always-visible {
  display: grid;
  grid-template-columns: 240px 360px;
  align-items: center;
  justify-content: start;
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 9px;
  background: rgba(14, 23, 43, 0.96);
  border-color: #2a3957;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
}

.custom-mylist2-manager .video-filter-bar .search-container {
  width: 360px;
  height: 38px;
}

.custom-mylist2-manager .video-filter-bar #videoSortType,
.custom-mylist2-manager .video-filter-bar #videoSearchInput,
.custom-mylist2-manager .video-filter-bar #videoSearchClear {
  height: 38px;
  min-height: 38px;
  box-sizing: border-box;
}

.custom-mylist2-manager .video-filter-bar #videoSortType {
  width: 240px;
}

.custom-mylist2-manager .video-filter-bar #videoSearchInput {
  width: 320px;
}

.custom-mylist2-manager .video-filter-bar #videoSearchClear {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.custom-mylist2-manager .selection-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  max-height: 0;
  margin: 0;
  padding: 0 12px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 9px;
  background: linear-gradient(
    90deg,
    var(--cml2-accent-deep),
    var(--cml2-accent-gradient-end)
  );
  opacity: 0;
  transform: translateY(-12px);
  visibility: hidden;
  transition:
    max-height 0.24s ease,
    margin 0.24s ease,
    padding 0.24s ease,
    opacity 0.18s ease,
    transform 0.24s ease,
    visibility 0s linear 0.24s;
}

.custom-mylist2-manager.has-selection .selection-action-bar {
  max-height: 74px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-color: rgba(var(--cml2-accent-rgb), 0.72);
  box-shadow: 0 8px 24px rgba(var(--cml2-accent-rgb), 0.2);
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  transition-delay: 0s;
}

.custom-mylist2-manager .selection-action-bar button {
  min-height: 36px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  white-space: nowrap;
}

.custom-mylist2-manager .selection-action-bar button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.custom-mylist2-manager .selection-action-bar button.danger {
  background: rgba(136, 22, 47, 0.58);
}

.custom-mylist2-manager .selection-action-bar #deselectAllVideos {
  margin-left: auto;
  width: 36px;
  padding: 0;
  font-size: 20px;
}

.custom-mylist2-manager .selection-action-bar #selectedVideosAction {
  display: none;
}

.custom-mylist2-manager .video-list-selection-header {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid #202e48;
  border-bottom: 0;
  border-radius: 9px 9px 0 0;
  background: linear-gradient(
    90deg,
    rgba(var(--cml2-accent-rgb), 0.1),
    #0b1527 38%
  );
}

.custom-mylist2-manager .video-list-selection-header label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--cml2-text-soft);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.custom-mylist2-manager .video-list-selection-header input {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18),
    rgba(255, 255, 255, 0.02)
  );
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    transform 0.2s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.custom-mylist2-manager .video-list-selection-header input::before {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.35),
    rgba(255, 255, 255, 0) 65%
  );
  pointer-events: none;
}

.custom-mylist2-manager .video-list-selection-header input::after {
  content: "";
  width: 10px;
  height: 6px;
  border: 2px solid transparent;
  border-left-color: #ffffff;
  border-bottom-color: #ffffff;
  opacity: 0;
  transform: translateY(-1px) rotate(-45deg) scale(0);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.custom-mylist2-manager .video-list-selection-header input:hover {
  transform: translateY(-1px);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.custom-mylist2-manager .video-list-selection-header input:focus-visible {
  outline: none;
  border-color: var(--cml2-accent);
  box-shadow:
    0 0 0 3px var(--cml2-focus-ring),
    0 6px 18px rgba(0, 0, 0, 0.5);
}

.custom-mylist2-manager .video-list-selection-header input:checked,
.custom-mylist2-manager .video-list-selection-header input:indeterminate {
  border-color: rgba(255, 255, 255, 0.25);
  background: linear-gradient(
    135deg,
    var(--cml2-accent),
    var(--cml2-accent-hover)
  );
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.custom-mylist2-manager .video-list-selection-header input:checked::after {
  opacity: 1;
  transform: translateY(-1px) rotate(-45deg) scale(1);
}

.custom-mylist2-manager .video-list-selection-header input:indeterminate::after {
  width: 10px;
  height: 0;
  border: 0;
  border-top: 2px solid #ffffff;
  opacity: 1;
  transform: none;
}

.custom-mylist2-manager .video-list {
  border: 1px solid #202e48;
  border-radius: 0 0 9px 9px;
  background: #091121;
}

.custom-mylist2-manager .video-list .video-item,
.custom-mylist2-manager .video-list .keyword-item {
  padding: 10px 12px 10px 50px;
  background: #091121;
  border-bottom-color: #202e48;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.custom-mylist2-manager .video-list .video-item .video-select,
.custom-mylist2-manager .video-list .keyword-item .video-select {
  position: absolute;
  top: 14px;
  left: 14px;
  margin: 0;
  opacity: 1;
}

.custom-mylist2-manager .video-list .video-item:hover,
.custom-mylist2-manager .video-list .keyword-item:hover {
  background: rgba(var(--cml2-accent-rgb), 0.1);
}

.custom-mylist2-manager .video-list .video-item.is-selected,
.custom-mylist2-manager .video-list .keyword-item.is-selected {
  background: linear-gradient(
    90deg,
    rgba(var(--cml2-accent-rgb), 0.3),
    rgba(var(--cml2-accent-rgb), 0.08)
  );
  box-shadow: inset 3px 0 var(--cml2-accent-hover);
}

.custom-mylist2-manager .video-thumbnail {
  border-radius: 7px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.32);
}

.custom-mylist2-manager .video-title {
  color: #f3f5ff;
  letter-spacing: 0.01em;
}

.custom-mylist2-manager .selected-items-count {
  display: inline-flex;
  align-items: center;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.custom-mylist2-manager .video-details-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  min-height: 38px;
  padding: 0;
  border: 1px solid rgba(var(--cml2-accent-rgb), 0.42);
  border-radius: 8px;
  background: #111d34;
  color: var(--cml2-text);
  opacity: 0;
  transform: translateX(5px);
  transition: opacity 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
  flex-shrink: 0;
}

.custom-mylist2-manager .video-details-trigger .material-icon {
  width: 20px;
  height: 20px;
}

.custom-mylist2-manager .video-item:hover .video-details-trigger,
.custom-mylist2-manager .video-item:focus-within .video-details-trigger {
  opacity: 1;
  transform: translateX(0);
}

.custom-mylist2-manager .video-details-trigger:hover {
  background: rgba(var(--cml2-accent-rgb), 0.24);
  border-color: var(--cml2-accent-hover);
  box-shadow: 0 0 0 2px rgba(var(--cml2-accent-rgb), 0.14);
}

@media (max-width: 768px) {
  .custom-mylist2-manager .video-filter-bar.always-visible {
    grid-template-columns: 1fr;
  }

  .custom-mylist2-manager .video-filter-bar .search-container,
  .custom-mylist2-manager .video-filter-bar #videoSortType {
    width: 100%;
  }

  .custom-mylist2-manager .video-filter-bar #videoSearchInput {
    width: auto;
  }

  .custom-mylist2-manager .selection-action-bar {
    flex-wrap: wrap;
  }

  .custom-mylist2-manager.has-selection .selection-action-bar {
    max-height: 180px;
  }

  .custom-mylist2-manager .selected-items-count {
    flex-basis: 100%;
  }
}
`;

/**
 * すべての Mylist Manager スタイルを統合 */
export const MYLIST_MANAGER_STYLES = `
${materialIconsStyles}

${MYLIST_MANAGER_STYLES_PART1}

${MYLIST_MANAGER_STYLES_PART2}

${MYLIST_MANAGER_STYLES_PART3}

${MYLIST_MANAGER_STYLES_PART4}

${SIDEBAR_UTILITY_STYLES}

${VIRTUAL_SCROLL_ACTION_MENU_STYLES}

${FAB_AND_SETTINGS_MODAL_STYLES}

${MYLIST_VISUAL_REFRESH_STYLES}
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
