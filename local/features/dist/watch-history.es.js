true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

const ICONS = {
  clear: "clear_all",
  play: "play_arrow",
  search: "search",
  home: "home",
  bookmark: "bookmark",
  live_tv: "live_tv",
  image: "image",
  tv: "tv"};
function getIconPath(iconName, style = "outlined") {
  return `/local/images/material-design-icons/${style}/${iconName}.svg`;
}
function getColorClass(color) {
  const colorMap = {
    white: "icon-white",
    green: "icon-green",
    red: "icon-red",
    dark: "icon-dark",
    default: "icon-outlined"
  };
  return colorMap[color] || colorMap.default;
}
function getSizeClass(size) {
  if (typeof size === "number") {
    return "";
  }
  const sizeClassMap = {
    small: "material-icon-small",
    medium: "",
    large: "material-icon-large"
  };
  return sizeClassMap[size] || "";
}
function createMaterialIcon(iconName, options = {}) {
  const {
    style = "outlined",
    size = "medium",
    color = "default",
    classes = "",
    alt = iconName,
    loading = "lazy"
  } = options;
  const iconPath = getIconPath(iconName, style);
  const colorClass = getColorClass(color);
  const sizeClass = getSizeClass(size);
  const allClasses = ["material-icon", colorClass, sizeClass, classes].filter(Boolean).join(" ");
  const styleAttr = typeof size === "number" ? ` style="width: ${size}px; height: ${size}px;"` : "";
  return `<img class="${allClasses}" src="${iconPath}" alt="${alt}" loading="${loading}"${styleAttr} />`;
}
const materialIconsStyles = `
  /* マテリアルアイコン基本設定 */
  .material-icon {
    display: inline-block;
    width: var(--icon-size-medium, 20px);
    height: var(--icon-size-medium, 20px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    vertical-align: middle;
    pointer-events: none; /* ボタン内でのクリックイベント伌のため */
  }

  .material-icon-small {
    width: var(--icon-size-small, 16px);
    height: var(--icon-size-small, 16px);
  }

  .material-icon-large {
    width: var(--icon-size-large, 24px);
    height: var(--icon-size-large, 24px);
  }

  /* 色設定用CSSフィルタ（黒塗りアイコンの色変換用） */
  .icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .icon-green {
    filter: brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(3583%) hue-rotate(87deg) brightness(118%) contrast(119%);
  }

  .icon-red {
    filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  }

  .icon-dark {
    filter: brightness(0) saturate(100%) invert(20%) sepia(8%) saturate(7%) hue-rotate(314deg) brightness(96%) contrast(93%);
  }

  /* 基本カラー（outlined版での白色設定） */
  .icon-outlined {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  /* CSS変数定義 */
  :root {
    --icon-size-small: 16px;
    --icon-size-medium: 20px;
    --icon-size-large: 24px;
    --icon-color-default: #ffffff;
    --icon-color-success: #4caf50;
    --icon-color-danger: #f44336;
    --icon-color-dark: #333333;
  }

  /* ボタン内のアイコン調整 */
  .control-btn .material-icon,
  .action-card .material-icon {
    margin: 0;
    vertical-align: middle;
  }

  /* FABアイコン */
  .fab-icon {
    width: 24px;
    height: 24px;
  }

  /* タブアイコン */
  .tab-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  /* comment-filter2互換クラス */
  .cf2-icon {
    display: inline-block;
    vertical-align: middle;
  }

  .cf2-icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }
`;

