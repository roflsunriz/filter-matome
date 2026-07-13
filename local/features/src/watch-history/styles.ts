import { materialIconsStyles } from "@/common/material-icons";
import { MINIMAL_DARK_THEME_TOKENS } from "@/common/visual-theme";

const palette = `
  ${MINIMAL_DARK_THEME_TOKENS}
  --wh-bg: var(--nc-bg);
  --wh-surface: var(--nc-surface);
  --wh-subtle: var(--nc-surface-subtle);
  --wh-border: var(--nc-border);
  --wh-text: var(--nc-text);
  --wh-muted: var(--nc-muted);
  --wh-primary: var(--nc-primary);
  --wh-primary-hover: var(--nc-primary-hover);
  --wh-danger: #f07178;
  --wh-warning: #e6b566;
  --wh-success: #72c69c;
  --wh-info: #75b9d6;
`;

/** watch-history 全体のスタイルを動的に適用する。 */
export function applyWatchHistoryStyles(): void {
  if (document.getElementById("watch-history-styles")) return;
  const style = document.createElement("style");
  style.id = "watch-history-styles";
  style.textContent = `
:root { color-scheme: dark; ${palette} }
${materialIconsStyles}
*, *::before, *::after { box-sizing: border-box; }
html, body { min-height: 100%; margin: 0; background: var(--wh-bg); color: var(--wh-text); }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.5; }
button, input, select, textarea { font: inherit; }
button, summary, [role="button"] { -webkit-tap-highlight-color: transparent; }
button { color: inherit; }
a { color: var(--wh-primary); }
.hidden { display: none !important; }
.main-content { width: min(100%, 1600px); min-height: 100vh; margin: 0 auto; padding: 20px clamp(12px, 2vw, 28px) 40px; }

/* navigation */
.tab-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--wh-border); }
.tab-buttons { display: flex; min-width: 0; gap: 4px; overflow-x: auto; }
.tab-btn { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; min-height: 46px; padding: 0 16px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--wh-muted); cursor: pointer; }
.tab-btn:hover { color: var(--wh-text); background: var(--wh-subtle); }
.tab-btn.active { color: var(--wh-primary); border-bottom-color: var(--wh-primary); }
.management-menu { position: relative; margin-left: auto; }
.management-menu > summary { list-style: none; }
.management-menu > summary::-webkit-details-marker { display: none; }
.tab-actions { position: absolute; z-index: 20; top: calc(100% + 8px); right: 0; display: grid; gap: 4px; width: max-content; min-width: 210px; padding: 8px; border: 1px solid var(--wh-border); border-radius: 10px; background: var(--wh-surface); box-shadow: 0 14px 32px rgb(0 0 0 / 35%); }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* controls */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; padding: 8px 13px; border: 1px solid transparent; border-radius: 8px; background: var(--wh-subtle); color: var(--wh-text); font-weight: 650; line-height: 1.2; cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }
.btn:hover { border-color: var(--wh-border); background: var(--wh-subtle); }
.btn-primary { background: var(--wh-primary); color: #0d1b36; }
.btn-primary:hover { background: var(--wh-primary-hover); }
.btn-secondary { border-color: var(--wh-border); background: var(--wh-subtle); }
.btn-danger { border-color: color-mix(in srgb, var(--wh-danger) 45%, var(--wh-border)); background: color-mix(in srgb, var(--wh-danger) 14%, var(--wh-surface)); color: #ffb9bd; }
.btn-warning { border-color: color-mix(in srgb, var(--wh-warning) 45%, var(--wh-border)); background: color-mix(in srgb, var(--wh-warning) 14%, var(--wh-surface)); color: #f7d79e; }
.btn-info { background: var(--wh-info); color: #0d1b36; }
.btn-sm { min-height: 32px; padding: 5px 10px; font-size: .85rem; }
.btn-icon { width: 38px; padding: 0; }
.btn-full { width: 100%; }
.btn:disabled { cursor: not-allowed; opacity: .5; }
.material-icon {
  flex: 0 0 auto;
  color: currentColor;
  filter: brightness(0) saturate(100%) invert(100%);
}
input, select, textarea, .search-input, .filter-select, .filter-date, .form-select, .delete-condition-input, .memo-textarea { min-width: 0; border: 1px solid var(--wh-border); border-radius: 8px; outline: 0; background: var(--wh-bg); color: var(--wh-text); }
input, select, .search-input, .filter-select, .filter-date, .form-select, .delete-condition-input { min-height: 40px; padding: 8px 11px; }
textarea, .memo-textarea { width: 100%; min-height: 150px; padding: 11px; resize: vertical; }
::placeholder { color: var(--wh-muted); }
:where(button, input, select, textarea, summary, [tabindex]):focus-visible { outline: 2px solid var(--wh-primary); outline-offset: 2px; }

/* history */
.history-layout { display: grid; grid-template-columns: minmax(220px, 270px) minmax(0, 1fr); gap: clamp(18px, 2.5vw, 32px); align-items: start; }
.sidebar { position: sticky; top: 12px; max-height: calc(100vh - 24px); padding-right: 16px; overflow-y: auto; border-right: 1px solid var(--wh-border); }
.sidebar > * + * { margin-top: 22px; }
.section-title { margin: 0 0 8px; color: var(--wh-muted); font-size: .77rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
summary.section-title { cursor: pointer; }
.library-link, .sort-btn { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 38px; padding: 7px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--wh-muted); text-align: left; cursor: pointer; }
.library-link:hover, .sort-btn:hover { background: var(--wh-subtle); color: var(--wh-text); }
.library-link.active, .sort-btn.active { background: var(--wh-subtle); color: var(--wh-primary); }
.sort-controls, .filter-controls { display: grid; gap: 7px; }
.sort-item { min-width: 0; }
.sort-btn { justify-content: flex-start; }
.sort-order-icon { margin-left: auto; }
.advanced-sort-menu { margin-top: 7px; }
.advanced-sort-menu > summary { padding: 5px 9px; color: var(--wh-muted); cursor: pointer; font-size: .86rem; }
.filter-section[open] > .filter-controls { margin-top: 10px; }
.filter-item { display: grid; gap: 5px; }
.filter-checkbox-item, .form-checkbox, .setting-label { display: flex; align-items: center; gap: 9px; }
.filter-label, .form-label { color: var(--wh-muted); font-size: .82rem; }
.filter-checkbox, .setting-checkbox { width: 17px; height: 17px; accent-color: var(--wh-primary); }
.date-range { display: grid; gap: 6px; }
.date-range-row { display: flex; align-items: center; gap: 7px; }
.date-range-row > input { flex: 1; }
.sidebar-management-link { padding-top: 18px; border-top: 1px solid var(--wh-border); }
.stats-summary { display: grid; gap: 5px; }
.stats-item { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; }
.stats-label { color: var(--wh-muted); font-size: .82rem; }
.stats-value { font-weight: 700; }
.content-area { min-width: 0; }
.history-query-bar { margin-bottom: 14px; }
.search-input-container { position: relative; display: flex; align-items: center; }
.search-input-container .search-icon { position: absolute; left: 12px; color: var(--wh-muted); pointer-events: none; }
.search-input { width: 100%; padding-left: 42px; padding-right: 42px; background: var(--wh-surface); }
.search-clear { position: absolute; right: 5px; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 6px; background: transparent; color: var(--wh-muted); cursor: pointer; }
.search-clear:hover { background: var(--wh-subtle); color: var(--wh-text); }
.content-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; margin-bottom: 3px; padding: 0 3px 10px; border-bottom: 1px solid var(--wh-border); }
.content-info { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.content-count, .series-count, .series-alert-count { color: var(--wh-muted); font-size: .9rem; }
.active-filter-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.filter-chip, .tag, .latest-badge, .current-badge, .persistence-badge, .alert-status { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: var(--wh-subtle); color: var(--wh-muted); font-size: .76rem; }
.history-list { min-width: 0; }
.history-item { display: grid; grid-template-columns: 176px minmax(0, 1fr); gap: 16px; padding: 18px 4px; border-bottom: 1px solid var(--wh-border); cursor: pointer; }
.history-item:hover { background: color-mix(in srgb, var(--wh-subtle) 48%, transparent); }
.history-thumbnail { position: relative; align-self: start; overflow: hidden; aspect-ratio: 16 / 9; border-radius: 8px; background: var(--wh-subtle); }
.thumbnail-image { display: block; width: 100%; height: 100%; object-fit: cover; }
.video-duration { position: absolute; right: 6px; bottom: 6px; padding: 2px 6px; border-radius: 4px; background: rgb(0 0 0 / 78%); color: white; font-size: .73rem; }
.history-content { min-width: 0; }
.history-header { display: flex; align-items: start; gap: 12px; }
.history-title { flex: 1; min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 1rem; line-height: 1.42; }
.history-actions { display: flex; gap: 6px; }
.history-meta, .history-stats { display: flex; flex-wrap: wrap; gap: 7px 16px; margin-top: 8px; color: var(--wh-muted); font-size: .82rem; }
.history-progress { display: flex; align-items: center; gap: 9px; margin-top: 12px; }
.progress-bar, .video-progress-bar, .storage-usage-bar, .migration-progress-bar { width: 100%; height: 6px; overflow: hidden; border-radius: 999px; background: var(--wh-subtle); }
.progress-bar.small { height: 4px; }
.progress-fill, .storage-usage-fill, .migration-progress-fill { height: 100%; border-radius: inherit; background: var(--wh-primary); }
.progress-text { flex: 0 0 auto; color: var(--wh-muted); font-size: .76rem; }
.history-primary-action { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.history-progress-label { color: var(--wh-muted); font-size: .82rem; }
.stat-item { display: inline-flex; align-items: center; gap: 5px; }
.history-memo { margin-top: 10px; padding-left: 10px; border-left: 2px solid var(--wh-border); color: var(--wh-muted); font-size: .84rem; }
.watch-logs-accordion { margin-top: 10px; }
.watch-logs-content { display: none; padding: 10px 0 0; }
.watch-logs-accordion.expanded .watch-logs-content { display: block; }
.watch-logs-list { display: grid; gap: 0; border-top: 1px solid var(--wh-border); }
.watch-log-item { padding: 10px 4px; border-bottom: 1px solid var(--wh-border); }
.watch-log-header, .watch-log-date, .watch-log-completion, .watch-log-progress { display: flex; align-items: center; gap: 8px; }
.watch-log-header { justify-content: space-between; }
.watch-log-progress { margin-top: 7px; }
.current-session-note, .watch-logs-empty { color: var(--wh-muted); font-size: .8rem; }

/* shared states */
.loading, .empty-state { display: grid; place-items: center; min-height: 240px; color: var(--wh-muted); text-align: center; }
.loading-spinner { width: 30px; height: 30px; border: 3px solid var(--wh-border); border-top-color: var(--wh-primary); border-radius: 50%; animation: wh-spin .8s linear infinite; }
@keyframes wh-spin { to { transform: rotate(360deg); } }
.empty-icon { margin-bottom: 8px; font-size: 2rem; }

/* statistics */
.stats-layout { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.stats-card { min-width: 0; padding: 18px; border: 1px solid var(--wh-border); border-radius: 10px; background: var(--wh-surface); }
.stats-card-title { margin: 0 0 14px; font-size: .95rem; }
.stats-card-content { min-width: 0; }
.stats-metric { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--wh-border); }
.stats-metric:last-child { border-bottom: 0; }
.stats-metric-label { color: var(--wh-muted); }
.stats-metric-value { font-size: 1.05rem; font-weight: 750; text-align: right; }
.stats-chart { display: block; width: 100%; height: 250px; }
.creator-stat-item, .favorite-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--wh-border); }
.creator-stat-item:last-child, .favorite-item:last-child { border-bottom: 0; }
.creator-info { display: flex; flex: 1; min-width: 0; justify-content: space-between; gap: 8px; }
.creator-name, .favorite-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.creator-count, .creator-time, .favorite-score { color: var(--wh-muted); font-size: .82rem; }
.favorite-rank { width: 24px; color: var(--wh-primary); font-weight: 750; text-align: center; }
.favorite-thumb { width: 72px; aspect-ratio: 16 / 9; border-radius: 6px; object-fit: cover; background: var(--wh-subtle); }
.favorite-title { flex: 1; }
.tag-cloud { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.tag-cloud-item {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--wh-subtle);
  color: var(--wh-text);
  line-height: 1.2;
  cursor: pointer;
}
.tag-cloud-item:hover { background: color-mix(in srgb, var(--wh-subtle) 82%, white); }
.tag-cloud .tag, .tag-item { cursor: pointer; }
.tag-size-1 { font-size: .76rem; } .tag-size-2 { font-size: .88rem; } .tag-size-3 { font-size: 1rem; } .tag-size-4 { font-size: 1.12rem; } .tag-size-5 { font-size: 1.24rem; }

/* series: the list itself is deliberately flat */
${seriesStyles}

/* modals and management */
.modal { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 18px; }
.modal-overlay { position: absolute; inset: 0; background: rgb(5 8 12 / 76%); }
.modal-content { position: relative; display: flex; flex-direction: column; width: min(100%, 620px); max-height: min(88vh, 900px); overflow: hidden; border: 1px solid var(--wh-border); border-radius: 12px; background: var(--wh-surface); box-shadow: 0 24px 70px rgb(0 0 0 / 48%); }
.modal-content.large { width: min(100%, 980px); }
.modal-header { display: flex; align-items: center; gap: 12px; padding: 15px 18px; border-bottom: 1px solid var(--wh-border); }
.modal-title { flex: 1; margin: 0; font-size: 1.05rem; }
.modal-close, .toast-close { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 7px; background: transparent; color: var(--wh-muted); cursor: pointer; }
.modal-close:hover, .toast-close:hover { background: var(--wh-subtle); color: var(--wh-text); }
.modal-body { padding: 18px; overflow: auto; }
.modal-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 9px; margin-top: 18px; }
.form-group + .form-group { margin-top: 14px; }
.form-label { display: block; margin-bottom: 5px; }
.form-select { width: 100%; }
.video-info { display: grid; gap: 14px; }
.video-info-header { display: grid; grid-template-columns: minmax(180px, 38%) 1fr; gap: 18px; }
.video-thumbnail { position: relative; }
.video-thumbnail img { display: block; width: 100%; border-radius: 8px; background: var(--wh-subtle); }
.video-details, .series-detail-stats { display: grid; align-content: start; }
.info-row { display: grid; grid-template-columns: minmax(105px, 30%) 1fr; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--wh-border); }
.info-label { color: var(--wh-muted); }
.info-value { min-width: 0; overflow-wrap: anywhere; }
.history-delete-layout { display: grid; gap: 20px; }
.history-delete-panel + .history-delete-panel { padding-top: 18px; border-top: 1px solid var(--wh-border); }
.history-delete-heading { margin: 0 0 8px; font-size: .95rem; }
.history-delete-note { color: var(--wh-muted); }
.history-delete-condition-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.history-delete-field { display: grid; gap: 5px; color: var(--wh-muted); font-size: .82rem; }
.history-delete-select, .delete-condition-input { width: 100%; }
.delete-dry-run-console { min-height: 110px; max-height: 260px; padding: 12px; overflow: auto; border: 1px solid var(--wh-border); border-radius: 8px; background: var(--wh-bg); color: var(--wh-muted); font-family: ui-monospace, monospace; font-size: .8rem; white-space: pre-wrap; }
.db-management-section + .db-management-section { margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--wh-border); }
.db-management-section h3 { margin: 0 0 12px; font-size: .98rem; }
.persistence-info, .migration-progress-info, .backup-item, .setting-item { display: flex; align-items: center; gap: 10px; }
.persistence-info, .backup-item, .setting-item { padding: 10px 0; border-bottom: 1px solid var(--wh-border); }
.persistence-details, .backup-info { flex: 1; min-width: 0; }
.persistence-actions, .migration-actions, .backup-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.storage-usage, .migration-progress-container { margin-top: 12px; }
.storage-usage-text, .migration-progress-text, .backup-version, .setting-description { color: var(--wh-muted); font-size: .8rem; }
.migration-current-task { flex: 1; }
.backup-list-header { margin-bottom: 7px; color: var(--wh-muted); font-size: .82rem; }
.backup-actions { margin: 0 0 0 auto; }
.backup-list-empty { padding: 24px; color: var(--wh-muted); text-align: center; }
.setting-item { align-items: flex-start; }
.setting-label { flex: 1; color: var(--wh-text); }
/* toasts */
.toast-container { position: fixed; z-index: 1500; right: 18px; bottom: 18px; display: grid; gap: 8px; width: min(calc(100vw - 36px), 390px); }
.toast { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px solid var(--wh-border); border-left: 3px solid var(--wh-primary); border-radius: 9px; background: var(--wh-surface); box-shadow: 0 10px 30px rgb(0 0 0 / 35%); }
.toast.success { border-left-color: var(--wh-success); } .toast.error { border-left-color: var(--wh-danger); } .toast.warning { border-left-color: var(--wh-warning); }
.toast-content { display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; }
.toast-message { flex: 1; overflow-wrap: anywhere; }

@media (max-width: 900px) {
  .main-content { padding-inline: 12px; }
  .history-layout { grid-template-columns: 1fr; }
  .sidebar { position: static; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; padding: 14px; border: 1px solid var(--wh-border); border-radius: 10px; background: var(--wh-surface); }
  .sidebar > * + * { margin-top: 0; }
  .stats-summary, .sidebar-management-link { display: none; }
  .stats-grid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .main-content { padding-top: 10px; }
  .tab-nav { align-items: stretch; flex-direction: column; padding-bottom: 10px; }
  .management-menu { margin-left: 0; align-self: flex-end; }
  .tab-btn { padding-inline: 11px; }
  .sidebar { grid-template-columns: 1fr; }
  .history-item { grid-template-columns: 1fr; padding-block: 15px; }
  .history-thumbnail { width: min(100%, 360px); }
  .history-primary-action, .content-header, .series-header, .series-alert-header { align-items: stretch; flex-direction: column; }
  .history-resume-btn { width: 100%; }
  .modal { padding: 8px; }
  .modal-content { max-height: 94vh; }
  .modal-body { padding: 14px; }
  .history-delete-condition-grid, .video-info-header, .series-detail-grid { grid-template-columns: 1fr; }
  .info-row { grid-template-columns: 1fr; gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
`;
  document.head.appendChild(style);
}

