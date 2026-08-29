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
const coverDirectory = resolve(projectRoot, "../../cover-images");
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

let sampleThumbnailUrl: string | null = null;

mkdirSync(resourcesDirectory, { recursive: true });
mkdirSync(coverDirectory, { recursive: true });

type ScreenshotDirectory = "resources" | "cover";

const screenshotPath = (
  fileName: string,
  directory: ScreenshotDirectory = "resources",
): string =>
  resolve(
    directory === "resources" ? resourcesDirectory : coverDirectory,
    fileName,
  );

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
  options: {
    clipHeight?: number;
    directory?: ScreenshotDirectory;
    fullPage?: boolean;
  } = {},
): Promise<void> => {
  await preparePage(page);
  const viewport = page.viewportSize();
  await page.screenshot({
    path: screenshotPath(fileName, options.directory),
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
  directory: ScreenshotDirectory = "resources",
): Promise<void> => {
  await preparePage(page);
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: screenshotPath(fileName, directory),
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

const waitForPlayableVideo = async (
  page: Page,
  selector: string,
): Promise<void> => {
  await page.waitForFunction((videoSelector) => {
    const video = document.querySelector<HTMLVideoElement>(videoSelector);
    return Boolean(
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      Number.isFinite(video.duration) &&
      video.duration > 0,
    );
  }, selector);
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
    await page.clock.setFixedTime(new Date("2026-08-30T12:00:00+09:00"));
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
    const thumbnail = page.locator(".video-thumbnail").first();
    await thumbnail.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image =
        document.querySelector<HTMLImageElement>(".video-thumbnail");
      return Boolean(
        image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      );
    });
    sampleThumbnailUrl = await thumbnail.getAttribute("src");
    if (!sampleThumbnailUrl) {
      throw new Error("mylist2のサンプル動画サムネイルを取得できませんでした");
    }
    await screenshotPage(page, "mylist2.png");
    await screenshotPage(page, "mylist2.png", { directory: "cover" });
  } finally {
    await closePage(page);
  }
};

const captureWatchHistory = async (browser: Browser): Promise<void> => {
  if (!sampleThumbnailUrl) {
    throw new Error("watch-history用のサンプルサムネイルがありません");
  }
  const page = await createPage(browser);
  try {
    await page.clock.setFixedTime(new Date("2026-08-30T12:00:00+09:00"));
    await goto(page, "/local/features/dist/pages/watch-history/index.html");
    await page.locator("#app").waitFor({ state: "visible" });
    await page.evaluate(async (thumbnailUrl) => {
      const now = Date.now();
      const entry = {
        videoId: "sm9",
        title: "新・豪血寺一族 -煩悩解放 - レッツゴー！陰陽師",
        ownerId: "4",
        ownerName: "中の",
        lengthSec: 320,
        watchedAt: now - 3_600_000,
        firstWatchedAt: now - 86_400_000,
        lastPosition: 196,
        completed: false,
        watchCount: 2,
        watchLogs: [{ date: now - 3_600_000, position: 196, completed: false }],
        stats: {
          viewCount: 23_000_000,
          commentCount: 5_680_000,
          mylistCount: 183_000,
          likeCount: 44_000,
          uploadedAt: new Date("2007-03-06T00:33:00+09:00").getTime(),
        },
        tags: ["音楽", "陰陽師"],
        thumbnailUrl,
        memo: "ドキュメント撮影用サンプル",
        series: null,
      };

      await new Promise<void>((resolvePromise, rejectPromise) => {
        const request = indexedDB.open("NicoWatchHistory");
        request.onerror = () =>
          rejectPromise(
            request.error ?? new Error("watch-history DBを開けませんでした"),
          );
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("watchHistory", "readwrite");
          transaction.objectStore("watchHistory").put(entry);
          transaction.oncomplete = () => {
            database.close();
            resolvePromise();
          };
          transaction.onerror = () =>
            rejectPromise(
              transaction.error ??
                new Error("watch-historyの撮影用履歴を保存できませんでした"),
            );
        };
      });
    }, sampleThumbnailUrl);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".history-item").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const thumbnail =
        document.querySelector<HTMLImageElement>(".history-item img");
      return Boolean(
        thumbnail?.complete &&
        thumbnail.naturalWidth > 0 &&
        thumbnail.naturalHeight > 0,
      );
    });
    await screenshotPage(page, "watch-history.png");
    await screenshotPage(page, "watch-history.png", { directory: "cover" });
  } finally {
    await closePage(page);
  }
};

