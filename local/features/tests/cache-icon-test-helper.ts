import { expect, type Locator, type Page } from "@playwright/test";

export * as localApiCors from "./local-api-cors-test-helper";

const CACHE_ICON_SCRIPT_URL =
  "https://www.nicovideo.jp/local/15_cached_link_color.js";
const CACHE_DISPLAY_SCRIPT_URL =
  "https://www.nicovideo.jp/local/ncnl_cache_display.js";
const CACHE_ICON_STYLESHEET_URL =
  "https://www.nicovideo.jp/local/nl_cacheIcon.css";

const cacheDisplayScriptFixture = String.raw`
(() => {
  window.__cacheDisplayTestSourceLoaded = true;
  window.NicoCache_nl = window.NicoCache_nl || {};

  const describe = (videoInfo) => {
    const cacheId = videoInfo.preferred;
    const cacheData = videoInfo.caches[cacheId];
    return {
      cacheId,
      quality: "fhd",
      videoMode: cacheData.videoMode,
      audioBitrate: cacheData.audioBitrate,
      title:
        "NicoCache_nl キャッシュ済み: 映像 " +
        cacheData.videoMode +
        " / 音声 " +
        cacheData.audioBitrate +
        "kbps",
    };
  };

  const createIcon = (videoInfo, compact) => {
    const description = describe(videoInfo);
    const icon = document.createElement("span");
    icon.className = "cacheIcon ncnl-cache-icon ncnl-cache-quality-" + description.quality;
    if (compact) icon.classList.add("ncnl-cache-icon--compact");
    icon.setAttribute("data-ncnl-cache-icon", "");
    icon.setAttribute("data-ncnl-cache-id", description.cacheId);
    icon.setAttribute("title", description.title);
    icon.setAttribute("aria-label", description.title);

    const mark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mark.setAttribute("class", "ncnl-cache-mark");
    mark.setAttribute("aria-hidden", "true");
    icon.append(mark);

    const label = document.createElement("span");
    label.className = "ncnl-cache-quality-label";
    const video = document.createElement("span");
    video.className = "ncnl-cache-video";
    video.textContent = description.videoMode;
    const separator = document.createElement("span");
    separator.className = "ncnl-cache-separator";
    separator.textContent = "·";
    const audio = document.createElement("span");
    audio.className = "ncnl-cache-audio";
    audio.textContent = description.audioBitrate + "k";
    label.append(video, separator, audio);
    icon.append(label);
    return icon;
  };

  window.NicoCache_nl.cacheDisplay = { describe, createIcon };
})();
`;

const cacheIconScriptFixture = String.raw`
(() => {
  const cacheDisplay = window.NicoCache_nl && window.NicoCache_nl.cacheDisplay;
  window.__cacheIconTestSourceLoaded = Boolean(cacheDisplay);
  if (!cacheDisplay) return;

  const decorate = () => {
    document.querySelectorAll("a").forEach((link) => {
      const match = new URL(link.href, location.href).pathname.match(
        /^\/watch\/([a-z]{2}\d+)$/i,
      );
      const videoId = match && match[1];
      if (!videoId || !link.querySelector("img") || link.querySelector("[data-ncnl-cache-icon]")) {
        return;
      }

      const cacheId = videoId + "[1080p,192].hls";
      const icon = cacheDisplay.createIcon(
        {
          videoId,
          preferred: cacheId,
          cacheIds: [cacheId],
          cachings: [],
          completes: [cacheId],
          caches: {
            [cacheId]: {
              videoId,
              cacheId,
              complete: true,
              caching: false,
              videoMode: "1080p",
              audioBitrate: 192,
              legacyLow: false,
              size: 1048576,
              title: "テスト動画",
              subFolder: "",
              filename: cacheId,
              ts: 1786838400,
            },
          },
        },
        link.getBoundingClientRect().width < 120,
      );
      link.classList.add("ncnl-cache-thumbnail-host");
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
      body: ".cacheIcon.ncnl-cache-icon{position:absolute;bottom:4px;left:4px;display:inline-flex;width:max-content;max-width:calc(100% - 8px);height:20px;padding:2px 5px;background:#0a0f16;color:#fff}.ncnl-cache-thumbnail-host{position:relative}.ncnl-cache-mark{width:16px;height:16px}.ncnl-cache-quality-label{display:inline-flex}.ncnl-cache-icon--compact{width:22px}.ncnl-cache-icon--compact .ncnl-cache-quality-label{display:none}",
    });
  });
  await page.route(CACHE_DISPLAY_SCRIPT_URL, async (route) => {
    await route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: cacheDisplayScriptFixture,
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
  await expect(thumbnailLink).toHaveAttribute("href", /\/watch\/[a-z]{2}\d+$/i);
  expect(
    await page.evaluate(() =>
      Boolean(
        (
          window as unknown as {
            __cacheDisplayTestSourceLoaded?: boolean;
          }
        ).__cacheDisplayTestSourceLoaded,
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      Boolean(
        (window as unknown as { __cacheIconTestSourceLoaded?: boolean })
          .__cacheIconTestSourceLoaded,
      ),
    ),
  ).toBe(true);
  const badge = thumbnailLink.locator(":scope > [data-ncnl-cache-icon]");
  await expect(badge).toBeVisible();
  await expect(badge).toHaveClass(/ncnl-cache-quality-fhd/);
  await expect(badge).toHaveAttribute(
    "title",
    "NicoCache_nl キャッシュ済み: 映像 1080p / 音声 192kbps",
  );
  await expect(badge.locator(":scope > .ncnl-cache-mark")).toHaveCount(1);
  await expect(badge.locator(".ncnl-cache-video")).toHaveText("1080p");
  await expect(badge.locator(".ncnl-cache-audio")).toHaveText("192k");
  expect(
    await thumbnailLink.evaluate((link) => {
      const icon = link.querySelector<HTMLElement>("[data-ncnl-cache-icon]");
      if (!icon) return false;
      const hostRect = link.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      return (
        iconRect.left >= hostRect.left &&
        iconRect.right <= hostRect.right &&
        iconRect.top >= hostRect.top &&
        iconRect.bottom <= hostRect.bottom
      );
    }),
  ).toBe(true);
  await expect(
    thumbnailLink.locator(
      ":scope > .dmcCacheIconImg, :scope > .dmcEconomyIconImg",
    ),
  ).toHaveCount(0);
}
