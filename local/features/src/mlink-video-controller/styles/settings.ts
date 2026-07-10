export const settingsStyles = `
/* 設定コンテナ */
.settings-container {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 20px;
  text-align: center;
  border-bottom: 1px solid var(--panel-border);
  padding-bottom: 12px;
}

.settings-header h3 {
  margin: 0 0 8px 0;
  color: var(--panel-text);
  font-size: 18px;
  font-weight: 600;
}

.settings-header p {
  margin: 0;
  color: var(--panel-text-secondary);
  font-size: 14px;
}

/* カテゴリセクション */
.module-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category {
  background: var(--panel-bg-secondary);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  padding: 12px 16px;
  background: var(--panel-bg-tertiary);
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-header h4 {
  margin: 0;
  color: var(--panel-text);
  font-size: 16px;
  font-weight: 600;
}

.category-description {
  color: var(--panel-text-secondary);
  font-size: 12px;
}

.module-list {
  padding: 8px;
}

.module-list:empty::after {
  content: "このカテゴリにはモジュールがありません";
  display: block;
  text-align: center;
  color: var(--panel-text-secondary);
  font-style: italic;
  padding: 16px;
}

/* モジュール項目 */
.module-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 154px;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "icon name actions"
    ". description actions"
    ". meta actions";
  align-items: start;
  column-gap: 12px;
  row-gap: 8px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.module-item:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-item.module-item-unavailable {
  opacity: 0.55;
  filter: grayscale(1);
}

.module-item.module-item-unavailable:hover {
  background: var(--panel-bg);
  border-color: var(--panel-border);
  transform: none;
  box-shadow: none;
}

.module-item:last-child {
  margin-bottom: 0;
}

.module-icon {
  grid-area: icon;
  font-size: 20px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
}

.module-name {
  grid-area: name;
  min-width: 0;
  margin: 0;
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-description {
  grid-area: description;
  min-width: 0;
  margin: 0;
  color: var(--panel-text-secondary);
  font-size: 12px;
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: break-word;
}

.module-meta {
  grid-area: meta;
  display: grid;
  grid-template-columns: 96px 96px;
  align-items: start;
  gap: 6px;
  min-width: 0;
  font-size: 10px;
  line-height: 1;
}

.module-meta span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 18px;
  min-width: 0;
  width: 100%;
  padding: 3px 6px;
  border-radius: 3px;
  background: var(--panel-bg-tertiary);
  color: var(--panel-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-pages {
  grid-column: 1;
}

.module-status {
  grid-column: 2;
}

.module-page-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  text-decoration: none;
}

.module-status.active {
  background: #4CAF50 !important;
  color: white !important;
}

.module-status.inactive {
  background: #9E9E9E !important;
  color: white !important;
}

.module-status.error {
  background: #F44336 !important;
  color: white !important;
}

.module-status.unavailable {
  background: #607D8B !important;
  color: white !important;
}

.module-status.settings {
  background: #2196F3 !important;
  color: white !important;
}

.module-actions {
  grid-area: actions;
  display: grid;
  grid-template-columns: 96px 50px;
  align-items: center;
  justify-content: end;
  justify-self: end;
  align-self: start;
  gap: 8px;
  width: 154px;
}

.module-settings-slot {
  grid-column: 1;
  min-width: 96px;
  min-height: 32px;
}

.module-toggle-slot {
  grid-column: 2;
  min-width: 50px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.module-actions .toggle-switch {
  margin-left: 0;
}

.module-item-config {
  box-shadow: inset 4px 0 0 #2196F3;
}

.module-item-exclusive {
  background:
    linear-gradient(90deg, rgba(255, 152, 0, 0.16), transparent 96px),
    var(--panel-bg);
}

.module-item-exclusive:hover {
  background:
    linear-gradient(90deg, rgba(255, 152, 0, 0.22), transparent 96px),
    var(--panel-bg-hover);
}

.settings-btn {
  padding: 8px 16px;
  background: linear-gradient(45deg, #2196F3, #1976D2);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.settings-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

.module-settings-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 76px;
}

/* モーダルオーバーレイ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: var(--panel-bg);
  border: 2px solid var(--panel-border);
  border-radius: 12px;
  width: 90%;
  max-width: 980px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--panel-border);
  background: var(--panel-bg-secondary);
}

.modal-header h3 {
  margin: 0;
  color: var(--panel-text);
  font-size: 18px;
  font-weight: bold;
}

.close-modal-btn {
  background: none;
  border: none;
  color: var(--panel-text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-modal-btn:hover {
  background: var(--panel-bg-hover);
  color: var(--panel-text);
  transform: scale(1.1);
}

.modal-body {
  padding: 20px;
  max-height: calc(90vh - 240px);
  overflow-y: auto;
}

.background-settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 16px;
  align-items: start;
}

.background-settings-main {
  min-width: 0;
}

.background-settings-help {
  position: sticky;
  top: 0;
  padding: 18px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: var(--panel-bg-secondary);
  color: var(--panel-text);
}

.background-settings-help h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px 0;
  color: var(--panel-text);
  font-size: 16px;
}

.background-settings-help-steps {
  display: grid;
  gap: 10px;
  margin: 0 0 14px 0;
  padding-left: 22px;
  color: var(--panel-text);
  font-size: 13px;
  line-height: 1.55;
}

.background-settings-help code {
  overflow-wrap: anywhere;
  color: var(--panel-accent);
  font-size: 12px;
}

.background-settings-help-note {
  padding: 12px;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  background: var(--panel-bg);
}

.background-settings-help-note + .background-settings-help-note {
  margin-top: 10px;
}

.background-settings-help-note strong {
  display: block;
  margin-bottom: 6px;
  color: var(--panel-text);
  font-size: 13px;
}

.background-settings-help-note p {
  margin: 0;
  color: var(--panel-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.background-settings-help-note.warning {
  border-color: rgba(255, 152, 0, 0.45);
  background: rgba(255, 152, 0, 0.08);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel-bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 10px 20px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-btn:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
}

.modal-btn.secondary {
  background: var(--panel-bg-tertiary);
}

/* 設定セクション */
.settings-section {
  margin-bottom: 25px;
  padding: 20px;
  background: var(--panel-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--panel-border);
}

.settings-section h4 {
  margin: 0 0 15px 0;
  color: var(--panel-text);
  font-size: 16px;
  font-weight: bold;
}

.url-input-section,
.file-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.url-input-section input,
.file-input-section input[type="text"] {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.url-input-section input:focus,
.file-input-section input[type="text"]:focus {
  outline: none;
  border-color: var(--panel-accent);
  box-shadow: 0 0 0 2px rgba(var(--panel-accent-rgb), 0.2);
}

.url-input-section input::placeholder,
.file-input-section input[type="text"]::placeholder {
  color: var(--panel-text-secondary);
}

.file-input-section input[type="file"] {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg);
  color: var(--panel-text);
  font-size: 14px;
}

.add-btn {
  padding: 12px 20px;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-btn:hover {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

/* 画像リスト */
.image-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--panel-border);
  border-radius: 5px;
  background: var(--panel-bg-tertiary);
  padding: 10px;
  gap: 10px;
  display: flex;
  flex-direction: column;
}

.image-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: var(--panel-bg);
  transition: all 0.3s ease;
}

.image-item:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: var(--panel-accent);
  background: rgba(var(--panel-accent-rgb), 0.1);
}

.image-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--panel-border);
  transition: background 0.3s ease;
}

.image-list-item:hover {
  background: var(--panel-bg-hover);
}

.image-list-item:last-child {
  border-bottom: none;
}

.image-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.image-preview {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.image-details {
  flex: 1;
}

.image-name {
  color: var(--panel-text);
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
}

.image-type {
  color: var(--panel-text-secondary);
  font-size: 12px;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.image-date {
  color: var(--panel-text-secondary);
  font-size: 11px;
}

.image-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.image-select-btn,
.image-delete-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.image-select-btn {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.image-select-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

.image-delete-btn {
  background: linear-gradient(45deg, #f44336, #d32f2f);
  color: white;
}

.image-delete-btn:hover {
  background: linear-gradient(45deg, #d32f2f, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(244, 67, 54, 0.3);
}

/* 削除ボタン内のアイコンを白色にする */
.image-delete-btn .material-icon {
  filter: brightness(0) invert(1) !important;
}

.select-btn {
  padding: 8px 15px;
  background: linear-gradient(45deg, #2196F3, #1976D2);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
}

.select-btn.selected {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  cursor: default;
}

.select-btn.selected:hover {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  transform: none;
  box-shadow: none;
}

.delete-btn {
  padding: 8px 12px;
  background: linear-gradient(45deg, #f44336, #d32f2f);
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: linear-gradient(45deg, #d32f2f, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(244, 67, 54, 0.3);
}

/* スライダースイッチ */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  margin-left: 12px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 28px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--panel-accent);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ホバー効果 */
.slider:hover {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(var(--panel-accent-rgb), 0.2);
}

/* 設定フッター */
.settings-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--panel-border);
}

.settings-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 12px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--panel-bg-secondary);
  color: var(--panel-text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 120px;
}

.action-btn:hover {
  background: var(--panel-bg-hover);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.action-btn.danger {
  border-color: #F44336;
  color: #F44336;
}

.action-btn.danger:hover {
  background: #F44336;
  color: white;
}

.action-btn.primary {
  border-color: #4CAF50;
  color: #4CAF50;
  font-weight: 600;
}

.action-btn.primary:hover {
  background: #4CAF50;
  color: white;
}

.settings-info {
  text-align: center;
}

.settings-info small {
  color: var(--panel-text-secondary);
  font-size: 11px;
}

/* スクロールバーのスタイリング */
.settings-container::-webkit-scrollbar,
.modal-body::-webkit-scrollbar,
.image-list::-webkit-scrollbar {
  width: 6px;
}

.settings-container::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track,
.image-list::-webkit-scrollbar-track {
  background: var(--panel-bg-secondary);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb,
.image-list::-webkit-scrollbar-thumb {
  background: var(--panel-border);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover,
.image-list::-webkit-scrollbar-thumb:hover {
  background: var(--panel-accent);
}

/* レスポンシブ対応 */
@media (max-width: 660px) {
  .settings-actions {
    flex-direction: column;
  }
  
  .action-btn {
    min-width: auto;
  }
  
  .module-item {
    grid-template-columns: 24px minmax(0, 1fr);
    grid-template-areas:
      "icon name"
      ". description"
      ". meta"
      ". actions";
    gap: 12px;
  }

  .module-meta {
    grid-template-columns: 64px 96px 96px;
    width: 100%;
  }

  .module-actions {
    justify-self: stretch;
    justify-content: start;
    width: 100%;
  }

  .toggle-switch {
    margin-left: 0;
  }

  .module-settings-btn {
    margin-left: 0;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-body {
    padding: 14px;
  }

  .background-settings-grid {
    grid-template-columns: 1fr;
  }

  .background-settings-help {
    position: static;
  }

  .image-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .image-actions {
    align-self: stretch;
    justify-content: space-between;
  }
}

/* アニメーション */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.module-item {
  animation: slideIn 0.3s ease-out;
}

.category {
  animation: slideIn 0.3s ease-out;
}

/* 設定管理ボタン */
.settings-management {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.management-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.management-btn.export {
  background: #2f7d73;
  border: 1px solid #4d9a90;
}

.management-btn.export:hover {
  background: #3b9186;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(47, 125, 115, 0.28);
}

.management-btn.import {
  background: #5969a8;
  border: 1px solid #7887c0;
}

.management-btn.import:hover {
  background: #6879ba;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(89, 105, 168, 0.28);
}

.management-btn.reset {
  background: #805d68;
  border: 1px solid #a17681;
}

.management-btn.reset:hover {
  background: #956b78;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(128, 93, 104, 0.28);
}

@media (max-width: 600px) {
  .settings-management {
    flex-direction: column;
  }
  
  .management-btn {
    min-width: auto;
  }
}
`;
