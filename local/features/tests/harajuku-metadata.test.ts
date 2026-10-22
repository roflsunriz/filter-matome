import { describe, expect, test } from "bun:test";

import { parseHarajukuWatchApiMetadata } from "../src/mlink-video-controller/modules/harajuku-metadata";

describe("parseHarajukuWatchApiMetadata", () => {
  test("現行のowner.nameを投稿者名として優先する", () => {
    expect(
      parseHarajukuWatchApiMetadata({
        video: { description: "動画説明" },
        owner: {
          id: "4",
          name: "現行投稿者",
          nickname: "旧投稿者名",
          iconUrl: "https://example.com/owner.png",
        },
      }),
    ).toEqual({
      descriptionHtml: "動画説明",
      owner: {
        name: "現行投稿者",
        profileHref: "/user/4",
        videoHref: "/user/4/video",
        iconSrc: "https://example.com/owner.png",
        iconAlt: "現行投稿者",
      },
    });
  });

  test("旧形式のowner.nicknameを引き続き扱う", () => {
    expect(
      parseHarajukuWatchApiMetadata({
        owner: {
          id: 10,
          nickname: "旧形式投稿者",
          iconUrl: "https://example.com/legacy-owner.png",
        },
      }).owner,
    ).toEqual({
      name: "旧形式投稿者",
      profileHref: "/user/10",
      videoHref: "/user/10/video",
      iconSrc: "https://example.com/legacy-owner.png",
      iconAlt: "旧形式投稿者",
    });
  });

  test("ユーザー投稿者がない場合はチャンネル情報を扱う", () => {
    expect(
      parseHarajukuWatchApiMetadata({
        owner: null,
        channel: {
          id: "ch1",
          name: "テストチャンネル",
          iconUrl: "https://example.com/channel.png",
          url: "https://ch.nicovideo.jp/test/",
        },
      }).owner,
    ).toEqual({
      name: "テストチャンネル",
      profileHref: "https://ch.nicovideo.jp/test/",
      videoHref: "https://ch.nicovideo.jp/test/video",
      iconSrc: "https://example.com/channel.png",
      iconAlt: "テストチャンネル",
    });
  });

  test("必須フィールドが欠けた投稿者は表示データにしない", () => {
    expect(
      parseHarajukuWatchApiMetadata({
        video: { description: "" },
        owner: { id: "4", name: "投稿者" },
      }),
    ).toEqual({ descriptionHtml: "", owner: null });
  });
});
