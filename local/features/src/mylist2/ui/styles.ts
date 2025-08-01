/**
 * Mylist2 Manager用のCSSスタイル（style.css相当）
 */

export const MYLIST_MANAGER_STYLES_PART1 = `
.mylist-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #333;
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
  color: #888;
  margin-left: 8px;
  padding: 2px 6px;
}

.mylist-count-mylist-tab {
  background: #2a2b2c;
  border-radius: 4px;
}

.mylist-name {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.mylist-date {
  font-size: 12px;
  color: #888;
}

.mylist-controls {
  display: flex;
  gap: 8px;
}

.mylist-item:hover {
  background: #2a2b2c;
}

.mylist-item.active {
  background: #2a88bd;
}

/* 既存のスタイルに追加 */

.custom-mylist2-manager {
  display: flex;
  position: fixed;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 97%;
  height: 87%;
  background: #1a1b1c;
  color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 8000;
}

.mylist-sidebar {
  width: 250px;
  border-right: 1px solid #333;
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
  border-bottom: 1px solid #333;
  gap: 10px;
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
  color: #888;
  margin-bottom: 2px;
}

.video-upload-date {
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.video-stats {
  font-size: 12px;
  color: #888;
}

.video-stats span:not(:last-child) {
  margin-right: 15px;
}

/* フォーム要素のスタイル */
input[type="text"],
select {
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
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
  background: #2a88bd;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #3498db;
}

button.danger {
  background: #e74c3c;
}

button.danger:hover {
  background: #c0392b;
}
`;

