import { describe, expect, test } from "bun:test";

import { resolveEndedPlaybackAction } from "@/video-player/standalone/playback-preferences";

describe("video-player ended playback action", () => {
  test("repeat takes priority over auto next", () => {
    expect(resolveEndedPlaybackAction(true, true, true)).toBe("repeat");
  });

  test("auto next requires a next video", () => {
    expect(resolveEndedPlaybackAction(false, true, true)).toBe("next");
    expect(resolveEndedPlaybackAction(false, true, false)).toBe("none");
  });

  test("disabled preferences stop after playback", () => {
    expect(resolveEndedPlaybackAction(false, false, true)).toBe("none");
  });
});
