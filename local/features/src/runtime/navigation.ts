export const FILTER_MATOME_NAVIGATION_EVENT = "filter-matome:navigation";

export type NavigationSource =
  "pushState" | "replaceState" | "popstate" | "hashchange";

export interface FilterMatomeNavigationDetail {
  previousUrl: string;
  url: string;
  source: NavigationSource;
}

type NavigationRuntimeWindow = Window & {
  __filterMatomeNavigationInstalled?: boolean;
};

export function addNavigationListener(
  listener: (detail: FilterMatomeNavigationDetail) => void,
): () => void {
  const eventListener = (event: Event): void => {
    listener((event as CustomEvent<FilterMatomeNavigationDetail>).detail);
  };
  window.addEventListener(FILTER_MATOME_NAVIGATION_EVENT, eventListener);
  return () => {
    window.removeEventListener(FILTER_MATOME_NAVIGATION_EVENT, eventListener);
  };
}

export function installNavigationMonitor(): void {
  const runtimeWindow = window as NavigationRuntimeWindow;
  if (runtimeWindow.__filterMatomeNavigationInstalled) {
    return;
  }
  runtimeWindow.__filterMatomeNavigationInstalled = true;

  let currentUrl = window.location.href;
  const notify = (source: NavigationSource): void => {
    const url = window.location.href;
    if (url === currentUrl) {
      return;
    }
    const previousUrl = currentUrl;
    currentUrl = url;
    window.dispatchEvent(
      new CustomEvent<FilterMatomeNavigationDetail>(
        FILTER_MATOME_NAVIGATION_EVENT,
        { detail: { previousUrl, url, source } },
      ),
    );
  };

  const wrapHistoryMethod = (method: "pushState" | "replaceState"): void => {
    const original = history[method];
    history[method] = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ): ReturnType<History["pushState"]> {
      const result = original.apply(this, args);
      queueMicrotask(() => notify(method));
      return result;
    } as History["pushState"];
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", () => notify("popstate"));
  window.addEventListener("hashchange", () => notify("hashchange"));
}
