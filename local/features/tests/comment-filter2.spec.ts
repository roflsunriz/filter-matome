import { expect, test, type Page, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const fixtureEntry = join(
  import.meta.dirname,
  "fixtures",
  "comment-filter2-entry.ts",
);
const pageUrl = "https://www.nicovideo.jp/watch/sm100";
let appBundle = "";

function buildBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "comment-filter2-test-"));
  const output = join(directory, "comment-filter2.js");
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

async function fulfillDocument(route: Route): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><title>comment-filter2 test</title></head><body><main id=\"watch\"></main></body></html>",
  });
}

async function openApp(page: Page): Promise<void> {
  await page.route(pageUrl, fulfillDocument);
  await page.goto(pageUrl);
  await page.addScriptTag({ content: appBundle });
  await page.evaluate(async () => {
    await (
      window as unknown as {
        CommentFilter2Test: { seedAndStart: () => Promise<void> };
      }
    ).CommentFilter2Test.seedAndStart();
  });
  await expect(page.locator("#cf2-shadow-host .cf2-container")).toBeVisible();
}

test.beforeAll(() => {
  appBundle = buildBundle();
});

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("概要ダッシュボードが保存済みルールを集計し、画面を切り替える", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await expect(ui.locator("#cf2-cockpit-rule-count")).toHaveText("2");
  await expect(ui.locator("#cf2-cockpit-hide-count")).toHaveText("1");
  await expect(ui.locator("#cf2-cockpit-replace-count")).toHaveText("1");
  await expect(ui.locator(".cf2-dashboard-rule")).toHaveCount(2);

  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await expect(ui.locator('[data-cf2-panel="overview"]')).toBeHidden();
  await expect(ui.locator('[data-cf2-panel="rules"]')).toBeVisible();
  await expect(
    ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]'),
  ).toHaveClass(/active/);

  await ui.locator('.cf2-sidebar-item[data-cf2-view="commands"]').click();
  await expect(ui.locator('[data-cf2-panel="commands"]')).toBeVisible();
  await expect(ui.locator("#cf2-main-commands")).toHaveValue("medium,blue");

  await ui.locator('.cf2-sidebar-item[data-cf2-view="data"]').click();
  await expect(ui.locator('[data-cf2-panel="data"]')).toBeVisible();
  await expect(ui.locator("#cf2-export-json-btn")).toBeVisible();
});

test("正規表現の一致、未一致、入力エラーをリアルタイム表示する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-pattern-input").fill("荒らし|スパム");
  await ui
    .locator("#cf2-regex-test-input")
    .fill("通常コメント、荒らし、そしてスパムです");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("2件一致");
  await expect(ui.locator("#cf2-regex-preview-result mark")).toHaveCount(2);

  await ui.locator("#cf2-regex-test-input").fill("平和なコメントです");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("一致なし");

  await ui.locator("#cf2-pattern-input").fill("[");
  await expect(ui.locator("#cf2-regex-preview-count")).toHaveText("入力エラー");
  await expect(ui.locator("#cf2-regex-preview-result")).toHaveClass(
    /cf2-preview-error/,
  );
});

test("フォームからルールを追加・削除し、概要集計へ反映する", async ({
  page,
}) => {
  const ui = page.locator("#cf2-shadow-host");
  await ui.locator('.cf2-sidebar-item[data-cf2-view="rules"]').click();
  await ui.locator("#cf2-pattern-input").fill("連投コメント");
  await ui.locator("#cf2-add-rule").click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("3件");
  await expect(ui.locator(".cf2-rule-item")).toHaveCount(3);

  await ui.locator(".cf2-rule-item").last().locator(".cf2-rule-delete").click();
  await expect(ui.locator("#cf2-rule-count-text")).toHaveText("2件");

  await ui.locator('.cf2-sidebar-item[data-cf2-view="overview"]').click();
  await expect(ui.locator("#cf2-cockpit-rule-count")).toHaveText("2");
});
