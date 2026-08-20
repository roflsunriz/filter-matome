const CACHE_SEARCH_ENDPOINT = "https://nicocachenl.test/api/v1/cache-entries";

const VIDEO_ID_PREFIX_PATTERN = /^([a-z]{2}\d+)/i;

export interface CacheSearchResult {
  videoId: string;
  title: string;
  cacheIds: string[];
  folders: string[];
  totalSize: number;
  newestTimestamp: number;
}

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface CacheEntryMap {
  entries: Record<string, unknown>;
  requiresLocalFiltering: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readNonNegativeNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

const readCacheEntryMap = (value: unknown): CacheEntryMap => {
  if (!isRecord(value)) {
    throw new Error("キャッシュ検索APIのレスポンス形式が不正です。");
  }

  if (isRecord(value.error)) {
    const message = readString(value.error.message);
    throw new Error(message || "キャッシュ検索APIがエラーを返しました。");
  }

  if ("complete" in value || "temporary" in value) {
    if (!isRecord(value.complete)) {
      throw new Error("完成済みキャッシュ一覧の形式が不正です。");
    }
    return {
      entries: value.complete,
      requiresLocalFiltering: true,
    };
  }

  return { entries: value, requiresLocalFiltering: false };
};

const matchesCacheQuery = (
  result: CacheSearchResult,
  query: string,
): boolean => {
  const words = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return true;
  }

  const searchable = [result.videoId, result.title, ...result.cacheIds]
    .join("\n")
    .toLowerCase();
  return words.every((word) => {
    if (word.startsWith("-")) {
      return !searchable.includes(word.slice(1));
    }
    return searchable.includes(word);
  });
};

export const getCacheSearchUrl = (query: string): string => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("検索キーワードを入力してください。");
  }

  return `${CACHE_SEARCH_ENDPOINT}?query=${encodeURIComponent(normalizedQuery)}&order=desc`;
};

export const parseCacheSearchResponse = (
  value: unknown,
  query = "",
): CacheSearchResult[] => {
  const { entries, requiresLocalFiltering } = readCacheEntryMap(value);

  const grouped = new Map<string, CacheSearchResult>();

  for (const [cacheId, rawEntry] of Object.entries(entries)) {
    const match = cacheId.match(VIDEO_ID_PREFIX_PATTERN);
    if (!match || !Array.isArray(rawEntry)) {
      continue;
    }

    const videoId = match[1].toLowerCase();
    const title = readString(rawEntry[0]) || videoId;
    const folder = readString(rawEntry[1]);
    const size = readNonNegativeNumber(rawEntry[2]);
    const timestamp = readNonNegativeNumber(rawEntry[3]);
    const existing = grouped.get(videoId);

    if (!existing) {
      grouped.set(videoId, {
        videoId,
        title,
        cacheIds: [cacheId],
        folders: folder ? [folder] : [],
        totalSize: size,
        newestTimestamp: timestamp,
      });
      continue;
    }

    if (!existing.cacheIds.includes(cacheId)) {
      existing.cacheIds.push(cacheId);
      existing.totalSize += size;
    }
    if (folder && !existing.folders.includes(folder)) {
      existing.folders.push(folder);
    }
    if (timestamp > existing.newestTimestamp) {
      existing.newestTimestamp = timestamp;
      existing.title = title;
    }
  }

  const results = [...grouped.values()].sort(
    (left, right) =>
      right.newestTimestamp - left.newestTimestamp ||
      left.videoId.localeCompare(right.videoId),
  );
  return requiresLocalFiltering
    ? results.filter((result) => matchesCacheQuery(result, query))
    : results;
};

export const searchVideoCaches = async (
  query: string,
  options: { signal?: AbortSignal; fetcher?: Fetcher } = {},
): Promise<CacheSearchResult[]> => {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const response = await fetcher(getCacheSearchUrl(query), {
    cache: "no-store",
    credentials: "same-origin",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `キャッシュ検索に失敗しました（HTTP ${response.status}）。`,
    );
  }

  return parseCacheSearchResponse(await response.json(), query);
};
