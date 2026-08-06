import { expect, type Locator, type Page } from "@playwright/test";

const CACHE_ICON_SCRIPT_URL =
  "https://www.nicovideo.jp/local/15_cached_link_color.js";
const CACHE_ICON_STYLESHEET_URL =
  "https://www.nicovideo.jp/local/nl_cacheIcon.css";

const cacheIconScriptFixture = String.raw`
(() => {
  window.__cacheIconTestSourceLoaded = true;

  const decorate = () => {
    document.querySelectorAll("[data-content-id]").forEach((item) => {
      const videoId = item.getAttribute("data-content-id");
      if (!videoId) return;

      const link = Array.from(item.querySelectorAll("a")).find((anchor) => {
        return new URL(anchor.href, location.href).pathname === "/watch/" + videoId;
      });
      if (!link || !link.querySelector("img") || link.querySelector("[data-cache-icon-test]")) {
        return;
      }

      const icon = document.createElement("span");
      icon.className = "cacheIcon ncnl-cache-icon dmcCacheIconImg";
      icon.dataset.cacheIconTest = "";
      link.append(icon);
    });
  };

  new MutationObserver(decorate).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  decorate();
})();
`;

export async function installCacheIconAssetRoutes(page: Page): Promise<void> {
  await page.route(CACHE_ICON_STYLESHEET_URL, async (route) => {
    await route.fulfill({
      contentType: "text/css; charset=utf-8",
      body: ".cacheIcon.ncnl-cache-icon{display:block;width:59px;height:15px;background:#00a846}",
    });
  });
  await page.route(CACHE_ICON_SCRIPT_URL, async (route) => {
    await route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: cacheIconScriptFixture,
    });
  });
}

export async function expectCacheIconAssetApplied(
  page: Page,
  thumbnailLink: Locator,
): Promise<void> {
  expect(
    await page.evaluate(() =>
      Boolean(
        (window as unknown as { __cacheIconTestSourceLoaded?: boolean })
          .__cacheIconTestSourceLoaded,
      ),
    ),
  ).toBe(true);
  await expect(
    thumbnailLink.locator(":scope > [data-cache-icon-test]"),
  ).toBeVisible();
}
