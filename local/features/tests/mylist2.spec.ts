import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(import.meta.dirname, "fixtures", "mylist2-entry.ts");
const pageUrl =
  "https://www.nicovideo.jp/local/features/dist/pages/mylist2/index.html";
let appBundle = "";

const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const seed = {
  mylists: [
    { id: 1, name: "料理動画", createdAt: 100, sortOrder: 0 },
    { id: 2, name: "移動先", createdAt: 200, sortOrder: 1 },
  ],
  videos: [
    {
      id: "1_sm100",
      originalId: "sm100",
      mylistId: 1,
      title: "アルファ料理",
      viewCount: 100,
      commentCount: 10,
      mylistCount: 5,
      thumbnailUrl: "",
      uploadedAt: 1000,
      addedAt: 3000,
      authorName: "投稿者A",
      length: 120,
      tags: ["料理"],
      description: "アルファの説明",
      memo: "メモA",
    },
    {
      id: "1_sm200",
      originalId: "sm200",
      mylistId: 1,
      title: "ベータ音楽",
      viewCount: 200,
      commentCount: 20,
      mylistCount: 10,
      thumbnailUrl: pixel,
      uploadedAt: 2000,
      addedAt: 2000,
      authorName: "投稿者B",
      length: 240,
      tags: ["音楽"],
      description: "ベータの説明",
      memo: "検索用メモ",
    },
    {
      id: "2_sm300",
      originalId: "sm300",
      mylistId: 2,
      title: "横断限定ゲーム",
      viewCount: 300,
      commentCount: 30,
      mylistCount: 15,
      thumbnailUrl: pixel,
      uploadedAt: 3000,
      addedAt: 1000,
      authorName: "投稿者C",
      length: 360,
      tags: ["ゲーム"],
      description: "別マイリストだけにある説明",
      memo: "移動先のメモ",
    },
  ],
  keywords: [
    { id: 1, mylistId: 1, keyword: "テストキーワード", addedAt: 1500 },
  ],
};

function buildBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "mylist2-test-"));
  const output = join(directory, "mylist2.js");
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
}

function buildDocument(): string {
  return readFileSync(
    join(projectRoot, "src", "mylist2", "index.html"),
    "utf8",
  ).replace(
    /<script src="\/local\/features\/dist\/features\.js" defer><\/script>/,
    "",
  );
}

async function fulfillDocument(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: buildDocument(),
  });
}

async function openApp(page: Page): Promise<void> {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(async (data) => {
    const api = (
      window as unknown as {
        Mylist2Test: { seedAndStart: (value: typeof data) => Promise<void> };
      }
    ).Mylist2Test;
    await api.seedAndStart(data);
  }, seed);
  await expect(page.locator(".mylist-item")).toHaveCount(2);
  await page.getByText("料理動画", { exact: true }).click();
  await expect(page.locator(".video-item")).toHaveCount(3);
}

test.beforeAll(() => {
  appBundle = buildBundle();
});

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("共通ヘッダーと重ならずダーク背景でビューポートを使用する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 600 });

  const layout = await page.evaluate(() => {
    const header = document.querySelector("#headerContainer");
    const manager = document.querySelector("#Mylist2Manager");
    if (!(header instanceof HTMLElement) || !(manager instanceof HTMLElement)) {
      throw new Error("mylist2 layout elements are missing");
    }
    const headerRect = header.getBoundingClientRect();
    const managerRect = manager.getBoundingClientRect();
    const footer = document.querySelector(".mylist-sidebar-footer");
    if (!(footer instanceof HTMLElement)) {
      throw new Error("mylist2 sidebar footer is missing");
    }
    const footerRect = footer.getBoundingClientRect();
    const videoList = document.querySelector("#videoList");
    const mylistList = document.querySelector("#mylistList");
    if (
      !(videoList instanceof HTMLElement) ||
      !(mylistList instanceof HTMLElement)
    ) {
      throw new Error("mylist2 scroll containers are missing");
    }
    const videoListRect = videoList.getBoundingClientRect();
    const mylistListRect = mylistList.getBoundingClientRect();
    return {
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      headerBottom: headerRect.bottom,
      managerTop: managerRect.top,
      managerBottom: managerRect.bottom,
      viewportHeight: window.innerHeight,
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      bodyClientHeight: document.body.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      documentClientHeight: document.documentElement.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      mylistListBottom: mylistListRect.bottom,
      videoListBottom: videoListRect.bottom,
    };
  });

  expect(layout.bodyBackground).not.toBe("rgb(255, 255, 255)");
  expect(layout.bodyBackground).toBe("rgb(17, 21, 27)");
  await expect(page.locator(".mylist-sidebar")).toHaveCSS(
    "background-color",
    "rgb(26, 32, 41)",
  );
  await expect(page.locator(".video-list-selection-header")).toHaveCSS(
    "background-color",
    "rgb(36, 44, 55)",
  );
  expect(layout.managerTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
  expect(layout.managerBottom).toBeGreaterThanOrEqual(
    layout.viewportHeight - 1,
  );
  expect(layout.managerBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.footerTop).toBeGreaterThanOrEqual(layout.headerBottom);
  expect(layout.footerBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.mylistListBottom).toBeLessThanOrEqual(layout.footerTop);
  expect(layout.videoListBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.bodyScrollHeight).toBe(layout.bodyClientHeight);
  expect(layout.documentScrollHeight).toBe(layout.documentClientHeight);
  await expect(page.getByTitle("設定", { exact: true })).toBeInViewport();
  await expect(page.getByTitle("mylist2 ヘルプ")).toBeInViewport();
});

