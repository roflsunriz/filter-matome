export const commentsStyles = `
.comment-search-control {
  margin-bottom: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.comment-search-input {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  margin-bottom: 12px;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.comment-search-input:focus {
  outline: none;
  border-color: var(--panel-accent);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.2);
  position: relative;
}

.comment-search-input:focus::after {
  content: '🔒 キーボードショートカット無効';
  position: absolute;
  top: -25px;
  left: 0;
  font-size: 11px;
  color: rgba(100, 150, 255, 0.8);
  background: rgba(0, 0, 0, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.comment-search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.comment-search-options {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #667eea;
  cursor: pointer;
}

.option-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--panel-fg);
  cursor: pointer;
  user-select: none;
}

.comment-search-buttons {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.search-btn, .clear-btn {
  flex: 1;
  max-width: calc(50% - 6px);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--panel-fg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.search-btn::before, .clear-btn::before {
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

.search-btn:hover, .clear-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-btn:hover::before, .clear-btn:hover::before {
  opacity: 1;
}

.search-results {
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.comment-result {
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.comment-result::before {
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

.comment-result:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--panel-accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.comment-result:hover::before {
  opacity: 1;
}

.comment-result:last-child {
  margin-bottom: 0;
}

.comment-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  position: relative;
  z-index: 1;
}

.comment-body {
  word-break: break-all;
  line-height: 1.5;
  font-size: 14px;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.comment-user {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.comment-details {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
  line-height: 1.4;
  position: relative;
  z-index: 1;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-style: italic;
}

.error-message {
  padding: 16px;
  text-align: center;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.copy-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--panel-fg);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  opacity: 0.7;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  position: relative;
  z-index: 2;
  margin-left: 8px;
  float: right;
}

.copy-button:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--panel-accent);
  transform: translateY(-1px);
}

.copy-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
`; 