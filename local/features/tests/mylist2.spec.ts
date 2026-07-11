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

test("マイリスト検索・作成・ソート・設定・テーマが動作する", async ({
  page,
}) => {
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

  await page.locator("#videoSortType").selectOption("title_asc");
  await expect(page.locator("#videoSortType")).toHaveValue("title_asc");

  const firstVideo = page.locator(".video-item:not(.keyword-item)").first();
  await firstVideo.hover();
  await firstVideo.getByTitle("詳細").click();
  await expect(page.locator("#videoDetailsModal")).toBeVisible();
  await page.locator("#videoDetailsModal .close-button").click();

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
