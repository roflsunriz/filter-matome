import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type NotificationFixture = {
  pages: Array<Record<string, unknown>>;
};

const projectRoot = join(import.meta.dirname, "..");
const fixturesRoot = join(import.meta.dirname, "fixtures");
const fixtureEntry = join(
  fixturesRoot,
  "common-notification-read-all-entry.ts",
);
const pageUrl = "https://www.nicovideo.jp/common-header-notification-test";
const apiPattern = "https://api.oshirasebox.nicovideo.jp/**";
const corsHeaders = {
  "Access-Control-Allow-Origin": new URL(pageUrl).origin,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Frontend-Id, X-Request-With",
};
const htmlFixture = readFileSync(
  join(fixturesRoot, "nicovideo-common-header-notifications.html"),
  "utf8",
);
const notificationFixture = JSON.parse(
  readFileSync(join(fixturesRoot, "common-header-notifications.json"), "utf8"),
) as NotificationFixture;

let bundle = "";

const buildFixtureBundle = (): string => {
  const directory = mkdtempSync(join(tmpdir(), "common-notification-test-"));
  const output = join(directory, "common-notification.js");
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
};

const fulfillDocument = async (route: Route): Promise<void> => {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: htmlFixture,
  });
};

const installFixture = async (page: Page, language = "ja"): Promise<void> => {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: bundle });
  await page.evaluate((fixtureLanguage) => {
    document.documentElement.lang = fixtureLanguage;
    window.logger = {
      info: () => undefined,
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
      handleError: () => undefined,
      measurePerformance: (_component, _method, callback) => callback(),
    };

    const bell = document.getElementById("official-bell-trigger");
    bell?.addEventListener("click", () => {
      const current = Number(document.body.dataset.bellCloseCount ?? "0");
      document.body.dataset.bellCloseCount = String(current + 1);
      document.querySelector('[data-fixture="notification-panel"]')?.remove();
    });

    (
      window as Window & { startNotificationReadAllTest?: () => void }
    ).startNotificationReadAllTest?.();
  }, language);
};

test.beforeAll(() => {
  bundle = buildFixtureBundle();
});

test("公式CommonHeader相当の未読fixtureを全ページ既読にしてパネルを閉じる", async ({
  page,
}) => {
  const putPaths: string[] = [];
  const getOffsets: string[] = [];
  await page.route(apiPattern, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (request.method() === "GET") {
      const offset = url.searchParams.get("offset") ?? "0";
      getOffsets.push(offset);
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify(
          offset === "25"
            ? notificationFixture.pages[1]
            : notificationFixture.pages[0],
        ),
      });
      return;
    }

    putPaths.push(url.pathname);
    expect(request.headers()["x-frontend-id"]).toBe("135");
    expect(request.headers()["x-request-with"]).toBe(pageUrl);
    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ meta: { status: 200 }, data: {} }),
    });
  });

  await installFixture(page);
  const button = page.locator(
    '[data-filter-matome-notification-read-all="true"]',
  );
  await expect(button).toHaveCount(1);
  await expect(button).toHaveText("すべて既読");

  await page.evaluate(() => {
    const current = document.querySelector(
      '[data-fixture="notification-header"]',
    );
    if (!(current instanceof HTMLElement)) {
      throw new Error("notification header fixture was not found");
    }
    const replacement = current.cloneNode(true) as HTMLElement;
    replacement
      .querySelector('[data-filter-matome-notification-read-all="true"]')
      ?.remove();
    current.replaceWith(replacement);
  });
  await expect(button).toHaveCount(1);

  await button.click();
  await expect
    .poll(() => putPaths.length, { message: "全未読通知のPUT完了を待機" })
    .toBe(3);
  expect(getOffsets).toEqual(["0", "25"]);
  expect(putPaths.sort()).toEqual([
    "/v1/notifications/1004/read",
    "/v1/notifications/notice-unread-1/read",
    "/v1/notifications/notice-unread-2/read",
  ]);
  await expect(page.locator("body")).toHaveAttribute(
    "data-bell-close-count",
    "1",
  );
  await expect(page.locator('[data-fixture="notification-panel"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".toast-message")).toContainText(
    "3件の通知を既読にしました。",
  );
});

test("一部の既読化が失敗した場合はパネルを閉じず再試行できる", async ({
  page,
}) => {
  let shouldFail = true;
  let putCount = 0;
  await page.route(apiPattern, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({
          data: {
            notifications: [{ id: "retry-notice", read: false }],
            nextUrl: null,
          },
        }),
      });
      return;
    }

    putCount += 1;
    await route.fulfill({
      status: shouldFail ? 500 : 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify(
        shouldFail ? { message: "temporary" } : { data: {} },
      ),
    });
    shouldFail = false;
    expect(url.pathname).toBe("/v1/notifications/retry-notice/read");
  });

  await installFixture(page);
  const button = page.getByRole("button", { name: "すべて既読" });
  await button.click();
  await expect(page.locator(".toast-message")).toContainText(
    "1件は失敗したため、もう一度お試しください。",
  );
  await expect(button).toBeEnabled();
  await expect(page.locator('[data-fixture="notification-panel"]')).toHaveCount(
    1,
  );

  await button.click();
  await expect.poll(() => putCount).toBe(2);
  await expect(page.locator("body")).toHaveAttribute(
    "data-bell-close-count",
    "1",
  );
});

test("狭幅のRTL表示でも一括既読ボタンが画面外へはみ出さない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await installFixture(page, "ur");

  const button = page.getByRole("button", { name: "سب کو پڑھا ہوا کریں" });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 321)).toBeLessThanOrEqual(320);
});
