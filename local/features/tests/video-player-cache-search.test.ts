import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getCacheSearchUrl,
  parseCacheSearchResponse,
  searchVideoCaches,
} from "@/common/cache-search-client";

describe("common cache search", () => {
  test("builds an encoded NicoCache_nl search URL", () => {
    expect(getCacheSearchUrl(" 豪血寺一族 ")).toBe(
      "https://nicocachenl.test/api/v1/cache-entries?query=%E8%B1%AA%E8%A1%80%E5%AF%BA%E4%B8%80%E6%97%8F&order=desc",
    );
    expect(() => getCacheSearchUrl("   ")).toThrow(
      "検索キーワードを入力してください。",
    );
  });

  test("groups quality variants by videoId and sorts by newest cache", () => {
    expect(
      parseCacheSearchResponse({
        "sm9[360p,64].hls": ["旧タイトル", "music", 1_000, 100],
        "sm9[720p,128].hls": ["新タイトル", "music", 2_000, 300],
        "sm10.mp4": ["別動画", "", 500, 200],
        invalid: ["除外対象", "", 100, 400],
      }),
    ).toEqual([
      {
        videoId: "sm9",
        title: "新タイトル",
        cacheIds: ["sm9[360p,64].hls", "sm9[720p,128].hls"],
        folders: ["music"],
        totalSize: 3_000,
        newestTimestamp: 300,
      },
      {
        videoId: "sm10",
        title: "別動画",
        cacheIds: ["sm10.mp4"],
        folders: [],
        totalSize: 500,
        newestTimestamp: 200,
      },
    ]);
  });

  test("新APIの一覧ラッパーから完成キャッシュだけを検索語で絞り込む", () => {
    expect(
      parseCacheSearchResponse(
        {
          complete: {
            "sm9[720p,128].hls": ["陰陽師 本編", "music", 1_000, 300],
            "sm10[720p,128].hls": ["別の動画", "", 2_000, 200],
            "sm11[720p,128].hls": ["陰陽師 続編", "", 3_000, 400],
          },
          temporary: {
            "sm12[720p,128].hls": ["陰陽師 取得中", "", 4_000, 500],
          },
        },
        "陰陽師 -続編",
      ),
    ).toEqual([
      {
        videoId: "sm9",
        title: "陰陽師 本編",
        cacheIds: ["sm9[720p,128].hls"],
        folders: ["music"],
        totalSize: 1_000,
        newestTimestamp: 300,
      },
    ]);
  });

  test("新APIの一覧ラッパーでは動画IDでも検索できる", () => {
    expect(
      parseCacheSearchResponse(
        {
          complete: {
            "sm9[720p,128].hls": ["タイトル", "", 1_000, 300],
            "sm10[720p,128].hls": ["タイトル", "", 2_000, 200],
          },
          temporary: {},
        },
        "sm10",
      ).map((result) => result.videoId),
    ).toEqual(["sm10"]);
  });

  test("requests the search API without cache and validates the response", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const results = await searchVideoCaches("陰陽師", {
      fetcher: (input, init) => {
        requestedUrl = String(input);
        requestedInit = init;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              complete: {
                "sm9[720p,128].hls": ["レッツゴー！陰陽師", "", 123, 456],
                "sm10[720p,128].hls": ["別の動画", "", 789, 500],
              },
              temporary: {},
            }),
            { status: 200 },
          ),
        );
      },
    });

    expect(requestedUrl).toContain(
      "/api/v1/cache-entries?query=%E9%99%B0%E9%99%BD%E5%B8%AB&order=desc",
    );
    expect(requestedInit?.cache).toBe("no-store");
    expect(results.map((result) => result.videoId)).toEqual(["sm9"]);
  });

  test("reports HTTP failures", async () => {
    await expect(
      searchVideoCaches("missing", {
        fetcher: () => Promise.resolve(new Response("", { status: 500 })),
      }),
    ).rejects.toThrow("HTTP 500");
  });
});

test("video-playerは本体の検索・メディアAPIだけを使う", () => {
  const sourceRoot = join(import.meta.dirname, "..", "src", "video-player");
  const source = [
    readFileSync(join(sourceRoot, "router", "watch-page-router.ts"), "utf8"),
    readFileSync(join(sourceRoot, "core", "url-manager.ts"), "utf8"),
  ].join("\n");

  expect(source).toContain("searchVideoCaches");
  expect(source).toContain("/media");
  expect(source).not.toContain("extensions/filter-matome/cache-search");
  expect(source).not.toContain("CustomCacheReturner");
  expect(source).not.toContain("/cache/file/");
  expect(source).not.toContain("/local/cache/");
});
