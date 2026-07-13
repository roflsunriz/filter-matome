import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "video-player-layout-entry.ts",
);
const harajukuStyle = readFileSync(
  join(
    projectRoot,
    "src",
    "mlink-video-controller",
    "modules",
    "watch-harajuku-style.css",
  ),
  "utf8",
);

const buildLayoutBundle = (): string => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "video-player-test-"));
  const outputPath = join(tempDirectory, "video-player-layout.js");

  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", outputPath, fixtureEntry],
      {
        cwd: projectRoot,
        stdio: "pipe",
      },
    );
    return readFileSync(outputPath, "utf8");
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
};

const fulfillPlayerDocument = async (route: Route): Promise<void> => {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: `<!doctype html>
      <html lang="ja" data-feature-page="video-player">
        <head><meta charset="utf-8"><title>video-player fixture</title></head>
        <body><div id="nc-standalone-player-root"></div></body>
      </html>`,
  });
};

test("背景切替トグルが mlink の背景変数を固定レイヤーへ反映する", async ({
  page,
}) => {
  await page.route(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
    fulfillPlayerDocument,
  );
  await page.goto(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
  );
  await page.addScriptTag({ content: buildLayoutBundle() });
  await page.addStyleTag({ content: harajukuStyle });
  await page.evaluate(() => {
    window.createStandaloneLayoutForTest();
    document.documentElement.style.setProperty(
      "--bg-img",
      "linear-gradient(rgb(12, 34, 56), rgb(12, 34, 56))",
    );
  });

  const toggle = page.locator(".nc-comment-background-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveCSS("border-radius", "6px");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const enabledState = await page.evaluate(() => {
    const root = document.getElementById("nc-standalone-player-root");
    if (!root) throw new Error("standalone player root was not found");
    const backgroundLayer = getComputedStyle(root, "::before");
    return {
      mode: document.body.dataset.commentBackgroundMode,
      storedMode: localStorage.getItem("video-player-comment-background-mode"),
      backgroundImage: backgroundLayer.backgroundImage,
      position: backgroundLayer.position,
      rootIsolation: getComputedStyle(root).isolation,
    };
  });

  expect(enabledState).toEqual({
    mode: "background-image",
    storedMode: "background-image",
    backgroundImage: "linear-gradient(rgb(12, 34, 56), rgb(12, 34, 56))",
    position: "fixed",
    rootIsolation: "isolate",
  });

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(() => {
      const root = document.getElementById("nc-standalone-player-root");
      if (!root) throw new Error("standalone player root was not found");
      return {
        mode: document.body.dataset.commentBackgroundMode,
        storedMode: localStorage.getItem(
          "video-player-comment-background-mode",
        ),
        content: getComputedStyle(root, "::before").content,
      };
    }),
  ).toEqual({
    mode: "default",
    storedMode: "default",
    content: "none",
  });
});
