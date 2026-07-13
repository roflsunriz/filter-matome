import { describe, expect, test } from "bun:test";

import { extractVideoIdFromInput } from "@/common/video-navigation";

describe("common video navigation", () => {
  test("extracts a videoId from a watch URL", () => {
    expect(
      extractVideoIdFromInput(
        "https://www.nicovideo.jp/watch/sm12345678?from=playlist",
      ),
    ).toBe("sm12345678");
  });

  test("accepts a videoId directly and normalizes its case", () => {
    expect(extractVideoIdFromInput("SM12345678")).toBe("sm12345678");
  });

  test("returns null when no two-letter numeric videoId is present", () => {
    expect(extractVideoIdFromInput("https://example.com/watch/12345678")).toBe(
      null,
    );
  });
});
