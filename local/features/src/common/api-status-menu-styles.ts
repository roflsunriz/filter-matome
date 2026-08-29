export const API_STATUS_MENU_STYLES = `
#filter-matome-api-status-menu {
  display: none;
}

#filter-matome-api-status-menu[data-filter-matome-mounted] {
  position: relative;
  display: flex;
  box-sizing: border-box;
  height: 36px;
  padding: 0 6px;
  flex: 0 0 auto;
  align-items: center;
  color: #fff;
  font: 400 12px/36px Avenir, Lato, -apple-system, BlinkMacSystemFont,
    "Helvetica Neue", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
}

#filter-matome-api-status-menu[data-filter-matome-mounted][hidden] {
  display: none;
}

#filter-matome-api-status-menu .filter-matome-api-status-trigger {
  all: unset;
  box-sizing: border-box;
  display: flex;
  height: 36px;
  padding: 0 2px;
  align-items: center;
  gap: 5px;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
}

#filter-matome-api-status-menu .filter-matome-api-status-trigger::after {
  width: 7px;
  height: 7px;
  margin-top: -4px;
  border-right: 2px solid #ddd;
  border-bottom: 2px solid #ddd;
  content: "";
  transform: rotate(45deg);
}

#filter-matome-api-status-menu:hover .filter-matome-api-status-trigger,
#filter-matome-api-status-menu:focus-within .filter-matome-api-status-trigger {
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
#filter-matome-api-status-menu [data-status="probing"]
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
  .filter-matome-api-status-dot,
#filter-matome-api-status-menu [data-status="probe-error"]
  .filter-matome-api-status-dot {
  background: #ef4444;
}

#filter-matome-api-status-menu .filter-matome-api-status-popover {
  position: absolute;
  top: 36px;
  left: 0;
  z-index: 100000;
  box-sizing: border-box;
  width: min(329px, calc(100vw - 16px));
  max-height: min(420px, calc(100vh - 16px));
  overflow: auto;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  border: 1px solid #d1d5db;
  background: #f4f4f4;
  color: #1f2937;
  box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
  transition: none;
}

#filter-matome-api-status-menu[data-filter-matome-mounted="account"][data-filter-matome-popover-align="right"]
  .filter-matome-api-status-popover {
  right: 0;
  left: auto;
}

#filter-matome-api-status-menu[data-filter-matome-mounted="account"][data-filter-matome-popover-align="left"]
  .filter-matome-api-status-popover {
  right: auto;
  left: 0;
}

#filter-matome-api-status-menu[data-filter-matome-mounted="account"] {
  position: fixed;
  z-index: 101001;
}

#filter-matome-api-status-menu[data-filter-matome-open="true"]
  .filter-matome-api-status-popover {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}

#filter-matome-api-status-menu .filter-matome-api-status-heading {
  margin: 0;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

#filter-matome-api-status-menu .filter-matome-api-status-list {
  display: grid;
  margin: 0;
  padding: 0;
  background: #fff;
  list-style: none;
}

#filter-matome-api-status-menu .filter-matome-api-status-item {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  width: 100%;
  min-height: 42px;
  margin: 0;
  padding: 8px 14px;
  align-items: center;
  gap: 9px;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  color: #333;
  font: 400 12px/1.4 Avenir, Lato, -apple-system, BlinkMacSystemFont,
    "Helvetica Neue", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
  text-align: start;
}

#filter-matome-api-status-menu .filter-matome-api-status-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
  background: #f4f4f4;
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
  background: #f4f4f4;
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
