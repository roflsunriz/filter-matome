import { describe, expect, test } from "bun:test";

import { normalizeWatchResponseData } from "../src/common/watch-response-normalizer";

const nvComment = {
  threadKey: "thread-key",
  server: "https://nv-comment.nicovideo.jp",
  params: { targets: [], language: "ja-jp" },
};

describe("normalizeWatchResponseData", () => {
  test("実測したWatch V4のユーザー投稿を既存形式へ変換する", () => {
    const result = normalizeWatchResponseData({
      data: {
        response: {
          $watchV4: {
            data: {
              video: {
                id: "sm9",
                description: "完全な動画説明",
                thumbnail: { normal: "https://example.com/thumbnail.jpg" },
              },
              comment: { nvComment },
              tags: { items: [{ name: "テスト" }] },
              metadata: {
                jsonLd: {
                  owner: {
                    id: "4",
                    type: "user",
                    name: "投稿者",
                    description: "",
                    iconUrl: "https://example.com/user.png",
                  },
                },
              },
            },
          },
          pcweb: {},
        },
      },
    });

    expect(result?.video).toEqual({
      id: "sm9",
      description: "完全な動画説明",
      thumbnail: {
        normal: "https://example.com/thumbnail.jpg",
        url: "https://example.com/thumbnail.jpg",
      },
    });
    expect(result?.owner).toEqual({
      id: "4",
      name: "投稿者",
      nickname: "投稿者",
      iconUrl: "https://example.com/user.png",
    });
    expect(result?.comment).toEqual({ nvComment });
    expect(result?.tag).toEqual({ items: [{ name: "テスト" }] });
  });

  test("Watch V4のチャンネル投稿をchannelへ分岐する", () => {
    const result = normalizeWatchResponseData({
      data: {
        response: {
          $watchV4: {
            data: {
              video: { id: "so1", description: "説明" },
              metadata: {
                jsonLd: {
                  owner: {
                    id: "ch1",
                    type: "channel",
                    name: "チャンネル",
                    iconUrl: "https://example.com/channel.png",
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(result?.owner).toBeUndefined();
    expect(result?.channel).toEqual({
      id: "ch1",
      name: "チャンネル",
      iconUrl: "https://example.com/channel.png",
    });
  });

  test("旧Watch応答は内容を変えずに返す", () => {
    const legacy = {
      video: { id: "sm9", description: "旧説明" },
      owner: { id: "4", nickname: "旧投稿者" },
      comment: { nvComment },
    };
    expect(normalizeWatchResponseData({ data: { response: legacy } })).toEqual(
      legacy,
    );
  });

  test("既知のWatchデータがない応答を拒否する", () => {
    expect(
      normalizeWatchResponseData({ data: { response: { pcweb: {} } } }),
    ).toBeUndefined();
  });
});