export const MYLIST_MANAGER_STYLES_PART2 = `
/* メインコンテンツ領域のスタイル */
.mylist-main {
  padding: 20px;
  background: #1a1b1c;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* マイリスト情報セクション */
.current-mylist-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: #2a2b2c;
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mylist-name-edit {
  flex: 1;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 14px;
  color: #ffffff;
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
  background: #4a90e2;
  color: white;
}

.current-mylist-info button.danger {
  background: #dc3545;
  color: white;
}

.current-mylist-info button:hover {
  opacity: 0.9;
}

/* インポート/エクスポートコントロール */
.import-export-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.import-export-controls button {
  background: #27ae60;
}

/* 動画追加フォーム */
.video-add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: #2a2b2c;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.video-add-form input {
  flex: 1;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 14px;
  color: #ffffff;
}

.video-add-form button {
  padding: 8px 20px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.video-add-form button:hover {
  background: #357abd;
}

/* 動画一覧コントロール */
.video-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #2a2b2c;
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
  border: 1px solid #444;
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
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bulk-action-controls button:hover {
  background: #357abd;
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
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* プレースホルダーのスタイル */
input::placeholder {
  color: #666;
}

/* スクロールバーのスタイル */
.video-list::-webkit-scrollbar {
  width: 8px;
}

.video-list::-webkit-scrollbar-track {
  background: #1a1b1c;
}

.video-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.video-list::-webkit-scrollbar-thumb:hover {
  background: #555;
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
  color: #666;
}

/* ヘッダースタイル */
/* ヘッダー関連のスタイルは共通モジュールに移動しました */

/* メインコンテンツの調整 */
.custom-mylist2-manager {
  margin-top: 10px;
  padding-top: 10px;
}

.cml2-video-link {
  color: #1976d2;
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: #1565c0;
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
  color: white;
  background: #2a88bd; /* 基本の青色 */
}

.cml2-btn:hover {
  background: #3498db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 危険な操作のボタンスタイル - 詳細度を上げる */
.current-mylist-info .cml2-btn.cml2-btn-danger,
.video-actions .delete-video,
.video-actions .delete-keyword {
  background: #e74c3c;
}

.current-mylist-info .cml2-btn.cml2-btn-danger:hover,
.video-actions .delete-video:hover,
.video-actions .delete-keyword:hover {
  background: #c0392b;
}

.cml2-video-link {
  color: #1976d2;
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cml2-video-link:hover {
  color: #1565c0;
  text-decoration: underline;
}

/* マイリストサイドバーのスクロール設定 */
.mylist-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #666 #2a2b2c;
  margin-top: 15px;
}

/* Webkit系ブラウザ用のスクロールバースタイル */
.mylist-list::-webkit-scrollbar {
  width: 8px;
}

.mylist-list::-webkit-scrollbar-track {
  background: #2a2b2c;
}

.mylist-list::-webkit-scrollbar-thumb {
  background-color: #666;
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
  background: #1a1b1c;
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-modal-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
}

.cml2-modal-body {
  margin-bottom: 20px;
}

.cml2-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* セレクトボックスのスタイル */
.cml2-select {
  width: 100%;
  padding: 8px;
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
  border-radius: 4px;
  margin-bottom: 15px;
}

.cml2-select option {
  background: #2a2b2c;
  color: #ffffff;
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
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  min-width: 0; /* flexアイテムの最小幅を0に設定 */
}

.search-container input::placeholder {
  color: #888;
}

.search-clear-btn {
  background: #666;
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
  background: #777;
}

.search-clear-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* 検索欄のスタイル（後方互換性のため残す） */
.mylist-search,
.video-search {
  margin: 10px 0;
  padding: 0 10px;
}

.mylist-search input,
.video-search input {
  width: 93%;
  padding: 8px 12px;
  background: #1a1b1c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
}

.mylist-search input::placeholder,
.video-search input::placeholder {
  color: #888;
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
  background-color: #e0e0e0;
  border-radius: 4px;
}

.keyword-icon svg {
  fill: #666;
}

.keyword-links a {
  margin-right: 1em;
  color: #0066cc;
  text-decoration: none;
}

.keyword-links a:hover {
  text-decoration: underline;
}

.keyword-text,
.keyword-added-date {
  font-weight: bold;
  color: #ddd;
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
  background: #1a1b1c;
  color: #ffffff;
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
  border-bottom: 1px solid #333;
  font-size: 1.2em;
}

#keywordEditModal .close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  transition: color 0.2s;
}

#keywordEditModal .close-button:hover {
  color: #fff;
}

#keywordEditModal #editKeywordInput {
  width: 100%;
  padding: 8px 12px;
  background: #2a2b2c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

#keywordEditModal #editKeywordInput:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

#keywordEditModal #saveKeywordEdit {
  padding: 8px 16px;
  background: #2a88bd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

#keywordEditModal #saveKeywordEdit:hover {
  background: #3498db;
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
  background: #1a1b1c;
  color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.cml2-alert-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
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
  border-left: 4px solid #27ae60;
}

.cml2-alert-content.error {
  border-left: 4px solid #e74c3c;
}

.cml2-alert-content.warning {
  border-left: 4px solid #f39c12;
}

.cml2-alert-content.info {
  border-left: 4px solid #3498db;
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
  color: #ffffff;
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

/* サイドバー内の要素の幅統一 */
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

/* 小さい画面での動画リストの拡張 */
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
  content: "⬇ ホバーでコントロールを表示";
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
  border: 1px solid #444;
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
    content: "👆 タップでコントロール";
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



/* コントロール内のボタンスタイルを確保 */
.collapsible-controls .cml2-btn,
.collapsible-controls button {
  background: #2a88bd;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapsible-controls .cml2-btn:hover,
.collapsible-controls button:hover {
  background: #3498db;
}

.collapsible-controls .cml2-btn.cml2-btn-danger {
  background: #e74c3c;
}

.collapsible-controls .cml2-btn.cml2-btn-danger:hover {
  background: #c0392b;
}

/* インプット要素のスタイル統一 */
.collapsible-controls input[type="text"],
.collapsible-controls select {
  background: #2a2b2c;
  border: 1px solid #444;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
}

.collapsible-controls input[type="text"]:focus,
.collapsible-controls select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
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
  background: #2a2b2c;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  appearance: none;
  transition: all 0.2s ease;
}

.controls-toggle-checkbox:checked {
  background: #3498db;
  border-color: #3498db;
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
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

.controls-toggle-text {
  white-space: nowrap;
}

/* 常時表示モードのとき */
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
 * すべてのMylist Manager スタイルを統合
 */
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
  const styleElement = document.createElement('style');
  styleElement.textContent = MYLIST_MANAGER_STYLES;
  document.head.appendChild(styleElement);
  return styleElement;
}; 