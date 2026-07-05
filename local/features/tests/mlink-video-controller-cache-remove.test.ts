import { describe, expect, test } from "bun:test";

import {
  buildCacheRemovalPaths,
  removeCacheByPath,
} from "../src/mlink-video-controller/utils/video-util";
import type { CacheInfoResponse } from "../src/types/video-types";

describe("mlink-video-controller cache removal", () => {
  test("builds temporary HLS removal paths without URL encoding", () => {
    const cacheInfo: CacheInfoResponse = {
      sm9: {
        preferred: "sm9[720p,256].hls",
        preferredDmcHls: "sm9low[360p-lowest,128].hls",
        cachings: ["sm9[720p,256].hls", "sm9low[360p-lowest,128].hls"],
        cacheIds: [
          "sm9[720p,256].hls",
          "sm9low[360p-lowest,128].hls",
          "sm9[720p,256].hls",
        ],
        caches: {
          "sm9[720p,256].hls": {
            title: "normal",
          },
          "sm9low[360p-lowest,128].hls": {
            title: "low",
          },
        },
      },
    };

    expect(buildCacheRemovalPaths("sm9", cacheInfo)).toEqual([
      "/cache/ajax_rmtmp?sm9[720p,256].hls",
      "/cache/ajax_rmtmp?sm9low[360p-lowest,128].hls",
    ]);
  });

  test("builds completed HLS cache removal path with rm and cache id", () => {
    const cacheInfo: CacheInfoResponse = {
      sm9: {
        preferred: "sm9[720p,256].hls",
        completes: ["sm9[720p,256].hls"],
        cacheIds: ["sm9[720p,256].hls"],
        caches: {
          "sm9[720p,256].hls": {
            title: "complete",
            complete: true,
            caching: false,
          },
        },
      },
    };

    expect(buildCacheRemovalPaths("sm9", cacheInfo)).toEqual([
      "/cache/ajax_rm?sm9[720p,256].hls",
    ]);
  });

  test("uses cache ids from completes and cachings lists as removal candidates", () => {
    const cacheInfo: CacheInfoResponse = {
      sm9: {
        completes: ["sm9[720p,256].hls"],
        cachings: ["sm9low[360p-lowest,128].hls"],
      },
    };

    expect(buildCacheRemovalPaths("sm9", cacheInfo)).toEqual([
      "/cache/ajax_rm?sm9[720p,256].hls",
      "/cache/ajax_rmtmp?sm9low[360p-lowest,128].hls",
    ]);
  });

  test("extracts HLS cache ids from encoded or full path values", () => {
    const cacheInfo: CacheInfoResponse = {
      sm9: {
        caches: {
          "/cache/rmtmp?sm9%5B720p%2C256%5D.hls": {
            title: "encoded",
            filename: "sm9low%5B360p-lowest%2C128%5D.hls",
          },
        },
      },
    };

    expect(buildCacheRemovalPaths("sm9", cacheInfo)).toEqual([
      "/cache/ajax_rmtmp?sm9[720p,256].hls",
      "/cache/ajax_rmtmp?sm9low[360p-lowest,128].hls",
    ]);
  });

  test("removes cache paths through ajax cache API without URL encoding", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return Promise.resolve(
        new Response("OK", {
          status: 200,
        }),
      );
    }) as typeof fetch;

    try {
      await removeCacheByPath("/cache/ajax_rmtmp?sm9[720p,256].hls");
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toEqual([
      [
        "/cache/ajax_rmtmp?sm9[720p,256].hls",
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      ],
    ]);
  });

  test("rejects failed cache removal responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response("failure", {
          status: 500,
        }),
      )) as typeof fetch;

    try {
      await expect(
        removeCacheByPath("/cache/ajax_rmtmp?sm9[720p,256].hls"),
      ).rejects.toThrow("HTTP 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("rejects ajax cache API NG responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response("NG", {
          status: 200,
        }),
      )) as typeof fetch;

    try {
      await expect(
        removeCacheByPath("/cache/ajax_rmtmp?sm9[720p,256].hls"),
      ).rejects.toThrow("NG");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
