import { MINIMAL_DARK_THEME_TOKENS } from "@/common/visual-theme";

const MYLIST2_STYLE_ID = "mylist2-manager-styles";

// 旧構成を参照する外部コードとの互換性を維持する。新しいスタイルは単一の
// カスケードとして設計しているため、個別パートへは分割しない。
export const MYLIST_MANAGER_STYLES_PART1 = "";
export const MYLIST_MANAGER_STYLES_PART2 = "";
export const MYLIST_MANAGER_STYLES_PART3 = "";
export const MYLIST_MANAGER_STYLES_PART4 = "";
export const SIDEBAR_UTILITY_STYLES = "";
export const VIRTUAL_SCROLL_ACTION_MENU_STYLES = "";
export const FAB_AND_SETTINGS_MODAL_STYLES = "";
export const MYLIST_VISUAL_REFRESH_STYLES = "";

/** mylist2 のレイアウトとカラーテーマ。面色は全テーマ共通で、アクセントだけを切り替える。 */
export const MYLIST_MANAGER_STYLES = String.raw`
:root {
  color-scheme: dark;
  ${MINIMAL_DARK_THEME_TOKENS}
}

html,
body {
  width: 100%;
  height: 100dvh;
  margin: 0;
  overflow: hidden;
  background: var(--nc-bg);
  color: var(--nc-text);
}

body {
  font-family: Inter, "Noto Sans JP", "Yu Gothic UI", system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.custom-mylist2-manager {
  --cml2-bg: var(--nc-bg);
  --cml2-surface: var(--nc-surface);
  --cml2-subtle: var(--nc-surface-subtle);
  --cml2-border: var(--nc-border);
  --cml2-text: var(--nc-text);
  --cml2-muted: var(--nc-muted);
  --cml2-primary: var(--nc-primary);
  --cml2-primary-rgb: 111, 156, 255;
  --cml2-danger: #ff6b7a;
  --cml2-success: #58c99d;
  display: grid;
  grid-template-columns: clamp(240px, 25vw, 340px) minmax(0, 1fr);
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--cml2-bg);
  color: var(--cml2-text);
  accent-color: var(--cml2-primary);
}

.custom-mylist2-manager.cml2-theme-dark-green { --cml2-primary: #55c99a; --cml2-primary-rgb: 85, 201, 154; }
.custom-mylist2-manager.cml2-theme-dark-amber { --cml2-primary: #e8b75d; --cml2-primary-rgb: 232, 183, 93; }
.custom-mylist2-manager.cml2-theme-dark-violet { --cml2-primary: #a98cff; --cml2-primary-rgb: 169, 140, 255; }
.custom-mylist2-manager.cml2-theme-dark-red { --cml2-primary: #f37882; --cml2-primary-rgb: 243, 120, 130; }

.custom-mylist2-manager button,
.custom-mylist2-manager input,
.custom-mylist2-manager select,
.custom-mylist2-manager textarea,
.cml2-modal button,
.cml2-modal input,
.cml2-modal select,
.cml2-modal textarea,
.cml2-alert-modal button,
.cml2-settings-modal button,
.cml2-settings-modal input,
.cml2-settings-modal select {
  font: inherit;
}

.custom-mylist2-manager button,
.custom-mylist2-manager a,
.cml2-modal button,
.cml2-alert-modal button,
.cml2-settings-modal button { -webkit-tap-highlight-color: transparent; }

.mylist-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--cml2-surface);
  border-right: 1px solid var(--cml2-border);
}

.mylist-controls,
.mylist-sort-controls,
.mylist-sidebar > .search-container {
  --cml2-sidebar-inline-padding: 14px;
  flex: 0 0 auto;
  padding-inline: var(--cml2-sidebar-inline-padding);
}
.mylist-controls { display: flex; gap: 8px; padding-top: 14px; }
.mylist-sidebar > .search-container { margin-top: 10px; }
.mylist-sort-controls { padding-block: 10px 12px; border-bottom: 1px solid var(--cml2-border); }

.search-container { position: relative; display: flex; min-width: 0; }
.search-container input { box-sizing: border-box; width: 100%; padding-right: 42px; }
.search-clear-btn {
  position: absolute;
  inset-inline-end: 4px;
  top: 50%;
  width: 30px;
  height: 30px;
  min-height: 30px !important;
  display: grid;
  place-items: center;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--cml2-muted);
}
.mylist-sidebar > .search-container .search-clear-btn {
  inset-inline-end: calc(var(--cml2-sidebar-inline-padding) + 4px);
}
.search-clear-btn .material-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  width: 18px;
  height: 18px;
  margin: 0;
  transform: translate(-50%, -50%);
  filter: brightness(0) invert(1);
}

.custom-mylist2-manager input:not([type="checkbox"]):not([type="file"]),
.custom-mylist2-manager select,
.custom-mylist2-manager textarea,
.cml2-modal input,
.cml2-modal select,
.cml2-modal textarea,
.cml2-settings-modal input,
.cml2-settings-modal select {
  min-width: 0;
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid var(--cml2-border, #364151);
  border-radius: 7px;
  outline: 0;
  background: var(--cml2-subtle, #242c37);
  color: var(--cml2-text, #edf1f7);
}
.custom-mylist2-manager input::placeholder,
.custom-mylist2-manager textarea::placeholder,
.cml2-modal input::placeholder,
.cml2-settings-modal input::placeholder { color: var(--cml2-muted, #a9b4c3); opacity: .78; }
.mylist-controls input { flex: 1 1 auto; }
.mylist-controls button { flex: 0 0 38px; }
.mylist-sort-controls select { width: 100%; }

.custom-mylist2-manager button,
.cml2-btn,
.cml2-alert-modal button {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: var(--cml2-primary, #6f9cff);
  color: #11151b;
  cursor: pointer;
  transition: background-color .16s ease, border-color .16s ease, color .16s ease, opacity .16s ease;
}
.custom-mylist2-manager button:hover,
.cml2-btn:hover,
.cml2-alert-modal button:hover { filter: brightness(1.08); }
.custom-mylist2-manager button:disabled,
.cml2-btn:disabled { cursor: not-allowed; opacity: .5; }
.cml2-btn-secondary,
.modal-actions .cml2-btn-secondary,
.cml2-modal-footer .close-button { background: #242c37; border-color: #364151; color: #edf1f7; }
.cml2-btn-danger,
.danger { color: #ff8a95; }
.cml2-btn.cml2-btn-danger { background: #5a2630; border-color: #88404b; color: #ffe7ea; }

.mylist-list {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  padding: 5px 8px;
  scrollbar-color: var(--cml2-border) transparent;
}
.mylist-item {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 2px 0;
  padding: 10px 9px;
  border-radius: 6px;
  color: var(--cml2-text);
  cursor: pointer;
}
.mylist-item:hover { background: var(--cml2-subtle); }
.mylist-item.active { background: rgb(var(--cml2-primary-rgb) / .15); color: var(--cml2-primary); }
.mylist-info { min-width: 0; flex: 1; }
.mylist-details { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; }
.mylist-name { overflow: hidden; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.mylist-date,
.mylist-count-mylist-tab { color: var(--cml2-muted); font-size: 12px; }
.mylist-count-mylist-tab { flex: 0 0 auto; }
.hidden { display: none !important; }

.mylist-sidebar-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 0 0 auto;
  gap: 8px;
  padding: 10px 12px max(10px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--cml2-border);
  background: var(--cml2-surface);
}
.sidebar-footer-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 7px 9px;
  border: 1px solid var(--cml2-border) !important;
  border-radius: 7px;
  background: transparent !important;
  color: var(--cml2-muted) !important;
  text-decoration: none;
}
.sidebar-footer-action:hover { background: var(--cml2-subtle) !important; color: var(--cml2-text) !important; }

.mylist-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--cml2-bg);
}
.video-filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 280px) minmax(180px, 1fr);
  flex: 0 0 auto;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--cml2-border);
  background: var(--cml2-surface);
}
.video-filter-bar select { width: 100%; }

.selection-action-bar {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 7px;
  min-height: 0;
  max-height: 0;
  padding: 0 16px;
  overflow: hidden;
  visibility: hidden;
  background: var(--cml2-surface);
  border-bottom: 0 solid var(--cml2-border);
  opacity: 0;
  transition: max-height .2s ease, padding .2s ease, opacity .15s ease;
}
.custom-mylist2-manager.has-selection .selection-action-bar,
.selection-action-bar[aria-hidden="false"] {
  max-height: 60px;
  padding-block: 8px;
  visibility: visible;
  border-bottom-width: 1px;
  opacity: 1;
}
.selection-action-bar button { min-height: 32px; padding: 5px 10px; background: var(--cml2-subtle); border-color: var(--cml2-border); color: var(--cml2-text); }
.selection-action-bar button.danger { color: var(--cml2-danger); }
.selected-items-count { margin-right: auto; color: var(--cml2-primary); font-size: 13px; font-weight: 650; }
#selectedVideosAction { display: none; }

.video-list-selection-header {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: 40px;
  padding: 7px 18px;
  border-bottom: 1px solid var(--cml2-border);
  background: var(--cml2-subtle);
  color: var(--cml2-muted);
  font-size: 13px;
}
.video-list-selection-header label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
input[type="checkbox"] { width: 16px; height: 16px; margin: 0; }

.video-list {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  background: var(--cml2-bg);
  scrollbar-color: var(--cml2-border) transparent;
}
.video-list-spacer { z-index: 0; }
.video-item {
  z-index: 1;
  display: grid;
  grid-template-columns: 20px 120px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 0;
  height: 92px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--cml2-border);
  background: var(--cml2-surface);
  color: var(--cml2-text);
  cursor: pointer;
}
.video-item:hover { background: var(--cml2-subtle); }
.video-item:focus-visible { outline: 2px solid var(--cml2-primary); outline-offset: -2px; }
.video-item.is-selected { background: rgb(var(--cml2-primary-rgb) / .13); box-shadow: inset 3px 0 var(--cml2-primary); }
.video-thumbnail,
.keyword-icon {
  width: 120px;
  height: 68px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--cml2-subtle);
}
.keyword-icon { display: grid; place-items: center; }
.video-info { min-width: 0; overflow: hidden; }
.video-title { overflow: hidden; color: var(--cml2-text); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.video-title-link,
.keyword-links a,
.cml2-video-link { color: var(--cml2-primary); text-decoration: none; }
.video-title-link:hover,
.keyword-links a:hover,
.cml2-video-link:hover { text-decoration: underline; }
.video-stats,
.video-meta,
.keyword-meta,
.keyword-links { display: flex; align-items: center; gap: 12px; min-width: 0; margin-top: 5px; color: var(--cml2-muted); font-size: 12px; }
.video-author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.video-stats > span,
.video-meta > span { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.video-stats .material-icon,
.video-meta .material-icon { flex: 0 0 auto; width: 14px; height: 14px; filter: brightness(0) invert(1); }
.keyword-links { flex-wrap: wrap; gap: 6px 14px; }
.cml2-availability-badge,
.cml2-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--cml2-subtle, #242c37);
  color: var(--cml2-muted, #a9b4c3);
  font-size: 12px;
}
.status-deleted,
.status-private,
.status-unavailable { color: var(--cml2-danger, #ff6b7a); }
.action-trigger {
  width: 34px;
  min-height: 34px !important;
  padding: 6px !important;
  border-color: transparent !important;
  background: transparent !important;
  color: var(--cml2-muted) !important;
  opacity: 0;
}
.video-item:hover .action-trigger,
.video-item:focus-within .action-trigger { opacity: 1; }

.cml2-action-popover {
  position: fixed;
  z-index: 11000;
  min-width: 160px;
  padding: 5px;
  border: 1px solid #364151;
  border-radius: 8px;
  background: #1a2029;
  box-shadow: 0 12px 30px rgb(0 0 0 / .35);
}
.cml2-action-popover-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 9px;
  padding: 8px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #edf1f7;
  text-align: left;
  cursor: pointer;
}
.cml2-action-popover-item:hover { background: #242c37; }
.cml2-action-popover-item.danger { color: #ff8a95; }

.modal,
.cml2-modal,
.cml2-alert-modal,
.progress-modal,
.mylist-selector-modal,
.cml2-settings-modal {
  --cml2-surface: #1a2029;
  --cml2-subtle: #242c37;
  --cml2-border: #364151;
  --cml2-text: #edf1f7;
  --cml2-muted: #a9b4c3;
  --cml2-primary: #6f9cff;
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  background: rgb(4 7 11 / .76);
  color: var(--cml2-text);
}
.modal-content,
.cml2-modal-content,
.cml2-alert-content,
.progress-content,
.mylist-selector-content,
.cml2-settings-content {
  position: relative;
  width: min(100%, 560px);
  max-height: min(760px, calc(100dvh - 40px));
  overflow: auto;
  padding: 22px;
  border: 1px solid var(--cml2-border);
  border-radius: 10px;
  background: var(--cml2-surface);
  box-shadow: 0 20px 55px rgb(0 0 0 / .42);
}
.cml2-settings-content { width: min(100%, 680px); padding: 0; }
.modal-content h2,
.cml2-modal-title,
.cml2-alert-title { margin: 0 0 16px; color: var(--cml2-text); font-size: 19px; }
.close,
.close-button,
.cml2-settings-close {
  cursor: pointer;
}
.modal-content > .close,
.modal-content > .close-button {
  position: absolute;
  inset-block-start: 14px;
  inset-inline-end: 14px;
}
.modal-actions,
.cml2-modal-footer,
.cml2-alert-buttons,
.cml2-settings-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.cml2-modal-body { color: var(--cml2-muted); line-height: 1.55; }
.cml2-modal-body select,
.cml2-modal-body input,
.video-memo { width: 100%; }
.cml2-batch-api-field { display: grid; gap: 6px; margin-top: 12px; color: var(--cml2-text); }
.video-details-section + .video-details-section { padding-top: 14px; border-top: 1px solid var(--cml2-border); }
.video-description { overflow-wrap: anywhere; }
.video-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.cml2-settings-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 20px;
  border-bottom: 1px solid var(--cml2-border);
  background: var(--cml2-surface);
}
.cml2-settings-title { font-size: 19px; font-weight: 700; }
.cml2-settings-close { width: 34px; min-height: 34px; padding: 5px; border: 0; background: transparent; color: var(--cml2-muted); }
.cml2-settings-section { padding: 17px 20px; border-bottom: 1px solid var(--cml2-border); }
.cml2-settings-section:last-child { border-bottom: 0; }
.cml2-settings-section-title { margin-bottom: 9px; color: var(--cml2-muted); font-size: 13px; font-weight: 650; }
.cml2-settings-mylist-name,
.cml2-settings-add-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.cml2-settings-theme select { width: 100%; }
.cml2-settings-danger-zone { background: rgb(255 107 122 / .045); }
.cml2-settings-modal:not(.visible) { display: none; }

.modal-mylist-list { display: grid; gap: 5px; max-height: 50dvh; overflow: auto; }
.modal-mylist-list .mylist-item { background: var(--cml2-subtle); }
.mylist-selector-content { width: min(100%, 600px); }
.suggested-mylists { margin-block: 12px; }
.match-info { color: var(--cml2-muted); font-size: 12px; }

.progress-container {
  position: fixed;
  inset-inline: 50%;
  inset-block-end: 20px;
  z-index: 13000;
  width: min(420px, calc(100% - 32px));
  padding: 12px;
  transform: translateX(-50%);
  border: 1px solid #364151;
  border-radius: 8px;
  background: #1a2029;
  color: #edf1f7;
}
.progress-bar { height: 7px; overflow: hidden; border-radius: 999px; background: #242c37; }
.progress-fill { height: 100%; background: #6f9cff; transition: width .2s ease; }
.progress-text { margin-top: 7px; color: #a9b4c3; font-size: 12px; }
.progress-circle { position: relative; width: 92px; margin: auto; }
.circular-progress { display: block; width: 100%; transform: rotate(-90deg); }
.circle-bg { stroke: #242c37; }
.circular-progress .progress { stroke: #6f9cff; }
.progress-circle > .progress-text { position: absolute; inset: 50% auto auto 50%; margin: 0; transform: translate(-50%, -50%); }
.progress-status { margin-top: 12px; color: #a9b4c3; text-align: center; }

.material-icon { display: block; width: 20px; height: 20px; }
.icon-white { filter: brightness(0) invert(1); }

:where(.custom-mylist2-manager, .cml2-modal, .cml2-alert-modal, .cml2-settings-modal) :focus-visible,
.cml2-action-popover :focus-visible,
.sidebar-footer-action:focus-visible {
  outline: 2px solid var(--cml2-primary, #6f9cff);
  outline-offset: 2px;
}

@media (hover: none) {
  .action-trigger { opacity: 1; }
}

@media (max-width: 720px) {
  .custom-mylist2-manager { grid-template-columns: clamp(150px, 40vw, 240px) minmax(0, 1fr); }
  .mylist-controls,
  .mylist-sort-controls,
  .mylist-sidebar > .search-container {
    --cml2-sidebar-inline-padding: 8px;
    padding-inline: var(--cml2-sidebar-inline-padding);
  }
  .mylist-sidebar-footer { grid-template-columns: 1fr; padding-inline: 8px; }
  .sidebar-footer-action { min-height: 34px; }
  .video-filter-bar { grid-template-columns: 1fr; gap: 7px; padding: 8px; }
  .selection-action-bar { overflow-x: auto; }
  .selection-action-bar button { flex: 0 0 auto; }
  .video-item { grid-template-columns: 18px 88px minmax(0, 1fr); gap: 8px; padding-inline: 8px; }
  .video-thumbnail,
  .keyword-icon { width: 88px; height: 54px; }
  .video-stats { gap: 7px; }
  .video-meta { display: none; }
}

@media (max-width: 440px) {
  .custom-mylist2-manager { grid-template-columns: 132px minmax(0, 1fr); }
  .mylist-controls { display: grid; grid-template-columns: minmax(0, 1fr) 34px; }
  .mylist-name { font-size: 13px; }
  .mylist-date { display: none; }
  .sidebar-footer-action span { display: none; }
  .video-item { grid-template-columns: 18px minmax(0, 1fr); }
  .video-thumbnail,
  .keyword-icon { display: none; }
  .video-stats { overflow: hidden; white-space: nowrap; }
  .modal,
  .cml2-modal,
  .cml2-alert-modal,
  .progress-modal,
  .mylist-selector-modal,
  .cml2-settings-modal { padding: 10px; }
  .modal-content,
  .cml2-modal-content,
  .cml2-alert-content,
  .progress-content,
  .mylist-selector-content,
  .cml2-settings-content { max-height: calc(100dvh - 20px); padding: 16px; }
  .cml2-settings-content { padding: 0; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
`;

/** mylist2 のスタイルを一度だけ適用する。 */
export const applyMylistManagerStyles = (): HTMLStyleElement => {
  const existing = document.getElementById(MYLIST2_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;

  const style = document.createElement("style");
  style.id = MYLIST2_STYLE_ID;
  style.textContent = MYLIST_MANAGER_STYLES;
  document.head.appendChild(style);
  return style;
};
