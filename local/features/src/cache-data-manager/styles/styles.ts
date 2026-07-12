import { materialIconsStyles } from "@/common/material-icons.js";
import { MINIMAL_DARK_THEME_TOKENS } from "@/common/visual-theme";

export const cacheListStyles =
  materialIconsStyles +
  `
  :root {
    color-scheme: dark;
    ${MINIMAL_DARK_THEME_TOKENS}
    --cdm-bg: var(--nc-bg);
    --cdm-surface: var(--nc-surface);
    --cdm-surface-subtle: var(--nc-surface-subtle);
    --cdm-text: var(--nc-text);
    --cdm-muted: var(--nc-muted);
    --cdm-border: var(--nc-border);
    --cdm-primary: var(--nc-primary);
    --cdm-primary-hover: var(--nc-primary-hover);
    --cdm-danger: var(--nc-danger);
    --cdm-danger-bg: var(--nc-danger-bg);
    --cdm-radius: var(--nc-radius);
  }

  * { box-sizing: border-box; }
  body { margin: 0; background: var(--cdm-bg); color: var(--cdm-text); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  button, input, select, summary { font: inherit; }
  button, summary { cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid color-mix(in srgb, var(--cdm-primary) 35%, transparent); outline-offset: 2px; }

  header { position: relative; z-index: 20; background: var(--cdm-surface); border-bottom: 1px solid var(--cdm-border); }
  .header-content { max-width: 1600px; margin: 0 auto; padding: 14px 20px; display: grid; gap: 14px; }
  .header-top-row, .header-brand, .header-controls-row, .main-nav, .search-box, .search-section { display: flex; align-items: center; }
  .header-top-row { justify-content: space-between; gap: 16px; }
  .header-brand { gap: 10px; min-width: max-content; }
  .header-title { font-size: 1.2rem; font-weight: 700; letter-spacing: .01em; }
  .header-version { padding: 3px 8px; border-radius: 999px; background: var(--cdm-surface-subtle); color: var(--cdm-muted); font-size: .75rem; }
  .main-nav { gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  .nav-link { color: var(--cdm-muted); padding: 6px 8px; border-radius: 6px; text-decoration: none; font-size: .84rem; }
  .nav-link:hover { color: var(--cdm-text); background: var(--cdm-surface-subtle); }
  .nav-link-icon { display: none; }
  .header-controls-row { gap: 12px; align-items: flex-end; }
  .search-box { flex: 1 1 300px; gap: 8px; flex-wrap: wrap; }
  .search-box > .search-label { width: 100%; color: var(--cdm-muted); font-size: .76rem; font-weight: 600; }
  #searchInput { min-width: 180px; flex: 1; height: 38px; border: 1px solid var(--cdm-border); border-radius: 8px; padding: 0 11px; color: var(--cdm-text); background: var(--cdm-surface); }
  .search-section { gap: 6px; }

  button, .bulk-actions > summary, .card-more > summary { min-height: 36px; border: 1px solid var(--cdm-border); border-radius: 8px; padding: 7px 11px; background: var(--cdm-surface); color: var(--cdm-text); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  button:hover, .bulk-actions > summary:hover, .card-more > summary:hover { background: var(--cdm-surface-subtle); }
  button:disabled { cursor: not-allowed; opacity: .55; }
  #searchBtn, .play-btn { background: var(--cdm-primary); border-color: var(--cdm-primary); color: #0d1b36; }
  #searchBtn:hover, .play-btn:hover { background: var(--cdm-primary-hover); }

  .filter-sort-container { flex: 2 1 620px; display: flex; align-items: flex-end; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .filter-group, .sort-group, .filter-actions { display: flex; align-items: center; gap: 6px; }
  .filter-label, .sort-label { color: var(--cdm-muted); font-size: .76rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
  .filter-select, .sort-select { height: 38px; max-width: 180px; border: 1px solid var(--cdm-border); border-radius: 8px; padding: 0 30px 0 9px; background: var(--cdm-surface); color: var(--cdm-text); }
  .sort-direction-btn { width: 38px; padding: 0; }
  .result-count { order: -1; min-width: max-content; color: var(--cdm-muted); font-size: .84rem; padding: 8px 4px; }
  .bulk-actions, .card-more { position: relative; }
  .bulk-actions > summary, .card-more > summary { list-style: none; }
  .bulk-actions > summary::-webkit-details-marker, .card-more > summary::-webkit-details-marker { display: none; }
  .bulk-actions-menu, .card-more-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; min-width: 220px; padding: 6px; border: 1px solid var(--cdm-border); border-radius: var(--cdm-radius); background: var(--cdm-surface); box-shadow: 0 12px 30px rgba(24, 32, 42, .16); }
  .bulk-actions-menu button, .card-more-menu button { width: 100%; justify-content: flex-start; border-color: transparent; }
  .delete-temporary-btn, .delete-btn { color: var(--cdm-danger); }

  .virtual-scroll-container { width: 100%; min-height: 100vh; overflow-anchor: none; background: var(--cdm-bg); }
  .virtual-scroll-content, .virtual-scroll-grid, .virtual-scroll-spacer { overflow-anchor: none; }
  .virtual-scroll-grid, .cache-container, .search-results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; padding: 16px; position: relative; }
  .virtual-scroll-spacer { width: 100%; pointer-events: none; }

  .video-card { height: 300px !important; min-height: 300px !important; max-height: 300px !important; min-width: 0; display: flex; flex-direction: column; overflow: visible; border: 1px solid var(--cdm-border); border-radius: var(--cdm-radius); background: var(--cdm-surface); transition: border-color .15s ease, box-shadow .15s ease; }
  .video-card:hover { border-color: #536176; box-shadow: 0 5px 18px rgba(0, 0, 0, .28); }
  .card-header { height: 28px; flex: 0 0 28px; display: flex; align-items: center; padding: 0 10px; color: var(--cdm-muted); font-size: .76rem; }
  .thumbnail-container { height: 112px; flex: 0 0 112px; overflow: hidden; background: var(--cdm-surface-subtle); }
  .thumbnail-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumbnail-image.lazy-placeholder { opacity: .55; }
  .thumbnail-image.lazy-loaded { opacity: 1; }
  .thumbnail-image.lazy-error, .unavailable-video .thumbnail-image { filter: grayscale(1); opacity: .65; }
  .video-info { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; padding: 10px; overflow: hidden; }
  .video-title { height: 2.7em; margin: 0; color: var(--cdm-text); font-size: .88rem; line-height: 1.35; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .metadata { height: 30px; margin-top: auto; display: flex; align-items: center; gap: 5px; overflow: hidden; }
  .metadata > span { min-width: 0; padding: 3px 7px; border-radius: 999px; background: var(--cdm-surface-subtle); color: var(--cdm-muted); font-size: .68rem; white-space: nowrap; }
  .metadata > span[hidden] { display: none; }
  .quality-badge { color: var(--cdm-text) !important; }
  .availability-badge { background: var(--cdm-danger-bg) !important; color: var(--cdm-danger) !important; }
  .card-actions { height: 44px; flex: 0 0 44px; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 8px 8px; }
  .card-actions button, .card-more > summary { min-height: 32px; padding: 5px 9px; font-size: .8rem; }
  .play-btn { flex: 1; }
  .card-more-menu { bottom: calc(100% + 6px); top: auto; min-width: 170px; }

  .global-progress { display: none; position: sticky; top: 0; z-index: 100; min-height: 34px; padding: 7px 16px; align-items: center; gap: 12px; background: var(--cdm-surface); border-bottom: 1px solid var(--cdm-border); }
  .progress-bar { flex: 1; height: 5px; overflow: hidden; border-radius: 999px; background: var(--cdm-border); }
  .progress-fill { height: 100%; width: 0; background: var(--cdm-primary); transition: width .2s ease; }
  .progress-fill.error { background: var(--cdm-danger); }
  .progress-text { color: var(--cdm-muted); font-size: .8rem; white-space: nowrap; }

  .detail-modal, .search-results-modal { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(18, 24, 32, .68); }
  .modal-content, .search-results-modal-content { width: min(100%, 1100px); max-height: calc(100dvh - 40px); overflow: auto; position: relative; border-radius: 12px; background: var(--cdm-surface); color: var(--cdm-text); box-shadow: 0 22px 60px rgba(0, 0, 0, .25); }
  .modal-content { max-width: 640px; padding: 24px; }
  .close-btn, .search-results-modal-close { position: absolute; top: 12px; right: 12px; width: 38px; height: 38px; padding: 0; border-radius: 50%; }
  .modal-body { display: grid; grid-template-columns: minmax(140px, 1fr) 2fr; gap: 20px; }
  .modal-thumbnail { width: 100%; border-radius: 8px; }
  .modal-info p { margin: 6px 0; }
  .modal-tags span { display: inline-block; margin: 3px; padding: 3px 8px; border-radius: 999px; background: var(--cdm-surface-subtle); }
  .error-message { padding: 14px; border-left: 4px solid var(--cdm-danger); background: var(--cdm-danger-bg); color: var(--cdm-danger); }
  .search-results-modal { opacity: 0; transition: opacity .15s ease; background: transparent; }
  .search-results-modal.open { opacity: 1; }
  .search-results-modal-overlay { position: absolute; inset: 0; background: rgba(18, 24, 32, .68); }
  .search-results-modal-content { display: flex; flex-direction: column; height: min(900px, calc(100dvh - 40px)); overflow: hidden; }
  .search-results-modal-header, .search-results-modal-footer { flex: 0 0 auto; padding: 16px 20px; border-bottom: 1px solid var(--cdm-border); background: var(--cdm-surface); }
  .search-results-modal-title { display: grid; gap: 3px; }
  .search-query { font-size: 1.15rem; font-weight: 700; }
  .search-count { color: var(--cdm-muted); font-size: .84rem; }
  .search-results-modal-body { flex: 1; overflow-y: auto; background: var(--cdm-bg); }
  .search-results-modal-footer { border-top: 1px solid var(--cdm-border); border-bottom: 0; }
  .search-results-pagination { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .pagination-info { color: var(--cdm-muted); }
  .search-no-results, .no-results { grid-column: 1 / -1; padding: 48px 20px; text-align: center; color: var(--cdm-muted); }

  .scroll-to-top-btn { position: fixed; right: 20px; bottom: 20px; z-index: 900; width: 44px; height: 44px; padding: 0; border-radius: 50%; background: var(--cdm-primary); border-color: var(--cdm-primary); color: #0d1b36; box-shadow: 0 5px 18px rgba(0, 0, 0, .28); }

  @media (max-width: 1100px) {
    .header-top-row { align-items: flex-start; }
    .main-nav { display: none; }
    .header-controls-row { align-items: stretch; }
    .filter-sort-container { justify-content: flex-start; }
  }
  @media (max-width: 700px) {
    .header-content { padding: 12px; }
    .header-version { display: none; }
    .header-controls-row, .filter-sort-container { display: grid; grid-template-columns: 1fr; }
    .search-box, .filter-group, .sort-group, .filter-actions { width: 100%; }
    .filter-group, .sort-group { display: grid; grid-template-columns: auto minmax(0, 1fr); }
    .filter-select, .sort-select { max-width: none; width: 100%; }
    .filter-actions { flex-wrap: wrap; }
    .result-count { width: 100%; }
    .virtual-scroll-grid, .cache-container, .search-results-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; padding: 12px; }
    .modal-body { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }
  `;
