const rule = (selector: string, declarations: string): string =>
  `${selector} { ${declarations} }`;

export const COMMON_VIDEO_NAVIGATION_STYLES = [
  rule(
    ".common-video-navigation",
    "display: grid; gap: 6px; width: 100%; max-width: 920px;",
  ),
  rule(
    ".common-video-navigation__label",
    "color: var(--nc-muted); font-size: 0.78rem;",
  ),
  rule(
    ".common-video-navigation__controls",
    "display: flex; align-items: stretch; gap: 8px; min-width: 0;",
  ),
  rule(
    ".common-video-navigation__input",
    "box-sizing: border-box; min-width: 0; flex: 1 1 auto; min-height: 40px; padding: 8px 12px; background: var(--nc-surface); border: 1px solid var(--nc-border); border-radius: var(--nc-radius-sm); color: var(--nc-text); font: inherit;",
  ),
  rule(
    ".common-video-navigation__input::placeholder",
    "color: var(--nc-muted); opacity: 0.8;",
  ),
  rule(
    ".common-video-navigation__submit",
    "display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 8px 14px; border: 1px solid transparent; border-radius: var(--nc-radius-sm); background: var(--nc-primary); color: var(--nc-primary-contrast); font: inherit; font-weight: 700; cursor: pointer;",
  ),
  rule(
    "button.common-video-navigation__submit:hover:not(:disabled)",
    "background: var(--nc-primary-hover);",
  ),
  rule(
    ".common-video-navigation__submit:disabled",
    "cursor: wait; opacity: .62;",
  ),
  rule(
    ".common-video-navigation__search",
    "border-color: var(--nc-border); background: var(--nc-surface-subtle); color: var(--nc-text);",
  ),
  rule(
    "button.common-video-navigation__search:hover:not(:disabled)",
    "background: color-mix(in srgb, var(--nc-surface-subtle) 78%, var(--nc-primary));",
  ),
  rule(
    ".common-video-navigation__message",
    "min-height: 1.35em; margin: 0; color: var(--nc-danger); font-size: 0.78rem;",
  ),
  rule(
    ".common-cache-search-results",
    "box-sizing: border-box; max-height: min(52dvh, 520px); overflow: hidden; background: var(--nc-surface); border: 1px solid var(--nc-border); border-radius: var(--nc-radius);",
  ),
  rule(".common-cache-search-results[hidden]", "display: none;"),
  rule(
    ".common-cache-search-results__status",
    "margin: 0; padding: 10px 12px; color: var(--nc-muted); border-bottom: 1px solid var(--nc-border); font-size: .78rem;",
  ),
  rule(
    ".common-cache-search-results__status--error",
    "color: var(--nc-danger);",
  ),
  rule(
    ".common-cache-search-results__list",
    "max-height: min(44dvh, 440px); margin: 0; padding: 0; overflow-y: auto; list-style: none; overscroll-behavior: contain;",
  ),
  rule(
    ".common-cache-search-results__item + .common-cache-search-results__item",
    "border-top: 1px solid var(--nc-border);",
  ),
  rule(
    ".common-cache-search-results__select",
    "display: grid; gap: 3px; box-sizing: border-box; width: 100%; padding: 11px 12px; background: transparent; border: 0; border-radius: 0; color: var(--nc-text); font: inherit; text-align: start; cursor: pointer;",
  ),
  rule(
    ".common-cache-search-results__select:hover",
    "background: var(--nc-surface-subtle);",
  ),
  rule(
    ".common-cache-search-results__title",
    "font-weight: 700; line-height: 1.45; overflow-wrap: anywhere;",
  ),
  rule(
    ".common-cache-search-results__meta, .common-cache-search-results__variants",
    "color: var(--nc-muted); font-size: .76rem; overflow-wrap: anywhere;",
  ),
  "@media (max-width: 560px) { .common-video-navigation__controls { display: grid; grid-template-columns: 1fr 1fr; } .common-video-navigation__input { grid-column: 1 / -1; width: 100%; } .common-video-navigation__submit { width: 100%; } .common-cache-search-results { max-height: min(58dvh, 520px); } .common-cache-search-results__list { max-height: min(49dvh, 440px); } }",
].join("\n");
