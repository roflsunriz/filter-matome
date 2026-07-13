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
    ".nc-standalone-page",
    "display: flex; flex-direction: column; gap: 24px; min-height: 100dvh; padding-bottom: 48px;",
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
  page(".nc-player-surface", "box-sizing: border-box; padding: 16px;"),
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
  "@media (max-width: 640px) { .nc-standalone-page { gap: 16px; padding-bottom: 24px; } .nc-header, .nc-main, .nc-description { width: min(100% - 24px, 1440px); } .nc-player-surface, .nc-info-card, .nc-description { padding: 12px; } .nc-stat-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }",
  "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }",
].join("\n");
