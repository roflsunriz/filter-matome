const STYLE_ID = "movie-info-dashboard-styles";

export const applyMovieInfoDashboardStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "* { box-sizing: border-box; }",
    "body { font-family: 'Segoe UI', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; background: #f3f4f6; color: #1f2933; margin: 0; padding: 0; }",
    "#movie-info-app { max-width: 1240px; margin: 0 auto; padding: 32px 24px 64px; }",
    "#common-header-container { margin-bottom: 16px; }",
    ".app-main { display: flex; flex-direction: column; gap: 24px; }",
    ".video-selector { background: #ffffff; border-radius: 14px; padding: 20px 24px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08); z-index: 5; }",
    ".video-selector h1 { margin: 0 0 12px 0; font-size: 1.6rem; font-weight: 600; }",
    ".video-input-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }",
    ".video-input-row label { font-weight: 600; }",
    ".video-input-row input { flex: 1; min-width: 220px; padding: 10px 12px; border-radius: 8px; border: 1px solid #d2d6dc; font-size: 1rem; }",
    ".video-input-row button { background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; transition: background 0.2s ease; }",
    ".video-input-row button:hover { background: #1d4ed8; }",
    ".video-input-row button:disabled { background: #94a3b8; cursor: not-allowed; }",
    ".video-hint { margin: 8px 0 0 0; font-size: 0.88rem; color: #475569; }",
    ".global-status { font-size: 0.9rem; color: #1f2933; margin-top: 8px; }",
    ".panel-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }",
    "@media (min-width: 680px) { #panel-comments { grid-column: span 2; } }",
    ".info-panel { background: #ffffff; border-radius: 14px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); display: flex; flex-direction: column; min-height: 280px; overflow: hidden; }",
    ".panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }",
    ".panel-header h2 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #0f172a; }",
    ".panel-actions { display: flex; gap: 8px; align-items: center; }",
    ".panel-actions button { border: none; border-radius: 6px; padding: 8px 14px; background: #1e293b; color: #ffffff; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.2s ease; }",
    ".panel-actions button.secondary { background: #475569; }",
    ".panel-actions button:hover { background: #111827; }",
    ".panel-actions button:disabled { background: #94a3b8; cursor: not-allowed; }",
    ".panel-body { padding: 18px 20px 22px 20px; display: flex; flex-direction: column; gap: 14px; }",
    ".panel-status { font-weight: 600; font-size: 0.92rem; border-radius: 6px; padding: 6px 10px; background: #e2e8f0; color: #1f2933; }",
    ".panel-status[data-state='loading'] { background: #dbeafe; color: #1d4ed8; }",
    ".panel-status[data-state='success'] { background: #dcfce7; color: #166534; }",
    ".panel-status[data-state='error'] { background: #fee2e2; color: #b91c1c; }",
    ".panel-status[data-state='idle'] { background: #e2e8f0; color: #1f2933; }",
    ".summary-container { display: flex; flex-direction: column; gap: 16px; }",
    ".summary-grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 0.94rem; }",
    ".summary-grid dt { font-weight: 600; color: #1e293b; }",
    ".summary-grid dd { margin: 0; color: #334155; }",
    ".tag-list { display: flex; flex-wrap: wrap; gap: 6px; }",
    ".tag-chip { background: #eef2ff; color: #312e81; padding: 4px 10px; border-radius: 999px; font-size: 0.82rem; border: 1px solid #c7d2fe; }",
    "details[data-role='raw'] { border-top: 1px solid #e2e8f0; padding-top: 10px; }",
    "details[data-role='raw'] summary { cursor: pointer; font-weight: 600; color: #2563eb; }",
    ".json-viewer { background: #0f172a; color: #f8fafc; font-family: 'SFMono-Regular', Consolas, Monaco, 'Courier New', monospace; font-size: 0.78rem; line-height: 1.6; border-radius: 10px; padding: 14px; margin-top: 12px; max-height: 320px; overflow: auto; white-space: pre-wrap; word-break: break-word; }",
    ".video-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem; color: #334155; }",
    ".video-meta strong { color: #1e293b; }"
  ].join("\n");
  document.head.appendChild(style);
};
