import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

const projectRoot = resolve(import.meta.dirname, "..");
const resourcesDirectory = resolve(projectRoot, "../../docs/resources");
const baseUrl = (
  process.env.DOCS_CAPTURE_BASE_URL ?? "https://www.nicovideo.jp"
).replace(/\/$/u, "");
const proxyServer = process.env.DOCS_CAPTURE_PROXY ?? "http://127.0.0.1:8080";
const browserChannel = process.env.DOCS_CAPTURE_BROWSER_CHANNEL ?? "chrome";
const videoId = process.env.DOCS_CAPTURE_VIDEO_ID ?? "sm9";
const timeout = 90_000;

type CaptureTask = {
  name: string;
  run: (browser: Browser) => Promise<void>;
};

mkdirSync(resourcesDirectory, { recursive: true });

const screenshotPath = (fileName: string): string =>
  resolve(resourcesDirectory, fileName);

const preparePage = async (page: Page): Promise<void> => {
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
};

const createPage = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    colorScheme: "dark",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  return page;
};

const closePage = async (page: Page): Promise<void> => {
  await page.context().close();
};

const screenshotPage = async (
  page: Page,
  fileName: string,
  options: { clipHeight?: number; fullPage?: boolean } = {},
): Promise<void> => {
  await preparePage(page);
  const viewport = page.viewportSize();
  await page.screenshot({
    path: screenshotPath(fileName),
    animations: "disabled",
    caret: "hide",
    fullPage: options.fullPage ?? false,
    scale: "css",
    ...(options.clipHeight && viewport
      ? {
          clip: {
            x: 0,
            y: 0,
            width: viewport.width,
            height: Math.min(options.clipHeight, viewport.height),
          },
        }
      : {}),
  });
};

const screenshotLocator = async (
  page: Page,
  locator: Locator,
  fileName: string,
): Promise<void> => {
  await preparePage(page);
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: screenshotPath(fileName),
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
};

const goto = async (page: Page, path: string): Promise<void> => {
  const response = await page.goto(`${baseUrl}${path}`, {
    waitUntil: "domcontentloaded",
  });
  if (!response?.ok()) {
    throw new Error(
      `${path} の読み込みに失敗しました (HTTP ${String(response?.status() ?? "応答なし")})`,
    );
  }
};

const captureApiStatus = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(page, `/search/${encodeURIComponent(videoId)}`);
    const menu = page.locator("#filter-matome-api-status-menu");
    await menu.waitFor({ state: "visible" });
    const trigger = menu.locator("button").first();
    await trigger.hover();
    await page
      .locator("#filter-matome-api-status-popover")
      .waitFor({ state: "visible" });
    await screenshotPage(page, "common-api-status.png", { clipHeight: 430 });
  } finally {
    await closePage(page);
  }
};

const createMylist = async (page: Page, name: string): Promise<void> => {
  await page.locator("#newMylistName").fill(name);
  await page.locator("#createNewMylist").click();
  await page.locator(".mylist-item", { hasText: name }).waitFor({
    state: "visible",
  });
};

const captureMylist2 = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(page, "/local/features/dist/pages/mylist2/index.html");
    await page.locator("#Mylist2Manager").waitFor({ state: "visible" });
    await createMylist(page, "お気に入り");
    await createMylist(page, "あとで見る");
    await page.locator(".mylist-item", { hasText: "お気に入り" }).click();

    await page.locator("#settingsFab").click();
    await page.locator("#settingsModal").waitFor({ state: "visible" });
    await page.locator("#videoIdInput").fill(videoId);
    await page.locator("#addVideo").click();

    const alert = page.locator(".cml2-alert-modal");
    await alert.waitFor({ state: "visible" });
    const message = (
      await alert.locator(".cml2-alert-message").textContent()
    )?.trim();
    if (message !== "動画を追加しました") {
      throw new Error(
        `mylist2への動画追加に失敗しました: ${message ?? "理由不明"}`,
      );
    }
    await alert.locator("#alertOkButton").click();
    await page.locator("#settingsModalClose").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#Mylist2Manager").waitFor({ state: "visible" });
    await page.locator(".mylist-item", { hasText: "お気に入り" }).click();
    await page.locator(".video-item:not(.keyword-item)").waitFor({
      state: "visible",
    });
    await screenshotPage(page, "mylist2.png");
  } finally {
    await closePage(page);
  }
};

const captureMovieInfo = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(
      page,
      `/local/features/dist/pages/movie-info/index.html?videoId=${encodeURIComponent(videoId)}`,
    );
    await page.locator("#movie-info-app").waitFor({ state: "visible" });
    const status = page.locator("#global-status");
    await status.waitFor({ state: "visible" });
    await page.waitForFunction(
      () => {
        const text =
          document.getElementById("global-status")?.textContent ?? "";
        return /完了|失敗|取得できません/u.test(text);
      },
      undefined,
      { timeout },
    );
    await page.locator('[data-panel-target="panel-overview"]').click();
    await page.locator("#panel-overview").waitFor({ state: "visible" });
    await screenshotPage(page, "movie-info.png");
  } finally {
    await closePage(page);
  }
};

const captureSmartFetcher = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await page.clock.setFixedTime(new Date("2026-08-27T12:00:00+09:00"));
    await goto(
      page,
      `/local/features/dist/pages/movie-fetcher/index.html?videoId=${encodeURIComponent(videoId)}`,
    );
    const wizard = page.locator("#schedule-wizard");
    await wizard.waitFor({ state: "visible" });
    await page.locator("#inspect-button").click();
    await page.locator('[data-wizard-page="2"]').waitFor({ state: "visible" });
    await page.locator('[data-wizard-page="2"] [data-wizard-next]').click();
    await page.locator('[data-wizard-page="3"]').waitFor({ state: "visible" });
    await page.locator("#summary-video").filter({ hasNotText: "—" }).waitFor({
      state: "visible",
    });
    await screenshotLocator(page, wizard, "smart-fetcher.png");
  } finally {
    await closePage(page);
  }
};

const tasks: CaptureTask[] = [
  { name: "CommonHeader API状態", run: captureApiStatus },
  { name: "mylist2", run: captureMylist2 },
  { name: "movie-info", run: captureMovieInfo },
  { name: "動画取得スケジューラー", run: captureSmartFetcher },
];

const failures: string[] = [];
for (const task of tasks) {
  process.stdout.write(`[docs:capture] ${task.name} を撮影します\n`);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: browserChannel,
      headless: true,
      proxy: { server: proxyServer },
      args: ["--ignore-certificate-errors"],
    });
    try {
      await task.run(browser);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${task.name}: ${message}`);
      process.stderr.write(
        `[docs:capture] ${task.name} に失敗しました: ${message}\n`,
      );
    }
  } finally {
    if (browser?.isConnected()) await browser.close();
  }
}

if (failures.length > 0) {
  throw new Error(
    `ドキュメント画像を更新できませんでした。NicoCache_nlの起動、${proxyServer}、実ページの表示を確認してください。\n${failures.join("\n")}`,
  );
}

process.stdout.write(
  `[docs:capture] ${String(tasks.length)}枚を ${resourcesDirectory} に保存しました\n`,
);
