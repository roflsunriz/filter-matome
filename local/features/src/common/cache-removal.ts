const CACHE_REMOVAL_API_BASE =
  "https://nicocachenl.test/api/v1/extensions/filter-matome/cache-control";
const CACHE_REMOVAL_REQUEST_HEADER = "X-Filter-Matome-Cache-Control";

const REMOVAL_STATUSES = [
  "not_found",
  "pending",
  "completed",
  "partial",
  "failed",
] as const;
const REMOVAL_OUTCOMES = [
  "deleted",
  "queued",
  "not_found",
  "failed",
  "expired",
] as const;

export type CacheRemovalStatus = (typeof REMOVAL_STATUSES)[number];
export type CacheRemovalOutcome = (typeof REMOVAL_OUTCOMES)[number];

export interface CacheRemovalResultEntry {
  cacheId: string;
  outcome: CacheRemovalOutcome;
}

export interface CacheRemovalResponse {
  requestId: string;
  videoId: string;
  status: CacheRemovalStatus;
  target: "hls";
  preservesNonHls: true;
  results: CacheRemovalResultEntry[];
}

export interface CacheRemovalNotice {
  kind: "success" | "warning" | "error";
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(
  value: unknown,
  candidates: readonly T[],
): value is T => typeof value === "string" && candidates.includes(value as T);

const parseCacheRemovalResponse = (value: unknown): CacheRemovalResponse => {
  if (
    !isRecord(value) ||
    typeof value.requestId !== "string" ||
    typeof value.videoId !== "string" ||
    !isOneOf(value.status, REMOVAL_STATUSES) ||
    value.target !== "hls" ||
    value.preservesNonHls !== true ||
    !Array.isArray(value.results)
  ) {
    throw new Error("HLSキャッシュ削除APIの応答形式が不正です");
  }

  const results = value.results.map((entry): CacheRemovalResultEntry => {
    if (
      !isRecord(entry) ||
      typeof entry.cacheId !== "string" ||
      !entry.cacheId.toLowerCase().endsWith(".hls") ||
      !isOneOf(entry.outcome, REMOVAL_OUTCOMES)
    ) {
      throw new Error("HLSキャッシュ削除APIの結果形式が不正です");
    }
    return { cacheId: entry.cacheId, outcome: entry.outcome };
  });

  return {
    requestId: value.requestId,
    videoId: value.videoId,
    status: value.status,
    target: "hls",
    preservesNonHls: true,
    results,
  };
};

const fetchCacheRemovalApi = async (
  path: string,
  init: RequestInit,
): Promise<CacheRemovalResponse> => {
  const response = await fetch(`${CACHE_REMOVAL_API_BASE}/${path}`, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...init.headers,
      [CACHE_REMOVAL_REQUEST_HEADER]: "1",
    },
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "FilterMatomeCacheControl拡張が見つかりません。NicoCache_nlのextensions配置と再起動を確認してください",
      );
    }
    throw new Error(`HLSキャッシュ削除API: HTTP ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("HLSキャッシュ削除APIからJSONを取得できませんでした");
  }
  return parseCacheRemovalResponse(data);
};

/** 動画に紐づくHLSだけを削除し、ダウンロード中なら削除予約を登録する。 */
export const removeCacheForVideo = async (
  videoId: string,
): Promise<CacheRemovalResponse> =>
  fetchCacheRemovalApi("remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      scope: "hls",
      activeDownload: "queue",
    }),
  });

/** 削除予約を含むリクエストの最新状態を取得する。 */
export const fetchCacheRemovalStatus = async (
  requestId: string,
): Promise<CacheRemovalResponse> =>
  fetchCacheRemovalApi(`remove-status?id=${encodeURIComponent(requestId)}`, {
    method: "GET",
  });

export const getCacheRemovalNotice = (
  result: CacheRemovalResponse,
): CacheRemovalNotice => {
  const deleted = result.results.filter(
    (entry) => entry.outcome === "deleted",
  ).length;
  const failed = result.results.filter(
    (entry) => entry.outcome === "failed" || entry.outcome === "expired",
  ).length;

  switch (result.status) {
    case "not_found":
      return {
        kind: "warning",
        message: "削除可能なHLSキャッシュが見つかりません。",
      };
    case "pending":
      return {
        kind: "warning",
        message:
          "HLSキャッシュの削除を予約しました。キャッシュ完了または中断後に削除されます。",
      };
    case "completed":
      return {
        kind: "success",
        message: `HLSキャッシュを削除しました。(${deleted.toLocaleString()} 件)`,
      };
    case "partial":
      return {
        kind: "error",
        message: `HLSキャッシュの削除が一部失敗しました。(削除 ${deleted.toLocaleString()} 件 / 失敗 ${failed.toLocaleString()} 件)`,
      };
    case "failed":
      return {
        kind: "error",
        message: "HLSキャッシュの削除に失敗しました。",
      };
  }
};
