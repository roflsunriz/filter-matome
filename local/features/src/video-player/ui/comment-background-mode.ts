export type CommentBackgroundMode = "default" | "background-image";

export const COMMENT_BACKGROUND_MODE_KEY =
  "video-player-comment-background-mode";
export const COMMENT_BACKGROUND_MODE_CHANGE_EVENT =
  "video-player-comment-background-mode-change";

const normalizeCommentBackgroundMode = (
  mode: unknown,
): CommentBackgroundMode =>
  mode === "background-image" ? "background-image" : "default";

export const getCommentBackgroundMode = (): CommentBackgroundMode => {
  try {
    return normalizeCommentBackgroundMode(
      localStorage.getItem(COMMENT_BACKGROUND_MODE_KEY),
    );
  } catch {
    return "default";
  }
};

export const getCommentBackgroundModeFromEvent = (
  event: Event,
): CommentBackgroundMode | null => {
  const mode = (event as CustomEvent<unknown>).detail;
  if (mode !== "default" && mode !== "background-image") {
    return null;
  }
  return mode;
};

export const setCommentBackgroundMode = (
  mode: CommentBackgroundMode,
): CommentBackgroundMode => {
  const nextMode = normalizeCommentBackgroundMode(mode);

  try {
    localStorage.setItem(COMMENT_BACKGROUND_MODE_KEY, nextMode);
  } catch {
    // localStorageが利用できない環境でも表示切替は継続する
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<CommentBackgroundMode>(
        COMMENT_BACKGROUND_MODE_CHANGE_EVENT,
        { detail: nextMode },
      ),
    );
  }

  return nextMode;
};
