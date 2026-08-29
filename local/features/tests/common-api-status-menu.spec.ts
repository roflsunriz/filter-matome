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
      document.body.style.minHeight = "2000px";
      const headerMenuLeft = Math.max(0, innerWidth - 340);
      const nicoCacheMenu = document.createElement("div");
      nicoCacheMenu.id = "ncnl_common_header_menu";
      nicoCacheMenu.dataset.ncnlMounted = "account";
      nicoCacheMenu.style.cssText = `position:fixed;left:${String(headerMenuLeft)}px;top:0;width:90px;height:36px`;
      document.body.append(nicoCacheMenu);
      const accountLink = document.querySelector<HTMLAnchorElement>(
        '#CommonHeader a[href="https://www.nicovideo.jp/my"]',
      );
      const accountItem = accountLink?.parentElement;
      if (!accountItem) throw new Error("account fixture not found");
      const accountRow = accountItem.parentElement;
      if (!accountRow) throw new Error("account row fixture not found");
      accountRow.style.cssText = `display:flex;height:36px;margin-left:${String(headerMenuLeft)}px;align-items:center`;
      for (const child of accountRow.children) {
        if (child !== accountItem && child instanceof HTMLElement) {
          child.style.display = "none";
        }
      }
      accountItem.setAttribute("data-ncnl-account-space", "true");
      accountItem.setAttribute("data-ncnl-account-original-margin", "");
      accountItem.setAttribute("data-ncnl-account-base-margin", "0px");
      accountItem.setAttribute("data-ncnl-account-width", "90");
      accountItem.style.cssText =
        "width:140px;height:36px;margin-left:calc(0px + 90px)";
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

const hasDesiredAccountMenuOrder = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const filterMenu = document.getElementById("filter-matome-api-status-menu");
    const nicoCacheMenu = document.getElementById("ncnl_common_header_menu");
    const accountItem = document.querySelector(
      '#CommonHeader a[href="https://www.nicovideo.jp/my"]',
    )?.parentElement;
    if (!filterMenu || !nicoCacheMenu || !accountItem) return false;
    const filterRect = filterMenu.getBoundingClientRect();
    const nicoCacheRect = nicoCacheMenu.getBoundingClientRect();
    const accountRect = accountItem.getBoundingClientRect();
    const popover = document.getElementById("filter-matome-api-status-popover");
    const header = document.getElementById("CommonHeader");
    return (
      filterMenu.parentElement === document.body &&
      getComputedStyle(filterMenu).position === "fixed" &&
      popover !== null &&
      getComputedStyle(popover).position === "absolute" &&
      header !== null &&
      getComputedStyle(header).position === "sticky" &&
      getComputedStyle(nicoCacheMenu).position === "fixed" &&
      Math.abs(nicoCacheRect.right - filterRect.left) <= 1 &&
      Math.abs(filterRect.right - accountRect.left) <= 1
    );
  });

test.beforeAll(() => {
  bundle = buildFixtureBundle();
});

test("NicoCacheメニューとアカウントメニューの間へ配置しAPI状態を更新する", async ({
  page,
}) => {
  await installFixture(page);
  const menu = page.locator("#filter-matome-api-status-menu");
  const trigger = page.getByRole("button", {
    name: "filter-matome: nlFilter API 挿入状態",
  });
  await expect(menu).toHaveCount(1);
  await expect(menu).toHaveAttribute("data-filter-matome-mounted", "account");
  await expect.poll(() => hasDesiredAccountMenuOrder(page)).toBe(true);

  const beforeScroll = await trigger.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { viewportTop: rect.top, documentTop: rect.top + window.scrollY };
  });
  await page.evaluate(() => window.scrollTo(0, 240));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(240);
  const afterScroll = await trigger.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { viewportTop: rect.top, documentTop: rect.top + window.scrollY };
  });
  expect(afterScroll.viewportTop).toBeGreaterThanOrEqual(0);
  expect(afterScroll.documentTop).toBeGreaterThan(beforeScroll.documentTop);
  await expect.poll(() => hasDesiredAccountMenuOrder(page)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

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
    "probing",
  );

  await page.evaluate(() => {
    window.FilterMatomeCommentMenuBridgeApi = { version: 1 };
    window.dispatchEvent(new Event("filter-matome:api-status-change"));
  });
  await expect(menu.locator('[data-api-id="comment-menu"]')).toHaveAttribute(
    "data-status",
    "active",
  );
  await expect(menu).toHaveAttribute("data-summary", "active");

  const statusItems = menu.locator('[role="menuitem"]');
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(statusItems.first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(statusItems.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await page.evaluate(() => {
    const header = document.getElementById("CommonHeader");
    if (!header) throw new Error("CommonHeader fixture not found");
    const replacement = header.cloneNode(true) as HTMLElement;
    replacement.querySelector("#filter-matome-api-status-menu")?.remove();
    header.replaceWith(replacement);
  });
  await expect(menu).toHaveCount(1);
  await expect.poll(() => hasDesiredAccountMenuOrder(page)).toBe(true);

  await page.evaluate(() => {
    const header = document.getElementById("CommonHeader");
    if (!header) throw new Error("CommonHeader fixture not found");
    (
      window as Window & { detachedCommonHeaderFixture?: HTMLElement }
    ).detachedCommonHeaderFixture = header;
    header.remove();
  });
  await expect(menu).toHaveCount(1);
  await expect(menu).toHaveAttribute("data-filter-matome-mounted", "account");
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
  await expect(menu).toHaveCount(1);
  await expect(menu).toHaveAttribute("data-filter-matome-mounted", "account");
  await expect.poll(() => hasDesiredAccountMenuOrder(page)).toBe(true);
});

test("API不在と版不一致を赤い要約状態で区別する", async ({ page }) => {
  await installFixture(page, { activeApis: false });
  const menu = page.locator("#filter-matome-api-status-menu");
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
    window.dispatchEvent(new Event("filter-matome:api-status-change"));
  });
  await expect(menu.locator('[data-api-id="comment-reload"]')).toHaveAttribute(
    "data-status",
    "incompatible",
  );
});

test("公式Watchの全画面表示中はメニューを閉じて非表示にする", async ({
  page,
}) => {
  await installFixture(page);
  const menu = page.locator("#filter-matome-api-status-menu");
  const trigger = page.getByRole("button", {
    name: "filter-matome: nlFilter API 挿入状態",
  });
  await trigger.focus();
  await expect(menu).toHaveAttribute("data-filter-matome-open", "true");

  await page.evaluate(() => {
    const target = document.createElement("div");
    target.dataset.stylingName = "fullscreen-target";
    document.body.append(target);
    const style = document.createElement("style");
    style.dataset.fixture = "browser-fullscreen";
    style.textContent =
      '[data-styling-name="fullscreen-target"] { position: fixed; inset: 1px; }';
    document.body.append(style);
  });
  await expect(menu).toBeHidden();
  await expect(menu).toHaveAttribute("data-filter-matome-open", "false");

  await page.evaluate(() => {
    document.querySelector('[data-fixture="browser-fullscreen"]')?.remove();
  });
  await expect(menu).toBeVisible();
  await expect.poll(() => hasDesiredAccountMenuOrder(page)).toBe(true);
});

test("狭幅RTLでもホバーパネルが画面外へはみ出さずEscapeで閉じる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 480 });
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
  expect((box?.x ?? 0) + (box?.width ?? 481)).toBeLessThanOrEqual(480);
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 481)).toBeLessThanOrEqual(480);
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
});
