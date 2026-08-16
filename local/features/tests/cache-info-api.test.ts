import { describe, expect, test } from "bun:test";

import {
  buildCacheInfoUrl,
  fetchCacheInfoEntry,
  getCacheIdsInPriorityOrder,
  hasCompletedCache,
  parseCacheInfoResponse,
} from "@/common/cache-info-api";
import type { CacheInfoEntry } from "@/types/cache-info-types";

const createEntry = (): CacheInfoEntry => ({
  videoId: "sm9",
  preferred: "sm9[720p,128].hls",
  cacheIds: ["sm9[360p,64].hls", "sm9[720p,128].hls"],
  cachings: ["sm9[360p,64].hls"],
  completes: ["sm9[720p,128].hls"],
  caches: {
    "sm9[360p,64].hls": {
      videoId: "sm9",
      cacheId: "sm9[360p,64].hls",
      complete: false,
      caching: true,
      videoMode: "360p",
      audioBitrate: 64,
      legacyLow: false,
      size: 2_000,
      cachingSize: 1_000,
      title: null,
      subFolder: null,
      filename: null,
      ts: null,
    },
    "sm9[720p,128].hls": {
      videoId: "sm9",
      cacheId: "sm9[720p,128].hls",
      complete: true,
      caching: false,
      videoMode: "720p",
      audioBitrate: 128,
      legacyLow: false,
      size: 4_000,
      title: "テスト動画",
      subFolder: "",
      filename: "sm9[720p,128]_テスト動画.hls",
      ts: 1_786_838_400,
    },
  },
});

describe("cache/info/v3 client", () => {
  test("動画IDをエンコードしたv3 URLを組み立てる", () => {
    expect(buildCacheInfoUrl("sm9, sm10")).toBe(
      "https://www.nicovideo.jp/cache/info/v3?sm9%2C%20sm10",
    );
  });

  test("v3の完成・取得中キャッシュを検証して優先順を返す", () => {
    const entry = createEntry();
    const response = parseCacheInfoResponse({ sm9: entry });

    expect(response.sm9).toEqual(entry);
    expect(hasCompletedCache(entry)).toBe(true);
    expect(getCacheIdsInPriorityOrder(entry)).toEqual(["sm9[720p,128].hls"]);
  });

  test("キャッシュ0件のv3エントリを正常に扱う", () => {
    const entry: CacheInfoEntry = {
      videoId: "sm10",
      preferred: null,
      cacheIds: [],
      cachings: [],
      completes: [],
      caches: {},
    };

    expect(parseCacheInfoResponse({ sm10: entry }).sm10).toEqual(entry);
    expect(hasCompletedCache(entry)).toBe(false);
    expect(getCacheIdsInPriorityOrder(entry)).toEqual([]);
  });

  test("取得中キャッシュを完成済みの再生候補として返さない", () => {
    const entry = createEntry();
    entry.preferred = "sm9[360p,64].hls";
    entry.cacheIds = ["sm9[360p,64].hls"];
    entry.completes = [];
    delete entry.caches["sm9[720p,128].hls"];

    expect(hasCompletedCache(entry)).toBe(false);
    expect(getCacheIdsInPriorityOrder(entry)).toEqual([]);
  });

  test("旧v2フィールドだけのレスポンスを拒否する", () => {
    expect(() =>
      parseCacheInfoResponse({
        sm9: {
          preferred: "sm9[720p,128].hls",
          preferredDmcHls: "sm9[720p,128].hls",
          cacheIds: [],
          cachings: [],
          completes: [],
          caches: {},
        },
      }),
    ).toThrow("v3形式ではありません");
  });

  test("HTTPエラーと不正なcacheId対応を報告する", async () => {
    await expect(
      fetchCacheInfoEntry("sm9", () =>
        Promise.resolve(new Response("", { status: 503 })),
      ),
    ).rejects.toThrow("cache/info/v3 API error: 503");

    const entry = createEntry();
    entry.caches["sm9[720p,128].hls"].cacheId = "sm9[360p,64].hls";
    await expect(
      fetchCacheInfoEntry("sm9", () =>
        Promise.resolve(
          new Response(JSON.stringify({ sm9: entry }), { status: 200 }),
        ),
      ),
    ).rejects.toThrow("v3形式ではありません");
  });
});
