/* CommentFilter2 - Modern Dark Theme */
/* Reset and Base Styles */
export const CommentFilter2MainStyles = `
* {
  box-sizing: border-box;
}

/* Background Overlay with Blur Effect */
.cf2-background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  
  /* Beautiful blur effect */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  /* Smooth fade animation */
  opacity: 0;
  animation: cf2-overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  /* Cursor indicates clickable */
  cursor: pointer;
}

@keyframes cf2-overlay-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}

/* Container */
.cf2-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10001;
  
  /* Glassmorphism inspired dark theme */
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  border: 1px solid rgba(55, 65, 81, 0.7);
  border-radius: 1rem;
  
  /* Shadow system */
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  /* Modern typography */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #f9fafb;
  
  /* Dimensions - ビューポート全体を活用 */
  width: min(90vw, 100vw);
  max-height: 90vh;
  overflow-y: auto;
  
  /* Smooth transitions */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scrollbar styling */
.cf2-container::-webkit-scrollbar {
  width: 6px;
}

.cf2-container::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

/* Header */
.cf2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 2rem;
}

.cf2-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9fafb;
}

.cf2-title-text {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cf2-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  
  background: rgba(55, 65, 81, 0.5);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.5rem;
  
  color: #9ca3af;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  transform: scale(1.05);
}

/* Content */
.cf2-content {
  padding: 0 2rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Top controls (full width) */
.cf2-top-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.cf2-control-card {
  flex: 1;
  min-width: 0;
}

/* Layout grid for 2-column design */
.cf2-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: stretch;
  min-height: 0;
}

.cf2-left-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.cf2-right-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

/* Card variants for different purposes */
.cf2-main-card {
  /* NGワードルール用の大きなカード */
  min-height: 400px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cf2-settings-card {
  /* コマンド設定用 */
  flex: 1;
}

/* Card component */
.cf2-card {
  background: rgba(31, 41, 55, 0.6);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.75rem;
  padding: 1.25rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-card:hover {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(55, 65, 81, 0.7);
}

/* Section headers */
.cf2-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cf2-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f9fafb;
}

/* Status card */
.cf2-status-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}

.cf2-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cf2-status-indicator {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #6b7280;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-status-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.cf2-status-indicator.error {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.cf2-status-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e5e7eb;
}

/* Toggle components */
.cf2-toggle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cf2-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #e5e7eb;
}

.cf2-toggle {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  
  background: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.75rem;
  
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.cf2-toggle-slider {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active .cf2-toggle-slider {
  transform: translateX(1.5rem);
}

/* Input groups */
.cf2-input-group {
  margin-bottom: 1rem;
}

.cf2-input-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  color: #d1d5db;
  margin-bottom: 0.5rem;
  
  cursor: help;
}

.cf2-command-input {
  width: 100%;
  padding: 0.75rem 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-size: 0.875rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-command-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-command-input::placeholder {
  color: #6b7280;
}

/* Textarea */
.cf2-textarea-container {
  margin-bottom: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cf2-textarea {
  width: 100%;
  min-height: 12rem;
  flex: 1;
  padding: 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  
  resize: vertical;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-textarea:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-textarea::placeholder {
  color: #6b7280;
}

/* Button groups */
.cf2-button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Buttons */
.cf2-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  padding: 0.75rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Flex grow for equal width buttons */
  flex: 1;
  min-width: 0;
}

.cf2-button:hover {
  transform: translateY(-1px);
}

.cf2-button:active {
  transform: translateY(0);
}

.cf2-button-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.cf2-button-primary:hover {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.cf2-button-secondary {
  background: rgba(55, 65, 81, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #e5e7eb;
}

.cf2-button-secondary:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(75, 85, 99, 0.7);
}

.cf2-button-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.cf2-button-danger:hover {
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.cf2-button-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.cf2-button-warning:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

/* Help text */
.cf2-help-text {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(17, 24, 39, 0.5);
  border: 1px solid rgba(55, 65, 81, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}

/* Regex help text styling */
.cf2-regex-help {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #d1d5db;
}

.cf2-regex-help code {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0.125rem;
}

/* File input */
.cf2-file-input {
  display: none;
}

/* Debug section */
.cf2-debug-section {
  margin-top: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-debug-section.cf2-collapsed {
  display: none;
}

.cf2-debug-info {
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #d1d5db;
  
  max-height: 12rem;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* Icons */
.cf2-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: filter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 白色アイコン専用クラス */
.cf2-icon-white {
  filter: invert(1) brightness(1) contrast(1.2);
}

.cf2-button:hover .cf2-icon-white,
.cf2-close-btn:hover .cf2-icon-white {
  filter: invert(1) brightness(1.1) contrast(1.3);
}

.cf2-button-primary .cf2-icon-white,
.cf2-button-danger .cf2-icon-white {
  filter: invert(1) brightness(1.2) contrast(1.2);
}

/* Responsive design */
@media (max-width: 1024px) {
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  .cf2-right-column {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .cf2-container {
    width: min(95vw, 90vw);
    max-height: 95vh;
  }
  
  .cf2-header {
    padding: 1.5rem 1.5rem 0 1.5rem;
  }
  
  .cf2-content {
    padding: 0 1.5rem 1.5rem 1.5rem;
    gap: 1.25rem;
  }
  
  .cf2-top-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .cf2-button-group {
    flex-direction: column;
  }
  
  .cf2-button {
    flex: none;
  }
  
  .cf2-title {
    font-size: 1.125rem;
  }
  
  .cf2-main-card {
    min-height: 300px;
  }
  
  .cf2-reload-button {
    padding: 0.875rem 1.5rem;
    font-size: 0.9375rem;
  }
}

/* Smooth entrance animation */
@keyframes cf2-fade-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) scale(1);
  }
}

.cf2-container {
  animation: cf2-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reload button section */
.cf2-reload-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(55, 65, 81, 0.5);
}

.cf2-reload-button {
  width: 100%;
  font-size: 1rem;
  font-weight: 600;
  padding: 1rem 2rem;
  
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 0.75rem;
  color: white;
  cursor: pointer;
  
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-reload-button:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 
    0 8px 20px rgba(16, 185, 129, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.15) inset;
  transform: translateY(-2px);
}

.cf2-reload-button:active {
  transform: translateY(0);
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1) inset;
}

/* Focus management */
.cf2-container:focus-within {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 新しいUI要素のスタイル */

/* 形式切替タブ */
.cf2-format-selector {
  margin-bottom: 20px;
}

.cf2-format-tabs {
  display: flex;
  gap: 4px;
  margin-top: 12px;
}

.cf2-format-tab {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.cf2-format-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(74, 144, 226, 0.3);
}

.cf2-format-tab.active {
  background: rgba(74, 144, 226, 0.2);
  border-color: #4a90e2;
  color: #4a90e2;
}

/* 表示/非表示制御 */
.cf2-hidden {
  display: none !important;
}

/* ユーザーIDルール用の注意書きスタイル */
#cf2-userid-action-note {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #f59e0b;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #fbbf24;
}

/* テキスト入力 */
.cf2-text-input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cf2-text-input:focus {
  outline: none;
  border-color: #4a90e2;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.cf2-text-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* ラジオボタン */
.cf2-radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.cf2-radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #ffffff;
}

.cf2-radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #4a90e2;
}

/* セレクトボックス */
.cf2-select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}

.cf2-select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* セレクトボックスのオプション */
.cf2-select option {
  background: #1f2937;
  color: #ffffff;
  padding: 8px 12px;
}

.cf2-select option:hover {
  background: #374151;
}

.cf2-select option:checked {
  background: #4a90e2;
  color: #ffffff;
}

/* 数値入力 */
.cf2-number-input {
  width: 80px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  text-align: center;
}

.cf2-number-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* 入力行（横並び） */
.cf2-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* ニコる数設定 */
.cf2-nicoru-settings {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

/* ルール一覧 */
.cf2-rules-list-card .cf2-section-header {
  justify-content: space-between;
}

.cf2-rule-count {
  background: rgba(74, 144, 226, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rules-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.cf2-rules-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.cf2-rule-item {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.cf2-rule-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cf2-rule-item:last-child {
  border-bottom: none;
}

.cf2-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cf2-rule-type {
  background: rgba(74, 144, 226, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rule-actions {
  display: flex;
  gap: 4px;
}

.cf2-rule-content {
  font-size: 13px;
  color: #b8c5d1;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  word-break: break-all;
}

.cf2-rule-details {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 小さなボタン */
.cf2-button-small {
  padding: 6px 10px;
  font-size: 12px;
}

/* コマンド設定カード */
.cf2-command-settings-card {
  margin-bottom: 1.5rem;
}

.cf2-command-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* 設定セクション */
.cf2-settings-section {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cf2-settings-section .cf2-card {
  flex: 1;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .cf2-command-grid {
    grid-template-columns: 1fr;
  }
  
  .cf2-settings-section {
    flex-direction: column;
  }
}
`