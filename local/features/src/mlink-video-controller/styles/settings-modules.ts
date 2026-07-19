export const settingsModulesStyles = `

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
`;
