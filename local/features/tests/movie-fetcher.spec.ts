import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "movie-fetcher-entry.ts",
);
const pageUrl = "https://www.nicovideo.jp/search/test";
let bundle = "";

test.beforeAll(() => {
  const directory = mkdtempSync(join(tmpdir(), "movie-fetcher-test-"));
  const output = join(directory, "movie-fetcher.js");
  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", output, fixtureEntry],
      {
        cwd: projectRoot,
        stdio: "pipe",
      },
    );
    bundle = readFileSync(output, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function documentRoute(route: Route): void {
  void route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: `<!doctype html><html lang="ja"><head></head><body>
      <div data-group="true" data-decoration-video-id="sm9">
        <a href="/watch/sm9">test</a>
      </div>
    </body></html>`,
  });
}

test("カードからDomand取得を開始し完了状態を表示する", async ({ page }) => {
  let extensionStatus = "idle";
  await page.route(pageUrl, documentRoute);
  await page.route("**/api/watch/v3_guest/sm9?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          response: {
            client: { watchTrackId: "track" },
            media: {
              domand: {
                accessRightKey: "test-key",
                videos: [
                  { id: "video-h264-360p", isAvailable: true, qualityLevel: 1 },
                ],
                audios: [
                  {
                    id: "audio-aac-128kbps",
                    isAvailable: true,
                    qualityLevel: 1,
                  },
                ],
              },
            },
          },
        },
      }),
    }),
  );
  await page.route(
    "https://nvapi.nicovideo.jp/v1/watch/sm9/access-rights/hls?**",
    (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            contentUrl:
              "https://delivery.domand.nicovideo.jp/hlsbid/0123456789abcdef01234567/playlists/variants/0123456789abcdef.m3u8",
          },
        }),
      }),
  );
  await page.route(
    "**/cache/filter-matome/v1/movie-fetcher/**",
    async (route) => {
      const url = route.request().url();
      if (url.endsWith("/start")) extensionStatus = "fetching";
      else if (url.includes("/status") && extensionStatus === "fetching")
        extensionStatus = "completed";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          videoId: "sm9",
          status: extensionStatus,
          completed: extensionStatus === "completed" ? 2 : 0,
          total: 2,
        }),
      });
    },
  );

  await page.goto(pageUrl);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() =>
    (
      window as Window & { startMovieFetcherTest?: () => void }
    ).startMovieFetcherTest?.(),
  );
  const button = page.locator(".filter-matome-movie-fetcher");
  await expect(button).toHaveAttribute("data-video-id", "sm9");
  await button.click();
  await expect(button).toHaveAttribute("data-status", "completed");
  await expect(button).toHaveAttribute("title", /取得完了/);
});

test("SPAで追加されたカードにもボタンを一度だけ付ける", async ({ page }) => {
  await page.route(pageUrl, documentRoute);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    (
      window as Window & { startMovieFetcherTest?: () => void }
    ).startMovieFetcherTest?.();
    const card = document.createElement("article");
    card.innerHTML = '<a href="/watch/so12345">dynamic</a>';
    document.body.append(card);
  });
  await expect(page.locator('[data-video-id="so12345"]')).toHaveCount(1);
  await page.evaluate(() =>
    document.body.append(document.createTextNode("update")),
  );
  await expect(page.locator('[data-video-id="so12345"]')).toHaveCount(1);
});
