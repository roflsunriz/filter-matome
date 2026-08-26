export const API_STATUS_MENU_STYLES = `
#filter-matome-api-status-menu {
  position: fixed;
  top: var(--filter-matome-api-status-trigger-top, 0);
  left: var(--filter-matome-api-status-trigger-left, 0);
  z-index: 101050;
  display: none;
  box-sizing: border-box;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  color: #fff;
  font: 400 12px/1.4 Avenir, Lato, -apple-system, BlinkMacSystemFont,
    "Helvetica Neue", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
}

#filter-matome-api-status-menu[data-mounted="true"] {
  display: flex;
}

#filter-matome-api-status-menu .filter-matome-api-status-trigger {
  all: unset;
  box-sizing: border-box;
  display: flex;
  height: 36px;
  padding: 0 8px;
  align-items: center;
  gap: 6px;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
}

#filter-matome-api-status-menu .filter-matome-api-status-trigger:hover,
#filter-matome-api-status-menu .filter-matome-api-status-trigger:focus-visible {
  background: rgb(255 255 255 / 8%);
}

#filter-matome-api-status-menu .filter-matome-api-status-trigger:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -2px;
}

#filter-matome-api-status-menu .filter-matome-api-status-summary,
#filter-matome-api-status-menu .filter-matome-api-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 50%;
  background: #9ca3af;
}

#filter-matome-api-status-menu[data-summary="active"]
  .filter-matome-api-status-summary,
#filter-matome-api-status-menu [data-status="active"]
  .filter-matome-api-status-dot {
  background: #22c55e;
}

#filter-matome-api-status-menu[data-summary="warning"]
  .filter-matome-api-status-summary,
#filter-matome-api-status-menu [data-status="waiting"]
  .filter-matome-api-status-dot,
#filter-matome-api-status-menu [data-status="not-applicable"]
  .filter-matome-api-status-dot {
  background: #f59e0b;
}

#filter-matome-api-status-menu[data-summary="error"]
  .filter-matome-api-status-summary,
#filter-matome-api-status-menu [data-status="missing"]
  .filter-matome-api-status-dot,
#filter-matome-api-status-menu [data-status="incompatible"]
  .filter-matome-api-status-dot {
  background: #ef4444;
}

#filter-matome-api-status-menu .filter-matome-api-status-popover {
  position: fixed;
  top: var(--filter-matome-api-status-top, 44px);
  left: var(--filter-matome-api-status-left, 8px);
  z-index: 101100;
  box-sizing: border-box;
  width: min(360px, calc(100vw - 16px));
  max-height: min(420px, calc(100vh - 16px));
  overflow: auto;
  overscroll-behavior: contain;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  border: 1px solid #d1d5db;
  border-radius: 0 0 6px 6px;
  background: #fff;
  color: #1f2937;
  box-shadow: 0 4px 14px rgb(0 0 0 / 24%);
}

#filter-matome-api-status-menu[data-popover-placement="above"]
  .filter-matome-api-status-popover {
  border-radius: 6px 6px 0 0;
}

#filter-matome-api-status-menu[data-open="true"]
  .filter-matome-api-status-popover {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}

#filter-matome-api-status-menu .filter-matome-api-status-heading {
  margin: 0;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 700;
}

#filter-matome-api-status-menu .filter-matome-api-status-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

#filter-matome-api-status-menu .filter-matome-api-status-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  min-height: 46px;
  padding: 9px 14px;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid #eef0f2;
}

#filter-matome-api-status-menu .filter-matome-api-status-name {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
}

#filter-matome-api-status-menu .filter-matome-api-status-value {
  color: #4b5563;
  font-size: 11px;
  text-align: end;
  white-space: nowrap;
}

#filter-matome-api-status-menu .filter-matome-api-status-note {
  margin: 0;
  padding: 9px 14px 11px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 11px;
  line-height: 1.5;
}

@media (forced-colors: active) {
  #filter-matome-api-status-menu .filter-matome-api-status-summary,
  #filter-matome-api-status-menu .filter-matome-api-status-dot {
    forced-color-adjust: none;
  }
}
`;
