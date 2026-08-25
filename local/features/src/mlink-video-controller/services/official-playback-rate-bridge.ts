interface PlaybackRateBridgeHost {
  FilterMatomePlaybackRateApi?: unknown;
}

interface PlaybackRateBridgeApi {
  version: 1;
  get: () => unknown;
  set: (rate: number) => unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApi = (host: PlaybackRateBridgeHost): PlaybackRateBridgeApi | null => {
  const candidate = host.FilterMatomePlaybackRateApi;
  if (
    !isRecord(candidate) ||
    candidate["version"] !== 1 ||
    typeof candidate["get"] !== "function" ||
    typeof candidate["set"] !== "function"
  ) {
    return null;
  }
  return candidate as unknown as PlaybackRateBridgeApi;
};

const normalizeRate = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const readOfficialPlaybackRate = (
  host: PlaybackRateBridgeHost,
): number | null => {
  const api = getApi(host);
  if (!api) {
    return null;
  }
  try {
    return normalizeRate(api.get());
  } catch {
    return null;
  }
};

export const writeOfficialPlaybackRate = (
  host: PlaybackRateBridgeHost,
  rate: number,
): boolean => {
  if (!Number.isFinite(rate)) {
    return false;
  }
  const api = getApi(host);
  if (!api) {
    return false;
  }
  try {
    const returnedRate = normalizeRate(api.set(rate));
    const actualRate = returnedRate ?? normalizeRate(api.get());
    return actualRate !== null && Math.abs(actualRate - rate) < 0.001;
  } catch {
    return false;
  }
};
