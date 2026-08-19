/**
 * 各機能で共有するダークテーマのビジュアルトークン。
 * 各機能は固有の接頭辞付き変数へ必要な値だけ割り当てて使用する。
 */
export const MINIMAL_DARK_THEME_TOKENS = `
  --nc-bg: #11151b;
  --nc-surface: #1a2029;
  --nc-surface-subtle: #242c37;
  --nc-text: #edf1f7;
  --nc-muted: #a9b4c3;
  --nc-border: #364151;
  --nc-primary: #6f9cff;
  --nc-primary-hover: #8bafff;
  --nc-primary-contrast: #0d1b36;
  --nc-danger: #ffb4ab;
  --nc-danger-bg: #3f2022;
  --nc-success: #8bd5a5;
  --nc-warning: #f2c879;
  --nc-radius-sm: 6px;
  --nc-radius: 10px;
  --nc-radius-lg: 12px;
  --nc-shadow-raised: 0 12px 30px rgba(0, 0, 0, 0.24);
  --nc-focus-ring: 0 0 0 3px color-mix(in srgb, var(--nc-primary) 35%, transparent);
  --nc-font: system-ui, -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
`;

export const MINIMAL_DARK_THEME_ROOT = `
:root {
  color-scheme: dark;
  ${MINIMAL_DARK_THEME_TOKENS}
}
`;
