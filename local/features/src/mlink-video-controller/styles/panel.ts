export const panelStyles = `
.panel {
  max-height: 80vh;
  overflow: hidden;
  flex-direction: column;
}

.panel.visible {
  display: flex;
}

nav {
  display: flex;
  gap: 4px;
  border-top: 1px solid var(--panel-border);
  padding: 8px 0;
  margin-top: 20px;
  flex-shrink: 0;
  order: 1;
}

nav button {
  flex: 1;
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--panel-fg);
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  margin-bottom: 2px;
}

nav button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), rgba(150, 100, 255, 0.1));
  opacity: 0;
  transition: opacity 0.2s ease;
}

nav button:hover::before {
  opacity: 1;
}

nav button[data-active] {
  background: var(--panel-accent);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(100, 150, 255, 0.2);
  margin-bottom: 2px;
}

nav button[data-active]::before {
  opacity: 0;
}

/* タブボタン内のアイコンのpointer-eventsを無効化 */
nav button svg,
nav button .tab-icon,
nav button .subtab-icon {
  pointer-events: none;
}

.tab {
  display: none;
  flex: 1;
  order: 0;
  overflow-y: auto;
  max-height: calc(80vh - 80px); /* パネル高さからナビゲーション分を引く */
  padding-right: 8px;
  margin-right: -8px;
}

.tab.active {
  display: block;
  animation: tabFadeIn 0.2s ease-out;
}

/* タブコンテンツのスクロールバーのスタイリング */
.tab::-webkit-scrollbar {
  width: 8px;
}

.tab::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.tab::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.tab::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.subtab {
  display: none;
  height: 100%;
}

.subtab.active {
  display: flex;
  flex-direction: column;
  animation: tabFadeIn 0.2s ease-out;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  overflow-y: auto;
  max-height: calc(80vh - 140px);
  padding-right: 6px;
  margin-right: -6px;
  flex: 1;
}

.card-container::-webkit-scrollbar {
  width: 8px;
}

.card-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.card-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.card-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  height: auto;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1), rgba(150, 100, 255, 0.1));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border-color: var(--panel-accent);
}

.action-card:hover::before {
  opacity: 1;
}

.action-card:active {
  transform: translateY(-1px);
}

.action-card img {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.action-card span {
  color: var(--panel-fg);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  position: relative;
  z-index: 1;
}
`; 