import { describe, expect, test } from "bun:test";
import {
  createActionTrackId,
  extractVideoId,
  inspectVideo,
  selectBestQuality,
} from "@/movie-fetcher/core";

describe("movie-fetcher core", () => {
  test("現行watch URLから動画IDだけを抽出する", () => {
    expect(extractVideoId("/watch/sm9?from=search")).toBe("sm9");
    expect(extractVideoId("https://www.nicovideo.jp/watch/so12345")).toBe(
      "so12345",
    );
    expect(extractVideoId("/user/1")).toBeNull();
  });

  test("利用可能な候補からqualityLevel優先で最高品質を選ぶ", () => {
    expect(
      selectBestQuality([
        { id: "video-low", isAvailable: true, qualityLevel: 0, bitRate: 9_000 },
        {
          id: "video-high",
          isAvailable: true,
          qualityLevel: 2,
          bitRate: 1_000,
        },
        { id: "video-locked", isAvailable: false, qualityLevel: 9 },
      ]),
    ).toBe("video-high");
  });

  test("actionTrackIdは時刻を末尾へ含む", () => {
    expect(createActionTrackId(123456789)).toMatch(
      /^[A-Za-z0-9]{10}_123456789$/,
    );
  });

  test("Watch APIがV4応答でも配信候補を選べる", async () => {
    const fetcher: typeof fetch = async () =>
      Response.json({
        data: {
          $watchV4: {
            data: {
              client: { watchTrackId: "track" },
              video: { title: "V4動画", duration: 120 },
              media: {
                accessRightKey: "access-key",
                contents: {
                  videos: [
                    {
                      id: "video-high",
                      isAvailable: true,
                      qualityLevel: 2,
                      bitRate: 2_000,
                    },
                  ],
                  audios: [
                    {
                      id: "audio-high",
                      isAvailable: true,
                      qualityLevel: 1,
                      bitRate: 192,
                    },
                  ],
                },
              },
            },
          },
        },
      });

    await expect(inspectVideo("sm9", fetcher)).resolves.toMatchObject({
      title: "V4動画",
      durationSeconds: 120,
      videoIdForDelivery: "video-high",
      audioIdForDelivery: "audio-high",
    });
  });
});
