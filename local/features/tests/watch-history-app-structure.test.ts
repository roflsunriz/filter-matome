import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const watchHistoryRoot = join(import.meta.dir, "..", "src", "watch-history");

describe("watch-history app structure", () => {
  test("keeps each app module at 1,000 lines or fewer", () => {
    const oversizedModules = readdirSync(watchHistoryRoot)
      .filter((fileName) => /^app(?:-.+)?\.ts$/.test(fileName))
      .map((fileName) => {
        const source = readFileSync(join(watchHistoryRoot, fileName), "utf8");
        return {
          fileName,
          lineCount: source.split(/\r?\n/).length,
        };
      })
      .filter(({ lineCount }) => lineCount > 1000);

    expect(oversizedModules).toEqual([]);
  });

  test("tracker teardown removes video listeners and pending timers", () => {
    const source = readFileSync(
      join(watchHistoryRoot, "watch-tracker.ts"),
      "utf8",
    );

    for (const eventName of [
      "loadedmetadata",
      "play",
      "pause",
      "ended",
      "timeupdate",
    ]) {
      expect(source).toMatch(
        new RegExp(`removeEventListener\\(\\s*\"${eventName}\"`),
      );
    }
    expect(source).toContain("clearTimeout(this.videoRetryTimer)");
    expect(source).toContain("clearTimeout(this.timeUpdateTimer)");
    expect(source).toContain("generation !== trackerGeneration");
  });
});
