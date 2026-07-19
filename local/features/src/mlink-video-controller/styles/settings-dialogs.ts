export const settingsDialogsStyles = `

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
`;
