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
const fullscreenFixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "video-player-fullscreen-entry.ts",
);
const nicochartFixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "nicochart-fallback-entry.ts",
);
const commentPostFixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "video-player-comment-post-entry.ts",
);
const harajukuStyle = [1, 2, 3, 4]
  .map((part) =>
    readFileSync(
      join(
        projectRoot,
        "src",
        "mlink-video-controller",
        "modules",
        `watch-harajuku-style-${part}.css`,
      ),
      "utf8",
    ),
  )
  .join("\n");

const buildFixtureBundle = (entryPath = fixtureEntry): string => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "video-player-test-"));
  const outputPath = join(tempDirectory, "video-player-layout.js");

  try {
    execFileSync(
      "bun",
      ["scripts/build-playwright-fixture.ts", outputPath, entryPath],
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
  await page.addScriptTag({ content: buildFixtureBundle() });
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

test("ボタン外でネイティブ全画面を解除しても通常表示のクラスへ戻る", async ({
  page,
}) => {
  await page.route(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
    fulfillPlayerDocument,
  );
  await page.goto(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
  );
  await page.evaluate(() => {
    window.logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  });
  await page.addScriptTag({
    content: buildFixtureBundle(fullscreenFixtureEntry),
  });
  await page.evaluate(() => window.createFullscreenPlayerForTest());

  const fullscreenButton = page.locator(
    "player-controls-shadow >> #fullscreen",
  );
  await fullscreenButton.click({ force: true });

  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.className))
    .toContain("custom-player");
  await expect(page.locator("html")).toHaveClass(/fullscreen-active/);
  await expect(page.locator("body")).toHaveClass(/nc-fullscreen-active/);
  await expect(page.locator(".custom-player")).toHaveClass(
    /nc-fullscreen-player/,
  );

  await page.locator("player-controls-shadow >> #settings").click({
    force: true,
  });
  await expect(
    page.locator('player-controls-shadow >> [data-settings-section="comment"]'),
  ).toBeVisible();

  await page.evaluate(() => document.exitFullscreen());

  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull();
  await expect(page.locator("html")).not.toHaveClass(/fullscreen-active/);
  await expect(page.locator("body")).not.toHaveClass(/nc-fullscreen-active/);
  await expect(page.locator(".custom-player")).not.toHaveClass(
    /nc-fullscreen-player/,
  );
});