test("検索クリアボタンが入力欄の右端内側に揃う", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 375, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const result: Record<
        string,
        { insideInput: boolean; rightGap: number } | null
      > = {};
      for (const buttonId of ["mylistSearchClear", "videoSearchClear"]) {
        const button = document.getElementById(buttonId);
        const input = button?.parentElement?.querySelector("input");
        if (!button || !input) {
          result[buttonId] = null;
          continue;
        }
        const buttonRect = button.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        result[buttonId] = {
          insideInput:
            buttonRect.left >= inputRect.left &&
            buttonRect.right <= inputRect.right,
          rightGap: inputRect.right - buttonRect.right,
        };
      }
      return result;
    });

    for (const buttonId of ["mylistSearchClear", "videoSearchClear"]) {
      const buttonGeometry = geometry[buttonId];
      expect(buttonGeometry).not.toBeNull();
      if (!buttonGeometry) throw new Error(`${buttonId} is missing`);
      expect(buttonGeometry.insideInput).toBe(true);
      expect(Math.abs(buttonGeometry.rightGap - 4)).toBeLessThan(1);
    }
  }
});

test("動画検索範囲の選択欄が画面幅に応じて検索欄の右または下に収まる", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 375, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    const inputBox = await page.locator("#videoSearchInput").boundingBox();
    const scopeBox = await page.locator("#videoSearchScope").boundingBox();
    expect(inputBox).not.toBeNull();
    expect(scopeBox).not.toBeNull();
    if (!inputBox || !scopeBox) throw new Error("動画検索UIが見つかりません");

    if (viewport.width > 720) {
      expect(scopeBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width);
      expect(Math.abs(scopeBox.y - inputBox.y)).toBeLessThan(1);
    } else {
      expect(scopeBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height);
    }
    expect(scopeBox.x + scopeBox.width).toBeLessThanOrEqual(viewport.width);
  }
});

test("マイリスト検索・作成・ソート・設定・テーマが動作する", async ({
  page,
}) => {
  for (const clearButtonId of ["mylistSearchClear", "videoSearchClear"]) {
    const geometry = await page
      .locator(`#${clearButtonId}`)
      .evaluate((button) => {
        const buttonRect = button.getBoundingClientRect();
        const containerRect = button.parentElement?.getBoundingClientRect();
        const iconRect = button.querySelector("img")?.getBoundingClientRect();
        return {
          contained:
            !!containerRect &&
            buttonRect.left >= containerRect.left &&
            buttonRect.right <= containerRect.right,
          centered:
            !!iconRect &&
            Math.abs(
              iconRect.left +
                iconRect.width / 2 -
                (buttonRect.left + buttonRect.width / 2),
            ) < 1 &&
            Math.abs(
              iconRect.top +
                iconRect.height / 2 -
                (buttonRect.top + buttonRect.height / 2),
            ) < 1,
        };
      });
    expect(geometry.contained).toBe(true);
    expect(geometry.centered).toBe(true);
  }

  await page.getByPlaceholder("マイリストを検索...").fill("移動先");
  await expect(page.getByText("料理動画", { exact: true })).toBeHidden();
  await page.getByTitle("マイリスト検索クリア").click();
  await expect(page.getByText("料理動画", { exact: true })).toBeVisible();

  await page.getByPlaceholder("新規マイリスト名").fill("新規テスト");
  await page.getByTitle("新規マイリスト作成").click();
  await expect(page.getByText("新規テスト", { exact: true })).toBeVisible();

  await page.locator("#mylistSortType").selectOption("createdAt_desc");
  await expect(page.locator("#mylistSortType")).toHaveValue("createdAt_desc");

  await page.getByTitle("設定", { exact: true }).click();
  await expect(page.locator("#settingsModal")).toHaveClass(/visible/);
  await page.locator("#themeSelect").selectOption("dark-green");
  await expect(page.locator("#Mylist2Manager")).toHaveClass(/dark-green/);
  await page.locator("#videoLinkTargetSelect").selectOption("local");
  await expect(page.locator("#videoLinkTargetSelect")).toHaveValue("local");
  await page.locator("#settingsModalClose").click();
  await expect(page.locator("#settingsModal")).not.toHaveClass(/visible/);

  await expect(page.getByTitle("mylist2 ヘルプ")).toHaveAttribute(
    "href",
    "https://roflsunriz.github.io/filter-matome/mylist2/",
  );
});

