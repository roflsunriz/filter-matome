/**
 * ニコニコ動画視聴履歴拡張 - 動的スタイル適用
 *
 * @description 視聴履歴ビューSPAの美しいUIを動的に適用する
 * @author roflsunriz
 */

import { materialIconsStyles } from "@/common/material-icons";

/**
 * 視聴履歴のスタイルを動的に適用する
 */
export function applyWatchHistoryStyles(): void {
  // 既存のスタイルがあるかチェック
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
  background-color: #0d0d14;
  color: #e8e8f0;
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
  max-width: 1400px;
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
  border-bottom: 2px solid #2a2a38;
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
  color: #a0a0b0;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #e8e8f0;
  background-color: rgba(255,255,255,0.05);
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
  background: #1a1a24;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  height: fit-content;
  max-height: 100%;
  overflow-y: auto;
  border: 1px solid #2a2a38;
}

.content-area {
  background: #1a1a24;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a2a38;
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
  border: 2px solid #2a2a38;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  background-color: #12121a;
  color: #e8e8f0;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-input::placeholder {
  color: #606070;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #808090;
  font-size: 20px;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #808090;
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
  color: #e8e8f0;
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
  background: #12121a;
  border: 2px solid #2a2a38;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #a0a0b0;
  transition: all 0.3s ease;
  justify-content: space-between;
}

.sort-btn:hover {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.15);
}

.sort-btn.active {
  border-color: #667eea;
  color: #a78bfa;
  background-color: rgba(102, 126, 234, 0.2);
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
  color: #b0b0c0;
}

.filter-checkbox {
  margin-right: 0;
}

.filter-select,
.filter-date {
  padding: 0.5rem;
  border: 2px solid #2a2a38;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  background-color: #12121a;
  color: #e8e8f0;
}

.filter-select:focus,
.filter-date:focus {
  outline: none;
  border-color: #667eea;
}

.filter-select option {
  background-color: #1a1a24;
  color: #e8e8f0;
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
  color: #a0a0b0;
  min-width: 20px;
}

/* 統計概要 */
.stats-summary {
  border-top: 2px solid #2a2a38;
  padding-top: 1.5rem;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #1f1f2a;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-label {
  font-size: 0.9rem;
  color: #a0a0b0;
}

.stats-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e8e8f0;
}

/* コンテンツエリア */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #2a2a38;
}

.content-count {
  font-size: 1.1rem;
  font-weight: 500;
  color: #e8e8f0;
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
  border: 2px solid #2a2a38;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #12121a;
}

.history-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.25);
  transform: translateY(-2px);
  background: #1a1a28;
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
  color: #e8e8f0;
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
  color: #a0a0b0;
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
  background-color: #2a2a38;
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
  color: #a0a0b0;
  font-weight: 500;
  min-width: 35px;
}

.history-stats {
  display: flex;
  gap: 1rem;
  color: #a0a0b0;
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
  background-color: #1f1f2a;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #667eea;
}

.history-memo .material-icon {
  width: 16px;
  height: 16px;
  filter: brightness(0) saturate(100%) invert(70%) sepia(50%) saturate(1000%) hue-rotate(200deg) brightness(120%) contrast(100%);
}

.memo-text {
  font-size: 0.9rem;
  color: #c0c0d0;
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
  color: #a0a0b0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2a2a38;
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
  filter: brightness(0) saturate(100%) invert(50%) sepia(10%) saturate(300%) hue-rotate(200deg) brightness(90%) contrast(90%);
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #a0a0b0;
}

.empty-state p {
  color: #808090;
  text-align: center;
  max-width: 300px;
}

/* シリーズ・アラート専用のempty-state */
#series-empty-state,
#series-alert-empty-state {
  padding: 20px;
  border: 2px solid #2a2a38;
  border-radius: 12px;
  background: #12121a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-height: 200px;
}

#series-empty-state:not(.hidden),
#series-alert-empty-state:not(.hidden) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a0a0b0;
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
  background: #1a1a24;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  border: 1px solid #2a2a38;
}

.stats-card-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #e8e8f0;
  border-bottom: 2px solid #2a2a38;
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
  border-bottom: 1px solid #1f1f2a;
}

.stats-metric:last-child {
  border-bottom: none;
}

