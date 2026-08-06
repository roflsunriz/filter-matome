export type FeaturePage =
  "mylist" | "movie-info" | "movie-fetcher" | "video-player" | "watch-history";

const WATCH_PATH_PATTERN = /^\/watch\/([a-z]{2}\d+)(?:\/)?$/i;
const MLINK_HOSTS = new Set([
  "www",
  "q",
  "qa",
  "news",
  "3d",
  "koken",
  "commons",
  "ch",
  "anime",
  "live",
  "live2",
  "dic",
  "seiga",
  "site",
  "blog",
  "account",
  "creator-support",
]);

export function getFeaturePage(): FeaturePage | null {
  const value = document.documentElement.dataset["featurePage"];
  switch (value) {
    case "mylist":
    case "movie-info":
    case "movie-fetcher":
    case "video-player":
    case "watch-history":
      return value;
    default:
      return null;
  }
}

export function isNiconicoPage(loc: Location = window.location): boolean {
  return (
    loc.hostname === "nicovideo.jp" || loc.hostname.endsWith(".nicovideo.jp")
  );
}

export function isMlinkPage(loc: Location = window.location): boolean {
  if (!isNiconicoPage(loc)) {
    return false;
  }
  const subdomain = loc.hostname.slice(0, -".nicovideo.jp".length);
  return MLINK_HOSTS.has(subdomain);
}

export function isWatchPage(loc: Location = window.location): boolean {
  return (
    loc.hostname === "www.nicovideo.jp" && WATCH_PATH_PATTERN.test(loc.pathname)
  );
}
