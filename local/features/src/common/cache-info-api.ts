import type {
  CacheInfoEntry,
  CacheInfoItem,
  CacheInfoResponse,
} from "@/types/cache-info-types";

export const CACHE_INFO_ENDPOINT = "https://www.nicovideo.jp/cache/info/v3?";

export type CacheInfoFetcher = (url: string) => Promise<Response>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isCacheInfoItem = (value: unknown): value is CacheInfoItem => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.videoId === "string" &&
    typeof value.cacheId === "string" &&
    typeof value.complete === "boolean" &&
    typeof value.caching === "boolean" &&
    isNullableString(value.videoMode) &&
    typeof value.audioBitrate === "number" &&
    Number.isFinite(value.audioBitrate) &&
    typeof value.legacyLow === "boolean" &&
    typeof value.size === "number" &&
    Number.isFinite(value.size) &&
    (value.cachingSize === undefined ||
      (typeof value.cachingSize === "number" &&
        Number.isFinite(value.cachingSize))) &&
    isNullableString(value.title) &&
    isNullableString(value.subFolder) &&
    isNullableString(value.filename) &&
    isNullableNumber(value.ts)
  );
};

const isCacheInfoEntry = (value: unknown): value is CacheInfoEntry => {
  if (
    !isRecord(value) ||
    !isNullableString(value.videoId) ||
    !isNullableString(value.preferred) ||
    !isStringArray(value.cacheIds) ||
    !isStringArray(value.cachings) ||
    !isStringArray(value.completes) ||
    !isRecord(value.caches)
  ) {
    return false;
  }

  return Object.entries(value.caches).every(
    ([cacheId, item]) =>
      isCacheInfoItem(item) &&
      item.cacheId === cacheId &&
      (value.videoId === null || item.videoId === value.videoId),
  );
};

export const buildCacheInfoUrl = (videoId: string): string =>
  CACHE_INFO_ENDPOINT + encodeURIComponent(videoId);

export const parseCacheInfoResponse = (value: unknown): CacheInfoResponse => {
  if (!isRecord(value)) {
    throw new Error(
      "cache/info/v3 のレスポンスがJSONオブジェクトではありません",
    );
  }

  const response: CacheInfoResponse = {};
  for (const [inputId, entry] of Object.entries(value)) {
    if (!isCacheInfoEntry(entry)) {
      throw new Error(
        `cache/info/v3 の ${inputId} エントリがv3形式ではありません`,
      );
    }
    response[inputId] = entry;
  }

  return response;
};

export const fetchCacheInfoEntry = async (
  videoId: string,
  fetcher: CacheInfoFetcher = (url) => fetch(url),
): Promise<CacheInfoEntry> => {
  const response = await fetcher(buildCacheInfoUrl(videoId));
  if (!response.ok) {
    throw new Error(`cache/info/v3 API error: ${response.status}`);
  }

  const responseValue: unknown = await response.json();
  const data = parseCacheInfoResponse(responseValue);
  const entry = data[videoId];
  if (!entry) {
    throw new Error("指定された動画IDのキャッシュ情報が見つかりませんでした");
  }
  return entry;
};

export const hasCompletedCache = (entry: CacheInfoEntry): boolean =>
  Object.values(entry.caches).some((cache) => cache.complete);

export const getCacheIdsInPriorityOrder = (entry: CacheInfoEntry): string[] => {
  const completedIds = entry.completes.filter(
    (cacheId) => entry.caches[cacheId]?.complete === true,
  );
  const preferred =
    entry.preferred && entry.caches[entry.preferred]?.complete === true
      ? [entry.preferred]
      : [];

  return [...new Set([...preferred, ...completedIds])];
};
