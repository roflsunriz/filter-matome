export const STANDALONE_PAGE_STYLES = [
  "body.nc-standalone-body { margin: 0; padding: 0; background: #0b0d14; color: #f4f6ff; font-family: 'Segoe UI', 'Helvetica Neue', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; min-height: 100vh; overflow-x: hidden; }",
  "a { color: #7aa2ff; text-decoration: none; }",
  "a:hover { text-decoration: underline; }",
  ".nc-standalone-page { max-width: 90vw; margin: 0 auto; padding: 32px 20px 64px; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px; }",
  ".nc-header { display: flex; flex-direction: column; gap: 12px; }",
  ".nc-header__breadcrumbs { font-size: 13px; color: #8a94ad; display: flex; align-items: center; gap: 8px; }",
  ".nc-header__breadcrumbs a { color: inherit; }",
  ".nc-header__title { font-size: 28px; font-weight: 600; line-height: 1.4; }",
  ".nc-header__meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #9ca6c3; }",
  ".nc-main { display: flex; flex-direction: column; gap: 28px; }",
  ".nc-player-surface { background: rgba(14, 16, 25, 0.9); border-radius: 18px; padding: 20px; box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35); box-sizing: border-box; }",
  
  /* プレイヤーとコメントのレスポンシブレイアウト */
  ".standalone-player-wrapper { display: flex; flex-direction: row; width: 100%; max-width: 100%; gap: 16px; box-sizing: border-box; position: relative; }",
  ".standalone-player-wrapper .custom-player { flex: 1 1 auto; min-width: 0; position: relative; }",
  ".standalone-player-wrapper .comment-container { flex: 0 0 auto; width: clamp(280px, 25vw, 400px); min-width: 280px; max-width: 400px; background: rgba(23, 26, 38, 0.92); border-radius: 12px; padding: 12px; box-shadow: inset 0 0 0 1px rgba(127, 158, 255, 0.16); box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 200px); }",
  
  /* videoとvideo-containerのレスポンシブ対応（通常表示時のみ） */
  ".standalone-player-wrapper .custom-player:not(:fullscreen):not(:-webkit-full-screen):not(:-moz-full-screen):not(:-ms-fullscreen) { width: 100%; height: auto; }",
  ".standalone-player-wrapper .custom-player:not(:fullscreen):not(:-webkit-full-screen):not(:-moz-full-screen):not(:-ms-fullscreen) .video-container { position: relative; width: 100%; aspect-ratio: 16 / 9; max-height: calc(100vh - 200px); }",
  
  ".nc-info-card { background: rgba(20, 24, 36, 0.88); border-radius: 16px; padding: 20px; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); display: flex; flex-direction: column; gap: 22px; }",
  ".nc-stat-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }",
  ".nc-stat-item { background: rgba(34, 40, 64, 0.82); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 0 0 1px rgba(142, 170, 255, 0.18); }",
  ".nc-stat-item__label { font-size: 12px; color: #8e98b8; letter-spacing: 0.02em; }",
  ".nc-stat-item__value { font-size: 18px; font-weight: 600; }",
  ".nc-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }",
  ".nc-tag { border-radius: 999px; background: rgba(102, 136, 220, 0.24); color: #d8e2ff; padding: 6px 14px; font-size: 12px; }",
  ".nc-description { background: rgba(14, 16, 25, 0.9); border-radius: 16px; padding: 22px; white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #c9d5f3; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); }",
  ".nc-owner { display: flex; gap: 12px; align-items: center; }",
  ".nc-owner img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(130, 170, 255, 0.3); }",
  ".nc-owner__info { display: flex; flex-direction: column; gap: 2px; }",
  ".nc-owner__link { font-size: 12px; color: #8ab2ff; }",
  ".nc-series { display: flex; flex-direction: column; gap: 8px; }",
  ".nc-series__item { padding: 10px 14px; border-radius: 12px; background: rgba(32, 38, 60, 0.72); display: flex; flex-direction: column; gap: 4px; }",
  ".nc-section-title { font-size: 16px; font-weight: 600; color: #d9e2ff; }",
  ".nc-empty { color: #7d86a8; font-size: 13px; }",
  
  /* レスポンシブ対応 - タブレット */
  "@media (max-width: 1024px) { .nc-main { gap: 20px; } .standalone-player-wrapper { flex-direction: column; } .standalone-player-wrapper .comment-container { width: 100%; max-width: 100%; min-width: 100%; max-height: 400px; } .video-container { max-height: 60vh; } }",
  
  /* レスポンシブ対応 - モバイル */
  "@media (max-width: 768px) { .nc-standalone-page { padding: 16px 12px 32px; gap: 16px; max-width: 100vw; } .nc-header__title { font-size: 20px; } .nc-player-surface { padding: 12px; border-radius: 12px; } .standalone-player-wrapper .comment-container { max-height: 300px; padding: 8px; } .nc-stat-list { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); } }",
].join("\n");
