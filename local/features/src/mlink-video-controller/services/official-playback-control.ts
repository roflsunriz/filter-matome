export interface PlaybackControlState {
  videoId: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  seeking: boolean;
}

export interface OfficialPlaybackControlApi {
  version: 1;
  getState(): unknown;
  seek(time: number): Promise<unknown>;
  play(): void | Promise<void>;
  pause(): void;
}

export function isOfficialWatch(video?: HTMLVideoElement): boolean {
  return (
    video?.id !== "video-element" &&
    typeof location !== "undefined" &&
    location.hostname === "www.nicovideo.jp" &&
    /^\/watch\/[^/]+/u.test(location.pathname)
  );
}

export function getOfficialPlaybackControl(
  host: Record<string, unknown>,
): OfficialPlaybackControlApi | null {
  const value = host["FilterMatomePlaybackControlApi"];
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !["getState", "seek", "play", "pause"].every(
      (key) => typeof (value as Record<string, unknown>)[key] === "function",
    )
  )
    return null;
  return value as OfficialPlaybackControlApi;
}

export function readOfficialPlaybackState(
  host: Record<string, unknown>,
): PlaybackControlState | null {
  const api = getOfficialPlaybackControl(host);
  if (!api) return null;
  let value: unknown;
  try {
    value = api.getState();
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const state = value as Record<string, unknown>;
  if (
    typeof state.videoId !== "string" ||
    typeof state.currentTime !== "number" ||
    !Number.isFinite(state.currentTime) ||
    typeof state.duration !== "number" ||
    !Number.isFinite(state.duration) ||
    state.duration <= 0 ||
    typeof state.paused !== "boolean" ||
    typeof state.seeking !== "boolean"
  )
    return null;
  if (isOfficialWatch() && state.videoId !== location.pathname.split("/")[2])
    return null;
  return value as PlaybackControlState;
}

export function readPlaybackPosition(
  video: HTMLVideoElement,
): Pick<
  PlaybackControlState,
  "currentTime" | "duration" | "paused" | "seeking"
> | null {
  if (isOfficialWatch(video)) return readOfficialPlaybackState(window);
  return {
    currentTime: video.currentTime,
    duration: video.duration,
    paused: video.paused,
    seeking: video.seeking,
  };
}

export async function seekPlaybackPosition(
  video: HTMLVideoElement,
  time: number,
): Promise<void> {
  if (isOfficialWatch(video)) {
    const api = getOfficialPlaybackControl(window);
    if (!api || !readOfficialPlaybackState(window))
      throw new Error("Official playback control API unavailable");
    await api.seek(time);
  } else {
    video.currentTime = time;
  }
}

export async function playPlayback(video: HTMLVideoElement): Promise<void> {
  const api = isOfficialWatch(video)
    ? getOfficialPlaybackControl(window)
    : null;
  if (api) await api.play();
  else await video.play();
}
