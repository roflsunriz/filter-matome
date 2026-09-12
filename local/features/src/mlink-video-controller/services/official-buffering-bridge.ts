export interface OfficialBufferingState {
  enabled: boolean;
  error: null | "buffer-limit" | "load-error";
  videoId: string;
}

export interface OfficialBufferingApi {
  version: 1;
  getState(): OfficialBufferingState;
  setEnabled(enabled: boolean): OfficialBufferingState;
}

export function getOfficialBufferingApi(
  host: Record<string, unknown>,
): OfficialBufferingApi | null {
  const api = host["FilterMatomeBufferingApi"];
  if (
    typeof api !== "object" ||
    api === null ||
    !("version" in api) ||
    api.version !== 1 ||
    !("getState" in api) ||
    typeof api.getState !== "function" ||
    !("setEnabled" in api) ||
    typeof api.setEnabled !== "function"
  )
    return null;
  return api as OfficialBufferingApi;
}

export function readOfficialBufferingState(
  api: OfficialBufferingApi,
): OfficialBufferingState {
  const state: unknown = api.getState();
  if (
    typeof state !== "object" ||
    state === null ||
    !("enabled" in state) ||
    typeof state.enabled !== "boolean" ||
    !("videoId" in state) ||
    typeof state.videoId !== "string" ||
    !("error" in state) ||
    (state.error !== null &&
      state.error !== "buffer-limit" &&
      state.error !== "load-error")
  ) {
    throw new TypeError("Invalid buffering API state");
  }
  return state as OfficialBufferingState;
}

// TimeRanges は映像・音声の共通の再生可能範囲。末尾だけを見て100%と判定しない。
export function getBufferedProgress(
  ranges: TimeRanges,
  duration: number,
): { percent: number; complete: boolean } {
  if (!Number.isFinite(duration) || duration <= 0)
    return { percent: 0, complete: false };
  let seconds = 0;
  let end = 0;
  let continuous = ranges.length > 0;
  for (let index = 0; index < ranges.length; index++) {
    const start = Math.max(0, ranges.start(index));
    const nextEnd = Math.min(duration, ranges.end(index));
    if (start > end + 0.1) continuous = false;
    seconds += Math.max(0, nextEnd - Math.max(start, end));
    end = Math.max(end, nextEnd);
  }
  const complete = continuous && end >= duration - 0.1;
  return {
    percent: complete
      ? 100
      : Math.min(99.9, Math.max(0, (seconds / duration) * 100)),
    complete,
  };
}
