export const AUTO_NEXT_STORAGE_KEY = "video-player-auto-next";
export const REPEAT_PLAYBACK_STORAGE_KEY = "video-player-repeat-playback";

export type EndedPlaybackAction = "repeat" | "next" | "none";

export const resolveEndedPlaybackAction = (
  repeatPlayback: boolean,
  autoNext: boolean,
  hasNextVideo: boolean,
): EndedPlaybackAction => {
  if (repeatPlayback) return "repeat";
  if (autoNext && hasNextVideo) return "next";
  return "none";
};
