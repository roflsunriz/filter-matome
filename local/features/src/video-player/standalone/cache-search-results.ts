import type { CacheSearchResult } from "@/video-player/standalone/cache-search-client";

const MAX_VISIBLE_RESULTS = 50;

const byteFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatBytes = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${byteFormatter.format(value)} ${units[unitIndex]}`;
};

const formatTimestamp = (timestamp: number): string =>
  timestamp > 0
    ? dateFormatter.format(new Date(timestamp * 1000))
    : "更新日時不明";

const getCacheVariantLabel = (result: CacheSearchResult): string => {
  const labels = result.cacheIds.map((cacheId) => {
    const suffix = cacheId.slice(result.videoId.length);
    return suffix || cacheId;
  });
  return labels.join(" / ");
};

export interface CacheSearchResultsView {
  root: HTMLElement;
  clear: () => void;
  showLoading: (query: string) => void;
  showError: (message: string) => void;
  showResults: (query: string, results: CacheSearchResult[]) => void;
}

export const createCacheSearchResults = (
  onSelect: (videoId: string) => void,
): CacheSearchResultsView => {
  const root = document.createElement("section");
  root.className = "nc-cache-search-results";
  root.hidden = true;
  root.setAttribute("aria-label", "キャッシュ検索結果");

  const status = document.createElement("p");
  status.className = "nc-cache-search-results__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.className = "nc-cache-search-results__list";

  const clearList = (): void => {
    list.replaceChildren();
  };

  const showPanel = (): void => {
    root.hidden = false;
  };

  const clear = (): void => {
    clearList();
    status.textContent = "";
    root.removeAttribute("aria-busy");
    root.hidden = true;
  };

  const showLoading = (query: string): void => {
    clearList();
    status.className = "nc-cache-search-results__status";
    status.textContent = `「${query}」を検索しています…`;
    root.setAttribute("aria-busy", "true");
    showPanel();
  };

  const showError = (message: string): void => {
    clearList();
    status.className =
      "nc-cache-search-results__status nc-cache-search-results__status--error";
    status.textContent = message;
    root.removeAttribute("aria-busy");
    showPanel();
  };

  const showResults = (query: string, results: CacheSearchResult[]): void => {
    clearList();
    status.className = "nc-cache-search-results__status";
    root.removeAttribute("aria-busy");

    if (results.length === 0) {
      status.textContent = `「${query}」に一致する完成済みキャッシュはありません。`;
      showPanel();
      return;
    }

    const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
    status.textContent =
      results.length > MAX_VISIBLE_RESULTS
        ? `${results.length}件中、更新日時の新しい${MAX_VISIBLE_RESULTS}件を表示しています。`
        : `${results.length}件の動画キャッシュが見つかりました。`;

    for (const result of visibleResults) {
      const item = document.createElement("li");
      item.className = "nc-cache-search-results__item";

      const button = document.createElement("button");
      button.className = "nc-cache-search-results__select";
      button.type = "button";
      button.dataset.videoId = result.videoId;
      button.setAttribute(
        "aria-label",
        `${result.title}（${result.videoId}）を再生`,
      );

      const title = document.createElement("span");
      title.className = "nc-cache-search-results__title";
      title.textContent = result.title;

      const meta = document.createElement("span");
      meta.className = "nc-cache-search-results__meta";
      meta.textContent = [
        result.videoId,
        `${result.cacheIds.length}キャッシュ`,
        formatBytes(result.totalSize),
        formatTimestamp(result.newestTimestamp),
      ].join(" · ");

      const variants = document.createElement("span");
      variants.className = "nc-cache-search-results__variants";
      variants.textContent = getCacheVariantLabel(result);

      button.append(title, meta, variants);
      button.addEventListener("click", () => onSelect(result.videoId));
      item.append(button);
      list.append(item);
    }

    showPanel();
  };

  root.append(status, list);
  return { root, clear, showLoading, showError, showResults };
};
