import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "watch-history-entry.ts",
);

function buildTrackerBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "watch-tracker-test-"));
  const output = join(directory, "watch-tracker.js");
  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", output, fixtureEntry],
      { cwd: projectRoot, stdio: "pipe" },
    );
    return readFileSync(output, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const appBundle = buildTrackerBundle();
test("視聴トラッカーが動的videoを記録しSPA離脱後に監視を解除する", async ({
  page,
}) => {
  await page.route("https://www.nicovideo.jp/watch/sm9", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><body><video></video></body></html>",
    }),
  );
  await page.goto("https://www.nicovideo.jp/watch/sm9");
  await page.evaluate(() => {
    const video = document.querySelector("video");
    if (!video) throw new Error("video fixture is missing");
    let currentTime = 0;
    Object.defineProperties(video, {
      currentTime: {
        configurable: true,
        get: () => currentTime,
        set: (value: number) => {
          currentTime = value;
        },
      },
      duration: { configurable: true, get: () => 100 },
      readyState: { configurable: true, get: () => 1 },
    });
    window.commonHelper = {
      fetchWatchPage: async () => ({
        apiData: {
          video: {
            title: "追跡テスト動画",
            duration: 100,
            count: { view: 10, comment: 2, mylist: 1, like: 3 },
            registeredAt: "2026-07-01T00:00:00+09:00",
            thumbnail: { url: "https://example.com/sm9.jpg" },
          },
          owner: { id: "owner-9", nickname: "投稿者9" },
          tag: { items: [{ name: "テスト" }] },
        },
      }),
    } as typeof window.commonHelper;
    const testWindow = window as unknown as {
      trackerEvents: string[];
      setTrackerTime(value: number): void;
    };
    testWindow.trackerEvents = [];
    testWindow.setTrackerTime = (value: number) => {
      video.currentTime = value;
    };
    document.addEventListener("watchHistoryEvent", (event) => {
      testWindow.trackerEvents.push(
        (event as CustomEvent<{ type: string }>).detail.type,
      );
    });
  });
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        WatchHistoryTest: {
          installNavigationMonitor(): void;
          startWatchTracker(): void;
        };
      }
    ).WatchHistoryTest;
    api.installNavigationMonitor();
    api.startWatchTracker();
  });

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const result = await (
          window as unknown as {
            WatchHistoryTest: {
              getEntry(videoId: string): Promise<{
                success: boolean;
                data?: { watchLogs: unknown[] };
              }>;
            };
          }
        ).WatchHistoryTest.getEntry("sm9");
        return result.success && result.data?.watchLogs.length === 1;
      }),
    )
    .toBe(true);

  await page.evaluate(() => {
    const testWindow = window as unknown as {
      setTrackerTime(value: number): void;
    };
    testWindow.setTrackerTime(40);
    const video = document.querySelector("video");
    video?.dispatchEvent(new Event("play"));
    video?.dispatchEvent(new Event("timeupdate"));
    video?.dispatchEvent(new Event("pause"));
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const result = await (
          window as unknown as {
            WatchHistoryTest: {
              getEntry(videoId: string): Promise<{
                data?: { lastPosition: number };
              }>;
            };
          }
        ).WatchHistoryTest.getEntry("sm9");
        return result.data?.lastPosition;
      }),
    )
    .toBe(40);

  const eventCountAtNavigation = await page.evaluate(() => {
    history.pushState({}, "", "/ranking");
    return (window as unknown as { trackerEvents: string[] }).trackerEvents
      .length;
  });
  await page.waitForTimeout(100);
  const eventsAfterDetachedPlay = await page.evaluate(() => {
    document.querySelector("video")?.dispatchEvent(new Event("play"));
    return (window as unknown as { trackerEvents: string[] }).trackerEvents;
  });
  expect(eventsAfterDetachedPlay).toContain("start");
  expect(eventsAfterDetachedPlay).toContain("resume");
  expect(eventsAfterDetachedPlay).toContain("pause");
  expect(eventsAfterDetachedPlay).toHaveLength(eventCountAtNavigation);
});
