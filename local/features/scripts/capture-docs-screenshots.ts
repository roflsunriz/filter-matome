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
  useNicoCacheProxy?: boolean;
  run: (browser: Browser) => Promise<void>;
};

type AnnotationPosition = "above" | "below" | "left" | "right";

type ScreenshotAnnotation = {
  label: string;
  position?: AnnotationPosition;
  target: Locator;
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

const createPage = async (
  browser: Browser,
  colorScheme: "dark" | "light" = "dark",
): Promise<Page> => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    colorScheme,
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

const clearAnnotations = async (page: Page): Promise<void> => {
  await page
    .locator('[data-docs-annotation-layer="true"]')
    .evaluateAll((layers) => {
      for (const layer of layers) layer.remove();
    });
};

const addAnnotations = async (
  page: Page,
  annotations: ScreenshotAnnotation[],
): Promise<void> => {
  await clearAnnotations(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("注釈画像のviewportを取得できませんでした");

  const labelWidth = 224;
  const labelHeight = 42;
  const margin = 12;
  const gap = 24;
  const items: Array<{
    height: number;
    label: string;
    labelX: number;
    labelY: number;
    width: number;
    x: number;
    y: number;
  }> = [];

  for (const annotation of annotations) {
    await annotation.target.waitFor({ state: "visible" });
    await annotation.target.scrollIntoViewIfNeeded();
    const box = await annotation.target.boundingBox();
    if (!box) {
      throw new Error(
        `注釈対象「${annotation.label}」の座標を取得できませんでした`,
      );
    }

    let labelX = box.x + box.width / 2 - labelWidth / 2;
    let labelY = box.y - labelHeight - gap;
    switch (annotation.position ?? "above") {
      case "below":
        labelY = box.y + box.height + gap;
        break;
      case "left":
        labelX = box.x - labelWidth - gap;
        labelY = box.y + box.height / 2 - labelHeight / 2;
        break;
      case "right":
        labelX = box.x + box.width + gap;
        labelY = box.y + box.height / 2 - labelHeight / 2;
        break;
      case "above":
        break;
    }

    items.push({
      height: box.height,
      label: annotation.label,
      labelX: Math.max(
        margin,
        Math.min(labelX, viewport.width - labelWidth - margin),
      ),
      labelY: Math.max(
        margin,
        Math.min(labelY, viewport.height - labelHeight - margin),
      ),
      width: box.width,
      x: box.x,
      y: box.y,
    });
  }

  await page.evaluate(
    ({ annotationItems, height, width }) => {
      const svgNamespace = "http://www.w3.org/2000/svg";
      const layer = document.createElement("div");
      layer.dataset.docsAnnotationLayer = "true";
      Object.assign(layer.style, {
        height: `${String(height)}px`,
        left: "0",
        pointerEvents: "none",
        position: "fixed",
        top: "0",
        width: `${String(width)}px`,
        zIndex: "2147483647",
      });

      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("height", String(height));
      svg.setAttribute("width", String(width));
      Object.assign(svg.style, {
        height: "100%",
        inset: "0",
        overflow: "visible",
        position: "absolute",
        width: "100%",
      });

      const definitions = document.createElementNS(svgNamespace, "defs");
      const marker = document.createElementNS(svgNamespace, "marker");
      marker.setAttribute("id", "docs-arrowhead");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("orient", "auto");
      marker.setAttribute("refX", "7");
      marker.setAttribute("refY", "4");
      marker.setAttribute("viewBox", "0 0 8 8");
      const arrow = document.createElementNS(svgNamespace, "path");
      arrow.setAttribute("d", "M 0 0 L 8 4 L 0 8 z");
      arrow.setAttribute("fill", "#d50000");
      marker.append(arrow);
      definitions.append(marker);
      svg.append(definitions);
      layer.append(svg);

      for (const item of annotationItems) {
        const outline = document.createElement("div");
        Object.assign(outline.style, {
          border: "4px solid #d50000",
          borderRadius: "7px",
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.95)",
          height: `${String(item.height)}px`,
          left: `${String(item.x)}px`,
          position: "absolute",
          top: `${String(item.y)}px`,
          width: `${String(item.width)}px`,
        });
        layer.append(outline);

        const label = document.createElement("div");
        label.textContent = item.label;
        Object.assign(label.style, {
          alignItems: "center",
          background: "#d50000",
          border: "2px solid #ffffff",
          borderRadius: "7px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.38)",
          color: "#ffffff",
          display: "flex",
          font: '700 16px/1.25 -apple-system, BlinkMacSystemFont, "Segoe UI", "Yu Gothic UI", sans-serif',
          height: "42px",
          justifyContent: "center",
          left: `${String(item.labelX)}px`,
          padding: "0 10px",
          position: "absolute",
          textAlign: "center",
          top: `${String(item.labelY)}px`,
          width: "224px",
        });
        layer.append(label);

        const labelCenter = {
          x: item.labelX + 112,
          y: item.labelY + 21,
        };
        const targetCenter = {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
        };
        const toTarget = {
          x: targetCenter.x - labelCenter.x,
          y: targetCenter.y - labelCenter.y,
        };
        const startScale =
          1 /
          Math.max(
            Math.abs(toTarget.x) / 112,
            Math.abs(toTarget.y) / 21,
            Number.EPSILON,
          );
        const lineStart = {
          x: labelCenter.x + toTarget.x * startScale,
          y: labelCenter.y + toTarget.y * startScale,
        };
        const toLabel = {
          x: labelCenter.x - targetCenter.x,
          y: labelCenter.y - targetCenter.y,
        };
        const arrowGap = 12;
        const endScale =
          1 /
          Math.max(
            Math.abs(toLabel.x) / (item.width / 2 + arrowGap),
            Math.abs(toLabel.y) / (item.height / 2 + arrowGap),
            Number.EPSILON,
          );
        const lineEnd = {
          x: targetCenter.x + toLabel.x * endScale,
          y: targetCenter.y + toLabel.y * endScale,
        };

        const line = document.createElementNS(svgNamespace, "line");
        line.setAttribute("marker-end", "url(#docs-arrowhead)");
        line.setAttribute("stroke", "#d50000");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-width", "5");
        line.setAttribute("x1", String(lineStart.x));
        line.setAttribute("x2", String(lineEnd.x));
        line.setAttribute("y1", String(lineStart.y));
        line.setAttribute("y2", String(lineEnd.y));
        svg.append(line);
      }

      document.body.append(layer);
    },
    { annotationItems: items, height: viewport.height, width: viewport.width },
  );
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

const gotoExternal = async (page: Page, url: string): Promise<void> => {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) {
    throw new Error(
      `${url} の読み込みに失敗しました (HTTP ${String(response?.status() ?? "応答なし")})`,
    );
  }
  await page.evaluate(async () => document.fonts.ready);
};

const captureGitHubIssueGuide = async (browser: Browser): Promise<void> => {
  const page = await createPage(browser, "light");
  const repositoryUrl = "https://github.com/roflsunriz/filter-matome";
  try {
    await gotoExternal(page, repositoryUrl);
    const issuesTab = page.getByRole("link", { name: /^Issues/u }).first();
    await addAnnotations(page, [
      { label: "1. Issuesを開く", position: "below", target: issuesTab },
    ]);
    await screenshotPage(page, "issue-01-open-issues.png", {
      clipHeight: 620,
    });

    await gotoExternal(page, `${repositoryUrl}/issues`);
    const search = page.locator('input[placeholder="Search issues"]');
    const newIssue = page.getByRole("link", { name: "New issue" });
    await addAnnotations(page, [
      { label: "1. 似た報告を検索", position: "below", target: search },
      { label: "2. New issueを開く", position: "below", target: newIssue },
    ]);
    await screenshotPage(page, "issue-02-search-and-create.png", {
      clipHeight: 650,
    });

    const bugReportUrl = `${repositoryUrl}/issues/new?template=bug_report.yml`;
    await gotoExternal(page, bugReportUrl);
    if (!page.url().startsWith("https://github.com/login")) {
      throw new Error(
        "匿名セッションがGitHubのサインイン画面へ移動しませんでした",
      );
    }
    const username = page.getByLabel("Username or email address");
    const password = page.getByLabel("Password");
    const signIn = page.getByRole("button", { name: "Sign in" });
    await addAnnotations(page, [
      {
        label: "1. GitHubアカウントを入力",
        position: "left",
        target: username,
      },
      { label: "2. パスワードを入力", position: "right", target: password },
      { label: "3. Sign in", position: "below", target: signIn },
    ]);
    await screenshotPage(page, "issue-03-sign-in.png", { clipHeight: 720 });
  } finally {
    await closePage(page);
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

    await addAnnotations(page, [
      {
        label: "新しいマイリスト名を入力",
        position: "right",
        target: page.locator("#newMylistName"),
      },
      {
        label: "動画追加・バックアップは設定から",
        position: "right",
        target: page.locator("#settingsFab"),
      },
    ]);
    await screenshotPage(page, "mylist2-first-steps.png");
    await clearAnnotations(page);

    await page.locator("#settingsFab").click();
    await page.locator("#settingsModal").waitFor({ state: "visible" });
    await page.locator("#videoIdInput").fill(videoId);
    await addAnnotations(page, [
      {
        label: "動画IDまたはURLを入力",
        position: "above",
        target: page.locator("#videoIdInput"),
      },
      {
        label: "入力した動画を追加",
        position: "right",
        target: page.locator("#addVideo"),
      },
      {
        label: "JSONでバックアップ／復元",
        position: "left",
        target: page.locator("#exportMylist"),
      },
    ]);
    await screenshotPage(page, "mylist2-settings-guide.png");
    await clearAnnotations(page);
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
  {
    name: "GitHub Issueガイド",
    run: captureGitHubIssueGuide,
    useNicoCacheProxy: false,
  },
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
      ...(task.useNicoCacheProxy === false
        ? {}
        : { proxy: { server: proxyServer } }),
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