test("公式風コマンドパレットと投稿フォームが動画直下の一行に収まる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
    fulfillPlayerDocument,
  );
  await page.goto(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
  );
  await page.addScriptTag({
    content: buildFixtureBundle(commentPostFixtureEntry),
  });
  await page.evaluate(() => window.createCommentPostFormForTest());

  const form = page.locator("comment-post-form");
  const commands = form.locator('input[aria-label="コメントコマンド"]');
  const comment = form.locator('textarea[aria-label="投稿するコメント"]');
  await expect(form).toBeVisible();
  const rowTops = await form.evaluate((host) => {
    const palette = host.shadowRoot?.querySelector(".palette-toggle");
    const textarea = host.shadowRoot?.querySelector(".comment");
    const submit = host.shadowRoot?.querySelector(".submit");
    if (!(palette instanceof HTMLElement)) throw new Error("palette missing");
    if (!(textarea instanceof HTMLElement)) throw new Error("comment missing");
    if (!(submit instanceof HTMLElement)) throw new Error("submit missing");
    return [
      palette.getBoundingClientRect().top,
      textarea.getBoundingClientRect().top,
      submit.getBoundingClientRect().top,
    ];
  });
  expect(Math.max(...rowTops) - Math.min(...rowTops)).toBeLessThanOrEqual(1);
  await form.locator('button[aria-label="コメントコマンドパレット"]').click();
  await expect(form.locator(".command-palette")).toBeVisible();
  await expect(form.locator(".palette-label")).toHaveText([
    "サイズ",
    "位置",
    "カラー",
  ]);
  const premiumColor = form.locator('button[data-command="red2"]');
  await expect(premiumColor).toBeHidden();
  await form.evaluate((host) => {
    (
      host as HTMLElement & {
        setPremiumColorsEnabled: (enabled: boolean) => void;
      }
    ).setPremiumColorsEnabled(true);
  });
  await expect(premiumColor).toBeVisible();
  await page.setViewportSize({ width: 720, height: 844 });
  const paletteContainment = await form.evaluate((host) => {
    const palette = host.shadowRoot?.querySelector(".command-palette");
    const visibleColors = [
      ...(host.shadowRoot?.querySelectorAll<HTMLElement>(".color-option") ??
        []),
    ].filter((button) => !button.hidden);
    if (!(palette instanceof HTMLElement)) throw new Error("palette missing");
    const paletteRect = palette.getBoundingClientRect();
    return visibleColors.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        command: button.dataset.command,
        left: rect.left,
        right: rect.right,
        paletteLeft: paletteRect.left,
        paletteRight: paletteRect.right,
      };
    });
  });
  expect(paletteContainment).toHaveLength(20);
  for (const color of paletteContainment) {
    expect(color.left, color.command).toBeGreaterThanOrEqual(color.paletteLeft);
    expect(color.right, color.command).toBeLessThanOrEqual(color.paletteRight);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await form.evaluate((host) => {
    (
      host as HTMLElement & {
        setPremiumColorsEnabled: (enabled: boolean) => void;
      }
    ).setPremiumColorsEnabled(false);
  });
  await expect(premiumColor).toBeHidden();
  await form.locator('button[data-command="big"]').click();
  await form.locator('button[data-command="ue"]').click();
  await form.locator('button[data-command="red"]').click();
  await expect(commands).toHaveValue("big ue red");
  await comment.fill("投稿テスト");
  await expect(form.locator(".command-palette")).toBeHidden();
  await expect(form.locator(".count")).toHaveText("5/75");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[role="status"]')).toHaveText(
    "コメントを投稿しました。",
  );
  await expect(comment).toHaveValue("");
  expect(
    await page.evaluate(() => window.lastSubmittedCommentCommands),
  ).toEqual(["big", "ue", "red"]);
  const ownComment = page.locator("comment-list-shadow .own-comment");
  await expect(ownComment).toBeVisible();
  await expect(ownComment).toHaveCSS("border-top-color", "rgb(255, 212, 0)");
  await expect
    .poll(() => page.evaluate(() => window.ownCommentBorderDrawCount))
    .toBeGreaterThan(0);

  await page.evaluate(() => window.simulateCommentReloadForTest());
  await expect(page.locator("comment-list-shadow .own-comment")).toHaveCount(0);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.ownCommentBorderDrawCount)).toBe(0);

  const metrics = await page.evaluate(() => {
    const element = document.querySelector("comment-post-form");
    const videoContainer = document.querySelector(".video-container");
    if (!(element instanceof HTMLElement)) {
      throw new Error("comment post form was not found");
    }
    if (!(videoContainer instanceof HTMLElement)) {
      throw new Error("video container was not found");
    }
    const rect = element.getBoundingClientRect();
    const videoRect = videoContainer.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      videoWidth: videoRect.width,
      isDirectlyBelowVideo: element.previousElementSibling === videoContainer,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(metrics.isDirectlyBelowVideo).toBe(true);
  expect(metrics.width).toBeCloseTo(metrics.videoWidth, 0);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);

  const normalLayering = await page.evaluate(() => {
    const formElement = document.querySelector("comment-post-form");
    const controlsElement = document.querySelector("player-controls-shadow");
    if (!(formElement instanceof HTMLElement)) throw new Error("form missing");
    if (!(controlsElement instanceof HTMLElement)) {
      throw new Error("controls missing");
    }
    return {
      formZIndex: Number(getComputedStyle(formElement).zIndex),
      controlsZIndex: Number(getComputedStyle(controlsElement).zIndex),
    };
  });
  expect(normalLayering.formZIndex).toBeGreaterThan(
    normalLayering.controlsZIndex,
  );

  await page.evaluate(() => {
    const player = document.querySelector(".custom-player");
    const formElement = document.querySelector("comment-post-form");
    if (player instanceof HTMLElement && formElement instanceof HTMLElement) {
      player.style.setProperty(
        "--fullscreen-comment-form-height",
        `${Math.ceil(formElement.getBoundingClientRect().height)}px`,
      );
    }
    document.documentElement.classList.add("fullscreen-active");
    document.body.classList.add("nc-fullscreen-active");
    player?.classList.add("nc-fullscreen-player");
  });
  await expect(form).toHaveCSS("position", "fixed");
  await expect(form).toHaveCSS("visibility", "visible");
  await commands.click();
  await expect(form.locator(".command-palette")).toBeVisible();

  const fullscreenLayering = await page.evaluate(() => {
    const formElement = document.querySelector("comment-post-form");
    const controlsElement = document.querySelector("player-controls-shadow");
    if (!(formElement instanceof HTMLElement)) throw new Error("form missing");
    if (!(controlsElement instanceof HTMLElement)) {
      throw new Error("controls missing");
    }
    const formRect = formElement.getBoundingClientRect();
    const controlsRect = controlsElement.getBoundingClientRect();
    return {
      formBottom: formRect.bottom,
      formTop: formRect.top,
      controlsBottom: controlsRect.bottom,
      formZIndex: Number(getComputedStyle(formElement).zIndex),
      controlsZIndex: Number(getComputedStyle(controlsElement).zIndex),
      viewportHeight: window.innerHeight,
    };
  });
  expect(fullscreenLayering.formBottom).toBeCloseTo(
    fullscreenLayering.viewportHeight,
    0,
  );
  expect(
    Math.abs(fullscreenLayering.controlsBottom - fullscreenLayering.formTop),
  ).toBeLessThanOrEqual(1);
  expect(fullscreenLayering.formZIndex).toBeGreaterThan(
    fullscreenLayering.controlsZIndex,
  );

  await page.evaluate(() => {
    const formElement = document.querySelector("comment-post-form");
    const focusedElement = formElement?.shadowRoot?.activeElement;
    if (focusedElement instanceof HTMLElement) {
      focusedElement.blur();
    }
    document
      .querySelector("player-controls-shadow")
      ?.classList.remove("controls-visible");
  });
  await expect(form).toHaveCSS("visibility", "hidden");
});

