import { MINIMAL_DARK_THEME_TOKENS } from "@/common/visual-theme";

const STYLE_ID = "movie-info-dashboard-styles";

export const applyMovieInfoDashboardStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root { color-scheme:dark; ${MINIMAL_DARK_THEME_TOKENS} --mi-bg:var(--nc-bg); --mi-surface:var(--nc-surface); --mi-soft:var(--nc-surface-subtle); --mi-text:var(--nc-text); --mi-muted:var(--nc-muted); --mi-line:var(--nc-border); --mi-accent:var(--nc-primary); --mi-accent-soft:#243555; --mi-success:var(--nc-success); --mi-success-soft:#183427; --mi-danger:var(--nc-danger); --mi-danger-soft:var(--nc-danger-bg); --mi-shadow:none; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--mi-bg); color:var(--mi-text); font-family:var(--nc-font); }
    button,input { font:inherit; }
    button:focus-visible,input:focus-visible { outline:3px solid rgba(37,99,235,.28); outline-offset:2px; }
    #movie-info-app { padding-bottom:64px; }
    #common-header-container { width:100%; margin-bottom:28px; }
    .app-main { width:min(1180px,calc(100% - 40px)); margin:0 auto; display:grid; gap:22px; }
    .workspace-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; }
    .workspace-heading h1 { margin:2px 0 5px; font-size:clamp(1.65rem,3vw,2.35rem); letter-spacing:-.035em; }
    .workspace-heading p { margin:0; color:var(--mi-muted); }
    .workspace-eyebrow,.section-kicker { font-size:.72rem!important; letter-spacing:.14em; font-weight:700; color:var(--mi-accent)!important; }
    .source-progress { padding:7px 11px; border:1px solid var(--mi-line); background:var(--mi-surface); border-radius:999px; font-size:.85rem; font-weight:700; white-space:nowrap; }
    .video-selector { background:var(--mi-surface); border:1px solid var(--mi-line); border-radius:12px; padding:18px; box-shadow:var(--mi-shadow); }
    .video-input-row { display:grid; grid-template-columns:auto minmax(220px,1fr) auto auto; align-items:center; gap:10px; }
    .video-input-row label { font-weight:700; }
    .video-input-row input { width:100%; min-width:0; padding:10px 12px; border:1px solid #bac3ce; border-radius:7px; background:var(--mi-surface); color:var(--mi-text); }
    button { border:1px solid #bac3ce; border-radius:7px; padding:9px 13px; background:var(--mi-surface); color:var(--mi-text); font-weight:650; cursor:pointer; }
    button:hover:not(:disabled) { background:var(--mi-soft); border-color:#909baa; }
    button:disabled { opacity:.48; cursor:not-allowed; }
    [hidden] { display:none!important; }
    button.primary-action { background:var(--mi-accent); border-color:var(--mi-accent); color:var(--nc-primary-contrast); }
    button.primary-action:hover:not(:disabled) { background:var(--nc-primary-hover); border-color:var(--nc-primary-hover); }
    .query-feedback { display:flex; justify-content:space-between; gap:16px; margin-top:9px; }
    .video-hint,.global-status { margin:0; color:var(--mi-muted); font-size:.84rem; }
    .global-status { font-weight:650; color:var(--mi-text); text-align:right; }
    .source-tabs { display:flex; gap:3px; overflow-x:auto; border-bottom:1px solid var(--mi-line); scrollbar-width:thin; }
    .source-tab { flex:0 0 auto; border:0; border-bottom:3px solid transparent; border-radius:7px 7px 0 0; padding:10px 12px; background:transparent; }
    .source-tab.is-active { color:var(--mi-accent); border-bottom-color:var(--mi-accent); background:var(--mi-accent-soft); }
    .tab-state { display:inline-block; margin-left:5px; color:var(--mi-muted); font-size:.7rem; font-weight:600; }
    .tab-state[data-state='success'] { color:var(--mi-success); }
    .tab-state[data-state='error'] { color:var(--mi-danger); }
    .panel-workspace { min-height:360px; }
    .overview-panel,.info-panel { background:var(--mi-surface); border:1px solid var(--mi-line); border-radius:12px; box-shadow:var(--mi-shadow); overflow:hidden; position:relative; }
    .overview-panel { padding:26px; display:grid; gap:26px; }
    .overview-intro { display:flex; align-items:center; gap:16px; }
    .overview-intro h2,.panel-header h2 { margin:3px 0 4px; font-size:1.35rem; }
    .overview-intro p,.panel-header p { margin:0; color:var(--mi-muted); }
    .overview-icon { width:80px; aspect-ratio:16/9; display:grid; place-items:center; flex:0 0 auto; background:var(--mi-soft); color:var(--mi-text); border:1px solid var(--mi-line); border-radius:8px; }
    .source-status-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
    .source-status-grid button { min-height:92px; display:flex; flex-direction:column; justify-content:flex-end; align-items:flex-start; gap:4px; text-align:left; border-top:4px solid var(--mi-line); }
    .source-status-grid button[data-state='success'] { background:var(--mi-success-soft); border-top-color:var(--mi-success); }
    .source-status-grid button[data-state='error'] { background:var(--mi-danger-soft); border-top-color:var(--mi-danger); }
    .source-status-grid strong { font-size:.82rem; }
    .panel-header { padding:22px 24px; border-bottom:1px solid var(--mi-line); }
    .panel-header h2 span { color:var(--mi-muted); font-size:.82rem; font-weight:500; }
    .panel-layout { display:grid; grid-template-columns:minmax(0,1fr) 210px; min-height:300px; }
    .panel-body { padding:24px; display:flex; flex-direction:column; gap:18px; min-width:0; }
    .panel-actions { padding:24px 18px; border-left:1px solid var(--mi-line); background:var(--mi-soft); display:flex; flex-direction:column; gap:9px; }
    .panel-actions h3 { margin:0 0 5px; font-size:.92rem; }
    .panel-actions button { width:100%; text-align:left; }
    .show-json-btn { order:-1; background:var(--mi-accent); border-color:var(--mi-accent); color:var(--nc-primary-contrast); }
    .panel-status { margin:0; padding:8px 11px; border-left:4px solid var(--mi-line); background:var(--mi-soft); font-weight:650; font-size:.88rem; }
    .panel-status[data-state='loading'] { border-color:var(--mi-accent); background:var(--mi-accent-soft); color:var(--mi-accent); }
    .panel-status[data-state='success'] { border-color:var(--mi-success); background:var(--mi-success-soft); color:var(--mi-success); }
    .panel-status[data-state='error'] { border-color:var(--mi-danger); background:var(--mi-danger-soft); color:var(--mi-danger); }
    .summary-container { display:flex; flex-direction:column; gap:17px; }
    .summary-grid { margin:0; display:grid; grid-template-columns:minmax(120px,max-content) 1fr; gap:0; border-top:1px solid var(--mi-line); }
    .summary-grid dt,.summary-grid dd { margin:0; padding:9px 4px; border-bottom:1px solid var(--mi-line); overflow-wrap:anywhere; }
    .summary-grid dt { color:var(--mi-muted); font-weight:600; }
    .summary-grid dd { color:var(--mi-text); }
    .tag-list { display:flex; flex-wrap:wrap; gap:6px; }
    .tag-chip { padding:4px 9px; border-radius:999px; background:var(--mi-accent-soft); color:var(--mi-accent); font-size:.8rem; }
    .video-meta { display:flex; flex-direction:column; gap:6px; color:var(--mi-muted); overflow-wrap:anywhere; }
    .movie-description { display:grid; gap:8px; margin-top:5px; color:var(--mi-text); }
    .movie-description h3 { margin:0; font-size:.88rem; }
    .movie-description-content { padding:14px 16px; border-left:3px solid var(--mi-line); background:var(--mi-soft); line-height:1.75; overflow-wrap:anywhere; }
    .movie-description-content > :first-child { margin-top:0; }
    .movie-description-content > :last-child { margin-bottom:0; }
    .movie-description-content a { color:var(--mi-accent); text-decoration:underline; text-underline-offset:2px; }
    .visually-hidden { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .panel-spinner-overlay { position:absolute; inset:0; background:rgba(255,255,255,.88); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; z-index:10; opacity:0; visibility:hidden; transition:.2s; }
    .panel-spinner-overlay.visible { opacity:1; visibility:visible; }
    .panel-spinner { width:42px; height:42px; border:4px solid var(--mi-line); border-top-color:var(--mi-accent); border-radius:50%; animation:spin .8s linear infinite; }
    .panel-spinner-text { font-weight:700; color:var(--mi-accent); }
    .json-modal-overlay,.error-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.65); display:flex; align-items:center; justify-content:center; z-index:1100; opacity:0; visibility:hidden; transition:.2s; padding:16px; }
    .json-modal-overlay.visible,.error-modal-overlay.visible { opacity:1; visibility:visible; }
    .json-modal,.error-modal { background:var(--mi-surface); border-radius:12px; box-shadow:0 24px 56px rgba(15,23,42,.28); width:min(900px,100%); max-height:88vh; display:flex; flex-direction:column; overflow:hidden; }
    .json-modal-header,.error-modal-header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid var(--mi-line); background:var(--mi-soft); }
    .json-modal-header h3,.error-modal-header h3 { margin:0; font-size:1.05rem; }
    .json-modal-close,.error-modal-close { width:34px; height:34px; padding:0; background:var(--mi-danger); border-color:var(--mi-danger); color:#fff; }
    .json-modal-body,.error-modal-body { overflow:auto; padding:18px 20px; }
    .json-viewer { margin:0; max-height:65vh; overflow:auto; padding:16px; border-radius:8px; background:#111827; color:#f8fafc; font:12px/1.6 Consolas,monospace; white-space:pre-wrap; word-break:break-word; }
    .error-modal-body { display:flex; flex-direction:column; gap:13px; }
    .error-modal-lead,.error-modal-message,.error-modal-action { margin:0; line-height:1.6; }
    .error-modal-video-id,.error-modal-item { padding:11px 13px; border:1px solid var(--mi-line); border-radius:8px; background:var(--mi-soft); }
    .error-modal-item { border-left:4px solid var(--mi-danger); }
    .error-modal-item h4 { margin:0 0 7px; }
    .error-modal-action { margin-top:7px; color:var(--mi-muted); }
    .error-modal-list { display:flex; flex-direction:column; gap:9px; }
    .error-modal-footer { display:flex; justify-content:flex-end; padding:13px 20px; border-top:1px solid var(--mi-line); }
    @media (max-width:800px) { .video-input-row { grid-template-columns:1fr 1fr; } .video-input-row label,.video-input-row input { grid-column:1/-1; } .source-status-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .panel-layout { grid-template-columns:1fr; } .panel-actions { border-left:0; border-top:1px solid var(--mi-line); display:grid; grid-template-columns:repeat(3,1fr); } .panel-actions h3 { grid-column:1/-1; } }
    @media (max-width:520px) { .app-main { width:min(100% - 24px,1180px); } .workspace-heading { align-items:flex-start; flex-direction:column; } .video-input-row { display:flex; flex-direction:column; align-items:stretch; } .query-feedback { flex-direction:column; } .global-status { text-align:left; } .overview-panel,.panel-header,.panel-body { padding:18px; } .overview-intro { align-items:flex-start; } .overview-icon { width:58px; } .source-status-grid { grid-template-columns:1fr; } .source-status-grid button { min-height:68px; } .panel-actions { grid-template-columns:1fr; } .summary-grid { grid-template-columns:1fr; } .summary-grid dt { padding-bottom:2px; border-bottom:0; } .summary-grid dd { padding-top:2px; } }
    @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
  `;
  document.head.appendChild(style);
};
