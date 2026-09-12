import { describe, expect, test } from "bun:test";
import {
  formatPlaybackTime,
  parsePlaybackTime,
} from "../src/mlink-video-controller/services/ab-repeat";
import {
  getBufferedProgress,
  getOfficialBufferingApi,
  readOfficialBufferingState,
} from "../src/mlink-video-controller/services/official-buffering-bridge";
import { getPlaybackToolsCopy } from "../src/mlink-video-controller/playback-tools-copy";

describe("再生補助の境界条件", () => {
  test("時刻入力は秒・分:秒・時:分:秒を検証する", () => {
    for (const [text, seconds] of [
      ["0", 0],
      ["1:02.345", 62.345],
      ["1:02:03", 3723],
      [" 90.5 ", 90.5],
    ] as const)
      expect(parsePlaybackTime(text)).toBe(seconds);
    for (const text of [
      "",
      "-1",
      "Infinity",
      "NaN",
      "1:60",
      "1:99:00",
      "1e3",
      "00:00:00:00",
      "1.2345",
    ])
      expect(parsePlaybackTime(text)).toBeNull();
    expect(formatPlaybackTime(59.9997)).toBe("1:00.000");
    expect(formatPlaybackTime(null)).toBe("");
  });

  test("末尾が読み込み済みでも途中に穴があれば100%にしない", () => {
    const progress = (parts: [number, number][], duration = 100) =>
      getBufferedProgress(
        {
          length: parts.length,
          start: (index) => parts[index][0],
          end: (index) => parts[index][1],
        },
        duration,
      );
    expect(progress([[80, 100]])).toEqual({ percent: 20, complete: false });
    expect(
      progress([
        [0, 30],
        [60, 100],
      ]),
    ).toEqual({ percent: 70, complete: false });
    expect(progress([[0.025, 99.97]])).toEqual({
      percent: 100,
      complete: true,
    });
    expect(progress([])).toEqual({ percent: 0, complete: false });
    expect(progress([[0, 10]], Infinity).complete).toBe(false);
  });

  test("API版・必須関数・戻り値の形式を検査する", () => {
    expect(
      getOfficialBufferingApi({ FilterMatomeBufferingApi: { version: 2 } }),
    ).toBeNull();
    const api = getOfficialBufferingApi({
      FilterMatomeBufferingApi: {
        version: 1,
        getState: () => null,
        setEnabled: () => null,
      },
    });
    expect(api).not.toBeNull();
    expect(() => readOfficialBufferingState(api!)).toThrow();
  });

  test("日本語・主要言語と未知の言語のフォールバックに欠落キーがない", () => {
    for (const language of [
      "ja",
      "en",
      "zh",
      "hi",
      "es",
      "fr",
      "ar",
      "pt",
      "bn",
      "ru",
      "ur",
      "unknown",
    ]) {
      const copy = getPlaybackToolsCopy(language);
      expect(
        Object.values(copy).every(
          (value) => typeof value === "string" && value.length > 0,
        ),
      ).toBe(true);
    }
    expect(getPlaybackToolsCopy("ja-JP").bufferTitle).toBe("全編先読み");
  });
});