test("NicoCache_nl経由のnicochart動画情報をApiDataへ変換する", async ({
  page,
}) => {
  const nicochartBundle = buildFixtureBundle(nicochartFixtureEntry);
  await page.route(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
    fulfillPlayerDocument,
  );
  await page.route(
    "https://nicocachenl.test/api/v1/extensions/filter-matome/nicochart-info/sm9",
    async (route) => {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "https://www.nicovideo.jp",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "X-Filter-Matome-Nicochart",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      expect(route.request().headers()["x-filter-matome-nicochart"]).toBe("1");
      await route.fulfill({
        contentType: "text/plain; charset=utf-8",
        headers: corsHeaders,
        body: `<!doctype html>
        <html lang="ja">
          <head><meta charset="utf-8"><title>nicochart fixture</title></head>
          <body>
            <p id="video-id">sm9</p>
            <div id="video-info">
              <p class="thumbnail-image"><img src="https://nicovideo.cdn.nimg.jp/thumbnails/9/9" alt=""></p>
              <dl class="video-info">
                <dd class="title"><a>テスト動画</a></dd>
                <dd class="genre">音楽・サウンド</dd>
                <dd class="first-retrieve"><span class="first-retrieve">2007年03月06日 00:33:00</span></dd>
                <dd class="length"><span class="length">1時間2分3秒</span></dd>
                <dd class="contributor">
                  <em class="user"><a href="https://www.nicovideo.jp/user/4">投稿者リンク</a></em>
                  <em class="name"><a>投稿者名</a></em>
                </dd>
                <dd class="description"><blockquote><p>説明<span>&lt;br&gt;</span>次の行</p></blockquote></dd>
                <dd class="tags"><ul>
                  <li><span class="lock">★</span><a class="word">固定タグ</a></li>
                  <li><a class="word">通常タグ</a></li>
                </ul></dd>
              </dl>
            </div>
            <div id="point-data"><div id="daily-point-data"><table><tbody><tr>
              <td class="total-view">1,234</td>
              <td class="total-res">56</td>
              <td class="total-like">78</td>
              <td class="total-mylist">90</td>
            </tr></tbody></table></div></div>
          </body>
        </html>`,
      });
    },
  );

  await page.goto(
    "https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=sm9",
  );
  await page.addScriptTag({ content: nicochartBundle });
  const result = await page.evaluate(() =>
    window.fetchNicochartVideoInfoForTest("sm9"),
  );

  expect(result).toEqual({
    video: {
      id: "sm9",
      title: "テスト動画",
      count: { view: 1234, comment: 56, mylist: 90, like: 78 },
      thumbnail: {
        url: "https://nicovideo.cdn.nimg.jp/thumbnails/9/9",
      },
      registeredAt: "2007-03-06T00:33:00+09:00",
      duration: 3723,
      description: "<p>説明<br>次の行</p>",
      genre: "音楽・サウンド",
    },
    owner: {
      id: "4",
      nickname: "投稿者名",
      userPageUrl: "https://www.nicovideo.jp/user/4",
    },
    tag: {
      items: [
        { name: "固定タグ", isLocked: true },
        { name: "通常タグ", isLocked: false },
      ],
    },
  });
});
