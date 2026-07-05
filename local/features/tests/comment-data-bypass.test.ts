import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

const readSource = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), "utf8");

describe("comment data downloads bypass comment-filter2", () => {
  test("common helper exposes a filter bypass path with isolated cache keys", () => {
    const common = readSource("src/common/common.ts");
    const interceptor = readSource(
      "src/comment-filter2/proxy/data-interceptor.ts",
    );

    expect(common).toContain("bypassCommentFilter");
    expect(common).toContain("__commentFilter2Bypass");
    expect(common).toContain('? "|raw" : "|filtered"');
    expect(interceptor).toContain("shouldBypassCommentFiltering");
    expect(interceptor).toContain("stripBypassFlag");
  });

  test("download and movie-info comment fetches request raw comments", () => {
    const commentDownload = readSource(
      "src/mlink-video-controller/utils/comment-json-download.ts",
    );
    const movieInfoApi = readSource("src/movie-info/api-clients.ts");

    expect(commentDownload).toContain("fetchNicoDataWithComments(videoId,");
    expect(commentDownload).toContain("bypassCommentFilter: true");
    expect(movieInfoApi).toContain("fetchNicoDataWithComments(videoId,");
    expect(movieInfoApi).toContain("bypassCommentFilter: true");
  });
});