.stats-metric-label {
  font-size: 1rem;
  color: #a0a0b0;
}

.stats-metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #e8e8f0;
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
  background-color: #1f1f2a;
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
  color: #e8e8f0;
}

.creator-count {
  font-size: 0.9rem;
  color: #a0a0b0;
}

.creator-time {
  font-size: 0.9rem;
  color: #a0a0b0;
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
  color: #808090;
  font-size: 1rem;
  min-height: 150px;
}

.tag-cloud-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(50%) sepia(10%) saturate(300%) hue-rotate(200deg);
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
  background: #1f1f2a;
  color: #e8e8f0;
  border: 2px solid #2a2a38;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  background: #2a2a38;
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
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(5px);
}

.modal-content {
  position: relative;
  background: #1a1a24;
  border-radius: 10px;
  max-width: 800px;
  width: 90%;
  max-height: 90%;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  border: 1px solid #2a2a38;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #2a2a38;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #e8e8f0;
  flex: 1;
  margin-right: 1rem;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: #a0a0b0;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background-color: #2a2a38;
  color: #e8e8f0;
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
  border-top: 2px solid #2a2a38;
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
  color: #a0a0b0;
  min-width: 80px;
}

.info-value {
  color: #e8e8f0;
  flex: 1;
}

.tag {
  display: inline-block;
  background-color: rgba(102, 126, 234, 0.2);
  color: #a78bfa;
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
  border: 2px solid #2a2a38;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s ease;
  background-color: #12121a;
  color: #e8e8f0;
}

.memo-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.memo-textarea::placeholder {
  color: #606070;
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
  background: #1a1a24;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  border-left: 4px solid #4CAF50;
  animation: slideIn 0.3s ease;
  border: 1px solid #2a2a38;
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
  color: #e8e8f0;
  font-size: 0.9rem;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #a0a0b0;
  padding: 0.25rem;
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.toast-close:hover {
  background-color: #2a2a38;
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

  .history-delete-condition-grid {
    grid-template-columns: 1fr;
  }

  .history-delete-confirm-details {
    grid-template-columns: 1fr;
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
  background-color: #1f1f2a;
}

.accordion-icon {
  margin-left: 4px;
  transition: transform 0.2s;
}

.watch-logs-accordion {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background-color: #12121a;
  border-radius: 4px;
  margin-top: 8px;
}

.watch-logs-accordion.expanded {
  max-height: 400px;
  border: 1px solid #2a2a38;
}

.watch-logs-content {
  padding: 12px;
}

.watch-logs-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a0a0b0;
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
  background-color: #1a1a24;
  border: 1px solid #2a2a38;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
}

.watch-log-item.latest {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.watch-log-item.current-session {
  border-color: #ff6b35;
  background-color: rgba(255, 107, 53, 0.1);
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
  color: #a0a0b0;
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
  background-color: #2a2a38;
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
  background-color: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.4);
  border-radius: 4px;
  font-size: 12px;
  color: #ffc107;
  text-align: center;
}

/* スクロールバー */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #12121a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #3a3a48;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4a4a58;
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
  background-color: #1f1f2a;
  border-radius: 6px;
  cursor: pointer;
  border-left: 3px solid #ffbb00;
  transition: all 0.2s ease;
}

.favorite-item:hover {
  background-color: #2a2a38;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
  color: #e8e8f0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.favorite-score {
  font-size: 0.8rem;
  color: #a0a0b0;
  font-variant-numeric: tabular-nums;
}

.favorite-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #808090;
  font-size: 1rem;
  min-height: 150px;
}

.favorite-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(50%) sepia(10%) saturate(300%) hue-rotate(200deg);
}