/** 動的に適用したスタイルを取り除く。 */
export function removeWatchHistoryStyles(): void {
  document.getElementById("watch-history-styles")?.remove();
}

/** シリーズ画面用CSS。外側と各行の多重カード化を避ける。 */
const seriesStyles = `
.series-layout, .series-alert-layout { max-width: 1200px; margin: 0 auto; }
.series-header, .series-alert-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--wh-border); }
.series-search { flex: 1; max-width: 620px; }
.series-filters, .series-alert-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.series-content-area, .series-alert-content-area { margin-top: 10px; }
.series-count, .series-alert-count { padding: 5px 3px 10px; }
.series-alert-count { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.series-alert-extension-status { display: inline-flex; align-items: center; gap: 6px; font-size: .8rem; }
.series-alert-extension-status::before { width: 8px; height: 8px; border-radius: 50%; background: var(--wh-danger); content: ""; }
.series-alert-extension-status[data-state="success"]::before { background: var(--wh-success); }
.series-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 28px;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.series-alert-list { border: 0; border-radius: 0; background: transparent; }
.series-item, .series-alert-item { padding: 18px 4px; border: 0; border-bottom: 1px solid var(--wh-border); border-radius: 0; background: transparent; }
.series-item { background: var(--wh-surface); }
.series-item { cursor: pointer; }
.series-item:hover, .series-alert-item:hover { background: color-mix(in srgb, var(--wh-subtle) 48%, transparent); }
.series-content, .alert-content { min-width: 0; }
.series-item .series-header, .alert-header { display: flex; align-items: start; justify-content: space-between; gap: 14px; padding: 0; border: 0; }
.series-title, .alert-title { min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 1rem; }
.series-progress { display: flex; align-items: center; gap: 9px; width: min(42%, 330px); }
.series-progress .progress-bar { background: var(--wh-subtle); }
.series-meta, .alert-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 11px; color: var(--wh-muted); font-size: .83rem; }
.series-stat, .alert-stat { display: inline-flex; align-items: center; gap: 5px; }
.series-last-video, .alert-last-video { display: flex; align-items: center; gap: 7px; min-width: 0; margin-top: 10px; color: var(--wh-muted); font-size: .84rem; }
.last-video-label { flex: 0 0 auto; }
.last-video-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.series-last-play-btn { display: grid; flex: 0 0 auto; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: var(--wh-subtle); color: var(--wh-primary); cursor: pointer; }
.series-last-play-btn:hover { background: var(--wh-primary); color: #0d1b36; }
.alert-status.enabled { color: var(--wh-success); } .alert-status.disabled { color: var(--wh-muted); } .overdue { color: var(--wh-warning); }
.alert-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; margin-top: 12px; }
.series-detail-grid { display: grid; grid-template-columns: minmax(220px, 32%) 1fr; gap: 20px; }
.series-videos-header { margin-bottom: 8px; }
.series-videos-list { border-top: 1px solid var(--wh-border); }
.series-video-item { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--wh-border); cursor: pointer; }
.series-video-item:hover { background: color-mix(in srgb, var(--wh-subtle) 48%, transparent); }
.series-video-item .video-thumbnail { position: relative; overflow: hidden; aspect-ratio: 16 / 9; border-radius: 7px; background: var(--wh-subtle); }
.series-video-item .video-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
.video-content { min-width: 0; }
.video-title { margin: 0; overflow-wrap: anywhere; font-size: .9rem; }
.video-meta { display: flex; gap: 10px; margin-top: 7px; color: var(--wh-muted); font-size: .8rem; }
.video-progress-bar { margin-top: 9px; }
.series-videos-empty { padding: 22px; color: var(--wh-muted); text-align: center; }
.series-navigation { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--wh-border); }
.series-nav-header { margin-bottom: 8px; color: var(--wh-muted); font-size: .82rem; }
.series-nav-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.series-nav-btn { min-height: 36px; padding: 7px 11px; border: 1px solid var(--wh-border); border-radius: 7px; background: var(--wh-subtle); color: var(--wh-text); cursor: pointer; }
.series-nav-btn:hover { border-color: var(--wh-primary); }
@media (max-width: 620px) {
  .series-item .series-header, .alert-header { flex-direction: column; }
  .series-progress { width: 100%; }
  .series-video-item { grid-template-columns: 110px minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .series-list { grid-template-columns: minmax(0, 1fr); }
}
`;

export { seriesStyles };
