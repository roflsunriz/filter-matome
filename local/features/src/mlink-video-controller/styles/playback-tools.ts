export const playbackToolsStyles = `
.playback-tools { display: grid; gap: 10px; margin-block-start: 8px; min-width: 0; }
.playback-tool { border: 1px solid var(--panel-border, rgba(255,255,255,.15)); border-radius: 10px; padding: 10px; min-width: 0; }
.playback-tool-heading, .playback-tool-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.playback-tool strong { font-size: 14px; overflow-wrap: anywhere; }
.playback-tool p { font-size: 12px; line-height: 1.5; margin: 6px 0 0; overflow-wrap: anywhere; }
.playback-tool-help { opacity: .8; }
.playback-tool progress { width: 100%; margin-block-start: 8px; accent-color: var(--panel-accent); }
.playback-tool-btn { color: var(--panel-fg); background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 7px; padding: 7px 10px; font: inherit; font-size: 12px; cursor: pointer; overflow-wrap: anywhere; min-width: 0; }
.playback-tool-btn:hover:enabled { border-color: var(--panel-accent); }
.playback-tool-btn[aria-pressed="true"] { background: var(--panel-accent); color: white; }
.playback-tool-btn:disabled { opacity: .5; cursor: default; }
.playback-tool-btn:focus-visible, .ab-repeat-points input:focus-visible { outline: 2px solid var(--panel-accent); outline-offset: 2px; }
.ab-repeat-points { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-block: 8px; }
.ab-repeat-points label { display: flex; flex-direction: column; gap: 5px; min-width: 0; font-size: 12px; }
.ab-repeat-points input { width: 100%; min-width: 0; box-sizing: border-box; background: rgba(255,255,255,.06); color: var(--panel-fg); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; padding: 7px; font: inherit; }
.ab-repeat-points input[aria-invalid="true"] { border-color: #ff9d92; }
[data-ab-status][data-error="true"], [data-buffer-status][data-error="true"] { color: #ffb4ab; }
`;
