import { describe, expect, test } from "bun:test";

import {
  getCacheRemovalNotice,
  removeCacheForVideo,
} from "../src/common/cache-removal";

describe("NicoCache_nl deletion API client", () => {
  test("動画単位のDELETEを本体APIへ送る", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return Promise.resolve(
        Response.json({ videoId: "sm9", status: "deleted" }),
      );
    }) as typeof fetch;

    try {
      await expect(removeCacheForVideo("sm9")).resolves.toEqual({
        videoId: "sm9",
        status: "deleted",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toEqual([
      [
        "https://nicocachenl.test/api/v1/videos/sm9/cache-entries",
        { method: "DELETE", cache: "no-store", credentials: "omit" },
      ],
    ]);
  });

  test("取得中キャッシュの削除予約を削除済みと誤表示しない", () => {
    const notice = getCacheRemovalNotice({
      videoId: "sm9",
      status: "scheduled",
    });
    expect(notice.kind).toBe("warning");
    expect(notice.message).toContain("削除を予約しました");
  });

  test("対象なしと不正レスポンスを区別する", async () => {
    expect(
      getCacheRemovalNotice({ videoId: "sm9", status: "not_found" }),
    ).toEqual({
      kind: "warning",
      message: "削除可能なキャッシュが見つかりません。",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        Response.json({ videoId: "sm9", status: "unknown" }),
      )) as typeof fetch;
    try {
      await expect(removeCacheForVideo("sm9")).rejects.toThrow(
        "応答形式が不正です",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("HTTPエラーを報告する", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(new Response("", { status: 503 }))) as typeof fetch;
    try {
      await expect(removeCacheForVideo("sm9")).rejects.toThrow("HTTP 503");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
