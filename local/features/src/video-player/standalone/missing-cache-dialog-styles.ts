export const MISSING_CACHE_DIALOG_STYLES = `
.vp-missing-cache-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
}

.vp-missing-cache-dialog {
  width: min(520px, 100%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: #1f2329;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  color: #f4f7fb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.vp-missing-cache-dialog__header {
  padding: 18px 20px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.vp-missing-cache-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.vp-missing-cache-dialog__body {
  display: grid;
  gap: 10px;
  padding: 16px 20px 18px;
  font-size: 14px;
  line-height: 1.7;
}

.vp-missing-cache-dialog__body p {
  margin: 0;
}

.vp-missing-cache-dialog__meta {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #dce6f2;
  overflow-wrap: anywhere;
}

.vp-missing-cache-dialog__actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 18px;
}

.vp-missing-cache-dialog__button {
  min-width: 88px;
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  background: #4f9cff;
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.vp-missing-cache-dialog__button:hover,
.vp-missing-cache-dialog__button:focus-visible {
  background: #72b0ff;
  outline: 2px solid rgba(255, 255, 255, 0.75);
  outline-offset: 2px;
}
`;
