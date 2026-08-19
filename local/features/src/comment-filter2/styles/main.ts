import { MINIMAL_DARK_THEME_TOKENS } from "@/common/visual-theme";

/** 共通の色規約に合わせた comment-filter2 UI。 */
export const CommentFilter2MainStyles = `
:host {
  ${MINIMAL_DARK_THEME_TOKENS}
  --cf2-bg: var(--nc-bg);
  --cf2-surface: var(--nc-surface);
  --cf2-subtle: var(--nc-surface-subtle);
  --cf2-border: var(--nc-border);
  --cf2-text: var(--nc-text);
  --cf2-muted: var(--nc-muted);
  --cf2-primary: var(--nc-primary);
  --cf2-primary-strong: var(--nc-primary-hover);
  --cf2-danger: #f07b83;
  --cf2-warning: #e5b96f;
  --cf2-success: #65c99b;
  color-scheme: dark;
}

.cf2-background-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(17, 21, 27, 0.82);
}

#cf2-shadow-host {
  position: fixed;
  inset: 0;
  z-index: 10001;
  pointer-events: none;
}

*, *::before, *::after { box-sizing: border-box; }
button, input, textarea, select { font: inherit; }
button { color: inherit; }
svg {
  width: 1.25em;
  height: 1.25em;
  color: var(--cf2-text);
  fill: currentColor;
  flex: none;
}
.material-icon,
.cf2-icon-white {
  filter: brightness(0) saturate(100%) invert(100%);
}

.cf2-container {
  --cf2-modal-inset-y: clamp(12px, 3vh, 32px);
  position: fixed;
  inset: var(--cf2-modal-inset-y) clamp(12px, 3vw, 48px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: auto;
  height: calc(100% - 2 * var(--cf2-modal-inset-y));
  max-width: 1440px;
  max-height: 1000px;
  margin: auto;
  overflow: hidden;
  color: var(--cf2-text);
  background: var(--cf2-surface);
  border: 1px solid var(--cf2-border);
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  font-family: Inter, "Noto Sans JP", system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  pointer-events: auto;
}
/* ui-manager の表示状態用 inline display:block をレイアウト方式へ戻す。 */
.cf2-container[style*="display: block"] {
  display: grid !important;
}

.cf2-header {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  border-bottom: 1px solid var(--cf2-border);
  flex: none;
}
.cf2-title, .cf2-title a { display: flex; align-items: center; gap: 10px; }
.cf2-title-text { font-weight: 700; letter-spacing: .01em; }
.cf2-title a { color: var(--cf2-muted); text-decoration: none; }
.cf2-title a:hover { color: var(--cf2-primary); }
.cf2-close-btn {
  display: grid; place-items: center; width: 34px; height: 34px; padding: 0;
  color: var(--cf2-muted); background: transparent; border: 0; border-radius: 7px; cursor: pointer;
}
.cf2-close-btn:hover { color: var(--cf2-text); background: var(--cf2-subtle); }

.cf2-content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.cf2-workspace {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.cf2-sidebar {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 10px;
  min-height: 0; overflow-y: auto;
  background: var(--cf2-bg); border-right: 1px solid var(--cf2-border);
  scrollbar-color: var(--cf2-border) transparent;
}
.cf2-sidebar-item {
  display: flex; align-items: center; gap: 10px; width: 100%; min-height: 40px; padding: 8px 11px;
  color: var(--cf2-muted); background: transparent; border: 0; border-radius: 7px; text-align: left; cursor: pointer;
}
.cf2-sidebar-item:hover { color: var(--cf2-text); background: var(--cf2-subtle); }
.cf2-sidebar-item.active { color: var(--cf2-text); background: var(--cf2-subtle); box-shadow: inset 3px 0 var(--cf2-primary); }
.cf2-workspace-main { min-width: 0; min-height: 0; overflow: auto; padding: clamp(18px, 2.5vw, 32px); scrollbar-color: var(--cf2-border) transparent; }

h2, h3, p { margin-top: 0; }
h2 { margin-bottom: 4px; font-size: 1.35rem; line-height: 1.3; }
h3 { margin-bottom: 4px; font-size: 1.05rem; }
p { margin-bottom: 0; color: var(--cf2-muted); }
.cf2-hidden { display: none !important; }
.cf2-file-input { display: none; }
.cf2-view-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.cf2-view-count, .cf2-rule-count, .cf2-editor-step, .cf2-code-language, .cf2-complexity-badge, .cf2-rule-type {
  display: inline-flex; align-items: center; min-height: 24px; padding: 2px 9px;
  color: var(--cf2-muted); background: var(--cf2-subtle); border-radius: 999px; font-size: 12px; font-weight: 650;
}

.cf2-card { background: var(--cf2-surface); border: 1px solid var(--cf2-border); border-radius: 9px; padding: 18px; }
.cf2-section-header { display: flex; align-items: center; gap: 8px; min-height: 28px; }
.cf2-section-title { font-weight: 700; }
.cf2-section-header .cf2-text-button, .cf2-section-header .cf2-rule-count { margin-left: auto; }
.cf2-text-button { padding: 4px 6px; color: var(--cf2-primary); background: transparent; border: 0; cursor: pointer; }
.cf2-text-button:hover { color: var(--cf2-primary-strong); text-decoration: underline; }

.cf2-dashboard-hero { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-bottom: 24px; border-bottom: 1px solid var(--cf2-border); }
.cf2-dashboard-actions, .cf2-button-group, .cf2-rules-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.cf2-status { display: flex; align-items: center; gap: 8px; color: var(--cf2-muted); }
.cf2-status-indicator { width: 8px; height: 8px; border-radius: 50%; background: var(--cf2-muted); }
.cf2-status-indicator.active { background: var(--cf2-success); box-shadow: 0 0 0 3px rgba(101,201,155,.13); }
.cf2-status-indicator.error { background: var(--cf2-danger); }
.cf2-dashboard-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
.cf2-dashboard-metric { display: flex; flex-direction: column; gap: 6px; padding: 16px; background: var(--cf2-subtle); border-radius: 8px; }
.cf2-dashboard-metric span { color: var(--cf2-muted); font-size: 12px; }
.cf2-dashboard-metric strong { font-size: 1.65rem; line-height: 1; }
.cf2-dashboard-recent { padding-top: 4px; }
.cf2-dashboard-rule-list { margin-top: 10px; border-top: 1px solid var(--cf2-border); }
.cf2-dashboard-rule { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 8px 4px; border-bottom: 1px solid var(--cf2-border); }
.cf2-dashboard-rule code { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cf2-dashboard-rule .cf2-rule-type { margin-left: auto; }
.cf2-dashboard-rule-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cf2-primary); }
.cf2-dashboard-empty { padding: 20px 4px; color: var(--cf2-muted); }

.cf2-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; padding: 8px 13px;
  border: 1px solid transparent; border-radius: 7px; font-weight: 650; cursor: pointer;
}
.cf2-button-primary { color: #0d1b36; background: var(--cf2-primary); }
.cf2-button-primary:hover { background: var(--cf2-primary-strong); }
.cf2-button-secondary { color: var(--cf2-text); background: var(--cf2-subtle); border-color: var(--cf2-border); }
.cf2-button-secondary:hover { border-color: var(--cf2-primary); }
.cf2-button-danger { color: #ffdadd; background: rgba(240,123,131,.12); border-color: rgba(240,123,131,.4); }
.cf2-button-danger:hover { background: rgba(240,123,131,.2); }
.cf2-button-warning { color: #ffe4b2; background: rgba(229,185,111,.12); border-color: rgba(229,185,111,.4); }
.cf2-button-small { min-height: 30px; padding: 4px 8px; font-size: 12px; }

.cf2-format-selector { margin-bottom: 8px; }
.cf2-format-selector > .cf2-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 0 14px; border: 0; border-bottom: 1px solid var(--cf2-border); border-radius: 0; }
.cf2-format-tabs { display: flex; gap: 4px; padding: 4px; background: var(--cf2-subtle); border-radius: 8px; }
.cf2-format-tab { display: flex; align-items: center; gap: 7px; min-height: 34px; padding: 6px 11px; color: var(--cf2-muted); background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
.cf2-format-tab:hover { color: var(--cf2-text); }
.cf2-format-tab.active { color: var(--cf2-text); background: var(--cf2-surface); }
.cf2-layout-grid { display: block; }
.cf2-left-column, .cf2-right-column { min-width: 0; }

/* Rule Studio: nested cardsではなく、余白と区切り線で構造を示す。 */
.cf2-rule-editor, .cf2-json-editor, .cf2-rules-list-card { padding: 0; border: 0; border-radius: 0; }
.cf2-rule-editor { border-top-width: 0; }
.cf2-editor-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 22px 0 18px; }
.cf2-builder-flow { border-top: 1px solid var(--cf2-border); }
.cf2-builder-block { padding: 22px 0; border: 0; border-bottom: 1px solid var(--cf2-border); border-radius: 0; }
.cf2-builder-block-heading { display: grid; grid-template-columns: 58px 1fr; gap: 12px; margin-bottom: 18px; }
.cf2-builder-block-heading div { display: flex; flex-direction: column; gap: 2px; }
.cf2-builder-block-heading small { color: var(--cf2-muted); }
.cf2-builder-token { align-self: start; color: var(--cf2-primary); font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.cf2-field-section { margin-left: 70px; }
.cf2-field-section + .cf2-field-section { margin-top: 16px; }
.cf2-input-group { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.cf2-input-label { display: flex; align-items: center; gap: 7px; color: var(--cf2-muted); font-size: 12px; font-weight: 650; }
.cf2-pattern-grid { display: grid; grid-template-columns: minmax(0, 1fr) 100px; gap: 12px; }
.cf2-input-row { display: grid; grid-template-columns: minmax(100px,.55fr) minmax(80px,.45fr) minmax(180px,1fr); gap: 10px; }
.cf2-text-input, .cf2-command-input, .cf2-number-input, .cf2-select, .cf2-test-textarea, .cf2-textarea {
  width: 100%; color: var(--cf2-text); background: var(--cf2-subtle); border: 1px solid var(--cf2-border); border-radius: 7px; outline: none;
}
.cf2-text-input, .cf2-command-input, .cf2-number-input, .cf2-select { min-height: 40px; padding: 8px 11px; }
.cf2-test-textarea, .cf2-textarea { padding: 11px; resize: vertical; }
.cf2-test-textarea { min-height: 80px; }
.cf2-textarea { min-height: 340px; border: 0; border-radius: 0 0 8px 8px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; line-height: 1.65; }
::placeholder { color: var(--cf2-muted); }
.cf2-radio-group { display: flex; flex-wrap: wrap; gap: 8px; }
.cf2-radio-label { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 7px 11px; background: var(--cf2-subtle); border: 1px solid transparent; border-radius: 7px; cursor: pointer; }
.cf2-radio-label:has(input:checked) { border-color: var(--cf2-primary); color: var(--cf2-text); }
.cf2-radio-label input { accent-color: var(--cf2-primary); }
.cf2-help-text { color: var(--cf2-muted); font-size: 12px; }
.cf2-nicoru-settings { margin: 14px 0 0 70px; padding: 14px; background: var(--cf2-subtle); border-radius: 8px; }
.cf2-editor-actions { padding-top: 18px; }

.cf2-toggle-container { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cf2-toggle-label { display: flex; align-items: center; gap: 8px; }
.cf2-toggle { position: relative; width: 42px; height: 24px; flex: none; padding: 0; border: 0; background: var(--cf2-border); border-radius: 999px; cursor: pointer; transition: background-color .16s ease; }
.cf2-toggle-slider { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: var(--cf2-text); border-radius: 50%; transition: transform .16s ease; }
.cf2-toggle.active { background: var(--cf2-primary); }
.cf2-toggle.active .cf2-toggle-slider { transform: translateX(18px); }
.cf2-command-apply-mode { margin-bottom: 16px; padding: 12px 14px; border: 1px solid var(--cf2-border); border-radius: 8px; }

.cf2-regex-preview, .cf2-regex-analysis { margin-top: 16px; padding: 14px; background: var(--cf2-bg); border-radius: 8px; }
.cf2-regex-preview-header { cursor: pointer; user-select: none; }
.cf2-regex-preview-header::-webkit-details-marker { display: none; }
.cf2-regex-preview-header::after { content: "›"; margin-left: 8px; color: var(--cf2-muted); font-size: 20px; line-height: 1; transform: rotate(90deg); transition: transform .16s ease; }
.cf2-regex-preview:not([open]) .cf2-regex-preview-header::after { transform: rotate(0deg); }
.cf2-regex-preview-content { padding-top: 10px; }
.cf2-preview-count { margin-left: auto; color: var(--cf2-muted); font-size: 12px; }
.cf2-regex-preview-result { min-height: 42px; margin-top: 10px; padding: 10px; color: var(--cf2-muted); border-left: 2px solid var(--cf2-border); overflow-wrap: anywhere; }
.cf2-regex-preview-result mark { color: #0d1b36; background: var(--cf2-warning); border-radius: 2px; }
.cf2-preview-success { border-left-color: var(--cf2-success); }
.cf2-preview-error { color: #ffc5c9; border-left-color: var(--cf2-danger); }
.cf2-regex-analysis-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.cf2-regex-analysis-title { font-weight: 700; }
.cf2-regex-complexity-badge { margin-left: auto; }
.cf2-complexity-low { color: var(--cf2-success); }
.cf2-regex-warning-item, .cf2-regex-suggestion-item, .cf2-regex-literal-notice, .cf2-regex-no-warnings { display: flex; gap: 9px; padding: 9px 0; border-top: 1px solid var(--cf2-border); }
.cf2-regex-warning-icon { color: var(--cf2-warning); }
.cf2-regex-suggestion-icon { color: var(--cf2-primary); }
.cf2-regex-problematic-part, .cf2-regex-suggested-pattern, .cf2-literal-pattern { padding: 2px 5px; color: var(--cf2-text); background: var(--cf2-subtle); border-radius: 4px; overflow-wrap: anywhere; }

.cf2-code-toolbar { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; color: var(--cf2-muted); background: var(--cf2-bg); border: 1px solid var(--cf2-border); border-bottom: 0; border-radius: 8px 8px 0 0; font-size: 12px; }
.cf2-code-surface { border: 1px solid var(--cf2-border); border-radius: 0 0 8px 8px; overflow: hidden; }
.cf2-json-editor .cf2-editor-actions { margin-bottom: 4px; }

.cf2-rules-list-card > .cf2-section-header { padding: 20px 0 14px; border-bottom: 1px solid var(--cf2-border); }
.cf2-rules-controls { padding: 12px 0; }
.cf2-rules-list { display: block; border-top: 1px solid var(--cf2-border); }
.cf2-rule-item { padding: 14px 4px; border: 0; border-bottom: 1px solid var(--cf2-border); border-radius: 0; background: transparent; }
.cf2-rule-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cf2-rule-actions { display: flex; gap: 6px; }
.cf2-rule-content { margin: 8px 0 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }
.cf2-rule-details { color: var(--cf2-muted); font-size: 12px; }

.cf2-command-grid { display: grid; gap: 16px; margin: 20px 0; }
.cf2-command-settings-card, .cf2-data-card { max-width: 900px; }
.cf2-data-card .cf2-button-group { margin-top: 20px; }
.cf2-settings-section { max-width: 800px; }
.cf2-settings-heading { margin-bottom: 10px; }
.cf2-settings-section .cf2-card { padding: 16px 4px; border-width: 0 0 1px; border-radius: 0; }
.cf2-debug-section { max-width: 800px; margin-top: 20px; }
.cf2-debug-section.cf2-collapsed { display: none; }
.cf2-debug-info { margin-top: 12px; color: var(--cf2-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; }
.cf2-debug-item { padding: 7px 0; border-bottom: 1px solid var(--cf2-border); }

:where(button, input, textarea, select, a, [role="switch"]):focus-visible {
  outline: 2px solid var(--cf2-primary);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .cf2-container { --cf2-modal-inset-y: 0px; inset: 0; max-width: none; max-height: none; border: 0; border-radius: 0; }
  .cf2-workspace { grid-template-columns: 1fr; grid-template-rows: auto minmax(0,1fr); }
  .cf2-sidebar { flex-direction: row; padding: 7px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--cf2-border); }
  .cf2-sidebar-item { width: auto; flex: 0 0 auto; }
  .cf2-sidebar-item.active { box-shadow: inset 0 -3px var(--cf2-primary); }
  .cf2-workspace-main { padding: 18px 14px; }
  .cf2-dashboard-hero, .cf2-view-header, .cf2-format-selector > .cf2-card { align-items: stretch; flex-direction: column; }
  .cf2-dashboard-actions { justify-content: space-between; }
  .cf2-dashboard-metrics { grid-template-columns: 1fr; }
  .cf2-format-tabs { overflow-x: auto; }
  .cf2-format-tab { flex: 1 0 auto; }
  .cf2-field-section, .cf2-nicoru-settings { margin-left: 0; }
  .cf2-builder-block-heading { grid-template-columns: 1fr; gap: 5px; }
  .cf2-pattern-grid, .cf2-input-row { grid-template-columns: 1fr; }
}

@media (max-width: 460px) {
  .cf2-title-text { font-size: 13px; }
  .cf2-sidebar-item { flex-direction: column; gap: 2px; min-width: 58px; padding: 6px; font-size: 11px; }
  .cf2-dashboard-actions, .cf2-button-group, .cf2-rules-controls { align-items: stretch; flex-direction: column; }
  .cf2-button { width: 100%; }
  .cf2-radio-label { flex: 1 1 100%; }
  .cf2-code-hint { display: none; }
}

@media (max-height: 560px) and (min-width: 761px) {
  .cf2-container { --cf2-modal-inset-y: 8px; inset-block: 8px; }
  .cf2-header { min-height: 48px; }
  .cf2-workspace-main { padding-block: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
`.trim();
