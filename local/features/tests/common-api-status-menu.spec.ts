import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixturesRoot = join(import.meta.dirname, "fixtures");
const fixtureEntry = join(fixturesRoot, "common-api-status-menu-entry.ts");
const pageUrl = "https://www.nicovideo.jp/watch/sm9";
const headerFixture = readFileSync(
  join(fixturesRoot, "nicovideo-common-header-account.html"),
  "utf8",
);

let bundle = "";

const buildFixtureBundle = (): string => {
  const directory = mkdtempSync(join(tmpdir(), "common-api-status-test-"));
  const output = join(directory, "common-api-status.js");
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
    body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>API status fixture</title></head><body>${headerFixture}</body></html>`,
  });
};

const installFixture = async (
  page: Page,
  options: { language?: string; activeApis?: boolean } = {},
): Promise<void> => {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.evaluate(
    ({ language, activeApis }) => {
      document.documentElement.lang = language;
      const nicoCacheMenu = document.createElement("div");
      nicoCacheMenu.id = "ncnl_common_header_menu";
      nicoCacheMenu.dataset.ncnlMounted = "account";
      nicoCacheMenu.style.cssText =
        "position:fixed;left:860px;top:0;width:90px;height:36px";
      document.body.append(nicoCacheMenu);
      if (!activeApis) return;
      window.FilterMatomePlaybackRateApi = {
        version: 1,
        get: () => 1,
        set: (rate) => rate,
      };
      window.FilterMatomeCommentApi = {
        version: 1,
        reload: async () => undefined,
      };
      window.FilterMatomeCommentMenuApi = {
        version: 1,
        getItems: () => [],
        execute: async () => true,
      };
    },
    {
      language: options.language ?? "ja",
      activeApis: options.activeApis ?? true,
    },
  );
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    (
      window as Window & {
        startFilterMatomeApiStatusMenuTest?: () => void;
      }
    ).startFilterMatomeApiStatusMenuTest?.();
  });
};

test.beforeAll(() => {
  bundle = buildFixtureBundle();
});

test("NicoCacheメニューの左へ別メニューとして配置しAPI状態を更新する", async ({
  page,
}) => {
  await installFixture(page);
  const menu = page.locator("#filter-matome-api-status-menu");
  const trigger = page.getByRole("button", {
    name: "filter-matome: nlFilter API 挿入状態",
  });
  await expect(menu).toHaveCount(1);
  await expect(menu).toHaveAttribute("data-placement", "account");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const filterMenu = document.getElementById(
          "filter-matome-api-status-menu",
        );
        const nicoCacheMenu = document.getElementById(
          "ncnl_common_header_menu",
        );
        if (!filterMenu || !nicoCacheMenu) return false;
        return (
          filterMenu.parentElement === document.body &&
          filterMenu.getBoundingClientRect().right <=
            nicoCacheMenu.getBoundingClientRect().left
        );
      }),
    )
    .toBe(true);

  await trigger.hover();
  await expect(menu).toHaveAttribute("data-summary", "warning");
  await expect(menu.locator('[data-api-id="playback-rate"]')).toHaveAttribute(
    "data-status",
    "active",
  );
  await expect(menu.locator('[data-api-id="comment-reload"]')).toHaveAttribute(
    "data-status",
    "active",
  );
  await expect(menu.locator('[data-api-id="comment-menu"]')).toHaveAttribute(
    "data-status",
    "waiting",
  );

  await page.evaluate(() => {
    window.FilterMatomeCommentMenuBridgeApi = { version: 1 };
  });
  await page.locator("body").hover({ position: { x: 2, y: 80 } });
  await trigger.hover();
  await expect(menu.locator('[data-api-id="comment-menu"]')).toHaveAttribute(
    "data-status",
    "active",
  );
  await expect(menu).toHaveAttribute("data-summary", "active");

  await page.evaluate(() => {
    const header = document.getElementById("CommonHeader");
    if (!header) throw new Error("CommonHeader fixture not found");
    const replacement = header.cloneNode(true) as HTMLElement;
    replacement.querySelector("#filter-matome-api-status-menu")?.remove();
    header.replaceWith(replacement);
  });
  await expect(menu).toHaveCount(1);

  await page.evaluate(() => {
    const header = document.getElementById("CommonHeader");
    if (!header) throw new Error("CommonHeader fixture not found");
    (
      window as Window & { detachedCommonHeaderFixture?: HTMLElement }
    ).detachedCommonHeaderFixture = header;
    header.remove();
  });
  await expect(menu).not.toHaveAttribute("data-mounted", "true");
  await page.evaluate(() => {
    const host = window as Window & {
      detachedCommonHeaderFixture?: HTMLElement;
    };
    if (!host.detachedCommonHeaderFixture) {
      throw new Error("detached CommonHeader fixture not found");
    }
    document.body.prepend(host.detachedCommonHeaderFixture);
    delete host.detachedCommonHeaderFixture;
  });
  await expect(menu).toHaveAttribute("data-mounted", "true");
});

test("API不在と版不一致を赤い要約状態で区別する", async ({ page }) => {
  await installFixture(page, { activeApis: false });
  const menu = page.locator("#filter-matome-api-status-menu");
  await page.getByRole("button", { name: /filter-matome/u }).hover();
  await expect(menu).toHaveAttribute("data-summary", "error");
  await expect(menu.locator('[data-api-id="comment-reload"]')).toHaveAttribute(
    "data-status",
    "missing",
  );

  await page.evaluate(() => {
    window.FilterMatomeCommentApi = {
      version: 1,
      reload: "invalid",
    } as unknown as Window["FilterMatomeCommentApi"];
  });
  await page.locator("body").hover({ position: { x: 2, y: 80 } });
  await page.getByRole("button", { name: /filter-matome/u }).hover();
  await expect(menu.locator('[data-api-id="comment-reload"]')).toHaveAttribute(
    "data-status",
    "incompatible",
  );
});

test("狭幅RTLでもホバーパネルが画面外へはみ出さずEscapeで閉じる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await installFixture(page, { language: "ur" });
  const trigger = page.getByRole("button", {
    name: "filter-matome: nlFilter API کی حالت",
  });
  const popover = page.locator("#filter-matome-api-status-popover");
  await trigger.focus();
  await expect(popover).toBeVisible();
  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 321)).toBeLessThanOrEqual(320);
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 481)).toBeLessThanOrEqual(480);
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
});
