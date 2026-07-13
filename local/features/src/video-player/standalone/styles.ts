import { MINIMAL_DARK_THEME_ROOT } from "@/common/visual-theme";
import { materialIconsStyles } from "@/common/material-icons";
import { COMMON_VIDEO_NAVIGATION_STYLES } from "@/common/video-navigation-styles";

const page = (selector: string, declarations: string): string =>
  `${selector} { ${declarations} }`;

export const STANDALONE_PAGE_STYLES = [
  MINIMAL_DARK_THEME_ROOT,
  materialIconsStyles,
  page(
    "html, body",
    "margin: 0; min-height: 100%; background: var(--nc-bg); color: var(--nc-text);",
  ),
  page(
    "body.nc-standalone-body",
    "min-height: 100dvh; overflow-x: hidden; font-family: var(--nc-font); line-height: 1.5;",
  ),
  page(
    'body.nc-standalone-body[data-comment-background-mode="background-image"] #nc-standalone-player-root::before',
    'content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none; background-attachment: var(--bg-att, fixed); background-blend-mode: var(--bg-bl-m, normal); background-clip: var(--bg-cl, border-box); background-color: var(--bg-col, var(--nc-bg)); background-image: var(--bg-img, none); background-origin: var(--bg-org, padding-box); background-position: var(--bg-pos, center); background-repeat: var(--bg-rep, no-repeat); background-size: var(--bg-siz, cover);',
  ),
  page("body.nc-fullscreen-active", "overflow: hidden; background: #000;"),
  page(
    "a",
    "color: var(--nc-primary); text-decoration: none; text-underline-offset: 3px;",
  ),
  page(
    "a:hover",
    "color: var(--nc-primary-hover); text-decoration: underline;",
  ),
  page(
    "a:focus-visible, input:focus-visible, button:focus-visible",
    "outline: 3px solid color-mix(in srgb, var(--nc-primary) 35%, transparent); outline-offset: 2px;",
  ),
  page(
    "#nc-standalone-player-root",
    "position: relative; isolation: isolate; min-height: 100dvh;",
  ),
  page(
    ".nc-standalone-page",
    "position: relative; z-index: 1; display: flex; flex-direction: column; gap: 24px; min-height: 100dvh; padding-bottom: 48px;",
  ),
  page(".nc-common-header-container", "width: 100%;"),
  page(
    ".nc-header, .nc-main, .nc-description",
    "box-sizing: border-box; width: min(100% - 32px, 1440px); margin-inline: auto;",
  ),
  page(".nc-header", "display: grid; gap: 10px;"),
  page(
    ".nc-header__breadcrumbs",
    "display: flex; align-items: center; gap: 8px; overflow: hidden; color: var(--nc-muted); font-size: 0.78rem; white-space: nowrap;",
  ),
  COMMON_VIDEO_NAVIGATION_STYLES,
  page(
    ".nc-header__title",
    "margin: 0; color: var(--nc-text); font-size: clamp(1.3rem, 2.4vw, 1.8rem); line-height: 1.4; overflow-wrap: anywhere;",
  ),
  page(
    ".nc-header__meta",
    "display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--nc-muted); font-size: 0.78rem;",
  ),
  page(".nc-main", "display: grid; gap: 20px;"),
  page(
    ".nc-player-surface, .nc-info-card, .nc-description",
    "background: var(--nc-surface); border: 1px solid var(--nc-border); border-radius: var(--nc-radius);",
  ),
  page(
    ".nc-player-surface-shell",
    "position: relative; min-width: 0; padding-top: 30px;",
  ),
  page(".nc-player-surface", "box-sizing: border-box; padding: 16px;"),
  page(
    ".nc-comment-background-toggle",
    'position: absolute; top: 0; right: 16px; z-index: 2; width: 64px; height: 24px; min-width: 64px; padding: 0; border: 1px solid #777; border-radius: var(--nc-radius-sm); background: linear-gradient(#fff, #d8d8d8); background-clip: padding-box; color: #111; font-family: "MS PGothic", "Meiryo", sans-serif; font-size: 12px; font-weight: bold; line-height: 22px; text-align: center; text-shadow: 0 1px 0 #fff; cursor: pointer; box-shadow: inset 0 1px rgba(255, 255, 255, .85), 0 1px 1px rgba(0, 0, 0, .25); box-sizing: border-box; overflow: hidden;',
  ),
  page(
    ".nc-comment-background-toggle:hover",
    "border-color: #555; background: linear-gradient(#fff, #cfcfcf);",
  ),
  page(
    ".nc-comment-background-toggle:focus-visible",
    "outline: 2px solid rgba(111, 156, 255, .9); outline-offset: 2px;",
  ),
  page(
    ".nc-comment-background-toggle__surface-icon, .nc-comment-background-toggle__image-icon",
    "position: absolute; top: 5px; z-index: 0; width: 14px; height: 14px; border-radius: 999px; box-sizing: border-box; pointer-events: none;",
  ),
  page(
    ".nc-comment-background-toggle__surface-icon",
    "left: 8px; border: 1px solid #555; background: linear-gradient(90deg, #111 0 50%, #fff 50% 100%);",
  ),
  page(
    ".nc-comment-background-toggle__image-icon",
    "right: 8px; border: 1px solid rgba(0, 0, 0, .35); background: conic-gradient(#f44336, #ffeb3b, #4caf50, #03a9f4, #3f51b5, #e91e63, #f44336);",
  ),
  page(
    ".nc-comment-background-toggle__knob",
    "position: absolute; left: 1px; top: 1px; z-index: 1; width: 22px; height: 22px; border: 1px solid #777; border-radius: 999px; background: linear-gradient(#fff, #dcdcdc); background-clip: padding-box; box-sizing: border-box; box-shadow: 0 1px 1px rgba(0, 0, 0, .35); pointer-events: none; transition: left .16s ease;",
  ),
  page(
    '.nc-comment-background-toggle[data-background-mode="background-image"] .nc-comment-background-toggle__knob',
    "left: 41px;",
  ),
  page(
    ':root[data-hy-theme="dark"] .nc-comment-background-toggle',
    "border-color: #666; background: linear-gradient(#3a3a3a, #202020); color: #eee; text-shadow: 0 -1px 0 #000;",
  ),
  page(
    ':root[data-hy-theme="dark"] .nc-comment-background-toggle__surface-icon',
    "border-color: #aaa;",
  ),
  page(
    ':root[data-hy-theme="dark"] .nc-comment-background-toggle__image-icon',
    "border-color: rgba(255, 255, 255, .55);",
  ),
  page(
    ':root[data-hy-theme="dark"] .nc-comment-background-toggle__knob',
    "border-color: #222; background: linear-gradient(#f5f5f5, #aaa);",
  ),
  page(".nc-player-host, #nc-player-mount", "min-width: 0;"),
  page(
    ".standalone-player-wrapper",
    "display: flex; align-items: flex-start; gap: 16px; width: 100%; min-width: 0;",
  ),
  page(
    ".standalone-player-wrapper .custom-player",
    "position: relative; flex: 1 1 auto; min-width: 0;",
  ),
  page(
    ".standalone-player-wrapper .custom-player:not(:fullscreen):not(.nc-fullscreen-player) .video-container",
    "position: relative; width: 100%; max-height: calc(100dvh - 180px); aspect-ratio: var(--video-aspect-ratio, 16 / 9); background: #000;",
  ),
  page(
    ".standalone-player-wrapper .comment-container",
    "box-sizing: border-box; display: flex; flex: 0 1 380px; flex-direction: column; width: clamp(280px, 26vw, 400px); min-width: 280px; max-height: calc(100dvh - 180px); overflow: hidden; padding: 12px; background: var(--nc-surface); border: 1px solid var(--nc-border); border-radius: var(--nc-radius);",
  ),
  page(".nc-info-card", "display: grid; gap: 20px; padding: 20px;"),
  page(
    ".nc-stat-list",
    "display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;",
  ),
  page(
    ".nc-stat-item",
    "display: grid; gap: 4px; min-width: 0; padding: 12px; background: var(--nc-surface-subtle); border-radius: var(--nc-radius);",
  ),
  page(".nc-stat-item__label", "color: var(--nc-muted); font-size: 0.75rem;"),
  page(
    ".nc-stat-item__value",
    "color: var(--nc-text); font-size: 1.05rem; font-weight: 700; overflow-wrap: anywhere;",
  ),
  page(
    ".nc-stat-item__auto-next-label",
    "display: flex; align-items: center; gap: 8px; cursor: inherit;",
  ),
  page(
    ".nc-stat-item__auto-next-checkbox",
    "width: 16px; height: 16px; margin: 0; accent-color: var(--nc-primary); cursor: inherit;",
  ),
  page(".nc-stat-item--auto-next", "cursor: pointer;"),
  page(".nc-stat-item--disabled", "cursor: default; opacity: .52;"),
  page(".nc-tag-cloud", "display: flex; flex-wrap: wrap; gap: 8px;"),
  page(
    ".nc-tag",
    "display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--nc-surface-subtle); border-radius: 999px; color: var(--nc-text); font-size: .78rem;",
  ),
  page(".nc-tag__link", "color: inherit;"),
  page(
    ".nc-tag__nicopedia",
    "display: grid; place-items: center; width: 18px; height: 18px; background: var(--nc-surface); border-radius: var(--nc-radius-sm); color: var(--nc-primary);",
  ),
  page(".nc-tag__nicopedia-icon", "display: block;"),
  page(".nc-owner", "display: flex; align-items: center; gap: 12px;"),
  page(
    ".nc-owner img",
    "width: 48px; height: 48px; object-fit: cover; border: 1px solid var(--nc-border); border-radius: 50%;",
  ),
  page(".nc-owner__info", "display: grid; gap: 3px; min-width: 0;"),
  page(".nc-owner__name", "font-weight: 700; overflow-wrap: anywhere;"),
  page(".nc-owner__link", "font-size: .78rem;"),
  page(
    ".nc-section-title",
    "margin: 0; color: var(--nc-text); font-size: 1rem;",
  ),
  page(".nc-series", "display: grid; gap: 8px;"),
  page(
    ".nc-series__item",
    "display: grid; gap: 4px; padding: 10px 12px; background: var(--nc-surface-subtle); border-radius: var(--nc-radius);",
  ),
  page(".nc-empty", "color: var(--nc-muted); font-size: .82rem;"),
  page(
    ".nc-description",
    "padding: 20px; color: var(--nc-text); font-size: .9rem; line-height: 1.75; overflow-wrap: anywhere;",
  ),
  page(".nc-description > :first-child", "margin-top: 0;"),
  page(".nc-description > :last-child", "margin-bottom: 0;"),
  page(
    ".nc-description img",
    "max-width: 100%; height: auto; border-radius: var(--nc-radius-sm);",
  ),
  page(
    ".nc-standalone-page--deleted .nc-player-surface",
    "border-color: color-mix(in srgb, var(--nc-danger) 45%, var(--nc-border));",
  ),
  "@media (max-width: 960px) { .standalone-player-wrapper { flex-direction: column; } .standalone-player-wrapper .comment-container { width: 100%; min-width: 0; max-height: 360px; } }",
  "@media (max-width: 640px) { .nc-standalone-page { gap: 16px; padding-bottom: 24px; } .nc-header, .nc-main, .nc-description { width: min(100% - 24px, 1440px); } .nc-player-surface, .nc-info-card, .nc-description { padding: 12px; } .nc-comment-background-toggle { right: 12px; } .nc-stat-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }",
  "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }",
].join("\n");
