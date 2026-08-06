import { describe, expect, test } from "bun:test";

import {
  fetchNicoVideoInfo,
  isNicoVideoInfoError,
  parseVideoInfoPayload,
  type VideoInfoFetcher,
} from "../src/common/video-info-api";

const watchPayload = {
  meta: { status: 200 },
  data: {
    video: {
      id: "so46598987",
      contentType: "mp4",
      title: "公式チャンネル動画",
      description: "説明文",
      count: { view: 221833, comment: 50318, mylist: 209 },
      duration: 1420,
      thumbnail: {
        url: "https://example.invalid/thumb.jpg",
        player: "https://example.invalid/player.jpg?key=temporary-secret",
        ogp: "https://example.invalid/ogp.jpg",
      },
      registeredAt: "2026-07-31T01:00:00+09:00",
      isPrivate: false,
      isDeleted: false,
      isEmbedPlayerAllowed: true,
    },
    owner: null,
    channel: {
      id: "ch2650159",
      name: "公式チャンネル",
      thumbnail: {
        url: "https://example.invalid/channel.jpg",
        smallUrl: "https://example.invalid/channel-small.jpg",
      },
    },
    tag: {
      items: [
        { name: "アニメ", isLocked: true },
        { name: "R-18", isLocked: false },
      ],
      hasR18Tag: true,
      edit: { editKey: "do-not-expose" },
    },
    genre: { key: "anime", label: "アニメ" },
  },
};

describe("video-info-api", () => {
  test("normalizes current Watch API JSON with a channel-only owner", () => {
    const result = parseVideoInfoPayload(
      JSON.stringify(watchPayload),
      "so46598987",
      "watch-api",
    );

    expect(result).toMatchObject({
      source: "watch-api",
      videoId: "so46598987",
      title: "公式チャンネル動画",
      length: "23:40",
      viewCounter: 221833,
      commentNum: 50318,
      mylistCounter: 209,
      thumbnailUrl: "https://example.invalid/thumb.jpg",
      genre: "アニメ",
      isR18: true,
      channel: {
        id: "ch2650159",
        nickname: "公式チャンネル",
        iconUrl: "https://example.invalid/channel.jpg",
      },
    });
    expect(result.owner).toBeUndefined();
    expect(result.tags).toEqual([
      { name: "アニメ", locked: true },
      { name: "R-18", locked: false },
    ]);
    expect(result.raw).not.toHaveProperty("tag.edit.editKey");
    expect(
      (
        (result.raw.video as Record<string, unknown>).thumbnail as Record<
          string,
          unknown
        >
      ).player,
    ).toBe("https://example.invalid/player.jpg?key=[redacted]");
  });

  test("normalizes legacy JSON with missing optional fields", () => {
    const result = parseVideoInfoPayload(
      JSON.stringify({
        status: "ok",
        thumb: {
          video_id: "sm123",
          title: "旧形式JSON",
          length: "90",
          view_counter: "1,234",
          tags: ["例のアレ", { name: "テスト", isLocked: true }],
        },
      }),
      "sm123",
    );

    expect(result).toMatchObject({
      videoId: "sm123",
      title: "旧形式JSON",
      length: "1:30",
      viewCounter: 1234,
      commentNum: 0,
      thumbnailUrl: "",
      isR18: false,
    });
    expect(result.tags).toEqual([
      { name: "例のアレ", locked: false },
      { name: "テスト", locked: true },
    ]);
  });

  test("does not require optional Watch API branches", () => {
    const result = parseVideoInfoPayload(
      JSON.stringify({
        meta: { status: 200 },
        data: {
          video: {
            id: "sm-sparse",
            title: "最小レスポンス",
            duration: null,
            count: { view: "12" },
            thumbnail: null,
            isPrivate: false,
            isDeleted: false,
          },
        },
      }),
      "sm-sparse",
      "watch-api",
    );

    expect(result).toMatchObject({
      videoId: "sm-sparse",
      title: "最小レスポンス",
      length: "",
      viewCounter: 12,
      commentNum: 0,
      mylistCounter: 0,
      thumbnailUrl: "",
      tags: [],
      genre: "",
      source: "watch-api",
    });
  });

  test("normalizes API errors without treating them as a successful video", () => {
    let thrown: unknown;
    try {
      parseVideoInfoPayload(
        JSON.stringify({
          meta: { status: 400, errorCode: "FORBIDDEN" },
          data: { reasonCode: "VIEWER_NOT_ALLOWED" },
        }),
        "sm38484840",
        "watch-api",
      );
    } catch (error) {
      thrown = error;
    }

    expect(isNicoVideoInfoError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "FORBIDDEN",
      source: "watch-api",
    });
  });

  test("falls back from an unknown ext-thumb response to the regular Watch API", async () => {
    const calls: Array<{ url: string; options?: unknown }> = [];
    const responses = [
      new Response("<html>temporary error</html>", { status: 200 }),
      new Response(JSON.stringify(watchPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ];
    const fetcher: VideoInfoFetcher = async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (!response) throw new Error("unexpected request");
      return response;
    };

    const result = await fetchNicoVideoInfo("so46598987", fetcher);

    expect(result.source).toBe("watch-api");
    expect(result.channel?.nickname).toBe("公式チャンネル");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toContain("ext.nicovideo.jp/api/getthumbinfo");
    expect(calls[1]?.url).toContain("/api/watch/v3/so46598987?");
    expect(calls[1]?.options).toEqual({
      headers: { "X-Frontend-Id": "6", "X-Frontend-Version": "0" },
    });
  });

  test("falls back to the guest Watch API only when the regular API is unauthorized", async () => {
    const calls: string[] = [];
    const responses = [
      new Response("<html>temporary error</html>", { status: 200 }),
      new Response(
        JSON.stringify({ meta: { status: 400, errorCode: "UNAUTHORIZED" } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
      new Response(JSON.stringify(watchPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ];
    const fetcher: VideoInfoFetcher = async (url) => {
      calls.push(url);
      const response = responses.shift();
      if (!response) throw new Error("unexpected request");
      return response;
    };

    const result = await fetchNicoVideoInfo("so46598987", fetcher);

    expect(result.source).toBe("watch-api");
    expect(calls).toHaveLength(3);
    expect(calls[1]).toContain("/api/watch/v3/so46598987?");
    expect(calls[2]).toContain("/api/watch/v3_guest/so46598987?");
  });
});
