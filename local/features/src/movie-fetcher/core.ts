const FRONTEND_ID = "6";
const FRONTEND_VERSION = "0";
const ACTION_TRACK_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const MOVIE_FETCHER_HEADER = "X-Filter-Matome-Movie-Fetcher";
export const MOVIE_FETCHER_API =
  "https://nicocachenl.test/api/v1/extensions/filter-matome/movie-fetcher";

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
  bytesTransferred?: number;
  error?: string;
}

export interface MovieInspection {
  videoId: string;
  title: string;
  durationSeconds: number;
  videoIdForDelivery: string;
  audioIdForDelivery: string;
  videoBitRate: number;
  audioBitRate: number;
  estimatedBytes: number;
}

type WatchResponse = {
  client?: { watchTrackId?: string };
  video?: { title?: string; duration?: number };
  media?: {
    domand?: {
      accessRightKey?: string;
      videos?: DomandQuality[];
      audios?: DomandQuality[];
    };
  };
};

type DeliverySelection = MovieInspection & {
  accessRightKey: string;
  watchTrackId: string;
};

type WatchEnvelope = {
  data?: { response?: WatchResponse } | WatchResponse;
  meta?: { status?: number; errorCode?: string };
};

type AccessRightsEnvelope = {
  data?: { contentUrl?: string };
  meta?: { status?: number; errorCode?: string };
};

class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

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

function selectBestCandidate(
  candidates: DomandQuality[] | undefined,
): (DomandQuality & { id: string }) | null {
  const id = selectBestQuality(candidates);
  return id
    ? (((candidates ?? []).find((candidate) => candidate.id === id) as
        (DomandQuality & { id: string }) | undefined) ?? null)
    : null;
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
  let payload: T;
  try {
    payload = (await response.json()) as T;
  } catch {
    throw new Error(`${label}: HTTP ${response.status} (invalid JSON)`);
  }
  if (!response.ok) {
    const record =
      payload !== null && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const meta = record.meta as Record<string, unknown> | undefined;
    const errorCode =
      typeof meta?.errorCode === "string" ? meta.errorCode : undefined;
    throw new ApiResponseError(
      `${label}: HTTP ${response.status}${errorCode ? ` (${errorCode})` : ""}`,
      response.status,
      errorCode,
    );
  }
  return payload;
}

function createWatchUrl(
  endpoint: "v3" | "v3_guest",
  videoId: string,
  actionTrackId: string,
): URL {
  const watchUrl = new URL(
    `/api/watch/${endpoint}/${encodeURIComponent(videoId)}`,
    location.origin,
  );
  watchUrl.searchParams.set("_frontendId", FRONTEND_ID);
  watchUrl.searchParams.set("_frontendVersion", FRONTEND_VERSION);
  watchUrl.searchParams.set("actionTrackId", actionTrackId);
  watchUrl.searchParams.set("t", String(Date.now()));
  return watchUrl;
}

async function fetchWatchEnvelope(
  endpoint: "v3" | "v3_guest",
  videoId: string,
  actionTrackId: string,
  fetcher: typeof fetch,
): Promise<WatchEnvelope> {
  return readJson<WatchEnvelope>(
    await fetcher(createWatchUrl(endpoint, videoId, actionTrackId), {
      credentials: "include",
      headers: {
        "X-Frontend-Id": FRONTEND_ID,
        "X-Frontend-Version": FRONTEND_VERSION,
      },
    }),
    "watch API",
  );
}

async function requestWatchEnvelope(
  videoId: string,
  actionTrackId: string,
  fetcher: typeof fetch,
): Promise<WatchEnvelope> {
  try {
    return await fetchWatchEnvelope("v3", videoId, actionTrackId, fetcher);
  } catch (error) {
    const shouldUseGuest =
      error instanceof ApiResponseError &&
      (error.status === 401 ||
        (error.status === 400 && error.errorCode === "UNAUTHORIZED"));
    if (!shouldUseGuest) throw error;
    return fetchWatchEnvelope("v3_guest", videoId, actionTrackId, fetcher);
  }
}

async function selectDelivery(
  videoId: string,
  fetcher: typeof fetch = fetch,
): Promise<DeliverySelection> {
  const actionTrackId = createActionTrackId();
  const watchEnvelope = await requestWatchEnvelope(
    videoId,
    actionTrackId,
    fetcher,
  );
  const watch = watchResponseFrom(watchEnvelope);
  const domand = watch?.media?.domand;
  const video = selectBestCandidate(domand?.videos);
  const audio = selectBestCandidate(domand?.audios);
  const accessRightKey = domand?.accessRightKey;
  if (!video || !audio || !accessRightKey) {
    throw new Error(
      watchEnvelope.meta?.errorCode ?? "利用可能なDomand配信がありません",
    );
  }

  const durationSeconds = Math.max(0, watch?.video?.duration ?? 0);
  const videoBitRate = Math.max(0, video.bitRate ?? 0);
  const audioBitRate = Math.max(0, audio.bitRate ?? 0);
  return {
    videoId,
    title: watch?.video?.title ?? videoId,
    durationSeconds,
    videoIdForDelivery: video.id,
    audioIdForDelivery: audio.id,
    videoBitRate,
    audioBitRate,
    estimatedBytes: Math.max(
      1,
      Math.ceil((durationSeconds * (videoBitRate + audioBitRate)) / 8),
    ),
    accessRightKey,
    watchTrackId: watch?.client?.watchTrackId ?? actionTrackId,
  };
}

export async function inspectVideo(
  videoId: string,
  fetcher: typeof fetch = fetch,
): Promise<MovieInspection> {
  const {
    accessRightKey: _accessRightKey,
    watchTrackId: _watchTrackId,
    ...info
  } = await selectDelivery(videoId, fetcher);
  return info;
}

export async function negotiateContentUrl(
  videoId: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const selection = await selectDelivery(videoId, fetcher);

  const accessUrl = new URL(
    `https://nvapi.nicovideo.jp/v1/watch/${encodeURIComponent(videoId)}/access-rights/hls`,
  );
  accessUrl.searchParams.set("actionTrackId", selection.watchTrackId);
  const accessEnvelope = await readJson<AccessRightsEnvelope>(
    await fetcher(accessUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Right-Key": selection.accessRightKey,
        "X-Frontend-Id": FRONTEND_ID,
        "X-Frontend-Version": FRONTEND_VERSION,
        "X-Request-With": location.origin,
      },
      body: JSON.stringify({
        outputs: [[selection.videoIdForDelivery, selection.audioIdForDelivery]],
      }),
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

export async function reportFetchError(
  videoId: string,
  message: string,
): Promise<void> {
  const safeMessage = message
    .replace(/https?:\/\/\S+/giu, "[URL省略]")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 160);
  if (!safeMessage) return;
  await callExtension<{ reported: boolean }>("report", {
    method: "POST",
    body: JSON.stringify({ videoId, message: safeMessage }),
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
