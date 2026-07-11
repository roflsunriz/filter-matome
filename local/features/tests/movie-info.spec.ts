import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "movie-info-entry.ts",
);
const pageUrl =
  "https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html";
let appBundle = "";

function buildBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "movie-info-test-"));
  const output = join(directory, "movie-info.js");
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
    join(projectRoot, "src", "movie-info", "index.html"),
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

async function openApp(
  page: Page,
  failure: string | null = null,
): Promise<void> {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedText: string }).copiedText = text;
        },
      },
    });
    (window as unknown as { downloadedFiles: string[] }).downloadedFiles = [];
    URL.createObjectURL = () => "blob:movie-info-test";
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = function click() {
      (window as unknown as { downloadedFiles: string[] }).downloadedFiles.push(
        this.download,
      );
    };
  });
  await page.addScriptTag({ content: appBundle });
  await page.evaluate((selectedFailure) => {
    (
      window as unknown as {
        MovieInfoTest: { start: (value: string | null) => void };
      }
    ).MovieInfoTest.start(selectedFailure);
  }, failure);
  await expect(page.locator("#global-status")).toHaveText(
    "動画IDを入力してデータを取得してください",
  );
}

async function loadVideo(page: Page): Promise<void> {
  await page
    .locator("#video-id-input")
    .fill("https://www.nicovideo.jp/watch/sm100");
  await page.locator("#load-data-btn").click();
  await expect(page.locator("#global-status")).toHaveText(
    "データ取得が完了しました",
  );
}

test.beforeAll(() => {
  appBundle = buildBundle();
});
test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("動画ID入力、基本データ取得、概要状態、全ソース切替が同期する", async ({
  page,
}) => {
  await page.locator("#video-id-input").fill("不正な入力");
  await page.locator("#video-id-input").press("Enter");
  await expect(page.locator("#global-status")).toHaveText(
    "動画IDを正しく入力してください",
  );

  await loadVideo(page);
  await expect(page.locator("#video-id-input")).toHaveValue("sm100");
  await expect(page.locator("#source-progress")).toHaveText(
    "4 / 4 基本ソース取得済み",
  );
  await expect(
    page.locator('.source-status-grid button[data-state="success"]'),
  ).toHaveCount(4);
  await expect(page.locator('[data-source-summary="comments"]')).toHaveText(
    "任意取得",
  );
  await expect(page.locator("#fetch-comments-btn")).toBeEnabled();

  for (const panelId of [
    "panel-watch-api",
    "panel-cache-info",
    "panel-thumb-info",
    "panel-media-info",
    "panel-comments",
  ]) {
    await page.locator(`[data-panel-target="${panelId}"]`).click();
    await expect(page.locator(`#${panelId}`)).toBeVisible();
    await expect(page.locator("[data-source-panel]:not([hidden])")).toHaveCount(
      1,
    );
  }
  await page.locator('[data-panel-target="panel-overview"]').click();
  await page.locator('[data-overview-target="panel-thumb-info"]').click();
  await expect(page.locator("#panel-thumb-info")).toBeVisible();
  await expect(page.locator("#panel-thumb-info .tag-chip")).toHaveCount(2);

  await page.locator('[data-panel-target="panel-watch-api"]').click();
  const description = page.locator(
    "#panel-watch-api .movie-description-content",
  );
  await expect(description.locator("strong")).toHaveText("動的UIテスト");
  await expect(description.locator("br")).toHaveCount(1);
  await expect(
    description.locator('a[href="https://example.com/details"]'),
  ).toHaveAttribute("target", "_blank");
  await expect(
    description.locator('a[href="https://example.com/details"]'),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(description.locator("script")).toHaveCount(0);
  await expect(description.locator("[onclick]")).toHaveCount(0);
  await expect(description.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("JSON表示、フォーカス復帰、コピー、ダウンロードが選択ソースへ作用する", async ({
  page,
}) => {
  await loadVideo(page);
  await page.locator('[data-panel-target="panel-watch-api"]').click();
  const showJson = page.locator("#panel-watch-api [data-role=show-json]");
  await showJson.click();
  await expect(page.locator(".json-modal-overlay")).toHaveClass(/visible/);
  await expect(page.locator(".json-viewer")).toContainText(
    '"title": "テスト動画"',
  );
  await expect(page.locator(".json-modal-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".json-modal-overlay")).not.toHaveClass(/visible/);
  await expect(showJson).toBeFocused();

  await page.locator("#panel-watch-api [data-role=copy]").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { copiedText: string }).copiedText,
      ),
    )
    .toContain('"title": "テスト動画"');
  await page.locator("#panel-watch-api [data-role=download]").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { downloadedFiles: string[] }).downloadedFiles,
      ),
    )
    .toContain("sm100-api-data.json");
});

test("コメントを任意取得し、統合プレビューとフルJSON操作を有効化する", async ({
  page,
}) => {
  await loadVideo(page);
  await page.locator("#fetch-comments-btn").click();
  await expect(page.locator('[data-source-state="comments"]')).toHaveText(
    "成功",
  );
  await page.locator('[data-panel-target="panel-comments"]').click();
  await expect(
    page.locator("#panel-comments [data-role=summary]"),
  ).toContainText("コメント総数");
  await expect(
    page.locator("#panel-comments [data-role=summary]"),
  ).toContainText("2");
  await expect(
    page.locator("#panel-comments [data-role=download]"),
  ).toBeEnabled();
  await expect(page.locator("#fetch-comments-btn")).toHaveText(
    "コメントを取得",
  );
});

test.describe("取得失敗", () => {
  test.beforeEach(async ({ page }) => {
    await page.unroute(pageUrl);
    await openApp(page, "cache");
  });
  test("部分失敗を概要とエラーモーダルへ反映し、閉じるとフォーカスを戻す", async ({
    page,
  }) => {
    await page.locator("#video-id-input").fill("sm100");
    await page.locator("#load-data-btn").click();
    await expect(page.locator("#global-status")).toContainText("一部失敗");
    await expect(page.locator('[data-source-summary="cache"]')).toHaveText(
      "失敗",
    );
    await expect(page.locator('[data-source-summary="watch"]')).toHaveText(
      "成功",
    );
    await expect(page.locator(".error-modal-overlay")).toHaveClass(/visible/);
    await expect(page.locator(".error-modal-item")).toHaveCount(1);
    await expect(page.locator(".error-modal-item")).toContainText(
      "cache fixture failure",
    );
    await expect(page.locator(".error-modal-close")).toBeFocused();
    await page.locator(".error-modal-primary").click();
    await expect(page.locator(".error-modal-overlay")).not.toHaveClass(
      /visible/,
    );
    await expect(page.locator("#load-data-btn")).toBeFocused();
  });
});
