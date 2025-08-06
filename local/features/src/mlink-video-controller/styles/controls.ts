export const controlsStyles = `
/* 再生タブのコンテンツ容器 */
.playback-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.playback-content > div {
  flex-shrink: 0; /* スクロール時にコンテンツが縮まないようにする */
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
  gap: 6px;
  margin: 4px 0;
}

#volume .control-grid {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}

.control-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 8px;
  color: var(--panel-fg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 16px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn:hover::before {
  opacity: 1;
}

.control-btn:active {
  transform: translateY(0);
}

/* 繰り返し再生ボタンのアクティブ状態 */
.control-btn.active {
  background: var(--panel-accent);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.3);
}

.control-btn.active::before {
  opacity: 0;
}

.range-control {
  width: 100%;
  margin: 4px 0;
}

.range-control label {
  display: block;
  margin-bottom: 12px;
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.range-control input[type="range"] {
  width: 100%;
}

.tracker-control {
  width: 100%;
  margin: 4px 0;
}

.tracker-control .time-label {
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
  display: block;
  text-align: center;
  margin-bottom: 8px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.tracker-container {
  position: relative;
  width: 100%;
}

.tracker-container input[type="range"] {
  width: 100%;
  margin: 4px 0;
}

.time-tip {
  position: absolute;
  display: none;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 美しいスライダーのスタイル */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.15);
  outline: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

input[type="range"]:hover {
  background: rgba(255, 255, 255, 0.2);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.6);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.seek-controls {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  gap: 6px;
}

.seek-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.seek-input input {
  width: 50px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--panel-fg);
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

.seek-input span {
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.seek-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.seek-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

/* X秒ジャンプボタン */
.x-sec-jump-wrapper {
  margin-top: 4px;
}

.x-sec-jump-container {
  display: flex;
  gap: 4px;
  margin-bottom: 3px;
}

.x-sec-jump-container:last-child {
  margin-bottom: 0;
}

.x-sec-jump-btn {
  flex: 1;
  min-width: 70px;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--panel-fg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.x-sec-jump-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

/* ヒートマップモード切り替え */
.heatmap-mode-control {
  margin: 4px 0;
}

.heatmap-mode-control label {
  display: block;
  margin-bottom: 12px;
  color: var(--panel-fg);
  font-size: 14px;
  font-weight: 500;
}

.heatmap-mode-buttons {
  display: flex;
  gap: 6px;
}

.heatmap-mode-btn {
  flex: 1;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.heatmap-mode-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.heatmap-mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.heatmap-mode-btn:hover::before {
  opacity: 1;
}

.heatmap-mode-btn[data-active] {
  background: var(--panel-accent);
  border-color: var(--panel-accent-hover);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.3);
}

.heatmap-mode-btn[data-active]::before {
  opacity: 0;
}

/* 音量と再生速度のプリセットボタン */
.volume-presets, .speed-presets {
  display: flex;
  gap: 4px;
  margin: 2px 0;
}

.volume-preset, .speed-preset {
  flex: 1;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-align: center;
}

.volume-preset::before, .speed-preset::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.volume-preset:hover, .speed-preset:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.volume-preset:hover::before, .speed-preset:hover::before {
  opacity: 1;
}

.volume-preset:active, .speed-preset:active {
  transform: translateY(0);
}

/* 再生速度の微調整ボタン */
.speed-fine-control {
  margin-top: 2px;
}

.speed-adjust {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.speed-adjust::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.2), rgba(150, 100, 255, 0.2));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.speed-adjust:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.speed-adjust:hover::before {
  opacity: 1;
}
`; 