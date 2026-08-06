const FRONTEND_ID = "6";
const FRONTEND_VERSION = "0";
const ACTION_TRACK_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const MOVIE_FETCHER_HEADER = "X-Filter-Matome-Movie-Fetcher";
export const MOVIE_FETCHER_API = "/cache/filter-matome/v1/movie-fetcher";

export interface DomandQuality {
  id?: string;
  isAvailable?: boolean;
  qualityLevel?: number;
  bitRate?: number;
}

export interface MovieFetcherStatus {
  videoId: string;
  status:
    | "idle"
    | "queued"
    | "fetching"
    | "canceling"
    | "canceled"
    | "completed"
    | "failed";
  completed: number;
  total: number;
  error?: string;
}

type WatchResponse = {
  client?: { watchTrackId?: string };
  media?: {
    domand?: {
      accessRightKey?: string;
      videos?: DomandQuality[];
      audios?: DomandQuality[];
    };
  };
};

type WatchEnvelope = {
  data?: { response?: WatchResponse } | WatchResponse;
  meta?: { status?: number; errorCode?: string };
};

type AccessRightsEnvelope = {
  data?: { contentUrl?: string };
  meta?: { status?: number; errorCode?: string };
};

export function extractVideoId(href: string): string | null {
  try {
    const base =
      typeof location === "undefined"
        ? "https://www.nicovideo.jp"
        : location.origin;
    const url = new URL(href, base);
    const match = /^\/watch\/([a-z]{2}\d+)(?:\/|$)/i.exec(url.pathname);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function selectBestQuality(
  candidates: DomandQuality[] | undefined,
): string | null {
  const available = (candidates ?? []).filter(
    (candidate): candidate is DomandQuality & { id: string } =>
      candidate.isAvailable === true && typeof candidate.id === "string",
  );
  available.sort(
    (left, right) =>
      (right.qualityLevel ?? -1) - (left.qualityLevel ?? -1) ||
      (right.bitRate ?? -1) - (left.bitRate ?? -1),
  );
  return available[0]?.id ?? null;
}

export function createActionTrackId(now = Date.now()): string {
  let randomPart = "";
  for (let index = 0; index < 10; index++) {
    randomPart +=
      ACTION_TRACK_CHARACTERS[
        Math.floor(Math.random() * ACTION_TRACK_CHARACTERS.length)
      ] ?? "0";
  }
  return `${randomPart}_${now}`;
}

function watchResponseFrom(envelope: WatchEnvelope): WatchResponse | null {
  const data = envelope.data;
  if (!data) return null;
  if ("response" in data) return data.response ?? null;
  return data as WatchResponse;
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function negotiateContentUrl(
  videoId: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const actionTrackId = createActionTrackId();
  const watchUrl = new URL(
    `/api/watch/v3_guest/${encodeURIComponent(videoId)}`,
    location.origin,
  );
  watchUrl.searchParams.set("_frontendId", FRONTEND_ID);
  watchUrl.searchParams.set("_frontendVersion", FRONTEND_VERSION);
  watchUrl.searchParams.set("actionTrackId", actionTrackId);
  watchUrl.searchParams.set("t", String(Date.now()));

  const watchEnvelope = await readJson<WatchEnvelope>(
    await fetcher(watchUrl, {
      credentials: "include",
      headers: {
        "X-Frontend-Id": FRONTEND_ID,
        "X-Frontend-Version": FRONTEND_VERSION,
      },
    }),
    "watch API",
  );
  const watch = watchResponseFrom(watchEnvelope);
  const domand = watch?.media?.domand;
  const video = selectBestQuality(domand?.videos);
  const audio = selectBestQuality(domand?.audios);
  const accessRightKey = domand?.accessRightKey;
  if (!video || !audio || !accessRightKey) {
    throw new Error(
      watchEnvelope.meta?.errorCode ?? "利用可能なDomand配信がありません",
    );
  }

  const accessUrl = new URL(
    `https://nvapi.nicovideo.jp/v1/watch/${encodeURIComponent(videoId)}/access-rights/hls`,
  );
  accessUrl.searchParams.set(
    "actionTrackId",
    watch?.client?.watchTrackId ?? actionTrackId,
  );
  const accessEnvelope = await readJson<AccessRightsEnvelope>(
    await fetcher(accessUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Right-Key": accessRightKey,
        "X-Frontend-Id": FRONTEND_ID,
        "X-Frontend-Version": FRONTEND_VERSION,
      },
      body: JSON.stringify({ outputs: [[video, audio]] }),
    }),
    "access-rights API",
  );
  const contentUrl = accessEnvelope.data?.contentUrl;
  if (!contentUrl?.startsWith("https://delivery.domand.nicovideo.jp/")) {
    throw new Error(
      accessEnvelope.meta?.errorCode ?? "配信URLを取得できませんでした",
    );
  }
  return contentUrl;
}

async function callExtension<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return readJson<T>(
    await fetch(`${MOVIE_FETCHER_API}/${path}`, {
      ...init,
      headers: {
        ...init.headers,
        [MOVIE_FETCHER_HEADER]: "1",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    }),
    "nlMovieFetcher",
  );
}

export async function startFetch(videoId: string): Promise<MovieFetcherStatus> {
  const contentUrl = await negotiateContentUrl(videoId);
  return callExtension<MovieFetcherStatus>("start", {
    method: "POST",
    body: JSON.stringify({ videoId, contentUrl }),
  });
}

export function getFetchStatus(videoId: string): Promise<MovieFetcherStatus> {
  return callExtension<MovieFetcherStatus>(
    `status?videoId=${encodeURIComponent(videoId)}`,
  );
}

export function cancelFetch(videoId: string): Promise<MovieFetcherStatus> {
  return callExtension<MovieFetcherStatus>("cancel", {
    method: "POST",
    body: JSON.stringify({ videoId }),
  });
}
