const CACHE_API_BASE = "https://nicocachenl.test/api/v1/videos";

const REMOVAL_STATUSES = ["not_found", "scheduled", "deleted"] as const;

export type CacheRemovalStatus = (typeof REMOVAL_STATUSES)[number];

export interface CacheRemovalResponse {
  videoId: string;
  status: CacheRemovalStatus;
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
    !REMOVAL_STATUSES.includes(value.status as CacheRemovalStatus)
  ) {
    throw new Error("NicoCache_nl削除APIの応答形式が不正です");
  }
  return {
    videoId: value.videoId,
    status: value.status as CacheRemovalStatus,
  };
};

/** 動画に属する完成・一時キャッシュを削除し、取得中なら削除予約する。 */
export const removeCacheForVideo = async (
  videoId: string,
): Promise<CacheRemovalResponse> => {
  const response = await fetch(
    `${CACHE_API_BASE}/${encodeURIComponent(videoId)}/cache-entries`,
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
        message: "動画に属するキャッシュを削除しました。",
      };
  }
};
