const WATCH_FULLSCREEN_TARGET_SELECTOR =
  '[data-styling-name="fullscreen-target"]';
const VIEWPORT_EDGE_TOLERANCE_PX = 4;

/**
 * Fullscreen API と公式Watchのブラウザー内全画面を同じ状態として判定する。
 */
export function isWatchFullscreenActive(): boolean {
  if (document.fullscreenElement) {
    return true;
  }

  const target = document.querySelector<HTMLElement>(
    WATCH_FULLSCREEN_TARGET_SELECTOR,
  );
  if (!target || getComputedStyle(target).position !== "fixed") {
    return false;
  }

  const rect = target.getBoundingClientRect();
  const tolerance = VIEWPORT_EDGE_TOLERANCE_PX;
  return (
    rect.left <= tolerance &&
    rect.top <= tolerance &&
    rect.right >= window.innerWidth - tolerance &&
    rect.bottom >= window.innerHeight - tolerance
  );
}
