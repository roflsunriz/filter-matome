import type { ExtendedNicoCache_nl } from "@/types/global-types";

const STANDALONE_PLAYER_PATH =
  "/local/features/dist/pages/video-player/index.html";
const VIDEO_ID_QUERY = /[?&]videoId=([a-z]{2}\d+)/i;

const getLocationSafe = (loc?: Location): Location => {
  return loc ?? window.location;
};

const hasVideoIdInQuery = (search: string | undefined): boolean => {
  if (typeof search !== "string") {
    return false;
  }
  return VIDEO_ID_QUERY.test(search);
};

const hasVideoIdInCache = (nicoCache: ExtendedNicoCache_nl | null): boolean => {
  if (!nicoCache) {
    return false;
  }
  const apiId = nicoCache.watch?.apiData?.video?.id;
  if (typeof apiId === "string" && apiId.trim().length > 0) {
    return true;
  }
  const getter = nicoCache.watch?.getVideoID;
  if (typeof getter === "function") {
    try {
      const value = getter();
      if (typeof value === "string" && value.trim().length > 0) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
};

const resolveNicoCache = (): ExtendedNicoCache_nl | null => {
  const global = (window as Window & { NicoCache_nl?: ExtendedNicoCache_nl })
    .NicoCache_nl;
  return global ?? null;
};

export const isStandalonePlayerRoute = (loc?: Location): boolean => {
  try {
    const location = getLocationSafe(loc);
    const pathname = location.pathname ?? "";
    if (!pathname.endsWith(STANDALONE_PLAYER_PATH)) {
      return false;
    }
    if (hasVideoIdInQuery(location.search ?? "")) {
      return true;
    }
    return hasVideoIdInCache(resolveNicoCache());
  } catch {
    return false;
  }
};

export const isWatchLikePage = (loc?: Location): boolean => {
  try {
    const location = getLocationSafe(loc);
    const pathname = location.pathname ?? "";
    if (pathname.includes("/watch/")) {
      return true;
    }
    return isStandalonePlayerRoute(location);
  } catch {
    return false;
  }
};
