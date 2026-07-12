/* CommentFilter2 - Modern Dark Theme */
/* Reset and Base Styles */
export const CommentFilter2MainStyles = `
* {
  box-sizing: border-box;
}

/* Background Overlay with Blur Effect */
.cf2-background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  
  /* Beautiful blur effect */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  /* Smooth fade animation */
  opacity: 0;
  animation: cf2-overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  /* Cursor indicates clickable */
  cursor: pointer;
}

@keyframes cf2-overlay-fade-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}

/* Container */
.cf2-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10001;
  
  /* Glassmorphism inspired dark theme */
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  border: 1px solid rgba(55, 65, 81, 0.7);
  border-radius: 1rem;
  
  /* Shadow system */
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  /* Modern typography */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #f9fafb;
  
  /* Dimensions - ビューポート全体を活用 */
  width: min(90vw, 100vw);
  max-height: 90vh;
  overflow-y: auto;
  
  /* Smooth transitions */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scrollbar styling */
.cf2-container::-webkit-scrollbar {
  width: 6px;
}

.cf2-container::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.cf2-container::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

/* Header */
.cf2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 2rem;
}

.cf2-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f9fafb;
}

.cf2-title-text {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cf2-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  
  background: rgba(55, 65, 81, 0.5);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.5rem;
  
  color: #9ca3af;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  transform: scale(1.05);
}

/* Content */
.cf2-content {
  padding: 0 2rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Top controls (full width) */
.cf2-cockpit {
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 12%, rgba(139, 92, 246, 0.22), transparent 34%),
    linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(17, 24, 39, 0.92));
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 1rem;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.cf2-cockpit-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
}

.cf2-eyebrow {
  margin-bottom: 0.35rem;
  color: #93c5fd;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.cf2-cockpit h2 {
  margin: 0 0 0.65rem;
  color: #f9fafb;
  font-size: clamp(1.25rem, 2.5vw, 1.65rem);
  line-height: 1.25;
}

.cf2-cockpit-apply {
  flex: 0 0 auto;
  min-width: 10rem;
}

.cf2-cockpit-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 0 1.5rem 1.25rem;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.14);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 0.75rem;
}

.cf2-cockpit-metric {
  min-width: 0;
  padding: 0.9rem 1rem;
  background: rgba(15, 23, 42, 0.66);
}

.cf2-cockpit-metric > span {
  display: block;
  margin-bottom: 0.3rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

.cf2-cockpit-metric strong {
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.cf2-cockpit-nav {
  display: flex;
  gap: 0.25rem;
  padding: 0 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.cf2-cockpit-nav-item {
  padding: 0.8rem 0.9rem;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font: inherit;
  cursor: pointer;
}

.cf2-cockpit-nav-item:hover,
.cf2-cockpit-nav-item.active {
  color: #f8fafc;
  border-bottom-color: #60a5fa;
}

.cf2-section-anchor {
  scroll-margin-top: 1rem;
}

/* App shell — visualize案01「クイック・コックピット」 */
.cf2-container {
  width: min(1120px, 94vw);
}

.cf2-header {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0;
  padding: 1rem 1.25rem;
  background: rgba(17, 24, 39, 0.96);
  border-bottom: 1px solid rgba(75, 85, 99, 0.5);
  backdrop-filter: blur(18px);
}

.cf2-content {
  padding: 0;
  gap: 0;
}

.cf2-workspace {
  display: grid;
  grid-template-columns: 10.5rem minmax(0, 1fr);
  min-height: min(680px, calc(90vh - 69px));
}

.cf2-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 0.75rem;
  background: rgba(15, 23, 42, 0.52);
  border-right: 1px solid rgba(75, 85, 99, 0.45);
}

.cf2-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.72rem 0.8rem;
  background: transparent;
  border: 0;
  border-radius: 0.55rem;
  color: #94a3b8;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.cf2-sidebar-item:hover {
  background: rgba(51, 65, 85, 0.48);
  color: #e2e8f0;
}

.cf2-sidebar-item.active {
  background: rgba(59, 130, 246, 0.16);
  color: #bfdbfe;
}

.cf2-workspace-main {
  min-width: 0;
  padding: clamp(1.1rem, 3vw, 2rem);
}

.cf2-dashboard {
  display: grid;
  gap: 1.25rem;
}

.cf2-dashboard-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.cf2-dashboard-hero h2 {
  margin: 0 0 0.5rem;
  color: #f8fafc;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  line-height: 1.25;
}

.cf2-dashboard-actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.cf2-dashboard-apply {
  flex: 0 0 auto;
}

.cf2-dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.cf2-dashboard-metric {
  padding: 1rem;
  background: rgba(30, 41, 59, 0.58);
  border-radius: 0.65rem;
}

.cf2-dashboard-metric span {
  display: block;
  margin-bottom: 0.35rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

.cf2-dashboard-metric strong {
  color: #f8fafc;
  font-size: 1.35rem;
}

.cf2-dashboard-recent {
  margin-top: 0.25rem;
}

.cf2-dashboard-recent .cf2-section-header {
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(75, 85, 99, 0.45);
}

.cf2-text-button {
  margin-left: auto;
  padding: 0.35rem 0.5rem;
  background: transparent;
  border: 0;
  color: #93c5fd;
  font: inherit;
  cursor: pointer;
}

.cf2-dashboard-rule {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
}

.cf2-dashboard-rule code {
  overflow: hidden;
  color: #e2e8f0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf2-dashboard-rule-dot {
  width: 0.6rem;
  height: 0.6rem;
  background: #60a5fa;
  border-radius: 50%;
}

.cf2-dashboard-empty {
  padding: 1.5rem 0;
  color: #94a3b8;
}

.cf2-view-panel {
  animation: cf2-view-enter 0.18s ease-out;
}

@keyframes cf2-view-enter {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* App shell内では旧モーダルのカード表現をフラットな作業面へ統一 */
.cf2-workspace-main .cf2-view-panel.cf2-card,
.cf2-workspace-main .cf2-format-selector > .cf2-card {
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.cf2-workspace-main .cf2-view-panel.cf2-card:hover,
.cf2-workspace-main .cf2-format-selector > .cf2-card:hover {
  background: transparent;
  border-color: transparent;
}

.cf2-view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.35rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(75, 85, 99, 0.42);
}

.cf2-view-header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.35rem;
  line-height: 1.3;
}

.cf2-view-header p {
  margin: 0.35rem 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

.cf2-view-count {
  flex: 0 0 auto;
  padding: 0.35rem 0.65rem;
  background: rgba(59, 130, 246, 0.12);
  border-radius: 999px;
  color: #93c5fd;
  font-size: 0.75rem;
}

.cf2-view-count span {
  color: #dbeafe;
  font-weight: 700;
}

.cf2-workspace-main .cf2-format-selector {
  margin: 0 0 1rem;
}

.cf2-workspace-main .cf2-format-selector .cf2-section-header {
  display: none;
}

.cf2-workspace-main .cf2-format-tabs {
  display: inline-flex;
  width: auto;
  margin: 0;
  padding: 0.25rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(75, 85, 99, 0.45);
  border-radius: 0.6rem;
}

.cf2-workspace-main .cf2-format-tab {
  flex: 0 0 auto;
  padding: 0.55rem 0.9rem;
  background: transparent;
  border: 0;
  color: #94a3b8;
}

.cf2-workspace-main .cf2-format-tab.active {
  background: rgba(51, 65, 85, 0.9);
  border: 0;
  color: #f8fafc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
}

.cf2-workspace-main .cf2-layout-grid {
  grid-template-columns: minmax(0, 1.08fr) minmax(19rem, 0.92fr);
  gap: 1rem;
}

.cf2-workspace-main .cf2-main-card,
.cf2-workspace-main .cf2-rules-list-card {
  min-height: 0;
  padding: 1.15rem;
  background: rgba(30, 41, 59, 0.38);
  border: 1px solid rgba(75, 85, 99, 0.38);
  border-radius: 0.7rem;
}

.cf2-workspace-main .cf2-main-card:hover,
.cf2-workspace-main .cf2-rules-list-card:hover {
  background: rgba(30, 41, 59, 0.38);
  border-color: rgba(75, 85, 99, 0.38);
}

.cf2-workspace-main .cf2-rules-list {
  max-height: 34rem;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.cf2-workspace-main .cf2-rule-item {
  margin: 0;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba(75, 85, 99, 0.34);
}

.cf2-workspace-main .cf2-rule-item:hover {
  background: transparent;
}

.cf2-workspace-main .cf2-command-grid {
  grid-template-columns: 1fr;
  gap: 0;
  overflow: hidden;
  margin: 0 0 1rem;
  background: rgba(30, 41, 59, 0.38);
  border: 1px solid rgba(75, 85, 99, 0.38);
  border-radius: 0.7rem;
}

.cf2-workspace-main .cf2-command-grid .cf2-input-group {
  display: grid;
  grid-template-columns: minmax(11rem, 0.42fr) minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  margin: 0;
  padding: 1rem;
  border-bottom: 1px solid rgba(75, 85, 99, 0.34);
}

.cf2-workspace-main .cf2-command-grid .cf2-input-group:last-child {
  border-bottom: 0;
}

.cf2-workspace-main .cf2-command-grid .cf2-input-label {
  margin: 0;
}

.cf2-workspace-main .cf2-data-card > .cf2-button-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.cf2-workspace-main .cf2-data-card .cf2-button {
  min-height: 5.5rem;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.42);
  border: 1px solid rgba(75, 85, 99, 0.42);
  box-shadow: none;
}

.cf2-workspace-main .cf2-settings-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin: 0;
}

.cf2-workspace-main .cf2-settings-heading {
  grid-column: 1 / -1;
}

.cf2-workspace-main .cf2-settings-section > .cf2-card {
  padding: 1rem;
  background: rgba(30, 41, 59, 0.38);
  border: 1px solid rgba(75, 85, 99, 0.38);
  border-radius: 0.7rem;
}

.cf2-workspace-main .cf2-help-text {
  padding: 0;
  background: transparent;
  border: 0;
  color: #94a3b8;
}

/* Rule authoring */
.cf2-editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.cf2-editor-heading h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
  line-height: 1.35;
}

.cf2-editor-heading p {
  margin: 0.25rem 0 0;
  color: #94a3b8;
  font-size: 0.76rem;
}

.cf2-editor-step {
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.11);
  border: 1px solid rgba(96, 165, 250, 0.16);
  border-radius: 0.35rem;
  color: #93c5fd;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.cf2-rule-editor .cf2-field-section {
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid rgba(75, 85, 99, 0.32);
}

.cf2-rule-editor .cf2-rule-type-selector {
  margin-top: 1rem;
}

.cf2-rule-editor .cf2-input-group {
  margin-bottom: 0;
}

.cf2-rule-editor .cf2-pattern-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem;
  gap: 0.75rem;
}

.cf2-rule-editor .cf2-radio-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
}

.cf2-rule-editor .cf2-radio-label {
  min-height: 2.65rem;
  padding: 0.65rem 0.75rem;
  background: rgba(15, 23, 42, 0.48);
  border: 1px solid rgba(75, 85, 99, 0.42);
  border-radius: 0.5rem;
  color: #cbd5e1;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease;
}

.cf2-rule-editor .cf2-radio-label:hover {
  background: rgba(30, 41, 59, 0.7);
}

.cf2-rule-editor .cf2-radio-label:has(input:checked) {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(96, 165, 250, 0.52);
  color: #dbeafe;
}

.cf2-rule-editor .cf2-text-input,
.cf2-rule-editor .cf2-test-textarea,
.cf2-json-editor .cf2-textarea {
  background: rgba(8, 15, 28, 0.72);
  border-color: rgba(75, 85, 99, 0.52);
  border-radius: 0.45rem;
}

.cf2-rule-editor .cf2-regex-analysis {
  margin: 0.85rem 0 0;
  background: rgba(15, 23, 42, 0.38);
}

.cf2-rule-editor .cf2-regex-preview {
  margin: 0.85rem 0 0;
  padding: 0.85rem;
  background: rgba(15, 23, 42, 0.4);
  border-color: rgba(75, 85, 99, 0.38);
}

.cf2-rule-editor .cf2-regex-preview-result {
  background: rgba(8, 15, 28, 0.64);
}

.cf2-rule-editor .cf2-scope-section .cf2-help-text {
  margin: 0.4rem 0 0;
  font-size: 0.72rem;
}

.cf2-rule-editor .cf2-nicoru-section .cf2-toggle-container {
  padding: 0.7rem 0.8rem;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 0.5rem;
}

.cf2-editor-actions {
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid rgba(75, 85, 99, 0.32);
}

.cf2-editor-actions .cf2-button {
  flex: 0 0 auto;
  min-width: 8.5rem;
  box-shadow: none;
}

.cf2-editor-actions .cf2-button-primary {
  background: #2563eb;
}

.cf2-editor-actions .cf2-button:hover {
  transform: none;
}

/* JSONL editor */
.cf2-json-editor {
  overflow: hidden;
}

.cf2-code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.55rem 0.75rem;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(75, 85, 99, 0.46);
  border-bottom: 0;
  border-radius: 0.5rem 0.5rem 0 0;
}

.cf2-code-language {
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.75rem;
}

.cf2-code-hint {
  color: #64748b;
  font-size: 0.68rem;
}

.cf2-json-editor .cf2-code-surface {
  margin: 0 0 1rem;
}

.cf2-json-editor .cf2-textarea {
  min-height: 31rem;
  padding: 1rem 1.1rem;
  background: rgba(8, 15, 28, 0.86);
  border-radius: 0 0 0.5rem 0.5rem;
  color: #dbeafe;
  font-size: 0.78rem;
  line-height: 1.75;
  tab-size: 2;
}

.cf2-json-editor .cf2-textarea::placeholder {
  color: #64748b;
}

/* Rule Studio */
.cf2-workspace-main .cf2-layout-grid {
  grid-template-columns: minmax(0, 1fr);
}

.cf2-workspace-main .cf2-left-column,
.cf2-workspace-main .cf2-right-column {
  width: 100%;
}

.cf2-workspace-main .cf2-rule-editor,
.cf2-workspace-main .cf2-json-editor,
.cf2-workspace-main #cf2-library-section .cf2-rules-list-card {
  padding: 1.25rem;
}

.cf2-builder-flow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.cf2-builder-block {
  min-width: 0;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.46);
  border: 1px solid rgba(75, 85, 99, 0.4);
  border-radius: 0.65rem;
}

.cf2-builder-condition {
  grid-column: 1 / -1;
}

.cf2-builder-block-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  margin-bottom: 0.85rem;
}

.cf2-builder-block-heading strong,
.cf2-builder-block-heading small {
  display: block;
}

.cf2-builder-block-heading strong {
  color: #f1f5f9;
  font-size: 0.84rem;
}

.cf2-builder-block-heading small {
  margin-top: 0.15rem;
  color: #64748b;
  font-size: 0.68rem;
}

.cf2-builder-token {
  flex: 0 0 auto;
  padding: 0.25rem 0.45rem;
  background: #2563eb;
  border-radius: 0.35rem;
  color: #eff6ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.cf2-builder-block .cf2-field-section,
.cf2-builder-block .cf2-rule-type-selector {
  margin: 0;
  padding: 0;
  border-top: 0;
}

.cf2-builder-block .cf2-rule-inputs.cf2-field-section {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(75, 85, 99, 0.3);
}

.cf2-builder-block .cf2-scope-section,
.cf2-builder-block .cf2-nicoru-section {
  padding-bottom: 0.85rem;
}

.cf2-builder-block .cf2-nicoru-section {
  padding-top: 0.85rem;
  border-top: 1px solid rgba(75, 85, 99, 0.3);
}

.cf2-rule-editor > .cf2-editor-actions {
  margin-top: 0.9rem;
}

#cf2-library-section .cf2-rules-list-card {
  background: rgba(30, 41, 59, 0.3);
}

#cf2-library-section .cf2-rules-controls {
  justify-content: flex-end;
}

#cf2-library-section .cf2-rules-controls .cf2-button {
  flex: 0 0 auto;
}

#cf2-library-section .cf2-rules-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 0.65rem;
  max-height: none;
}

#cf2-library-section .cf2-rule-item {
  padding: 0.9rem;
  background: rgba(15, 23, 42, 0.42);
  border: 1px solid rgba(75, 85, 99, 0.34);
  border-radius: 0.55rem;
}

.cf2-top-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.cf2-regex-preview {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(96, 165, 250, 0.18);
  border-radius: 0.65rem;
}

.cf2-regex-preview-header {
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.cf2-preview-count {
  margin-left: auto;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
  font-size: 0.75rem;
}

.cf2-test-textarea {
  width: 100%;
  min-height: 5.5rem;
  padding: 0.75rem;
  resize: vertical;
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid rgba(75, 85, 99, 0.65);
  border-radius: 0.5rem;
  color: #f9fafb;
  font: inherit;
}

.cf2-test-textarea:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.cf2-regex-preview-result {
  margin-top: 0.75rem;
  min-height: 3rem;
  padding: 0.75rem;
  background: rgba(2, 6, 23, 0.58);
  border-radius: 0.5rem;
  color: #94a3b8;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.cf2-regex-preview-result mark {
  padding: 0.08rem 0.18rem;
  background: rgba(250, 204, 21, 0.28);
  border-bottom: 2px solid #facc15;
  border-radius: 0.2rem;
  color: #fef9c3;
}

.cf2-regex-preview-result.cf2-preview-success {
  color: #e5e7eb;
}

.cf2-regex-preview-result.cf2-preview-error {
  background: rgba(127, 29, 29, 0.18);
  color: #fca5a5;
}

.cf2-control-card {
  flex: 1;
  min-width: 0;
}

/* Layout grid for 2-column design */
.cf2-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: stretch;
  min-height: 0;
}

.cf2-left-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.cf2-right-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

/* Card variants for different purposes */
.cf2-main-card {
  /* NGワードルール用の大きなカード */
  min-height: 400px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cf2-settings-card {
  /* コマンド設定用 */
  flex: 1;
}

/* Card component */
.cf2-card {
  background: rgba(31, 41, 55, 0.6);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.75rem;
  padding: 1.25rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-card:hover {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(55, 65, 81, 0.7);
}

/* Section headers */
.cf2-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cf2-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f9fafb;
}

/* Status card */
.cf2-status-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}

.cf2-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cf2-status-indicator {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #6b7280;
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-status-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.cf2-status-indicator.error {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.cf2-status-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e5e7eb;
}

/* Toggle components */
.cf2-toggle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cf2-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #e5e7eb;
}

.cf2-toggle {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  
  background: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.75rem;
  
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.cf2-toggle-slider {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-toggle.active .cf2-toggle-slider {
  transform: translateX(1.5rem);
}

/* Input groups */
.cf2-input-group {
  margin-bottom: 1rem;
}

.cf2-input-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  color: #d1d5db;
  margin-bottom: 0.5rem;
  
  cursor: help;
}

.cf2-command-input {
  width: 100%;
  padding: 0.75rem 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-size: 0.875rem;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-command-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-command-input::placeholder {
  color: #6b7280;
}

/* Textarea */
.cf2-textarea-container {
  margin-bottom: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cf2-textarea {
  width: 100%;
  min-height: 12rem;
  flex: 1;
  padding: 1rem;
  
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  
  color: #f9fafb;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  
  resize: vertical;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-textarea:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cf2-textarea::placeholder {
  color: #6b7280;
}

/* Button groups */
.cf2-button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Buttons */
.cf2-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  padding: 0.75rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Flex grow for equal width buttons */
  flex: 1;
  min-width: 0;
}

.cf2-button:hover {
  transform: translateY(-1px);
}

.cf2-button:active {
  transform: translateY(0);
}

.cf2-button-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.cf2-button-primary:hover {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.cf2-button-secondary {
  background: rgba(55, 65, 81, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #e5e7eb;
}

.cf2-button-secondary:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(75, 85, 99, 0.7);
}

.cf2-button-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.cf2-button-danger:hover {
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.cf2-button-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.cf2-button-warning:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

/* Help text */
.cf2-help-text {
  font-size: 0.8125rem;
  color: #9ca3af;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(17, 24, 39, 0.5);
  border: 1px solid rgba(55, 65, 81, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}

/* Regex help text styling */
.cf2-regex-help {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #d1d5db;
}

.cf2-regex-help code {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0.125rem;
}

/* File input */
.cf2-file-input {
  display: none;
}

/* Debug section */
.cf2-debug-section {
  margin-top: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf2-debug-section.cf2-collapsed {
  display: none;
}

.cf2-debug-info {
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #d1d5db;
  
  max-height: 12rem;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* Icons */
.cf2-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: filter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 白色アイコン専用クラス */
.cf2-icon-white {
  filter: invert(1) brightness(1) contrast(1.2);
}

.cf2-button:hover .cf2-icon-white,
.cf2-close-btn:hover .cf2-icon-white {
  filter: invert(1) brightness(1.1) contrast(1.3);
}

.cf2-button-primary .cf2-icon-white,
.cf2-button-danger .cf2-icon-white {
  filter: invert(1) brightness(1.2) contrast(1.2);
}

/* Responsive design */
@media (max-width: 1024px) {
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  .cf2-right-column {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .cf2-cockpit-hero {
    flex-direction: column;
  }

  .cf2-cockpit-apply {
    width: 100%;
  }

  .cf2-cockpit-metrics {
    grid-template-columns: 1fr;
  }

  .cf2-cockpit-nav {
    flex-wrap: wrap;
  }
  .cf2-container {
    width: min(95vw, 90vw);
    max-height: 95vh;
  }
  
  .cf2-header {
    padding: 1.5rem 1.5rem 0 1.5rem;
  }
  
  .cf2-content {
    padding: 0;
    gap: 0;
  }

  .cf2-workspace {
    grid-template-columns: 1fr;
  }

  .cf2-sidebar {
    position: sticky;
    top: 65px;
    z-index: 1;
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem;
    background: rgba(15, 23, 42, 0.96);
    border-right: 0;
    border-bottom: 1px solid rgba(75, 85, 99, 0.45);
  }

  .cf2-sidebar-item {
    flex: 0 0 auto;
    width: auto;
  }

  .cf2-workspace-main {
    padding: 1rem;
  }

  .cf2-dashboard-hero,
  .cf2-dashboard-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .cf2-dashboard-metrics {
    grid-template-columns: 1fr;
  }

  .cf2-workspace-main .cf2-command-grid .cf2-input-group {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }

  .cf2-workspace-main .cf2-data-card > .cf2-button-group,
  .cf2-workspace-main .cf2-settings-section {
    grid-template-columns: 1fr;
  }

  .cf2-workspace-main .cf2-settings-heading {
    grid-column: auto;
  }

  .cf2-rule-editor .cf2-pattern-grid {
    grid-template-columns: 1fr;
  }

  .cf2-builder-flow {
    grid-template-columns: 1fr;
  }

  .cf2-builder-condition {
    grid-column: auto;
  }

  .cf2-editor-actions .cf2-button {
    width: 100%;
  }
  
  .cf2-top-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .cf2-layout-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .cf2-button-group {
    flex-direction: column;
  }
  
  .cf2-button {
    flex: none;
  }
  
  .cf2-title {
    font-size: 1.125rem;
  }
  
  .cf2-main-card {
    min-height: 300px;
  }
  
}

/* Smooth entrance animation */
@keyframes cf2-fade-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) scale(1);
  }
}

.cf2-container {
  animation: cf2-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus management */
.cf2-container:focus-within {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 新しいUI要素のスタイル */

/* 形式切替タブ */
.cf2-format-selector {
  margin-bottom: 20px;
}

.cf2-format-tabs {
  display: flex;
  gap: 4px;
  margin-top: 12px;
}

.cf2-format-tab {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.cf2-format-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(74, 144, 226, 0.3);
}

.cf2-format-tab.active {
  background: rgba(74, 144, 226, 0.2);
  border-color: #4a90e2;
  color: #4a90e2;
}

/* 表示/非表示制御 */
.cf2-hidden {
  display: none !important;
}

/* ユーザーIDルール用の注意書きスタイル */
#cf2-userid-action-note {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  border-left: 4px solid #f59e0b;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #fbbf24;
}

/* テキスト入力 */
.cf2-text-input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cf2-text-input:focus {
  outline: none;
  border-color: #4a90e2;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.cf2-text-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* ラジオボタン */
.cf2-radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.cf2-radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #ffffff;
}

.cf2-radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #4a90e2;
}

/* セレクトボックス */
.cf2-select {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}

.cf2-select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* セレクトボックスのオプション */
.cf2-select option {
  background: #1f2937;
  color: #ffffff;
  padding: 8px 12px;
}

.cf2-select option:hover {
  background: #374151;
}

.cf2-select option:checked {
  background: #4a90e2;
  color: #ffffff;
}

/* 数値入力 */
.cf2-number-input {
  width: 80px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  text-align: center;
}

.cf2-number-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* 入力行（横並び） */
.cf2-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* ニコる数設定 */
.cf2-nicoru-settings {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

/* ルール一覧 */
.cf2-rules-list-card .cf2-section-header {
  justify-content: space-between;
}

.cf2-rule-count {
  background: rgba(74, 144, 226, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rules-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.cf2-rules-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.cf2-rule-item {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.cf2-rule-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cf2-rule-item:last-child {
  border-bottom: none;
}

.cf2-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cf2-rule-type {
  background: rgba(74, 144, 226, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #4a90e2;
}

.cf2-rule-actions {
  display: flex;
  gap: 4px;
}

.cf2-rule-content {
  font-size: 13px;
  color: #b8c5d1;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  word-break: break-all;
}

.cf2-rule-details {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 小さなボタン */
.cf2-button-small {
  padding: 6px 10px;
  font-size: 12px;
}

/* コマンド設定カード */
.cf2-command-settings-card {
  margin-bottom: 1.5rem;
}

.cf2-command-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* 設定セクション */
.cf2-settings-section {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cf2-settings-section .cf2-card {
  flex: 1;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .cf2-command-grid {
    grid-template-columns: 1fr;
  }
  
  .cf2-settings-section {
    flex-direction: column;
  }
}

/* ========================================
   正規表現複雑度分析スタイル
   ======================================== */

/* 分析結果コンテナ */
.cf2-regex-analysis {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid rgba(55, 65, 81, 0.5);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.cf2-regex-analysis-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.cf2-regex-analysis-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e5e7eb;
}

/* 複雑度バッジ */
.cf2-complexity-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cf2-complexity-low {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.cf2-complexity-medium {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.cf2-complexity-high {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.cf2-complexity-dangerous {
  background: rgba(220, 38, 38, 0.3);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.5);
  animation: cf2-pulse-danger 2s ease-in-out infinite;
}

@keyframes cf2-pulse-danger {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
  }
}

/* 警告リスト */
.cf2-regex-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cf2-regex-warning-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

/* 警告アイコン */
.cf2-regex-warning-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
}

/* 重要度別スタイル */
.cf2-severity-info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.cf2-severity-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.cf2-severity-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

/* 問題のあるパターン表示 */
.cf2-regex-problematic-part {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.75rem;
  color: #f87171;
  word-break: break-all;
}

/* 提案リスト */
.cf2-regex-suggestions {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(55, 65, 81, 0.3);
}

.cf2-regex-suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #86efac;
  margin-bottom: 0.5rem;
}

.cf2-regex-suggestion-item:last-child {
  margin-bottom: 0;
}

.cf2-regex-suggestion-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
  color: #22c55e;
}

/* 提案パターン */
.cf2-regex-suggested-pattern {
  display: block;
  margin-top: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, 'Liberation Mono', Consolas, monospace;
  font-size: 0.75rem;
  color: #4ade80;
}

/* リテラルパターンの最適化済み表示 */
.cf2-regex-analysis.cf2-literal-pattern {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.05);
}

.cf2-regex-literal-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #86efac;
}

.cf2-regex-literal-notice svg {
  color: #22c55e;
}

/* アニメーション */
.cf2-regex-analysis {
  animation: cf2-analysis-fade-in 0.3s ease-out;
}

@keyframes cf2-analysis-fade-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 警告なしの場合 */
.cf2-regex-no-warnings {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.8125rem;
  color: #9ca3af;
}
`;
