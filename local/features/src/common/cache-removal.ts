const CACHE_API_BASE = "https://nicocachenl.test/api/v1/videos";

const REMOVAL_STATUSES = [
  "not_found",
  "scheduled",
  "deleted",
  "partial",
  "failed",
] as const;

export type CacheRemovalStatus = (typeof REMOVAL_STATUSES)[number];

export interface CacheRemovalResponse {
  videoId: string;
  status: CacheRemovalStatus;
  target: "hls";
  preservesNonHls: true;
}

export interface CacheRemovalNotice {
  kind: "success" | "warning" | "error";
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCacheRemovalResponse = (value: unknown): CacheRemovalResponse => {
  if (
    !isRecord(value) ||
    typeof value.videoId !== "string" ||
    typeof value.status !== "string" ||
    !REMOVAL_STATUSES.includes(value.status as CacheRemovalStatus) ||
    value.target !== "hls" ||
    value.preservesNonHls !== true
  ) {
    throw new Error("NicoCache_nl削除APIの応答形式が不正です");
  }
  return {
    videoId: value.videoId,
    status: value.status as CacheRemovalStatus,
    target: "hls",
    preservesNonHls: true,
  };
};

/** 動画に属する完成・一時キャッシュを削除し、取得中なら削除予約する。 */
export const removeCacheForVideo = async (
  videoId: string,
): Promise<CacheRemovalResponse> => {
  const response = await fetch(
    `${CACHE_API_BASE}/${encodeURIComponent(videoId)}/hls-cache-entries`,
    {
      method: "DELETE",
      cache: "no-store",
      credentials: "omit",
    },
  );
  if (!response.ok) {
    throw new Error(`NicoCache_nl削除API: HTTP ${response.status}`);
  }
  return parseCacheRemovalResponse(await response.json());
};

export const getCacheRemovalNotice = (
  result: CacheRemovalResponse,
): CacheRemovalNotice => {
  switch (result.status) {
    case "not_found":
      return {
        kind: "warning",
        message: "削除可能なキャッシュが見つかりません。",
      };
    case "scheduled":
      return {
        kind: "warning",
        message:
          "キャッシュの削除を予約しました。取得完了または中断後に削除されます。",
      };
    case "deleted":
      return {
        kind: "success",
        message: "動画に属するHLSキャッシュを削除しました。",
      };
    case "partial":
      return {
        kind: "error",
        message: "HLSキャッシュの削除が一部失敗しました。",
      };
    case "failed":
      return {
        kind: "error",
        message: "HLSキャッシュの削除に失敗しました。",
      };
  }
};