${seriesStyles}
`;

  document.head.appendChild(style);
}

/**
 * 視聴履歴のスタイルを削除する
 */
export function removeWatchHistoryStyles(): void {
  const styleElement = document.getElementById("watch-history-styles");
  if (styleElement) {
    styleElement.remove();
  }
}

// シリーズ関連のスタイルを追加
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
    background: #1a1a24;
    border-radius: 8px;
    border: 1px solid #2a2a38;
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
    border: 2px solid #2a2a38;
    border-radius: 12px;
    background: #12121a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-height: 200px;
  }

  .series-list:empty {
    display: none;
  }

  .series-item {
    background: #1a1a24;
    border: 1px solid #2a2a38;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .series-item:hover {
    background: #1f1f2a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-color: #667eea;
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
    color: #e8e8f0;
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
    background: #2a2a38;
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
    color: #a0a0b0;
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
    color: #a0a0b0;
  }

  .series-last-video {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #a0a0b0;
    line-height: 1.3;
    min-width: 0;
  }

  .last-video-label {
    flex: 0 0 auto;
    font-weight: 500;
  }

  .last-video-title {
    min-width: 0;
    color: #e8e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .series-last-play-btn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: #007bff;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
  }

  .series-last-play-btn:hover {
    background: #0056b3;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
  }

  .series-last-play-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
  }

  .series-last-play-btn .material-icon {
    width: 16px;
    height: 16px;
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
    background: #1a1a24;
    border-radius: 8px;
    border: 1px solid #2a2a38;
  }

  .series-alert-title h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #e8e8f0;
  }

  .series-alert-title p {
    margin: 0;
    color: #a0a0b0;
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
    border: 2px solid #2a2a38;
    border-radius: 12px;
    background: #12121a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-height: 200px;
  }

  .series-alert-list:empty {
    display: none;
  }

  .series-alert-item {
    background: #1a1a24;
    border: 1px solid #2a2a38;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .series-alert-item:hover {
    background: #1f1f2a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-color: #667eea;
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
    color: #e8e8f0;
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
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
  }

  .alert-status.disabled {
    background: rgba(244, 67, 54, 0.2);
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
    color: #a0a0b0;
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
    background: #1a1a24;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    margin-bottom: 1rem;
    border: 1px solid #2a2a38;
  }

  .delete-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 条件付き削除グループ */
  .delete-condition-group {
    border: 1px solid #2a2a38;
    border-radius: 6px;
    padding: 1rem;
    background: #12121a;
  }

  .delete-condition-title {
    font-size: 14px;
    font-weight: 600;
    color: #e8e8f0;
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

  .delete-condition-item.disabled .delete-condition-input-group {
    opacity: 0.4;
    pointer-events: none;
  }

  .delete-condition-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .delete-condition-checkbox {
    width: 16px;
    height: 16px;
    accent-color: #667eea;
    cursor: pointer;
    margin: 0;
  }

  .delete-condition-label {
    font-size: 12px;
    font-weight: 600;
    color: #a0a0b0;
  }

  .delete-condition-hint {
    font-size: 11px;
    color: #808090;
    margin: 0 0 0.75rem 0;
    font-style: italic;
  }

  .delete-condition-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .delete-condition-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #2a2a38;
    border-radius: 4px;
    font-size: 13px;
    text-align: center;
    background-color: #12121a;
    color: #e8e8f0;
  }

  .delete-condition-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
  }

  .delete-condition-suffix {
    font-size: 12px;
    color: #a0a0b0;
    font-weight: 500;
  }

  .history-delete-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .history-delete-panel {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
  }

  .history-delete-heading {
    margin: 0 0 12px;
    font-size: 1rem;
    color: #ffffff;
  }

  .history-delete-note {
    margin: 0 0 12px;
    color: #a0a0b0;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .history-delete-condition-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    align-items: end;
  }

  .history-delete-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #d0d0dc;
    font-size: 0.9rem;
  }

  .history-delete-select,
  .history-delete-field .delete-condition-input {
    width: 100%;
    box-sizing: border-box;
  }

  .history-delete-dry-run {
    min-height: 180px;
  }

  .delete-dry-run-console {
    margin: 0;
    min-height: 150px;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    background: #11131a;
    color: #d8e2ff;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 12px;
    font-family: Consolas, Monaco, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .history-delete-confirm-content {
    max-height: 90vh;
  }

  .history-delete-confirm-warning {
    margin: 0 0 8px;
    color: #ffb4b4;
    font-weight: 600;
    line-height: 1.5;
  }

  .history-delete-confirm-count {
    margin: 0 0 12px;
    color: #e8e8f0;
    font-weight: 600;
  }

  .history-delete-confirm-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 52vh;
    overflow: auto;
    padding: 8px;
    background: #101018;
    border: 1px solid #2a2a38;
    border-radius: 8px;
  }

  .history-delete-confirm-row {
    padding: 10px;
    background: #181824;
    border: 1px solid #2a2a38;
    border-radius: 6px;
  }

  .history-delete-confirm-title {
    margin-bottom: 6px;
    color: #ffffff;
    font-weight: 700;
    line-height: 1.4;
  }

  .history-delete-confirm-details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 12px;
    color: #b8b8c8;
    font-size: 0.85rem;
    line-height: 1.4;
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
    color: #e8e8f0;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .browser-instructions {
    margin-bottom: 24px;
  }

  .browser-instructions h3 {
    color: #e8e8f0;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
  }

  .browser-tab {
    background: #1f1f2a;
    border: 1px solid #2a2a38;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
    color: #c0c0d0;
  }

  .browser-tab.current-browser {
    background: rgba(102, 126, 234, 0.15);
    border: 2px solid #667eea;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .browser-tab.current-browser h4 {
    color: #a78bfa;
    position: relative;
  }

  .browser-tab.current-browser h4::after {
    content: "（お使いのブラウザ）";
    font-size: 12px;
    color: #667eea;
    font-weight: normal;
    margin-left: 8px;
  }

  .browser-tab h4 {
    color: #e8e8f0;
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
    background: #1a1a24;
    border-left: 4px solid #667eea;
    padding: 12px;
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.4;
  }

  .alternative-method strong {
    color: #e8e8f0;
  }

  .permission-test-section {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.4);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .permission-test-section h3 {
    color: #4caf50;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .permission-test-section p {
    color: #a5d6a7;
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
    color: #e8e8f0;
  }

  .form-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #2a2a38;
    border-radius: 4px;
    font-size: 14px;
    background: #12121a;
    color: #e8e8f0;
  }

  .form-select option {
    background-color: #1a1a24;
    color: #e8e8f0;
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
    background: #1f1f2a;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .series-video-item:hover {
    background: #2a2a38;
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
    color: #e8e8f0;
    margin: 0;
    line-height: 1.3;
  }

  .video-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #a0a0b0;
  }

  .video-progress-bar {
    height: 3px;
    background: #2a2a38;
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
    color: #a0a0b0;
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
  background: #1f1f2a;
  border-radius: 8px;
  border: 1px solid #2a2a38;
}

.db-management-section h4 {
  margin: 0 0 16px 0;
  color: #e8e8f0;
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
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 8px;
}

.migration-progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.migration-current-task {
  font-size: 14px;
  color: #a78bfa;
  font-weight: 500;
}

.migration-progress-bar {
  width: 100%;
  height: 8px;
  background: #2a2a38;
  border-radius: 4px;
  overflow: hidden;
}

.migration-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #a78bfa);
  transition: width 0.3s ease;
}

.migration-progress-text {
  font-size: 12px;
  color: #a78bfa;
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
  color: #e8e8f0;
  font-size: 14px;
  font-weight: 600;
}

.backup-list-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #2a2a38;
  border-radius: 4px;
  background: #12121a;
}

.backup-list-empty {
  padding: 24px;
  text-align: center;
  color: #a0a0b0;
  font-size: 14px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #1f1f2a;
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
  color: #e8e8f0;
  font-weight: 500;
}

.backup-version {
  font-size: 12px;
  color: #a0a0b0;
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
  color: #e8e8f0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
}

.setting-description {
  font-size: 12px;
  color: #a0a0b0;
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
  background: #1f1f2a;
  border-radius: 8px;
  border: 1px solid #2a2a38;
}

.series-nav-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #e8e8f0;
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

/* ===== 視聴履歴ワークスペース刷新 ===== */
.main-content {
  max-width: 1560px;
  padding: 24px clamp(16px, 3vw, 40px);
}

.tab-nav {
  position: relative;
  margin-bottom: 20px;
  gap: 16px;
}

.tab-buttons {
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 14px;
}

.management-menu {
  position: relative;
  margin-left: auto;
}

.management-menu > summary {
  list-style: none;
  cursor: pointer;
}

.management-menu > summary::-webkit-details-marker,
.advanced-sort-menu > summary::-webkit-details-marker,
.filter-section > summary::-webkit-details-marker {
  display: none;
}

.management-menu .tab-actions {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  right: 0;
  width: 230px;
  display: grid;
  gap: 8px;
  padding: 12px;
  background: #1a1a24;
  border: 1px solid #343445;
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.management-menu .tab-actions .btn {
  width: 100%;
  justify-content: flex-start;
}

.history-layout {
  grid-template-columns: minmax(190px, 230px) minmax(0, 1fr);
  gap: clamp(16px, 2vw, 28px);
  height: auto;
  min-height: calc(100vh - 190px);
}

.sidebar,
.content-area {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.sidebar {
  padding: 0 18px 0 0;
  overflow: visible;
  border-right: 1px solid #2a2a38;
}

.content-area {
  padding: 0;
  overflow: visible;
}

.library-section,
.sort-section,
.filter-section,
.stats-summary,
.sidebar-management-link {
  margin: 0;
  padding: 0 0 18px;
  border: 0;
  border-bottom: 1px solid #2a2a38;
  background: transparent;
  box-shadow: none;
}

.sort-section,
.filter-section,
.stats-summary,
.sidebar-management-link {
  margin-top: 18px;
}

.library-link {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a0a0b0;
  text-align: left;
  cursor: pointer;
}

.library-link:hover,
.library-link.active {
  background: rgba(102, 126, 234, 0.16);
  color: #d8ddff;
}

.sort-btn {
  padding: 8px 10px;
  border: 0;
  background: transparent;
}

.sort-btn:hover,
.sort-btn.active {
  border-color: transparent;
  background: rgba(102, 126, 234, 0.14);
}

.advanced-sort-menu > summary,
.filter-section > summary {
  cursor: pointer;
  color: #aeb5d8;
}

.advanced-sort-menu > summary {
  padding: 8px 10px;
  font-size: 0.88rem;
}

.advanced-sort-controls,
.filter-controls {
  margin-top: 10px;
}

.history-query-bar {
  margin-bottom: 14px;
}

.history-query-bar .search-section {
  margin: 0;
}

.history-query-bar .search-input {
  min-height: 46px;
  border-width: 1px;
  border-radius: 8px;
}

.content-header {
  margin-bottom: 4px;
  padding: 0 0 12px;
  border-bottom: 1px solid #2a2a38;
}

.content-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.active-filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.active-filter-chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(102, 126, 234, 0.16);
  color: #cbd2ff;
  font-size: 0.78rem;
}

.history-list {
  overflow: visible;
  padding: 0;
}

.history-item {
  align-items: center;
  margin: 0;
  padding: 14px 0;
  border: 0;
  border-bottom: 1px solid #2a2a38;
  border-radius: 0;
  background: transparent;
  transform: none;
}

.history-item:hover {
  border-color: #3a3a4b;
  background: rgba(255, 255, 255, 0.025);
  box-shadow: none;
  transform: none;
}

.history-thumbnail {
  width: clamp(128px, 15vw, 176px);
  height: auto;
  aspect-ratio: 16 / 9;
}

.history-progress {
  margin: 3px 0;
}

.history-primary-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.history-progress-label {
  color: #a0a0b0;
  font-size: 0.84rem;
}

.history-resume-btn {
  flex-shrink: 0;
}

.history-delete-btn {
  opacity: 0;
}

@media (max-width: 1024px) {
  .history-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 0 0 16px;
    border-right: 0;
    border-bottom: 1px solid #2a2a38;
  }

  .library-section,
  .sort-section,
  .filter-section,
  .stats-summary,
  .sidebar-management-link {
    margin: 0;
  }
}

@media (max-width: 700px) {
  .tab-nav {
    align-items: flex-start;
  }

  .tab-buttons {
    flex: 1;
  }

  .tab-btn {
    padding: 9px;
    font-size: 0.88rem;
  }

  .sidebar {
    grid-template-columns: 1fr;
  }

  .stats-summary,
  .sidebar-management-link {
    display: none;
  }

  .history-item {
    align-items: stretch;
  }

  .history-thumbnail {
    width: 100%;
    max-width: 320px;
    height: auto;
  }

  .history-meta,
  .history-stats {
    flex-wrap: wrap;
  }
}
`;

// スタイルをexportしてファイルの末尾で追加
export { seriesStyles };