test("動画検索・ソート・詳細表示・選択状態が同期する", async ({ page }) => {
  await expect(
    page.locator('.video-item[data-id="sm100"] .video-thumbnail'),
  ).toHaveAttribute("data-fallback-thumbnail", "true");

  await page.getByPlaceholder("動画を検索...").fill("検索用メモ");
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(1);
  await page.getByTitle("動画検索クリア").click();
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(2);

  for (const searchText of ["料理", "アルファの説明", "sm100"]) {
    await page.getByPlaceholder("動画を検索...").fill(searchText);
    await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(1);
  }
  await page.getByPlaceholder("動画を検索...").fill("アルファ 料理");
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(1);
  await page.getByTitle("動画検索クリア").click();

  await page.locator("#videoSortType").selectOption("title_asc");
  await expect(page.locator("#videoSortType")).toHaveValue("title_asc");

  const firstVideo = page.locator(".video-item:not(.keyword-item)").first();
  await expect(firstVideo.locator(".video-details-trigger")).toHaveCount(0);
  await firstVideo.click({ position: { x: 110, y: 70 } });
  await expect(page.locator("#videoDetailsModal")).toBeVisible();
  await page.locator("#videoDetailsModal .close-button").click();

  for (const [selector, icon] of [
    [".view-count", "visibility"],
    [".comment-count", "comment"],
    [".mylist-count", "bookmark"],
    [".video-length", "schedule"],
    [".video-author", "person"],
    [".video-upload-date", "upload"],
  ]) {
    await expect(
      firstVideo.locator(`${selector} img[data-icon="${icon}"]`),
    ).toHaveClass(/icon-white/);
  }

  const firstCheckbox = firstVideo.locator(".video-select");
  await firstCheckbox.check();
  await expect(page.locator(".selection-action-bar")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await expect(page.locator("#selectedItemsCount")).toHaveText("1件を選択中");

  const master = page.locator("#selectAllVideos");
  await master.check();
  const videoCheckboxes = page.locator(
    ".video-item:not(.keyword-item) .video-select",
  );
  const videoCheckboxCount = await videoCheckboxes.count();
  for (let index = 0; index < videoCheckboxCount; index++) {
    await expect(videoCheckboxes.nth(index)).toBeChecked();
  }
  await firstCheckbox.uncheck();
  await expect(master).toHaveJSProperty("indeterminate", true);
  await master.check();
  await master.uncheck();
  await expect(page.locator(".selection-action-bar")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

test("動画検索の範囲を全マイリストへ切り替えられる", async ({ page }) => {
  const searchInput = page.getByPlaceholder("動画を検索...");
  const searchScope = page.locator("#videoSearchScope");

  await expect(searchScope).toHaveValue("selected");
  await searchInput.fill("横断限定");
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(0);

  await searchScope.selectOption("all");
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(1);
  await expect(page.getByText("横断限定ゲーム", { exact: true })).toBeVisible();

  await page.locator(".video-item:not(.keyword-item) .video-select").check();
  await page.locator('[data-batch-action="move"]').click();
  await expect(page.locator("#targetMylist option")).toHaveText(["料理動画"]);
  await page.locator("#cancelAction").click();

  await searchScope.selectOption("selected");
  await expect(page.locator(".video-item:not(.keyword-item)")).toHaveCount(0);
});

test("一括操作5種が対応する確認UIを開いてキャンセルできる", async ({
  page,
}) => {
  const checkbox = page
    .locator(".video-item:not(.keyword-item) .video-select")
    .first();
  const ensureSelection = async (): Promise<void> => {
    if (!(await checkbox.isChecked())) await checkbox.check();
    await expect(page.locator(".selection-action-bar")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  };

  for (const action of ["move", "copy"]) {
    await ensureSelection();
    await page.locator(`[data-batch-action="${action}"]`).click();
    await expect(page.locator(".cml2-modal")).toBeVisible();
    await page.locator("#cancelAction").click();
    await expect(page.locator(".cml2-modal")).toHaveCount(0);
  }

  await ensureSelection();
  await page.locator('[data-batch-action="delete"]').click();
  await expect(page.locator(".cml2-alert-modal")).toBeVisible();
  await page.locator("#confirmCancelButton").click();

  for (const action of ["refresh", "availability-check"]) {
    await ensureSelection();
    await page.locator(`[data-batch-action="${action}"]`).click();
    await expect(page.locator(".cml2-modal")).toBeVisible();
    await page.locator("#cml2BatchCancel").click();
    await expect(page.locator(".cml2-modal")).toHaveCount(0);
  }
});
