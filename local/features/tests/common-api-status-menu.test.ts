import { describe, expect, test } from "bun:test";

import {
  findLoadedCommentMenuBundleUrl,
  probeCommentMenuBundle,
  resolveFilterMatomeApiStatuses,
} from "@/common/api-status-menu";

describe("CommonHeader filter-matome API状態メニュー", () => {
  test("Watch以外ではWatch専用APIだけを対象外にする", () => {
    expect(resolveFilterMatomeApiStatuses({}, "/search/test")).toEqual([
      { id: "playback-rate", kind: "not-applicable" },
      { id: "comment-reload", kind: "not-applicable" },
      { id: "comment-menu", kind: "not-applicable" },
      { id: "notification-refresh", kind: "missing" },
    ]);
  });

  test("版と関数を検証し、コメントメニューは自動検査中から有効へ進む", () => {
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
      FilterMatomeNotificationReadApi: {
        version: 1,
        refresh: () => undefined,
      },
    };
    expect(resolveFilterMatomeApiStatuses(host, "/watch/sm9")).toEqual([
      { id: "playback-rate", kind: "active" },
      { id: "comment-reload", kind: "active" },
      { id: "comment-menu", kind: "probing" },
      { id: "notification-refresh", kind: "active" },
    ]);

    expect(
      resolveFilterMatomeApiStatuses(host, "/watch/sm9", "active")[2],
    ).toEqual({ id: "comment-menu", kind: "active" });

    expect(
      resolveFilterMatomeApiStatuses(
        { ...host, FilterMatomeCommentMenuBridgeApi: { version: 1 } },
        "/watch/sm9",
        "missing",
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
          FilterMatomeNotificationReadApi: { version: 2, refresh: "invalid" },
        },
        "/watch/sm9",
      ),
    ).toEqual([
      { id: "playback-rate", kind: "incompatible" },
      { id: "comment-reload", kind: "incompatible" },
      { id: "comment-menu", kind: "incompatible" },
      { id: "notification-refresh", kind: "incompatible" },
    ]);
  });

  test("通知表示更新APIの自動検査ではrefreshを呼び出さない", () => {
    let refreshCalls = 0;
    const host = {
      FilterMatomeNotificationReadApi: {
        version: 1,
        refresh: () => {
          refreshCalls += 1;
        },
      },
    };
    const statuses = resolveFilterMatomeApiStatuses(host, "/watch/sm9");
    expect(statuses[statuses.length - 1]).toEqual({
      id: "notification-refresh",
      kind: "active",
    });
    expect(refreshCalls).toBe(0);
  });

  test("読込済みExpandedComment資産だけを自動プローブ対象にする", () => {
    expect(
      findLoadedCommentMenuBundleUrl([
        { name: "https://example.com/ExpandedComment-test.js" },
        {
          name: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-current.js?cache=1",
        },
      ]),
    ).toBe(
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-current.js",
    );
    expect(
      findLoadedCommentMenuBundleUrl([
        {
          name: "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerSeekBar-current.js",
        },
      ]),
    ).toBeNull();
  });

  test("再取得した公式資産内の103番固有markerを副作用なしで検査する", async () => {
    const url =
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-current.js";
    const source = [
      "FilterMatomeCommentMenuApi",
      "FilterMatomeCommentMenuBridgeApi={version:1}",
      "e.getItems(comment)",
      "e.execute(action,comment)",
    ].join(";");
    const requests: Array<{ input: string; credentials?: RequestCredentials }> =
      [];
    expect(
      await probeCommentMenuBundle(url, async (input, init) => {
        requests.push({
          input: String(input),
          credentials: init?.credentials,
        });
        return new Response(source);
      }),
    ).toBe("active");
    expect(requests).toEqual([{ input: url, credentials: "omit" }]);
    expect(
      await probeCommentMenuBundle(
        url,
        async () => new Response("official source without marker"),
      ),
    ).toBe("missing");
    expect(
      await probeCommentMenuBundle(
        "https://example.com/ExpandedComment-current.js",
        async () => new Response(source),
      ),
    ).toBe("probe-error");
  });
});
