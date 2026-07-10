import type { CacheInfoResponse } from "@/types/video-types.js";

const toCacheInfoEntry = (
  videoId: string,
  cacheInfo: CacheInfoResponse,
): CacheInfoResponse[string] | undefined =>
  cacheInfo[videoId] ?? cacheInfo[videoId.toLowerCase()];

const extractHlsCacheId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const match = /([a-z]{2}\d+(?:low)?\[[^\]]+\]\.hls)/i.exec(decoded);
  return match?.[1] ?? null;
};

const toStringSet = (value: unknown): Set<string> => {
  const result = new Set<string>();
  const add = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }
    const cacheId = extractHlsCacheId(item);
    if (cacheId) result.add(cacheId);
  };
  add(value);
  return result;
};

/** キャッシュ情報から、完了済み/作成中それぞれの削除URLを生成する。 */
export const buildCacheRemovalPaths = (
  videoId: string,
  cacheInfo: CacheInfoResponse,
): string[] => {
  const entry = toCacheInfoEntry(videoId, cacheInfo);
  if (!entry) return [];

  const candidates = new Set<unknown>();
  const addCandidate = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(addCandidate);
      return;
    }
    candidates.add(value);
  };
  addCandidate(entry.preferred);
  addCandidate(entry.cacheIds);
  addCandidate(entry.completes);
  addCandidate(entry.cachings);
  addCandidate(entry.preferredDmcHls);
  addCandidate(entry.preferredDmc);

  if (entry.caches && typeof entry.caches === "object") {
    Object.entries(entry.caches).forEach(([cacheId, cache]) => {
      addCandidate(cacheId);
      if (cache && typeof cache === "object") {
        addCandidate(cache.cacheId);
        addCandidate(cache.filename);
      }
    });
  }

  const normalizedVideoId = videoId.toLowerCase();
  const completeCacheIds = toStringSet(entry.completes);
  const cachingCacheIds = toStringSet(entry.cachings);
  const paths = new Set<string>();
  candidates.forEach((candidate) => {
    const cacheId = extractHlsCacheId(candidate);
    if (!cacheId || !cacheId.toLowerCase().startsWith(normalizedVideoId))
      return;

    const cache = entry.caches?.[cacheId];
    const hasStatusInfo =
      completeCacheIds.size > 0 ||
      cachingCacheIds.size > 0 ||
      typeof cache?.complete === "boolean" ||
      typeof cache?.caching === "boolean";
    const isComplete =
      completeCacheIds.has(cacheId) ||
      cache?.complete === true ||
      (hasStatusInfo &&
        cache?.caching === false &&
        !cachingCacheIds.has(cacheId));
    const isCaching =
      cachingCacheIds.has(cacheId) || cache?.caching === true || !hasStatusInfo;

    if (isComplete) {
      paths.add(`/cache/ajax_rm?${cacheId}`);
    } else if (isCaching) {
      paths.add(`/cache/ajax_rmtmp?${cacheId}`);
    }
  });
  return [...paths];
};

export const fetchCacheInfo = async (
  videoId: string,
): Promise<CacheInfoResponse> => {
  const response = await fetch(
    `https://www.nicovideo.jp/cache/info/v2?${encodeURIComponent(videoId)}`,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as CacheInfoResponse;
};

export const removeCacheByPath = async (path: string): Promise<void> => {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = (await response.text()).trim();
  if (result !== "OK") throw new Error(result || "empty response");
};

/** 動画に紐付く完了済み/テンポラリHLSキャッシュをすべて削除する。 */
export const removeCacheForVideo = async (videoId: string): Promise<number> => {
  const cacheInfo = await fetchCacheInfo(videoId);
  const paths = buildCacheRemovalPaths(videoId, cacheInfo);
  if (paths.length === 0) {
    throw new Error("削除可能なHLSキャッシュが見つかりません");
  }
  for (const path of paths) await removeCacheByPath(path);
  return paths.length;
};
