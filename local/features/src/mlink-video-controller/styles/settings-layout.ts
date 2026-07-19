export const settingsLayoutStyles = `

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
`;