function applyWatchHistoryStyles() {
  if (document.getElementById("watch-history-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "watch-history-styles";
  style.textContent = `
/* ===== ニコニコ動画視聴履歴拡張 - スタイルシート ===== */

/* リセット・基本設定 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

/* Material Icons (SVG版) */
${materialIconsStyles}

/* レイアウト */
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 共通ヘッダー用のスペース */
#common-header-container {
  position: relative;
  z-index: 1000;
}

/* アプリケーションヘッダー */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: relative;
  z-index: 999;
}

.app-header-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.app-header-title {
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-header-icon {
  font-size: 1.8rem;
}

.app-header-actions {
  display: flex;
  gap: 1rem;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

/* タブナビゲーション */
.tab-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.tab-buttons {
  display: flex;
  gap: 1rem;
}

.tab-actions {
  display: flex;
  gap: 1rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #333;
  background-color: rgba(0,0,0,0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* 履歴レイアウト */
.history-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.sidebar {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  height: fit-content;
  max-height: 100%;
  overflow-y: auto;
}

.content-area {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 検索セクション */
.search-section {
  margin-bottom: 2rem;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #999;
  font-size: 20px;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #999;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.search-clear:hover {
  opacity: 1;
}

/* セクション */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

/* ソートセクション */
.sort-section {
  margin-bottom: 2rem;
}

.sort-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.3s ease;
  justify-content: space-between;
}

.sort-btn:hover {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.05);
}

.sort-btn.active {
  border-color: #667eea;
  color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.sort-btn .material-icon {
  width: 18px;
  height: 18px;
}

.sort-order-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

/* フィルタセクション */
.filter-section {
  margin-bottom: 2rem;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-checkbox-item {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem !important;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.filter-checkbox {
  margin-right: 0;
}

.filter-select,
.filter-date {
  padding: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.filter-select:focus,
.filter-date:focus {
  outline: none;
  border-color: #667eea;
}

.date-range {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-range-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range span {
  font-size: 0.9rem;
  color: #666;
  min-width: 20px;
}

/* 統計概要 */
.stats-summary {
  border-top: 2px solid #e0e0e0;
  padding-top: 1.5rem;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-label {
  font-size: 0.9rem;
  color: #666;
}

.stats-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

/* コンテンツエリア */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.content-count {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.content-actions {
  display: flex;
  gap: 1rem;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* 履歴アイテム */
.history-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.history-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.history-thumbnail {
  position: relative;
  width: 160px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8rem;
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.history-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  flex: 1;
}

.completion-icon {
  font-size: 20px;
  color: #4CAF50;
  flex-shrink: 0;
}

.completion-icon:not(.completed) {
  color: #ccc;
}

.history-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.history-owner,
.history-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.history-owner .material-icon,
.history-date .material-icon {
  width: 16px;
  height: 16px;
}

.history-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
  min-width: 35px;
}

.history-stats {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.85rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-item .material-icon {
  width: 16px;
  height: 16px;
}

.history-memo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #667eea;
}

.history-memo .material-icon {
  width: 16px;
  height: 16px;
  filter: brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(214deg) brightness(119%) contrast(119%);
}

.memo-text {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.4;
}

/* ローディング・空の状態 */
.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  margin-bottom: 1rem;
}

.empty-icon .material-icon {
  width: 4rem;
  height: 4rem;
  filter: brightness(0) saturate(100%) invert(80%) sepia(6%) saturate(15%) hue-rotate(3deg) brightness(93%) contrast(93%);
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #666;
}

.empty-state p {
  color: #999;
  text-align: center;
  max-width: 300px;
}

/* シリーズ・アラート専用のempty-state */
#series-empty-state,
#series-alert-empty-state {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

#series-empty-state:not(.hidden),
#series-alert-empty-state:not(.hidden) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.hidden {
  display: none !important;
}

/* 統計レイアウト */
.stats-layout {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.stats-card {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.stats-card-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.stats-card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-metric:last-child {
  border-bottom: none;
}

.stats-metric-label {
  font-size: 1rem;
  color: #666;
}

.stats-metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.stats-chart {
  width: 100%;
  height: 200px;
  border-radius: 6px;
}

.creator-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.creator-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

.creator-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.creator-name {
  font-weight: 500;
  color: #333;
}

.creator-count {
  font-size: 0.9rem;
  color: #666;
}

.creator-time {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

/* タグクラウド */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  min-height: 150px;
}

.tag-cloud-item {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tag-cloud-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.tag-cloud-item.size-xs {
  font-size: 0.7rem;
  padding: 0.3rem 0.6rem;
}

.tag-cloud-item.size-sm {
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
}

.tag-cloud-item.size-md {
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.tag-cloud-item.size-lg {
  font-size: 1.2rem;
  padding: 0.6rem 1.2rem;
}

.tag-cloud-item.size-xl {
  font-size: 1.4rem;
  padding: 0.7rem 1.4rem;
}

.tag-cloud-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
  min-height: 150px;
}

.tag-cloud-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(80%);
}

/* ボタン */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  background: white;
  color: #333;
  border: 2px solid transparent;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-icon {
  padding: 0.5rem;
  border-radius: 50%;
  min-width: 40px;
  height: 40px;
  justify-content: center;
}

.btn .material-icon {
  width: 18px;
  height: 18px;
}

/* モーダル */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(3px);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 10px;
  max-width: 800px;
  width: 90%;
  max-height: 90%;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 1rem;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: #666;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background-color: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

/* 動画詳細 */
.video-detail-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.video-detail-thumbnail img {
  width: 100%;
  height: auto;
  border-radius: 6px;
}

.video-detail-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  gap: 1rem;
}

.info-label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.info-value {
  color: #333;
  flex: 1;
}

.tag {
  display: inline-block;
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
}

/* メモ編集 */
.memo-textarea {
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.memo-textarea:focus {
  outline: none;
  border-color: #667eea;
}

/* トースト通知 */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-left: 4px solid #4CAF50;
  animation: slideIn 0.3s ease;
}

.toast-error {
  border-left-color: #f44336;
}

.toast-info {
  border-left-color: #2196F3;
}

.toast-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}

.toast-message {
  color: #333;
  font-size: 0.9rem;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.toast-close:hover {
  background-color: #f0f0f0;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .history-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .sidebar {
    height: auto;
    max-height: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .video-detail-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  
  .header-container {
    padding: 0 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .history-item {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .history-thumbnail {
    width: 100%;
    height: 180px;
  }
  
  .modal-content {
    width: 95%;
  }
}

/* 視聴ログアコーディオン */
.watch-count-item {
  cursor: pointer;
  position: relative;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.watch-count-item:hover {
  background-color: #f5f5f5;
}

.accordion-icon {
  margin-left: 4px;
  transition: transform 0.2s;
}

.watch-logs-accordion {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-top: 8px;
}

.watch-logs-accordion.expanded {
  max-height: 400px;
  border: 1px solid #e9ecef;
}

.watch-logs-content {
  padding: 12px;
}

.watch-logs-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  padding: 8px;
  text-align: center;
  justify-content: center;
}

.watch-logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.watch-log-item {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
}

.watch-log-item.latest {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.watch-log-item.current-session {
  border-color: #ff6b35;
  background-color: #fff8f6;
}

.watch-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.watch-log-date {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 13px;
}

.latest-badge {
  background-color: #007bff;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
}

.current-badge {
  background-color: #ff6b35;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
}

.watch-log-completion {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.completion-text {
  font-weight: 500;
}

.watch-log-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.progress-bar.small {
  height: 4px;
  flex: 1;
  background-color: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar.small .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.current-session-note {
  margin-top: 6px;
  padding: 4px 8px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 12px;
  color: #856404;
  text-align: center;
}

/* スクロールバー */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* お気に入り動画 */
.favorite-videos {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  border-left: 3px solid #ffbb00;
  transition: all 0.2s ease;
}

.favorite-item:hover {
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.favorite-rank {
  font-weight: 700;
  color: #ffbb00;
  width: 1.5rem;
  text-align: center;
}

.favorite-thumb {
  width: 48px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}

.favorite-title {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.favorite-score {
  font-size: 0.8rem;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.favorite-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
  min-height: 150px;
}

.favorite-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(80%);
}

${seriesStyles}
`;
  document.head.appendChild(style);
}
const seriesStyles = `
  /* シリーズレイアウト */
  .series-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .series-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .series-search {
    width: 300px;
  }

  .series-filters {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .series-content-area {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* シリーズアイテム */
  .series-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    min-height: 200px;
  }

  .series-list:empty {
    display: none;
  }

  .series-item {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .series-item:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .series-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .series-header {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .series-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.4;
  }

  .series-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .series-progress .progress-bar {
    flex: 1;
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .series-progress .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s ease;
  }

  .series-progress .progress-text {
    font-size: 12px;
    color: #666;
    min-width: 80px;
    text-align: right;
  }

  .series-meta {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .series-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }

  .series-last-video {
    font-size: 12px;
    color: #666;
    line-height: 1.3;
  }

  .last-video-label {
    font-weight: 500;
    margin-right: 4px;
  }

  .last-video-title {
    color: #333;
  }

  /* シリーズアラートレイアウト */
  .series-alert-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .series-alert-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .series-alert-title h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }

  .series-alert-title p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  .series-alert-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .series-alert-actions .btn {
    min-width: 140px;
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
  }

  .series-alert-actions .btn-icon {
    min-width: 40px;
    width: 40px;
    height: 40px;
    padding: 0.5rem;
    border-radius: 50%;
  }

  .series-alert-content-area {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* シリーズアラートアイテム */
  .series-alert-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    min-height: 200px;
  }

  .series-alert-list:empty {
    display: none;
  }

  .series-alert-item {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .series-alert-item:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .alert-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .alert-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.4;
  }

  .alert-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .alert-status.enabled {
    background: #e8f5e8;
    color: #4caf50;
  }

  .alert-status.disabled {
    background: #ffebee;
    color: #f44336;
  }

  .alert-meta {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .alert-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }

  .alert-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-danger {
    background: #f44336;
    color: white;
    border: none;
  }

  .btn-danger:hover {
    background: #d32f2f;
  }

  .btn-warning {
    background-color: #ffc107;
    color: #212529;
    border: none;
  }

  .btn-warning:hover {
    background-color: #e0a800;
  }

  .btn-info {
    background-color: #17a2b8;
    color: white;
    border: none;
  }

  .btn-info:hover {
    background-color: #138496;
  }

  .btn-full {
    width: 100%;
    justify-content: center;
  }

  /* ===== 削除機能関連スタイル ===== */

  /* 削除設定セクション */
  .delete-section {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
  }

  .delete-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 条件付き削除グループ */
  .delete-condition-group {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 1rem;
    background: #fafafa;
  }

  .delete-condition-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 1rem;
  }

  .delete-condition-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .delete-condition-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .delete-condition-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .delete-condition-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .delete-condition-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    text-align: center;
  }

  .delete-condition-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }

  .delete-condition-suffix {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  /* 履歴項目の削除ボタン */
  .history-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .history-delete-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 4px 6px;
    min-width: unset;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .history-item:hover .history-delete-btn {
    opacity: 1;
  }

  .history-delete-btn:hover {
    background-color: #d32f2f !important;
    transform: scale(1.05);
  }

  .alert-stat .overdue {
    color: #dc3545;
    font-weight: 500;
  }

  /* 通知権限モーダル */
  .notification-permission-info {
    padding: 16px;
  }

  .permission-description {
    font-size: 16px;
    color: #333;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .browser-instructions {
    margin-bottom: 24px;
  }

  .browser-instructions h3 {
    color: #333;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
  }

  .browser-tab {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
  }

  .browser-tab.current-browser {
    background: #e3f2fd;
    border: 2px solid #2196f3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
  }

  .browser-tab.current-browser h4 {
    color: #1976d2;
    position: relative;
  }

  .browser-tab.current-browser h4::after {
    content: "（お使いのブラウザ）";
    font-size: 12px;
    color: #2196f3;
    font-weight: normal;
    margin-left: 8px;
  }

  .browser-tab h4 {
    color: #495057;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .browser-tab ol {
    margin: 12px 0;
    padding-left: 20px;
  }

  .browser-tab li {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .alternative-method {
    background: #e9ecef;
    border-left: 4px solid #6c757d;
    padding: 12px;
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.4;
  }

  .alternative-method strong {
    color: #495057;
  }

  .permission-test-section {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .permission-test-section h3 {
    color: #155724;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .permission-test-section p {
    color: #155724;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  /* モーダルフォーム */
  .form-group {
    margin-bottom: 16px;
  }

  .form-label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #333;
  }

  .form-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
  }

  .form-checkbox {
    margin-right: 8px;
  }

  /* シリーズ詳細 */
  .series-detail-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .series-detail-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .series-videos-header {
    margin: 16px 0 8px 0;
  }

  .series-videos-header h4 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }

  .series-videos-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .series-video-item {
    display: flex;
    gap: 12px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .series-video-item:hover {
    background: #e9ecef;
  }

  .video-thumbnail {
    position: relative;
    width: 80px;
    height: 45px;
    flex-shrink: 0;
  }

  .video-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .video-duration {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 10px;
  }

  .video-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .video-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin: 0;
    line-height: 1.3;
  }

  .video-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #666;
  }

  .video-progress-bar {
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }

  .video-progress-bar .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s ease;
  }

  .series-videos-empty {
    text-align: center;
    padding: 32px;
    color: #666;
  }

  /* レスポンシブデザイン */
  @media (max-width: 768px) {
    .series-layout,
    .series-alert-layout {
      padding: 16px;
    }

    .series-header,
    .series-alert-header {
      flex-direction: row;
      align-items: stretch;
      gap: 12px;
    }

    .series-search {
      max-width: none;
    }

    .series-filters {
      justify-content: space-between;
    }

    .series-alert-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .series-alert-actions .btn {
      min-width: auto;
      width: 100%;
    }

    .series-list {
      grid-template-columns: 1fr;
    }

    .alert-header {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .alert-meta {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .alert-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .series-video-item {
      flex-direction: column;
      gap: 8px;
    }

    .video-thumbnail {
      width: 100%;
      height: 120px;
    }
  }

/* ===== データベース管理モーダル ===== */
.db-management-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.db-management-section h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

/* 永続化状態セクション */
.persistence-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.persistence-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.persistence-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  width: fit-content;
}

.persistence-badge.persistent {
  background: #28a745;
}

.persistence-badge.temporary {
  background: #ffc107;
  color: #212529;
}

.persistence-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-usage {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.storage-usage-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.storage-usage-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #ffc107 80%, #dc3545 100%);
  transition: width 0.3s ease;
}

.storage-usage-text {
  font-size: 12px;
  color: #6c757d;
  text-align: right;
}

.persistence-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* マイグレーション状態セクション */
.migration-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.migration-progress-container {
  padding: 16px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
}

.migration-progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.migration-current-task {
  font-size: 14px;
  color: #1976d2;
  font-weight: 500;
}

.migration-progress-bar {
  width: 100%;
  height: 8px;
  background: #bbdefb;
  border-radius: 4px;
  overflow: hidden;
}

.migration-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  transition: width 0.3s ease;
}

.migration-progress-text {
  font-size: 12px;
  color: #1976d2;
  text-align: right;
}

.migration-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* バックアップ管理セクション */
.backup-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.backup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backup-list-header h5 {
  margin: 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.backup-list-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
}

.backup-list-empty {
  padding: 24px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f9fa;
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.backup-date {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.backup-version {
  font-size: 12px;
  color: #6c757d;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.backup-restore-btn {
  padding: 4px 8px;
  font-size: 12px;
}

.backup-delete-btn {
  padding: 4px 8px;
  font-size: 12px;
}

/* 設定セクション */
.db-management-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #007bff;
}

.setting-description {
  font-size: 12px;
  color: #6c757d;
  margin-left: 24px;
}

/* モーダルサイズ拡張 */
.modal-content.large {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

/* シリーズナビゲーション */
.series-navigation {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.series-nav-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.series-nav-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.series-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.series-nav-btn:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.series-nav-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.series-nav-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* レスポンシブデザイン（データベース管理） */
@media (max-width: 768px) {
  .db-management-section {
    padding: 16px;
  }
  
  .persistence-actions,
  .migration-actions,
  .backup-actions {
    flex-direction: column;
  }
  
  .persistence-actions .btn,
  .migration-actions .btn,
  .backup-actions .btn {
    width: 100%;
  }
  
  .backup-item {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .backup-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .modal-content.large {
    width: 95%;
    max-width: none;
  }

  /* シリーズナビゲーション（レスポンシブ） */
  .series-navigation {
    margin-top: 12px;
    padding: 12px;
  }
  
  .series-nav-buttons {
    flex-direction: column;
  }
  
  .series-nav-btn {
    width: 100%;
    justify-content: center;
  }
}
`;

class CommonHeader {
  constructor(container, config = {}) {
    this.isFixed = false;
    this.container = typeof container === "string" ? document.getElementById(container) || document.createElement("div") : container;
    this.config = {
      title: "CustomMylist2 Manager",
      showSearch: true,
      showMoreLinks: true,
      enableFixedMode: false,
      ...config
    };
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    this.init();
  }
  /**
   * ヘッダーを初期化
   */
  init() {
    this.loadTemplate();
    this.setupEventListeners();
    this.applyConfig();
  }
  /**
   * HTMLテンプレートを読み込み
   */
  loadTemplate() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getHeaderStyles()}
      </style>
      ${this.getHeaderTemplate()}
    `;
  }
  /**
   * ヘッダーのスタイルを取得
   */
  getHeaderStyles() {
    return `
      /* 共通ヘッダーコンポーネントのスタイル */
      :host {
        display: block;
        position: relative;
        top: var(--header-offset-top, -8px);
        left: var(--header-offset-left, -8px);
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .custom-header {
        background: var(--header-bg-color, #252525);
        color: var(--header-text-color, #fff);
        padding: var(--header-padding, 8px 20px);
        transition: all 0.3s ease;
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
        position: relative;
        width: var(--header-width, 100vw);
        box-sizing: border-box;
        margin: 0;
      }

      .custom-header.fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--header-z-index, 9000);
        box-shadow: var(--header-fixed-shadow, 0 2px 5px rgba(0, 0, 0, 0.2));
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
      }

      /* ヘッダー左部分 */
      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.2em;
      }

      /* 検索部分 */
      .search-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-clear-btn {
        position: relative;
        right: -5px;
        background-color: #3498db;
        border: solid 1px #444;
        cursor: pointer;
        padding: 5px;
        color: #666;
      }

      .search-clear-btn:hover {
        color: #333;
      }

      .search-container select,
      .search-container input {
        padding: 5px 10px;
        border: 1px solid #444;
        border-radius: 3px;
        background: #333;
        color: #fff;
      }

      .search-container select {
        margin-right: 10px;
      }

      .search-container button {
        margin-left: 10px;
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .search-container button:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      /* アイコンボタン専用スタイル */
      .icon-btn {
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
      }

      .icon-btn:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      .clear-btn {
        background: var(--header-clear-btn-bg, #f44336);
        margin-left: 5px;
      }

      .clear-btn:hover {
        background: var(--header-clear-btn-hover, #d32f2f);
      }

      /* リンク部分 */
      .header-links {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .header-links a {
        color: var(--header-link-color, #fff);
        text-decoration: none;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .header-links a:hover {
        color: var(--header-link-hover, #2196f3);
      }

      .header-links button {
        background: transparent;
        border: none;
        color: var(--header-link-color, #fff);
        font-size: 0.9em;
        cursor: pointer;
        padding: 0;
      }

      .header-links button:hover {
        color: var(--header-link-hover, #2196f3);
      }

      /* ドロップダウンメニュー */
      .more-links {
        position: relative;
      }

      .dropdown-content {
        display: none;
        position: absolute;
        right: 0;
        background-color: #333;
        min-width: 160px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 9001;
      }

      .dropdown-content a {
        padding: 12px 16px;
        display: block;
        white-space: nowrap;
      }

      .more-links:hover .dropdown-content {
        display: block;
      }

      /* マテリアルアイコンの統合 */
      ${materialIconsStyles}
    `;
  }
  /**
   * ヘッダーテンプレート
   */
  getHeaderTemplate() {
    return `
      <!-- 共通ヘッダーテンプレート -->
      <header id="customHeader" class="custom-header">
        <div class="header-content">
          <div class="header-left">
            <h1 data-header-title="${this.config.title}">${this.config.title}</h1>
          </div>
          <div class="header-center">
            <div class="search-container">
              <select id="searchOption" data-header-search-select>
                <option value="www+search">キーワード</option>
                <option value="www+tag">タグ</option>
                <option value="www+mylist_search">マイリスト</option>
                <option value="seiga+search">静画</option>
                <option value="live+search">生放送</option>
                <option value="ch+search">チャンネル</option>
                <option value="dic+s/al/t">大百科</option>
              </select>
              <input type="text" id="searchWords" data-header-search-input placeholder="入力して検索…" />
              <button id="searchExec" data-header-search-btn class="icon-btn" title="検索">
                ${createMaterialIcon(ICONS.search, { style: "outlined", color: "white" })}
              </button>
              <button id="searchClear" data-header-clear-btn class="icon-btn clear-btn" title="クリア">
                ${createMaterialIcon(ICONS.clear, { style: "outlined", color: "white" })}
              </button>
            </div>
          </div>
          <div class="header-right">
            <nav class="header-links">
              <a href="https://www.nicovideo.jp/" target="_blank" title="トップ">
                ${createMaterialIcon(ICONS.home, { style: "outlined", color: "white" })}
                トップ
              </a>
              <a href="https://www.nicovideo.jp/video_top" target="_blank" title="動画">
                ${createMaterialIcon(ICONS.play, { style: "outlined", color: "white" })}
                動画
              </a>
              <a href="https://seiga.nicovideo.jp/" target="_blank" title="静画">
                ${createMaterialIcon(ICONS.image, { style: "outlined", color: "white" })}
                静画
              </a>
              <a href="https://live.nicovideo.jp/" target="_blank" title="生放送">
                ${createMaterialIcon(ICONS.live_tv, { style: "outlined", color: "white" })}
                生放送
              </a>
              <a href="https://ch.nicovideo.jp/" target="_blank" title="チャンネル">
                ${createMaterialIcon(ICONS.tv, { style: "outlined", color: "white" })}
                チャンネル
              </a>
              <span class="more-links">
                <button id="moreLinksBtn" data-header-more-btn>その他▼</button>
                <div class="dropdown-content">
                  <a href="https://dic.nicovideo.jp/" target="_blank" title="大百科">
                    大百科
                  </a>
                  <a href="https://jk.nicovideo.jp/" target="_blank" title="実況">
                    実況
                  </a>
                  <a href="https://anime.nicovideo.jp/" target="_blank" title="Nアニメ">
                    Nアニメ
                  </a>
                  <a href="https://www.nicovideo.jp/ranking" target="_blank" title="ランキング">ランキング</a>
                  <a href="https://www.nicovideo.jp/my/history/video" target="_blank" title="マイページ">
                    ${createMaterialIcon(ICONS.bookmark, { style: "outlined", color: "white" })}
                    マイページ
                  </a>
                  <a href="https://www.nicovideo.jp/newarrival" target="_blank" title="新着動画">
                    新着動画
                  </a>
                  <a href="https://www.nicovideo.jp/recent" target="_blank" title="新着コメント">
                    新着コメント
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html" target="_blank" title="Mylist2">
                    Mylist2
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html" target="_blank" title="watch-history">
                    watch-history
                  </a>
                  <a href="https://www.nicovideo.jp/cache/" target="_blank" title="キャッシュ">
                    キャッシュ
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/mylist2/index.html" target="_blank" title="Mylist2 README">
                    README(ML2)
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank" title="CommentFilter2 README">
                    README(CF2)
                  </a>
                  <a href="https://github.com/roflsunriz/filter-matome" target="_blank" title="filter-matome">
                    filter-matome (GitHub)
                  </a>
                </div>
              </span>
            </nav>
          </div>
        </div>
      </header>
    `;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const searchBtn = this.shadowRoot.querySelector("#searchExec");
    const clearBtn = this.shadowRoot.querySelector("#searchClear");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.handleSearch());
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.handleClear());
    }
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch();
        }
      });
    }
    if (this.config.enableFixedMode) {
      window.addEventListener("scroll", () => this.handleScroll());
    }
  }
  /**
   * 設定を適用
   */
  applyConfig() {
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement && this.config.title) {
      titleElement.textContent = this.config.title;
    }
    const searchContainer = this.shadowRoot.querySelector(".search-container");
    if (searchContainer && !this.config.showSearch) {
      searchContainer.style.display = "none";
    }
    const moreLinks = this.shadowRoot.querySelector(".more-links");
    if (moreLinks && !this.config.showMoreLinks) {
      moreLinks.style.display = "none";
    }
    if (this.config.customLinks && this.config.customLinks.length > 0) {
      this.addCustomLinks();
    }
  }
  /**
   * カスタムリンクを追加
   */
  addCustomLinks() {
    const headerLinks = this.shadowRoot.querySelector(".header-links");
    if (!headerLinks || !this.config.customLinks) return;
    this.config.customLinks.forEach((link) => {
      const linkElement = document.createElement("a");
      linkElement.href = link.url;
      linkElement.textContent = link.text;
      linkElement.target = link.target || "_blank";
      headerLinks.appendChild(linkElement);
    });
  }
  /**
   * 検索処理
   */
  handleSearch() {
    const searchSelect = this.shadowRoot.querySelector("#searchOption");
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (!searchSelect || !searchInput || !searchInput.value.trim()) return;
    const searchType = searchSelect.value;
    const searchWords = encodeURIComponent(searchInput.value.trim());
    const baseUrl = "https://www.nicovideo.jp/search";
    let searchUrl;
    switch (searchType) {
      case "www+tag":
        searchUrl = `${baseUrl}/${searchWords}?f_range=0&type=tag`;
        break;
      case "www+mylist_search":
        searchUrl = `https://www.nicovideo.jp/mylist_search/${searchWords}`;
        break;
      case "seiga+search":
        searchUrl = `https://seiga.nicovideo.jp/search/${searchWords}`;
        break;
      case "live+search":
        searchUrl = `https://live.nicovideo.jp/search?keyword=${searchWords}`;
        break;
      case "ch+search":
        searchUrl = `https://ch.nicovideo.jp/search?q=${searchWords}`;
        break;
      case "dic+s/al/t":
        searchUrl = `https://dic.nicovideo.jp/s/al/t/${searchWords}`;
        break;
      default:
        searchUrl = `${baseUrl}/${searchWords}`;
    }
    window.open(searchUrl, "_blank");
  }
  /**
   * 検索クリア処理
   */
  handleClear() {
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
  }
  /**
   * スクロール処理（固定モード用）
   */
  handleScroll() {
    const header = this.shadowRoot.querySelector(".custom-header");
    if (!header) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 100 && !this.isFixed) {
      header.classList.add("fixed");
      this.isFixed = true;
    } else if (scrollTop <= 100 && this.isFixed) {
      header.classList.remove("fixed");
      this.isFixed = false;
    }
  }
  /**
   * ヘッダーのタイトルを更新
   */
  setTitle(title) {
    this.config.title = title;
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  /**
   * 固定モードの切り替え
   */
  toggleFixedMode(enabled) {
    this.config.enableFixedMode = enabled;
    if (enabled) {
      window.addEventListener("scroll", () => this.handleScroll());
    } else {
      window.removeEventListener("scroll", () => this.handleScroll());
      const header = this.shadowRoot.querySelector(".custom-header");
      if (header) {
        header.classList.remove("fixed");
        this.isFixed = false;
      }
    }
  }
  /**
   * Shadow DOM のルートを取得（外部からアクセス可能）
   */
  getShadowRoot() {
    return this.shadowRoot;
  }
  /**
   * Shadow DOM内の要素を取得するヘルパーメソッド
   */
  querySelector(selector) {
    return this.shadowRoot.querySelector(selector);
  }
  /**
   * ヘッダーを破棄
   */
  destroy() {
    window.removeEventListener("scroll", () => this.handleScroll());
    this.shadowRoot.innerHTML = "";
  }
}
function createHeader(containerId, config) {
  return new CommonHeader(containerId, config);
}
window.NicoCommon = {
  CommonHeader,
  createHeader
};

var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["NONE"] = 0] = "NONE";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["LOG"] = 2] = "LOG";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["DEBUG"] = 5] = "DEBUG";
  return LogLevel2;
})(LogLevel || {});

class Logger {
  constructor() {
    this.currentLevel = LogLevel.ERROR;
    this.enabledFiles = /* @__PURE__ */ new Set();
    this.disabledFiles = /* @__PURE__ */ new Set();
    this.initializeLoggerConfig();
  }
  initializeLoggerConfig() {
    this.setLevel(LogLevel.ERROR);
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  setLevel(level) {
    this.currentLevel = level;
  }
  getCallerInfo() {
    const error = new Error();
    const stack = error.stack?.split("\n")[3] || "";
    const urlMatch = stack.match(/(?:@|at\s+)https:\/\/www\.nicovideo\.jp\/local\/(.*?\.js:\d+:\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const localMatch = stack.match(/\((.+?)\)/);
    if (localMatch) {
      const fullPath = localMatch[1].split("/");
      return fullPath[fullPath.length - 1].replace(/:\d+:\d+$/, "");
    }
    return "unknown";
  }
  enableLogging(filePattern) {
    this.enabledFiles.add(filePattern);
  }
  disableLogging(filePattern) {
    this.disabledFiles.add(filePattern);
  }
  shouldLog(filename) {
    const isDisabled = [...this.disabledFiles].some((pattern) => {
      if (pattern === "All") return true;
      return filename.includes(pattern);
    });
    if (isDisabled) {
      return [...this.enabledFiles].some((pattern) => filename.includes(pattern));
    }
    return true;
  }
  _log(level, args) {
    if (this.currentLevel < level) return;
    const filename = this.getCallerInfo();
    if (!this.shouldLog(filename)) return;
    const prefix = `[${filename}]`;
    switch (level) {
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.LOG:
        console.log(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
    }
  }
  info(...args) {
    this._log(LogLevel.INFO, args);
  }
  log(...args) {
    this._log(LogLevel.LOG, args);
  }
  warn(...args) {
    this._log(LogLevel.WARN, args);
  }
  error(...args) {
    this._log(LogLevel.ERROR, args);
  }
  debug(...args) {
    this._log(LogLevel.DEBUG, args);
  }
  handleError(component, method, error) {
    this.error(`[${component}::${method}] エラーが発生しました:`, error);
    this.debug(component, method, "エラー発生", error);
  }
  measurePerformance(component, method, callback) {
    const start = performance.now();
    try {
      callback();
    } catch (error) {
      this.handleError(component, method, error);
    } finally {
      const end = performance.now();
      this.debug(component, method, `実行時間: ${end - start}ms`);
    }
  }
}
const logger = Logger.getInstance();
window.logger = logger;

class MigrationManager {
  constructor(config) {
    this.migrations = [];
    this.currentProgress = {
      isRunning: false,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      error: null
    };
    this.config = {
      autoMigration: true,
      autoPersist: true,
      autoBackup: true,
      backupBeforeMigration: true,
      ...config
    };
    this.initializeMigrations();
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  /**
   * マイグレーション定義を初期化するのじゃ
   */
  initializeMigrations() {
    this.migrations.push({
      id: "add-series-info",
      fromVersion: 1,
      toVersion: 2,
      description: "視聴履歴にシリーズ情報を追加",
      migrate: this.migrateV1ToV2.bind(this)
    });
    logger.debug(`[MigrationManager] ${this.migrations.length}個のマイグレーションを定義しました`);
  }
  /**
   * v1からv2へのマイグレーション（シリーズ情報追加）
   */
  async migrateV1ToV2(db, transaction) {
    logger.info("[MigrationManager] v1→v2マイグレーション開始: シリーズ情報を追加");
    const store = transaction.objectStore("watchHistory");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result;
        let processedCount = 0;
        if (entries.length === 0) {
          logger.info("[MigrationManager] マイグレーション対象のデータがありません");
          resolve();
          return;
        }
        entries.forEach((entry) => {
          if (!("series" in entry)) {
            const updatedEntry = {
              ...entry,
              series: null
              // デフォルト値を設定
            };
            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => {
              processedCount++;
              if (processedCount === entries.length) {
                logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを更新`);
                resolve();
              }
            };
            updateRequest.onerror = () => {
              logger.error("[MigrationManager] データ更新エラー:", updateRequest.error);
              reject(new Error(MigrationManager.toErrorMessage(updateRequest.error)));
            };
          } else {
            processedCount++;
            if (processedCount === entries.length) {
              logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを確認`);
              resolve();
            }
          }
        });
      };
      request.onerror = () => {
        logger.error("[MigrationManager] データ取得エラー:", request.error);
        reject(new Error(MigrationManager.toErrorMessage(request.error)));
      };
    });
  }
  /**
   * 必要なマイグレーションを実行するのじゃ
   */
  async executeMigrations(db, oldVersion, newVersion) {
    const requiredMigrations = this.migrations.filter(
      (migration) => migration.fromVersion >= oldVersion && migration.toVersion <= newVersion
    );
    if (requiredMigrations.length === 0) {
      logger.info("[MigrationManager] 実行するマイグレーションがありません");
      return;
    }
    logger.info(`[MigrationManager] ${requiredMigrations.length}個のマイグレーションを実行します`);
    this.currentProgress = {
      isRunning: true,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: requiredMigrations.length,
      error: null
    };
    this.dispatchProgressEvent();
    try {
      if (this.config.backupBeforeMigration) {
        await this.createBackup(db);
      }
      for (let i = 0; i < requiredMigrations.length; i++) {
        const migration = requiredMigrations[i];
        this.currentProgress.currentMigration = migration.description;
        this.currentProgress.progress = i / requiredMigrations.length;
        this.dispatchProgressEvent();
        logger.info(`[MigrationManager] マイグレーション実行中: ${migration.description}`);
        const storeNames = ["watchHistory", "seriesAlerts"];
        const transaction = db.transaction(storeNames, "readwrite");
        await migration.migrate(db, transaction);
        this.currentProgress.completedCount++;
        this.currentProgress.progress = (i + 1) / requiredMigrations.length;
        this.dispatchProgressEvent();
      }
      this.currentProgress.isRunning = false;
      this.currentProgress.currentMigration = null;
      this.currentProgress.progress = 1;
      this.dispatchProgressEvent();
      logger.info("[MigrationManager] 全てのマイグレーションが完了しました");
    } catch (error) {
      this.currentProgress.error = error instanceof Error ? error.message : String(error);
      this.currentProgress.isRunning = false;
      this.dispatchProgressEvent();
      logger.error("[MigrationManager] マイグレーション実行エラー:", error);
      throw new Error(String(error));
    }
  }
  /**
   * データベースの永続化を要求するのじゃ
   */
  async requestPersistence() {
    try {
      if (!("storage" in navigator) || !("persist" in navigator.storage)) {
        return {
          success: false,
          error: "このブラウザはデータベース永続化をサポートしていません"
        };
      }
      const isPersistent = await navigator.storage.persist();
      if (isPersistent) {
        logger.info("[MigrationManager] データベースの永続化に成功しました");
        return { success: true, data: true };
      } else {
        logger.warn("[MigrationManager] データベースの永続化に失敗しました");
        return { success: true, data: false };
      }
    } catch (error) {
      logger.error("[MigrationManager] 永続化要求エラー:", error);
      return {
        success: false,
        error: `永続化要求失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * 永続化状態を取得するのじゃ
   */
  async getPersistenceStatus() {
    try {
      if (!("storage" in navigator)) {
        return {
          success: false,
          error: "このブラウザはStorage APIをサポートしていません"
        };
      }
      const [isPersistent, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate()
      ]);
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usageRate = quota > 0 ? usage / quota : 0;
      const canPersist = "persist" in navigator.storage;
      const status = {
        isPersistent,
        quota,
        usage,
        usageRate,
        canPersist
      };
      return { success: true, data: status };
    } catch (error) {
      logger.error("[MigrationManager] 永続化状態取得エラー:", error);
      return {
        success: false,
        error: `永続化状態取得失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * バックアップを作成するのじゃ
   */
  async createBackup(db) {
    if (!this.config.autoBackup) return;
    try {
      logger.info("[MigrationManager] バックアップを作成中...");
      const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readonly");
      const watchHistoryStore = transaction.objectStore("watchHistory");
      const seriesAlertsStore = transaction.objectStore("seriesAlerts");
      const [watchHistory, seriesAlerts] = await Promise.all([
        new Promise((resolve, reject) => {
          const request = watchHistoryStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        }),
        new Promise((resolve, reject) => {
          const request = seriesAlertsStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        })
      ]);
      const backup = {
        version: db.version,
        timestamp: Date.now(),
        entries: watchHistory,
        seriesAlerts
      };
      const backupKey = `watch-history-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      this.cleanupOldBackups();
      logger.info("[MigrationManager] バックアップを作成しました:", backupKey);
    } catch (error) {
      logger.error("[MigrationManager] バックアップ作成エラー:", error);
    }
  }
  /**
   * 古いバックアップを削除するのじゃ
   */
  cleanupOldBackups() {
    try {
      const backupKeys = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).sort((a, b) => {
        const timestampA = parseInt(a.split("-").pop() || "0");
        const timestampB = parseInt(b.split("-").pop() || "0");
        return timestampB - timestampA;
      });
      backupKeys.slice(5).forEach((key) => {
        localStorage.removeItem(key);
        logger.debug(`[MigrationManager] 古いバックアップを削除: ${key}`);
      });
    } catch (error) {
      logger.error("[MigrationManager] バックアップ削除エラー:", error);
    }
  }
  /**
   * マイグレーション進捗イベントを発行するのじゃ
   */
  dispatchProgressEvent() {
    const event = new CustomEvent("migrationProgress", {
      detail: { ...this.currentProgress }
    });
    document.dispatchEvent(event);
  }
  /**
   * 現在のマイグレーション進捗を取得するのじゃ
   */
  getMigrationProgress() {
    return { ...this.currentProgress };
  }
  /**
   * マイグレーション設定を取得するのじゃ
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * マイグレーション設定を更新するのじゃ
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info("[MigrationManager] 設定を更新しました:", this.config);
  }
  /**
   * 利用可能なバックアップ一覧を取得するのじゃ
   */
  getAvailableBackups() {
    try {
      const backups = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).map((key) => {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            key,
            timestamp: typeof backup.timestamp === "number" ? backup.timestamp : 0,
            version: typeof backup.version === "number" ? backup.version : 0
          };
        } catch {
          return null;
        }
      }).filter((backup) => backup !== null).sort((a, b) => b.timestamp - a.timestamp);
      return backups;
    } catch (error) {
      logger.error("[MigrationManager] バックアップ一覧取得エラー:", error);
      return [];
    }
  }
  /**
   * バックアップからリストアするのじゃ
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: "バックアップデータが見つかりません" };
      }
      const backup = JSON.parse(backupData);
      logger.info("[MigrationManager] バックアップからリストア中...", backupKey);
      const request = indexedDB.open("NicoWatchHistory", backup.version);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readwrite");
          const watchHistoryStore = transaction.objectStore("watchHistory");
          const seriesAlertsStore = transaction.objectStore("seriesAlerts");
          Promise.all([
            new Promise((resolve2, reject2) => {
              const clearRequest = watchHistoryStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            }),
            new Promise((resolve2, reject2) => {
              const clearRequest = seriesAlertsStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            })
          ]).then(() => {
            const promises = [];
            const entries = backup.entries || backup.watchHistory || [];
            entries.forEach((entry) => {
              promises.push(new Promise((resolve2, reject2) => {
                const addRequest = watchHistoryStore.add(entry);
                addRequest.onsuccess = () => resolve2();
                addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
              }));
            });
            if (backup.seriesAlerts && Array.isArray(backup.seriesAlerts)) {
              backup.seriesAlerts.forEach((alert) => {
                promises.push(new Promise((resolve2, reject2) => {
                  const addRequest = seriesAlertsStore.add(alert);
                  addRequest.onsuccess = () => resolve2();
                  addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
                }));
              });
            }
            Promise.all(promises).then(() => {
              logger.info("[MigrationManager] バックアップからのリストアが完了しました");
              resolve({ success: true });
            }).catch((error) => {
              logger.error("[MigrationManager] リストア中にエラーが発生:", error);
              reject(new Error(`リストア失敗: ${MigrationManager.toErrorMessage(error)}`));
            });
          }).catch((error) => {
            logger.error("[MigrationManager] データクリア中にエラーが発生:", error);
            reject(new Error(`データクリア失敗: ${MigrationManager.toErrorMessage(error)}`));
          });
        };
        request.onerror = () => {
          logger.error("[MigrationManager] データベース開放エラー:", request.error);
          reject(new Error(`データベース開放失敗: ${MigrationManager.toErrorMessage(request.error)}`));
        };
      });
    } catch (error) {
      logger.error("[MigrationManager] リストアエラー:", error);
      return { success: false, error: `リストア失敗: ${MigrationManager.toErrorMessage(error)}` };
    }
  }
}
const migrationManager = new MigrationManager();

class WatchHistoryDatabase {
  constructor(config) {
    this.db = null;
    this.config = {
      dbName: config?.dbName || "NicoWatchHistory",
      version: config?.version || 2,
      storeName: config?.storeName || "watchHistory"
    };
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  /**
   * データベースを初期化するのじゃ
   */
  async initialize() {
    try {
      logger.debug("データベース初期化開始:", { dbName: this.config.dbName, version: this.config.version });
      const request = indexedDB.open(this.config.dbName, this.config.version);
      const initResult = await new Promise((resolve, reject) => {
        request.onerror = () => {
          logger.error("データベース接続失敗");
          reject(new Error("データベース接続失敗なのじゃ"));
        };
        request.onsuccess = () => {
          this.db = request.result;
          logger.debug("データベース初期化成功:", { dbName: this.config.dbName });
          resolve({ success: true });
        };
        request.onupgradeneeded = async (event) => {
          const db = event.target.result;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion || this.config.version;
          logger.debug("データベーススキーマ更新:", {
            oldVersion,
            newVersion,
            version: this.config.version
          });
          if (oldVersion === 0) {
            const store = db.createObjectStore(this.config.storeName, {
              keyPath: "videoId"
            });
            logger.debug("新しいストアを作成:", { storeName: this.config.storeName });
            store.createIndex("watchedAt", "watchedAt", { unique: false });
            store.createIndex("ownerId", "ownerId", { unique: false });
            store.createIndex("completed", "completed", { unique: false });
            store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
            store.createIndex("title", "title", { unique: false });
            store.createIndex("seriesId", "series.id", { unique: false });
            const alertStore = db.createObjectStore("seriesAlerts", {
              keyPath: "id"
            });
            logger.debug("シリーズアラートストアを作成");
            alertStore.createIndex("seriesId", "seriesId", { unique: false });
            alertStore.createIndex("enabled", "enabled", { unique: false });
            alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
            logger.debug("インデックス作成完了");
          } else {
            try {
              if (!db.objectStoreNames.contains(this.config.storeName)) {
                const store = db.createObjectStore(this.config.storeName, {
                  keyPath: "videoId"
                });
                store.createIndex("watchedAt", "watchedAt", { unique: false });
                store.createIndex("ownerId", "ownerId", { unique: false });
                store.createIndex("completed", "completed", { unique: false });
                store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
                store.createIndex("title", "title", { unique: false });
                store.createIndex("seriesId", "series.id", { unique: false });
              }
              if (!db.objectStoreNames.contains("seriesAlerts")) {
                const alertStore = db.createObjectStore("seriesAlerts", {
                  keyPath: "id"
                });
                alertStore.createIndex("seriesId", "seriesId", { unique: false });
                alertStore.createIndex("enabled", "enabled", { unique: false });
                alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
              }
              await migrationManager.executeMigrations(db, oldVersion, newVersion);
            } catch (error) {
              logger.error("マイグレーション実行エラー:", error);
            }
          }
        };
      });
      if (initResult.success && migrationManager.getConfig().autoPersist) {
        try {
          await migrationManager.requestPersistence();
        } catch (error) {
          logger.warn("永続化自動要求失敗:", error);
        }
      }
      return initResult;
    } catch (error) {
      return { success: false, error: `初期化失敗: ${String(error)}` };
    }
  }
  /**
   * 視聴履歴エントリを保存するのじゃ（upsert操作）
   */
  async saveEntry(entry) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        transaction.onabort = () => {
          reject(new Error("保存処理が中断されたのじゃ"));
        };
        const getRequest = store.get(entry.videoId);
        getRequest.onsuccess = () => {
          const existingEntry = getRequest.result;
          if (existingEntry) {
            const updated = {
              ...existingEntry,
              ...entry,
              // watchLogsはマージ
              watchLogs: this.mergeWatchLogs(existingEntry.watchLogs, entry.watchLogs),
              // 初回視聴日時は保持
              firstWatchedAt: existingEntry.firstWatchedAt || entry.firstWatchedAt
            };
            const putRequest = store.put(updated);
            putRequest.onerror = () => {
              reject(new Error(`更新失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          } else {
            const putRequest = store.put(entry);
            putRequest.onerror = () => {
              reject(new Error(`追加失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          }
        };
        getRequest.onerror = () => {
          reject(new Error(`既存エントリ確認失敗: ${WatchHistoryDatabase.toErrorMessage(getRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `保存失敗: ${String(error)}` };
    }
  }
  /**
   * 個別エントリを取得するのじゃ
   */
  async getEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const result = await new Promise((resolve, reject) => {
        const request = store.get(videoId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "動画が見つからぬのじゃ" };
      }
    } catch (error) {
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
  /**
   * 全エントリを取得するのじゃ（ソート・フィルタ付き）
   */
  async getAllEntries(sortBy = "watchedAt", sortOrder = "desc", filter) {
    logger.debug("getAllEntries開始:", { sortBy, sortOrder, filter });
    if (!this.db) {
      logger.error("データベース未初期化");
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const entries = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      logger.debug("データベースからエントリ取得完了:", { totalEntries: entries.length });
      if (entries.length > 0) {
        logger.debug("最初のエントリ:", entries[0]);
      }
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
        logger.debug("フィルタ適用後:", { filteredCount: filteredEntries.length });
      }
      const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder);
      logger.debug("getAllEntries完了:", { resultCount: sortedEntries.length });
      return { success: true, data: sortedEntries };
    } catch (error) {
      logger.error("getAllEntriesエラー:", error);
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
  /**
   * 統計データを計算するのじゃ
   */
  async calculateStats() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "統計計算用データ取得失敗なのじゃ" };
    }
    const entries = entriesResult.data;
    try {
      const totalVideos = entries.length;
      const totalWatchTime = entries.reduce((sum, entry) => sum + entry.lastPosition, 0);
      const completedCount = entries.filter((entry) => entry.completed).length;
      const completionRate = totalVideos > 0 ? completedCount / totalVideos : 0;
      const dailyStats = this.calculateDailyStats(entries);
      const hourlyStats = this.calculateHourlyStats(entries);
      const creatorStats = this.calculateCreatorStats(entries);
      const stats = {
        totalVideos,
        totalWatchTime,
        completionRate,
        dailyStats,
        hourlyStats,
        creatorStats
      };
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `統計計算失敗: ${String(error)}` };
    }
  }
  /**
   * データをエクスポートするのじゃ
   */
  async exportData() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "エクスポート用データ取得失敗なのじゃ" };
    }
    const seriesAlertsResult = await this.getAllSeriesAlerts();
    const seriesAlerts = seriesAlertsResult.success && seriesAlertsResult.data ? seriesAlertsResult.data : [];
    const exportData = {
      exportedAt: Date.now(),
      version: "2.0.0",
      entries: entriesResult.data,
      seriesAlerts
    };
    return { success: true, data: exportData };
  }
  /**
   * データをインポートするのじゃ
   */
  async importData(exportData, config) {
    if (!exportData.entries || !Array.isArray(exportData.entries)) {
      return { success: false, error: "不正なデータ形式なのじゃ" };
    }
    let importedCount = 0;
    const maxEntries = config.maxEntries || exportData.entries.length;
    try {
      for (const entry of exportData.entries.slice(0, maxEntries)) {
        const existingEntry = await this.getEntry(entry.videoId);
        if (existingEntry.success && existingEntry.data) {
          if (config.duplicateHandling === "skip") {
            continue;
          } else if (config.duplicateHandling === "overwrite") {
            await this.saveEntry(entry);
            importedCount++;
          } else if (config.duplicateHandling === "merge") {
            const merged = this.mergeEntries(existingEntry.data, entry);
            await this.saveEntry(merged);
            importedCount++;
          }
        } else {
          await this.saveEntry(entry);
          importedCount++;
        }
      }
      if (exportData.seriesAlerts && Array.isArray(exportData.seriesAlerts)) {
        for (const alert of exportData.seriesAlerts) {
          const existingAlert = await this.getSeriesAlert(alert.id);
          if (existingAlert.success && existingAlert.data) {
            if (config.duplicateHandling === "skip") {
              continue;
            } else if (config.duplicateHandling === "overwrite") {
              await this.saveSeriesAlert(alert);
              importedCount++;
            } else if (config.duplicateHandling === "merge") {
              const merged = alert.updatedAt > existingAlert.data.updatedAt ? alert : existingAlert.data;
              await this.saveSeriesAlert(merged);
              importedCount++;
            }
          } else {
            await this.saveSeriesAlert(alert);
            importedCount++;
          }
        }
      }
      return { success: true, data: importedCount };
    } catch (error) {
      return { success: false, error: `インポート失敗: ${String(error)}` };
    }
  }
  // ===== プライベートメソッド =====
  /**
   * 視聴ログをマージするのじゃ
   */
  mergeWatchLogs(existing, newLogs) {
    const merged = [...existing];
    for (const newLog of newLogs) {
      const existingIndex = merged.findIndex(
        (log) => Math.abs(log.date - newLog.date) < 1e3
        // 1秒以内は同じ視聴とみなす
      );
      if (existingIndex >= 0) {
        merged[existingIndex] = newLog;
      } else {
        merged.push(newLog);
      }
    }
    return merged.sort((a, b) => a.date - b.date);
  }
  /**
   * エントリをマージするのじゃ
   */
  mergeEntries(existing, newEntry) {
    return {
      ...existing,
      ...newEntry,
      // 重要フィールドは最新の情報を優先
      watchedAt: Math.max(existing.watchedAt, newEntry.watchedAt),
      firstWatchedAt: Math.min(existing.firstWatchedAt, newEntry.firstWatchedAt),
      watchCount: existing.watchCount + newEntry.watchCount,
      watchLogs: this.mergeWatchLogs(existing.watchLogs, newEntry.watchLogs)
    };
  }
  /**
   * フィルタを適用するのじゃ
   */
  applyFilter(entries, filter) {
    return entries.filter((entry) => {
      const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
      if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(" "),
          entry.memo
        ].join(" ").toLowerCase();
        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
      const ownerIdFilter = filter.ownerId && String(filter.ownerId).trim().toLowerCase();
      if (ownerIdFilter && ownerIdFilter !== "null" && ownerIdFilter !== "undefined") {
        if (String(entry.ownerId).toLowerCase() !== ownerIdFilter) {
          return false;
        }
      }
      if (filter.completedOnly && !entry.completed) {
        return false;
      }
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (watchedAt < filter.dateRange.start || watchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * ソートを適用するのじゃ
   */
  applySorting(entries, sortBy, sortOrder) {
    return entries.sort((a, b) => {
      let aValue;
      let bValue;
      switch (sortBy) {
        case "watchedAt":
          aValue = a.watchedAt;
          bValue = b.watchedAt;
          break;
        case "firstWatchedAt":
          aValue = a.firstWatchedAt;
          bValue = b.firstWatchedAt;
          break;
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "ownerName":
          aValue = a.ownerName;
          bValue = b.ownerName;
          break;
        case "lengthSec":
          aValue = a.lengthSec;
          bValue = b.lengthSec;
          break;
        case "watchCount":
          aValue = a.watchCount;
          bValue = b.watchCount;
          break;
        case "viewCount":
          aValue = a.stats?.viewCount || 0;
          bValue = b.stats?.viewCount || 0;
          break;
        case "commentCount":
          aValue = a.stats?.commentCount || 0;
          bValue = b.stats?.commentCount || 0;
          break;
        case "mylistCount":
          aValue = a.stats?.mylistCount || 0;
          bValue = b.stats?.mylistCount || 0;
          break;
        case "likeCount":
          aValue = a.stats?.likeCount || 0;
          bValue = b.stats?.likeCount || 0;
          break;
        case "uploadedAt":
          aValue = a.stats?.uploadedAt || 0;
          bValue = b.stats?.uploadedAt || 0;
          break;
        default:
          aValue = a.watchedAt;
          bValue = b.watchedAt;
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        const result = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortOrder === "asc" ? result : -result;
      }
    });
  }
  /**
   * 日別統計を計算するのじゃ
   */
  calculateDailyStats(entries) {
    const dailyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const date = new Date(entry.watchedAt).toISOString().split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          watchCount: 0,
          totalWatchTime: 0,
          completedCount: 0
        });
      }
      const stats = dailyMap.get(date);
      stats.watchCount += entry.watchCount;
      stats.totalWatchTime += entry.lastPosition;
      if (entry.completed) {
        stats.completedCount++;
      }
    }
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  /**
   * 時間帯別統計を計算するのじゃ
   */
  calculateHourlyStats(entries) {
    const hourlyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      for (const log of entry.watchLogs) {
        const hour = new Date(log.date).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    }
    const hourlyStats = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.push({
        hour,
        watchCount: hourlyMap.get(hour) || 0
      });
    }
    return hourlyStats;
  }
  /**
   * 投稿者別統計を計算するのじゃ
   */
  calculateCreatorStats(entries) {
    const creatorMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!creatorMap.has(entry.ownerId)) {
        creatorMap.set(entry.ownerId, {
          ownerId: entry.ownerId,
          ownerName: entry.ownerName,
          videoCount: 0,
          totalWatchTime: 0
        });
      }
      const stats = creatorMap.get(entry.ownerId);
      stats.videoCount++;
      stats.totalWatchTime += entry.lastPosition;
    }
    return Array.from(creatorMap.values()).sort((a, b) => b.videoCount - a.videoCount);
  }
  // ===== シリーズ関連メソッド =====
  /**
   * シリーズ統計を取得するのじゃ
   */
  async getSeriesStats(filter) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ統計用データ取得失敗なのじゃ" };
    }
    const entries = entriesResult.data;
    const seriesMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!entry.series) continue;
      const seriesId = entry.series.id;
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          seriesId,
          seriesTitle: entry.series.title,
          watchedCount: 0,
          totalCount: 0,
          // 実際の総数は不明なので0に設定
          progressRate: 0,
          lastWatchedAt: 0,
          lastVideoId: "",
          lastVideoTitle: ""
        });
      }
      const stats = seriesMap.get(seriesId);
      stats.watchedCount++;
      if (entry.watchedAt > stats.lastWatchedAt) {
        stats.lastWatchedAt = entry.watchedAt;
        stats.lastVideoId = entry.videoId;
        stats.lastVideoTitle = entry.title;
      }
    }
    let seriesStats = Array.from(seriesMap.values());
    if (filter) {
      seriesStats = this.applySeriesFilter(seriesStats, filter);
    }
    return { success: true, data: seriesStats };
  }
  /**
   * シリーズの動画一覧を取得するのじゃ
   */
  async getSeriesVideos(seriesId) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ動画取得失敗なのじゃ" };
    }
    const seriesVideos = entriesResult.data.filter(
      (entry) => entry.series && entry.series.id === seriesId
    );
    return { success: true, data: seriesVideos };
  }
  /**
   * シリーズアラートを保存するのじゃ
   */
  async saveSeriesAlert(alert) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const putRequest = store.put(alert);
        putRequest.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート保存失敗: ${String(error)}` };
    }
  }
  /**
   * シリーズアラートを取得するのじゃ
   */
  async getSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const result = await new Promise((resolve, reject) => {
        const request = store.get(alertId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "シリーズアラートが見つからぬのじゃ" };
      }
    } catch (error) {
      return { success: false, error: `シリーズアラート取得失敗: ${String(error)}` };
    }
  }
  /**
   * 全シリーズアラートを取得するのじゃ
   */
  async getAllSeriesAlerts() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const alerts = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      return { success: true, data: alerts };
    } catch (error) {
      return { success: false, error: `シリーズアラート一覧取得失敗: ${String(error)}` };
    }
  }
  /**
   * シリーズアラートを削除するのじゃ
   */
  async deleteSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const deleteRequest = store.delete(alertId);
        deleteRequest.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート削除失敗: ${String(error)}` };
    }
  }
  // ===== 視聴履歴削除機能 =====
  /**
   * 指定した動画IDの視聴履歴を削除するのじゃ（個別削除）
   */
  async deleteEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const deleteRequest = store.delete(videoId);
        deleteRequest.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `視聴履歴削除失敗: ${String(error)}` };
    }
  }
  /**
   * 全ての視聴履歴を削除するのじゃ（一括削除）
   */
  async deleteAllEntries() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const deletedCount = countRequest.result;
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => {
            resolve({ success: true, data: deletedCount });
          };
          clearRequest.onerror = () => {
            reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(clearRequest.error)}`));
          };
        };
        countRequest.onerror = () => {
          reject(new Error(`件数取得失敗: ${WatchHistoryDatabase.toErrorMessage(countRequest.error)}`));
        };
        transaction.onerror = () => {
          reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `一括削除失敗: ${String(error)}` };
    }
  }
  /**
   * 条件に一致する視聴履歴を削除するのじゃ（条件付き削除）
   * @param maxWatchCount 最大視聴回数（この回数以下を削除）
   * @param maxProgressRate 最大進捗率（この進捗率以下を削除、0-100の範囲）
   */
  async deleteEntriesByCondition(maxWatchCount, maxProgressRate) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      return { success: false, error: "無効な条件値なのじゃ（視聴回数は0以上、進捗率は0-100の範囲）" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const deletedVideoIds = [];
        transaction.oncomplete = () => {
          resolve({ success: true, data: deletedVideoIds.length });
        };
        transaction.onerror = () => {
          reject(new Error(`条件付き削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            const progressRate = entry.lengthSec > 0 ? Math.round(entry.lastPosition / entry.lengthSec * 100) : 0;
            if (entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate) {
              deletedVideoIds.push(entry.videoId);
              const deleteRequest = cursor.delete();
              deleteRequest.onerror = () => {
                reject(new Error(`エントリ削除失敗 (${entry.videoId}): ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
                return;
              };
            }
            cursor.continue();
          }
        };
        cursorRequest.onerror = () => {
          reject(new Error(`カーソル取得失敗: ${WatchHistoryDatabase.toErrorMessage(cursorRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `条件付き削除失敗: ${String(error)}` };
    }
  }
  /**
   * チェックが必要なシリーズアラートを取得するのじゃ
   */
  async getAlertsToCheck() {
    const alertsResult = await this.getAllSeriesAlerts();
    if (!alertsResult.success || !alertsResult.data) {
      return { success: false, error: "アラート取得失敗なのじゃ" };
    }
    const now = Date.now();
    const alertsToCheck = alertsResult.data.filter(
      (alert) => alert.enabled && alert.nextCheckAt <= now
    );
    return { success: true, data: alertsToCheck };
  }
  /**
   * シリーズフィルタを適用するのじゃ
   */
  applySeriesFilter(seriesStats, filter) {
    return seriesStats.filter((stats) => {
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }
      if (filter.progressFilter && filter.progressFilter !== "all") {
        switch (filter.progressFilter) {
          case "watching":
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case "completed":
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case "not_started":
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }
      if (filter.dateRange) {
        const lastWatchedAt = stats.lastWatchedAt;
        if (lastWatchedAt < filter.dateRange.start || lastWatchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
  // ===== 永続化・マイグレーション管理メソッド =====
  /**
   * データベースの永続化状態を取得するのじゃ
   */
  async getPersistenceStatus() {
    return await migrationManager.getPersistenceStatus();
  }
  /**
   * データベースの永続化を要求するのじゃ
   */
  async requestPersistence() {
    return await migrationManager.requestPersistence();
  }
  /**
   * マイグレーション進捗を取得するのじゃ
   */
  getMigrationProgress() {
    return migrationManager.getMigrationProgress();
  }
  /**
   * マイグレーション設定を取得するのじゃ
   */
  getMigrationConfig() {
    return migrationManager.getConfig();
  }
  /**
   * マイグレーション設定を更新するのじゃ
   */
  updateMigrationConfig(config) {
    migrationManager.updateConfig(config);
  }
  /**
   * 利用可能なバックアップ一覧を取得するのじゃ
   */
  getAvailableBackups() {
    return migrationManager.getAvailableBackups();
  }
  /**
   * バックアップからリストアするのじゃ
   */
  async restoreFromBackup(backupKey) {
    return await migrationManager.restoreFromBackup(backupKey);
  }
  /**
   * 手動でマイグレーションを実行するのじゃ
   */
  async runMigration() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化なのじゃ" };
    }
    try {
      await migrationManager.executeMigrations(this.db, 1, this.config.version);
      return { success: true };
    } catch (error) {
      return { success: false, error: `マイグレーション実行失敗: ${WatchHistoryDatabase.toErrorMessage(error)}` };
    }
  }
}
const watchHistoryDB = new WatchHistoryDatabase();

class WatchHistoryApp {
  constructor() {
    this.entries = [];
    this.filteredEntries = [];
    this.config = {
      sortBy: "watchedAt",
      sortOrder: "desc",
      filter: {},
      pageSize: 50,
      currentPage: 1
    };
    this.stats = null;
    this.selectedEntry = null;
    // シリーズ関連
    this.seriesStats = [];
    this.filteredSeriesStats = [];
    this.seriesFilter = {};
    this.seriesAlerts = [];
    this.selectedSeries = null;
    this.alertCheckInterval = null;
    // データベース管理関連
    this.persistenceStatus = null;
    this.migrationProgress = null;
    this.databaseConfig = null;
    // DOM要素
    this.elements = {};
    this.initializeElements();
    this.setupEventListeners();
    this.loadConfig();
    this.initializeCommonHeader();
    void this.initialize();
    applyWatchHistoryStyles();
  }
  /**
   * 非同期ハンドラをイベントリスナー用に安全にラップするのじゃ
   */
  guardEvent(handler) {
    return (ev) => {
      try {
        const maybe = handler.call(this, ev);
        if (maybe instanceof Promise) {
          void maybe.catch((error) => {
            logger?.error("[WatchHistory] Event handler error:", error);
          });
        }
      } catch (error) {
        logger?.error("[WatchHistory] Event handler throw:", error);
      }
    };
  }
  /**
   * DOM要素を初期化するのじゃ
   */
  initializeElements() {
    const elementIds = [
      "search-input",
      "search-clear",
      "history-list",
      "loading",
      "empty-state",
      "content-count",
      "refresh-btn",
      "export-btn",
      "import-btn",
      "import-file",
      "history-tab",
      "stats-tab",
      "history-content",
      "stats-content",
      "filter-completed",
      "filter-owner",
      "filter-date-start",
      "filter-date-end",
      "clear-date-range",
      "delete-all-btn",
      "delete-by-condition-btn",
      "delete-watch-count",
      "delete-progress-rate",
      "stats-total-videos",
      "stats-total-time",
      "stats-completion-rate",
      "stats-detail-total-videos",
      "stats-detail-total-time",
      "stats-detail-completion-rate",
      "daily-chart",
      "hourly-chart",
      "creator-stats",
      "tag-cloud",
      "video-detail-modal",
      "modal-title",
      "modal-video-info",
      "modal-close",
      "modal-open-video",
      "modal-edit-memo",
      "memo-edit-modal",
      "memo-textarea",
      "memo-save",
      "memo-cancel",
      "memo-modal-close",
      "favorite-videos",
      "toast-container",
      // シリーズ関連
      "series-tab",
      "series-content",
      "series-search-input",
      "series-search-clear",
      "series-progress-filter",
      "series-refresh-btn",
      "series-count",
      "series-list",
      "series-loading",
      "series-empty-state",
      // シリーズアラート関連
      "series-alert-tab",
      "series-alert-content",
      "add-series-alert-btn",
      "add-series-alert-btn-empty",
      "series-alert-refresh-btn",
      "series-alert-count",
      "series-alert-list",
      "series-alert-loading",
      "series-alert-empty-state",
      // モーダル関連
      "series-alert-modal",
      "series-alert-modal-close",
      "series-alert-series-select",
      "series-alert-interval-select",
      "series-alert-enabled",
      "series-alert-save",
      "series-alert-cancel",
      "series-detail-modal",
      "series-detail-title",
      "series-detail-modal-close",
      "series-detail-info",
      "series-detail-videos",
      "series-detail-add-alert",
      // データベース管理関連
      "database-management-btn",
      "database-management-modal",
      "db-management-modal-close",
      "persistence-badge",
      "persistence-status-text",
      "storage-usage-fill",
      "storage-usage-text",
      "request-persistence-btn",
      "refresh-persistence-btn",
      "migration-progress-container",
      "migration-current-task",
      "migration-progress-fill",
      "migration-progress-text",
      "run-migration-btn",
      "check-migration-btn",
      "create-backup-btn",
      "refresh-backups-btn",
      "backup-list-container",
      "auto-migration-checkbox",
      "auto-persist-checkbox",
      "auto-backup-checkbox",
      "backup-before-migration-checkbox",
      // 手動アラートチェック
      "manual-alert-check-btn",
      "notification-permission-btn",
      // 通知権限モーダル
      "notification-permission-modal",
      "notification-permission-modal-close",
      "test-notification-after-setup"
    ];
    for (const id of elementIds) {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    }
  }
  /**
   * イベントリスナーを設定するのじゃ
   */
  setupEventListeners() {
    this.elements["search-input"]?.addEventListener("input", this.guardEvent((ev) => this.handleSearch(ev)));
    this.elements["search-clear"]?.addEventListener("click", this.guardEvent(() => this.clearSearch()));
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((ev) => this.handleSort(ev)));
    });
    this.elements["filter-completed"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-owner"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-date-start"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-date-end"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["clear-date-range"]?.addEventListener("click", this.guardEvent(() => this.clearDateRange()));
    this.elements["refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshData()));
    this.elements["export-btn"]?.addEventListener("click", this.guardEvent(() => this.handleExport()));
    this.elements["import-btn"]?.addEventListener("click", this.guardEvent(() => this.handleImport()));
    this.elements["import-file"]?.addEventListener("change", this.guardEvent((ev) => this.handleImportFile(ev)));
    this.elements["delete-all-btn"]?.addEventListener("click", this.guardEvent(() => this.deleteAllHistoryEntries()));
    this.elements["delete-by-condition-btn"]?.addEventListener("click", this.guardEvent(() => this.handleConditionalDelete()));
    this.elements["history-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("history");
    }));
    this.elements["stats-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("stats");
    }));
    this.elements["series-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("series");
    }));
    this.elements["series-alert-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("series-alert");
    }));
    this.elements["modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeModal()));
    this.elements["modal-open-video"]?.addEventListener("click", this.guardEvent(() => this.openVideo()));
    this.elements["modal-edit-memo"]?.addEventListener("click", this.guardEvent(() => this.openMemoEdit()));
    this.elements["memo-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeMemoEdit()));
    this.elements["memo-save"]?.addEventListener("click", this.guardEvent(() => this.saveMemo()));
    this.elements["memo-cancel"]?.addEventListener("click", this.guardEvent(() => this.closeMemoEdit()));
    this.elements["video-detail-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["video-detail-modal"]) {
        this.closeModal();
      }
    }));
    this.elements["memo-edit-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["memo-edit-modal"]) {
        this.closeMemoEdit();
      }
    }));
    this.elements["series-search-input"]?.addEventListener("input", this.guardEvent((ev) => this.handleSeriesSearch(ev)));
    this.elements["series-search-clear"]?.addEventListener("click", this.guardEvent(() => this.clearSeriesSearch()));
    this.elements["series-progress-filter"]?.addEventListener("change", this.guardEvent(() => this.handleSeriesFilter()));
    this.elements["series-refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshSeriesData()));
    this.elements["add-series-alert-btn"]?.addEventListener("click", this.guardEvent(() => this.openSeriesAlertModal()));
    this.elements["add-series-alert-btn-empty"]?.addEventListener("click", this.guardEvent(() => this.openSeriesAlertModal()));
    this.elements["series-alert-refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshSeriesAlertData()));
    this.elements["manual-alert-check-btn"]?.addEventListener("click", this.guardEvent(() => this.manualCheckAlerts()));
    this.elements["notification-permission-btn"]?.addEventListener("click", this.guardEvent(() => this.checkNotificationPermission()));
    this.elements["series-alert-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesAlertModal()));
    this.elements["series-alert-save"]?.addEventListener("click", this.guardEvent(() => this.saveSeriesAlert()));
    this.elements["series-alert-cancel"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesAlertModal()));
    this.elements["series-detail-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesDetailModal()));
    this.elements["series-detail-add-alert"]?.addEventListener("click", this.guardEvent(() => this.addAlertFromSeriesDetail()));
    this.elements["series-alert-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["series-alert-modal"]) {
        this.closeSeriesAlertModal();
      }
    }));
    this.elements["series-detail-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["series-detail-modal"]) {
        this.closeSeriesDetailModal();
      }
    }));
    this.elements["database-management-btn"]?.addEventListener("click", this.guardEvent(() => this.openDatabaseManagementModal()));
    this.elements["db-management-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeDatabaseManagementModal()));
    this.elements["request-persistence-btn"]?.addEventListener("click", this.guardEvent(() => this.requestPersistence()));
    this.elements["refresh-persistence-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshPersistenceStatus()));
    this.elements["run-migration-btn"]?.addEventListener("click", this.guardEvent(() => this.runMigration()));
    this.elements["check-migration-btn"]?.addEventListener("click", this.guardEvent(() => this.checkMigrationStatus()));
    this.elements["create-backup-btn"]?.addEventListener("click", this.guardEvent(() => this.createBackup()));
    this.elements["refresh-backups-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshBackupList()));
    this.elements["auto-migration-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["auto-persist-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["auto-backup-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["backup-before-migration-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["database-management-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.elements["database-management-modal"]) {
        this.closeDatabaseManagementModal();
      }
    });
    this.elements["notification-permission-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeNotificationPermissionModal()));
    this.elements["test-notification-after-setup"]?.addEventListener("click", this.guardEvent(() => this.testNotificationAfterSetup()));
    this.elements["notification-permission-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.elements["notification-permission-modal"]) {
        this.closeNotificationPermissionModal();
      }
    });
    document.addEventListener("migrationProgress", this.guardEvent((e) => {
      this.handleMigrationProgress(e);
    }));
  }
  /**
   * 設定を読み込むのじゃ
   */
  loadConfig() {
    const savedConfig = sessionStorage.getItem("watchHistoryConfig");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === "object") {
          this.config = { ...this.config, ...parsed };
        }
        const txt = (this.config.filter.searchText ?? "").trim().toLowerCase();
        if (!txt || txt === "null" || txt === "undefined") {
          delete this.config.filter.searchText;
        } else {
          this.config.filter.searchText = txt;
        }
      } catch (error) {
        logger.warn("設定読み込みエラー:", error);
      }
    }
  }
  /**
   * 設定を保存するのじゃ
   */
  saveConfig() {
    sessionStorage.setItem("watchHistoryConfig", JSON.stringify(this.config));
  }
  /**
   * 共通ヘッダーを初期化するのじゃ
   */
  initializeCommonHeader() {
    const container = document.getElementById("common-header-container");
    if (container) {
      new CommonHeader(container, {
        title: "watch-history",
        showSearch: true,
        showMoreLinks: true,
        enableFixedMode: false
      });
    }
  }
  /**
   * アプリケーションを初期化するのじゃ
   */
  async initialize() {
    try {
      this.showLoading(true);
      await watchHistoryDB.initialize();
      await this.loadData();
      this.updateUI();
    } catch (error) {
      logger.error("初期化エラー:", error);
      this.showToast("初期化に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }
  /**
   * フィルタオブジェクトをサニタイズして返すのじゃ
   */
  cleanFilter(filter) {
    const cleaned = { ...filter };
    const txt = (cleaned.searchText ?? "").trim();
    if (!txt || txt.toLowerCase() === "null" || txt.toLowerCase() === "undefined") {
      delete cleaned.searchText;
    } else {
      cleaned.searchText = txt;
    }
    if (cleaned.ownerId) {
      const oid = String(cleaned.ownerId).trim();
      if (!oid || oid.toLowerCase() === "null" || oid.toLowerCase() === "undefined") {
        delete cleaned.ownerId;
      } else {
        cleaned.ownerId = oid;
      }
    }
    if (cleaned.dateRange) {
      const { start, end } = cleaned.dateRange;
      if (!start && !end) {
        delete cleaned.dateRange;
      }
    }
    return cleaned;
  }
  /**
   * データを読み込むのじゃ
   */
  async loadData() {
    try {
      logger.debug("データ読み込み開始");
      logger.debug("getAllEntries呼び出し前:", {
        sortBy: this.config.sortBy,
        sortOrder: this.config.sortOrder,
        filter: this.config.filter
      });
      const sanitizedFilter = this.cleanFilter(this.config.filter);
      this.config.filter = sanitizedFilter;
      const entriesResult = await watchHistoryDB.getAllEntries(
        this.config.sortBy,
        this.config.sortOrder,
        sanitizedFilter
      );
      logger.debug("履歴データ取得結果:", {
        success: entriesResult.success,
        count: entriesResult.data?.length || 0
      });
      if (entriesResult.success && entriesResult.data) {
        this.entries = entriesResult.data;
        this.filterEntries();
      } else {
        logger.warn("履歴データの取得に失敗:", entriesResult);
        this.entries = [];
        this.filterEntries();
      }
      const statsResult = await watchHistoryDB.calculateStats();
      if (statsResult.success && statsResult.data) {
        this.stats = statsResult.data;
      }
      logger.debug("データ読み込み完了");
    } catch (error) {
      logger.error("データ読み込みエラー:", error);
      throw error;
    }
  }
  /**
   * エントリをフィルタリングするのじゃ
   */
  filterEntries() {
    logger.debug("フィルタリング開始:", {
      totalEntries: this.entries.length,
      filter: this.config.filter
    });
    this.filteredEntries = this.entries.filter((entry) => {
      const filter = this.config.filter;
      const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
      if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(" "),
          entry.memo
        ].join(" ").toLowerCase();
        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
      if (filter.ownerId && String(entry.ownerId) !== String(filter.ownerId)) {
        logger.debug("投稿者フィルタで除外:", {
          videoId: entry.videoId,
          title: entry.title,
          entryOwnerId: entry.ownerId,
          entryOwnerIdType: typeof entry.ownerId,
          filterOwnerId: filter.ownerId,
          filterOwnerIdType: typeof filter.ownerId,
          entryOwnerIdString: String(entry.ownerId),
          filterOwnerIdString: String(filter.ownerId),
          isStringEqual: String(entry.ownerId) === String(filter.ownerId)
        });
        return false;
      }
      if (filter.completedOnly && !entry.completed) {
        return false;
      }
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (watchedAt < filter.dateRange.start || watchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
    logger.debug("フィルタリング完了:", {
      filteredEntries: this.filteredEntries.length
    });
  }
  /**
   * UIを更新するのじゃ
   */
  updateUI() {
    this.updateHistoryList();
    this.updateStats();
    this.updateFilters();
    this.updateContentCount();
  }
  /**
   * 履歴リストを更新するのじゃ
   */
  updateHistoryList() {
    const historyList = this.elements["history-list"];
    if (!historyList) return;
    if (this.filteredEntries.length === 0) {
      historyList.innerHTML = "";
      this.showEmptyState(true);
      return;
    }
    this.showEmptyState(false);
    try {
      const items = this.filteredEntries.map((e) => this.createHistoryItem(e));
      historyList.innerHTML = items.join("");
    } catch (err) {
      logger.error("履歴アイテム生成で例外:", err);
      this.showToast("履歴描画でエラー発生なのじゃ", "error");
    }
    historyList.querySelectorAll(".history-item").forEach((item, index) => {
      item.addEventListener("click", this.guardEvent((e) => {
        if (e.target && e.target.closest(".watch-count-item")) {
          return;
        }
        if (e.target && e.target.closest(".history-delete-btn")) {
          return;
        }
        this.showVideoDetail(this.filteredEntries[index]);
      }));
      const deleteBtn = item.querySelector(".history-delete-btn");
      deleteBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.deleteHistoryEntry(this.filteredEntries[index]);
      }));
    });
    historyList.querySelectorAll(".watch-count-item").forEach((item) => {
      item.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        this.toggleWatchLogsAccordion(item);
      }));
    });
  }
  /**
   * 履歴アイテムのHTMLを生成するのじゃ
   */
  createHistoryItem(entry) {
    const watchedAtDate = new Date(entry.watchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = entry.lastPosition / entry.lengthSec * 100;
      progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }
    const completionIcon = entry.completed ? createMaterialIcon("check_circle", { color: "green", classes: "completion-icon completed" }) : createMaterialIcon("radio_button_unchecked", { color: "default", classes: "completion-icon" });
    return `
      <div class="history-item" data-video-id="${entry.videoId}">
        <div class="history-thumbnail">
          <img src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" 
               alt="${entry.title}" 
               class="thumbnail-image"
               onerror="this.src='/default-thumbnail.jpg'">
          <div class="video-duration">${this.formatDuration(entry.lengthSec)}</div>
        </div>
        <div class="history-content">
          <div class="history-header">
            <h3 class="history-title">${this.escapeHtml(entry.title)}</h3>
            <div class="history-actions">
              ${completionIcon}
              <button class="history-delete-btn btn btn-sm btn-danger" title="この履歴を削除">
                ${createMaterialIcon("delete", { color: "white", size: "small" })}
              </button>
            </div>
          </div>
          <div class="history-meta">
            <div class="history-owner">
              ${createMaterialIcon("person", { color: "dark", size: "small" })}
              ${this.escapeHtml(entry.ownerName)}
            </div>
            <div class="history-date">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              ${watchedAtDate.toLocaleDateString("ja-JP")} ${watchedAtDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
            ${entry.stats?.uploadedAt ? `
              <div class="history-upload-date">
                ${createMaterialIcon("publish", { color: "dark", size: "small" })}
                投稿: ${new Date(entry.stats.uploadedAt).toLocaleDateString("ja-JP")}
              </div>
            ` : ""}
          </div>
          <div class="history-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="progress-text">${progressPercent}%</span>
          </div>
          <div class="history-stats">
            <div class="stat-item watch-count-item" data-video-id="${entry.videoId}">
              ${createMaterialIcon("repeat", { color: "dark", size: "small" })}
              <span class="watch-count-label">${entry.watchCount}回視聴</span>
              ${createMaterialIcon("expand_more", { color: "dark", size: "small", classes: "accordion-icon" })}
            </div>
            <div class="stat-item">
              ${createMaterialIcon("timer", { color: "dark", size: "small" })}
              <span>${this.formatDuration(entry.lengthSec)}</span>
            </div>
            ${entry.stats?.viewCount ? `
              <div class="stat-item">
                ${createMaterialIcon("visibility", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.viewCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.commentCount ? `
              <div class="stat-item">
                ${createMaterialIcon("comment", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.commentCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.mylistCount ? `
              <div class="stat-item">
                ${createMaterialIcon("bookmark", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.mylistCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.likeCount ? `
              <div class="stat-item">
                ${createMaterialIcon("thumb_up", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.likeCount)}</span>
              </div>
            ` : ""}
          </div>
          <div class="watch-logs-accordion" data-video-id="${entry.videoId}">
            <div class="watch-logs-content">
              ${this.createWatchLogsHTML(entry)}
            </div>
          </div>
          ${entry.memo ? `
            <div class="history-memo">
              ${createMaterialIcon("note", { color: "dark", size: "small" })}
              <span class="memo-text">${this.escapeHtml(entry.memo)}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  /**
   * 視聴ログの詳細HTMLを作成するのじゃ
   */
  createWatchLogsHTML(entry) {
    const watchLogs = entry.watchLogs || [];
    const allSessions = [...watchLogs];
    const shouldAddCurrentSession = watchLogs.length === 0 || watchLogs.length > 0 && Math.abs(entry.watchedAt - watchLogs[0].date) > 6e4;
    if (shouldAddCurrentSession) {
      allSessions.unshift({
        date: entry.watchedAt,
        position: entry.lastPosition,
        completed: entry.completed
      });
    }
    if (allSessions.length === 0) {
      return `
        <div class="watch-logs-empty">
          ${createMaterialIcon("info", { color: "dark", size: "small" })}
          <span>視聴記録がありません</span>
        </div>
      `;
    }
    const sortedLogs = [...allSessions].sort((a, b) => b.date - a.date);
    return `
      <div class="watch-logs-list">
        ${sortedLogs.map((log, index) => {
      const logDate = new Date(log.date);
      let progressPercent = 0;
      if (entry.lengthSec > 0) {
        const rawPercent = log.position / entry.lengthSec * 100;
        progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
      }
      const isCurrentSession = shouldAddCurrentSession && index === 0;
      return `
            <div class="watch-log-item ${index === 0 ? "latest" : ""} ${isCurrentSession ? "current-session" : ""}">
              <div class="watch-log-header">
                <div class="watch-log-date">
                  ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
                  <span>${logDate.toLocaleDateString("ja-JP")} ${logDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                  ${index === 0 ? '<span class="latest-badge">最新</span>' : ""}
                  ${isCurrentSession ? '<span class="current-badge">現在</span>' : ""}
                </div>
                <div class="watch-log-completion">
                  ${log.completed ? createMaterialIcon("check_circle", { color: "green", size: "small" }) : createMaterialIcon("play_circle", { color: "dark", size: "small" })}
                  <span class="completion-text">${log.completed ? "完走" : "途中"}</span>
                </div>
              </div>
              <div class="watch-log-progress">
                <div class="progress-bar small">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}% (${this.formatDuration(log.position)})</span>
              </div>
              ${isCurrentSession ? `
                <div class="current-session-note">
                  <span>※ 現在の視聴進捗</span>
                </div>
              ` : ""}
            </div>
          `;
    }).join("")}
      </div>
    `;
  }
  /**
   * 視聴ログアコーディオンを切り替えるのじゃ
   */
  toggleWatchLogsAccordion(item) {
    const videoId = item.getAttribute("data-video-id");
    if (!videoId) return;
    const accordion = document.querySelector(`.watch-logs-accordion[data-video-id="${videoId}"]`);
    if (!accordion) return;
    const icon = item.querySelector(".accordion-icon");
    if (!icon) return;
    const isExpanded = accordion.classList.contains("expanded");
    if (isExpanded) {
      accordion.classList.remove("expanded");
      icon.innerHTML = createMaterialIcon("expand_more", { color: "dark", size: "small" });
    } else {
      accordion.classList.add("expanded");
      icon.innerHTML = createMaterialIcon("expand_less", { color: "dark", size: "small" });
    }
  }
  /**
   * 統計を更新するのじゃ
   */
  updateStats() {
    if (!this.stats) return;
    const totalTime = this.formatDuration(this.stats.totalWatchTime);
    const completionRate = `${Math.round(this.stats.completionRate * 100)}%`;
    if (this.elements["stats-total-videos"]) {
      this.elements["stats-total-videos"].textContent = this.stats.totalVideos.toString();
    }
    if (this.elements["stats-total-time"]) {
      this.elements["stats-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-completion-rate"]) {
      this.elements["stats-completion-rate"].textContent = completionRate;
    }
    if (this.elements["stats-detail-total-videos"]) {
      this.elements["stats-detail-total-videos"].textContent = this.stats.totalVideos.toString();
    }
    if (this.elements["stats-detail-total-time"]) {
      this.elements["stats-detail-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-detail-completion-rate"]) {
      this.elements["stats-detail-completion-rate"].textContent = completionRate;
    }
    this.updateCharts();
    this.updateCreatorStats();
    this.updateTagCloud();
    this.updateFavoriteVideos();
  }
  /**
   * フィルタを更新するのじゃ
   */
  updateFilters() {
    const ownerSelect = this.elements["filter-owner"];
    if (ownerSelect) {
      logger.debug("投稿者フィルタを更新中:", { entriesCount: this.entries.length });
      const ownersMap = /* @__PURE__ */ new Map();
      this.entries.forEach((entry) => {
        if (entry.ownerId && entry.ownerName) {
          ownersMap.set(entry.ownerId, entry.ownerName);
        }
      });
      logger.debug("投稿者マップ作成完了:", { ownersCount: ownersMap.size });
      const currentValue = ownerSelect.value;
      ownerSelect.innerHTML = '<option value="">すべて</option>';
      const sortedOwners = Array.from(ownersMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
      sortedOwners.forEach(([ownerId, ownerName]) => {
        const option = document.createElement("option");
        option.value = ownerId;
        option.textContent = ownerName;
        ownerSelect.appendChild(option);
      });
      ownerSelect.value = currentValue;
      logger.debug("投稿者フィルタ更新完了:", { currentValue, optionsCount: sortedOwners.length });
    }
  }
  /**
   * コンテンツ数を更新するのじゃ
   */
  updateContentCount() {
    const contentCount = this.elements["content-count"];
    if (contentCount) {
      contentCount.textContent = `${this.filteredEntries.length} 件の動画`;
    }
  }
  /**
   * グラフを更新するのじゃ
   */
  updateCharts() {
    if (!this.stats) return;
    const dailyChart = this.elements["daily-chart"];
    if (dailyChart) {
      this.drawDailyChart(dailyChart, this.stats.dailyStats);
    }
    const hourlyChart = this.elements["hourly-chart"];
    if (hourlyChart) {
      this.drawHourlyChart(hourlyChart, this.stats.hourlyStats);
    }
  }
  /**
   * 投稿者統計を更新するのじゃ
   */
  updateCreatorStats() {
    const creatorStats = this.elements["creator-stats"];
    if (!creatorStats || !this.stats) return;
    const topCreators = this.stats.creatorStats.slice(0, 10);
    const html = topCreators.map((creator) => `
      <div class="creator-stat-item">
        <div class="creator-info">
          <span class="creator-name">${this.escapeHtml(creator.ownerName)}</span>
          <span class="creator-count">${creator.videoCount}本</span>
        </div>
        <div class="creator-time">${this.formatDuration(creator.totalWatchTime)}</div>
      </div>
    `).join("");
    creatorStats.innerHTML = html;
  }
  /**
   * タグ統計を計算するのじゃ
   */
  calculateTagStats() {
    const tagCounts = /* @__PURE__ */ new Map();
    this.entries.forEach((entry) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            const normalizedTag = tag.trim();
            tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
          }
        });
      }
    });
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
    if (sortedTags.length === 0) {
      return [];
    }
    const maxCount = Math.max(...sortedTags.map(([, count]) => count));
    const minCount = Math.min(...sortedTags.map(([, count]) => count));
    return sortedTags.map(([tag, count]) => {
      let size = "md";
      if (maxCount > minCount) {
        const ratio = (count - minCount) / (maxCount - minCount);
        if (ratio >= 0.8) size = "xl";
        else if (ratio >= 0.6) size = "lg";
        else if (ratio >= 0.4) size = "md";
        else if (ratio >= 0.2) size = "sm";
        else size = "xs";
      }
      return { tag, count, size };
    });
  }
  /**
   * タグクラウドを更新するのじゃ
   */
  updateTagCloud() {
    const tagCloudElement = this.elements["tag-cloud"];
    if (!tagCloudElement) return;
    const tagStats = this.calculateTagStats();
    if (tagStats.length === 0) {
      tagCloudElement.innerHTML = `
        <div class="tag-cloud-empty">
          ${createMaterialIcon("label", { color: "dark", size: "large" })}
          <span>タグがありません</span>
        </div>
      `;
      return;
    }
    const html = tagStats.map(({ tag, count, size }) => `
      <span class="tag-cloud-item size-${size}" 
            data-tag="${this.escapeHtml(tag)}" 
            data-count="${count}"
            title="${this.escapeHtml(tag)}: ${count}回">
        ${this.escapeHtml(tag)}
      </span>
    `).join("");
    tagCloudElement.innerHTML = html;
    tagCloudElement.querySelectorAll(".tag-cloud-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tag = item.getAttribute("data-tag");
        if (tag) {
          this.searchByTag(tag);
        }
      });
    });
  }
  /**
   * お気に入り動画トップ15を計算するのじゃ
   */
  calculateFavoriteVideos() {
    const list = this.entries.map((entry) => {
      const logs = Array.isArray(entry.watchLogs) ? entry.watchLogs : [];
      let totalScore = 0;
      if (logs.length > 0) {
        totalScore = logs.reduce((sum, log) => {
          const completionRatio = entry.lengthSec > 0 ? log.completed ? 1 : log.position / entry.lengthSec : 0;
          return sum + completionRatio;
        }, 0);
      } else {
        const ratio = entry.lengthSec > 0 ? entry.lastPosition / entry.lengthSec : 0;
        totalScore = ratio;
      }
      return { entry, score: totalScore };
    });
    return list.sort((a, b) => b.score - a.score).slice(0, 15);
  }
  /**
   * お気に入り動画リストを更新するのじゃ
   */
  updateFavoriteVideos() {
    const container = this.elements["favorite-videos"];
    if (!container) return;
    const favorites = this.calculateFavoriteVideos();
    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="favorite-empty">
          ${createMaterialIcon("star", { color: "dark", size: "large" })}
          <span>お気に入り動画がありません</span>
        </div>
      `;
      return;
    }
    const html = favorites.map((item, index) => {
      const { entry, score } = item;
      return `
        <div class="favorite-item" data-video-id="${entry.videoId}">
          <span class="favorite-rank">${index + 1}</span>
          <img class="favorite-thumb" src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" alt="${this.escapeHtml(entry.title)}" onerror="this.src='/default-thumbnail.jpg'">
          <span class="favorite-title">${this.escapeHtml(entry.title)}</span>
          <span class="favorite-score">${score.toFixed(2)}</span>
        </div>
      `;
    }).join("");
    container.innerHTML = html;
    container.querySelectorAll(".favorite-item").forEach((item, idx) => {
      item.addEventListener("click", () => {
        this.showVideoDetail(favorites[idx].entry);
      });
    });
  }
  /**
   * タグで検索するのじゃ
   */
  searchByTag(tag) {
    this.switchTab("history");
    const searchInput = this.elements["search-input"];
    if (searchInput) {
      searchInput.value = tag;
      this.config.filter.searchText = tag;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }
  // ===== イベントハンドラ =====
  /**
   * 検索を処理するのじゃ
   */
  handleSearch(event) {
    const input = event.target;
    this.config.filter.searchText = input.value.trim() || void 0;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }
  /**
   * 検索をクリアするのじゃ
   */
  clearSearch() {
    const searchInput = this.elements["search-input"];
    if (searchInput) {
      searchInput.value = "";
      this.config.filter.searchText = void 0;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }
  /**
   * 期間フィルタを一括クリアするのじゃ
   */
  clearDateRange() {
    const startDateInput = this.elements["filter-date-start"];
    const endDateInput = this.elements["filter-date-end"];
    if (startDateInput) {
      startDateInput.value = "";
    }
    if (endDateInput) {
      endDateInput.value = "";
    }
    this.config.filter.dateRange = void 0;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
    this.showToast("期間フィルタをクリアしました", "success");
  }
  /**
   * ソートを処理するのじゃ
   */
  async handleSort(event) {
    const button = event.currentTarget;
    const sortBy = button.dataset.sort;
    if (this.config.sortBy === sortBy) {
      this.config.sortOrder = this.config.sortOrder === "asc" ? "desc" : "asc";
    } else {
      this.config.sortBy = sortBy;
      this.config.sortOrder = "desc";
    }
    this.updateSortUI();
    await this.loadData();
    this.updateUI();
    this.saveConfig();
  }
  /**
   * ソートUIを更新するのじゃ
   */
  updateSortUI() {
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
      const icon = btn.querySelector(".sort-order-icon");
      if (icon) {
        icon.src = "/local/images/material-design-icons/outlined/arrow_downward.svg";
      }
    });
    const activeBtn = document.querySelector(`[data-sort="${this.config.sortBy}"]`);
    if (activeBtn) {
      activeBtn.classList.add("active");
      const icon = activeBtn.querySelector(".sort-order-icon");
      if (icon) {
        icon.src = this.config.sortOrder === "asc" ? "/local/images/material-design-icons/outlined/arrow_upward.svg" : "/local/images/material-design-icons/outlined/arrow_downward.svg";
      }
    }
  }
  /**
   * フィルタを処理するのじゃ
   */
  handleFilter() {
    const completedFilter = this.elements["filter-completed"];
    const ownerFilter = this.elements["filter-owner"];
    const dateStartFilter = this.elements["filter-date-start"];
    const dateEndFilter = this.elements["filter-date-end"];
    this.config.filter.completedOnly = completedFilter?.checked ? true : void 0;
    this.config.filter.ownerId = ownerFilter?.value || void 0;
    logger.debug("フィルタ更新:", {
      completedOnly: this.config.filter.completedOnly,
      ownerId: this.config.filter.ownerId,
      ownerName: ownerFilter?.selectedOptions[0]?.textContent
    });
    if (dateStartFilter?.value && dateEndFilter?.value) {
      this.config.filter.dateRange = {
        start: new Date(dateStartFilter.value).getTime(),
        end: new Date(dateEndFilter.value).getTime() + 24 * 60 * 60 * 1e3 - 1
      };
    } else {
      this.config.filter.dateRange = void 0;
    }
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }
  /**
   * データを更新するのじゃ
   */
  async refreshData() {
    try {
      this.showLoading(true);
      await this.loadData();
      this.updateUI();
      this.showToast("データを更新しました", "success");
    } catch (error) {
      logger.error("データ更新エラー:", error);
      this.showToast("データ更新に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }
  /**
   * エクスポートを処理するのじゃ
   */
  async handleExport() {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const now = /* @__PURE__ */ new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
        a.download = `nico-watch-history-${dateStr}-${timeStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("エクスポートが完了しました", "success");
      }
    } catch (error) {
      logger.error("エクスポートエラー:", error);
      this.showToast("エクスポートに失敗しました", "error");
    }
  }
  /**
   * インポートを処理するのじゃ
   */
  handleImport() {
    const fileInput = this.elements["import-file"];
    if (fileInput) {
      fileInput.click();
    }
  }
  /**
   * インポートファイルを処理するのじゃ
   */
  async handleImportFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.seriesAlerts) {
        data.seriesAlerts = [];
      }
      const config = {
        duplicateHandling: "merge",
        maxEntries: 1e4
      };
      const result = await watchHistoryDB.importData(data, config);
      if (result.success && result.data !== void 0) {
        this.showToast(`${result.data}件のデータをインポートしました`, "success");
        await this.refreshData();
        await this.refreshSeriesAlertData();
      }
    } catch (error) {
      logger.error("インポートエラー:", error);
      this.showToast("インポートに失敗しました", "error");
    } finally {
      input.value = "";
    }
  }
  /**
   * タブを切り替えるのじゃ
   */
  switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.elements[`${tabName}-tab`]?.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    this.elements[`${tabName}-content`]?.classList.add("active");
    if (tabName === "stats") {
      setTimeout(() => {
        this.updateCharts();
      }, 100);
    }
    if (tabName === "series") {
      void this.initializeSeriesTab();
    }
    if (tabName === "series-alert") {
      void this.initializeSeriesAlertTab();
    }
  }
  /**
   * 動画詳細を表示するのじゃ
   */
  showVideoDetail(entry) {
    this.selectedEntry = entry;
    const modalTitle = this.elements["modal-title"];
    if (modalTitle) {
      modalTitle.textContent = entry.title;
    }
    const modalVideoInfo = this.elements["modal-video-info"];
    if (modalVideoInfo) {
      modalVideoInfo.innerHTML = this.createVideoDetailHTML(entry);
    }
    this.elements["video-detail-modal"]?.classList.remove("hidden");
  }
  /**
   * 動画詳細HTMLを作成するのじゃ
   */
  createVideoDetailHTML(entry) {
    const watchedAtDate = new Date(entry.watchedAt);
    const firstWatchedAtDate = new Date(entry.firstWatchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = entry.lastPosition / entry.lengthSec * 100;
      progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }
    return `
      <div class="video-detail-grid">
        <div class="video-detail-thumbnail">
          <img src="${entry.thumbnailUrl}" alt="${entry.title}" onerror="this.src='/default-thumbnail.jpg'">
        </div>
        <div class="video-detail-info">
          <div class="info-row">
            <span class="info-label">動画ID:</span>
            <span class="info-value">${entry.videoId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">投稿者:</span>
            <span class="info-value">${this.escapeHtml(entry.ownerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">再生時間:</span>
            <span class="info-value">${this.formatDuration(entry.lengthSec)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴進捗:</span>
            <span class="info-value">${progressPercent}% (${this.formatDuration(entry.lastPosition)})</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴回数:</span>
            <span class="info-value">${entry.watchCount}回</span>
          </div>
          <div class="info-row">
            <span class="info-label">初回視聴:</span>
            <span class="info-value">${firstWatchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${watchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          ${(entry.tags ?? []).length > 0 ? `
            <div class="info-row">
              <span class="info-label">タグ:</span>
              <span class="info-value">${(entry.tags ?? []).map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(" ")}</span>
            </div>
          ` : ""}
          ${entry.memo ? `
            <div class="info-row">
              <span class="info-label">メモ:</span>
              <span class="info-value">${this.escapeHtml(entry.memo)}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  /**
   * モーダルを閉じるのじゃ
   */
  closeModal() {
    this.elements["video-detail-modal"]?.classList.add("hidden");
    this.selectedEntry = null;
  }
  /**
   * 動画を開くのじゃ
   */
  openVideo() {
    if (this.selectedEntry) {
      window.open(`https://www.nicovideo.jp/watch/${this.selectedEntry.videoId}`, "_blank");
    }
  }
  /**
   * メモ編集を開くのじゃ
   */
  openMemoEdit() {
    if (!this.selectedEntry) return;
    const memoTextarea = this.elements["memo-textarea"];
    if (memoTextarea) {
      memoTextarea.value = this.selectedEntry.memo || "";
    }
    this.elements["memo-edit-modal"]?.classList.remove("hidden");
  }
  /**
   * メモ編集を閉じるのじゃ
   */
  closeMemoEdit() {
    this.elements["memo-edit-modal"]?.classList.add("hidden");
  }
  /**
   * メモを保存するのじゃ
   */
  async saveMemo() {
    if (!this.selectedEntry) return;
    const memoTextarea = this.elements["memo-textarea"];
    const memo = memoTextarea?.value || "";
    try {
      this.selectedEntry.memo = memo;
      await watchHistoryDB.saveEntry(this.selectedEntry);
      const entryIndex = this.entries.findIndex((entry) => entry.videoId === this.selectedEntry.videoId);
      if (entryIndex !== -1) {
        this.entries[entryIndex] = { ...this.selectedEntry };
      }
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.closeMemoEdit();
      this.showVideoDetail(this.selectedEntry);
      this.showToast("メモを保存しました", "success");
    } catch (error) {
      logger.error("メモ保存エラー:", error);
      this.showToast("メモの保存に失敗しました", "error");
    }
  }
  // ===== ユーティリティメソッド =====
  /**
   * 読み込み状態を表示するのじゃ
   */
  showLoading(show) {
    const loading = this.elements["loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * 空の状態を表示するのじゃ
   */
  showEmptyState(show) {
    const emptyState = this.elements["empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * トースト通知を表示するのじゃ
   */
  showToast(message, type = "info") {
    const toastContainer = this.elements["toast-container"];
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${this.escapeHtml(message)}</span>
        <button class="toast-close">
          ${createMaterialIcon("close", { color: "dark", size: "small" })}
        </button>
      </div>
    `;
    toastContainer.appendChild(toast);
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => {
      toast.remove();
    });
    setTimeout(() => {
      toast.remove();
    }, 5e3);
  }
  /**
   * 日別グラフを描画するのじゃ
   */
  drawDailyChart(canvas, dailyStats) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    ctx.clearRect(0, 0, width, height);
    if (dailyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }
    const maxCount = Math.max(...dailyStats.map((d) => d.watchCount));
    if (maxCount === 0) return;
    const barWidth = chartWidth / dailyStats.length;
    dailyStats.forEach((stat, index) => {
      const barHeight = stat.watchCount / maxCount * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(stat.date.split("-")[2], x + barWidth * 0.4, height - padding / 2);
    });
  }
  /**
   * 時間帯別グラフを描画するのじゃ
   */
  drawHourlyChart(canvas, hourlyStats) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    ctx.clearRect(0, 0, width, height);
    if (hourlyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }
    const maxCount = Math.max(...hourlyStats.map((h) => h.watchCount));
    if (maxCount === 0) return;
    const barWidth = chartWidth / 24;
    hourlyStats.forEach((stat, index) => {
      const barHeight = stat.watchCount / maxCount * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;
      ctx.fillStyle = "#2196F3";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
      if (index % 2 === 0) {
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(stat.hour.toString(), x + barWidth * 0.4, height - padding / 2);
      }
    });
  }
  /**
   * 期間をフォーマットするのじゃ
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }
  /**
   * 数値をフォーマットするのじゃ
   */
  formatNumber(num) {
    if (num >= 1e4) {
      return `${Math.floor(num / 1e3)}k`;
    }
    return num.toLocaleString();
  }
  /**
   * HTMLをエスケープするのじゃ
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  // ===== シリーズ関連メソッド =====
  /**
   * シリーズタブを初期化するのじゃ
   */
  async initializeSeriesTab() {
    if (this.seriesStats.length === 0) {
      await this.loadSeriesData();
    }
    await this.updateSeriesUI();
  }
  /**
   * シリーズアラートタブを初期化するのじゃ
   */
  async initializeSeriesAlertTab() {
    if (this.seriesAlerts.length === 0) {
      await this.loadSeriesAlertData();
    }
    this.updateSeriesAlertUI();
    this.startAlertCheck();
    this.startAlertUIUpdater();
    this.checkNotificationPermissionOnTab();
  }
  /**
   * シリーズデータを読み込むのじゃ
   */
  async loadSeriesData() {
    try {
      this.showSeriesLoading(true);
      const seriesResult = await watchHistoryDB.getSeriesStats(this.seriesFilter);
      if (seriesResult.success && seriesResult.data) {
        this.seriesStats = seriesResult.data;
        this.filterSeriesStats();
      } else {
        this.seriesStats = [];
      }
    } catch (error) {
      logger.error("シリーズデータ読み込みエラー:", error);
      this.showToast("シリーズデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesLoading(false);
    }
  }
  /**
   * シリーズアラートデータを読み込むのじゃ
   */
  async loadSeriesAlertData() {
    try {
      this.showSeriesAlertLoading(true);
      const alertResult = await watchHistoryDB.getAllSeriesAlerts();
      if (alertResult.success && alertResult.data) {
        this.seriesAlerts = alertResult.data;
      } else {
        this.seriesAlerts = [];
      }
    } catch (error) {
      logger.error("シリーズアラートデータ読み込みエラー:", error);
      this.showToast("シリーズアラートデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesAlertLoading(false);
    }
  }
  /**
   * シリーズ統計をフィルタリングするのじゃ
   */
  filterSeriesStats() {
    this.filteredSeriesStats = this.seriesStats.filter((stats) => {
      if (this.seriesFilter.searchText) {
        const searchText = this.seriesFilter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }
      if (this.seriesFilter.progressFilter && this.seriesFilter.progressFilter !== "all") {
        switch (this.seriesFilter.progressFilter) {
          case "watching":
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case "completed":
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case "not_started":
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }
      return true;
    });
  }
  /**
   * シリーズUIを更新するのじゃ
   */
  async updateSeriesUI() {
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズアラートUIを更新するのじゃ
   */
  updateSeriesAlertUI() {
    this.updateSeriesAlertList();
    this.updateSeriesAlertCount();
  }
  /**
   * シリーズ一覧を更新するのじゃ
   */
  async updateSeriesList() {
    const seriesList = this.elements["series-list"];
    if (!seriesList) return;
    if (this.filteredSeriesStats.length === 0) {
      seriesList.innerHTML = "";
      this.showSeriesEmptyState(true);
      return;
    }
    this.showSeriesEmptyState(false);
    const items = await Promise.all(
      this.filteredSeriesStats.map((stats) => this.createSeriesItem(stats))
    );
    seriesList.innerHTML = items.join("");
    seriesList.querySelectorAll(".series-item").forEach((item, index) => {
      item.addEventListener("click", this.guardEvent((e) => {
        if (!e.target.closest(".series-nav-btn")) {
          void this.showSeriesDetail(this.filteredSeriesStats[index]);
        }
      }));
    });
    seriesList.querySelectorAll(".series-nav-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        const videoId = e.currentTarget.getAttribute("data-video-id");
        if (videoId) {
          void this.openVideoFromSeries(videoId);
        }
      }));
    });
  }
  /**
   * シリーズアラート一覧を更新するのじゃ
   */
  updateSeriesAlertList() {
    const alertList = this.elements["series-alert-list"];
    if (!alertList) return;
    if (this.seriesAlerts.length === 0) {
      alertList.innerHTML = "";
      this.showSeriesAlertEmptyState(true);
      return;
    }
    this.showSeriesAlertEmptyState(false);
    const items = this.seriesAlerts.map((alert) => this.createSeriesAlertItem(alert));
    alertList.innerHTML = items.join("");
    alertList.querySelectorAll(".series-alert-item").forEach((item, index) => {
      const toggleBtn = item.querySelector(".alert-toggle");
      toggleBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.toggleSeriesAlert(this.seriesAlerts[index]);
      }));
      const deleteBtn = item.querySelector(".alert-delete");
      deleteBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.deleteSeriesAlert(this.seriesAlerts[index]);
      }));
    });
  }
  /**
   * シリーズアイテムのHTMLを生成するのじゃ
   */
  async createSeriesItem(stats) {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);
    return `
      <div class="series-item" data-series-id="${stats.seriesId}">
        <div class="series-content">
          <div class="series-header">
            <h3 class="series-title">${this.escapeHtml(stats.seriesTitle)}</h3>
            <div class="series-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${stats.watchedCount}/${stats.totalCount || "?"} (${progressPercent}%)</span>
            </div>
          </div>
          <div class="series-meta">
            <div class="series-stat">
              ${createMaterialIcon("video_library", { color: "dark", size: "small" })}
              <span>${stats.watchedCount}本視聴</span>
            </div>
            <div class="series-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>最終視聴: ${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
            </div>
          </div>
          <div class="series-last-video">
            <span class="last-video-label">最後に視聴:</span>
            <span class="last-video-title">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
          ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
        </div>
      </div>
    `;
  }
  /**
   * シリーズアラートアイテムのHTMLを生成するのじゃ
   */
  createSeriesAlertItem(alert) {
    const lastCheckedDate = new Date(alert.lastCheckedAt);
    const intervalMs = alert.checkInterval;
    let intervalText = "";
    if (intervalMs < 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / 1e3)}秒`;
    } else if (intervalMs < 60 * 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / (60 * 1e3))}分`;
    } else if (intervalMs < 24 * 60 * 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / (60 * 60 * 1e3))}時間`;
    } else {
      intervalText = `${Math.round(intervalMs / (24 * 60 * 60 * 1e3))}日`;
    }
    const timeUntilCheck = alert.nextCheckAt - Date.now();
    const isOverdue = timeUntilCheck <= 0;
    let timeUntilText = "";
    if (isOverdue) {
      timeUntilText = "期限切れ";
    } else if (timeUntilCheck < 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / 1e3)}秒後`;
    } else if (timeUntilCheck < 60 * 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 1e3))}分後`;
    } else if (timeUntilCheck < 24 * 60 * 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 60 * 1e3))}時間後`;
    } else {
      timeUntilText = `${Math.round(timeUntilCheck / (24 * 60 * 60 * 1e3))}日後`;
    }
    return `
      <div class="series-alert-item" data-alert-id="${alert.id}">
        <div class="alert-content">
          <div class="alert-header">
            <h3 class="alert-title">${this.escapeHtml(alert.seriesTitle)}</h3>
            <div class="alert-status ${alert.enabled ? "enabled" : "disabled"}">
              ${alert.enabled ? "有効" : "無効"}
            </div>
          </div>
          <div class="alert-meta">
            <div class="alert-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>${intervalText}間隔</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("update", { color: "dark", size: "small" })}
              <span class="${isOverdue ? "overdue" : ""}">次回チェック: ${timeUntilText}</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("history", { color: "dark", size: "small" })}
              <span>最終チェック: ${lastCheckedDate.toLocaleString("ja-JP")}</span>
            </div>
          </div>
          <div class="alert-last-video">
            <span class="last-video-label">最後に確認:</span>
            <span class="last-video-title">${this.escapeHtml(alert.lastVideoTitle)}</span>
          </div>
          <div class="alert-actions">
            <button class="alert-toggle btn btn-${alert.enabled ? "secondary" : "primary"} btn-sm">
              ${alert.enabled ? "無効にする" : "有効にする"}
            </button>
            <button class="alert-delete btn btn-danger btn-sm">
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }
  // ===== イベントハンドラ（シリーズ関連） =====
  /**
   * シリーズ検索を処理するのじゃ
   */
  async handleSeriesSearch(event) {
    const input = event.target;
    this.seriesFilter.searchText = input.value.trim() || void 0;
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズ検索をクリアするのじゃ
   */
  async clearSeriesSearch() {
    const searchInput = this.elements["series-search-input"];
    if (searchInput) {
      searchInput.value = "";
      this.seriesFilter.searchText = void 0;
      this.filterSeriesStats();
      await this.updateSeriesList();
      this.updateSeriesCount();
    }
  }
  /**
   * シリーズフィルタを処理するのじゃ
   */
  async handleSeriesFilter() {
    const progressFilter = this.elements["series-progress-filter"];
    this.seriesFilter.progressFilter = progressFilter?.value || "all";
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズデータを更新するのじゃ
   */
  async refreshSeriesData() {
    await this.loadSeriesData();
    await this.updateSeriesUI();
    this.showToast("シリーズデータを更新しました", "success");
  }
  /**
   * シリーズアラートデータを更新するのじゃ
   */
  async refreshSeriesAlertData() {
    await this.loadSeriesAlertData();
    this.updateSeriesAlertUI();
    this.showToast("シリーズアラートデータを更新しました", "success");
  }
  /**
   * シリーズアラートモーダルを開くのじゃ
   */
  openSeriesAlertModal() {
    if ("Notification" in window && Notification.permission === "denied") {
      this.openNotificationPermissionModal();
      return;
    }
    this.updateSeriesSelectOptions();
    this.elements["series-alert-modal"]?.classList.remove("hidden");
  }
  /**
   * シリーズアラートモーダルを閉じるのじゃ
   */
  closeSeriesAlertModal() {
    this.elements["series-alert-modal"]?.classList.add("hidden");
  }
  /**
   * シリーズ詳細モーダルを閉じるのじゃ
   */
  closeSeriesDetailModal() {
    this.elements["series-detail-modal"]?.classList.add("hidden");
    this.selectedSeries = null;
  }
  /**
   * シリーズアラートを保存するのじゃ
   */
  async saveSeriesAlert() {
    const seriesSelect = this.elements["series-alert-series-select"];
    const intervalSelect = this.elements["series-alert-interval-select"];
    const enabledCheckbox = this.elements["series-alert-enabled"];
    if (!seriesSelect?.value) {
      this.showToast("シリーズを選択してください", "error");
      return;
    }
    const seriesId = parseInt(seriesSelect.value);
    const interval = parseInt(intervalSelect.value);
    const enabled = enabledCheckbox.checked;
    const existingAlert = this.seriesAlerts.find((alert) => alert.seriesId === seriesId);
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }
    const seriesStats = this.seriesStats.find((stats) => stats.seriesId === seriesId);
    if (!seriesStats) {
      this.showToast("シリーズが見つかりません", "error");
      return;
    }
    const now = Date.now();
    const newAlert = {
      id: `alert_${seriesId}_${now}`,
      seriesId,
      seriesTitle: seriesStats.seriesTitle,
      lastVideoId: seriesStats.lastVideoId,
      lastVideoTitle: seriesStats.lastVideoTitle,
      lastCheckedAt: now,
      nextCheckAt: now + interval,
      checkInterval: interval,
      enabled,
      createdAt: now,
      updatedAt: now
    };
    try {
      const result = await watchHistoryDB.saveSeriesAlert(newAlert);
      if (result.success) {
        this.seriesAlerts.push(newAlert);
        this.updateSeriesAlertUI();
        this.closeSeriesAlertModal();
        this.showToast("シリーズアラートを追加しました", "success");
      } else {
        this.showToast("シリーズアラートの保存に失敗しました", "error");
      }
    } catch (error) {
      logger.error("シリーズアラート保存エラー:", error);
      this.showToast("シリーズアラートの保存に失敗しました", "error");
    }
  }
  /**
   * シリーズ詳細からアラートを追加するのじゃ
   */
  addAlertFromSeriesDetail() {
    if (!this.selectedSeries) return;
    const existingAlert = this.seriesAlerts.find((alert) => alert.seriesId === this.selectedSeries.seriesId);
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }
    this.closeSeriesDetailModal();
    this.openSeriesAlertModal();
    const seriesSelect = this.elements["series-alert-series-select"];
    if (seriesSelect) {
      seriesSelect.value = this.selectedSeries.seriesId.toString();
    }
  }
  /**
   * シリーズ詳細を表示するのじゃ
   */
  async showSeriesDetail(stats) {
    this.selectedSeries = stats;
    const modalTitle = this.elements["series-detail-title"];
    if (modalTitle) {
      modalTitle.textContent = stats.seriesTitle;
    }
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);
    const detailInfo = this.elements["series-detail-info"];
    if (detailInfo) {
      detailInfo.innerHTML = this.createSeriesDetailHTML(stats, seriesInfo);
    }
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(stats.seriesId);
      const detailVideos = this.elements["series-detail-videos"];
      if (detailVideos && videosResult.success && videosResult.data) {
        detailVideos.innerHTML = this.createSeriesVideosHTML(videosResult.data);
      }
    } catch (error) {
      logger.error("シリーズ動画取得エラー:", error);
    }
    this.elements["series-detail-modal"]?.classList.remove("hidden");
    this.elements["series-detail-modal"]?.querySelectorAll(".series-nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const videoId = e.currentTarget.getAttribute("data-video-id");
        if (videoId) {
          this.openVideoFromSeries(videoId);
        }
      });
    });
  }
  /**
   * シリーズ詳細HTMLを作成するのじゃ
   */
  createSeriesDetailHTML(stats, seriesInfo) {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);
    return `
      <div class="series-detail-grid">
        <div class="series-detail-stats">
          <div class="info-row">
            <span class="info-label">視聴動画数:</span>
            <span class="info-value">${stats.watchedCount}本</span>
          </div>
          <div class="info-row">
            <span class="info-label">進捗:</span>
            <span class="info-value">${progressPercent}%</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最後に視聴した動画:</span>
            <span class="info-value">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
        </div>
        ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
      </div>
    `;
  }
  /**
   * シリーズ動画一覧HTMLを作成するのじゃ
   */
  createSeriesVideosHTML(videos) {
    if (videos.length === 0) {
      return '<div class="series-videos-empty">このシリーズの動画がありません</div>';
    }
    const videoItems = videos.map((video) => {
      const watchedDate = new Date(video.watchedAt);
      let progressPercent = 0;
      if (video.lengthSec > 0) {
        progressPercent = Math.round(video.lastPosition / video.lengthSec * 100);
      }
      return `
        <div class="series-video-item" data-video-id="${video.videoId}">
          <div class="video-thumbnail">
            <img src="${video.thumbnailUrl}" alt="${this.escapeHtml(video.title)}" onerror="this.src='/default-thumbnail.jpg'">
            <div class="video-duration">${this.formatDuration(video.lengthSec)}</div>
          </div>
          <div class="video-content">
            <h4 class="video-title">${this.escapeHtml(video.title)}</h4>
            <div class="video-meta">
              <span class="video-watched-date">${watchedDate.toLocaleDateString("ja-JP")}</span>
              <span class="video-progress">${progressPercent}%</span>
            </div>
            <div class="video-progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");
    return `
      <div class="series-videos-header">
        <h4>シリーズ動画一覧 (${videos.length}本)</h4>
      </div>
      <div class="series-videos-list">
        ${videoItems}
      </div>
    `;
  }
  /**
   * シリーズアラートを切り替えるのじゃ
   */
  async toggleSeriesAlert(alert) {
    const updatedAlert = { ...alert, enabled: !alert.enabled, updatedAt: Date.now() };
    try {
      const result = await watchHistoryDB.saveSeriesAlert(updatedAlert);
      if (result.success) {
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }
        this.updateSeriesAlertUI();
        this.showToast(`アラートを${updatedAlert.enabled ? "有効" : "無効"}にしました`, "success");
      } else {
        this.showToast("アラートの更新に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート更新エラー:", error);
      this.showToast("アラートの更新に失敗しました", "error");
    }
  }
  /**
   * シリーズアラートを削除するのじゃ
   */
  async deleteSeriesAlert(alert) {
    if (!confirm(`「${alert.seriesTitle}」のアラートを削除しますか？`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteSeriesAlert(alert.id);
      if (result.success) {
        this.seriesAlerts = this.seriesAlerts.filter((a) => a.id !== alert.id);
        this.updateSeriesAlertUI();
        this.showToast("アラートを削除しました", "success");
      } else {
        this.showToast("アラートの削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート削除エラー:", error);
      this.showToast("アラートの削除に失敗しました", "error");
    }
  }
  // ===== 視聴履歴削除機能 =====
  /**
   * 個別の視聴履歴エントリを削除するのじゃ
   */
  async deleteHistoryEntry(entry) {
    if (!confirm(`「${entry.title}」の視聴履歴を削除しますか？`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteEntry(entry.videoId);
      if (result.success) {
        this.entries = this.entries.filter((e) => e.videoId !== entry.videoId);
        this.filterEntries();
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast("履歴を削除しました", "success");
      } else {
        this.showToast("履歴の削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("履歴削除エラー:", error);
      this.showToast("履歴の削除に失敗しました", "error");
    }
  }
  /**
   * 全ての視聴履歴を削除するのじゃ（一括削除）
   */
  async deleteAllHistoryEntries() {
    const totalCount = this.entries.length;
    if (totalCount === 0) {
      this.showToast("削除する履歴がありません", "info");
      return;
    }
    if (!confirm(`全ての視聴履歴（${totalCount}件）を削除しますか？

この操作は取り消せません。`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteAllEntries();
      if (result.success && typeof result.data === "number") {
        this.entries = [];
        this.filteredEntries = [];
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("一括削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("一括削除エラー:", error);
      this.showToast("一括削除に失敗しました", "error");
    }
  }
  /**
   * 条件に一致する視聴履歴を削除するのじゃ
   */
  async deleteHistoryEntriesByCondition(maxWatchCount, maxProgressRate) {
    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      this.showToast("無効な条件値です", "error");
      return;
    }
    const matchingEntries = this.entries.filter((entry) => {
      const progressRate = entry.lengthSec > 0 ? Math.round(entry.lastPosition / entry.lengthSec * 100) : 0;
      return entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate;
    });
    if (matchingEntries.length === 0) {
      this.showToast("条件に一致する履歴がありません", "info");
      return;
    }
    if (!confirm(`${maxWatchCount}回以下視聴かつ${maxProgressRate}%以下進捗の履歴（${matchingEntries.length}件）を削除しますか？

この操作は取り消せません。`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteEntriesByCondition(maxWatchCount, maxProgressRate);
      if (result.success && typeof result.data === "number") {
        await this.refreshData();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("条件付き削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("条件付き削除エラー:", error);
      this.showToast("条件付き削除に失敗しました", "error");
    }
  }
  /**
   * 条件付き削除のハンドラーなのじゃ
   */
  handleConditionalDelete() {
    const watchCountInput = this.elements["delete-watch-count"];
    const progressRateInput = this.elements["delete-progress-rate"];
    if (!watchCountInput || !progressRateInput) {
      this.showToast("削除条件の入力フィールドが見つかりません", "error");
      return;
    }
    const maxWatchCount = parseInt(watchCountInput.value) || 0;
    const maxProgressRate = parseInt(progressRateInput.value) || 0;
    void this.deleteHistoryEntriesByCondition(maxWatchCount, maxProgressRate);
  }
  /**
   * シリーズ選択肢を更新するのじゃ
   */
  updateSeriesSelectOptions() {
    const seriesSelect = this.elements["series-alert-series-select"];
    if (!seriesSelect) return;
    seriesSelect.innerHTML = '<option value="">シリーズを選択してください</option>';
    this.seriesStats.forEach((stats) => {
      const option = document.createElement("option");
      option.value = stats.seriesId.toString();
      option.textContent = stats.seriesTitle;
      seriesSelect.appendChild(option);
    });
  }
  /**
   * アラートチェックを開始するのじゃ
   */
  startAlertCheck() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    this.alertCheckInterval = setInterval(() => {
      void this.checkSeriesAlerts();
    }, 1 * 60 * 1e3);
    void this.checkSeriesAlerts();
  }
  /**
   * アラートUIの定期更新を開始するのじゃ
   */
  startAlertUIUpdater() {
    setInterval(() => {
      if (this.elements["series-alert-tab"]?.classList.contains("active")) {
        this.updateSeriesAlertUI();
      }
    }, 10 * 1e3);
  }
  /**
   * シリーズアラートをチェックするのじゃ
   */
  async checkSeriesAlerts() {
    try {
      const alertsResult = await watchHistoryDB.getAlertsToCheck();
      if (alertsResult.success && alertsResult.data) {
        const alertsToCheck = alertsResult.data;
        for (const alert of alertsToCheck) {
          await this.checkSingleAlert(alert);
        }
      }
    } catch (error) {
      logger.error("アラートチェックエラー:", error);
    }
  }
  /**
   * 単一のアラートをチェックするのじゃ
   */
  async checkSingleAlert(alert) {
    try {
      const hasNewVideo = await this.checkForNewSeriesVideo(alert);
      const now = Date.now();
      const updatedAlert = {
        ...alert,
        lastCheckedAt: now,
        nextCheckAt: now + alert.checkInterval,
        updatedAt: now
      };
      await watchHistoryDB.saveSeriesAlert(updatedAlert);
      const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
      if (index !== -1) {
        this.seriesAlerts[index] = updatedAlert;
      }
      if (hasNewVideo) {
        this.showSeriesNotification(alert);
      }
      return hasNewVideo;
    } catch (error) {
      logger.error("個別アラートチェックエラー:", error);
      return false;
    }
  }
  /**
   * シリーズの新しい動画をチェックするのじゃ
   */
  async checkForNewSeriesVideo(alert) {
    try {
      const seriesVideosResult = await watchHistoryDB.getSeriesVideos(alert.seriesId);
      if (!seriesVideosResult.success || !seriesVideosResult.data || seriesVideosResult.data.length === 0) {
        return false;
      }
      const latestVideo = seriesVideosResult.data[0];
      if (!latestVideo.series || !latestVideo.series.video.next) {
        return false;
      }
      const nextVideo = latestVideo.series.video.next;
      if (nextVideo.id !== alert.lastVideoId) {
        const updatedAlert = {
          ...alert,
          lastVideoId: nextVideo.id,
          lastVideoTitle: nextVideo.title,
          updatedAt: Date.now()
        };
        await watchHistoryDB.saveSeriesAlert(updatedAlert);
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error("シリーズ動画チェックエラー:", error);
      return false;
    }
  }
  /**
   * シリーズ通知を表示するのじゃ（ブラウザ通知のみ）
   */
  showSeriesNotification(alert) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`🎬 ${alert.seriesTitle}`, {
          body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
          icon: "/local/images/material-design-icons/outlined/notifications.svg",
          tag: `series-${alert.seriesId}`,
          requireInteraction: true
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(`🎬 ${alert.seriesTitle}`, {
              body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
              icon: "/local/images/material-design-icons/outlined/notifications.svg",
              tag: `series-${alert.seriesId}`,
              requireInteraction: true
            });
          }
        }).catch((error) => {
          logger?.error("Notification permission request failed:", error);
        });
      }
    } else {
      console.warn("ブラウザ通知が利用できません");
    }
  }
  /**
   * 手動でアラートをチェックするのじゃ
   */
  async manualCheckAlerts() {
    try {
      if (this.seriesAlerts.length === 0) {
        this.showToast("アラートがありません", "info");
        return;
      }
      const enabledAlerts = this.seriesAlerts.filter((alert) => alert.enabled);
      if (enabledAlerts.length === 0) {
        this.showToast("有効なアラートがありません", "info");
        return;
      }
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      this.showToast("アラートチェックを開始します...", "info");
      let checkedCount = 0;
      let notificationCount = 0;
      for (const alert of enabledAlerts) {
        const hasNewVideo = await this.checkSingleAlert(alert);
        checkedCount++;
        if (hasNewVideo) {
          notificationCount++;
        }
      }
      this.updateSeriesAlertUI();
      const notificationStatus = "Notification" in window ? Notification.permission === "granted" ? "ブラウザ通知有効" : "ブラウザ通知無効" : "ブラウザ通知未対応";
      this.showToast(
        `${checkedCount}件のアラートをチェックしました。${notificationCount}件の新しい動画が見つかりました。（${notificationStatus}）`,
        "success"
      );
    } catch (error) {
      logger.error("手動アラートチェックエラー:", error);
      this.showToast("アラートチェックに失敗しました", "error");
    }
  }
  /**
   * 通知権限を確認・要求するのじゃ
   */
  async checkNotificationPermission() {
    try {
      if (!("Notification" in window)) {
        this.showToast("このブラウザはデスクトップ通知に対応していません", "error");
        return;
      }
      const permission = Notification.permission;
      if (permission === "granted") {
        this.showToast("ブラウザ通知は既に許可されています", "success");
        new Notification("🎬 シリーズアラート", {
          body: "通知権限が正常に動作しています！",
          icon: "/local/images/material-design-icons/outlined/notifications.svg",
          tag: "permission-test"
        });
      } else if (permission === "denied") {
        this.openNotificationPermissionModal();
      } else {
        this.showToast("ブラウザ通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();
        if (result === "granted") {
          this.showToast("ブラウザ通知が許可されました！", "success");
          new Notification("🎬 シリーズアラート", {
            body: "通知権限が正常に設定されました！",
            icon: "/local/images/material-design-icons/outlined/notifications.svg",
            tag: "permission-granted"
          });
        } else {
          this.openNotificationPermissionModal();
        }
      }
    } catch (error) {
      logger.error("通知権限確認エラー:", error);
      this.showToast("通知権限の確認に失敗しました", "error");
    }
  }
  /**
   * 通知権限案内モーダルを開くのじゃ
   */
  openNotificationPermissionModal() {
    this.elements["notification-permission-modal"]?.classList.remove("hidden");
    this.highlightCurrentBrowserInstructions();
  }
  /**
   * 通知権限案内モーダルを閉じるのじゃ
   */
  closeNotificationPermissionModal() {
    this.elements["notification-permission-modal"]?.classList.add("hidden");
  }
  /**
   * 設定後の通知テストを実行するのじゃ
   */
  async testNotificationAfterSetup() {
    try {
      if (!("Notification" in window)) {
        this.showToast("このブラウザはデスクトップ通知に対応していません", "error");
        return;
      }
      const permission = Notification.permission;
      if (permission === "granted") {
        new Notification("🎬 シリーズアラート", {
          body: "通知設定が正常に動作しています！設定完了です。",
          icon: "/local/images/material-design-icons/outlined/notifications.svg",
          tag: "setup-test"
        });
        this.showToast("通知テストが送信されました！", "success");
        setTimeout(() => {
          this.closeNotificationPermissionModal();
        }, 1e3);
      } else if (permission === "denied") {
        this.showToast("まだ通知が拒否されています。上記の手順に従って設定を変更してください", "error");
      } else {
        this.showToast("通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();
        if (result === "granted") {
          new Notification("🎬 シリーズアラート", {
            body: "通知設定が正常に完了しました！",
            icon: "/local/images/material-design-icons/outlined/notifications.svg",
            tag: "setup-complete"
          });
          this.showToast("通知設定が完了しました！", "success");
          setTimeout(() => {
            this.closeNotificationPermissionModal();
          }, 1e3);
        } else {
          this.showToast("通知が拒否されました。上記の手順に従って手動で設定してください", "error");
        }
      }
    } catch (error) {
      logger.error("通知テストエラー:", error);
      this.showToast("通知テストに失敗しました", "error");
    }
  }
  /**
   * タブ移動時の通知権限チェックを行うのじゃ
   */
  checkNotificationPermissionOnTab() {
    if ("Notification" in window && Notification.permission === "denied") {
      setTimeout(() => {
        this.showToast("ブラウザ通知が拒否されています。シリーズアラートを利用するには通知の許可が必要です", "error");
      }, 500);
    }
  }
  /**
   * 現在のブラウザに適した説明を強調表示するのじゃ
   */
  highlightCurrentBrowserInstructions() {
    document.querySelectorAll(".browser-tab").forEach((tab) => {
      tab.classList.remove("current-browser");
    });
    const userAgent = navigator.userAgent;
    let currentBrowser = "";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      currentBrowser = "chrome";
    } else if (userAgent.includes("Edg")) {
      currentBrowser = "chrome";
    } else if (userAgent.includes("Firefox")) {
      currentBrowser = "firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      currentBrowser = "safari";
    } else {
      currentBrowser = "chrome";
    }
    const currentTab = document.getElementById(`${currentBrowser}-tab`);
    if (currentTab) {
      currentTab.classList.add("current-browser");
    }
  }
  // ===== ユーティリティメソッド（シリーズ関連） =====
  /**
   * シリーズ読み込み状態を表示するのじゃ
   */
  showSeriesLoading(show) {
    const loading = this.elements["series-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズアラート読み込み状態を表示するのじゃ
   */
  showSeriesAlertLoading(show) {
    const loading = this.elements["series-alert-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズ空の状態を表示するのじゃ
   */
  showSeriesEmptyState(show) {
    const emptyState = this.elements["series-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズアラート空の状態を表示するのじゃ
   */
  showSeriesAlertEmptyState(show) {
    const emptyState = this.elements["series-alert-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズ数を更新するのじゃ
   */
  updateSeriesCount() {
    const seriesCount = this.elements["series-count"];
    if (seriesCount) {
      seriesCount.textContent = `${this.filteredSeriesStats.length} 件のシリーズ`;
    }
  }
  /**
   * シリーズアラート数を更新するのじゃ
   */
  updateSeriesAlertCount() {
    const alertCount = this.elements["series-alert-count"];
    if (alertCount) {
      alertCount.textContent = `${this.seriesAlerts.length} 件のアラート`;
    }
  }
  /**
   * シリーズ情報を取得するのじゃ
   */
  async getSeriesInfo(seriesId) {
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(seriesId);
      if (videosResult.success && videosResult.data && videosResult.data.length > 0) {
        for (const video of videosResult.data) {
          if (video.series && video.series.id === seriesId) {
            return video.series;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error("シリーズ情報取得エラー:", error);
      return null;
    }
  }
  /**
   * シリーズナビゲーションHTMLを作成するのじゃ
   */
  createSeriesNavigationHTML(seriesInfo) {
    const { video } = seriesInfo;
    const navigationItems = [];
    if (video.first) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.first.id}" title="第1話: ${this.escapeHtml(video.first.title)}">
          ${createMaterialIcon("first_page", { color: "white", size: "small" })}
          <span>第1話</span>
        </button>
      `);
    }
    if (video.prev) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.prev.id}" title="前の話: ${this.escapeHtml(video.prev.title)}">
          ${createMaterialIcon("navigate_before", { color: "white", size: "small" })}
          <span>前の話</span>
        </button>
      `);
    }
    if (video.next) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.next.id}" title="次の話: ${this.escapeHtml(video.next.title)}">
          <span>次の話</span>
          ${createMaterialIcon("navigate_next", { color: "white", size: "small" })}
        </button>
      `);
    }
    if (navigationItems.length === 0) {
      return "";
    }
    return `
      <div class="series-navigation">
        <div class="series-nav-header">
          ${createMaterialIcon("play_arrow", { color: "dark", size: "small" })}
          <span>シリーズナビゲーション</span>
        </div>
        <div class="series-nav-buttons">
          ${navigationItems.join("")}
        </div>
      </div>
    `;
  }
  /**
   * シリーズから動画を開くのじゃ
   */
  openVideoFromSeries(videoId) {
    const url = `https://www.nicovideo.jp/watch/${videoId}`;
    window.open(url, "_blank");
    this.showToast("動画を開きました", "success");
  }
  // ===== データベース管理関連メソッド =====
  /**
   * データベース管理モーダルを開くのじゃ
   */
  async openDatabaseManagementModal() {
    await this.refreshPersistenceStatus();
    await this.refreshDatabaseConfig();
    await this.refreshBackupList();
    this.elements["database-management-modal"]?.classList.remove("hidden");
  }
  /**
   * データベース管理モーダルを閉じるのじゃ
   */
  closeDatabaseManagementModal() {
    this.elements["database-management-modal"]?.classList.add("hidden");
  }
  /**
   * 永続化を要求するのじゃ
   */
  async requestPersistence() {
    try {
      const result = await watchHistoryDB.requestPersistence();
      if (result.success) {
        if (result.data) {
          this.showToast("データベースの永続化に成功しました", "success");
        } else {
          this.showToast("データベースの永続化に失敗しました", "error");
        }
      } else {
        this.showToast(result.error || "永続化要求に失敗しました", "error");
      }
      await this.refreshPersistenceStatus();
    } catch (error) {
      logger.error("永続化要求エラー:", error);
      this.showToast("永続化要求に失敗しました", "error");
    }
  }
  /**
   * 永続化状態を更新するのじゃ
   */
  async refreshPersistenceStatus() {
    try {
      const result = await watchHistoryDB.getPersistenceStatus();
      if (result.success && result.data) {
        this.persistenceStatus = result.data;
        this.updatePersistenceUI();
      } else {
        logger.error("永続化状態取得エラー:", result.error);
      }
    } catch (error) {
      logger.error("永続化状態取得エラー:", error);
    }
  }
  /**
   * マイグレーションを実行するのじゃ
   */
  async runMigration() {
    try {
      const result = await watchHistoryDB.runMigration();
      if (result.success) {
        this.showToast("マイグレーションが完了しました", "success");
      } else {
        this.showToast(result.error || "マイグレーションに失敗しました", "error");
      }
    } catch (error) {
      logger.error("マイグレーション実行エラー:", error);
      this.showToast("マイグレーションに失敗しました", "error");
    }
  }
  /**
   * マイグレーション状態を確認するのじゃ
   */
  checkMigrationStatus() {
    this.migrationProgress = watchHistoryDB.getMigrationProgress();
    this.updateMigrationUI();
  }
  /**
   * バックアップを作成するのじゃ
   */
  async createBackup() {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const backup = {
          version: 2,
          timestamp: Date.now(),
          watchHistory: result.data.entries,
          seriesAlerts: result.data.seriesAlerts
        };
        const backupKey = `watch-history-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));
        this.showToast("バックアップを作成しました", "success");
        await this.refreshBackupList();
      } else {
        this.showToast("バックアップの作成に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ作成エラー:", error);
      this.showToast("バックアップの作成に失敗しました", "error");
    }
  }
  /**
   * バックアップリストを更新するのじゃ
   */
  async refreshBackupList() {
    await Promise.resolve();
    try {
      const backups = watchHistoryDB.getAvailableBackups();
      this.updateBackupListUI(backups);
    } catch (error) {
      logger.error("バックアップリスト取得エラー:", error);
    }
  }
  /**
   * データベース設定を更新するのじゃ
   */
  updateDatabaseConfig() {
    const autoMigration = this.elements["auto-migration-checkbox"]?.checked || false;
    const autoPersist = this.elements["auto-persist-checkbox"]?.checked || false;
    const autoBackup = this.elements["auto-backup-checkbox"]?.checked || false;
    const backupBeforeMigration = this.elements["backup-before-migration-checkbox"]?.checked || false;
    const config = {
      autoMigration,
      autoPersist,
      autoBackup,
      backupBeforeMigration
    };
    watchHistoryDB.updateMigrationConfig(config);
    this.showToast("設定を更新しました", "success");
  }
  /**
   * データベース設定を更新するのじゃ
   */
  async refreshDatabaseConfig() {
    await Promise.resolve();
    try {
      this.databaseConfig = watchHistoryDB.getMigrationConfig();
      this.updateDatabaseConfigUI();
    } catch (error) {
      logger.error("データベース設定取得エラー:", error);
    }
  }
  /**
   * マイグレーション進捗を処理するのじゃ
   */
  handleMigrationProgress(event) {
    const progress = event.detail;
    this.migrationProgress = progress;
    this.updateMigrationUI();
  }
  /**
   * 永続化UIを更新するのじゃ
   */
  updatePersistenceUI() {
    if (!this.persistenceStatus) return;
    const badge = this.elements["persistence-badge"];
    const statusText = this.elements["persistence-status-text"];
    const usageFill = this.elements["storage-usage-fill"];
    const usageText = this.elements["storage-usage-text"];
    if (statusText) {
      statusText.textContent = this.persistenceStatus.isPersistent ? "永続化済み" : "一時的";
    }
    if (badge) {
      badge.className = `persistence-badge ${this.persistenceStatus.isPersistent ? "persistent" : "temporary"}`;
    }
    if (usageFill) {
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageFill.style.width = `${usagePercent}%`;
    }
    if (usageText) {
      const usageFormatted = this.formatBytes(this.persistenceStatus.usage);
      const quotaFormatted = this.formatBytes(this.persistenceStatus.quota);
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageText.textContent = `${usageFormatted} / ${quotaFormatted} (${usagePercent}%)`;
    }
  }
  /**
   * マイグレーションUIを更新するのじゃ
   */
  updateMigrationUI() {
    if (!this.migrationProgress) return;
    const container = this.elements["migration-progress-container"];
    const currentTask = this.elements["migration-current-task"];
    const progressFill = this.elements["migration-progress-fill"];
    const progressText = this.elements["migration-progress-text"];
    if (container) {
      container.classList.toggle("hidden", !this.migrationProgress.isRunning);
    }
    if (currentTask) {
      currentTask.textContent = this.migrationProgress.currentMigration || "マイグレーション待機中";
    }
    if (progressFill) {
      const progressPercent = Math.round(this.migrationProgress.progress * 100);
      progressFill.style.width = `${progressPercent}%`;
    }
    if (progressText) {
      progressText.textContent = `${this.migrationProgress.completedCount} / ${this.migrationProgress.totalCount} (${Math.round(this.migrationProgress.progress * 100)}%)`;
    }
  }
  /**
   * データベース設定UIを更新するのじゃ
   */
  updateDatabaseConfigUI() {
    if (!this.databaseConfig) return;
    const autoMigrationCheckbox = this.elements["auto-migration-checkbox"];
    const autoPersistCheckbox = this.elements["auto-persist-checkbox"];
    const autoBackupCheckbox = this.elements["auto-backup-checkbox"];
    const backupBeforeMigrationCheckbox = this.elements["backup-before-migration-checkbox"];
    if (autoMigrationCheckbox) {
      autoMigrationCheckbox.checked = this.databaseConfig.autoMigration;
    }
    if (autoPersistCheckbox) {
      autoPersistCheckbox.checked = this.databaseConfig.autoPersist;
    }
    if (autoBackupCheckbox) {
      autoBackupCheckbox.checked = this.databaseConfig.autoBackup;
    }
    if (backupBeforeMigrationCheckbox) {
      backupBeforeMigrationCheckbox.checked = this.databaseConfig.backupBeforeMigration;
    }
  }
  /**
   * バックアップリストUIを更新するのじゃ
   */
  updateBackupListUI(backups) {
    const container = this.elements["backup-list-container"];
    if (!container) return;
    if (backups.length === 0) {
      container.innerHTML = '<div class="backup-list-empty"><span>バックアップがありません</span></div>';
      return;
    }
    const backupItems = backups.map((backup) => {
      const date = new Date(backup.timestamp);
      return `
        <div class="backup-item" data-backup-key="${backup.key}">
          <div class="backup-info">
            <div class="backup-date">${date.toLocaleString("ja-JP")}</div>
            <div class="backup-version">バージョン ${backup.version}</div>
          </div>
          <div class="backup-actions">
            <button class="backup-restore-btn btn btn-sm btn-primary" data-backup-key="${backup.key}">
              復元
            </button>
            <button class="backup-delete-btn btn btn-sm btn-danger" data-backup-key="${backup.key}">
              削除
            </button>
          </div>
        </div>
      `;
    }).join("");
    container.innerHTML = backupItems;
    container.querySelectorAll(".backup-restore-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent(async (e) => {
        const backupKey = e.target.getAttribute("data-backup-key");
        if (backupKey) {
          await this.restoreBackup(backupKey);
        }
      }));
    });
    container.querySelectorAll(".backup-delete-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((e) => {
        const backupKey = e.target.getAttribute("data-backup-key");
        if (backupKey) {
          void this.deleteBackup(backupKey);
        }
      }));
    });
  }
  /**
   * バックアップを復元するのじゃ
   */
  async restoreBackup(backupKey) {
    if (!confirm("バックアップを復元しますか？現在のデータは失われます。")) {
      return;
    }
    try {
      const result = await watchHistoryDB.restoreFromBackup(backupKey);
      if (result.success) {
        this.showToast("バックアップを復元しました", "success");
        await this.refreshData();
      } else {
        this.showToast(result.error || "バックアップの復元に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ復元エラー:", error);
      this.showToast("バックアップの復元に失敗しました", "error");
    }
  }
  /**
   * バックアップを削除するのじゃ
   */
  deleteBackup(backupKey) {
    if (!confirm("バックアップを削除しますか？")) {
      return;
    }
    try {
      localStorage.removeItem(backupKey);
      this.showToast("バックアップを削除しました", "success");
      void this.refreshBackupList();
    } catch (error) {
      logger.error("バックアップ削除エラー:", error);
      this.showToast("バックアップの削除に失敗しました", "error");
    }
  }
  /**
   * バイト数をフォーマットするのじゃ
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
document.addEventListener("DOMContentLoaded", () => new WatchHistoryApp());
//# sourceMappingURL=watch-history.es.js.map
