export const heatmapStyles = `
.heatmap-container {
  width: 100%;
  height: 36px;
  position: relative;
  margin-top: 8px;
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.heatmap-canvas {
  width: 100% !important;
  height: 36px !important;
  border-radius: 12px;
  background: transparent;
  display: block;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.heatmap-canvas:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.heatmap-tooltip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1000;
  bottom: 42px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.heatmap-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
}

/* ヒートマップ詳細設定 */
.heatmap-settings {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.heatmap-setting-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.heatmap-setting-group label {
  color: var(--panel-fg);
  font-weight: 500;
  white-space: nowrap;
}

.heatmap-color-scheme {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--panel-fg);
  border-radius: 6px;
  font-size: 13px;
  min-width: 100px;
  transition: all 0.2s ease;
}

.heatmap-color-scheme:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.heatmap-color-scheme:focus {
  outline: none;
  border-color: var(--panel-accent);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.heatmap-color-scheme option {
  background: rgb(39, 39, 39);
  color: var(--panel-fg);
}

.heatmap-smooth-toggle {
  width: 16px;
  height: 16px;
  accent-color: var(--panel-accent);
  cursor: pointer;
}

.heatmap-smooth-toggle:focus {
  outline: 2px solid var(--panel-accent);
  outline-offset: 2px;
}

/* 動画プレイヤー上のオーバーレイヒートマップ */
.heatmap-overlay-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  pointer-events: none;
  z-index: 1000;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  border-radius: 0 0 12px 12px;
}

.heatmap-overlay-canvas {
  width: 100% !important;
  height: 100% !important;
  pointer-events: auto;
  cursor: pointer;
  border-radius: 0 0 12px 12px;
  display: block;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.heatmap-overlay-canvas:hover {
  filter: brightness(1.2);
}

.heatmap-overlay-tooltip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
  z-index: 1001;
  transform: translateX(-50%);
  bottom: 56px;
  white-space: nowrap;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.heatmap-overlay-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.95);
}
`; 