const captureCommentFilter2 = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(page, `/watch/${encodeURIComponent(videoId)}`);
    await page.waitForFunction(() => {
      const targetWindow = window as unknown as {
        CommentFilter2Instance?: { showUI: () => Promise<void> };
      };
      return typeof targetWindow.CommentFilter2Instance?.showUI === "function";
    });
    await page.evaluate(async () => {
      const targetWindow = window as unknown as {
        CommentFilter2Instance?: { showUI: () => Promise<void> };
      };
      await targetWindow.CommentFilter2Instance?.showUI();
    });

    const container = page.locator("#cf2-shadow-host .cf2-container");
    await container.waitFor({ state: "visible" });
    await screenshotLocator(page, container, "comment-filter-2-1.png");
    await screenshotLocator(page, container, "comment-filter2.png", "cover");

    await container.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
    await container.locator('[data-cf2-panel="rules"]').waitFor({
      state: "visible",
    });
    await screenshotLocator(page, container, "comment-filter-2-2.png");
  } finally {
    await closePage(page);
  }
};

const captureMlinkVideoController = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(page, `/watch/${encodeURIComponent(videoId)}`);
    await waitForPlayableVideo(page, "video");
    const controller = page.locator("mlink-video-controller");
    await controller.waitFor({ state: "attached" });
    await controller.locator("#fab").click();
    const panel = controller.locator(".panel");
    await panel.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const controllerElement = document.querySelector(
        "mlink-video-controller",
      );
      const label = controllerElement?.shadowRoot?.querySelector(".time-label");
      return Boolean(label && label.textContent !== "00:00 / 00:00");
    });
    await screenshotLocator(page, panel, "mlink-video-controller1.png");
    await screenshotLocator(page, panel, "mlink-video-controller.png", "cover");

    await controller.locator('[data-tab="settings"]').click();
    await controller.locator("#settings.tab.active").waitFor({
      state: "visible",
    });
    await controller.locator("#settings .module-item").first().waitFor({
      state: "visible",
    });
    await screenshotLocator(page, panel, "mlink-video-controller2.png");

    await controller.locator("#open-background-settings").click();
    const backgroundModal = controller.locator("#background-settings-modal");
    await backgroundModal.waitFor({ state: "visible" });
    await screenshotLocator(
      page,
      backgroundModal,
      "background-image-settings.png",
    );
  } finally {
    await closePage(page);
  }
};

const captureVideoPlayer = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser);
  try {
    await goto(
      page,
      `/local/features/dist/pages/video-player/index.html?videoId=${encodeURIComponent(videoId)}`,
    );
    await page.locator(".nc-standalone-page").waitFor({ state: "visible" });
    await page.locator(".custom-player").waitFor({ state: "visible" });
    await waitForPlayableVideo(page, "#video-element");
    await page.evaluate(async () => {
      const video = document.querySelector<HTMLVideoElement>("#video-element");
      if (!video) throw new Error("video-playerの動画要素がありません");
      video.muted = true;
      await video.play();
      await new Promise<void>((resolvePromise) => {
        if (video.currentTime >= 5) {
          resolvePromise();
          return;
        }
        const handleTimeUpdate = (): void => {
          if (video.currentTime < 5) return;
          video.removeEventListener("timeupdate", handleTimeUpdate);
          resolvePromise();
        };
        video.addEventListener("timeupdate", handleTimeUpdate);
      });
      video.pause();
    });
    await screenshotPage(page, "video-player.png", { directory: "cover" });
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
  { name: "watch-history", run: captureWatchHistory },
  { name: "comment-filter2", run: captureCommentFilter2 },
  { name: "mlink-video-controller", run: captureMlinkVideoController },
  { name: "video-player", run: captureVideoPlayer },
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
  `[docs:capture] ${String(tasks.length)}画面を ${resourcesDirectory} と ${coverDirectory} に保存しました\n`,
);
