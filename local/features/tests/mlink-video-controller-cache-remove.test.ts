import { describe, expect, test } from "bun:test";

import {
  fetchCacheRemovalStatus,
  getCacheRemovalNotice,
  removeCacheForVideo,
} from "../src/common/cache-removal";

const completedResponse = {
  requestId: "request-1",
  videoId: "sm9",
  status: "completed",
  target: "hls",
  preservesNonHls: true,
  results: [{ cacheId: "sm9[720p,256].hls", outcome: "deleted" }],
} as const;

describe("FilterMatomeCacheControl API client", () => {
  test("requests HLS-only removal with active-download queuing", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return Promise.resolve(Response.json(completedResponse));
    }) as typeof fetch;

    try {
      await expect(removeCacheForVideo("sm9")).resolves.toEqual(
        completedResponse,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toEqual([
      [
        "/cache/filter-matome/v1/remove",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Filter-Matome-Cache-Control": "1",
          },
          body: JSON.stringify({
            videoId: "sm9",
            scope: "hls",
            activeDownload: "queue",
          }),
          cache: "no-store",
          credentials: "same-origin",
        },
      ],
    ]);
  });

  test("fetches queued removal status by request id", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return Promise.resolve(Response.json(completedResponse));
    }) as typeof fetch;

    try {
      await fetchCacheRemovalStatus("request/1");
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls[0]?.[0]).toBe(
      "/cache/filter-matome/v1/remove-status?id=request%2F1",
    );
    expect(calls[0]?.[1]).toEqual({
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "X-Filter-Matome-Cache-Control": "1" },
    });
  });

  test("reports active HLS downloads as queued without claiming deletion", () => {
    const notice = getCacheRemovalNotice({
      ...completedResponse,
      status: "pending",
      results: [{ cacheId: "sm9[720p,256].hls", outcome: "queued" }],
    });

    expect(notice.kind).toBe("warning");
    expect(notice.message).toContain("削除を予約しました");
  });

  test("explains a missing extension on HTTP 404", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response("Not Found", { status: 404 }),
      )) as typeof fetch;

    try {
      await expect(removeCacheForVideo("sm9")).rejects.toThrow(
        "FilterMatomeCacheControl拡張が見つかりません",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("rejects responses containing a non-HLS deletion target", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        Response.json({
          ...completedResponse,
          results: [{ cacheId: "sm9.mp4", outcome: "deleted" }],
        }),
      )) as typeof fetch;

    try {
      await expect(removeCacheForVideo("sm9")).rejects.toThrow(
        "HLSキャッシュ削除APIの結果形式が不正です",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
