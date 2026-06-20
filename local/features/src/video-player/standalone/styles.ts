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
  ".standalone-player-wrapper .custom-player:not(:fullscreen):not(.nc-fullscreen-player) { width: 100%; height: auto; }",
  ".standalone-player-wrapper .custom-player:not(:fullscreen):not(.nc-fullscreen-player) .video-container { position: relative; width: 100%; aspect-ratio: var(--video-aspect-ratio, 16 / 9); max-height: calc(100vh - 200px); }",
  
  ".nc-info-card { background: rgba(20, 24, 36, 0.88); border-radius: 16px; padding: 20px; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); display: flex; flex-direction: column; gap: 22px; }",
  ".nc-stat-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }",
  ".nc-stat-item { background: rgba(34, 40, 64, 0.82); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 0 0 1px rgba(142, 170, 255, 0.18); }",
  ".nc-stat-item__label { font-size: 12px; color: #8e98b8; letter-spacing: 0.02em; }",
  ".nc-stat-item__value { font-size: 18px; font-weight: 600; }",
  ".nc-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }",
  ".nc-tag { border-radius: 999px; background: rgba(102, 136, 220, 0.24); color: #d8e2ff; padding: 6px 14px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }",
  ".nc-tag__link { color: inherit; text-decoration: none; transition: color 0.15s ease; }",
  ".nc-tag__link:hover { color: #a8c4ff; text-decoration: underline; }",
  ".nc-tag__nicopedia { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; background: rgba(255, 255, 255, 0.12); color: #9cb8ff; transition: background 0.15s ease, color 0.15s ease; text-decoration: none; }",
  ".nc-tag__nicopedia:hover { background: rgba(255, 255, 255, 0.24); color: #d8e2ff; text-decoration: none; }",
  ".nc-tag__nicopedia-icon { display: block; }",
  ".nc-description { background: rgba(14, 16, 25, 0.9); border-radius: 16px; padding: 22px; line-height: 1.6; font-size: 14px; color: #c9d5f3; box-shadow: inset 0 0 0 1px rgba(112, 138, 210, 0.22); word-wrap: break-word; overflow-wrap: break-word; }",
  ".nc-description a { color: #7aa2ff; text-decoration: none; transition: color 0.15s ease; }",
  ".nc-description a:hover { color: #a8c4ff; text-decoration: underline; }",
  ".nc-description img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; }",
  ".nc-description p { margin: 0 0 1em 0; }",
  ".nc-description p:last-child { margin-bottom: 0; }",
  ".nc-owner { display: flex; gap: 12px; align-items: center; }",
  ".nc-owner img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(130, 170, 255, 0.3); }",
  ".nc-owner__info { display: flex; flex-direction: column; gap: 2px; }",
  ".nc-owner__link { font-size: 12px; color: #8ab2ff; }",
  ".nc-series { display: flex; flex-direction: column; gap: 8px; }",
  ".nc-series__item { padding: 10px 14px; border-radius: 12px; background: rgba(32, 38, 60, 0.72); display: flex; flex-direction: column; gap: 4px; }",
  ".nc-section-title { font-size: 16px; font-weight: 600; color: #d9e2ff; }",
  ".nc-empty { color: #7d86a8; font-size: 13px; }",

  /* 連続再生チェックボックス */
  ".nc-stat-item--auto-next { cursor: pointer; transition: box-shadow 0.15s ease; }",
  ".nc-stat-item--auto-next:hover { box-shadow: inset 0 0 0 1px rgba(142, 170, 255, 0.38); }",
  ".nc-stat-item--disabled { opacity: 0.5; cursor: default; }",
  ".nc-stat-item--disabled:hover { box-shadow: inset 0 0 0 1px rgba(142, 170, 255, 0.18); }",
  ".nc-stat-item__auto-next-label { display: flex; align-items: center; gap: 8px; cursor: inherit; }",
  ".nc-stat-item__auto-next-checkbox { width: 16px; height: 16px; accent-color: #7aa2ff; cursor: inherit; margin: 0; flex-shrink: 0; }",
  
  /* レスポンシブ対応 - タブレット */
  "@media (max-width: 1024px) { .nc-main { gap: 20px; } .standalone-player-wrapper { flex-direction: column; } .standalone-player-wrapper .comment-container { width: 100%; max-width: 100%; min-width: 100%; max-height: 400px; } .video-container { max-height: 60vh; } }",
  
  /* レスポンシブ対応 - モバイル */
  "@media (max-width: 768px) { .nc-standalone-page { padding: 16px 12px 32px; gap: 16px; max-width: 100vw; } .nc-header__title { font-size: 20px; } .nc-player-surface { padding: 12px; border-radius: 12px; } .standalone-player-wrapper .comment-container { max-height: 300px; padding: 8px; } .nc-stat-list { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); } }",
].join("\n");
