import { describe, expect, test } from "bun:test";

import { resolveFilterMatomeApiStatuses } from "@/common/api-status-menu";

describe("CommonHeader filter-matome API状態メニュー", () => {
  test("Watch以外では3つのnlFilter APIを対象外にする", () => {
    expect(resolveFilterMatomeApiStatuses({}, "/search/test")).toEqual([
      { id: "playback-rate", kind: "not-applicable" },
      { id: "comment-reload", kind: "not-applicable" },
      { id: "comment-menu", kind: "not-applicable" },
    ]);
  });

  test("版と関数を検証し、コメントメニューは実行前を待機中にする", () => {
    const host = {
      FilterMatomePlaybackRateApi: {
        version: 1,
        get: () => 1,
        set: (rate: number) => rate,
      },
      FilterMatomeCommentApi: {
        version: 1,
        reload: async () => undefined,
      },
      FilterMatomeCommentMenuApi: {
        version: 1,
        getItems: () => [],
        execute: async () => true,
      },
    };
    expect(resolveFilterMatomeApiStatuses(host, "/watch/sm9")).toEqual([
      { id: "playback-rate", kind: "active" },
      { id: "comment-reload", kind: "active" },
      { id: "comment-menu", kind: "waiting" },
    ]);

    expect(
      resolveFilterMatomeApiStatuses(
        { ...host, FilterMatomeCommentMenuBridgeApi: { version: 1 } },
        "/watch/sm9",
      )[2],
    ).toEqual({ id: "comment-menu", kind: "active" });
  });

  test("存在するが契約版または関数が違うAPIを版不一致にする", () => {
    expect(
      resolveFilterMatomeApiStatuses(
        {
          FilterMatomePlaybackRateApi: { version: 2 },
          FilterMatomeCommentApi: { version: 1, reload: "invalid" },
          FilterMatomeCommentMenuApi: { version: 1 },
        },
        "/watch/sm9",
      ),
    ).toEqual([
      { id: "playback-rate", kind: "incompatible" },
      { id: "comment-reload", kind: "incompatible" },
      { id: "comment-menu", kind: "incompatible" },
    ]);
  });
});
