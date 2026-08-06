import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "smart-fetcher-entry.ts",
);
const sourceHtml = join(projectRoot, "src", "movie-fetcher", "scheduler.html");
const pageUrl =
  "https://www.nicovideo.jp/local/features/dist/pages/movie-fetcher/index.html?videoId=sm9";
let bundle = "";

test.beforeAll(() => {
  const directory = mkdtempSync(join(tmpdir(), "smart-fetcher-test-"));
  const output = join(directory, "smart-fetcher.js");
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

const settings = {
  timeZone: "Asia/Tokyo",
  bandwidthMode: "fixed",
  fixedBytesPerSecond: 1_048_576,
  lineBytesPerSecond: 10_485_760,
  percentage: 20,
  measuredBytesPerSecond: 0,
  defaultWindowMinutes: 360,
  safetyPercent: 120,
  holidayCalendar: "japan",
  maxHistory: 500,
};

function createState() {
  return {
    schemaVersion: 1,
    settings: { ...settings },
    schedules: [] as Array<Record<string, unknown>>,
    history: [] as Array<Record<string, unknown>>,
    credentials: { stored: true, savedAt: Date.now() },
    activeScheduleId: "",
  };
}

function documentRoute(route: Route): void {
  const html = readFileSync(sourceHtml, "utf8").replace(
    '<script src="/local/features/dist/features.js" defer></script>',
    "",
  );
  void route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
}

test("動画を調査して予約し、管理操作と設定を同じ画面で行える", async ({
  page,
}, testInfo) => {
  const serverState = createState();
  const actions: string[] = [];
  await page.route(pageUrl, documentRoute);
  await page.route("**/api/watch/v3/sm9?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          response: {
            client: { watchTrackId: "track" },
            video: { title: "テスト動画", duration: 120 },
            media: {
              domand: {
                accessRightKey: "redacted",
                videos: [
                  {
                    id: "video-low",
                    isAvailable: true,
                    qualityLevel: 0,
                    bitRate: 100_000,
                  },
                  {
                    id: "video-high",
                    isAvailable: true,
                    qualityLevel: 1,
                    bitRate: 1_000_000,
                  },
                ],
                audios: [
                  {
                    id: "audio",
                    isAvailable: true,
                    qualityLevel: 1,
                    bitRate: 128_000,
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
    "**/cache/filter-matome/v1/smart-fetcher/**",
    async (route) => {
      const action =
        new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
      actions.push(action);
      if (action === "schedule") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        serverState.schedules = [
          {
            ...body,
            id: "schedule-1",
            state: "scheduled",
            retryCount: 0,
            nextRunAt: body["startAt"],
            lastError: "",
            lastRunAt: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
      } else if (action === "settings") {
        Object.assign(serverState.settings, route.request().postDataJSON());
      } else if (action === "run-now") {
        serverState.activeScheduleId = "schedule-1";
        serverState.schedules[0]!["state"] = "running";
      } else if (action === "cancel") {
        serverState.activeScheduleId = "";
        serverState.schedules[0]!["state"] = "canceled";
        serverState.schedules[0]!["enabled"] = false;
      } else if (action === "remove") {
        serverState.schedules = [];
      } else if (action === "clear-credentials") {
        serverState.credentials = { stored: false, savedAt: 0 };
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(serverState),
      });
    },
  );

  await page.goto(pageUrl);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() =>
    (
      window as Window & { startSmartFetcherTest?: () => Promise<void> }
    ).startSmartFetcherTest?.(),
  );
  await expect(page.locator('input[name="videoId"]')).toHaveValue("sm9");
  await page.locator("#inspect-button").click();
  await expect(page.locator('input[name="title"]')).toHaveValue("テスト動画");
  await expect(page.locator('input[name="estimatedDisplay"]')).not.toHaveValue(
    "",
  );
  const startValue = await page.locator('input[name="startAt"]').inputValue();
  const stopValue = await page.locator('input[name="stopAt"]').inputValue();
  await page.locator('input[name="stopAt"]').fill(startValue);
  await page.locator('#schedule-form button[type="submit"]').click();
  await expect(page.locator("#toast")).toContainText(
    "停止日時は開始日時より後にしてください",
  );
  expect(actions).not.toContain("schedule");
  await page.locator('input[name="stopAt"]').fill(stopValue);
  await page.locator('#schedule-form button[type="submit"]').click();
  await expect(page.locator('[data-schedule-id="schedule-1"]')).toContainText(
    "テスト動画",
  );
  await page.screenshot({
    path: testInfo.outputPath("smart-fetcher-wide.png"),
    fullPage: true,
  });

  await page.locator('input[name="fixedKiB"]').fill("512");
  await page.locator('#settings-form button[type="submit"]').click();
  expect(serverState.settings.fixedBytesPerSecond).toBe(524_288);

  await page.locator('[data-action="run"]').click();
  await expect(page.locator('[data-schedule-id="schedule-1"]')).toContainText(
    "running",
  );
  await page.locator('[data-action="cancel"]').click();
  await expect(page.locator('[data-schedule-id="schedule-1"]')).toContainText(
    "canceled",
  );
  await page.locator('[data-action="remove"]').click();
  await expect(page.locator("#schedule-list")).toContainText(
    "予約済み動画はありません",
  );
  await page.locator("#clear-credentials-button").click();
  await expect(page.locator("#credential-status")).toContainText("未保存");
  expect(actions).toEqual(
    expect.arrayContaining([
      "credentials",
      "state",
      "schedule",
      "settings",
      "run-now",
      "cancel",
      "remove",
      "clear-credentials",
    ]),
  );
});

test("狭い画面でも横にはみ出さず全フォームへ到達できる", async ({
  page,
}, testInfo) => {
  const serverState = createState();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(pageUrl, documentRoute);
  await page.route("**/cache/filter-matome/v1/smart-fetcher/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(serverState),
    }),
  );
  await page.route("**/api/watch/v3/sm9?**", (route) => route.abort());
  await page.goto(pageUrl);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() =>
    (
      window as Window & { startSmartFetcherTest?: () => Promise<void> }
    ).startSmartFetcherTest?.(),
  );
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.locator("#settings-form")).toBeVisible();
  await expect(page.locator("#schedule-form")).toBeVisible();
  await expect(page.locator("#history-list")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("smart-fetcher-mobile.png"),
    fullPage: true,
  });
});
