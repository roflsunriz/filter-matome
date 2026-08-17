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

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readNonNegativeNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

export const getCacheSearchUrl = (query: string): string => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("検索キーワードを入力してください。");
  }

  return `${CACHE_SEARCH_ENDPOINT}?query=${encodeURIComponent(normalizedQuery)}&order=desc`;
};

export const parseCacheSearchResponse = (
  value: unknown,
): CacheSearchResult[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("キャッシュ検索APIのレスポンス形式が不正です。");
  }

  const grouped = new Map<string, CacheSearchResult>();

  for (const [cacheId, rawEntry] of Object.entries(
    value as Record<string, unknown>,
  )) {
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

  return [...grouped.values()].sort(
    (left, right) =>
      right.newestTimestamp - left.newestTimestamp ||
      left.videoId.localeCompare(right.videoId),
  );
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

  return parseCacheSearchResponse(await response.json());
};
